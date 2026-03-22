export const languageSamples: Record<string, string> = {
  javascript: `function sum(a, b) {\n  return a + b;\n}\n\nconsole.log(sum(1, 2));\n`,
  typescript: `type User = { id: number; name: string };\n\nconst user: User = { id: 1, name: 'Alice' };\nconsole.log(user);\n`,
  json: `{"name":"codemirror-shiki","version":"0.2.0","fineBundle":true}\n`,
};

export function mountHarness(title: string, note: string) {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) {
    throw new Error('Missing #app container');
  }

  app.innerHTML = `
  <div class="header">
    <h1>${title}</h1>
    <p class="note">${note}</p>
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

  const editorEl = document.querySelector<HTMLDivElement>('#editor');
  const langSelect = document.querySelector<HTMLSelectElement>('#lang-select');
  const themeSelect = document.querySelector<HTMLSelectElement>('#theme-select');

  if (!editorEl || !langSelect || !themeSelect) {
    throw new Error('Missing required controls');
  }

  return {
    editorEl,
    langSelect,
    themeSelect,
  };
}
