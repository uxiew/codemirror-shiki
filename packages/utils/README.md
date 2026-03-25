# @cmshiki/utils

`@cmshiki/shiki` 与 `@cmshiki/editor` 使用的公共工具包。

## 安装

```bash
pnpm add @cmshiki/utils
```

## 导出内容

- `mountStyles(view, spec, scopes?)`
- `getClasses(view)`
- `classList(view)`
- `createStyleModuleName()`
- `createTheme(options)`
- `StyleSpec` 类型

## 使用示例

### 1) 动态挂载样式

```ts
import { mountStyles } from "@cmshiki/utils";

mountStyles(view, {
  "& .my-token": { color: "#ff4d4f" },
  "& .cm-activeLine": { backgroundColor: "#0000000d" },
});
```

### 2) 创建 CodeMirror 主题扩展

```ts
import { createTheme } from "@cmshiki/utils";

const theme = createTheme({
  theme: "dark",
  settings: {
    background: "#0d1117",
    foreground: "#c9d1d9",
    selection: "#264f78",
    lineHighlight: "#ffffff0a",
    gutterBackground: "#0d1117",
    gutterForeground: "#6e7681",
    gutterBorder: "transparent",
  },
});
```

## API 摘要

```ts
function mountStyles(
  view: EditorView,
  spec: Record<string, StyleSpec>,
  scopes?: Record<string, string>,
): void;

function getClasses(view: EditorView): string[];
function classList(view: EditorView): DOMTokenList;
function createStyleModuleName(): string;

function createTheme(options: CreateThemeOptions): Extension;
```

`createTheme` 的 `ThemeSettings` 支持：

- `background`
- `backgroundImage`
- `foreground`
- `caret`
- `selection`
- `selectionMatch`
- `lineHighlight`
- `gutterBackground`
- `gutterForeground`
- `gutterActiveForeground`
- `gutterBorder`
- `fontFamily`
- `fontSize`

## License

MIT
