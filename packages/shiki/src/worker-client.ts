import type { FromWorker, ToWorker, TokenizerPort } from './worker-protocol';

/** One worker shared by every editor using an extension; one session per editor. */
export class TokenizeWorkerClient {
  private nextSession = 1;
  private listeners = new Map<number, (message: FromWorker) => void>();

  constructor(private readonly port: TokenizerPort) {
    port.onmessage = (event: MessageEvent<FromWorker>) => {
      this.listeners.get(event.data.session)?.(event.data);
    };
  }

  open(listener: (message: FromWorker) => void): number {
    const session = this.nextSession++;
    this.listeners.set(session, listener);
    return session;
  }

  close(session: number) {
    this.listeners.delete(session);
    this.port.postMessage({ type: 'close', session } satisfies ToWorker);
  }

  post(message: ToWorker) {
    this.port.postMessage(message);
  }
}
