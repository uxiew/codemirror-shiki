## Install

```sh
npm install @cmshiki/shiki
```

## Usage

```ts
import { shikiToCodeMirror } from '@cmshiki/shiki';

const { shiki, getTheme } = await shikiToCodeMirror({
  lang: 'typescript',
  themes: {
    light: 'github-light',
    dark: 'github-dark',
    dim: 'dracula'
    // any number of themes
  },
  // defaultColor: false,
  cssVariablePrefix: '--cm-',
  doc: props.lang.value,
  parent: editorView.value,
  extensions: [shiki()]
});
```

## Features

### Performance Optimizations

The Shiki integration for CodeMirror has been optimized for a smoother editing experience:

-   **Asynchronous Highlighting**: Highlighting operations are performed asynchronously, preventing the main thread from blocking and keeping the UI responsive.
-   **Debounced Updates**: Highlighting updates are debounced (with a typical delay of 250ms). This reduces the frequency of computationally intensive highlighting tasks during rapid typing or scrolling.
-   **Improved Responsiveness**: These changes significantly improve overall editor responsiveness and reduce input lag, especially when working with larger documents or complex code.

# TODO

- [ ] 编辑后在滚动测试，顶部会缺少渲染
- [ ] 滚动时样式会无限挂载
