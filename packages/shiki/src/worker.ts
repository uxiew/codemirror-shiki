import { ChangeSet, Text } from '@codemirror/state';

import { grammarStatesEqual, remapLineCache } from './line-cache';
import type { Highlighter } from './types/types';
import type {
  FromWorker,
  ToWorker,
  TokenizerPort,
  WorkerLineTokens,
} from './worker-protocol';

export type { TokenizerPort } from './worker-protocol';

/** Characters a quick pass over a visible long line covers. */
const HEAD_CHARS = 4000;
/** Work between two checks for new messages. */
const SLICE_MS = 12;

interface Entry {
  text: string;
  /** State before the line, following every line exactly. */
  exactStart: any;
  exactEnd: any;
  /**
   * State before the line the way the editor computes it: it skips long lines
   * and passes their start state on. Where both agree the editor's own
   * tokens are already exact and nothing is sent for the line.
   */
  approxStart: any;
  approxEnd: any;
  tokens: Uint32Array;
  /** The editor holds this line's exact tokens. */
  posted: boolean;
  /** `seq` of the message that last sent tokens or a drop for the line. */
  seq: number;
  /** A drop for the line may have been lost; send it again. */
  redrop: boolean;
}

interface Session {
  id: number;
  doc: Text;
  version: number;
  lang: string;
  theme: string;
  minLength: number;
  cache: Map<number, Entry>;
  /** Text of the lines that got a quick head pass. */
  heads: Map<number, string>;
  visible: [number, number];
  generation: number;
  seq: number;
  running: boolean;
  closed: boolean;
}

const yieldToMessages = () =>
  new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });

/**
 * Tokenize long lines for `shikiToCodeMirror({ tokenizeWorker })` off the main
 * thread. Call it in a worker module with a function that creates a Shiki
 * core with the same languages and themes as the editor:
 *
 * ```ts
 * // tokenizer.worker.ts
 * import { exposeTokenizer } from '@cmshiki/shiki/worker'
 * exposeTokenizer(() => createHighlighterCore({ langs, themes, engine }))
 * ```
 */
