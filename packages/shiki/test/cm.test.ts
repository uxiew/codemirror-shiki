import { describe, it, expect } from 'vitest'
import { cmEditor, update, getTheme, shiki } from './demo'
import { themeCompartment } from '../src';

describe(`shikiWithCodeMirror's themes change`, () => {
    it('codemirror init default theme', () => {
        const dom = cmEditor.dom
        expect(dom.className.includes('cm-editor')).toBe(true);

        expect(window.getComputedStyle(dom).color).toBe('rgb(36, 41, 46)')
        expect(window.getComputedStyle(dom).backgroundColor).toBe('rgb(255, 255, 255)')
        // expect(dom.style.cssText).toBe('color: rgb(225, 228, 232); --cm-dark: #24292e; --cm-dim: #F8F8F2; background-color: rgb(36, 41, 46); --cm-dark-bg: #fff; --cm-dim-bg: #282A36;')
    });

    it('change theme to dark', async () => {
        const dom = cmEditor.dom
        await update({
            defaultColor: 'dark'
        })

        cmEditor.dispatch({
            effects: themeCompartment.reconfigure(getTheme(`dark`))
        })

        expect(window.getComputedStyle(dom).backgroundColor).toBe('rgb(36, 41, 46)')
    });
});

describe(`shikiWithCodeMirror's options update`, () => {
    it(`option update correctly`, async () => {
        const dom = cmEditor.dom
        await update({
            lang: 'vue',
        })

        expect(dom.querySelector('.cm-line span')?.style.cssText).include('--cm-dark: #F97583')
            .include('--cm-light: #D73A49').
            include('--cm-dim: #FF79C6')

        await update({
            defaultColor: 'dim',
        })

        expect(window.getComputedStyle(cmEditor.dom).color).toBe('rgb(225, 228, 232)')
    });
});

