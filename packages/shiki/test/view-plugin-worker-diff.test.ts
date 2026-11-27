import { afterEach, describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { shikiToCodeMirror } from '../src';
import { exposeTokenizer } from '../src/worker';

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;

const mk = () => createHighlighterCore({
  langs: [import('shiki/langs/javascript.mjs')],
  themes: [import('shiki/themes/github-dark.mjs')],
  engine: createJavaScriptRegexEngine({ target: 'ES2018' }),
});
const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((f) => f()));

async function editor(doc: string, worker: boolean, errors: any[]) {
  const core = await mk();
  let opts: any = { highlighter: core, lang: 'javascript', themes: { dark: 'github-dark' }, defaultColor: 'dark', themeStyle: 'shiki', warnings: false, tokenizeMaxLineLength: 0, tokenizeTimeLimit: 0 };
  if (worker) {
    const ch = new MessageChannel();
    exposeTokenizer(() => mk(), ch.port2 as any);
    opts.tokenizeWorker = () => ch.port1 as any;
    opts.workerMinLineLength = 200;
    cleanups.push(() => { ch.port1.close(); ch.port2.close(); });
  }
  const { shiki } = await shikiToCodeMirror(opts);
  const parent = document.createElement('div'); document.body.appendChild(parent);
  const view = new EditorView({ state: EditorState.create({ doc, extensions: [shiki] }), parent });
  cleanups.push(() => { view.destroy(); parent.remove(); });
  const plugin = (view as any).plugins.map((p: any) => p.value).find((v: any) => v && 'shikiHighlighter' in v);
  return { view, plugin };
}
function toks(view: EditorView, plugin: any) {
  const out: string[] = [];
  for (let n = 1; n <= view.state.doc.lines; n++) {
    const line = view.state.doc.line(n);
    const chars = new Array(line.length).fill('');
    plugin.decorations.between(line.from, line.to, (f: number, t: number, v: any) => {
      for (let i = Math.max(f, line.from); i < Math.min(t, line.to); i++) chars[i - line.from] = v.spec.attributes.style;
    });
    // run-length
    let s = ''; let prev = null; 
    chars.forEach((c, i) => { if (c !== prev) { s += `${i}:${c}|`; prev = c; } });
    out.push(s);
  }
  return out;
}
async function waitFor(check: () => boolean, ms = 8000) {
  const end = Date.now() + ms;
  while (!check()) { if (Date.now() > end) throw new Error('timed out'); await new Promise((r) => setTimeout(r, 5)); }
}
const settledW = (p: any) => () => p.shikiHighlighter.workerDoneVersion === p.shikiHighlighter.workerVersion && p.pendingHighlight === null;
const settledM = (p: any) => () => p.pendingHighlight === null;

let seed = 12345;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const pieces = ['var a = 1;', 'function f(x){', '}', '/* c', '*/', '`tpl ${', '}`', '"s"', "'q'", ' // cmt', '\n', '\n', 'return x+1;', 'const o={a:[1,2,3]};', '(', ')', '{', '}', 'x'.repeat(60), 'if(a){b()}else{c()}'.repeat(15), '/*', 'class A extends B{m(){', '=>', '/re/g'];
const gen = (k: number) => { let s = ''; for (let i = 0; i < k; i++) s += pieces[rnd(pieces.length)]; return s; };

describe('tokenizer worker vs main thread', () => {
  it('matches after random edits (real grammar)', async () => {
    const errors: any[] = [];
    const doc = gen(80);
    const w = await editor(doc, true, errors);
    const m = await editor(doc, false, errors);
    w.plugin.updateHighlight(w.view); m.plugin.updateHighlight(m.view);
    await waitFor(settledW(w.plugin)); await waitFor(settledM(m.plugin));
    expect(toks(w.view, w.plugin)).toEqual(toks(m.view, m.plugin));
    for (let step = 0; step < 150; step++) {
      const burst = 1 + rnd(3);
      for (let b = 0; b < burst; b++) {
        const len = w.view.state.doc.length;
        const from = rnd(len + 1);
        const to = Math.min(len, from + (rnd(3) === 0 ? rnd(120) : 0));
        const insert = rnd(4) === 0 ? '' : gen(1 + rnd(3));
        const spec = { changes: { from, to, insert } };
        w.view.dispatch(spec); m.view.dispatch(spec);
        if (rnd(2)) await new Promise((r) => setTimeout(r, rnd(4)));
      }
      await waitFor(settledW(w.plugin)); await waitFor(settledM(m.plugin));
      await new Promise((r) => setTimeout(r, 20));
      await waitFor(settledW(w.plugin)); await waitFor(settledM(m.plugin));
      const a = toks(w.view, w.plugin), e = toks(m.view, m.plugin);
      for (let i = 0; i < e.length; i++) {
        if (a[i] !== e[i]) throw new Error(`step ${step} line ${i + 1} len ${w.view.state.doc.line(i+1).length}\nworker: ${a[i].slice(0,400)}\nmain:   ${e[i].slice(0,400)}`);
      }
    }
  }, 120000);
});

