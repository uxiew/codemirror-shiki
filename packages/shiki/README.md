# @cmshiki/shiki

把 Shiki 高亮能力接到 CodeMirror 的底层扩展包，“兼容默认按需加载”的开箱体验。

## 安装

```bash
pnpm add @cmshiki/shiki
```

Peer 依赖：

```bash
pnpm add @codemirror/state @codemirror/view shiki
```

## 快速开始

```ts
import { EditorView } from "@codemirror/view";
import { shikiToCodeMirror } from "@cmshiki/shiki";

const { shiki } = await shikiToCodeMirror({
  lang: "typescript",
  themes: {
    light: "github-light",
    dark: "github-dark",
  },
  defaultColor: "light",
  themeStyle: "cm",
  engine: "oniguruma", // or "javascript"
});

new EditorView({
  parent: document.getElementById("editor")!,
  doc: "const n: number = 1;",
  extensions: [shiki],
});
```

## 主题切换

```ts
import { themeCompartment } from "@cmshiki/shiki";

const { shiki, getTheme } = await shikiToCodeMirror({
  lang: "javascript",
  themes: { light: "github-light", dark: "github-dark" },
});

// ...创建 EditorView 后
view.dispatch({
  effects: themeCompartment.reconfigure(getTheme("dark", view)),
});
```

## 主要配置

`shikiToCodeMirror(options)` 支持以下常用字段：

- `lang`：语言名或自定义 language 输入
  - 也支持语言数组（例如 `@shikijs/langs/*` 的默认导出）
  - 传数组时会自动归一化，首项作为当前高亮语言，其余作为预加载语言
- `theme`：单主题简写；当未传 `themes` 时，会映射到 `themes.light`
- `themes`：多主题映射对象，支持 `light` / `dark` 及任意别名（推荐）
- `defaultColor`：初始主题键，必须是 `themes` 的 key，默认 `light`
- `themeStyle`：`"cm"` 或 `"shiki"`，默认 `"cm"`
- `engine`：
  - `"oniguruma"`（默认）：兼容性更高
  - `"javascript"`：启动更快
  - 自定义 `RegexEngine`
- `highlighter`：预初始化的 Shiki highlighter（传入后跳过内部初始化）
  - 当使用 shared highlighter 时，库会优先加载语言对象；字符串语言加载失败会降级为告警，不阻塞编辑器渲染
- `resolveLanguage`：语言字符串无法直接加载时的兜底解析器（用于动态 import 语言对象）
- `resolveTheme`：主题字符串无法直接加载时的兜底解析器（用于动态 import 主题对象）
- `versionGuard`：共享 highlighter 版本/形态护栏，默认 `true`

## `theme` / `themes` / `defaultColor` 关系说明

### 1) 三者职责

- `theme`：单主题输入，适合只需要一个主题的场景。
- `themes`：主题注册表，键是业务侧可切换的“主题键”（例如 `light` / `dark` / `nord`），值是 Shiki 主题名或主题对象。
- `defaultColor`：初始主题键，只在 `themes` 的键空间内生效。

### 2) 推荐规则

- 只用单主题：传 `theme`，不传 `themes` / `defaultColor`。
- 需要主题切换：只用 `themes + defaultColor`，不再传 `theme`。
- `defaultColor` 必须指向 `themes` 中存在的 key（例如 `dark`）。
- 如果 `defaultColor` 非法，库会告警并自动回退到可用 key（优先 `dark`、其次 `light`，否则第一个 key）。


### 3) 推荐示例（可切换）

```ts
const { shiki, getTheme } = await shikiToCodeMirror({
  lang: "javascript",
  themes: {
    light: "github-light",
    dark: "github-dark",
    nord: "nord",
  },
  defaultColor: "dark",
  themeStyle: "cm",
  engine: "javascript",
});
```

### 4) 单主题示例（不切换）

```ts
const { shiki } = await shikiToCodeMirror({
  lang: "javascript",
  theme: "github-dark",
  themeStyle: "cm",
  engine: "javascript",
});
```

## 预初始化 highlighter（推荐多编辑器场景）

```ts
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { shikiToCodeMirror } from "@cmshiki/shiki";

const highlighter = await createHighlighterCore({
  themes: [import("@shikijs/themes/github-dark")],
  langs: [import("@shikijs/langs/javascript")],
  engine: createJavaScriptRegexEngine(),
});

const { shiki } = await shikiToCodeMirror({
  highlighter,
  lang: "javascript",
  themes: { dark: "github-dark", light: "github-light" },
});
```

