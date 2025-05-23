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

// Debounce utility
function debounce<F extends (...args: any[]) => any>(fn: F, delay: number): (...args: Parameters<F>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}

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
    lastPos = { // This seems unused, consider removing if confirmed after refactor
        from: 0,
        to: 0
    }
    private _highlightTimeout: ReturnType<typeof setTimeout> | null = null;
    private _lastUpdate: ViewUpdate | null = null;
    private readonly debounceTimeMs = 250;

    constructor(public shikiHighlighter: ShikiHighlighter) {
    }

    destroy() {
        if (this._highlightTimeout) {
            clearTimeout(this._highlightTimeout);
        }
        this.clearDecorations();
    }

    update(update: ViewUpdate) {
        // Store the latest update for the debounced call
        this._lastUpdate = update;

        if (update.docChanged) {
            console.log("docChanged");
            // If the document is empty, clear decorations immediately.
            if (update.state.doc.length === 0) {
                this._cancelScheduledHighlight();
                this.clearDecorations();
                // Dispatch an update to clear the decorations from the view.
                if (update.view.docView.children.length > 0 || this.decorations !== RangeSet.empty) {
                    update.view.dispatch({});
                }
                return;
            }
            this._scheduleHighlight();
            return;
        }
        if (update.viewportChanged) {
            this._scheduleHighlight();
            return;
        }
        for (let tr of update.transactions) {
            for (let effect of tr.effects) {
                if (effect.is(updateEffect)) {
                    // Theme or options updated
                    this.shikiHighlighter.update(effect.value, update.view).then(
                        () => {
                            // Ensure this update is also captured if it's the latest
                            this._lastUpdate = update;
                            this._scheduleHighlight();
                        }
                    );
                    // No return here, allow other effects or changes to be processed if necessary
                }
            }
        }
    }

    private _cancelScheduledHighlight() {
        if (this._highlightTimeout) {
            clearTimeout(this._highlightTimeout);
            this._highlightTimeout = null;
        }
    }

    private clearDecorations() {
        this.decorations = RangeSet.empty
    }

    // docChangeHighlight and updateHighlight are effectively replaced by _scheduleHighlight
    // and _performHighlight. We can remove them or make them call _scheduleHighlight.
    // For simplicity, the main update method now directly calls _scheduleHighlight.

    private _scheduleHighlight() {
        this._cancelScheduledHighlight();
        // Don't pass 'update' directly to setTimeout's callback.
        // The callback will use this._lastUpdate.
        this._highlightTimeout = setTimeout(() => {
            if (this._lastUpdate) {
                this._performHighlight(this._lastUpdate);
                // Consider if _lastUpdate should be cleared here or if it's okay
                // to reuse it if another schedule comes in before it's set again.
                // It's set at the start of ShikiView.update, so it should be fine.
            }
        }, this.debounceTimeMs);
    }

    private async _performHighlight(update: ViewUpdate) {
        // Defensive check, though _lastUpdate should be set if this is called.
        if (!update) return;

        const builder = new RangeSetBuilder<Decoration>();
        const { state } = update;
        const doc = state.doc;
        const newVisibleRanges = update.view.visibleRanges;

        // If there's no document or no visible ranges, nothing to highlight.
        // Note: doc.length === 0 is handled before calling _scheduleHighlight in update method for docChanged.
        // However, a check here is still good for robustness.
        if (doc.length === 0 || newVisibleRanges.length === 0) {
            // If the document became empty and somehow wasn't caught before scheduling
            if (doc.length === 0 && this.decorations !== RangeSet.empty) {
                this.clearDecorations();
                update.view.dispatch({});
            }
            return;
        }

        // when the viewport is changed, the decorations should be updated
        for (let { from, to } of newVisibleRanges) {
            // Find the range that needs to be newly highlighted
            // Ensure shikiHighlighter is ready or view is valid
            if (!update.view.ready) return; // Or handle this state appropriately

            await this.shikiHighlighter.highlight(doc, from, to, (from, to, mark) => {
                builder.add(from, to, mark)
            })
            // this.lastPos = { from, to } // lastPos seems unused, can be removed.
        }
        this.decorations = builder.finish()
        // Dispatch an update to ensure CodeMirror re-renders with the new decorations.
        // Ensure view is still valid before dispatching
        if (update.view.ready) {
             update.view.dispatch({})
        }
    }
}

export const shikiViewPlugin = (shikiHighlighter: ShikiHighlighter, _options: ShikiToCMOptions) => {

    return {
        viewPlugin: ViewPlugin.define((view: EditorView) =>
            new ShikiView(shikiHighlighter.setView(view))
            , {
                decorations: v => v.decorations
            })
    }
};