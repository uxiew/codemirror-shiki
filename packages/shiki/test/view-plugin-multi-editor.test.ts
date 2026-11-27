import { afterEach, describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { shikiToCodeMirror } from '../src';
import { mockState } from './helpers/mock-highlighter';

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Lines after an unclosed `{` are red; the state carries the open depth.
function tokenizeLine2(text: string, state: any) {
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
}

async function createExtension() {
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

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));

function mount(shiki: any, doc: string) {
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

function lineStyles(view: EditorView, plugin: any) {
  const styles: (string | null)[] = [];
  for (let n = 1; n <= view.state.doc.lines; n++) {
    const line = view.state.doc.line(n);
    let style: string | null = null;
    plugin.decorations.between(line.from, line.to, (_f: number, _t: number, v: any) => {
      style = v.spec.attributes.style;
    });
    styles.push(style);
  }
  return styles;
}

async function settle(...plugins: any[]) {
  const end = Date.now() + 5000;
  while (plugins.some((p) => p.pendingHighlight !== null)) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

const WHITE = 'color:#ffffff';
const RED = 'color:#ff0000';

describe('shiki view plugin: one extension in several editors', () => {
  it('keeps line caches and decorations apart', async () => {
    const shiki = await createExtension();
    const a = mount(shiki, ['{', 'a', 'a', '}'].join('\n'));
    const b = mount(shiki, ['b', 'b', '{', 'b'].join('\n'));
    a.plugin.updateHighlight(a.view);
    b.plugin.updateHighlight(b.view);
    await settle(a.plugin, b.plugin);

    expect(a.plugin.shikiHighlighter).not.toBe(b.plugin.shikiHighlighter);
    expect(a.plugin.shikiHighlighter.view).toBe(a.view);
    expect(b.plugin.shikiHighlighter.view).toBe(b.view);
    expect(lineStyles(a.view, a.plugin)).toEqual([WHITE, RED, RED, RED]);
    expect(lineStyles(b.view, b.plugin)).toEqual([WHITE, WHITE, WHITE, RED]);
    expect(a.view.dom.classList.contains('lang-javascript')).toBe(true);
    expect(b.view.dom.classList.contains('lang-javascript')).toBe(true);

    b.view.dispatch({ changes: { from: 0, insert: '{' } });
    b.plugin.updateHighlight(b.view);
    await settle(b.plugin);
    expect(lineStyles(b.view, b.plugin)).toEqual([WHITE, RED, RED, RED]);
    expect(lineStyles(a.view, a.plugin)).toEqual([WHITE, RED, RED, RED]);
  });

  it('keeps the other editors working after one is destroyed', async () => {
    const shiki = await createExtension();
    const a = mount(shiki, ['{', 'a'].join('\n'));
    const b = mount(shiki, ['b', '{', 'b'].join('\n'));
    a.view.destroy();
    expect(a.plugin.shikiHighlighter.view).toBeUndefined();

    b.view.dispatch({ changes: { from: 0, insert: '}' } });
    b.plugin.updateHighlight(b.view);
    await settle(b.plugin);
    expect(b.plugin.shikiHighlighter.view).toBe(b.view);
    expect(lineStyles(b.view, b.plugin)).toEqual([WHITE, WHITE, RED]);

    // A new editor can take over the released highlighter.
    const c = mount(shiki, ['{', 'c'].join('\n'));
    c.plugin.updateHighlight(c.view);
    await settle(c.plugin);
    expect(lineStyles(c.view, c.plugin)).toEqual([WHITE, RED]);
  });
});
