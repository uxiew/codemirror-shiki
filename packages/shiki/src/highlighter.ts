import { Text, type ChangeSet, type Line } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { newStyleModuleName, mountStyles } from '@cmshiki/utils';

import type { GrammarState } from './types/shiki.types';
import type { Highlighter, ShikiToCMOptions, InitShikiFn } from './types/types';
import { toStyleObject } from './utils';
import { Base } from './base';
import { getPrimaryRuntimeLangId, getRuntimeLangLabel } from './lang-normalize';

// Decode vscode-textmate encoded token metadata without importing
// `@shikijs/vscode-textmate` at runtime (avoids bundler resolution issues).
const FONT_STYLE_MASK = 30720;
const FONT_STYLE_OFFSET = 11;
const FOREGROUND_MASK = 16744448;
const FOREGROUND_OFFSET = 15;

function getFontStyle(metadata: number): number {
  return (metadata & FONT_STYLE_MASK) >>> FONT_STYLE_OFFSET;
}

function getForeground(metadata: number): number {
  return (metadata & FOREGROUND_MASK) >>> FOREGROUND_OFFSET;
}

const CACHE_MAX_ENTRIES = 12000;
const CACHE_KEEP_BEHIND_LINES = 3000;
const CACHE_KEEP_AHEAD_LINES = 6000;
const CACHE_ANCHOR_INTERVAL = 200;

export interface CachePruneOptions {
  maxEntries?: number;
  keepBehindLines?: number;
  keepAheadLines?: number;
  anchorInterval?: number;
}

export interface HighlightBudgetOptions {
  /**
   * Stop before starting another line once this many decorations were emitted
   * by this call. A line is never cut in half.
   */
  maxDecorations?: number;
}

export interface HighlightResult {
  produced: number;
  nextFrom: number | null;
}

/**
 * Cached tokenization of one line.
 *
 * `tokens === null` means the line is rendered as plain text because it is
 * longer than `tokenizeMaxLineLength` or ran past `tokenizeTimeLimit`. Such a
 * line is not retried while its text and start state stay the same.
 */
export interface LineCacheEntry {
  text: string;
  startState: GrammarState | null;
  endState: GrammarState | null;
  tokens: ArrayLike<number> | null;
}

interface BoundedTokenizeResult {
  tokens: ArrayLike<number> | null;
  ruleStack: GrammarState | null;
}

/**
 * Compare two grammar states. vscode-textmate stacks implement `equals()`;
 * the document start is `null` on both sides.
 */
export function grammarStatesEqual(
  a: GrammarState | null | undefined,
  b: GrammarState | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const equals = (a as any).equals;
  return typeof equals === 'function' ? Boolean(equals.call(a, b)) : false;
}

/**
 * Move cached lines through a document change.
 *
 * Lines the change touched are dropped and lines after it are renumbered, so
 * their entries can be reused once the walk from the edit reaches them.
 * Returns the first line number (in the new document) whose cached state can
 * no longer be trusted as a starting point. Lines before it are untouched.
 */
export function remapLineCache<T>(
  cache: Map<number, T>,
  oldDoc: Text,
  newDoc: Text,
  changes: ChangeSet,
): number {
  const spans: { oldStart: number; oldEnd: number; delta: number }[] = [];
  let firstDirty = newDoc.lines + 1;
  changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    const oldStart = oldDoc.lineAt(fromA).number;
    const oldEnd = oldDoc.lineAt(toA).number;
    const newStart = newDoc.lineAt(fromB).number;
    const newEnd = newDoc.lineAt(toB).number;
    firstDirty = Math.min(firstDirty, newStart);
    spans.push({
      oldStart,
      oldEnd,
      delta: newEnd - newStart - (oldEnd - oldStart),
    });
  });
  if (spans.length === 0 || cache.size === 0) return firstDirty;

  const lines = Array.from(cache.keys()).sort((a, b) => a - b);
  const moved: [number, T][] = [];
  let spanIndex = 0;
  let delta = 0;
  for (const line of lines) {
    while (spanIndex < spans.length && spans[spanIndex].oldEnd < line) {
      delta += spans[spanIndex].delta;
      spanIndex++;
    }
    if (spanIndex < spans.length && spans[spanIndex].oldStart <= line) {
      continue; // the change touched this line, its text is stale
    }
    moved.push([line + delta, cache.get(line)!]);
  }
  cache.clear();
  for (const [line, entry] of moved) cache.set(line, entry);
  return firstDirty;
}

