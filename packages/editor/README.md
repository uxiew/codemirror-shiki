# @cmshiki/editor

用 Shiki 高亮的 CodeMirror 6 编辑器封装，负责创建编辑器、切换语言和主题、读写内容。已有 CodeMirror 编辑器时，用 [`@cmshiki/shiki`](https://github.com/uxiew/codemirror-shiki/tree/main/packages/shiki)。

[在线 Playground](https://uxiew.github.io/codemirror-shiki/)

## 安装

```sh
pnpm add @cmshiki/editor @codemirror/state @codemirror/view shiki@^3
```

该命令对应 npm 上的 `0.2.0`（peer 为 `shiki@^3`）；本仓库源码已升级到 Shiki 4，下一个版本发布后改装 `shiki@^4`。

## 最小用法

```ts
import { ShikiEditor } from '@cmshiki/editor'
import { createHighlighter } from 'shiki'

const highlighter = await createHighlighter({
  langs: ['javascript', 'typescript'],
  themes: ['github-light', 'github-dark'],
})

const editor = await ShikiEditor.create({
  parent: document.getElementById('app')!,
  doc: 'const answer = 42',
  highlighter,
  lang: 'javascript',
  themes: { light: 'github-light', dark: 'github-dark' },
  defaultColor: 'light',
  onDocChanged: (update) => console.log(update.state.doc.length),
})

editor.render({ lang: 'typescript' })   // 切换语言
await editor.changeTheme('dark')        // 切换主题，参数是 themes 的 key
editor.setDoc('let x: number = 1')      // 替换内容
editor.getDoc()                         // 读取内容
editor.destroy()                        // 卸载
```

用 `ShikiEditor.create()` 创建：它先加载好高亮再创建编辑器，首屏不会出现无色闪烁。`new ShikiEditor(options)` 仍可用，但高亮会在创建后异步挂上。

## 选项

`ShikiEditor.create(options)` 接受 CodeMirror 的 `EditorViewConfig` 和 [`@cmshiki/shiki` 的全部选项](https://github.com/uxiew/codemirror-shiki/tree/main/packages/shiki#选项)：

| 选项 | 说明 |
| --- | --- |
| `parent`、`doc`、`extensions`、`state`… | 原样传给 `new EditorView()`。`extensions` 里可放行号、快捷键等其他扩展。 |
| `highlighter` | 必填，可在多个编辑器间共用。 |
| `lang` | 当前语言。 |
| `theme` | 单主题写法，不需要切换主题时用。 |
| `themes`、`defaultColor` | 主题注册表和初始 key。`defaultColor` 是 key，例如 `'dark'`，不是 `'github-dark'`；不传时依次选 `dark`、`light`、第一个 key。 |
| `onDocChanged(update)` | 文档变化时调用，也可用 `editor.onDocChanged(cb)` 后设。 |
| `themeStyle`、`resolveLang`、`resolveTheme`、`tokenizeMaxLineLength`… | 见 `@cmshiki/shiki`。 |

## 实例

| 成员 | 说明 |
| --- | --- |
| `view` | 底层 `EditorView`，可直接 `dispatch`。 |
| `render(options)` | 运行时修改 `lang` 等 Shiki 选项。 |
| `changeTheme(key)` | 切换到 `themes` 中的主题，返回 Promise。 |
| `getDoc()` / `setDoc(doc)` | 读写全文。npm `0.2.0` 中叫 `getValue()` / `setValue(value)`。 |
| `onDocChanged(callback)` | 设置文档变化回调。 |
| `getTheme` | `Promise<(key, view?) => Extension>`，拿到主题扩展自行组合。 |
| `destroy()` | 销毁编辑器并释放缓存。 |

`createLangResolver` 和 `createThemeResolver` 也从本包导出，用法见 `@cmshiki/shiki`。
