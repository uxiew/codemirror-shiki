# @cmshiki/shiki

把已初始化的 Shiki highlighter 接到 CodeMirror 6 的扩展。需要直接创建编辑器时，用 [`@cmshiki/editor`](https://github.com/uxiew/codemirror-shiki/tree/main/packages/editor)。

[在线 Playground](https://uxiew.github.io/codemirror-shiki/)

## 安装

```sh
pnpm add @cmshiki/shiki @codemirror/state @codemirror/view shiki@^3
```

该命令对应 npm 上的 `0.2.0`（peer 为 `shiki@^3`）；本仓库源码已升级到 Shiki 4，下一个版本发布后改装 `shiki@^4`。编辑器和扩展必须使用同一份 `@codemirror/view` 和 `@codemirror/state`。

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

## API

### `shikiToCodeMirror(options)`

异步返回 `{ shiki, getTheme }`：

| 返回值 | 说明 |
| --- | --- |
| `shiki` | CodeMirror 扩展，放进 `extensions`。包含主题 compartment 和高亮插件。 |
| `getTheme(key?, view?)` | 返回 `themes[key]` 对应的主题扩展，用于 `themeCompartment.reconfigure`。多个编辑器共用扩展时务必传 `view`，否则只切换第一个编辑器。 |

### 选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `highlighter` | 必填 | Shiki highlighter，`createHighlighter` 或 `createHighlighterCore` 创建。可在多个编辑器间共用。 |
| `lang` | `'text'` | 语言名或 Shiki 语言对象。 |
| `theme` | — | 单主题写法，等同于 `themes: { light: theme }`。 |
| `themes` | — | 主题注册表，key 自定，例如 `{ light: 'github-light', dark: 'github-dark', nord: 'nord' }`。 |
| `defaultColor` | `'light'` | 初始主题的 **key**（不是主题名）；`false` 表示不挂载初始主题。 |
| `themeStyle` | `'shiki'` | `'shiki'` 为 token 写行内颜色；`'cm'` 生成 CSS 类，DOM 更小，适合大文件。 |
| `cssVariablePrefix` | `'--shiki-'` | 多主题颜色 CSS 变量的前缀。 |
| `resolveLang` / `resolveTheme` | — | highlighter 里没有的语法 / 主题，用它们按需加载，见下文。 |
| `langAlias` | — | 语言别名，例如 `{ 'my-js': 'javascript' }`。 |
| `tokenizeMaxLineLength` | `20000` | 超过这个长度的行只给开头一段着色，避免单行分词卡住页面。 |
| `tokenizeTimeLimit` | `500` | 单行分词的时间上限（ms）。 |
| `tokenizeWorker` | — | 返回新 Worker 的函数。设置后，超长行交给 Worker 完整分词，见下文“大文件”。 |
| `workerMinLineLength` | `1000` | 设置了 `tokenizeWorker` 时，不短于这个长度的行交给 Worker。 |
| `warnings` | `true` | 在控制台提示配置问题。 |
| `versionGuard` | `true` | 检查传入的 highlighter 是否是兼容的 Shiki 版本，不兼容时立即报错。 |

Shiki 的 `colorReplacements`、`grammarState`、`grammarContextCode` 等分词选项也会透传。

### 其他导出

| 导出 | 说明 |
| --- | --- |
| `updateEffect` | `StateEffect<Partial<Options>>`，运行时修改 `lang` 等选项。 |
| `themeCompartment` | 主题所在的 compartment，配合 `getTheme` 切换主题。 |
| `createLangResolver(loaders)` / `createThemeResolver(loaders)` | 从动态 `import()` 创建 `resolveLang` / `resolveTheme`。 |
| `ShikiHighlighter`、`configsFacet` | 内部类和配置 facet，供高级扩展使用。 |
| `exposeTokenizer(createCore)`（`@cmshiki/shiki/worker`） | 在 Worker 里调用，配合 `tokenizeWorker` 使用。 |

## 常见用法

### 切换语言

```ts
import { updateEffect } from '@cmshiki/shiki'

view.dispatch({ effects: updateEffect.of({ lang: 'typescript' }) })
```

语言需已在 highlighter 中加载，或提供了 `resolveLang`。同时替换内容时，把 `changes` 和 `effects` 放在同一个 `dispatch` 里。

### 切换主题

```ts
import { themeCompartment, updateEffect, shikiToCodeMirror } from '@cmshiki/shiki'

const { shiki, getTheme } = await shikiToCodeMirror({
  highlighter,
  lang: 'javascript',
  themes: { light: 'github-light', dark: 'github-dark' },
  defaultColor: 'light',
})

// 之后：
view.dispatch({
  effects: [themeCompartment.reconfigure(getTheme('dark', view)), updateEffect.of({})],
})
```

`themes` 里的主题都要已加载到 highlighter，或提供 `resolveTheme`。

### 按需加载（细粒度打包）

```ts
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { createLangResolver, createThemeResolver, shikiToCodeMirror } from '@cmshiki/shiki'

const resolveLang = createLangResolver({
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
})
const resolveTheme = createThemeResolver({
  'github-light': () => import('@shikijs/themes/github-light'),
  'github-dark': () => import('@shikijs/themes/github-dark'),
})

const highlighter = await createHighlighterCore({
  langs: [resolveLang.loaders.javascript],
  themes: [resolveTheme.loaders['github-light']],
  engine: createJavaScriptRegexEngine(),
})

const { shiki } = await shikiToCodeMirror({
  highlighter,
  lang: 'javascript',
  themes: { light: 'github-light', dark: 'github-dark' },
  resolveLang,
  resolveTheme,
})
```

切到 `typescript` 或 `dark` 时才会下载对应文件。打包方式见 Shiki 的[细粒度打包](https://shiki.style/guide/bundles#fine-grained-bundle)。Oniguruma 引擎（`shiki/engine/oniguruma` + `shiki/wasm`）兼容性最好；JavaScript 引擎不需要 WASM、体积更小。

### 多个编辑器

同一个 `shiki` 扩展可以放进多个 `EditorView`。每个编辑器有独立的行缓存、grammar state 和当前主题，互不影响；编辑器 `destroy()` 后自动释放。切换主题时给 `getTheme` 传入对应的 `view`。

### 大文件

- 远距离跳转或快速拖动时，可视区先显示近似高亮，再在空闲时间换成精确结果。
- 超长行（例如压缩后的 bundle）默认只给开头一段着色，长度由 `tokenizeMaxLineLength` 和 `tokenizeTimeLimit` 控制；要完整着色，用 `tokenizeWorker`。
- 大文件建议用 `themeStyle: 'cm'`，减少行内样式。

### 超长行交给 Web Worker

压缩后的 bundle 常有十几万字符的单行。主线程上这种行只能着色开头一段，分词时还会卡住输入。设置 `tokenizeWorker` 后，这些行在 Worker 里按完整的 grammar state 分词，结果与主线程一致。

```ts
// tokenizer.worker.ts
import { exposeTokenizer } from '@cmshiki/shiki/worker'
import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'

exposeTokenizer(() =>
  createHighlighterCore({
    langs: [import('@shikijs/langs/javascript')],
    themes: [import('@shikijs/themes/github-dark')],
    engine: createOnigurumaEngine(import('shiki/wasm')),
  }),
)
```

```ts
// 主线程
const { shiki } = await shikiToCodeMirror({
  highlighter,
  lang: 'javascript',
  theme: 'github-dark',
  tokenizeWorker: () =>
    new Worker(new URL('./tokenizer.worker.ts', import.meta.url), { type: 'module' }),
})
```

- Worker 的 Shiki core 要包含编辑器可能切换到的全部语言和主题。缺语言或主题，或者 Worker 出错时，该编辑器改回主线程分词。
- 一个扩展只创建一个 Worker，所有使用该扩展的编辑器共用，各编辑器状态互相隔离；最后一个编辑器销毁时 Worker 被 terminate。
- Worker 结果返回前，长行保持开头一段的颜色；编辑长行时先沿用平移后的旧颜色。
- Worker 里建议用 Oniguruma 引擎，即使主线程用的是 JavaScript 引擎。Worker 按行顺序分词，正在处理的行没结束前，后面的行和编辑后的重新分词都要排队。在一个 1 MB 的压缩 bundle 上（Node 单线程，只算分词），Oniguruma 共 15 秒，JavaScript 引擎共 119 秒，其中一行 13.8 万字符就要 96 秒。
