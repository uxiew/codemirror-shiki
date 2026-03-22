# @cmshiki/editor

在 `@cmshiki/shiki` 之上的开箱即用编辑器封装。

支持两个入口：

- `@cmshiki/editor`：默认开箱模式（自动按需加载路径）
- `@cmshiki/editor/core`：严格精细打包模式（建议生产）

## 安装

```bash
pnpm add @cmshiki/editor
```

Peer 依赖：

```bash
pnpm add @codemirror/state @codemirror/view shiki
```

## 推荐用法

优先使用 `ShikiEditor.create()`，先完成异步高亮初始化，再创建编辑器，避免初始化闪烁。

```ts
import { ShikiEditor } from "@cmshiki/editor";

const editor = await ShikiEditor.create({
  parent: document.getElementById("editor")!,
  doc: "const answer = 42",
  lang: "typescript",
  themes: {
    light: "github-light",
    dark: "github-dark",
  },
  defaultColor: "dark",
  engine: "oniguruma", // or "javascript"
});
```

## 入口选择（重点）

1. 你要最少配置、快速接入：
   - 使用 `@cmshiki/editor`
2. 你要严格控制语言/主题打包内容：
   - 使用 `@cmshiki/editor/core` + `createHighlighterCore(...)` 并传入 `highlighter`

两种入口 API 完全一致，差异仅在底层高亮初始化路径。

## 兼容用法

```ts
const editor = new ShikiEditor({
  parent: document.getElementById("editor")!,
  doc: "const n = 1",
  lang: "javascript",
  theme: "github-light",
  themes: { light: "github-light", dark: "github-dark" },
});
```

## 常用 API

```ts
class ShikiEditor {
  view: EditorView;
  getTheme: Promise<(name?: string, view?: EditorView) => Extension>;

  static create(options: ShikiEditorOptions): Promise<ShikiEditor>;
  constructor(options: ShikiEditorOptions);

  changeTheme(name: string): Promise<void>;
  update(options: Options): void;
  onDocChanged(callback: (u: ViewUpdate) => void): void;

  getValue(): string;
  setValue(newCode: string): void;
  destroy(): void;
}
```

## 示例

### 切换主题

```ts
await editor.changeTheme("dark");
```

### 更新语言或引擎

```ts
editor.update({
  lang: "tsx",
  engine: "javascript",
});
```

### 监听文档变化

```ts
editor.onDocChanged((u) => {
  if (u.docChanged) {
    console.log(u.state.doc.toString());
  }
});
```

## 选项说明

`ShikiEditorOptions` = `@cmshiki/shiki`（或 `@cmshiki/shiki/core`）的 `Options` + CodeMirror `EditorViewConfig` + `onDocChanged`。

常用字段：

- `lang`
- `theme` / `themes`
- `defaultColor`
- `engine`
- `highlighter`
- `resolveLanguage`
- `resolveTheme`
- `versionGuard`
- `themeStyle`
- `doc`
- `parent`
- `extensions`
- `onDocChanged`

新增选项语义：

- `resolveLanguage`
  - 语言字符串无法直接加载时的兜底解析器
  - 常用于业务动态 import 语言模块
- `resolveTheme`
  - 主题字符串无法直接加载时的兜底解析器
- `versionGuard`
  - 默认 `true`
  - 传入不兼容 shared highlighter 时快速失败并输出可执行提示

## 生产性能建议（按需语言/主题）

若你不希望全量打包语言/主题，推荐：

- 从 `@cmshiki/editor/core` 导入 `ShikiEditor`
- 业务侧预初始化共享 `highlighter`
- 传入 `ShikiEditor.create()`

```ts
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import js from "@shikijs/langs/javascript";
import ts from "@shikijs/langs/typescript";
import githubDark from "@shikijs/themes/github-dark";
import githubLight from "@shikijs/themes/github-light";
import { ShikiEditor } from "@cmshiki/editor/core";

const sharedHighlighter = await createHighlighterCore({
  langs: [js, ts],
  themes: [githubDark, githubLight],
  engine: createJavaScriptRegexEngine(),
});

const editor = await ShikiEditor.create({
  parent: el,
  doc: code,
  highlighter: sharedHighlighter,
  lang: "typescript",
  themes: {
    dark: "github-dark",
    light: "github-light",
  },
  defaultColor: "dark",
});
```

