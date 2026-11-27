import type { FromWorker, ToWorker, TokenizerPort } from './worker-protocol';

/** One worker shared by every editor using an extension; one session per editor. */
export class TokenizeWorkerClient {
  private nextSession = 1;
  private listeners = new Map<number, (message: FromWorker) => void>();
  /** The worker failed to load or threw outside a session. */
  failed = false;

  constructor(private readonly port: TokenizerPort) {
    port.onmessage = (event: MessageEvent<FromWorker>) => {
      this.listeners.get(event.data.session)?.(event.data);
    };
    const fail = (event: any) => this.fail(String(event?.message ?? event?.type ?? event));
    port.onerror = fail;
    port.onmessageerror = fail;
  }

  open(listener: (message: FromWorker) => void): number {
    const session = this.nextSession++;
    this.listeners.set(session, listener);
    return session;
  }

  /** Close a session; `true` when it was the last and the worker is gone. */
  close(session: number): boolean {
    this.listeners.delete(session);
    if (!this.failed) this.port.postMessage({ type: 'close', session } satisfies ToWorker);
    if (this.listeners.size > 0) return false;
    this.port.onmessage = null;
    this.port.onerror = null;
    this.port.onmessageerror = null;
    this.port.terminate?.();
    return true;
  }

  post(message: ToWorker) {
    if (!this.failed) this.port.postMessage(message);
  }

  private fail(message: string) {
    if (this.failed) return;
    this.failed = true;
    for (const [session, listener] of [...this.listeners]) {
      listener({ type: 'error', session, message });
    }
  }
}
