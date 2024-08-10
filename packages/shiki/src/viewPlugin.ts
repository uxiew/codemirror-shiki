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
    StateField,
    Text,
} from "@codemirror/state"

import type {
    CmSHOptions,
    CmSkUpdateOptions,
    Highlighter,
    ShikiToCMOptions,
} from './types/types';
import { HighlightWorker } from "./highlighter";
import { mountStyles } from "@cmshiki/utils";
import { toStyleObject } from "./utils";


type Range = {
    from: number
    to: number
}

/** update theme options */
export const updateOptionsEffect = StateEffect.define<Partial<CmSkUpdateOptions>>()

export const updateDecorationsEffect = StateEffect.define<DecorationSet>()

// create a StateField to manage decorations
const highlightDecorations = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(decorations, tr) {
        console.log(tr.changes, decorations.map(tr.changes));
        decorations = decorations.map(tr.changes);
        for (let effect of tr.effects) {
            if (effect.is(updateDecorationsEffect)) {
                console.log("effect.value", effect.value);
                decorations = effect.value;
            }
        }
        return decorations;
    },
    provide: f => EditorView.decorations.from(f)
});

class ShikiView {
    decorations: DecorationSet
    debounceTimeout: number | undefined;

    lastPos = {
        from: 0,
        to: 0
    }

    constructor(private highlighter: HighlightWorker, private view: EditorView) {
        this.decorations = Decoration.none;
        this.highlightDocument(view.state.doc);
    }

    update(update: ViewUpdate) {
        if (update.docChanged) {
            this.docChangeHighlight(update);
            return
        }
        if (update.viewportChanged) {
            this.updateHighlight(update);
            return
        }
        for (let tr of update.transactions) {
            for (let effect of tr.effects) {
                if (effect.is(updateOptionsEffect)) {
                    this.highlighter.update(effect.value);
                    this.highlightDocument(update.view.state.doc);
                }
            }
        }
    }

    highlightDocument(doc: Text) {
        const builder = new RangeSetBuilder<Decoration>();
        for (let { from, to } of this.view.visibleRanges) {
            console.log(from, to);
            this.highlighter.highlight({
                text: doc,
                from,
                to
            }, {
                buildDeco: (from, to, mark) => {
                    builder.add(from, to, mark)
                },
                handleStyles: ({ classes }) => {
                    console.log("res", classes);

                    Object.entries(classes).forEach(([k, v]) => {
                        mountStyles(this.view!, {
                            [`& .cm-line .${v}`]: toStyleObject(k)
                        })
                    })
                    this.decorations = builder.finish();
                    this.view.dispatch({ effects: updateDecorationsEffect.of(this.decorations) });
                }
            })
            this.lastPos.from = from
            this.lastPos.to = to
        }
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
                this.decorations = Decoration.none;
                return
            }

            if (fromA === 0 && fromA === fromB) {
                // Remove all previous deco
                this.decorations = Decoration.none;
                this.updateHighlight(update);
                return;
            }

            this.highlighter.update({
                grammarContextCode: doc.sliceString(this.lastPos.from, preLine.to)
            })

            // only one line, rerender all code
            if (newLineA.number === 1) {
                this.highlighter.update({
                    grammarContextCode: undefined
                })
            } else {
                // unchanged part
                this.decorations.between(from, preLine.to, (from, to, value) => {
                    builder.add(from, to, value);
                });
            }

            // TODO 之前的挂载样式存在，需要清理？
            this.highlighter.highlight(
                {
                    text: doc,
                    from: newLineA.from,
                    to
                },
                {
                    buildDeco: (from, to, mark) => {
                        builder.add(from, to, mark);
                    },
                    handleStyles: ({ classes: cmClasses }) => {

                        // TODO Theme mountStyle
                        // if (isCmStyle) {
                        Object.entries(cmClasses).forEach(([k, v]) => {
                            mountStyles(this.view!, {
                                [`& .cm-line .${v}`]: toStyleObject(k)
                            })
                        })
                        // }
                        this.decorations = builder.finish()
                        this.view.dispatch({ effects: updateDecorationsEffect.of(this.decorations) });
                    }
                })

            this.lastPos.from = from
            this.lastPos.to = to

        });
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
            this.highlighter.highlight(
                {
                    text: doc,
                    from: range.from,
                    to: range.to,
                }, {
                buildDeco: (from, to, mark) => {
                    builder.add(from, to, mark);
                },
                handleStyles: ({ classes }) => {


                    Object.entries(classes).forEach(([k, v]) => {
                        mountStyles(this.view!, {
                            [`& .cm-line .${v}`]: toStyleObject(k)
                        })
                    })
                    this.decorations = builder.finish();
                    this.view.dispatch({ effects: updateDecorationsEffect.of(this.decorations) });
                }
            })

            // this.highlighter.highlight(from, to, text).then(result => {
            //     const newDecorations = Decoration.set(result.map(
            //         (d: any) => Decoration.mark(d.from, d.to, { class: d.class })
            //     ));
            // });

            this.lastPos.from = from
            this.lastPos.to = to

        }

        // this.decorations = builder.finish();
    }
}

export const shikiViewPlugin = (highlighter: HighlightWorker, genOptions: ShikiToCMOptions) => {
    let shPromise: () => Promise<any> = () => Promise.reject(new Error('[@cmshiki/shiki] ' + "`actions` can only be used after @cmshiki/shiki is initialized!"));

    return {
        // highlightDecorations,
        /** get current shiki highlighter instance */
        getShikiHighlighter: () => shPromise(),
        viewPlugin: ViewPlugin.define((view: EditorView) => {
            // let shikiHighlighter = new ShikiHighlighter(
            //     genOptions,
            //     view)
            // shPromise = () => Promise.resolve(shikiHighlighter)
            return new ShikiView(highlighter, view)
        }, {
            decorations: (v: ShikiView) => v.decorations,
            // provide: () => highlightDecorations,
        })
    }
};