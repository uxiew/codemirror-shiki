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
import javascript from '@shikijs/langs/javascript';
import githubDark from '@shikijs/themes/github-dark';
import githubLight from '@shikijs/themes/github-light';
import { languageSamples, mountHarness } from './ui';

const { editorEl, langSelect, themeSelect } = mountHarness(
  'Core Resolve (No Cache)',
  '使用 @cmshiki/shiki/core + resolveLanguage/resolveTheme（不使用缓存 API）',
);

const highlighter = await createHighlighterCore({
  langs: [javascript],
  themes: [githubDark, githubLight],
  engine: createJavaScriptRegexEngine(),
});

const { shiki, getTheme } = await shikiToCodeMirror({
  highlighter,
  lang: 'javascript',
  themes: {
    dark: 'github-dark',
    light: 'github-light',
  },
  defaultColor: 'dark',
  themeStyle: 'cm',
  warnings: true,
  resolveLanguage: async (lang) => {
    if (lang === 'javascript')
      return (await import('@shikijs/langs/javascript')).default;
    if (lang === 'typescript')
      return (await import('@shikijs/langs/typescript')).default;
    if (lang === 'json') return (await import('@shikijs/langs/json')).default;
    return undefined;
  },
  resolveTheme: async (theme) => {
    if (theme === 'github-dark')
      return (await import('@shikijs/themes/github-dark')).default;
    if (theme === 'github-light')
      return (await import('@shikijs/themes/github-light')).default;
    return undefined;
  },
});

const view = new EditorView({
  parent: editorEl,
  state: EditorState.create({
    doc: languageSamples.javascript,
    extensions: [shiki],
  }),
});

langSelect.addEventListener('change', () => {
  const lang = langSelect.value;
  const nextDoc = languageSamples[lang] ?? languageSamples.javascript;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: nextDoc },
    effects: updateEffect.of({ lang }),
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
