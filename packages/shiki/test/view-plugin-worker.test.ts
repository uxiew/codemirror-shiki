import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChangeSet, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { shikiToCodeMirror } from '../src';
import { exposeTokenizer } from '../src/worker';
import { mockState } from './helpers/mock-highlighter';

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

const WHITE = 'color:#ffffff';
const RED = 'color:#ff0000';
const BLUE = 'color:#0000ff';
const LONG = 1000;

// Inside an unclosed `{` lines are red. Long lines get a second, blue token
// from offset 10 so shifted offsets can be checked.
function tokenizeLine2(text: string, state: any) {
  const before = state ? Number(state.id) : 0;
  const after = Math.max(
    0,
    before + (text.match(/\{/g)?.length ?? 0) - (text.match(/\}/g)?.length ?? 0),
  );
  const color = before > 0 ? 2 : 1;
  const tokens = text.length >= LONG ? [0, color << 15, 10, 3 << 15] : [0, color << 15];
  return {
    tokens: Uint32Array.from(tokens),
    ruleStack: mockState(String(after)),
    stoppedEarly: false,
  };
}

function mockCore(options: { failTheme?: boolean } = {}) {
  const grammar = { tokenizeLine2: vi.fn(tokenizeLine2) };
  return {
    grammar,
    core: {
      loadLanguage() {},
      loadTheme() {},
      getLanguage: () => grammar,
      getTheme: () => ({ type: 'dark', fg: '#ffffff', bg: '#000000', colors: {} }),
      setTheme: () => {
        if (options.failTheme) throw new Error('theme not loaded');
        return { colorMap: ['', '#ffffff', '#ff0000', '#0000ff'] };
      },
    },
  };
}

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));

async function setup(doc: string, workerOptions: { failTheme?: boolean } = {}) {
  const main = mockCore();
  const worker = mockCore(workerOptions);
  const channel = new MessageChannel();
  exposeTokenizer(() => worker.core as any, channel.port2 as any);
  const postMessage = vi.spyOn(channel.port1, 'postMessage');
  const { shiki } = await shikiToCodeMirror({
    highlighter: main.core as any,
    lang: 'javascript',
    themes: { dark: 'mock-dark' },
    defaultColor: 'dark',
    themeStyle: 'shiki',
    warnings: false,
    tokenizeWorker: () => channel.port1 as any,
    workerMinLineLength: LONG,
  });
  const mount = (text: string) => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const view = new EditorView({
      state: EditorState.create({ doc: text, extensions: [shiki] }),
      parent,
    });
    cleanups.push(() => {
      view.destroy();
      parent.remove();
    });
    const plugin = (view as any).plugins
      .map((p: any) => p.value)
      .find((v: any) => v && 'shikiHighlighter' in v);
    return { view, plugin };
  };
  cleanups.push(() => {
    channel.port1.close();
    channel.port2.close();
  });
  const { view, plugin } = mount(doc);
  return { view, plugin, main, worker, postMessage, mount };
}

/** `[offset in line, style]` of every decoration, per line. */
function lineTokens(view: EditorView, plugin: any) {
  const lines: [number, string][][] = [];
  for (let n = 1; n <= view.state.doc.lines; n++) {
    const line = view.state.doc.line(n);
    const tokens: [number, string][] = [];
    plugin.decorations.between(line.from, line.to, (from: number, _t: number, v: any) => {
      tokens.push([from - line.from, v.spec.attributes.style]);
    });
    lines.push(tokens);
  }
  return lines;
}

