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

// Polyfill for requestIdleCallback
const requestIdleCallback = (typeof window !== 'undefined' && window.requestIdleCallback)
    ? window.requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 1);

const cancelIdleCallback = (typeof window !== 'undefined' && window.cancelIdleCallback)
    ? window.cancelIdleCallback
    : clearTimeout;

class ShikiView {
    decorations: DecorationSet = RangeSet.empty
    lastPos = {
        from: 0,
        to: 0
    }
    // Track pending async highlight to cancel if viewport changes again
    private pendingHighlight: ReturnType<typeof requestIdleCallback> | null = null;

    constructor(public shikiHighlighter: ShikiHighlighter, view: EditorView) {
        this.updateHighlight(view)
    }

    // when crashed

    destroy() {
        this.cancelPendingHighlight();
        this.clearDecorations()
    }

    update(update: ViewUpdate) {
        if (update.docChanged) {
            this.docChangeHighlight(update);
            return
        }
        if (update.viewportChanged) {
            this.updateHighlight(update.view);
            return
        }
        for (let tr of update.transactions) {
            for (let effect of tr.effects) {
                if (effect.is(updateEffect)) {
                    this.shikiHighlighter.update(effect.value, update.view).then(
                        () => this.updateHighlight(update.view)
                    )
                }
            }
        }
    }

    private clearDecorations() {
        this.decorations = RangeSet.empty
    }

    private cancelPendingHighlight() {
        if (this.pendingHighlight !== null) {
            cancelIdleCallback(this.pendingHighlight as number);
            this.pendingHighlight = null;
        }
    }

    docChangeHighlight(update: ViewUpdate) {
        const { doc } = update.state
        const newVisibleRanges = update.view.visibleRanges;
        const builder = new RangeSetBuilder<Decoration>();

        if (doc.length === 0) {
            return builder.finish();
        }

        for (let { from, to } of newVisibleRanges) {
            // when docChanged
            update.changes.iterChanges((oldStart, oldEnd, newStart, newEnd, inserted) => {
                if (oldStart === 0 && oldStart === newStart) {
                    // Remove all previous deco
                    this.clearDecorations()
                    this.updateHighlight(update.view);
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

    /**
     * Scheme 2: Deferred Highlighting
     * 1. Cancel any pending highlight work
     * 2. Clear decorations immediately (show unstyled text)
     * 3. Schedule async highlight with requestIdleCallback
     * 4. Update decorations when done
     */
    updateHighlight(view: EditorView) {
        // Cancel any pending work from previous scroll
        this.cancelPendingHighlight();

        const doc = view.state.doc;
        const newVisibleRanges = view.visibleRanges.slice(); // Copy to avoid mutation

        console.log('[@cmshiki/editor] updateHighlight called. Visible ranges:', newVisibleRanges.length);

        // Store current viewport for comparison after async work
        const requestedRanges = newVisibleRanges.map(r => ({ from: r.from, to: r.to }));

        // Schedule highlighting in idle time (doesn't block UI)
        this.pendingHighlight = requestIdleCallback(() => {
            console.log('[@cmshiki/editor] requestIdleCallback executed');
            // Check if viewport hasn't changed during wait
            const currentRanges = view.visibleRanges;
            const isSameViewport = requestedRanges.every((r, i) =>
                currentRanges[i] && r.from === currentRanges[i].from && r.to === currentRanges[i].to
            );

            if (!isSameViewport) {
                console.log('[@cmshiki/editor] Viewport changed, skipping highlight');
                // Viewport changed, skip this work (new highlight already scheduled)
                return;
            }

            console.log('[@cmshiki/editor] applying highlight for ranges:', newVisibleRanges);
            const builder = new RangeSetBuilder<Decoration>();
            let hasMarks = false;

            // Perform synchronous tokenization (but it's running in idle time)
            for (let { from, to } of newVisibleRanges) {
                this.shikiHighlighter.highlight(doc, from, to, (from, to, mark) => {
                    builder.add(from, to, mark)
                    hasMarks = true;
                })
                this.lastPos = { from, to }
            }

            console.log('[@cmshiki/editor] highlighting complete. marks found:', hasMarks);
            this.decorations = builder.finish()
            this.pendingHighlight = null;

            // Trigger re-render with new decoissrations
            // Use a no-op transaction to update the view
            view.dispatch({});
        });
    }
}

export const shikiViewPlugin = (shikiHighlighter: ShikiHighlighter, _options: ShikiToCMOptions) => {

    return {
        viewPlugin: ViewPlugin.define((view: EditorView) => {
            console.log('[@cmshiki/editor] ViewPlugin factory called!');
            try {
                return new ShikiView(shikiHighlighter.setView(view), view)
            } catch (e) {
                console.error('[@cmshiki/editor] Error in ShikiView constructor:', e);
                throw e;
            }
        }, {
            decorations: v => v.decorations
        })
    }
};