export function exposeTokenizer(
  createCore: () => Highlighter | Promise<Highlighter>,
  port: TokenizerPort = globalThis as any,
) {
  // Start loading grammars and the engine before the first document arrives.
  const core: Promise<Highlighter> = Promise.resolve().then(createCore);
  core.catch(() => {});
  const sessions = new Map<number, Session>();
  const post = (message: FromWorker) => port.postMessage(message);

  port.onmessage = (event: MessageEvent<ToWorker>) => {
    const message = event.data;
    if (message.type === 'open') {
      const previous = sessions.get(message.session);
      const keep =
        previous &&
        previous.lang === message.lang &&
        previous.theme === message.theme;
      const cache = keep ? previous!.cache : new Map<number, Entry>();
      // The editor dropped what it had; send everything again.
      for (const entry of cache.values()) entry.posted = false;
      const session: Session = {
        id: message.session,
        doc: Text.of(message.text.split(/\r\n?|\n/)),
        version: message.version,
        lang: message.lang,
        theme: message.theme,
        minLength: message.minLength,
        cache,
        heads: new Map(),
        visible: previous?.visible ?? [1, 0],
        generation: (previous?.generation ?? 0) + 1,
        seq: previous?.seq ?? 0,
        running: false,
        closed: false,
      };
      if (previous) previous.closed = true;
      sessions.set(message.session, session);
      run(session);
      return;
    }
    const session = sessions.get(message.session);
    if (!session) return;
    if (message.type === 'change') {
      // The editor ignores what was sent after `seen` for the old version.
      for (const entry of session.cache.values()) {
        if (entry.seq <= message.seen) continue;
        if (entry.posted) entry.posted = false;
        else entry.redrop = true;
      }
      const changes = ChangeSet.fromJSON(message.changes);
      const doc = changes.apply(session.doc);
      remapLineCache(session.cache, session.doc, doc, changes);
      remapLineCache(session.heads, session.doc, doc, changes);
      session.doc = doc;
      session.version = message.version;
      session.generation++;
      run(session);
    } else if (message.type === 'viewport') {
      session.visible = [message.from, message.to];
      run(session);
    } else if (message.type === 'close') {
      session.closed = true;
      sessions.delete(message.session);
    }
  };

  async function run(session: Session) {
    if (session.running) return;
    session.running = true;
    try {
      const shiki = await core;
      while (!session.closed) {
        const generation = session.generation;
        const finished = await walk(session, shiki, generation);
        if (finished && generation === session.generation) break;
      }
    } catch (error) {
      session.closed = true;
      post({
        type: 'error',
        session: session.id,
        message: String((error as Error)?.message ?? error),
      });
    } finally {
      session.running = false;
    }
  }

  /** Walk the document once; `false` when a newer version interrupted it. */
  async function walk(session: Session, shiki: Highlighter, generation: number) {
    const { colorMap } = shiki.setTheme(session.theme);
    const grammar = shiki.getLanguage(session.lang);
    let lines: WorkerLineTokens[] = [];
    let drops: number[] = [];
    const flush = (done: boolean) => {
      if (!done && lines.length === 0 && drops.length === 0) return;
      post({
        type: 'tokens',
        session: session.id,
        version: session.version,
        seq: ++session.seq,
        colorMap,
        lines,
        drops,
        done,
      });
      lines = [];
      drops = [];
    };
    const interrupted = () =>
      session.closed || session.generation !== generation;

    const quickHeads = () => {
      const { doc, cache, heads, visible } = session;
      const to = Math.min(visible[1], doc.lines);
      for (let n = Math.max(1, visible[0]); n <= to; n++) {
        const text = doc.line(n).text;
        if (text.length < session.minLength || heads.get(n) === text) continue;
        const entry = cache.get(n);
        if (entry?.text === text && entry.posted) continue;
        const start =
          entry?.text === text ? entry.exactStart : (cache.get(n - 1)?.exactEnd ?? null);
        const head = text.slice(0, HEAD_CHARS);
        const result = grammar.tokenizeLine2(head, start, 0);
        heads.set(n, text);
        lines.push({ line: n, tokens: result.tokens, length: head.length, exact: false });
        // One line per message, so the first visible line shows up first.
        flush(false);
      }
    };

    quickHeads();
    let sliceStart = performance.now();
    let exact: any = null;
    let approx: any = null;
    for (let n = 1; n <= session.doc.lines; n++) {
      if (performance.now() - sliceStart > SLICE_MS) {
        flush(false);
        await yieldToMessages();
        if (interrupted()) return false;
        quickHeads();
        sliceStart = performance.now();
      }
      const text = session.doc.line(n).text;
      const long = text.length >= session.minLength;
      let entry = session.cache.get(n);
      if (
        !entry ||
        entry.text !== text ||
        !grammarStatesEqual(entry.exactStart, exact) ||
        !grammarStatesEqual(entry.approxStart, approx)
      ) {
        const result = grammar.tokenizeLine2(text, exact, 0);
        const exactEnd = result.ruleStack;
        const approxEnd = long
          ? approx
          : grammarStatesEqual(exact, approx)
            ? exactEnd
            : grammar.tokenizeLine2(text, approx, 0).ruleStack;
        entry = {
          text,
          exactStart: exact,
          exactEnd,
          approxStart: approx,
          approxEnd,
          tokens: result.tokens,
          posted: false,
          seq: 0,
          redrop: false,
        };
        session.cache.set(n, entry);
      }
      const needed = long || !grammarStatesEqual(exact, approx);
      if (needed && !entry.posted) {
        lines.push({ line: n, tokens: entry.tokens, length: text.length, exact: true });
        entry.posted = true;
        entry.redrop = false;
        entry.seq = session.seq + 1;
      } else if (!needed && (entry.posted || entry.redrop)) {
        drops.push(n);
        entry.posted = false;
        entry.redrop = false;
        entry.seq = session.seq + 1;
      }
      exact = entry.exactEnd;
      approx = entry.approxEnd;
    }
    for (const n of session.cache.keys()) {
      if (n > session.doc.lines) session.cache.delete(n);
    }
    flush(true);
    return true;
  }

}
