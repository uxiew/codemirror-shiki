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

# TODO

- [ ] 编辑后在滚动测试，顶部会缺少渲染
- [ ] 滚动时样式会无限挂载
