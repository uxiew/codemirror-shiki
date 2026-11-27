# cmshiki 语法实验室

在 CodeMirror 中预览 TextMate 语法、嵌入语法和 Shiki 主题，支持直接编辑示例。

## 本地运行

在仓库根目录使用 Node.js 24 和 pnpm 10：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开终端中显示的本地地址。运行 `pnpm build:doc` 可生成静态页面。

## 使用方式

- 在左侧搜索语法名称或别名，例如 `ts`、`vue`。
- “嵌入 / 注入”筛选包含 18 种补充语法，每种都有独立示例。
- “主题”面板支持浅色和深色筛选；页面外观随所选主题切换。
- 顶栏可切换 `ShikiEditor` / Shiki 扩展，以及 Oniguruma / JavaScript 正则引擎。
- 编辑示例后，切换主题、引擎或接入方式仍保留修改；“重置”恢复原始示例。
- “接入代码”会生成当前配置对应的真实包导入和依赖列表，可以直接复制。
- 地址中的 `grammar` 和 `theme` 参数可以分享当前选择，不包含编辑内容。

底部“初始化”统计编辑器初始化耗时，不是完整文档的高亮耗时。

## 嵌入与注入语法

语法注册表来自 `tm-grammars` 的 `grammars` 和 `injections`，JSON 按需加载，
递归解析 `embedded` 依赖并去重。注入语法在对应宿主中演示，界面会标明实际上下文，
不会把宿主语法冒充为独立语言。

| 补充语法                                                                   | 预览上下文          |
| -------------------------------------------------------------------------- | ------------------- |
| `angular-expression`                                                       | 独立 Angular 表达式 |
| `angular-inline-style`、`angular-inline-template`                          | Angular TypeScript  |
| `angular-let-declaration`、`angular-template`、`angular-template-blocks`   | Angular HTML        |
| `cpp-macro`                                                                | C++ 预处理宏        |
| `es-tag-css`、`es-tag-glsl`、`es-tag-html`、`es-tag-sql`、`es-tag-xml`     | TypeScript 标签模板 |
| `jinja-html`                                                               | Jinja 与 HTML       |
| `markdown-nix`、`markdown-vue`                                             | Markdown 围栏代码块 |
| `vue-directives`、`vue-interpolations`、`vue-sfc-style-variable-injection` | Vue 单文件组件      |

Jinja、Vue 和 Nix 的反向引用也会补全；加载时使用同一份语法源，避免不同版本的 scope 相互覆盖。
JavaScript 正则引擎与 Oniguruma 的兼容性取决于具体语法；不兼容时页面会显示错误，可切回 Oniguruma。

## 验证

```sh
pnpm -F playground exec vitest run test/samples.test.ts test/grammars.test.ts
pnpm build:doc
```

示例与设计参考 [textmate-grammars-themes playground](https://github.com/shikijs/textmate-grammars-themes/tree/main/playground)。
原有上游示例的许可见 `samples/LICENSE.textmate-grammars-themes`；语法的上游来源和许可保留在 `tm-grammars` 元数据中。
