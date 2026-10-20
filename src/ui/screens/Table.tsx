import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ActionName, CallKind, TileCode } from "../../engine/protocol";
import { CUTAWAY_MS, type GameController } from "../../game/useGameController";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { bandVars, useLayout } from "../useLayout";
import { sameType } from "../tiles";
import { rememberHandDiscard } from "../motion";
import { PlayerHand } from "../components/PlayerHand";
import { ActionBar } from "../components/ActionBar";
import { RoundResult } from "../components/RoundResult";
import { GameOver } from "../components/GameOver";
import { CallCutaway } from "../components/CallCutaway";
import { ErrorDialog } from "../components/ErrorDialog";
import { RivalBand } from "../components/RivalBand";
import { PlayerBand } from "../components/PlayerBand";
import { TableCenter } from "../components/TableCenter";
import { WaitsChip } from "../components/WaitsChip";
import { IconButton, Sheet } from "../components/Primitives";
import { Icon } from "../icons";
import { lookAttrs } from "../tableLook";
import styles from "./Table.module.css";

interface TableProps {
  game: GameController;
  onTitle: () => void;
  onAgain: () => void;
  /** Open another screen; the match stays loaded and resumes on return. */
  onOpen: (screen: "learn" | "settings") => void;
}

/** The deal that already played its animation (survives leaving the table). */
let dealtKey = "";

