# @cmshiki/editor

用 Shiki 高亮的 CodeMirror 6 编辑器封装，负责创建编辑器、切换主题和同步文档。已有 CodeMirror 编辑器时，请使用 [`@cmshiki/shiki`](https://github.com/uxiew/codemirror-shiki/tree/main/packages/shiki)。

[在线 Playground](https://uxiew.github.io/codemirror-shiki/)

## 安装

```sh
pnpm add @cmshiki/editor @codemirror/state @codemirror/view shiki
```

npm 上的 `0.2.0` 需要 Shiki 3（`shiki@^3`）；本仓库源码和下一个版本使用 Shiki 4（`shiki@^4`）。

## 最小用法

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

## 常用选项与方法

| 选项 | 用途 |
| --- | --- |
| `parent`、`doc`、`extensions` | 挂载节点、初始内容和额外的 CodeMirror 扩展。 |
| `highlighter`、`lang` | 已初始化的 Shiki highlighter 和当前语言。可在多个编辑器间复用 highlighter。 |
| `themes`、`defaultColor` | 主题注册表和初始主题 key，例如 `light`，不是 `github-light`。 |
| `resolveLang`、`resolveTheme` | 用于加载 highlighter 中尚未注册的语法和主题。 |

用 `editor.render({ lang })` 切换语言，或用 `await editor.changeTheme(key)` 切换到已注册的主题。卸载时调用 `editor.destroy()`。

当前源码用 `getDoc()` 和 `setDoc(doc)` 读写内容，用 `onDocChanged(callback)` 监听文档变化。npm `0.2.0` 的文档读写方法仍叫 `getValue()` 和 `setValue(value)`。
