import {
    Decoration, ViewPlugin, EditorView,
    type ViewUpdate,
    type DecorationSet,
} from "@codemirror/view"
import {
    Facet,
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
} from './highlighter';


type Range = {
    from: number
    to: number
}

/** update theme options */
export const updateGenerateOptions = StateEffect.define<Partial<CmSkUpdateOptions>>()

class ShikiView {
    decorations: DecorationSet

    lastPos = {
        from: 0,
        to: 0
    }

    constructor(public shikiRenderer: ShikiHighlighter, view: EditorView) {
        this.decorations = this.highlightDocument(view.state.doc);
    }

    update(update: ViewUpdate) {
        if (update.docChanged) {
            this.decorations = this.docChangeHighlight(update);
            return
        }
        if (update.viewportChanged) {
            this.decorations = this.updateHighlight(update);
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
        this.shikiRenderer.highlight(doc, 0, doc.length, (from, to, mark) => {
            builder.add(from, to, mark)
        })
        this.lastPos.from = 0
        this.lastPos.to = doc.length
        return builder.finish();
    }

    docChangeHighlight(update: ViewUpdate) {
        const { doc } = update.state
        const { from, to } = this.lastPos = update.view.visibleRanges[0] || this.lastPos
        const builder = new RangeSetBuilder<Decoration>();

        // when docChanged
        update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            const newLineA = doc.lineAt(fromB)
            const newLineB = doc.lineAt(toB)
            const preLine = doc.line(newLineA.number - 1 || newLineA.number)
            const postLine = doc.line(newLineB.number + 1 > doc.lines ? doc.lines : newLineB.number)

            if (doc.length === 0) {
                this.decorations = RangeSet.empty
                return
            }

            if (fromA === 0 && fromA === fromB) {
                // Remove all previous deco
                this.decorations = RangeSet.empty
                this.decorations = this.updateHighlight(update);
                return;
            }

            const preState = this.shikiRenderer.getLastGrammarState(doc.sliceString(this.lastPos.from, preLine.to))

            if (newLineA.number === 1) {
                preState == undefined
            } else {
                // unchanged part
                this.decorations.between(from, preLine.to, (from, to, value) => {
                    builder.add(from, to, value);
                });
            }

            // TODO 之前的挂载样式存在，需要清理？
            this.shikiRenderer.highlight(doc, newLineA.from, to, (from, to, mark) => {
                builder.add(from, to, mark);
            }, preState)

            this.lastPos.from = from
            this.lastPos.to = to

            this.decorations = builder.finish();
        });

        return this.decorations
    }

    updateHighlight(update: ViewUpdate) {
        const builder = new RangeSetBuilder<Decoration>();
        const doc = update.state.doc;

        // when the viewport is changed, the decorations should be updated
        for (let { from, to } of update.view.visibleRanges) {
            // reserve the unchanged part
            const unchanged = { from: 0, to: 0 }
            const range = { from, to }
            const { from: lfrom, to: lto } = this.lastPos
            // TODO when scroll up
            if (lfrom < to && to < lto) {
                // unchanged.from = lfrom
                // unchanged.to = to
                range.from = from
                range.to = to
            }
            if (from < lto && lto < to) {
                unchanged.from = from
                unchanged.to = lto
                range.from = lto
                range.to = to
            }
            // console.log("betweenbetween", this.lastPos, from, to, unchanged, range)

            // unchanged part
            this.decorations.between(unchanged.from, unchanged.to, (from, to, value) => {
                builder.add(from, to, value);
            });

            // highlight the changed part
            this.shikiRenderer.highlight(doc, range.from, range.to, (from, to, mark) => {
                builder.add(from, to, mark)
            })

            this.lastPos.from = from
            this.lastPos.to = to
        }
        return builder.finish();
    }
}

export const shikiViewPlugin = (highlighter: Highlighter, genOptions: CmSkOptions) => {
    let shPromise: () => Promise<ShikiHighlighter> = () => Promise.reject(new Error('[@cmshiki/shiki] ' + "`actions` can only be used after @cmshiki/shiki is initialized!"));

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