# @cmshiki/editor

在 `@cmshiki/shiki` 之上的开箱即用编辑器封装。

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
  setOnUpdate(callback: (u: ViewUpdate) => void): void;

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
editor.setOnUpdate((u) => {
  if (u.docChanged) {
    console.log(u.state.doc.toString());
  }
});
```

## 选项说明

`ShikiEditorOptions` = `@cmshiki/shiki` 的 `Options` + CodeMirror `EditorViewConfig` + `onUpdate`。

常用字段：

- `lang`
- `theme` / `themes`
- `defaultColor`
- `engine`
- `highlighter`
- `themeStyle`
- `doc`
- `parent`
- `extensions`
- `onUpdate`

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
