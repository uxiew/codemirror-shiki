import { afterEach, describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { shikiToCodeMirror, themeCompartment, updateEffect } from '../src';
import { mockState } from './helpers/mock-highlighter';

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;

const maps: Record<string, string[]> = {
  'mock-dark': ['', '#ffffff'],
  'mock-light': ['', '#000000'],
};
async function createExtension(themeStyle: 'shiki' | 'cm' = 'shiki') {
  const core = {
    loadLanguage() {}, loadTheme() {},
    getLanguage: () => ({ tokenizeLine2: () => ({ tokens: [0, 1 << 15], ruleStack: mockState('0'), stoppedEarly: false }) }),
    getTheme: (n: string) => ({ type: n === 'mock-dark' ? 'dark' : 'light', fg: maps[n][1], bg: '#111', colors: {} }),
    setTheme: (n: string) => ({ colorMap: maps[n] }),
  };
  return shikiToCodeMirror({ highlighter: core as any, lang: 'javascript', themes: { dark: 'mock-dark', light: 'mock-light' }, defaultColor: 'dark', themeStyle });
}
const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));
function mount(shiki: any, doc: string) {
  const parent = document.createElement('div'); document.body.appendChild(parent);
  const view = new EditorView({ state: EditorState.create({ doc, extensions: [shiki] }), parent });
  cleanups.push(() => { view.destroy(); parent.remove(); });
  const plugin = (view as any).plugins.map((p: any) => p.value).find((v: any) => v && 'shikiHighlighter' in v);
  return { view, plugin };
}
function styles(view: EditorView, plugin: any) {
  const out: string[] = [];
  plugin.decorations.between(0, view.state.doc.length, (_f: number, _t: number, v: any) => { out.push(v.spec.attributes.style); });
  return out;
}
async function settle(...plugins: any[]) {
  await new Promise((r) => setTimeout(r, 30));
  const end = Date.now() + 5000;
  while (plugins.some((p) => p.pendingHighlight !== null)) { if (Date.now() > end) throw new Error('timed out'); await new Promise((r) => setTimeout(r, 5)); }
}
async function changeTheme(getTheme: any, e: any, name: string) {
  e.view.dispatch({ effects: [themeCompartment.reconfigure(getTheme(name, e.view)), updateEffect.of({})] });
  await settle(e.plugin);
}
const W = 'color:#ffffff', K = 'color:#000000';

describe('shiki view plugin: themes with one extension in several editors', () => {
  it('switching B does not recolor A', async () => {
    const { shiki, getTheme } = await createExtension();
    const a = mount(shiki, 'a\na'); const b = mount(shiki, 'b\nb');
    a.plugin.updateHighlight(a.view); b.plugin.updateHighlight(b.view); await settle(a.plugin, b.plugin);
    await changeTheme(getTheme, b, 'light');
    expect(styles(b.view, b.plugin)).toEqual([K, K]);
    a.view.dispatch({ changes: { from: 0, insert: 'x\n' } }); a.plugin.updateHighlight(a.view); await settle(a.plugin);
    expect(styles(a.view, a.plugin)).toEqual([W, W, W]);
  });
  it('B can switch back', async () => {
    const { shiki, getTheme } = await createExtension();
    const a = mount(shiki, 'a\na'); const b = mount(shiki, 'b\nb');
    await settle(a.plugin, b.plugin);
    await changeTheme(getTheme, b, 'light');
    await changeTheme(getTheme, b, 'dark');
    expect(styles(b.view, b.plugin)).toEqual([W, W]);
  });
  it('A switching after an update still reaches... A only, and B switches independently', async () => {
    const { shiki, getTheme } = await createExtension();
    const a = mount(shiki, 'a\na'); const b = mount(shiki, 'b\nb');
    await settle(a.plugin, b.plugin);
    await changeTheme(getTheme, a, 'light');
    expect(styles(a.view, a.plugin)).toEqual([K, K]);
    await changeTheme(getTheme, b, 'light');
    expect(styles(b.view, b.plugin)).toEqual([K, K]);
  });
  it('getTheme after owner destroyed does not pin a view that uses a fork', async () => {
    const { shiki, getTheme } = await createExtension();
    const a = mount(shiki, 'a'); const b = mount(shiki, 'b');
    a.view.destroy();
    getTheme('dark', b.view);
    b.view.destroy();
    expect(a.plugin.shikiHighlighter.view).toBeUndefined();
  });
  it('themeStyle cm: switching B leaves A on its own theme', async () => {
    const { shiki, getTheme } = await createExtension('cm');
    const a = mount(shiki, 'a\na'); const b = mount(shiki, 'b\nb');
    await settle(a.plugin, b.plugin);
    const specs = (e: any) => { const out: string[] = []; e.plugin.decorations.between(0, e.view.state.doc.length, (_f: number, _t: number, v: any) => { out.push(JSON.stringify(v.spec)); }); return out; };
    const before = specs(a);
    await changeTheme(getTheme, b, 'light');
    expect(b.plugin.shikiHighlighter.currentTheme).toBe('light');
    a.view.dispatch({ changes: { from: a.view.state.doc.length, insert: '\na' } }); a.plugin.updateHighlight(a.view); await settle(a.plugin);
    expect(a.plugin.shikiHighlighter.currentTheme).toBe('dark');
    expect(specs(a).slice(0, before.length)).toEqual(before);
  });
});
