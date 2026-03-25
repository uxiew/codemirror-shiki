import './style.css';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  shikiToCodeMirror,
  themeCompartment,
  updateEffect,
} from '@cmshiki/shiki/core';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { languageSamples, mountHarness } from './ui';

const { editorEl, langSelect, themeSelect } = mountHarness(
  'Core Dynamic (No Cache)',
  '使用 @cmshiki/shiki/core + 手动动态创建 highlighter（不使用缓存）',
);

const engine = createJavaScriptRegexEngine({ target: 'ES2018' });

const languageLoaders = {
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  json: () => import('@shikijs/langs/json'),
} as const;

const themeLoaders = {
  'github-dark': () => import('@shikijs/themes/github-dark'),
  'github-light': () => import('@shikijs/themes/github-light'),
} as const;

const themesPromise = Promise.all(
  Object.values(themeLoaders).map((loader) =>
    loader().then((m) => m.default ?? m),
  ),
);

async function loadLang(lang: string) {
  const loader =
    languageLoaders[lang as keyof typeof languageLoaders] ||
    languageLoaders.javascript;
  const mod = await loader();
  return mod.default ?? mod;
}

async function createHighlighterForLang(lang: string) {
  const [langInput, themes] = await Promise.all([
    loadLang(lang),
    themesPromise,
  ]);
  return createHighlighterCore({
    langs: [langInput],
    themes,
    engine,
  });
}

let languageRequestId = 0;
const initialHighlighter = await createHighlighterForLang('javascript');

const { shiki, getTheme } = await shikiToCodeMirror({
  highlighter: initialHighlighter,
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
  const highlighter = await createHighlighterForLang(lang);
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
