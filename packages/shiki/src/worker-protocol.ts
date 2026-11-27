/** Messages between the editor and a tokenizer worker (see `./worker`). */

export type ToWorker =
  /** Start over with a whole document, e.g. on the first pass or a theme switch. */
  | {
      type: 'open';
      session: number;
      version: number;
      text: string;
      lang: string;
      theme: string;
      minLength: number;
    }
  /**
   * The document changed; `changes` is `ChangeSet.toJSON()`. `seen` is the
   * last `seq` the editor received: it drops anything sent after that for
   * the old version, so the worker sends it again.
   */
  | {
      type: 'change';
      session: number;
      version: number;
      changes: unknown;
      seen: number;
    }
  /** Visible lines (1-based, inclusive); long ones get a quick head pass first. */
  | { type: 'viewport'; session: number; from: number; to: number }
  | { type: 'close'; session: number };

export interface WorkerLineTokens {
  line: number;
  tokens: Uint32Array;
  /** Characters the tokens cover; shorter than the line for a quick head pass. */
  length: number;
  /** Tokenized from the exact grammar state of the line, over the whole line. */
  exact: boolean;
}

export type FromWorker =
  | {
      type: 'tokens';
      session: number;
      version: number;
      /** Counts up per session. */
      seq: number;
      colorMap: string[];
      lines: WorkerLineTokens[];
      /** Lines whose tokens the editor can compute itself again. */
      drops: number[];
      /** The walk reached the end of the document for this version. */
      done: boolean;
    }
  | { type: 'error'; session: number; message: string };

/** Anything that carries messages: a `Worker`, a `MessagePort`, ... */
export interface TokenizerPort {
  postMessage(message: any): void;
  onmessage: ((event: MessageEvent) => void) | null;
}
