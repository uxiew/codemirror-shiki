import {
    Decoration, ViewPlugin, EditorView,
    type ViewUpdate,
    type DecorationSet,
} from "@codemirror/view"
import {
    RangeSet,
    RangeSetBuilder,
    StateEffect,
} from "@codemirror/state"

import type {
    Highlighter,
    Options,
    ShikiToCMOptions,
} from './types/types';
import {
    ShikiHighlighter,
} from './highlighter';

/** update theme options */
export const updateEffect = StateEffect.define<Partial<Options>>()

class ShikiView {
    decorations: DecorationSet = RangeSet.empty
    lastPos = {
        from: 0,
        to: 0
    }

    constructor(public shikiHighlighter: ShikiHighlighter) {
    }

    // when crashed

    destroy() {
        this.clearDecorations()
    }

    update(update: ViewUpdate) {
        if (update.docChanged) {
            console.log("docChanged");
            this.docChangeHighlight(update);
            return
        }
        if (update.viewportChanged) {
            console.log("viewportChanged");
            this.updateHighlight(update);
            return
        }
        for (let tr of update.transactions) {
            for (let effect of tr.effects) {
                if (effect.is(updateEffect)) {
                    this.shikiHighlighter.update(effect.value, update.view).then(
                        () => this.updateHighlight(update)
                    )
                }
            }
        }
    }

    private clearDecorations() {
        this.decorations = RangeSet.empty
    }

    docChangeHighlight(update: ViewUpdate) {
        const { doc } = update.state
        const newVisibleRanges = update.view.visibleRanges;
        const builder = new RangeSetBuilder<Decoration>();

        if (doc.length === 0) {
            return builder.finish();
        }

        for (let { from, to } of newVisibleRanges) {
            console.log(update);

            // when docChanged
            update.changes.iterChanges((oldStart, oldEnd, newStart, newEnd, inserted) => {
                if (oldStart === 0 && oldStart === newStart) {
                    // Remove all previous deco
                    this.clearDecorations()
                    this.updateHighlight(update);
                    return;
                }

                // TODO 之前的挂载样式存在，需要清理？
                this.shikiHighlighter.highlight(doc, from, to, (from, to, mark) => {
                    builder.add(from, to, mark);
                })

                this.lastPos.from = from
                this.lastPos.to = to
                this.decorations = builder.finish();
            });
        }
    }

    updateHighlight(update: ViewUpdate) {
        const builder = new RangeSetBuilder<Decoration>();
        const doc = update.state.doc;
        const newVisibleRanges = update.view.visibleRanges;

        // when the viewport is changed, the decorations should be updated
        for (let { from, to } of newVisibleRanges) {
            // Find the range that needs to be newly highlighted
            this.shikiHighlighter.highlight(doc, from, to, (from, to, mark) => {
                builder.add(from, to, mark)
            })
            this.lastPos = { from, to }
        }
        this.decorations = builder.finish()
    }
}

export const shikiViewPlugin = (highlighter: Highlighter, options: ShikiToCMOptions) => {

    return {
        viewPlugin: ViewPlugin.define((view: EditorView) => {
            return new ShikiView(new ShikiHighlighter(
                highlighter,
                options,
                view))
        }, {
            decorations: v => v.decorations
        })
    }
};