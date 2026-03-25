import './style.css';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  createSharedHighlighterManager,
  shikiToCodeMirror,
  themeCompartment,
  updateEffect,
} from '@cmshiki/shiki/core';
import { languageSamples, mountHarness } from './ui';

const { editorEl, langSelect, themeSelect } = mountHarness(
  'Core Resolve (Cached)',
  '使用 createSharedHighlighterManager + getHighlighter(lang)（按语言缓存）',
);

const manager = createSharedHighlighterManager({
  langLoaders: {
    javascript: () => import('@shikijs/langs/javascript'),
    typescript: () => import('@shikijs/langs/typescript'),
    json: () => import('@shikijs/langs/json'),
  },
  themeLoaders: {
    'github-dark': () => import('@shikijs/themes/github-dark'),
    'github-light': () => import('@shikijs/themes/github-light'),
  },
  preloadLang: 'javascript',
  preloadThemes: ['github-dark', 'github-light'],
  engine: 'oniguruma',
  warnings: true,
});

let languageRequestId = 0;

const { shiki, getTheme } = await shikiToCodeMirror({
  highlighter: await manager.getHighlighter('javascript'),
  lang: 'javascript',
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
  const requestId = ++languageRequestId;
  const highlighter = await manager.getHighlighter(lang);
  if (requestId !== languageRequestId) return;

  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: nextDoc },
    effects: updateEffect.of({ lang, highlighter }),
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
