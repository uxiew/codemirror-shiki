import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { shikiToCodeMirror } from '../src';
import { mockState } from './helpers/mock-highlighter';

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

const LINES = 3000;
const LINE_COST_MS = 0.3;

/**
 * One block spanning the whole file, so the speculative guess starts at
 * depth 0 and is wrong: lines inside it are red only once the exact walk
 * arrives. Every line `n % 50 === 10` is indented less than the rest, so a
 * guess for line 2500 starts at line 2460, the full 40-line lookback.
 */
const doc = [
  '{',
  ...Array.from({ length: LINES - 2 }, (_, i) => ((i + 2) % 50 === 10 ? ' y' : '  x') + i),
  '}',
].join('\n');

function createTokenizer(costMs: () => number) {
  return (text: string, state: any) => {
    const wait = costMs();
    if (wait > 0) {
      const until = performance.now() + wait;
      while (performance.now() < until) {}
    }
    const before = state ? Number(state.id) : 0;
    const after = Math.max(
      0,
      before + (text.match(/\{/g)?.length ?? 0) - (text.match(/\}/g)?.length ?? 0),
    );
    return {
      tokens: [0, (before > 0 ? 2 : 1) << 15],
      ruleStack: mockState(String(after)),
      stoppedEarly: false,
    };
  };
}

async function createExtension(tokenizeLine2: (...args: any[]) => any) {
  const core = {
    loadLanguage() {},
    loadTheme() {},
    getLanguage: () => ({ tokenizeLine2 }),
    getTheme: () => ({ type: 'dark', fg: '#ffffff', bg: '#000000', colors: {} }),
    setTheme: () => ({ colorMap: ['', '#ffffff', '#ff0000'] }),
  };
  const { shiki } = await shikiToCodeMirror({
    highlighter: core as any,
    lang: 'javascript',
    themes: { dark: 'mock-dark' },
    defaultColor: 'dark',
    themeStyle: 'shiki',
  });
  return shiki;
}

// jsdom has no layout, so the visible ranges are driven by the test.
const descriptor = Object.getOwnPropertyDescriptor(EditorView.prototype, 'visibleRanges')!;
let visible: { from: number; to: number }[] = [];
Object.defineProperty(EditorView.prototype, 'visibleRanges', {
  configurable: true,
  get() {
    return visible;
  },
});

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));
afterAll(() => Object.defineProperty(EditorView.prototype, 'visibleRanges', descriptor));

function mount(shiki: any) {
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
  return { view, plugin };
}

function linesRange(view: EditorView, first: number, last: number) {
  const d = view.state.doc;
  return [{ from: d.line(first).from, to: d.line(last).to }];
}

/** Style of every line in the range, `null` for an unstyled one. */
function lineStyles(view: EditorView, plugin: any, first: number, last: number) {
  const styles: (string | null)[] = [];
  for (let n = first; n <= last; n++) {
    const line = view.state.doc.line(n);
    let style: string | null = null;
    plugin.decorations.between(line.from, line.to, (_f: number, _t: number, v: any) => {
      style = v.spec.attributes.style;
    });
    styles.push(style);
  }
  return styles;
}

async function until(cond: () => boolean, timeoutMs: number) {
  const end = Date.now() + timeoutMs;
  while (!cond()) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe('shiki view plugin: cold drag far past the trusted prefix', () => {
  it('styles the whole viewport before the exact walk and then converges', async () => {
    let cost = 0;
    const shiki = await createExtension(createTokenizer(() => cost));
    visible = [{ from: 0, to: 20 }];
    const { view, plugin } = mount(shiki);
    visible = linesRange(view, 1, 20);
    plugin.updateHighlight(view, { sync: true });
    await until(() => plugin.shikiHighlighter.isWarm, 1000);

    // Drag to line 2500: the 40-line lookback alone outlasts one 8ms chunk.
    cost = LINE_COST_MS;
    const [first, last] = [2500, 2519];
    visible = linesRange(view, first, last);
    plugin.updateHighlight(view, { coarse: true });

    await until(() => lineStyles(view, plugin, first, last).every((s) => s !== null), 2000);
    const target = view.state.doc.line(first).from;
    expect(plugin.shikiHighlighter.needsSpeculation(view.state.doc, target)).toBe(true);

    await until(
      () =>
        !plugin.shikiHighlighter.needsSpeculation(view.state.doc, target) &&
        plugin.pendingHighlight === null,
      15000,
    );
    const settled = lineStyles(view, plugin, first, last);

    cost = 0;
    const fresh = mount(await createExtension(createTokenizer(() => 0)));
    fresh.plugin.updateHighlight(fresh.view);
    await until(() => fresh.plugin.pendingHighlight === null, 5000);
    const expected = lineStyles(fresh.view, fresh.plugin, first, last);

    expect(expected.every((s) => s === 'color:#ff0000')).toBe(true);
    expect(settled).toEqual(expected);
  }, 30000);
});
