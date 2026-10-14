import { useEffect, useMemo, useRef, useState } from "react";
import type { ActionName, CallKind, TileCode } from "../../engine/protocol";
import type { GameController } from "../../game/useGameController";
import type { CharacterDef } from "../../game/characters";
import type { StageChange } from "../../game/rewards";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { useLayout } from "../useLayout";
import { PlayerHand } from "../components/PlayerHand";
import { ActionBar } from "../components/ActionBar";
import { RoundResult } from "../components/RoundResult";
import { GameOver } from "../components/GameOver";
import { RewardScene } from "../components/RewardScene";
import { CallCutaway } from "../components/CallCutaway";
import { RivalBand } from "../components/RivalBand";
import { PlayerBand } from "../components/PlayerBand";
import { IconButton, Sheet } from "../components/Primitives";
import { Icon } from "../icons";
import styles from "./Table.module.css";

interface TableProps {
  game: GameController;
  onTitle: () => void;
  onAgain: () => void;
  /** Open another screen; the match stays loaded and resumes on return. */
  onOpen: (screen: "learn" | "settings") => void;
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

export function Table({ game, onTitle, onAgain, onOpen }: TableProps) {
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
  const [menuOpen, setMenuOpen] = useState(false);

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

  if (!view) return null;
  const prompt = view.status === "human" ? view.prompt : null;
  const me = view.players[0];
  const allTiles = me.drawn ? [...(me.hand ?? []), me.drawn] : me.hand ?? [];
  const selectedTile = selected !== null ? allTiles[selected] ?? null : null;

  const act = (action: ActionName, extra?: { tile?: TileCode; option?: number }) => {
    setSelected(null);
    setRiichiMode(false);
    setChiPicker(false);
    void game.act({ action, ...extra });
  };

  const claimer = prompt?.claim ? cast[prompt.claim.from - 1] : undefined;
  const statusText = error
    ? t("engineError", { msg: error })
    : view.status === "human"
      ? claimer
        ? t("claimFrom", { name: claimer.name[settings.lang].split(" ")[0] })
        : t("yourTurn")
      : view.status === "ai"
        ? t("waitingFor")
        : null;

  const showRound =
    view.result !== null && (view.status === "round_over" || (view.status === "game_over" && ackRound !== view.round.index));
  const showGameOver = view.status === "game_over" && !showRound;

  return (
    <div className={styles.table} data-orientation={layout.orientation} style={layout.vars}>
      <header className={styles.topBar}>
        <IconButton icon="menu" label={t("menu")} onClick={() => setMenuOpen(true)} />
        <b className={styles.roundInfo}>
          {t("roundLabel", { wind: t(`wind_${view.round.wind}` as StringKey), n: view.round.number })}
        </b>
        <IconButton icon="help" label={t("yakuRef")} onClick={() => onOpen("learn")} />
      </header>

      {/* Kemono-style bands: kamicha, toimen, shimocha, then the player.
          Rows in portrait, columns in landscape. */}
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

      {calloutBySeat[0] && <span className={styles.myCallout}>{t(`act_${calloutBySeat[0]}` as StringKey)}!</span>}

      {/* Hand on top, buttons under it on the right (Kemono Mahjong). */}
      <div className={styles.dock}>
        <PlayerHand
          player={me}
          prompt={prompt}
          riichiMode={riichiMode}
          selected={selected}
          onSelect={setSelected}
          onDiscard={(tile) => act("discard", { tile })}
          onRiichi={(tile) => act("riichi", { tile })}
          dealing={dealing}
          floatingHints
        />
        <div className={styles.actions}>
          <div className={styles.status}>{statusText}</div>
          <ActionBar
            prompt={prompt}
            riichiMode={riichiMode}
            chiPicker={chiPicker}
            busy={busy}
            selectedTile={selectedTile}
            onDiscardSelected={() => selectedTile && act("discard", { tile: selectedTile })}
            onAction={(action, option) => act(action, option !== undefined ? { option } : undefined)}
            onRiichiMode={(on) => {
              setSelected(null);
              setRiichiMode(on);
            }}
            onChiPicker={setChiPicker}
          />
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