/**
 * Compute which cached line states should be removed to bound memory growth.
 * Keeps a dense window around the current viewport and sparse anchor states elsewhere.
 */
export function computePrunableCacheLines(
  lines: number[],
  centerLine: number,
  options: CachePruneOptions = {},
): number[] {
  const maxEntries = options.maxEntries ?? CACHE_MAX_ENTRIES;
  const keepBehindLines = options.keepBehindLines ?? CACHE_KEEP_BEHIND_LINES;
  const keepAheadLines = options.keepAheadLines ?? CACHE_KEEP_AHEAD_LINES;
  const anchorInterval = options.anchorInterval ?? CACHE_ANCHOR_INTERVAL;

  if (lines.length <= maxEntries) return [];

  const keepStart = Math.max(1, centerLine - keepBehindLines);
  const keepEnd = centerLine + keepAheadLines;

  const mustKeep: number[] = [];
  const removable: number[] = [];

  for (const line of lines) {
    const inWindow = line >= keepStart && line <= keepEnd;
    const isAnchor = line % anchorInterval === 0;

    if (inWindow || isAnchor) {
      mustKeep.push(line);
    } else {
      removable.push(line);
    }
  }

  if (mustKeep.length <= maxEntries) {
    return removable;
  }

  const over = mustKeep.length - maxEntries;
  const fallbackRemovals = [...mustKeep]
    .sort(
      (a, b) => Math.abs(b - centerLine) - Math.abs(a - centerLine) || b - a,
    )
    .slice(0, over);

  return removable.concat(fallbackRemovals);
}

export class ShikiHighlighter extends Base {
  view!: any;
  /** Tokenization results per 1-based line number of `cacheDoc`. */
  private lineCache = new Map<number, LineCacheEntry>();
  /**
   * Every cached line up to this number is known to agree with `cacheDoc`.
   * Lines after it may be stale after an edit and are only reused once the
   * forward walk has re-validated them (same text, same start state).
   */
  private validUpTo = 0;
  /** The document the cache describes. Highlighting another document resets it. */
  private cacheDoc: Text | null = null;
  private internal: Highlighter;
  private isCoreUpdating = false;

  constructor(
    shikiCore: Highlighter,
    options: ShikiToCMOptions,
    initShikiFn?: InitShikiFn,
  ) {
    super(shikiCore, options, initShikiFn);
    this.internal = shikiCore;
  }

  setView(view: any) {
    this.view = view;
    return this;
  }

  async update(options: any, view: any) {
    // Theme, language or style options changed: nothing cached is valid anymore.
    this.resetLineCache();
    this.isCoreUpdating = true;
    try {
      // Update internal shiki instance access
      await super.update(options, view);
      this.internal = this.shikiCore;
    } finally {
      this.isCoreUpdating = false;
    }
  }

  /** Forget everything cached about the document. */
  resetLineCache() {
    this.lineCache.clear();
    this.validUpTo = 0;
    this.cacheDoc = null;
  }

  /**
   * Keep the line cache aligned with a document change.
   *
   * The view plugin calls this for every `docChanged` update before it
   * highlights again. Without it every cached line number would be off by the
   * number of inserted or deleted lines and nothing after the edit could be
   * reused.
   */
  applyDocChanges(oldDoc: Text, newDoc: Text, changes: ChangeSet) {
    if (this.cacheDoc === null) {
      this.cacheDoc = newDoc;
      return;
    }
    if (this.cacheDoc !== oldDoc && !this.cacheDoc.eq(oldDoc)) {
      // The cache describes some other document; start over.
      this.resetLineCache();
      this.cacheDoc = newDoc;
      return;
    }
    const firstDirty = remapLineCache(this.lineCache, oldDoc, newDoc, changes);
    this.validUpTo = Math.min(this.validUpTo, firstDirty - 1);
    this.cacheDoc = newDoc;
  }

  private adoptDoc(doc: Text) {
    if (this.cacheDoc === doc) return;
    if (this.cacheDoc !== null && !this.cacheDoc.eq(doc)) {
      this.lineCache.clear();
      this.validUpTo = 0;
    }
    this.cacheDoc = doc;
  }

