import { EditorState } from "@codemirror/state";
import { createHighlighter } from "shiki";
import { shikiToCodeMirror } from "../src";
import { EditorView } from "@codemirror/view";

export const shikiHighlighter = await createHighlighter({
    langs: ['vue', 'typescript', 'astro'],
    themes: [
        'github-light',
        'github-dark',
        'one-dark-pro',
        'dracula'
    ]
});

export const { shiki, actions } = await shikiToCodeMirror(shikiHighlighter, {
    lang: 'typescript',
    theme: 'one-dark-pro',
    themes: {
        light: 'github-dark',
        dark: 'github-light',
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
