import type {
  BootStage,
  HumanCommand,
  NewGameConfig,
  StepResult,
  WorkerRequest,
  WorkerResponse,
} from "./protocol";

type Pending = { resolve: (value: unknown) => void; reject: (err: Error) => void };
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/** Promise-based RPC to the engine worker. One instance for the whole app. */
export class EngineClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private ready: Promise<void> | null = null;
  onProgress: (stage: BootStage) => void = () => {};

  constructor() {
    this.worker = new Worker(new URL("./engine.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      if ("progress" in msg) {
        this.onProgress(msg.progress);
        return;
      }
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      this.pending.delete(msg.id);
      if (msg.ok) entry.resolve(msg.result);
      else entry.reject(new Error(msg.error));
    };
    this.worker.onerror = (event) => {
      const error = new Error(event.message || "engine worker crashed");
      for (const entry of this.pending.values()) entry.reject(error);
      this.pending.clear();
    };
  }

  private call<T>(req: DistributiveOmit<WorkerRequest, "id">): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker.postMessage({ ...req, id } as WorkerRequest);
    });
  }

  init(): Promise<void> {
    this.ready ??= this.call<boolean>({ op: "init", baseUrl: new URL("./", window.location.href).href }).then(
      () => undefined,
    );
    return this.ready;
  }

  newGame(config: NewGameConfig) {
    return this.call<StepResult>({ op: "newGame", config });
  }
  act(command: HumanCommand) {
    return this.call<StepResult>({ op: "act", command });
  }
  aiStep() {
    return this.call<StepResult>({ op: "aiStep" });
  }
  nextRound() {
    return this.call<StepResult>({ op: "nextRound" });
  }
  save() {
    return this.call<string>({ op: "save" });
  }
  load(blob: string) {
    return this.call<StepResult>({ op: "load", blob });
  }
}

let instance: EngineClient | null = null;
export function getEngine(): EngineClient {
  instance ??= new EngineClient();
  return instance;
}
