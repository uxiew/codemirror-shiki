# @cmshiki/shiki

将已初始化的 Shiki highlighter 接到 CodeMirror 6。需要直接创建编辑器时，请使用 [`@cmshiki/editor`](https://github.com/uxiew/codemirror-shiki/tree/main/packages/editor)。

[在线 Playground](https://uxiew.github.io/codemirror-shiki/)

## 安装

```sh
pnpm add @cmshiki/shiki @codemirror/state @codemirror/view shiki
```

npm 上的 `0.2.0` 需要 Shiki 3（`shiki@^3`）；本仓库源码和下一个版本使用 Shiki 4（`shiki@^4`）。请确保编辑器和扩展使用同一份 `@codemirror/view` 和 `@codemirror/state`。

## 最小用法

```ts
import { EditorView } from '@codemirror/view'
import { shikiToCodeMirror } from '@cmshiki/shiki'
import { createHighlighter } from 'shiki'

const highlighter = await createHighlighter({
  langs: ['javascript'],
  themes: ['github-light'],
})

const { shiki } = await shikiToCodeMirror({
  highlighter,
  lang: 'javascript',
  theme: 'github-light',
})

const view = new EditorView({
  parent: document.body,
  doc: 'const answer = 42',
  extensions: [shiki],
})
```

需要缩小打包体积时，请用 Shiki 的[按需打包方式](https://shiki.style/guide/bundles#fine-grained-bundle)创建 highlighter。

## 常用选项

| 选项 | 用途 |
| --- | --- |
| `highlighter` | 必填。可在多个编辑器间复用。 |
| `lang` | 当前语言，默认为 `text`。 |
| `theme` 或 `themes` | 二选一。单主题用 `theme`；切换主题用 key 到主题名的映射 `themes`。 |
| `defaultColor` | 初始主题 key，默认 `light`；设为 `false` 不挂载初始主题。 |
| `themeStyle` | `shiki`（默认）使用行内样式，`cm` 使用 CSS 类。 |
| `resolveLang`、`resolveTheme` | 用于加载 highlighter 中尚未注册的语法和主题。 |
| `tokenizeMaxLineLength`、`tokenizeTimeLimit` | 控制超长行的处理阈值和单行解析的时间上限。 |
