# @cmshiki/utils

`@cmshiki/shiki` 与 `@cmshiki/editor` 共享的底层工具包，主要负责：

- 给 CodeMirror 挂载样式
- 读取当前编辑器主题 class
- 生成 CodeMirror 主题扩展

## 安装

```bash
pnpm add @cmshiki/utils
```

## 公开导出

- `mountStyles(view, spec, scopes?)`
- `getClasses(view)`
- `classList(view)`
- `newStyleModuleName()`
- `createTheme(options)`
- 类型：`StyleSpec`、`CreateThemeOptions`、`ThemeSettings`

## `mountStyles(view, spec, scopes?)`

将一组样式规则挂到当前 CodeMirror 根节点。

```ts
import { mountStyles } from '@cmshiki/utils'

mountStyles(view, {
  '& .my-token': { color: '#ff4d4f' },
  '& .cm-activeLine': { backgroundColor: '#ffffff0a' },
})
```

### 参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `view` | `EditorView` | 目标编辑器实例。 |
| `spec` | `Record<string, StyleSpec>` | style-mod 风格的样式定义。key 是选择器，value 是样式对象。 |
| `scopes` | `Record<string, string>` | 可选的自定义选择器替换映射，用来处理 `&xxx` 这类特殊作用域。 |

### 选择器规则

- 普通选择器会自动挂到编辑器根 class 下
- `&` 表示当前编辑器根作用域
- 如果写了 `&foo` 这类自定义 scope，必须在 `scopes` 里提供替换值，否则会抛错

## `getClasses(view)`

返回当前编辑器主题 class 列表。

```ts
const classes = getClasses(view)
```

返回值一般形如：

- `[baseId, darkThemeId/lightThemeId, themeId]`

常用于自定义 style scope 或调试当前主题挂载情况。

## `classList(view)`

返回 `view.dom.classList`，适合直接读写编辑器 DOM class。

```ts
const list = classList(view)
```

## `newStyleModuleName()`

生成新的 `style-mod` 模块名。

适合你需要自己构建独立 style module key 的场景。

## `createTheme(options)`

根据一组主题设置创建 CodeMirror `Extension`。

```ts
import { createTheme } from '@cmshiki/utils'

const theme = createTheme({
  theme: 'dark',
  settings: {
    background: '#0d1117',
    foreground: '#c9d1d9',
    selection: '#264f78',
    lineHighlight: '#ffffff0a',
    gutterBackground: '#0d1117',
    gutterForeground: '#6e7681',
    gutterBorder: 'transparent',
  },
})
```

### `CreateThemeOptions`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `theme` | `'light' \| 'dark'` | 是 | 主题继承基准。决定 CodeMirror 以亮色还是暗色模式应用默认样式。 |
| `settings` | `ThemeSettings` | 是 | 编辑器颜色和视觉细节配置。 |
| `classes` | `Record<string, StyleSpec>` | 否 | 额外追加的自定义 class 样式。 |

### `ThemeSettings`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `background` | `string` | 编辑器背景色。 |
| `backgroundImage` | `string` | 编辑器背景图。 |
| `foreground` | `string` | 默认文字颜色。 |
| `caret` | `string` | 光标颜色。 |
| `selection` | `string` | 选区背景色。 |
| `selectionMatch` | `string` | 选中匹配项背景色。 |
| `lineHighlight` | `string` | 当前行高亮背景色。 |
| `gutterBackground` | `string` | 行号区背景色。 |
| `gutterForeground` | `string` | 行号区文字颜色。 |
| `gutterActiveForeground` | `string` | 当前活跃行号颜色。 |
| `gutterBorder` | `string` | 行号区右边框颜色。 |
| `fontFamily` | `string` | 编辑器字体。 |
| `fontSize` | `StyleSpec['fontSize']` | 编辑器字号。 |

## 适用边界

- `@cmshiki/shiki` / `@cmshiki/editor` 正常使用时，一般不需要单独引入本包
- 当你想扩展更细粒度的主题样式，或想自己控制 CodeMirror 主题挂载方式时，再直接使用它

## 常见误区

- 在 `mountStyles()` 里写了 `&foo`，却没有传 `scopes.foo`
- 用 `createTheme()` 以为它会负责 token 级配色。它负责的是编辑器 UI 层样式，不负责 Shiki token 语法色

## License

MIT
