# codemirror-shiki

在 CodeMirror 6 中使用 Shiki 的 TextMate 语法高亮。

Shiki syntax highlighting for CodeMirror 6.

[在线 Playground](https://uxiew.github.io/codemirror-shiki/)

## 安装

用 `@cmshiki/editor` 创建编辑器。如果已有 CodeMirror 编辑器，请用 [`@cmshiki/shiki`](packages/shiki/README.md) 扩展。

```sh
pnpm add @cmshiki/editor @codemirror/state @codemirror/view shiki@^3
```

该命令对应 npm 上的 `0.2.0`（peer 为 `shiki@^3`）；本仓库源码已升级到 Shiki 4，下一个版本发布后改装 `shiki@^4`。

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

## 特性

- 支持 Shiki 的全部 TextMate 语法和主题，包括 Vue、Markdown 等嵌入语法。
- 运行时切换语言和主题；语法、主题可通过 `resolveLang` / `resolveTheme` 按需加载。
- 多个编辑器共用一个扩展或 highlighter 时，缓存和主题互不影响。
- 大文件友好：远距离跳转先出近似高亮再精确收敛，超长行有长度和时间上限。

## 文档

| 包 | 用途 |
| --- | --- |
| [`@cmshiki/editor`](packages/editor/README.md) | 直接创建编辑器：选项、实例方法、切换语言和主题。 |
| [`@cmshiki/shiki`](packages/shiki/README.md) | 给已有 CodeMirror 加高亮：全部选项、`updateEffect`、按需加载、多编辑器、大文件。 |
| [`@cmshiki/utils`](packages/utils/README.md) | 编辑器界面主题和样式工具。 |

在仓库根目录运行 `pnpm install` 和 `pnpm dev`，即可启动本地 Playground。
