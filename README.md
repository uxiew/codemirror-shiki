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

## 设计取舍：CodeMirror + Shiki

当前设计是分层的：

- `@cmshiki/shiki`：保留 CodeMirror 扩展生态（插件、快捷键、编辑性能）；
- Shiki 只负责高亮语义和主题映射；
- `@cmshiki/editor`：在上层封装异步初始化与主题切换，降低接入成本。

这意味着你可以同时拿到：

- CodeMirror 的编辑交互能力；
- Shiki 的语义高亮精度和主题体系；
- 按需选择“开箱即用”或“精细化性能控制”。

## 与 Shiki Best Performance 对齐

项目支持两种模式：

1. 默认模式：传 `lang/theme(s)`，库内部按需加载。
2. 高性能模式：传入你自己预初始化的 `highlighter`（推荐生产）。

如果你不想全量打包语言/主题，推荐使用 Shiki core 的 fine-grained 方式，只引入需要的语言和主题，再通过 `highlighter` 传入本库。

参考：

- https://shiki.style/guide/best-performance
- https://shiki.style/guide/install