describe('tokenizer worker: stale tokens', () => {
  it('drops stale exact tokens when a line stops needing the worker', async () => {
    const errors: any[] = [];
    const doc = ['x', 'a=' + '1+'.repeat(150) + '1; /*', 'foo */ bar', 'baz'].join('\n');
    const w = await editor(doc, true, errors);
    const m = await editor(doc, false, errors);
    w.plugin.updateHighlight(w.view); m.plugin.updateHighlight(m.view);
    await waitFor(settledW(w.plugin)); await waitFor(settledM(m.plugin));
    expect(toks(w.view, w.plugin)).toEqual(toks(m.view, m.plugin));
    const spec = { changes: { from: 0, to: 1, insert: '`' } };
    w.view.dispatch(spec); m.view.dispatch(spec);
    await waitFor(settledW(w.plugin)); await waitFor(settledM(m.plugin));
    await new Promise((r) => setTimeout(r, 50));
    expect(toks(w.view, w.plugin)).toEqual(toks(m.view, m.plugin));
    expect(errors).toEqual([]);
  });
});

const ops = ['/*', '*/', '`', '"', "'", '${', '}', '{', '//', 'x', '', ''];
const tails = ['/*', '`', '${', '{', '"', '*/', ';', '`${'];
const shorts = ['foo */ bar', 'a = 1;', '} `', '`', 'x */ y /* z', '// c', '"s" + `t', '}', 'b()', '*/'];
const longLine = () => 'a=' + '1+'.repeat(110 + rnd(40)) + '1; ' + tails[rnd(tails.length)];
const line = () => (rnd(3) === 0 ? longLine() : shorts[rnd(shorts.length)]);
describe('tokenizer worker vs main thread: bursts on state-changing lines', () => {
  for (const sd of [1, 3, 10]) {
    it('seed ' + sd, async () => {
      seed = sd;
      const errors: any[] = [];
      const doc = Array.from({ length: 4 + rnd(10) }, line).join('\n');
      const w = await editor(doc, true, errors);
      const m = await editor(doc, false, errors);
      w.plugin.updateHighlight(w.view); m.plugin.updateHighlight(m.view);
      await waitFor(settledW(w.plugin)); await waitFor(settledM(m.plugin));
      for (let step = 0; step < 150; step++) {
        const burst = 1 + rnd(3);
        for (let b = 0; b < burst; b++) {
          const d = w.view.state.doc;
          const ln = d.line(1 + rnd(d.lines));
          const mode = rnd(6);
          let spec: any;
          if (mode <= 2) { const at = rnd(2) ? ln.from : ln.to; spec = { changes: { from: at, to: Math.min(ln.to, at + rnd(3)), insert: ops[rnd(ops.length)] } }; }
          else if (mode === 3) spec = { changes: { from: ln.from, to: ln.to, insert: line() } };
          else if (mode === 4) spec = { changes: { from: ln.to, insert: '\n' + line() } };
          else spec = { changes: { from: ln.from, to: Math.min(d.length, ln.to + 1), insert: '' } };
          w.view.dispatch(spec); m.view.dispatch(spec);
          if (rnd(2)) await new Promise((r) => setTimeout(r, rnd(3)));
        }
        await waitFor(settledW(w.plugin)); await waitFor(settledM(m.plugin));
        await new Promise((r) => setTimeout(r, 15));
        await waitFor(settledW(w.plugin)); await waitFor(settledM(m.plugin));
        const a = toks(w.view, w.plugin), e = toks(m.view, m.plugin);
        for (let i = 0; i < e.length; i++) {
          if (a[i] !== e[i]) throw new Error(`seed ${sd} step ${step} line ${i + 1}/${e.length} len ${w.view.state.doc.line(i+1).length}\nDOC ${JSON.stringify(w.view.state.doc.toString().replace(/(1\+){20,}/g,'<L>'))}\nworker: ${a[i].slice(0,300)}\nmain:   ${e[i].slice(0,300)}`);
        }
      }
      expect(errors).toEqual([]);
    }, 120000);
  }
});