  /**
   * Tokenize one line, or give up on it.
   *
   * A line longer than `tokenizeMaxLineLength`, or one whose tokenization runs
   * past `tokenizeTimeLimit`, comes back with `tokens: null` and is rendered as
   * plain text. The grammar state is carried through unchanged, which is what
   * VS Code does for such lines too. Without this guard a single minified line
   * of 50K characters blocks the main thread for seconds, because TextMate
   * scanning cost grows faster than linearly with line length.
   */
  private tokenizeLineBounded(
    grammar: any,
    text: string,
    state: GrammarState | null,
  ): BoundedTokenizeResult {
    const maxLineLength = Number(this.configs.tokenizeMaxLineLength) || 0;
    if (maxLineLength > 0 && text.length > maxLineLength) {
      return { tokens: null, ruleStack: state };
    }

    const timeLimit = Number(this.configs.tokenizeTimeLimit) || 0;
    const result = grammar.tokenizeLine2(text, state as any, timeLimit);
    if (result.stoppedEarly) {
      return { tokens: null, ruleStack: state };
    }
    return { tokens: result.tokens, ruleStack: result.ruleStack ?? null };
  }

  /**
   * Tokens and end state for one line: from the cache when text and start
   * state still match, otherwise freshly tokenized. Callers walk lines in
   * order from a trusted anchor, which is what lets `validUpTo` advance.
   */
  private resolveLine(
    line: Line,
    state: GrammarState | null,
    grammar: any,
  ): LineCacheEntry {
    const cached = this.lineCache.get(line.number);
    let entry: LineCacheEntry;
    if (
      cached &&
      cached.text === line.text &&
      grammarStatesEqual(cached.startState, state)
    ) {
      entry = cached;
    } else {
      const result = this.tokenizeLineBounded(grammar, line.text, state);
      entry = {
        text: line.text,
        startState: state,
        endState: result.ruleStack,
        tokens: result.tokens,
      };
      this.lineCache.set(line.number, entry);
    }
    if (line.number === this.validUpTo + 1) this.validUpTo = line.number;
    return entry;
  }

  private pruneLineCache(centerLine: number) {
    const lines = Array.from(this.lineCache.keys());
    const toDelete = computePrunableCacheLines(lines, centerLine);

    for (const line of toDelete) {
      this.lineCache.delete(line);
    }
  }

  /**
   * add highlighting to text
   *
   * @param doc content text
   * @param from text start
   * @param to text end
   * @returns `{ decorations }` an object that contains decorative information
   */
  highlight(
    doc: Text,
    from: number,
    to: number,
    buildDeco: (from: number, to: number, mark: Decoration) => void,
    budgetOptions: HighlightBudgetOptions = {},
  ): HighlightResult {
    let produced = 0;
    let nextFrom: number | null = null;
    const maxDecorations = budgetOptions.maxDecorations;

    if (this.isCoreUpdating) {
      return { produced, nextFrom };
    }

    if (!this.internal) {
      console.warn('highlight: internal not ready');
      return { produced, nextFrom };
    }

    const langId = getPrimaryRuntimeLangId(this.configs.lang);
    const themeAlias = this.currentTheme;
    const internal = this.internal;

    if (!langId) {
      if (this.configs.warnings) {
        console.warn('highlight: lang is not configured');
      }
      return { produced, nextFrom };
    }

    const validTheme = this.configs.themes[themeAlias];

    // Guard: if validTheme is undefined, skip highlighting
    if (!validTheme) {
      console.warn(
        `highlight: theme '${themeAlias}' not found in themes config`,
      );
      return { produced, nextFrom };
    }

    // Resolve theme name (handle string vs object)
    let finalThemeName: string;
    if (typeof validTheme === 'string') {
      finalThemeName = validTheme;
    } else {
      finalThemeName = (validTheme as any).name;
    }

    // Ensure the correct theme is active before resolving grammar/tokenization.
    // Some engines cache grammar state/theme data internally. If getLanguage() is
    // called before setTheme(), first-frame metadata can mismatch the color map.
    // Cast to any because setTheme might not be in the public interface definition but exists at runtime
    const { colorMap } = (internal as any).setTheme(finalThemeName);
    let grammar: any;
    try {
      grammar = internal.getLanguage(langId);
    } catch (error) {
      if (this.configs.warnings) {
        console.warn(
          `highlight: lang '${String(langId)}' is not ready yet, skip this frame`,
          error,
        );
      }
      return { produced, nextFrom };
    }
    if (!grammar) {
      if (this.configs.warnings) {
        console.warn(
          `highlight: grammar not found for langId=${String(langId)}`,
        );
      }
      return { produced, nextFrom };
    }
    const themeForeground =
      (internal as any).getTheme?.(finalThemeName)?.fg ||
      this.shikiCore.getTheme(finalThemeName as any).fg ||
      '#000';
    const defaultForeground = colorMap[1] || themeForeground;

    this.adoptDoc(doc);

    const startLine = doc.lineAt(from).number;
    const endLine = doc.lineAt(to).number;

    // 1. Starting state: the nearest cached line before the range that is
    //    still trusted after any edits.
    let anchorLine = Math.min(startLine - 1, this.validUpTo);
    while (anchorLine >= 1 && !this.lineCache.has(anchorLine)) anchorLine--;
    let state: GrammarState | null =
      anchorLine >= 1 ? this.lineCache.get(anchorLine)!.endState : null;

    // 2. Walk from the anchor up to the range. Cached lines that still match
    //    cost one comparison each; this walk is where an edit above the
    //    viewport converges with the previous tokenization again.
    for (let i = anchorLine + 1; i < startLine; i++) {
      state = this.resolveLine(doc.line(i), state, grammar).endState;
    }

    // 3. Lines in range: resolve and emit decorations.
    const cmClasses: Record<string, string> = {};
    const langLabel = getRuntimeLangLabel(this.configs.lang);
    this.view!.dom.classList.toggle(
      'lang-' + langLabel.replace(/[^\w-]/g, '_'),
      true,
    );

    let lastProcessedLine = startLine - 1;
    for (let i = startLine; i <= endLine; i++) {
      if (
        maxDecorations !== undefined &&
        i > startLine &&
        produced >= maxDecorations
      ) {
        nextFrom = doc.line(i).from;
        break;
      }

      const line = doc.line(i);
      const entry = this.resolveLine(line, state, grammar);
      state = entry.endState;
      if (entry.tokens !== null) {
        produced += this.emitLineTokens(
          line,
          entry.tokens,
          colorMap,
          defaultForeground,
          cmClasses,
          buildDeco,
        );
      }
      lastProcessedLine = i;
    }

    this.pruneLineCache(
      lastProcessedLine >= startLine ? lastProcessedLine : startLine,
    );

    if (this.isCmStyle) {
      Object.entries(cmClasses).forEach(([k, v]) => {
        mountStyles(this.view!, {
          // Pass important=true to match the !important rules from createTheme
          [`& .cm-line .${v}`]: toStyleObject(k, false) || {},
        });
      });
    }

    return { produced, nextFrom };
  }

