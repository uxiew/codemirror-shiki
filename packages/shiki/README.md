# @cmshiki/shiki

把一个已经初始化好的 Shiki highlighter 接到 CodeMirror。

在线示例：<https://uxiew.github.io/codemirror-shiki/>

## 这个包解决什么问题

- 你已经自己控制了 `createHighlighterCore()`，只需要把高亮扩展挂进 CodeMirror
- 你希望保留 fine-grained bundle，而不是让库内部偷偷创建 highlighter
- 你需要在运行时切换语言或主题，并按需动态加载 grammar / theme

如果你想直接拿一个现成编辑器实例，请用 `@cmshiki/editor`。

## 安装

```bash
pnpm add @cmshiki/shiki
pnpm add @codemirror/state @codemirror/view shiki
```

## 当前设计约束

当前版本是单入口、显式 highlighter 设计：

- 必须显式传入 `highlighter`
- 库内不再负责创建 highlighter
- 推荐业务侧缓存并复用同一个 highlighter

这样做的原因是：

- 更贴近 Shiki 官方推荐的 highlighter cache 模式
- 能保住 fine-grained bundle
- 不把运行时兼容性决策绑死在库内部

## 公开导出

- `shikiToCodeMirror(options)`
- `createLangResolver(loaders)`
- `createThemeResolver(loaders)`
- `themeCompartment`
- `updateEffect`
- `configsFacet`
- `ShikiHighlighter`
- 类型：`Options`、`ShikiToCMOptions`、`ThemeRegistry`、`ThemeKey`、`Highlighter`

## 快速开始

```ts
import { EditorView } from '@codemirror/view'
import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import javascript from '@shikijs/langs/javascript'
import githubDark from '@shikijs/themes/github-dark'
import githubLight from '@shikijs/themes/github-light'
import { shikiToCodeMirror } from '@cmshiki/shiki'

const highlighter = await createHighlighterCore({
  langs: [javascript],
  themes: [githubDark, githubLight],
  engine: createOnigurumaEngine(import('shiki/wasm')),
})

const { shiki } = await shikiToCodeMirror({
  highlighter,
  lang: 'javascript',
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
  defaultColor: 'dark',
  themeStyle: 'cm',
})

new EditorView({
  parent: document.getElementById('editor')!,
  doc: 'const answer = 42',
  extensions: [shiki],
})
```

## `shikiToCodeMirror(options)`

把一个已经存在的 Shiki highlighter 变成 CodeMirror 扩展。

返回值：

- `shiki`
  - 直接放进 `EditorView` 的 `extensions`
- `getTheme(name?, view?)`
  - 根据运行时主题 key 返回 CodeMirror 主题扩展

典型主题切换：

```ts
const { shiki, getTheme } = await shikiToCodeMirror({
  highlighter,
  lang: 'typescript',
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
  defaultColor: 'dark',
})

const view = new EditorView({
  parent: el,
  doc: code,
  extensions: [shiki],
})

view.dispatch({
  effects: themeCompartment.reconfigure(getTheme('light', view)),
})
```

## `Options` 参数说明

### 必填项

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `highlighter` | `Highlighter` | 预初始化的 Shiki highlighter。没有它就不会工作。 |
| `theme` 或 `themes` | `ThemeInput` 或 `Record<string, ThemeInput>` | 至少提供一个。运行时切主题时推荐 `themes`。 |

### 核心字段

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `lang` | `LanguageInput \| string` | `'text'` | 当前激活语言 |
| `theme` | `ThemeInput` | 无 | 单主题快捷写法 |
| `themes` | `Record<string, ThemeInput>` | 无 | 运行时主题注册表 |
| `defaultColor` | `ThemeKey \| string \| false` | `'light'` | 初始主题 key |
| `themeStyle` | `'cm' \| 'shiki'` | `'shiki'` | 编辑器场景通常更推荐 `cm` |
| `warnings` | `boolean` | `true` | 是否输出警告 |
| `versionGuard` | `boolean` | `true` | highlighter 兼容性校验 |

### 动态加载相关

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `resolveLang` | `LangResolver` | 运行时切到未预装语言时，负责补 grammar |
| `resolveTheme` | `ThemeResolver` | 运行时切到未预装主题时，负责补 theme |
| `langAlias` | `Record<string, string>` | 语言别名映射，例如 `{ vue: 'html' }` |

### 渲染细节

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `cssVariablePrefix` | `string` | `'--shiki-'` | CSS 变量前缀 |
| `includeExplanation` | `boolean` | `false` | 是否保留 explanation |
| `tokenizeMaxLineLength` | `number` | `20000` | 超长行保护 |
| `tokenizeTimeLimit` | `number` | `500` | 单次 tokenization 时间上限 |

## `createLangResolver(loaders)`

创建运行时语言加载器。

```ts
const resolveLang = createLangResolver({
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  json: () => import('@shikijs/langs/json'),
})
```

推荐用法有两类：

1. 作为 `resolveLang` 传给 `shikiToCodeMirror`，让运行时切语言时自动补 grammar
2. 在初始化 highlighter 前，手动 `await resolveLang('javascript')`，拿到首屏语言模块

```ts
const initialLang = await resolveLang('javascript')

const highlighter = await createHighlighterCore({
  langs: Array.isArray(initialLang) ? initialLang : [initialLang],
  themes: [githubDark, githubLight],
  engine: createOnigurumaEngine(import('shiki/wasm')),
})
```

## `createThemeResolver(loaders)`

创建运行时主题加载器。

```ts
const resolveTheme = createThemeResolver({
  'github-dark': () => import('@shikijs/themes/github-dark'),
  'github-light': () => import('@shikijs/themes/github-light'),
})
```

它同样适合两类场景：

- 传给 `shikiToCodeMirror`，在运行时补主题
- 在初始化 highlighter 前，手动先拿到首批主题

## 动态语言 / 主题切换

```ts
import {
  createLangResolver,
  createThemeResolver,
  shikiToCodeMirror,
  updateEffect,
  themeCompartment,
} from '@cmshiki/shiki'
import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'

const resolveLang = createLangResolver({
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  json: () => import('@shikijs/langs/json'),
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

const { shiki, getTheme } = await shikiToCodeMirror({
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

const view = new EditorView({
  parent: el,
  doc: code,
  extensions: [shiki],
})

view.dispatch({
  effects: updateEffect.of({ lang: 'typescript' }),
})

view.dispatch({
  effects: themeCompartment.reconfigure(getTheme('light', view)),
})
```

## 宿主环境建议

- Web / Electron / uTools 一类运行时，优先用 `createOnigurumaEngine(import('shiki/wasm'))`
- 不要把 JS regex engine 当默认方案，尤其是在桌面壳或旧 WebView 里
- 多编辑器场景尽量共用一个 highlighter

## 常见误区

- 不传 `highlighter`，指望库内部创建。当前版本不会这样做。
- 只传 `theme`，却又想运行时切主题。此时应该改成 `themes + defaultColor`。
- `defaultColor` 传的是主题值，例如 `'github-dark'`。如果 `themes.dark = 'github-dark'`，那就应该传 `'dark'`。
- 初始语言和运行时语言集合不一致：首帧只预装了 `json`，但又把 `lang` 设为 `javascript` 且没有 `resolveLang`。
