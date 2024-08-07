
import { EditorView, ViewUpdate, ViewPlugin, DecorationSet, Decoration } from "@codemirror/view"
import { EditorState, StateEffect, Extension } from "@codemirror/state"
import {
    createShikiInternal,
    type HighlighterCoreOptions
} from 'shiki/core';
import getWasm from 'shiki/wasm';
import type { ShikiToCMOptions } from "../../shiki/src/types/types";

const updateSyntax = StateEffect.define<string>()
const updateTheme = StateEffect.define<string>()

export class ShikiEditor {
    private view: EditorView
    private highlightPlugin: ViewPlugin<{ decorations: DecorationSet }>



    async loadShiki(options: Omit<HighlighterCoreOptions, 'loadWasm'>) {
        const highlighter = await createShikiInternal({ ...options, loadWasm: getWasm })
    }

    constructor(parent: HTMLElement, initialCode: string = '', options: any) {

        this.view = new EditorView({
            state: EditorState.create({
                doc: initialCode,
                extensions: [this.highlightPlugin]
            }),
            parent: parent,
            extensions: []
        })
    }

    async init(options: ShikiToCMOptions) {
        const highlighter = await createShikiInternal({
            theme: this.currentTheme,
            langs: [this.currentLang],
            loadWasm: getWasm
        })

        return shikiToCodeMirror(highlighter, options)
    }

    private async createHighlightPlugin(options: CmSkOptions) {


        return shikiToCodeMirror(highlighter, options)
    }

    updateSyntax(newLang: string) {
        this.view.dispatch({
            effects: updateSyntax.of(newLang)
        })
    }

    updateTheme(newTheme: string) {
        this.view.dispatch({
            effects: updateTheme.of(newTheme)
        })
    }

    getValue(): string {
        return this.view.state.doc.toString()
    }

    setValue(newCode: string) {
        this.view.dispatch({
            changes: { from: 0, to: this.view.state.doc.length, insert: newCode }
        })
    }
}