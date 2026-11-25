# codemirror-shiki

在 CodeMirror 6 中使用 Shiki 的 TextMate 语法高亮。

Shiki syntax highlighting for CodeMirror 6.

[在线 Playground](https://uxiew.github.io/codemirror-shiki/)

## 安装

用 `@cmshiki/editor` 创建编辑器。如果已有 CodeMirror 编辑器，请用 [`@cmshiki/shiki`](packages/shiki/README.md) 扩展。

```sh
pnpm add @cmshiki/editor @codemirror/state @codemirror/view shiki@3.21.0
```

安装命令与 npm 上的 `0.2.0` 类型匹配；本仓库使用 Shiki 4。

## 最小用法

在浏览器入口中创建 highlighter，再把它交给编辑器：

```ts
import { ShikiEditor } from '@cmshiki/editor'
import { createHighlighter } from 'shiki'

const highlighter = await createHighlighter({
  langs: ['javascript'],
  themes: ['github-light'],
})

const editor = await ShikiEditor.create({
  parent: document.body,
  doc: 'const answer = 42',
  highlighter,
  lang: 'javascript',
  themes: { light: 'github-light' },
})
```

- `lang` 选择语法；`themes` 将主题 key 映射到 Shiki 主题名。
- `defaultColor` 选择初始主题 key；`changeTheme(key)` 在运行时切换。
- 多个编辑器可以共用同一个 `highlighter`；卸载编辑器时调用 `editor.destroy()`。

[编辑器选项](packages/editor/README.md) · [CodeMirror 扩展选项](packages/shiki/README.md) · [主题工具](packages/utils/README.md)

在仓库根目录运行 `pnpm install` 和 `pnpm dev`，即可启动本地 Playground。
