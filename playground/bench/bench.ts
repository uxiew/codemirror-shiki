import { EditorView, basicSetup } from 'codemirror';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { shikiToCodeMirror } from '@cmshiki/shiki';

const params = new URLSearchParams(location.search);
const lang = params.get('lang') || 'javascript';
const engine = params.get('engine') || 'oniguruma';
const themeName = params.get('theme') || 'github-dark';
const repeat = Number(params.get('repeat') || 1);

async function main() {
  const sample: string = (await import(`../../samples/${lang}.sample?raw`)).default;
  const doc = Array.from({ length: repeat }, () => sample).join('\n');
  const highlighter = await createHighlighterCore({
    langs: [(await import(`../node_modules/tm-grammars/grammars/${lang}.json`)).default],
    themes: [(await import(`../node_modules/tm-themes/themes/${themeName}.json`)).default],
    engine: engine === 'javascript' ? createJavaScriptRegexEngine() : createOnigurumaEngine(() => import('shiki/wasm')),
  });
  const { shiki } = await shikiToCodeMirror({ highlighter, lang, theme: themeName, themeStyle: params.get('style') === 'cm' ? 'cm' : 'shiki' });
  const view = new EditorView({ doc, parent: document.getElementById('app')!, extensions: [basicSetup, shiki] });
  (window as any).__view = view;
  (window as any).__hl = highlighter;
  (window as any).__lang = lang;
  (window as any).__theme = themeName;
  (window as any).__ready = true;
}
main();
