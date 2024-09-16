## Install

```sh
npm install @cmshiki/shiki
```

## Usage

```ts
import { shiki } from '@cmshiki/shiki';

const editor = new EditorView({
  doc: props.lang.value,
  parent: editorView.value,
  extensions: [
    shiki({
      lang: 'typescript',
      theme: props.theme.value
    })
  ]
});
```

# TODO

- [ ] 编辑后在滚动测试，顶部会缺少渲染
- [ ] 滚动时样式会无限挂载