如果你使用的是 `@shikijs/langs/*` 默认导出（可能是数组），可以直接传给 `lang`：

```ts
import jsLang from "@shikijs/langs/javascript";

const { shiki } = await shikiToCodeMirror({
  highlighter,
  lang: jsLang, // 语言对象或语言对象数组都可
  themes: { dark: "github-dark", light: "github-light" },
});
```

## 入口选择（避免混淆）

先看这条规则：

1. 你要“开箱即用、自动按需加载”：
   - 用 `@cmshiki/shiki`
2. 你要“严格精细打包（只保留指定语言/主题）”：
   - 用 `@cmshiki/shiki/core` + `createHighlighterCore(...)`

原因（已在 `tests/fine-bundle` 实测）：

- 使用 `@cmshiki/shiki/core` 时，只会打包你显式传入的语言/主题。
- 把同一份代码的入口改成 `@cmshiki/shiki` 后，会额外产出大量语言/主题 chunk（因为默认入口包含 bundled loader 路径）。

## 性能与打包建议（对齐 Shiki Best Performance）

项目支持两种模式：

1. 默认模式：传 `lang/theme(s)`，库内部按需加载。
2. 高性能模式：传入你自己预初始化的 `highlighter`（推荐生产）。

当你需要像 `shiki/core` 一样严格控制语言/主题打包时，适合生产环境性能治理，建议在启动时预加载常用语言和主题，减少首次切换延迟：

```ts
import { shikiToCodeMirror } from "@cmshiki/shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import js from "@shikijs/langs/javascript";
import ts from "@shikijs/langs/typescript";
import githubDark from "@shikijs/themes/github-dark";
import githubLight from "@shikijs/themes/github-light";

const highlighter = await createHighlighterCore({
  langs: [js, ts],
  themes: [githubDark, githubLight],
  engine: createJavaScriptRegexEngine(),
});

const { shiki } = await shikiToCodeMirror({
  highlighter,
  lang: "typescript",
  themes: { dark: "github-dark", light: "github-light" },
  defaultColor: "dark",
});
```

说明：

- `@cmshiki/shiki/core` 不会走 `bundledLanguages/bundledThemes` 自动加载路径。
- 未传 `highlighter` 时会抛出明确错误，提示改用 core 模式的显式预加载。

## JavaScript 引擎运行时兼容 

`createJavaScriptRegexEngine()` 默认目标会产出 `v` flag，你当前运行时不支持，触发 `Invalid flags ... dgv`。

JavaScript 引擎运行时兼容：
- 底层自动检测 `RegExp` 是否支持 `v/d`。  
- 不支持时，引擎改为兼容目标：`createJavaScriptRegexEngine({ target: "ES2018" })`。避免 `dgv` 报错。

## 4) 兜底解析器（减少业务样板代码）

当你在 `core` 模式下做精细打包时，通常会写大量动态 import 和缓存逻辑。现在可以通过 `resolveLanguage` / `resolveTheme` 把兜底逻辑交给底层：

```ts
import {
  shikiToCodeMirror,
  createCachedLanguageResolver,
  createCachedThemeResolver,
} from "@cmshiki/shiki/core";

const resolveLanguage = createCachedLanguageResolver({
  javascript: () => import("@shikijs/langs/javascript"),
  json: () => import("@shikijs/langs/json"),
});

const resolveTheme = createCachedThemeResolver({
  "github-dark": () => import("@shikijs/themes/github-dark"),
  "github-light": () => import("@shikijs/themes/github-light"),
});

const { shiki } = await shikiToCodeMirror({
  highlighter,
  lang: "javascript",
  themes: { dark: "github-dark", light: "github-light" },
  resolveLanguage,
  resolveTheme,
});
```

## 5) 版本护栏（默认开启）

`versionGuard` 默认是 `true`：

- 当传入的 shared highlighter 不是兼容对象（例如缺少关键方法）时会快速抛错
- 错误信息会明确提示使用 Shiki v3+ 的 `createHighlighter` / `createHighlighterCore`
- 当捕获到典型版本不匹配异常（例如 `Resolver.getInjections` / `split`）时，会输出“同主版本对齐”的修复提示
- 推荐将 `shiki`、`@shikijs/langs`、`@shikijs/themes` 保持同一个 major 版本
- 如需兼容特殊对象，可显式关闭：`versionGuard: false`

## 参考：

- https://shiki.style/guide/best-performance
- https://shiki.style/guide/install
