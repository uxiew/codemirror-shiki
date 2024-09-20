
import { describe, it, expect, beforeEach } from 'vitest'
import { ShikiEditor } from '../src'

let editor = new ShikiEditor({
    doc: 'console.log("Hello, World!")',
    lang: 'python',
    theme: 'one-dark-pro',
    themes: {
        light: 'github-light',
        dark: 'github-dark',
        dim: 'dracula',
        // any number of themes
    },
    // defaultColor: false,
    cssVariablePrefix: '--cm-',
    themeStyle: 'shiki',
})

describe('use shikiEditor', () => {

    it('update content', () => {
        // 设置编辑器内容
        editor.setValue('print("Hello, Python!")')
        expect(editor.getValue()).toBe('print("Hello, Python!")')
    })

})
