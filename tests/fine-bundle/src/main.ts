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
import typescript from '@shikijs/langs/typescript';
import json from '@shikijs/langs/json';
import githubDark from '@shikijs/themes/github-dark';
import githubLight from '@shikijs/themes/github-light';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app container');
}

app.innerHTML = `
  <div class="header">
    <h1>Fine-grained Bundle Test</h1>
    <p class="note">仅预加载 javascript / typescript / json 与 github-dark / github-light</p>
  </div>
  <div class="controls">
    <label>
      Language
      <select id="lang-select">
        <option value="javascript">javascript</option>
        <option value="typescript">typescript</option>
        <option value="json">json</option>
      </select>
    </label>
    <label>
      Theme
      <select id="theme-select">
        <option value="dark">dark</option>
        <option value="light">light</option>
      </select>
    </label>
  </div>
  <div id="editor"></div>
`;

const languageSamples: Record<string, string> = {
  javascript: `function sum(a, b) {\n  return a + b;\n}\n\nconsole.log(sum(1, 2));\n`,
  typescript: `type User = { id: number; name: string };\n\nconst user: User = { id: 1, name: 'Alice' };\nconsole.log(user);\n`,
  json: `{"name":"codemirror-shiki","version":"0.2.0","fineBundle":true}\n`,
};

const editorEl = document.querySelector<HTMLDivElement>('#editor');
const langSelect = document.querySelector<HTMLSelectElement>('#lang-select');
const themeSelect = document.querySelector<HTMLSelectElement>('#theme-select');

if (!editorEl || !langSelect || !themeSelect) {
  throw new Error('Missing required controls');
}

const highlighter = await createHighlighterCore({
  langs: [javascript, typescript, json],
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
