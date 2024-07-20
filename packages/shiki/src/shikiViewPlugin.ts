import {
    Decoration, ViewPlugin, EditorView,
    type ViewUpdate,
    type DecorationSet,
} from "@codemirror/view"
import {
    RangeSet,
    RangeSetBuilder,
    StateEffect,
    Text,
} from "@codemirror/state"

import {
    type CmSkOptions,
    type CmSHOptions,
    type CmSkUpdateOptions,
    type Highlighter,
} from './types/types';
import {
    ShikiHighlighter,
} from './shikiHighlighter';

/** update theme options */
export const updateGenerateOptions = StateEffect.define<Partial<CmSkUpdateOptions>>()

class ShikiView {
    decorations: DecorationSet

    constructor(public shikiRenderer: ShikiHighlighter, view: EditorView) {
        this.decorations = this.highlightDocument(view.state.doc);
    }

    update(update: ViewUpdate) {
        // TODO 不更新无效输入，如行的首尾空格/换行，空行等
        if (update.docChanged) {
            this.decorations = this.updateHighlights(update);
            return
        }
        for (let tr of update.transactions) {
            for (let effect of tr.effects) {
                if (effect.is(updateGenerateOptions)) {
                    this.shikiRenderer.update(effect.value);
                    this.decorations = this.highlightDocument(update.view.state.doc);
                }
            }
        }
    }

    highlightDocument(doc: Text) {
        const builder = new RangeSetBuilder<Decoration>();
        this.shikiRenderer.highlight(builder, doc.sliceString(0), 0)
        // this.shikiRenderer.highlight(doc.sliceString(0), 0).decorations.forEach(({ from, to, mark }) => {
        //     builder.add(from, to, mark)
        // })
        return builder.finish();
    }

    updateHighlights(update: ViewUpdate) {
        const builder = new RangeSetBuilder<Decoration>();
        const doc = update.state.doc;

        let lastPos = 0;
        for (let range of update.view.visibleRanges) {
            console.log(update.view.visibleRanges);
            // unchanged part
            this.decorations.between(lastPos, range.from, (from, to, value) => {
                console.log(lastPos, range.from, from, to, value);
                builder.add(from, to, value);
            });
            // highlight the changed part
            const text = doc.sliceString(range.from, range.to);
            this.shikiRenderer.highlight(builder, text, range.from)
            // this.shikiRenderer.highlight(text, range.from).decorations.forEach(({ from, to, mark }) => {
            //     builder.add(from, to, mark)
            // })
            lastPos = range.to;
        }

        // rest
        this.decorations.between(lastPos, doc.length, (from, to, value) => {
            builder.add(from, to, value);
        });

        return builder.finish();
    }
}

export const shikiViewPlugin = (highlighter: Highlighter, genOptions: CmSkOptions) => {
    let shPromise: () => Promise<ShikiHighlighter> = () => Promise.reject(new Error("ShikiHighlighter not initialized yet"));

    return {
        /** get current shiki highlighter instance */
        getShikiHighlighter: () => shPromise(),
        viewPlugin: ViewPlugin.define((view: EditorView) => {
            let shikiHighlighter = new ShikiHighlighter(
                highlighter,
                genOptions as CmSHOptions,
                view)
            shPromise = () => Promise.resolve(shikiHighlighter)
            return new ShikiView(shikiHighlighter, view)
        }, {
            decorations: v => v.decorations
        })
    }
};