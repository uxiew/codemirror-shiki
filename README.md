# codemirror-shiki

`codemirror-shiki` 是一个基于 pnpm workspace 的 monorepo，把 Shiki 语法高亮能力稳定接入 CodeMirror 最新版，并提供更容易使用的封装。

## 包结构

- `@cmshiki/shiki`：底层 CodeMirror 扩展，负责 Shiki 高亮、主题管理和运行时更新。
- `@cmshiki/editor`：开箱即用编辑器封装，基于 `@cmshiki/shiki`。
- `@cmshiki/utils`：样式挂载、主题转换等工具函数。
- `playground`：可视化测试页面，用于联动验证 grammar / theme / engine。
- `samples`：按 `samples/<grammar>.sample` 命名的测试代码样例，供 playground 自动加载。

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