async function waitFor(check: () => boolean) {
  const end = Date.now() + 5000;
  while (!check()) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

const workerDone = (plugin: any) => () => {
  const hl = plugin.shikiHighlighter;
  return (
    hl.workerDoneVersion === hl.workerVersion && plugin.pendingHighlight === null
  );
};

const longLine = '{' + 'x'.repeat(1200);

describe('shiki view plugin: tokenizer worker', () => {
  it('leaves long lines to the worker and shows its exact tokens', async () => {
    const { view, plugin, main } = await setup(['a', longLine, 'b', '}', 'c'].join('\n'));
    plugin.updateHighlight(view);
    await waitFor(workerDone(plugin));

    const longCalls = main.grammar.tokenizeLine2.mock.calls.filter(
      ([text]) => text.length >= LONG,
    );
    expect(longCalls).toEqual([]);
    expect(lineTokens(view, plugin)).toEqual([
      [[0, WHITE]],
      [[0, WHITE], [10, BLUE]],
      // Exact state after the long line, which the main thread never tokenized.
      [[0, RED]],
      [[0, RED]],
      [[0, WHITE]],
    ]);
  });

  it('keeps shifted tokens on an edited long line until the worker catches up', async () => {
    const { view, plugin } = await setup(['a', longLine, 'b'].join('\n'));
    plugin.updateHighlight(view);
    await waitFor(workerDone(plugin));

    const at = view.state.doc.line(2).from + 5;
    view.dispatch({ changes: { from: at, insert: 'zz' } });
    // Before any reply from the worker.
    expect(lineTokens(view, plugin)[1]).toEqual([[0, WHITE], [12, BLUE]]);

    await waitFor(workerDone(plugin));
    expect(lineTokens(view, plugin)[1]).toEqual([[0, WHITE], [10, BLUE]]);
    expect(lineTokens(view, plugin)[2]).toEqual([[0, RED]]);
  });

  it('keeps worker colors below a long line while the worker catches up', async () => {
    const { view, plugin } = await setup(['a', longLine, 'b'].join('\n'));
    plugin.updateHighlight(view);
    await waitFor(workerDone(plugin));
    expect(lineTokens(view, plugin)[2]).toEqual([[0, RED]]);

    view.dispatch({ changes: { from: 0, insert: 'q' } });
    // The editor alone would color line 3 from an approximate state (white).
    expect(lineTokens(view, plugin)[2]).toEqual([[0, RED]]);
    await waitFor(workerDone(plugin));
    expect(lineTokens(view, plugin)[2]).toEqual([[0, RED]]);
  });

  it('falls back to the main thread when the worker fails', async () => {
    const { view, plugin, main } = await setup(['a', longLine, 'b'].join('\n'), {
      failTheme: true,
    });
    plugin.updateHighlight(view);
    await waitFor(() => plugin.shikiHighlighter.workerFailed);
    await waitFor(() => plugin.pendingHighlight === null);

    expect(
      main.grammar.tokenizeLine2.mock.calls.some(([text]) => text.length >= LONG),
    ).toBe(true);
    expect(lineTokens(view, plugin)).toEqual([
      [[0, WHITE]],
      [[0, WHITE], [10, BLUE]],
      [[0, RED]],
    ]);
  });

  it('keeps the sessions of editors sharing one worker apart', async () => {
    const { view: a, plugin: pa, mount } = await setup(['a', longLine, 'b'].join('\n'));
    const { view: b, plugin: pb } = mount(['}', longLine.slice(1), 'b'].join('\n'));
    pa.updateHighlight(a);
    pb.updateHighlight(b);
    await waitFor(() => workerDone(pa)() && workerDone(pb)());

    expect(pa.shikiHighlighter.workerSession).not.toBe(pb.shikiHighlighter.workerSession);
    expect(lineTokens(a, pa)[2]).toEqual([[0, RED]]);
    expect(lineTokens(b, pb)[2]).toEqual([[0, WHITE]]);

    a.destroy();
    b.dispatch({ changes: { from: b.state.doc.line(2).from, insert: '{' } });
    await waitFor(workerDone(pb));
    expect(lineTokens(b, pb)[2]).toEqual([[0, RED]]);
  });

  it('closes its worker session when the editor is destroyed', async () => {
    const { view, plugin, postMessage } = await setup(['a', longLine].join('\n'));
    plugin.updateHighlight(view);
    await waitFor(workerDone(plugin));
    view.destroy();
    expect(postMessage).toHaveBeenLastCalledWith({ type: 'close', session: 1 });
    expect(plugin.shikiHighlighter.workerLines.size).toBe(0);
  });
});

describe('tokenizer worker protocol', () => {
  async function openSession() {
    const sent: any[] = [];
    const port: any = { postMessage: (m: any) => sent.push(m), onmessage: null };
    exposeTokenizer(() => mockCore().core as any, port);
    const text = ['a', 'x'.repeat(LONG + 5), 'b'].join('\n');
    port.onmessage({
      data: { type: 'open', session: 1, version: 1, text, lang: 'js', theme: 't', minLength: LONG },
    });
    await waitFor(() => sent.some((m) => m.done));
    const change = (seen: number) => {
      sent.length = 0;
      port.onmessage({
        data: {
          type: 'change',
          session: 1,
          version: 2,
          changes: ChangeSet.of({ from: 0, insert: 'c' }, text.length).toJSON(),
          seen,
        },
      });
    };
    return { sent, change, lastSeq: sent[sent.length - 1].seq };
  }
  const exactLines = (sent: any[]) =>
    sent.flatMap((m) => m.lines.filter((l: any) => l.exact).map((l: any) => l.line));

  it('sends lines again that the editor dropped as an old version', async () => {
    const { sent, change } = await openSession();
    change(0);
    await waitFor(() => sent.some((m) => m.done));
    expect(exactLines(sent)).toEqual([2]);
  });

  it('does not send lines again that the editor has', async () => {
    const { sent, change, lastSeq } = await openSession();
    change(lastSeq);
    await waitFor(() => sent.some((m) => m.done));
    expect(exactLines(sent)).toEqual([]);
  });
});

describe('tokenizer worker lifecycle', () => {
  async function mountWith(port: any, docs: string[]) {
    const main = mockCore();
    const { shiki } = await shikiToCodeMirror({
      highlighter: main.core as any,
      lang: 'javascript',
      themes: { dark: 'mock-dark' },
      defaultColor: 'dark',
      themeStyle: 'shiki',
      warnings: false,
      tokenizeWorker: () => port,
      workerMinLineLength: LONG,
    });
    const editors = docs.map((doc) => {
      const parent = document.createElement('div');
      document.body.appendChild(parent);
      const view = new EditorView({
        state: EditorState.create({ doc, extensions: [shiki] }),
        parent,
      });
      cleanups.push(() => {
        view.destroy();
        parent.remove();
      });
      const plugin = (view as any).plugins
        .map((p: any) => p.value)
        .find((v: any) => v && 'shikiHighlighter' in v);
      plugin.updateHighlight(view);
      return { view, plugin, main };
    });
    await waitFor(() => editors.every((e) => e.plugin.shikiHighlighter.workerSession !== 0));
    return editors;
  }

  it('falls back to the main thread when the worker script fails', async () => {
    // Never answers, like a worker whose script did not load.
    const port: any = { postMessage: vi.fn(), onmessage: null, terminate: vi.fn() };
    const [{ view, plugin, main }] = await mountWith(port, [['a', longLine, 'b'].join('\n')]);
    expect(lineTokens(view, plugin)[1]).toEqual([]);

    port.onerror(new Event('error'));
    expect(plugin.shikiHighlighter.workerFailed).toBe(true);
    await waitFor(() => plugin.pendingHighlight === null);
    expect(
      main.grammar.tokenizeLine2.mock.calls.some(([text]) => text.length >= LONG),
    ).toBe(true);
    expect(lineTokens(view, plugin)[1]).toEqual([[0, WHITE], [10, BLUE]]);
  });

  it('terminates the worker when its last editor is destroyed', async () => {
    const port: any = { postMessage: vi.fn(), onmessage: null, terminate: vi.fn() };
    const [a, b] = await mountWith(port, [longLine, longLine]);
    a.view.destroy();
    expect(port.terminate).not.toHaveBeenCalled();
    b.view.destroy();
    expect(port.terminate).toHaveBeenCalledTimes(1);
    expect(port.onmessage).toBe(null);
  });
});
