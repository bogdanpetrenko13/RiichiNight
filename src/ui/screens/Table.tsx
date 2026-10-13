import { useEffect, useMemo, useRef, useState } from "react";
import type { ActionName, CallKind, TileCode } from "../../engine/protocol";
import type { GameController } from "../../game/useGameController";
import type { CharacterDef } from "../../game/characters";
import type { StageChange } from "../../game/rewards";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { useLayout } from "../useLayout";
import { Board } from "../components/Board";
import { OpponentPanel } from "../components/OpponentPanel";
import { PlayerHand } from "../components/PlayerHand";
import { ActionBar } from "../components/ActionBar";
import { RoundResult } from "../components/RoundResult";
import { GameOver } from "../components/GameOver";
import { RewardScene } from "../components/RewardScene";
import { CallCutaway } from "../components/CallCutaway";
import { RivalBand } from "../components/RivalBand";
import { PlayerBand } from "../components/PlayerBand";
import styles from "./Table.module.css";

interface TableProps {
  game: GameController;
  onTitle: () => void;
  onAgain: () => void;
}

interface Scene {
  character: CharacterDef;
  stage: number;
}

/** One scene per newly reached stage, in seat order. */
function scenesFor(changes: StageChange[], cast: CharacterDef[]): Scene[] {
  const out: Scene[] = [];
  for (const c of changes) {
    const character = cast[c.seat - 1];
    if (!character) continue;
    for (let s = c.from + 1; s <= c.to; s++) out.push({ character, stage: s });
  }
  return out;
}