export function Table({ game, onTitle, onAgain, onOpen }: TableProps) {
  const { t, settings } = useApp();
  const layout = useLayout();
  const { view, cast, emotions, callouts, freshMeld, speech, cutaway, busy, error } = game;

  // Stable handle for timers: the controller object changes identity every render.
  const gameRef = useRef(game);
  gameRef.current = game;

  const [selected, setSelected] = useState<number | null>(null);
  const [riichiMode, setRiichiMode] = useState(false);
  const [chiPicker, setChiPicker] = useState(false);
  /** Chi with several options: index of the first hand tile picked. */
  const [chiFirst, setChiFirst] = useState<number | null>(null);
  const [ackRound, setAckRound] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Rivers are sized from the real size of the bands area.
  const bandsRef = useRef<HTMLDivElement>(null);
  const [bandsBox, setBandsBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = bandsRef.current;
    if (!el) return;
    const update = () => setBandsBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view !== null]);
  const bandStyle = useMemo(
    () => bandVars(layout.orientation, bandsBox.w, bandsBox.h, layout.left),
    [layout.orientation, layout.left, bandsBox.w, bandsBox.h],
  );

  // Any new engine state clears local selection modes.
  const promptKey = view ? `${view.round.index}:${view.players[0].discards.length}:${view.status}:${view.players[0].handCount}` : "";
  useEffect(() => {
    setSelected(null);
    setRiichiMode(false);
    setChiPicker(false);
    setChiFirst(null);
  }, [promptKey]);

  // Tiles fly in for a moment after each new deal: once per deal (not again
  // when the table is re-opened from the tutorial or settings), and set
  // before the first paint so the finished hand never flashes first.
  const roundIndex = view?.round.index ?? 0;
  const dealKey = view ? `${view.seed}:${roundIndex}` : "";
  const freshDeal = Boolean(view && view.players[0].discards.length === 0 && view.players.every((p) => p.discards.length === 0));
  const [dealing, setDealing] = useState(false);
  useLayoutEffect(() => {
    if (!settings.dealAnimation || !roundIndex || !dealKey || dealtKey === dealKey) return;
    dealtKey = dealKey;
    if (!freshDeal) return;
    setDealing(true);
    const timer = window.setTimeout(() => setDealing(false), 1100);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealKey, settings.dealAnimation]);

  // In riichi the only legal move is discarding the drawn tile: do it for the player.
  const onlyDiscard =
    view?.status === "human" &&
    view.players[0].riichi &&
    view.prompt?.actions.length === 1 &&
    view.prompt.actions[0] === "discard";
  const drawnTile = view?.players[0].drawn ?? null;
  useEffect(() => {
    if (!settings.autoDiscardRiichi || !onlyDiscard || !drawnTile || busy) return;
    const timer = window.setTimeout(() => {
      rememberHandDiscard(drawnTile);
      void gameRef.current.act({ action: "discard", tile: drawnTile });
    }, 550);
    return () => window.clearTimeout(timer);
  }, [settings.autoDiscardRiichi, onlyDiscard, drawnTile, busy, promptKey]);

  // The result panel waits until the Ron/Tsumo banner and the heroine's line
  // have played; a tap anywhere skips the wait.
  const resultKey = view?.result ? `${view.round.index}:${view.status}:${view.result.type}` : null;
  const [released, setReleased] = useState<string | null>(null);
  useEffect(() => {
    if (!resultKey) return;
    const ms = resultKey.endsWith(":win") ? CUTAWAY_MS + 600 : 900;
    const timer = window.setTimeout(() => setReleased(resultKey), ms);
    return () => window.clearTimeout(timer);
  }, [resultKey]);
  const holding = resultKey !== null && released !== resultKey;
  const skipHold = () => {
    gameRef.current.skipCutaway();
    if (resultKey) setReleased(resultKey);
  };

  // A rival comments when the player takes a long time.
  const waitingForHuman = view?.status === "human" && !menuOpen;
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
  // "from Yuzu" / "from you" under a rival's announcement.
  const calloutFrom = (seat: number): string | null => {
    const c = [...callouts].reverse().find((x) => x.seat === seat);
    if (!c || c.from === undefined || c.from === null) return null;
    if (c.from === 0) return t("callFromYou");
    const who = cast[c.from - 1];
    return who ? t("callFrom", { name: who.name[settings.lang].split(" ")[0] }) : null;
  };

  if (!view) return null;
  const prompt = view.status === "human" ? view.prompt : null;
  const me = view.players[0];
  const allTiles = me.drawn ? [...(me.hand ?? []), me.drawn] : me.hand ?? [];
  const selectedTile = selected !== null ? allTiles[selected] ?? null : null;

  const act = (action: ActionName, extra?: { tile?: TileCode; option?: number }) => {
    if (extra?.tile && (action === "discard" || action === "riichi")) rememberHandDiscard(extra.tile);
    setSelected(null);
    setRiichiMode(false);
    setChiPicker(false);
    void game.act({ action, ...extra });
  };

  const claimer = prompt?.claim ? cast[prompt.claim.from - 1] : undefined;
  const statusText = error
    ? t("errTitle")
    : view.status === "human"
      ? claimer
        ? t("claimFrom", { name: claimer.name[settings.lang].split(" ")[0] })
        : t("yourTurn")
      : view.status === "ai"
        ? t("waitingFor")
        : null;

  const portrait = layout.orientation === "portrait";
  const actionBar = (
    <ActionBar
      prompt={prompt}
      riichiMode={riichiMode}
      chiPicker={chiPicker}
      busy={busy}
      selectedTile={selectedTile}
      onDiscardSelected={() => selectedTile && act(riichiMode ? "riichi" : "discard", { tile: selectedTile })}
      onAction={(action, option) => act(action, option !== undefined ? { option } : undefined)}
      onRiichiMode={(on) => {
        setSelected(null);
        setRiichiMode(on);
      }}
      onChiPicker={setChiPicker}
      row={portrait}
    />
  );
  const waitsChip = (
    <WaitsChip player={me} prompt={prompt} selectedCode={selectedTile} riichiMode={riichiMode} />
  );

  const showRound =
    !holding &&
    view.result !== null &&
    (view.status === "round_over" || (view.status === "game_over" && ackRound !== view.round.index));
  const showGameOver = view.status === "game_over" && !showRound && !holding;

  return (
    <div className={styles.table} data-orientation={layout.orientation} data-style={settings.tableStyle} {...lookAttrs(settings)} style={layout.vars}>
      <header className={styles.topBar} data-zone>
        <IconButton icon="menu" label={t("menu")} onClick={() => setMenuOpen(true)} />
        <div className={styles.roundInfo}>
          <b>{t("roundLabel", { wind: t(`wind_${view.round.wind}` as StringKey), n: view.round.number })}</b>
          {statusText && <span key={statusText}>{statusText}</span>}
        </div>
        <IconButton icon="help" label={t("yakuRef")} onClick={() => onOpen("learn")} />
      </header>

      {/* Kemono-style bands: kamicha, toimen, shimocha, then the player.
          Rows in portrait, columns in landscape. */}
      <div className={styles.bands} ref={bandsRef} style={bandStyle} data-zone>
        {[3, 2, 1].map((seat) => {
          const character = cast[seat - 1];
          if (!character) return null;
          return (
            <RivalBand
              key={seat}
              character={character}
              player={view.players[seat]}
              emotion={emotions[seat]}
              callout={calloutBySeat[seat] ?? null}
              calloutFrom={calloutBySeat[seat] ? calloutFrom(seat) : null}
              freshMeld={freshMeld === seat}
              speech={speech[seat]?.text ?? null}
              active={view.current === seat && view.status === "ai"}
              dealer={view.round.dealer === seat}
              claimed={prompt?.claim?.from === seat ? prompt.claim.tile : null}
              riverCols={layout.orientation === "portrait" ? 9 : 6}
              tsumogiri={game.tsumogiri[seat]}
            />
          );
        })}
        {portrait && <TableCenter view={view} />}
        <PlayerBand
          view={view}
          active={view.current === 0 && view.status === "human"}
          waits={waitsChip}
          riverCols={portrait ? 9 : 6}
        />
      </div>

      {calloutBySeat[0] && <span className={styles.myCallout}>{t(`act_${calloutBySeat[0]}` as StringKey)}!</span>}

      {/* The hand across the bottom; in landscape the buttons sit to its right. */}
      <div className={styles.dock} data-zone>
        <PlayerHand
          player={me}
          prompt={prompt}
          riichiMode={riichiMode}
          selected={selected}
          onSelect={setSelected}
          onDiscard={(tile) => act("discard", { tile })}
          onRiichi={(tile) => act("riichi", { tile })}
          dealing={dealing}
          dealId={dealKey}
          chiMode={chiPicker ? { first: chiFirst } : null}
          onChiTile={(i) => {
            const options = prompt?.chiOptions ?? [];
            const code = allTiles[i];
            if (chiFirst === i) {
              setChiFirst(null);
              return;
            }
            const first = chiFirst !== null ? allTiles[chiFirst] : null;
            const matches = options
              .map((o, k) => ({ o, k }))
              .filter(({ o }) => o.some((c) => sameType(c, code)) && (!first || o.some((c) => sameType(c, first))));
            if (matches.length === 1) act("chi", { option: matches[0].k });
            else if (matches.length > 1) setChiFirst(i);
          }}
        />
        {/* Portrait: a reserved row under the hand; landscape: a column of
            fixed height to its right. Either way the hand and the bands keep
            their size when buttons appear (the waits live in the player band). */}
        <div className={portrait ? styles.actionsRow : styles.actions} data-actions>
          {actionBar}
        </div>
      </div>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={t("menu")}>
        <div className={styles.menuList}>
          <button className="btn btn-primary btn-lg" onClick={() => setMenuOpen(false)}>
            <Icon name="play" />
            {t("resume")}
          </button>
          <button className="btn btn-lg" onClick={() => onOpen("learn")}>
            <Icon name="book" />
            {t("learn")}
          </button>
          <button className="btn btn-lg" onClick={() => onOpen("settings")}>
            <Icon name="settings" />
            {t("settings")}
          </button>
          <button className="btn btn-ghost btn-lg" onClick={onTitle}>
            <Icon name="home" />
            {t("toTitle")}
          </button>
          <p className={styles.menuNote}>{t("savedNote")}</p>
        </div>
      </Sheet>

      {error && <ErrorDialog error={error} onRetry={() => void game.retry()} onRecover={game.recover} onTitle={onTitle} />}

      {cutaway && <CallCutaway key={cutaway.id} cutaway={cutaway} cast={cast} onSkip={holding ? skipHold : game.skipCutaway} />}
      {holding && !cutaway && <button className={styles.skipLayer} onClick={skipHold} aria-label={t("continue")} />}

      {showRound && (
        <RoundResult
          view={view}
          cast={cast}
          busy={busy}
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
          onAgain={onAgain}
          onTitle={onTitle}
        />
      )}

    </div>
  );
}
