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

import type { Options, ShikiToCMOptions } from './types/types';
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
/** How long one idle chunk may hold the main thread before yielding. */
const CHUNK_TIME_BUDGET_MS = 12;
/**
 * Budget for the pass that runs synchronously inside an editor update, so
 * typing and scrolling stay styled without a flash when the work is cheap.
 * Cached lines cost microseconds; anything slower is finished in idle chunks.
 */
const SYNC_PASS_BUDGET_MS = 6;
/**
 * Soft cap on decorations per chunk. Checked between lines, so a line is
 * never cut in half; a single line can exceed it by its own token count.
 */
const MAX_DECORATIONS_PER_CHUNK = 20000;

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
  alreadySorted = false,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const sorted = alreadySorted
    ? entries.filter((e) => e.to > e.from)
    : sortDecorationEntries(entries);

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

export function sortDecorationEntries(
  entries: DecorationEntry[],
): DecorationEntry[] {
  return entries
    .filter((e) => e.to > e.from)
    .sort((a, b) => a.from - b.from || a.to - b.to);
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

interface HighlightOptions {
  /** Only style a bounded number of lines; used while the user scrolls fast. */
  coarse?: boolean;
  /**
   * Run the first chunk right now, inside the current update, with a small
   * budget. Whatever is left continues in idle callbacks. Ignored while the
   * grammar is cold, so compiling it never blocks editor creation.
   */
  sync?: boolean;
}

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
    // With a warm grammar this styles the first frame right away.
    this.updateHighlight(view, { sync: true });
  }

  destroy() {
    this.cancelPendingHighlight();
    this.cancelPendingViewportSettle();
    this.clearDecorations();
  }

  update(update: ViewUpdate) {
    let hasUpdateEffect = false;
    for (const tr of update.transactions) {
      for (const effect of tr.effects) {
        if (effect.is(updateEffect)) {
          hasUpdateEffect = true;
          this.shikiHighlighter
            .update(effect.value, update.view)
            .then(() => this.updateHighlight(update.view));
        }
      }
    }

    if (update.docChanged) {
      // Keep existing decorations aligned immediately with document edits.
      this.decorations = this.decorations.map(update.changes);
      // Keep cached line tokens aligned too, so only lines from the edit on
      // are re-tokenized.
      this.shikiHighlighter.applyDocChanges(
        update.startState.doc,
        update.state.doc,
        update.changes,
      );
      // If we have an updateEffect, the .then() above will handle the full re-highlight.
      if (!hasUpdateEffect) {
        this.updateHighlight(update.view, { sync: true });
      }
    } else if (update.viewportChanged) {
      this.handleViewportChanged(update.view);
    } else if (update.transactions.some((tr) => tr.reconfigured)) {
      this.updateHighlight(update.view, { sync: true });
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
    this.cancelPendingViewportSettle();

    if (!shouldDefer) {
      this.updateHighlight(view, { sync: true });
      return;
    }

    // Scrolling fast: style a bounded slice now, the rest once it settles.
    this.updateHighlight(view, { coarse: true });
    this.pendingViewportSettle = setTimeout(() => {
      this.pendingViewportSettle = null;
      this.updateHighlight(view);
    }, RAPID_SCROLL_SETTLE_MS);
  }

  /**
   * Highlight the visible ranges in time-budgeted chunks.
   *
   * Each chunk hands the highlighter a deadline; it stops between lines and
   * reports where to continue. Ranges no chunk has reached yet keep their
   * previous decorations, so a slow line never flashes to plain text while
   * its tokens are being computed.
   */
  updateHighlight(view: EditorView, options: HighlightOptions = {}) {
    // Cancel any pending work from previous scroll
    this.cancelPendingHighlight();

    const doc = view.state.doc;
    const visibleRanges = normalizeVisibleRanges(view.visibleRanges);
    const ranges = options.coarse
      ? trimRangesByLineBudget(doc, visibleRanges)
      : visibleRanges;
    const startSync = !!options.sync && this.shikiHighlighter.isWarm;
    const requestId = ++this.highlightRequestId;

    if (doc.length === 0 || ranges.length === 0) {
      this.decorations = RangeSet.empty;
      return;
    }

    // Store current viewport for comparison after async work
    const requestedRanges = ranges.map((r) => ({ ...r }));
    const pendingRanges = ranges.slice();
    const entries: DecorationEntry[] = [];

    const runChunk = (budgetMs: number, sync: boolean) => {
      if (requestId !== this.highlightRequestId) {
        this.pendingHighlight = null;
        return;
      }
      if (
        !sync &&
        !isSameRanges(requestedRanges, normalizeVisibleRanges(view.visibleRanges))
      ) {
        // Viewport moved on; its own update has scheduled a new highlight.
        this.pendingHighlight = null;
        return;
      }

      const deadline = performance.now() + budgetMs;
      let producedThisChunk = 0;
      try {
        while (pendingRanges.length > 0) {
          if (producedThisChunk >= MAX_DECORATIONS_PER_CHUNK) break;
          if (producedThisChunk > 0 && performance.now() >= deadline) break;

          const current = pendingRanges[0];
          const result = this.shikiHighlighter.highlight(
            doc,
            current.from,
            current.to,
            (from, to, mark) => {
              entries.push({ from, to, mark });
            },
            {
              maxDecorations: MAX_DECORATIONS_PER_CHUNK - producedThisChunk,
              deadline,
              deferSlowLines: sync,
            },
          );
          producedThisChunk += result.produced;
          this.lastPos = { from: current.from, to: current.to };

          if (result.nextFrom !== null && result.nextFrom < current.to) {
            // Out of budget inside this range; continue from here next time.
            pendingRanges[0] = { from: result.nextFrom, to: current.to };
            break;
          }
          pendingRanges.shift();
        }
      } catch (error) {
        console.error('[@cmshiki/editor] highlight failed:', error);
        // Do not retry forever on a broken grammar.
        pendingRanges.length = 0;
      }

      if (requestId !== this.highlightRequestId) return;
      this.decorations = this.mergeWithUnfinished(entries, pendingRanges, doc);
      this.pendingHighlight = null;

      // Inside an update CodeMirror reads the new decorations itself.
      if (!sync) view.dispatch({});

      if (pendingRanges.length > 0) {
        this.pendingHighlight = requestIdleCallback(() =>
          runChunk(CHUNK_TIME_BUDGET_MS, false),
        );
      }
    };

    if (startSync) {
      runChunk(SYNC_PASS_BUDGET_MS, true);
    } else {
      this.pendingHighlight = requestIdleCallback(() =>
        runChunk(CHUNK_TIME_BUDGET_MS, false),
      );
    }
  }

  /**
   * Decorations built so far, plus the previous decorations of everything
   * from the first unfinished range onwards.
   */
  private mergeWithUnfinished(
    entries: DecorationEntry[],
    pendingRanges: SimpleRange[],
    doc: Text,
  ): DecorationSet {
    if (pendingRanges.length === 0) {
      return buildDecorationsFromEntries(entries, true);
    }
    const tailStart = pendingRanges[0].from;
    const merged = entries.slice();
    this.decorations.between(tailStart, doc.length, (from, to, mark) => {
      if (from >= tailStart) merged.push({ from, to, mark });
    });
    return buildDecorationsFromEntries(merged, true);
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
