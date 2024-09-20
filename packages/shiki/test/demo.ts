import { EditorState } from "@codemirror/state";
import { type Options, updateEffect, shikiToCodeMirror, configsFacet } from "../src";
import { EditorView } from "@codemirror/view";

export const { shiki, getTheme } = await shikiToCodeMirror({
    lang: 'typescript',
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

const state = EditorState.create({
    doc: `const hello = 'Hello'
    console.log(hello + 'codeMirror-shiki!')`,
    extensions: [shiki],
});

export const cmEditor = new EditorView({
    state,
    parent: document.body,
});


export function update(options: Options) {
    cmEditor.dispatch({
        effects: updateEffect.of(options)
    });
}
