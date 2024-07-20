import { cmEditor, actions } from './demo'

describe(`shikiWithCodeMirror's themes change`, () => {
    it('codemirror init default theme', () => {
        const dom = cmEditor.dom
        expect(dom.className.includes('cm-editor')).toBe(true);

        expect(window.getComputedStyle(dom).color).toBe('rgb(225, 228, 232)')
        expect(window.getComputedStyle(dom).backgroundColor).toBe('rgb(36, 41, 46)')
        // expect(dom.style.cssText).toBe('color: rgb(225, 228, 232); --cm-dark: #24292e; --cm-dim: #F8F8F2; background-color: rgb(36, 41, 46); --cm-dark-bg: #fff; --cm-dim-bg: #282A36;')
    });

    it('change theme to dark', async () => {
        const dom = cmEditor.dom
        await actions.setTheme({
            theme: 'dark'
        })
        // TODO
        expect(dom.className.includes('dark')).toBe(false)
        expect(window.getComputedStyle(dom).backgroundColor).toBe('rgb(255, 255, 255)')
    });
});

describe(`shikiWithCodeMirror's options update`, () => {
    it(`option update correctly`, async () => {
        const dom = cmEditor.dom

        await actions.update({
            lang: 'vue'
        })
        expect(dom.querySelector('.cm-line span')?.style.cssText).include('--cm-light: #E1E4E8')
            .include('--cm-dark: #24292E').
            include('--cm-dim: #F8F8F2')

        await actions.update({
            theme: 'dim',
        })

        expect(window.getComputedStyle(cmEditor.dom.querySelector('.cm-line span')!).color).toBe('rgb(248, 248, 242)')
        // await actions.update({
        //     themeStyle: 'shiki'
        // })
        // expect(dom.style.cssText).toBe('color: rgb(225, 228, 232); --cm-dark: #24292e; --cm-dim: #F8F8F2; background-color: rgb(36, 41, 46); --cm-dark-bg: #fff; --cm-dim-bg: #282A36;')

        // await actions.update({
        //     cssVariablePrefix: '--a-bg-'
        // })
        // expect(dom.style.cssText).include('--a-bg-')
    });
});

describe(`shikiWithCodeMirror's options update`, () => {
    it(`theme update correctly`, async () => {
        await actions.update({
            theme: 'dim',
        })
        const theme = await actions.getCurrentTheme()
        expect(theme).toEqual('dim')

        await actions.update({
            theme: 'light',
        })

        const themeName = await actions.getCurrentTheme()
        expect(themeName).toEqual('light')
    });
});

// describe(`shikiWithCodeMirror's shiki render`, () => {
//     it('shiki tokens generated', () => {
//         const dom = cmEditor.contentDOM
//         expect((dom.querySelectorAll('.cm-line span')).length).gt(0)
//     });
//     it('shiki token color rendered', () => {
//         const dom = cmEditor.contentDOM
//         expect((dom.querySelectorAll('.cm-line span')).length).gt(0)
//         console.log((dom.querySelector('.cm-line span') as HTMLSpanElement)?.style.cssText)
//         expect((dom.querySelector('.cm-line span') as HTMLSpanElement)?.style.cssText).include('--cm-dark').include('--cm-dim')
//     });
// });