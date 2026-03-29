import './style.css';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  shikiToCodeMirror,
  themeCompartment,
  updateEffect,
} from '@cmshiki/shiki';
import { createHighlighter } from 'shiki';
import { languageSamples, mountHarness } from './ui';

const { editorEl, langSelect, themeSelect } = mountHarness(
  'Full Shiki Bundle',
  '使用 shiki 全量包（包含内置引擎和全量语言/主题注册）',
);

const highlighter = await createHighlighter({
  langs: ['javascript', 'typescript', 'json', 'markdown'],
  themes: ['dark-plus', 'github-light'],
});

const { shiki, getTheme } = await shikiToCodeMirror({
  highlighter,
  lang: 'javascript',
  themes: {
    dark: 'dark-plus',
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
