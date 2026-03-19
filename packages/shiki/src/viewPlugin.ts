import {
  Decoration,
  ViewPlugin,
  EditorView,
  type ViewUpdate,
  type DecorationSet,
} from '@codemirror/view';
import {
  RangeSet,
  RangeSetBuilder,
  StateEffect,
  type Text,
} from '@codemirror/state';

import type { Highlighter, Options, ShikiToCMOptions } from './types/types';
import { ShikiHighlighter } from './highlighter';

/** update theme options */
export const updateEffect = StateEffect.define<Partial<Options>>();

interface SimpleRange {
  from: number;
  to: number;
}

interface DecorationEntry {
  from: number;
  to: number;
  mark: Decoration;
}

const RAPID_VIEWPORT_INTERVAL_MS = 48;
const RAPID_SCROLL_SETTLE_MS = 96;
const COARSE_HIGHLIGHT_LINE_BUDGET = 240;

export function normalizeVisibleRanges(
  ranges: readonly { from: number; to: number }[],
): SimpleRange[] {
  const sorted = ranges
    .filter((r) => r.to > r.from)
    .map((r) => ({ from: r.from, to: r.to }))
    .sort((a, b) => a.from - b.from || a.to - b.to);

  const merged: SimpleRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.from > last.to) {
      merged.push(range);
      continue;
    }
    if (range.to > last.to) last.to = range.to;
  }
  return merged;
}

function isSameRanges(a: SimpleRange[], b: SimpleRange[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].from !== b[i].from || a[i].to !== b[i].to) return false;
  }
  return true;
}

export function buildDecorationsFromEntries(
  entries: DecorationEntry[],
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const sorted = entries
    .filter((e) => e.to > e.from)
    .sort((a, b) => a.from - b.from || a.to - b.to);

  let warned = false;
  for (const entry of sorted) {
    try {
      builder.add(entry.from, entry.to, entry.mark);
    } catch (err) {
      // Defensive guard for malformed input under extreme async race conditions.
      if (!warned) {
        console.warn(
          '[@cmshiki/editor] skip invalid decoration range during build:',
          err,
        );
        warned = true;
      }
    }
  }
  return builder.finish();
}

export function shouldDeferViewportHighlight(
  now: number,
  lastViewportChangeAt: number,
  rapidIntervalMs = RAPID_VIEWPORT_INTERVAL_MS,
): boolean {
  return (
    lastViewportChangeAt > 0 && now - lastViewportChangeAt < rapidIntervalMs
  );
}

export function trimRangesByLineBudget(
  doc: Text,
  ranges: SimpleRange[],
  lineBudget = COARSE_HIGHLIGHT_LINE_BUDGET,
): SimpleRange[] {
  if (lineBudget <= 0 || ranges.length === 0) return [];

  let remaining = lineBudget;
  const trimmed: SimpleRange[] = [];

  for (const range of ranges) {
    if (remaining <= 0) break;

    const startLine = doc.lineAt(range.from).number;
    const endLine = doc.lineAt(range.to).number;
    const lineCount = endLine - startLine + 1;

    if (lineCount <= remaining) {
      trimmed.push(range);
      remaining -= lineCount;
      continue;
    }

    const capLineNumber = Math.max(startLine, startLine + remaining - 1);
    const capLine = doc.line(capLineNumber);
    const capTo = Math.min(range.to, capLine.to);
    if (capTo > range.from) {
      trimmed.push({ from: range.from, to: capTo });
    }
    remaining = 0;
  }

  if (trimmed.length === 0) {
    const firstLine = doc.lineAt(ranges[0].from);
    return [{ from: ranges[0].from, to: Math.min(ranges[0].to, firstLine.to) }];
  }

  return trimmed;
}

// Polyfill for requestIdleCallback
const requestIdleCallback =
  typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 1);

const cancelIdleCallback =
  typeof window !== 'undefined' && window.cancelIdleCallback
    ? window.cancelIdleCallback
    : clearTimeout;

class ShikiView {
  decorations: DecorationSet = RangeSet.empty;
  lastPos = {
    from: 0,
    to: 0,
  };
  // Track pending async highlight to cancel if viewport changes again
  private pendingHighlight: ReturnType<typeof requestIdleCallback> | null =
    null;
  private pendingViewportSettle: ReturnType<typeof setTimeout> | null = null;
  private highlightRequestId = 0;
  private lastViewportChangeAt = 0;

  constructor(
    public shikiHighlighter: ShikiHighlighter,
    view: EditorView,
  ) {
    this.updateHighlight(view);
  }

  // when crashed

  destroy() {
    this.cancelPendingHighlight();
    this.cancelPendingViewportSettle();
    this.clearDecorations();
  }

