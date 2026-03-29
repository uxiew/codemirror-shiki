# @cmshiki/editor

面向业务项目的 CodeMirror + Shiki 编辑器封装。

在线示例：<https://uxiew.github.io/codemirror-shiki/>

## 这个包解决什么问题

- 你已经接受 `@cmshiki/shiki` 的高亮模型，但不想自己拼 `EditorView`、`Compartment`、主题切换和文档同步。
- 你希望拿到一个现成的编辑器实例，并保留运行时切语言、切主题、更新内容的能力。
- 你希望在 Vue / React / 原生 DOM 中统一使用同一套编辑器封装。

如果你只需要底层高亮扩展，请直接使用 `@cmshiki/shiki`。

## 安装

```bash
pnpm add @cmshiki/editor
pnpm add @codemirror/state @codemirror/view shiki
```

## 公开导出

- `ShikiEditor`
- `createLangResolver`
- `createThemeResolver`
- 类型：`ShikiEditorOptions`、`ThemeRegistry`、`ThemeKey`

## 推荐用法

当前版本推荐统一使用异步工厂 `ShikiEditor.create()`。

原因：

- 它会先准备好 Shiki 扩展，再创建 `EditorView`
- 首帧就是完整高亮状态，不会先渲染一个空编辑器再补高亮
- 更适合和业务侧缓存的 `highlighter` 配合

同步构造 `new ShikiEditor()` 仍然存在，但更适合少数需要先拿到 `EditorView` 再异步补高亮的旧场景。

## 快速开始

```ts
import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import javascript from '@shikijs/langs/javascript'
import githubDark from '@shikijs/themes/github-dark'
import githubLight from '@shikijs/themes/github-light'
import { ShikiEditor } from '@cmshiki/editor'

const highlighter = await createHighlighterCore({
  langs: [javascript],
  themes: [githubDark, githubLight],
  engine: createOnigurumaEngine(import('shiki/wasm')),
})

const editor = await ShikiEditor.create({
  parent: document.getElementById('editor')!,
  doc: 'const answer = 42',
  highlighter,
  lang: 'javascript',
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
  defaultColor: 'dark',
  themeStyle: 'cm',
})
```

## 和 `@cmshiki/shiki` 的关系

- `@cmshiki/shiki` 负责把一个已经存在的 Shiki `highlighter` 接到 CodeMirror
- `@cmshiki/editor` 负责基于这套能力创建、持有并更新编辑器实例

这个包不会替你创建 `highlighter`。当前设计要求业务侧显式传入 `highlighter`，这样才能保持：

- fine-grained bundle
- 多编辑器共享同一个 highlighter
- 运行时和宿主平台兼容性由业务侧控制

## `ShikiEditor.create(options)`

推荐入口。返回 `Promise<ShikiEditor>`。

最常用字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `parent` | `HTMLElement` | 编辑器挂载节点 |
| `doc` | `string` | 初始文档内容 |
| `extensions` | `Extension[]` | 额外 CodeMirror 扩展 |
| `highlighter` | `Highlighter` | 预初始化的 Shiki highlighter，必填 |
| `lang` | `string \| LanguageInput` | 初始语言 |
| `theme` | `ThemeInput` | 单主题快捷写法 |
| `themes` | `Record<string, ThemeInput>` | 运行时主题注册表 |
| `defaultColor` | `string \| false` | 初始主题 key，传的是 `themes` 的 key |
| `themeStyle` | `'cm' \| 'shiki'` | 编辑器场景通常用 `cm` |
| `resolveLang` | `LangResolver` | 动态语言加载器 |
| `resolveTheme` | `ThemeResolver` | 动态主题加载器 |
| `onDocChanged` | `(u: ViewUpdate) => void` | 只在 `docChanged` 时触发 |

## 实例 API

### `render(options)`

运行时刷新高亮配置。

最常见的是切语言：

```ts
editor.render({ lang: 'typescript' })
editor.render({ lang: 'json', warnings: false })
```

### `changeTheme(name)`

按运行时主题 key 切换主题：

```ts
await editor.changeTheme('dark')
```

注意这里传的是 `themes` 的 key，不是主题值本身。  
如果你传了：

```ts
themes: {
  dark: 'github-dark',
}
```

那么这里应该传 `'dark'`，不是 `'github-dark'`。

### `getDoc()` / `setDoc(doc)`

当前版本的文档读写 API：

```ts
const current = editor.getDoc()
editor.setDoc('console.log(current)')
```

### `onDocChanged(callback)`

运行时注册文档变更监听。

### `destroy()`

组件卸载或页面销毁时调用。

## 动态语言 / 主题加载

推荐模式是：

1. 预装一个最小初始语言
2. 通过 `resolveLang` / `resolveTheme` 处理运行时切换

```ts
import { ShikiEditor } from '@cmshiki/editor'
import { createLangResolver, createThemeResolver } from '@cmshiki/shiki'
import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'

const resolveLang = createLangResolver({
  javascript: () => import('@shikijs/langs/javascript'),
  json: () => import('@shikijs/langs/json'),
  markdown: () => import('@shikijs/langs/markdown'),
})

const resolveTheme = createThemeResolver({
  'github-dark': () => import('@shikijs/themes/github-dark'),
  'github-light': () => import('@shikijs/themes/github-light'),
})

const initialLang = await resolveLang('javascript')
const darkTheme = await resolveTheme('github-dark')
const lightTheme = await resolveTheme('github-light')

const highlighter = await createHighlighterCore({
  langs: Array.isArray(initialLang) ? initialLang : [initialLang],
  themes: [darkTheme, lightTheme].filter(Boolean),
  engine: createOnigurumaEngine(import('shiki/wasm')),
})

const editor = await ShikiEditor.create({
  parent: el,
  doc: code,
  highlighter,
  lang: 'javascript',
  resolveLang,
  resolveTheme,
  themes: {
    dark: 'github-dark',
    light: 'github-light',
  },
  defaultColor: 'dark',
  themeStyle: 'cm',
})

editor.render({ lang: 'markdown' })
await editor.changeTheme('light')
```

## 在框架中的使用建议

### Vue / React / 组件化场景

- 挂载时调用 `await ShikiEditor.create()`
- 外部值变化时，用 `getDoc()` / `setDoc()` 同步，而不是销毁重建
- 文件类型变化时，用 `render({ lang })`
- 卸载时调用 `destroy()`

### 多编辑器场景

不要为每个编辑器都重新创建 Shiki highlighter。  
更推荐在应用层缓存一个 highlighter，再传给多个 `ShikiEditor.create()`。

## 常见误区

- 还在用旧的 `getValue()` / `setValue()`。当前版本只有 `getDoc()` / `setDoc()`。
- `changeTheme('github-dark')`。这里应该传的是运行时 key，例如 `dark`。
- 初始语言可能是 `html/css/markdown`，但 `resolveLang` 只注册了 `javascript/json`。这样运行时切换一定失败。
- 在桌面 WebView / Electron / uTools 这类运行时里直接用 JS regex engine。兼容性优先时，更推荐 `createOnigurumaEngine(import('shiki/wasm'))`。
