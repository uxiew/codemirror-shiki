import './style.css';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  shikiToCodeMirror,
  themeCompartment,
  updateEffect,
} from '@cmshiki/shiki';
import { languageSamples, mountHarness } from './ui';

const { editorEl, langSelect, themeSelect } = mountHarness(
  'Default Entry Dynamic Loading',
  '使用 @cmshiki/shiki（默认入口），不传 resolveLanguage/resolveTheme',
);

const { shiki, getTheme } = await shikiToCodeMirror({
  lang: 'javascript',
  themes: {
    dark: 'github-dark',
    light: 'github-light',
  },
  defaultColor: 'dark',
  themeStyle: 'cm',
  engine: 'javascript',
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