  update(update: ViewUpdate) {
    if (update.docChanged) {
      this.docChangeHighlight(update);
      return;
    }
    if (update.viewportChanged) {
      this.handleViewportChanged(update.view);
      return;
    }
    let reconfigured = false;
    for (let tr of update.transactions) {
      if (tr.reconfigured) {
        reconfigured = true;
      }
      for (let effect of tr.effects) {
        if (effect.is(updateEffect)) {
          this.shikiHighlighter
            .update(effect.value, update.view)
            .then(() => this.updateHighlight(update.view));
          return;
        }
      }
    }
    // Theme compartment reconfigure should also trigger re-highlighting,
    // even when no explicit updateEffect is found.
    if (reconfigured) {
      this.updateHighlight(update.view);
    }
  }

  private clearDecorations() {
    this.decorations = RangeSet.empty;
  }

  private cancelPendingHighlight() {
    if (this.pendingHighlight !== null) {
      cancelIdleCallback(this.pendingHighlight as number);
      this.pendingHighlight = null;
    }
  }

  private cancelPendingViewportSettle() {
    if (this.pendingViewportSettle !== null) {
      clearTimeout(this.pendingViewportSettle);
      this.pendingViewportSettle = null;
    }
  }

  private handleViewportChanged(view: EditorView) {
    const now = Date.now();
    const shouldDefer = shouldDeferViewportHighlight(
      now,
      this.lastViewportChangeAt,
    );
    this.lastViewportChangeAt = now;

    if (!shouldDefer) {
      this.cancelPendingViewportSettle();
      this.updateHighlight(view, { coarse: false });
      return;
    }

    this.cancelPendingViewportSettle();
    this.updateHighlight(view, { coarse: true });
    this.pendingViewportSettle = setTimeout(() => {
      this.pendingViewportSettle = null;
      this.updateHighlight(view, { coarse: false });
    }, RAPID_SCROLL_SETTLE_MS);
  }

  docChangeHighlight(update: ViewUpdate) {
    this.updateHighlight(update.view);
  }

  /**
   * Scheme 2: Deferred Highlighting
   * 1. Cancel any pending highlight work
   * 2. Clear decorations immediately (show unstyled text)
   * 3. Schedule async highlight with requestIdleCallback
   * 4. Update decorations when done
   */
  updateHighlight(view: EditorView, options: { coarse?: boolean } = {}) {
    // Cancel any pending work from previous scroll
    this.cancelPendingHighlight();

    const doc = view.state.doc;
    const normalizedVisibleRanges = normalizeVisibleRanges(view.visibleRanges);
    const newVisibleRanges = options.coarse
      ? trimRangesByLineBudget(doc, normalizedVisibleRanges)
      : normalizedVisibleRanges;
    const requestId = ++this.highlightRequestId;

    if (doc.length === 0 || newVisibleRanges.length === 0) {
      this.decorations = RangeSet.empty;
      return;
    }

    // Store current viewport for comparison after async work
    const requestedRanges = newVisibleRanges.map((r) => ({ ...r }));

    // Schedule highlighting in idle time (doesn't block UI)
    this.pendingHighlight = requestIdleCallback(() => {
      if (requestId !== this.highlightRequestId) {
        this.pendingHighlight = null;
        return;
      }
      // Check if viewport hasn't changed during wait
      const currentRanges = normalizeVisibleRanges(view.visibleRanges);
      const isSameViewport = isSameRanges(requestedRanges, currentRanges);

      if (!isSameViewport) {
        this.pendingHighlight = null;
        // Viewport changed, skip this work (new highlight already scheduled)
        return;
      }

      const entries: DecorationEntry[] = [];

      try {
        // Perform synchronous tokenization (but it's running in idle time)
        for (let { from, to } of newVisibleRanges) {
          this.shikiHighlighter.highlight(doc, from, to, (from, to, mark) => {
            entries.push({ from, to, mark });
          });
          this.lastPos = { from, to };
        }

        this.decorations = buildDecorationsFromEntries(entries);
      } catch (error) {
        console.error('[@cmshiki/editor] highlight failed:', error);
      }

      this.pendingHighlight = null;

      // Trigger re-render with new decoissrations
      // Use a no-op transaction to update the view
      if (requestId === this.highlightRequestId) {
        view.dispatch({});
      }
    });
  }
}

export const shikiViewPlugin = (
  shikiHighlighter: ShikiHighlighter,
  _options: ShikiToCMOptions,
) => {
  return {
    viewPlugin: ViewPlugin.define(
      (view: EditorView) => new ShikiView(shikiHighlighter.setView(view), view),
      {
        decorations: (v) => v.decorations,
      },
    ),
  };
};
