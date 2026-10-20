import { Component, type ErrorInfo, type ReactNode } from "react";
import type { GameError } from "../../game/useGameController";
import { ErrorDialog } from "./ErrorDialog";

interface Props {
  children: ReactNode;
  /** A new screen starts clean (an error on one screen never sticks to the next). */
  resetKey: string;
  /** Continue from the last save; true if there was one. */
  onRecover: () => Promise<boolean>;
  onTitle: () => void;
}

interface State {
  error: GameError | null;
}

declare global {
  interface Window {
    /** e2e only: the named screen throws while rendering, until cleared (Table.tsx). */
    __rnCrash?: string;
  }
}

/** e2e hook: `screen` throws on every render while a test sets the flag (React
 *  retries a failed render once, so a one-shot throw would go unnoticed). */
export function testCrash(screen: string): void {
  if (typeof window !== "undefined" && window.__rnCrash === screen) {
    throw new Error(`test crash in ${screen}`);
  }
}

/**
 * A crash while drawing a screen (bad data in an old save, a bug in a
 * component) shows the same recovery dialog as an engine error — try again,
 * continue from the last save, or go to the title — instead of a blank page.
 */
export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const detail = err instanceof Error && err.stack ? err.stack : message;
    return { error: { message, detail, at: Date.now() } };
  }

  componentDidCatch(_err: unknown, info: ErrorInfo): void {
    // Add where in the component tree it happened, for the copied report.
    this.setState((s) =>
      s.error ? { error: { ...s.error, detail: `${s.error.detail}\n\nComponent stack:${info.componentStack ?? ""}` } } : s,
    );
  }

  componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  private clear = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <ErrorDialog
        error={error}
        onRetry={this.clear}
        onRecover={async () => {
          const ok = await this.props.onRecover();
          if (ok) this.clear();
          return ok;
        }}
        onTitle={() => {
          this.props.onTitle();
          this.clear();
        }}
      />
    );
  }
}
