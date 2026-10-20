import { useCallback, useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { getEngine } from "./engine/EngineClient";
import type { BootStage } from "./engine/protocol";
import { useGameController } from "./game/useGameController";
import { loadGame, type SavedGame } from "./game/storage";
import { CHARACTERS } from "./game/characters";
import { Boot } from "./ui/screens/Boot";
import { Title } from "./ui/screens/Title";
import { Setup } from "./ui/screens/Setup";
import { Table } from "./ui/screens/Table";
import { SettingsScreen } from "./ui/screens/Settings";
import { Learn } from "./ui/screens/Learn";
import { StatsScreen } from "./ui/screens/StatsScreen";
import { AchievementToast } from "./ui/components/AchievementToast";
import { ScreenErrorBoundary } from "./ui/components/ScreenErrorBoundary";

type Screen = "boot" | "title" | "setup" | "table" | "settings" | "learn" | "stats";

export default function App() {
  const game = useGameController();
  const [screen, setScreen] = useState<Screen>("boot");
  const [stage, setStage] = useState<BootStage | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedGame | null>(null);
  const [lastCast, setLastCast] = useState<string[]>(CHARACTERS.slice(0, 3).map((c) => c.id));
  // Screens opened from the in-game menu return to the table.
  const [returnTo, setReturnTo] = useState<Screen>("title");
  const back = () => {
    setScreen(returnTo);
    setReturnTo("title");
  };

  const boot = useCallback(() => {
    setBootError(null);
    const engine = getEngine();
    engine.onProgress = setStage;
    engine
      .init()
      .then(loadGame)
      .then((g) => {
        setSaved(g);
        setScreen("title");
      })
      .catch((err: unknown) => setBootError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(boot, [boot]);

  const toTitle = useCallback(() => {
    void loadGame().then(setSaved);
    setScreen("title");
  }, []);

  // Android back button: leave sub-screens, never kill a game silently.
  useEffect(() => {
    let remove: (() => void) | undefined;
    void CapApp.addListener("backButton", () => {
      setScreen((s) => (s === "title" || s === "boot" ? s : "title"));
      void loadGame().then(setSaved);
    })
      .then((h) => (remove = () => void h.remove()))
      .catch(() => undefined);
    return () => remove?.();
  }, []);

  const startGame = (cast: string[]) => {
    setLastCast(cast);
    setScreen("table");
    void game.start(cast);
  };

  let content;
  switch (screen) {
    case "boot":
      content = <Boot stage={stage} error={bootError} onRetry={boot} />;
      break;
    case "title":
      content = (
        <Title
          saved={saved}
          onNew={() => setScreen("setup")}
          onContinue={() => {
            if (!saved) return;
            setLastCast(saved.cast);
            setScreen("table");
            void game.resume(saved);
          }}
          onSettings={() => setScreen("settings")}
          onLearn={() => setScreen("learn")}
          onStats={() => setScreen("stats")}
        />
      );
      break;
    case "setup":
      content = <Setup initial={lastCast} onBack={() => setScreen("title")} onStart={startGame} />;
      break;
    case "table":
      content = (
        <Table
          game={game}
          onTitle={toTitle}
          onAgain={() => startGame(lastCast)}
          onOpen={(target) => {
            setReturnTo("table");
            setScreen(target);
          }}
        />
      );
      break;
    case "settings":
      content = <SettingsScreen onBack={back} />;
      break;
    case "learn":
      content = <Learn onBack={back} />;
      break;
    case "stats":
      content = <StatsScreen onBack={() => setScreen("title")} />;
      break;
  }

  // Continue from the last save after a crash while drawing a screen.
  const recover = async () => {
    const g = await loadGame();
    if (!g) return false;
    setLastCast(g.cast);
    setScreen("table");
    await game.resume(g);
    return true;
  };

  return (
    <>
      <ScreenErrorBoundary resetKey={screen} onRecover={recover} onTitle={toTitle}>
        {content}
      </ScreenErrorBoundary>
      <AchievementToast />
    </>
  );
}
