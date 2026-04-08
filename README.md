# codemirror-shiki

[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/uxiew/codemirror-shiki)

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

- `@cmshiki/shiki` 采用单入口设计：需要业务侧预创建 `highlighter` 并传入。
- 默认开启 `versionGuard`，对不兼容的 shared highlighter 快速失败并给出明确错误提示。

文档入口：

- `@cmshiki/shiki`：`packages/shiki/README.md`
- `@cmshiki/editor`：`packages/editor/README.md`

推荐阅读顺序：

1. 先看 `@cmshiki/shiki` 的“highlighter 预初始化 + 精细打包模板”
2. 再看 `@cmshiki/editor` 的“ShikiEditor 接入模板”

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
