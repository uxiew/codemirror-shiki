
import {
    EditorView,
} from "@codemirror/view"
import { type Options, shikiToCodeMirror, updateEffect } from '@cmshiki/shiki';
import type { ShikiEditorOptions } from "./types";
import { partitionOptions } from "./utils";

export class ShikiEditor {
    private view!: EditorView

    private async registerInternals(options: ShikiEditorOptions) {
        const { shiki } = await shikiToCodeMirror(options)
        return [
            EditorView.updateListener.of((u) => {
                if (u.docChanged) {
                    options.onViewUpdate?.(u)
                }
            }),
            shiki
        ]
    }

    constructor(options: ShikiEditorOptions) {
        const { shikiOptions, CodeMirrorOptions: cmOptions } = partitionOptions(options)
        this.registerInternals(shikiOptions).then((extensions) => {
            this.view = new EditorView({
                ...cmOptions,
                extensions: Array.isArray(cmOptions.extensions) ?
                    cmOptions.extensions.concat([extensions]) :
                    cmOptions.extensions ?? extensions,
            })
        })
    }

    update(options: Options) {
        this.view.dispatch({
            effects: updateEffect.of(options)
        });
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