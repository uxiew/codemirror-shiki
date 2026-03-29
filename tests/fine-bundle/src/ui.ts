export const languageSamples: Record<string, string> = {
  javascript: `function sum(a, b) {\n  return a + b;\n}\n\nconsole.log(sum(1, 2));\n`,
  typescript: `type User = { id: number; name: string };\n\nconst user: User = { id: 1, name: 'Alice' };\nconsole.log(user);\n`,
  json: `{"name":"codemirror-shiki","version":"0.2.0","fineBundle":true}\n`,
  markdown: `An h1 header
============

Paragraphs are separated by a blank line.

2nd paragraph. *Italic*, **bold**, and \`monospace\`. Itemized lists
look like:

  * this one
  * that one
  * the other one

Note that --- not considering the asterisk --- the actual text
content starts at 4-columns in.

> Block quotes are
> written like so.
>
> They can span multiple paragraphs,
> if you like.`,
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
        <option value="markdown">markdown</option>
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
  const themeSelect =
    document.querySelector<HTMLSelectElement>('#theme-select');

  if (!editorEl || !langSelect || !themeSelect) {
    throw new Error('Missing required controls');
  }

  return {
    editorEl,
    langSelect,
    themeSelect,
  };
}
