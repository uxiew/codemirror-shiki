import { EditorView, basicSetup } from 'codemirror';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { shikiToCodeMirror } from '@cmshiki/shiki';

// ?shared=1 reuses one `shiki` extension for every editor; otherwise each editor gets its own.
// ?langs=javascript,python&themes=github-dark,github-light&style=cm&repeat=20
const params = new URLSearchParams(location.search);
const langs = (params.get('langs') || 'javascript,python,rust,css').split(',');
const themes = (params.get('themes') || 'github-dark,github-light').split(',');
const shared = params.has('shared');
const themeStyle = params.get('style') === 'cm' ? 'cm' : 'shiki';
const repeat = Number(params.get('repeat') || 20);

async function main() {
  const highlighter = await createHighlighterCore({
    langs: await Promise.all(langs.map(async (l) => (await import(`../node_modules/tm-grammars/grammars/${l}.json`)).default)),
    themes: await Promise.all(themes.map(async (t) => (await import(`../node_modules/tm-themes/themes/${t}.json`)).default)),
    engine: createOnigurumaEngine(() => import('shiki/wasm')),
  });
  const make = (lang: string, theme: string) => shikiToCodeMirror({ highlighter, lang, theme, themeStyle, warnings: false });
  const sharedExt = shared ? await make(langs[0], themes[0]) : null;
  const views: EditorView[] = [];
  for (let i = 0; i < langs.length; i++) {
    const lang = shared ? langs[0] : langs[i];
    const ext = sharedExt ?? (await make(lang, themes[i % themes.length]));
    const sample = (await import(`../../samples/${lang}.sample?raw`)).default as string;
    const parent = document.createElement('div');
    document.getElementById('app')!.appendChild(parent);
    views.push(new EditorView({ doc: Array.from({ length: repeat }, () => sample).join('\n'), parent, extensions: [basicSetup, ext.shiki] }));
  }
  Object.assign(window as any, { __views: views, __hl: highlighter, __langs: langs, __themes: themes, __shared: shared, __ready: true });
}
main();