export function Table({ game, onTitle, onAgain }: TableProps) {
  const { t, settings } = useApp();
  const layout = useLayout();
  const { view, cast, session, emotions, callouts, speech, cutaway, roundChanges, endChanges, busy, error } = game;

  // Stable handle for timers: the controller object changes identity every render.
  const gameRef = useRef(game);
  gameRef.current = game;

  const [selected, setSelected] = useState<number | null>(null);
  const [riichiMode, setRiichiMode] = useState(false);
  const [chiPicker, setChiPicker] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [ackRound, setAckRound] = useState<number | null>(null);

  // Any new engine state clears local selection modes.
  const promptKey = view ? `${view.round.index}:${view.players[0].discards.length}:${view.status}:${view.players[0].handCount}` : "";
  useEffect(() => {
    setSelected(null);
    setRiichiMode(false);
    setChiPicker(false);
  }, [promptKey]);

  // Tiles fly in for a moment after each new deal.
  const roundIndex = view?.round.index ?? 0;
  const [dealing, setDealing] = useState(false);
  useEffect(() => {
    if (!settings.dealAnimation || !roundIndex) return;
    setDealing(true);
    const timer = window.setTimeout(() => setDealing(false), 1100);
    return () => window.clearTimeout(timer);
  }, [roundIndex, settings.dealAnimation]);

  // In riichi the only legal move is discarding the drawn tile: do it for the player.
  const onlyDiscard =
    view?.status === "human" &&
    view.players[0].riichi &&
    view.prompt?.actions.length === 1 &&
    view.prompt.actions[0] === "discard";
  const drawnTile = view?.players[0].drawn ?? null;
  useEffect(() => {
    if (!settings.autoDiscardRiichi || !onlyDiscard || !drawnTile || busy) return;
    const timer = window.setTimeout(() => void gameRef.current.act({ action: "discard", tile: drawnTile }), 550);
    return () => window.clearTimeout(timer);
  }, [settings.autoDiscardRiichi, onlyDiscard, drawnTile, busy, promptKey]);

  // A rival comments when the player takes a long time.
  const waitingForHuman = view?.status === "human";
  useEffect(() => {
    if (!waitingForHuman) return;
    const timer = window.setTimeout(() => gameRef.current.sayIdle(), 25000);
    return () => window.clearTimeout(timer);
  }, [waitingForHuman, promptKey]);

  const calloutBySeat = useMemo(() => {
    const map: Record<number, CallKind> = {};
    for (const c of callouts) map[c.seat] = c.kind;
    return map;
  }, [callouts]);

  if (!view) return null;
  const prompt = view.status === "human" ? view.prompt : null;
  const me = view.players[0];

  const act = (action: ActionName, extra?: { tile?: TileCode; option?: number }) => {
    setSelected(null);
    setRiichiMode(false);
    setChiPicker(false);
    void game.act({ action, ...extra });
  };

  const panel = (seat: number, compact: boolean) => {
    const character = cast[seat - 1];
    if (!character) return null;
    return (
      <OpponentPanel
        key={seat}
        character={character}
        player={view.players[seat]}
        stage={session[seat] ?? 0}
        emotion={emotions[seat]}
        callout={calloutBySeat[seat] ?? null}
        active={view.current === seat && view.status === "ai"}
        compact={compact}
        speech={speech[seat]?.text ?? null}
      />
    );
  };

  const statusText =
    view.status === "human"
      ? prompt?.claim
        ? null
        : t("yourTurn")
      : view.status === "ai"
        ? t("waitingFor")
        : null;

  const showRound =
    view.result !== null && (view.status === "round_over" || (view.status === "game_over" && ackRound !== view.round.index));
  const showGameOver = view.status === "game_over" && !showRound;

  const portrait = layout.orientation === "portrait";

  return (
    <div className={styles.table} data-orientation={layout.orientation} style={layout.vars}>
      <button className={styles.menu} onClick={onTitle} aria-label={t("toTitle")}>
        ☰
      </button>

      {portrait ? (
        <>
          <header className={styles.header}>
            <span>
              {t("roundLabel", { wind: t(`wind_${view.round.wind}` as StringKey), n: view.round.number })}
              {" · "}
              {t("honba", { n: view.round.honba })}
            </span>
          </header>
          {/* Kemono-style rows: kamicha, toimen, shimocha, then the player. */}
          <div className={styles.bands}>
            {[3, 2, 1].map((seat) => {
              const character = cast[seat - 1];
              if (!character) return null;
              return (
                <RivalBand
                  key={seat}
                  character={character}
                  player={view.players[seat]}
                  stage={session[seat] ?? 0}
                  emotion={emotions[seat]}
                  callout={calloutBySeat[seat] ?? null}
                  speech={speech[seat]?.text ?? null}
                  active={view.current === seat && view.status === "ai"}
                  dealer={view.round.dealer === seat}
                  claimed={prompt?.claim?.from === seat ? prompt.claim.tile : null}
                />
              );
            })}
            <PlayerBand view={view} active={view.current === 0 && view.status === "human"} />
          </div>
        </>
      ) : (
        <>
          {/* Landscape: the opposite rival sits above the left one; wind badges keep seats clear. */}
          <div className={styles.left}>
            {panel(2, false)}
            {panel(3, false)}
          </div>
          <div className={styles.right}>{panel(1, false)}</div>
        </>
      )}

      <div className={styles.board}>
        {!portrait && <Board view={view} claimFrom={prompt?.claim?.from ?? null} />}
        {calloutBySeat[0] && <span className={styles.myCallout}>{t(`act_${calloutBySeat[0]}` as StringKey)}!</span>}
      </div>

      <div className={styles.controls}>
        <div className={styles.status}>{error ? t("engineError", { msg: error }) : statusText}</div>
        <div className={styles.actions}>
        <ActionBar
          prompt={prompt}
          riichiMode={riichiMode}
          chiPicker={chiPicker}
          busy={busy}
          onAction={(action, option) => act(action, option !== undefined ? { option } : undefined)}
          onRiichiMode={(on) => {
            setSelected(null);
            setRiichiMode(on);
          }}
          onChiPicker={setChiPicker}
        />
        </div>
        <PlayerHand
          player={me}
          prompt={prompt}
          riichiMode={riichiMode}
          selected={selected}
          onSelect={setSelected}
          onDiscard={(tile) => act("discard", { tile })}
          onRiichi={(tile) => act("riichi", { tile })}
          dealing={dealing}
          floatingHints={!portrait}
        />
      </div>

      {cutaway && <CallCutaway key={cutaway.id} cutaway={cutaway} cast={cast} />}

      {showRound && (
        <RoundResult
          view={view}
          cast={cast}
          changes={roundChanges}
          busy={busy}
          onWatch={() => setScenes(scenesFor(roundChanges, cast))}
          onNext={() => {
            if (view.status === "game_over") setAckRound(view.round.index);
            else void game.nextRound();
          }}
        />
      )}

      {showGameOver && (
        <GameOver
          view={view}
          cast={cast}
          changes={endChanges}
          onWatch={() => setScenes(scenesFor(endChanges, cast))}
          onAgain={onAgain}
          onTitle={onTitle}
        />
      )}

      {settings.rewardScenes && scenes.length > 0 && (
        <RewardScene
          key={`${scenes[0].character.id}-${scenes[0].stage}`}
          character={scenes[0].character}
          stage={scenes[0].stage}
          onDone={() => setScenes((q) => q.slice(1))}
        />
      )}
    </div>
  );
}
