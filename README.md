# codemirror-shiki

[WIP]!!!

A CodeMirror 6 extension that provides syntax highlighting using [Shiki](https://github.com/shikijs/shiki).
custom themes or language syntax, also support [custom themes](https://github.com/shikijs/shiki/blob/main/docs/themes.md#custom-themes) and [custom languages](https://github.com/shikijs/shiki/blob/main/docs/languages.md#custom-languages).

## Install

```sh
> pnpm install codemirror-shiki
```

## Usage

```ts
// import shiki and codemirror etc.
...
import { shikiToCodeMirror } from 'codemirror-shiki'

// create shiki highlighter first
const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: ['typescript', 'vue']
});

// combine shiki highlighter whith codemirror
const { shiki, actions } = shikiToCodeMirror(highlighter, {
  lang: 'typescript',
  theme: 'github-dark'
});

// create codemirror instance
const editor = new EditorView({
    doc: `console.log('codemirror-shiki')`,
    ...,
    extensions: [
        shiki,
        ...
    ]
});

// use actions here
actions.update(theme.name);
actions.updateTheme(theme.name);
...

```

## TODO

- [x] multiple codemirrors support
- [x] multiple themes support
- [ ] theme customizable

## see some others

[react-codemirror's themes](https://uiwjs.github.io/react-codemirror/#/theme/data/dracula) also support some themes look like shiki but not exactly.
