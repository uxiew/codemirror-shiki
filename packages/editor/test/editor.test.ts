
import { ShikiEditor } from '../src'

// 使用示例
const editor = new ShikiEditor(document.body, 'console.log("Hello, World!");')


describe('use shikiEditor', () => {

    // 更新语法
    editor.updateSyntax('python')

    // 更新主题
    editor.updateTheme('monokai')

    // 获取编辑器内容
    console.log(editor.getValue())

    // 设置编辑器内容
    editor.setValue('print("Hello, Python!")')
})
