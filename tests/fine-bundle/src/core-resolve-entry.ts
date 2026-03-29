import './style.css';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  shikiToCodeMirror,
  themeCompartment,
  updateEffect,
  createLangResolver,
  createThemeResolver,
} from '@cmshiki/shiki';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { languageSamples, mountHarness } from './ui';

const { editorEl, langSelect, themeSelect } = mountHarness(
  'Dynamic Highlighter (Resolver Mode)',
  '演示 Options.resolveLang / resolveTheme 的用法（按需动态加载）',
);

const engine = createJavaScriptRegexEngine();

const resolveLang = createLangResolver({
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  json: () => import('@shikijs/langs/json'),
  // markdown: () => import('@shikijs/langs/markdown'),
});

const resolveTheme = createThemeResolver({
  'github-dark': () => import('@shikijs/themes/github-dark'),
  'github-light': () => import('@shikijs/themes/github-light'),
});

const initialHighlighter = await createHighlighterCore({
  langs: [() => import('@shikijs/langs/json')],
  themes: [
    resolveTheme.loaders['github-dark'],
    resolveTheme.loaders['github-light'],
  ],
  engine,
});

const { shiki, getTheme } = await shikiToCodeMirror({
  highlighter: initialHighlighter,
  lang: 'javascript',
  resolveLang,
  resolveTheme,
  themes: {
    dark: 'github-dark',
    light: 'github-light',
  },
  defaultColor: 'dark',
  themeStyle: 'cm',
  warnings: true,
});

const view = new EditorView({
  parent: editorEl,
  state: EditorState.create({
    doc: languageSamples.javascript,
    extensions: [shiki],
  }),
});

langSelect.addEventListener('change', async () => {
  const lang = langSelect.value;
  const nextDoc = languageSamples[lang] ?? languageSamples.javascript;

  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: nextDoc },
    effects: updateEffect.of({ lang }), // 只需要传新语言，如果未注册，内部会调用 resolveLang 并 load
  });
});

themeSelect.addEventListener('change', () => {
  const key = themeSelect.value;
  view.dispatch({
    effects: [
      themeCompartment.reconfigure(getTheme(key, view)),
      updateEffect.of({}),
    ],
  });
});
