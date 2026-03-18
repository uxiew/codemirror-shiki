# codemirror-shiki

`codemirror-shiki` 是一个基于 pnpm workspace 的 monorepo，目标是把 Shiki 的 TextMate 语法高亮能力稳定接入 CodeMirror 6，并提供更容易落地的封装。

## 包结构

- `@cmshiki/shiki`：底层 CodeMirror 扩展，负责 Shiki 高亮、主题管理和运行时更新。
- `@cmshiki/editor`：开箱即用编辑器封装，基于 `@cmshiki/shiki`。
- `@cmshiki/utils`：样式挂载、主题转换等工具函数。
- `playground`：可视化测试页面，用于联动验证 grammar / theme / engine。
- `samples`：按 `samples/<grammar>.sample` 命名的测试代码样例，供 playground 自动加载。

配置建议（高频踩坑点）：

- 需要主题切换时，优先使用 `themes + defaultColor`。
- `defaultColor` 是 `themes` 的 key，不是主题值。
- 不建议同时传 `theme` 和 `themes`，避免歧义。
- `defaultColor` 非法时会回退到可用 key，并打印 warning，避免首屏主题错配。

## 快速开始

```bash
pnpm install
pnpm dev
```

默认会启动 `playground`（Vite，端口 `3333`）。

## Playground 功能

- 左侧：grammar 列表（来自 `tm-grammars`）
- 中间：theme 列表（来自 `tm-themes`）
- 右侧：CodeMirror + `@cmshiki/shiki` 渲染区
- 顶部：引擎切换
  - `Oniguruma`：WASM 引擎，语法兼容性更强
  - `JavaScript`：纯 JS 引擎，启动更快

切换 grammar 时会自动尝试读取 `samples/<grammar>.sample`；若文件不存在，会展示 fallback 文本。

## 新增或维护测试样例

1. 在 `samples` 目录新增文件，命名为 `<grammar>.sample`。
2. 内容尽量覆盖该语言常见语法（注释、字符串、关键字、函数、类、泛型/模板、异常处理等）。
3. 启动 `pnpm dev` 后在 playground 点击对应 grammar 即可验证。

## 常用命令

```bash
pnpm dev
pnpm build
pnpm test
pnpm -F playground build
```

## 许可证

MIT
