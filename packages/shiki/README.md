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
- `theme`：单主题别名（会映射到 `themes.light`）
- `themes`：主题映射对象，支持 `light` / `dark` 及任意别名
- `defaultColor`：初始主题别名，默认 `light`
- `themeStyle`：`"cm"` 或 `"shiki"`，默认 `"cm"`
- `engine`：
  - `"oniguruma"`（默认）：兼容性更高
  - `"javascript"`：启动更快
  - 自定义 `RegexEngine`
- `highlighter`：预初始化的 Shiki highlighter（传入后跳过内部初始化）

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

## 常见问题

### `ShikiError: engine option is required for synchronous mode`

这是 Shiki 核心在同步初始化路径下要求显式传入 `engine`。建议：

1. 优先使用异步初始化（`await shikiToCodeMirror(...)`）。
2. 显式指定 `engine: "oniguruma"` 或 `engine: "javascript"`。
3. 如果自行 `createHighlighterCore(...)`，务必传入 `engine`。

## License

MIT
