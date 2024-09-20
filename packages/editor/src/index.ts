
import {
    EditorView,
} from "@codemirror/view"
import { Compartment, Extension } from "@codemirror/state";
import { type Options, shikiToCodeMirror, themeCompartment, updateEffect } from '@cmshiki/shiki';
import type { ShikiEditorOptions } from "./types";
import { partitionOptions } from "./utils";


const shikiComp = new Compartment

export class ShikiEditor {
    view: EditorView
    getTheme: Promise<(name?: string, view?: EditorView) => Extension>

    private async registerInternal(options: ShikiEditorOptions) {
        const { shiki, getTheme } = await shikiToCodeMirror(options)
        // this.getTheme = (name, view) => Promise.resolve(getTheme(name, view))
        return {
            getTheme,
            extensions: [
                EditorView.updateListener.of((u) => {
                    if (u.docChanged) {
                        options.onUpdate?.(u)
                    }
                }),
                shiki
            ]
        }
    }

    constructor(private readonly options: ShikiEditorOptions) {
        const { shikiOptions, CodeMirrorOptions: cmOptions } = partitionOptions(options)
        this.view = new EditorView({
            ...cmOptions,
            extensions: Array.isArray(cmOptions.extensions) ?
                cmOptions.extensions.concat(shikiComp.of([])) :
                undefined,
        })

        this.getTheme = this.registerInternal(shikiOptions).then(({ getTheme, extensions }) => {
            this.view.dispatch({
                effects: shikiComp.reconfigure(extensions)
            })
            return getTheme
        })
    }

    /**
     * Dynamically set listening events,listen when the document changed.
     * @param {(u: ViewUpdate)}
     */
    setOnUpdate(callback: ShikiEditorOptions['onUpdate']) {
        this.options.onUpdate = callback
    }

    /**
     * Dynamically set listening events,listen when the document changed.
     * @param {(u: ViewUpdate)}
     */
    destroy() {
        this.view.destroy()
    }

    update(options: Options) {
        this.view.dispatch({
            effects: updateEffect.of(options)
        })
    }

    /**
     * change theme
     * 
     * @param {string} name - theme style name,like `light`、`dark`、`dim`
     */
    async changeTheme(name: string) {
        this.view.dispatch({
            effects: themeCompartment.reconfigure((await this.getTheme)(name, this.view))
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