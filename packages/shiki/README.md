# @cmshiki/shiki

把 Shiki 高亮能力接到 CodeMirror 6 的底层扩展包。

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
- `theme`：单主题简写；当未传 `themes` 时，会映射到 `themes.light`
- `themes`：多主题映射对象，支持 `light` / `dark` 及任意别名（推荐）
- `defaultColor`：初始主题键，必须是 `themes` 的 key，默认 `light`
- `themeStyle`：`"cm"` 或 `"shiki"`，默认 `"cm"`
- `engine`：
  - `"oniguruma"`（默认）：兼容性更高
  - `"javascript"`：启动更快
  - 自定义 `RegexEngine`
- `highlighter`：预初始化的 Shiki highlighter（传入后跳过内部初始化）

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

## 导出 API

```ts
export async function shikiToCodeMirror(options: Options): Promise<{
  shiki: Extension;
  getTheme: (name?: string, view?: EditorView) => Extension;
}>;

export class ShikiHighlighter {}
export const updateEffect: StateEffect<Partial<Options>>;
export const themeCompartment: Compartment;
export const configsFacet: Facet<ShikiToCMOptions, ShikiToCMOptions>;
```