说明：

- `@cmshiki/editor/core` 适合对包体积敏感的场景。
- `@cmshiki/editor` 仍可传 `highlighter`，但默认入口更偏向开箱体验，不作为“严格精细打包”入口。

### 减少业务样板代码（4、5）

你可以直接复用 `@cmshiki/shiki/core` 的 resolver 工具，避免在业务里自己维护语言/主题缓存：

```ts
import {
  createSharedHighlighterManager,
} from "@cmshiki/shiki/core";
import { ShikiEditor } from "@cmshiki/editor/core";

const manager = createSharedHighlighterManager({
  languageLoaders: {
    javascript: () => import("@shikijs/langs/javascript"),
    json: () => import("@shikijs/langs/json"),
  },
  themeLoaders: {
    "github-dark": () => import("@shikijs/themes/github-dark"),
    "github-light": () => import("@shikijs/themes/github-light"),
  },
  preloadLanguage: "javascript",
  preloadThemes: ["github-dark", "github-light"],
});

const editor = await ShikiEditor.create({
  parent: el,
  doc: code,
  highlighter: await manager.getHighlighter(),
  lang: "javascript",
  themes: { dark: "github-dark", light: "github-light" },
  resolveLanguage: manager.resolveLanguage,
  resolveTheme: manager.resolveTheme,
  versionGuard: true,
});
```

建议：`shiki`、`@shikijs/langs`、`@shikijs/themes` 保持同 major，避免运行时语法资源不兼容。

## 缓存方案与非缓存方案

缓存方案（推荐）：

- 使用 `createSharedHighlighterManager`
- 适合多编辑器、频繁切换语言/主题、需要更稳定交互

非缓存方案（也支持动态按需加载）：

- 直接传 `resolveLanguage` / `resolveTheme` 的 async 函数
- 适合轻量页面或一次性编辑场景

示例（非缓存）：

```ts
const editor = await ShikiEditor.create({
  parent: el,
  doc: code,
  highlighter: sharedHighlighter,
  lang: "typescript",
  themes: { dark: "github-dark", light: "github-light" },
  resolveLanguage: async (lang) => {
    if (lang === "typescript") return (await import("@shikijs/langs/typescript")).default;
    if (lang === "javascript") return (await import("@shikijs/langs/javascript")).default;
    return undefined;
  },
  resolveTheme: async (theme) => {
    if (theme === "github-dark") return (await import("@shikijs/themes/github-dark")).default;
    if (theme === "github-light") return (await import("@shikijs/themes/github-light")).default;
    return undefined;
  },
});
```

## 精细打包注意事项

- 建议在业务代码中显式导入：
  - `@shikijs/langs/<name>`
  - `@shikijs/themes/<name>`
- 避免使用 `bundledLanguages/bundledThemes`，否则构建产物会出现大量可选语言/主题 chunk。
- `@cmshiki/editor/core` + `createSharedHighlighterManager` 是当前推荐组合：
  - 业务代码更短
  - 包体更可控
  - 首次渲染与运行时切换行为一致

这样可以同时保留：

- CodeMirror 的编辑性能和插件体系；
- Shiki 的语义高亮和主题能力；
- 对最终 bundle 的精细控制。

## 主题配置建议

### 可切换主题（推荐）

只使用 `themes + defaultColor`：

```ts
const editor = await ShikiEditor.create({
  parent: el,
  doc: code,
  lang: "javascript",
  themes: {
    light: "github-light",
    dark: "github-dark",
    nord: "nord",
  },
  defaultColor: "dark",
  engine: "javascript",
});
```

### 单主题

只使用 `theme`：

```ts
const editor = await ShikiEditor.create({
  parent: el,
  doc: code,
  lang: "javascript",
  theme: "github-dark",
  engine: "javascript",
});
```
