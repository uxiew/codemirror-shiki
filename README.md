# codemirror-shiki

`codemirror-shiki` 把 Shiki 语法高亮能力稳定接入 CodeMirror，并提供更容易使用的封装。

codemirror-shiki stably integrates the syntax highlighting capabilities of Shiki into CodeMirror and provides a more user-friendly wrapper.

## 项目结构

- `@cmshiki/shiki`：底层 CodeMirror 扩展，负责 Shiki 高亮、主题管理和运行时更新。
- `@cmshiki/editor`：开箱即用编辑器封装，基于 `@cmshiki/shiki`。
- `@cmshiki/utils`：样式挂载、主题转换等工具函数。
- `playground`：可视化测试页面，用于联动验证 grammar / theme / engine。
- `samples`：按 `samples/<grammar>.sample` 命名的测试代码样例，供 playground 自动加载。

这意味着你可以享受到：

- CodeMirror 的编辑交互能力；
- Shiki 的语义高亮精度和主题体系；
- 按需选择“开箱即用”或“精细化性能控制”。

补充：

- `@cmshiki/shiki` / `@cmshiki/editor` 新增 resolver 机制（`resolveLanguage` / `resolveTheme`）来减少业务侧动态 import 样板代码。
- 默认开启 `versionGuard`，对不兼容的 shared highlighter 快速失败并给出明确错误提示。

文档入口：

- `@cmshiki/shiki`：`packages/shiki/README.md`
- `@cmshiki/editor`：`packages/editor/README.md`

推荐阅读顺序：

1. 先看 `@cmshiki/shiki` 的“入口选择 + 精细打包模板”
2. 再看 `@cmshiki/editor` 的“core 模式接入模板”

## 快速开始

```bash
pnpm install
pnpm dev
```

## 常用命令

```bash
pnpm dev
pnpm build
pnpm test
pnpm -F playground build
```
