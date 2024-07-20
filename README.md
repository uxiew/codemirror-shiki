# cmshiki

[WIP]!!!

A code editor based on [CodeMirror](https://codemirror.net/) that using [Shiki](https://github.com/shikijs/shiki) highlighting.
support [custom themes](https://github.com/shikijs/shiki/blob/main/docs/themes.md#custom-themes) and [custom languages](https://github.com/shikijs/shiki/blob/main/docs/languages.md#custom-languages).

## Install

```sh
> npm install @cmshiki/shiki
```

## Usage

```ts
// import shiki and codemirror etc.
...
import { shikiToCodeMirror } from '@cmshiki/shiki'

// create shiki highlighter first
const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: ['typescript', 'vue']
});

// combine shiki highlighter whith codemirror
const { shiki, actions } = await shikiToCodeMirror(highlighter, {
  ...
  lang: 'typescript',
  theme: 'github-dark',
  ...
});

// create codemirror instance
const editor = new EditorView({
    //...
    doc: `console.log('codemirror-shiki')`,
    //...
    extensions: [
        shiki,
        ...
    ]
});

// use actions here
actions.update({
  theme:theme.name
});

actions.setTheme(theme.name);
```

## TODO

- [x] multiple codemirrors support
- [x] multiple themes support
- [ ] theme customizable

## see others

[react-codemirror's themes](https://uiwjs.github.io/react-codemirror/#/theme/data/dracula) also support some themes look like shiki but not exactly.