  /** Turn one line's binary tokens into decorations. Returns how many were emitted. */
  private emitLineTokens(
    line: Line,
    tokens: ArrayLike<number>,
    colorMap: string[],
    defaultForeground: string,
    cmClasses: Record<string, string>,
    buildDeco: (from: number, to: number, mark: Decoration) => void,
  ): number {
    let produced = 0;
    const len = tokens.length / 2;

    // tokens format: [startOffset1, metadata1, startOffset2, metadata2, ...]
    // Each token starts at tokens[2*j] and ends at the next token's start (or line end)
    for (let j = 0; j < len; j++) {
      const startOffset = tokens[2 * j];
      const metadata = tokens[2 * j + 1];
      const endOffset = j + 1 < len ? tokens[2 * (j + 1)] : line.length;

      const foregroundId = getForeground(metadata);
      const fontStyle = getFontStyle(metadata);

      // colorMap[0] is reserved/empty, colorMap[1] is default foreground.
      // If a token does not resolve to a specific color, fall back to the
      // theme foreground to avoid alias strings (e.g. "dark") as CSS colors.
      const color = colorMap[foregroundId] || defaultForeground;

      let style = `color:${color}`;
      // FontStyle enum: None=0, Italic=1, Bold=2, Underline=4
      if (fontStyle & 1) style += ';font-style:italic';
      if (fontStyle & 2) style += ';font-weight:bold';
      if (fontStyle & 4) style += ';text-decoration:underline';

      // dedupe and cache the style
      const cls = cmClasses[style] || newStyleModuleName();
      cmClasses[style] = cls;

      const tokenFrom = line.from + startOffset;
      const tokenTo = line.from + endOffset;

      if (tokenFrom < tokenTo) {
        // Only nonempty tokens
        buildDeco(
          tokenFrom,
          tokenTo,
          Decoration.mark({
            tagName: 'span',
            attributes: {
              class: (this.isCmStyle ? cls : undefined) as any,
              style: (this.isCmStyle ? undefined : style) as any,
            },
          }),
        );
        produced++;
      }
    }

    return produced;
  }
}
