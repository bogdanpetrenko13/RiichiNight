"""Independent check of every score change: plays whole east matches
through the bridge (the player wins whenever offered and declares riichi
often) and recomputes, from han / fu / honba / riichi sticks with the
standard tables, every payment, the winner's hand value (handPoints), the
riichi sticks each player put down (riichiPaid) and each player's delta on
the result screen. Wins, double rons, tsumo, ron on a riichi declaration
tile (no stick) and exhaustive draws (noten payments) are all covered."""
import json
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "py"))

import bridge  # noqa: E402


def audit(seeds):
    def ceil100(x): return -(-x // 100) * 100

    def base_points(han, fu, yakuman, kiriage):
        if yakuman: return 8000 * yakuman
        if han >= 13: return 8000
        if han >= 11: return 6000
        if han >= 8: return 4000
        if han >= 6: return 3000
        if han >= 5: return 2000
        b = fu * 2 ** (han + 2)
        if kiriage and ((han == 4 and fu == 30) or (han == 3 and fu == 60)): return 2000
        return min(b, 2000)

    kinds = {}; problems = []; hands = 0; wins = 0; draws = 0; riichi_wins = 0
    rng = random.Random(1)
    for seed in seeds:
        rules = {"gameLength": "east"}
        # Every seat takes a turn as the first East (the UI draws it).
        r = json.loads(bridge.new_game(json.dumps({"seed": seed, "gameRules": rules, "dealer": seed % 4})))
        last_discard = {}; start_scores = None; sticks_at_start = None; honba = None; riichi_this_hand = set()
        for _ in range(20000):
            v = r["view"]; st = v["status"]
            if start_scores is None and st in ("human", "ai"):
                start_scores = [p["score"] for p in v["players"]]
                sticks_at_start = v["round"]["riichiSticks"]; honba = v["round"]["honba"]
                dealer = v["round"]["dealer"]; riichi_this_hand = set()
            for ev in r["events"]:
                if ev["t"] == "call" and ev["kind"] == "riichi": riichi_this_hand.add(ev["seat"])
                if ev["t"] == "discard": last_discard = ev
            res = v.get("result")
            if st in ("round_over", "game_over") and res and start_scores is not None:
                hands += 1
                d = res["deltas"]; tag = f"seed {seed} {v['round']['wind']}{v['round']['number']} h{honba}"
                # deltas must equal shown scores minus the scores at the hand's start
                if [s - a for s, a in zip(res["scores"], start_scores)] != d:
                    problems.append((tag, "deltas vs scores", d, res["scores"], start_scores))
                if res["type"] == "win":
                    wins += 1
                    # Ron on the riichi declaration tile: the riichi never stands, no stick.
                    if not res["tsumo"] and last_discard.get("riichi") and last_discard["seat"] == res["from"]:
                        riichi_this_hand.discard(res["from"])
                    kiri = v["rules"].get("kiriageMangan", False)
                    exp = [0, 0, 0, 0]
                    for k, w in enumerate(res["winners"]):
                        c = w.get("calc") or {}
                        seat = w["seat"]; is_dealer = seat == dealer
                        b = base_points(w["han"], w["fu"], c.get("yakumanCount", 0) if w["yakuman"] else 0, kiri)
                        stick_bonus = sticks_at_start * 1000 + 1000 * len(riichi_this_hand) if k == 0 else 0
                        if seat in riichi_this_hand: riichi_wins += 1
                        if res["tsumo"]:
                            if is_dealer:
                                each = ceil100(2 * b) + 100 * honba
                                for s in range(4):
                                    if s != seat: exp[s] -= each; exp[seat] += each
                            else:
                                for s in range(4):
                                    if s == seat: continue
                                    pay = (ceil100(2 * b) if s == dealer else ceil100(b)) + 100 * honba
                                    exp[s] -= pay; exp[seat] += pay
                        else:
                            pay = ceil100((6 if is_dealer else 4) * b) + 300 * honba
                            exp[res["from"]] -= pay; exp[seat] += pay
                        exp[seat] += stick_bonus
                        # the headline points must equal what this winner gained
                        hand_value = (ceil100(6 * b) if is_dealer else ceil100(4 * b)) if not res["tsumo"] else (
                            3 * ceil100(2 * b) if is_dealer else 2 * ceil100(b) + ceil100(2 * b))
                        if c.get("payments") and not res["tsumo"] and c["payments"]["ron"] != hand_value + 300 * honba:
                            problems.append((tag, "calc ron payment", c["payments"], hand_value, honba))
                        if c.get("honba") is not None and c["honba"] != 300 * honba and not res["tsumo"]:
                            problems.append((tag, "calc honba", c["honba"], honba))
                        if c.get("sticks") is not None and c["sticks"] != stick_bonus:
                            problems.append((tag, "calc sticks", c["sticks"], stick_bonus))
                        if w.get("handPoints") != hand_value:
                            problems.append((tag, "handPoints", w.get("handPoints"), hand_value, "tsumo", res["tsumo"], "dealer", is_dealer))
                    for s in riichi_this_hand: exp[s] -= 1000
                    if sorted(res.get("riichiPaid", [])) != sorted(riichi_this_hand):
                        problems.append((tag, "riichiPaid", res.get("riichiPaid"), sorted(riichi_this_hand)))
                    if exp != d:
                        problems.append((tag, "win deltas", "tsumo" if res["tsumo"] else "ron", d, exp, [ (w["seat"], w["han"], w["fu"]) for w in res["winners"]], "riichi", sorted(riichi_this_hand), "sticks", sticks_at_start))
                else:
                    draws += 1
                    if sorted(res.get("riichiPaid", [])) != sorted(riichi_this_hand):
                        problems.append((tag, "draw riichiPaid", res.get("riichiPaid"), sorted(riichi_this_hand)))
                    if res.get("kind") == "exhaustive_draw" and not res.get("nagashi"):
                        ten = set(res.get("tenpai") or []); exp = [0] * 4
                        if 0 < len(ten) < 4:
                            for s_ in range(4):
                                exp[s_] = 3000 // len(ten) if s_ in ten else -3000 // (4 - len(ten))
                        for s_ in riichi_this_hand: exp[s_] -= 1000
                        if exp != d: problems.append((tag, "draw deltas", d, exp, sorted(ten), res.get("kind")))
                    kinds[res.get("kind")] = kinds.get(res.get("kind"), 0) + 1
                    if sum(d) != -1000 * len(riichi_this_hand):
                        problems.append((tag, "draw sum", d, sorted(riichi_this_hand)))
                if st == "game_over": break
                start_scores = None
                r = json.loads(bridge.next_round()); continue
            if st == "human":
                p = v["prompt"]; acts = p["actions"]
                for a in ("tsumo", "ron"):
                    if a in acts: r = json.loads(bridge.act(json.dumps({"action": a}))); break
                else:
                    if "riichi" in acts and rng.random() < 0.7:
                        t = p["riichiTiles"][0]; r = json.loads(bridge.act(json.dumps({"action": "riichi", "tile": t})))
                    elif "pass" in acts: r = json.loads(bridge.act(json.dumps({"action": "pass"})))
                    elif "discard" in acts:
                        me = v["players"][0]; t = me.get("drawn") or me["hand"][-1]
                        r = json.loads(bridge.act(json.dumps({"action": "discard", "tile": t})))
                    else: r = json.loads(bridge.act(json.dumps({"action": acts[0]})))
                continue
            r = json.loads(bridge.ai_step())
    return hands, wins, draws, riichi_wins, kinds, problems


def test_scores_add_up_in_whole_matches():
    hands, wins, draws, riichi_wins, kinds, problems = audit(range(1, 7))
    assert hands > 40 and wins > 30 and riichi_wins > 10, (hands, wins, draws, riichi_wins)
    assert not problems, problems[:10]


if __name__ == "__main__":
    import sys

    seeds = range(1, int(sys.argv[1]) + 1) if len(sys.argv) > 1 else range(1, 41)
    hands, wins, draws, riichi_wins, kinds, problems = audit(seeds)
    print(f"hands {hands}, wins {wins}, draws {draws}, riichi wins {riichi_wins}, {kinds}, problems {len(problems)}")
    for p in problems[:25]:
        print(p)
