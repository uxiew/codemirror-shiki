import './style.css';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  shikiToCodeMirror,
  themeCompartment,
  updateEffect,
} from '@cmshiki/shiki';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import typescript from '@shikijs/langs/typescript';
import json from '@shikijs/langs/json';
import darkPlus from '@shikijs/themes/dark-plus';
import githubLight from '@shikijs/themes/github-light';
import { languageSamples, mountHarness } from './ui';

const { editorEl, langSelect, themeSelect } = mountHarness(
  'Preloaded Highlighter',
  '使用 @cmshiki/shiki + createHighlighterCore，预加载 3 语言 + 2 主题',
);

const highlighter = await createHighlighterCore({
  langs: [() => import('@shikijs/langs/javascript'), typescript, json,
  () => import('@shikijs/langs/markdown')
  ],
  themes: [darkPlus, githubLight],
  engine: createJavaScriptRegexEngine(),

});

const { shiki, getTheme } = await shikiToCodeMirror({
  highlighter,
  lang: 'javascript',
  themes: {
    dark: darkPlus.name as string,
    light: githubLight.name as string,
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
