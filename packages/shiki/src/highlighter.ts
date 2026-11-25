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
/**
 * How many leading characters of an over-long line are still tokenized.
 * CodeMirror renders only the visible columns of such a line plus a margin of
 * about 2000 characters, and the grammar state after the head is a far better
 * guess for the following lines than the state before the line: a minified
 * bundle typically closes its license comment at the start of its first long
 * line. Measured in Chrome with the oniguruma engine, dense minified code
 * costs 180 to 260ms per 4000 characters and about 100ms for 2000, which is
 * the one-time hitch accepted per long line.
 */
const LONG_LINE_HEAD_CHARS = 2000;
/**
 * A range starting more than this many lines past the trusted prefix gets a
 * speculative pass first. Below it the exact walk is cheap enough to wait for.
 */
const SPECULATIVE_MIN_GAP = 200;
/** How many lines above a range the speculative pass may start from. */
const SPECULATIVE_LOOKBACK = 40;

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
  /**
   * Absolute `performance.now()` time to stop at. Checked between lines, so a
   * call always makes progress on at least one line. Unfinished work is
   * reported through `nextFrom`.
   */
  deadline?: number;
  /**
   * With a `deadline`, also cap each line's tokenization at the time left and
   * hand back lines that do not finish as unfinished instead of giving up on
   * them. Use this for the synchronous pass inside an editor update; the idle
   * pass that follows gives such lines the full `tokenizeTimeLimit`.
   */
  deferSlowLines?: boolean;
  /**
   * Do not walk down from the trusted prefix; start a few lines above the
   * range from a guessed grammar state instead, the way VS Code tokenizes a
   * viewport it has not reached yet. Results are cached like any other line
   * but never trusted: the exact walk reuses a line only if it arrives with
   * the same start state, and replaces it otherwise.
   */
  speculative?: boolean;
}

export interface HighlightResult {
  produced: number;
  nextFrom: number | null;
  /** Nothing was tokenized: the core, grammar or theme is not ready. */
  skipped?: boolean;
}

/**
 * Cached tokenization of one line.
 *
 * `tokens === null` means the line is rendered as plain text because it is
 * longer than `tokenizeMaxLineLength` or ran past `tokenizeTimeLimit`. With
 * `retry` set the next pass tokenizes it once more; otherwise it stays plain
 * while its text and start state stay the same.
 */
export interface LineCacheEntry {
  text: string;
  startState: GrammarState | null;
  endState: GrammarState | null;
  tokens: ArrayLike<number> | null;
  /** How many leading characters `tokens` cover; shorter than the text for over-long lines. */
  tokenizedLength: number;
  retry: boolean;
}

interface BoundedTokenizeResult {
  tokens: ArrayLike<number> | null;
  ruleStack: GrammarState | null;
  tokenizedLength: number;
  /** Tokenization was cut off by a time limit. */
  timedOut: boolean;
  /** The limit that cut it off came from the caller's deadline, not from `tokenizeTimeLimit`. */
  boundByDeadline: boolean;
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
  view: any = undefined;
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
  /**
   * One Decoration per distinct token style. Before this every highlight pass
   * minted new class names and mounted the same CSS rules again, so a scroll
   * through a big file leaked style modules and allocated one Decoration per
   * token.
   */
  private markCache = new Map<string, Decoration>();
  /** Lines tokenized (not served from cache) so far; lets a deadline measure real work. */
  private freshLines = 0;
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

  /**
   * True once at least one line was tokenized. A cold grammar still has to
   * compile its rules, which can take hundreds of milliseconds; callers use
   * this to keep that cost out of synchronous passes.
   */
  get isWarm(): boolean {
    return this.freshLines > 0;
  }

  /** Lines tokenized so far; lets callers tell whether a pass made progress. */
  get tokenizedLines(): number {
    return this.freshLines;
  }

  /**
   * Highlighter of each editor using this extension. Shared by the
   * highlighter the extension was created with and every one forked from it.
   */
  private owners = new Map<any, ShikiHighlighter>();

  /** The highlighter `view` uses, if it is an editor with this extension. */
  ownerOf(view: any): ShikiHighlighter | undefined {
    return this.owners.get(view);
  }

  /**
   * The highlighter for `view`. Line caches, mark caches and the current
   * theme belong to one editor, so a second editor using the same extension
   * gets its own highlighter that shares the Shiki core and the options.
   */
  forView(view: any): ShikiHighlighter {
    const owner = this.owners.get(view);
    if (owner) return owner;
    let highlighter: ShikiHighlighter = this;
    if (this.view !== undefined) {
      highlighter = new ShikiHighlighter(
        this.shikiCore,
        this.configs,
        this.initShikiFn,
      );
      highlighter.owners = this.owners;
      highlighter.defaultTheme = this.defaultTheme;
      highlighter.currentTheme = this.defaultTheme;
    }
    this.owners.set(view, highlighter);
    return highlighter.setView(view);
  }

  /** Drop `view` and what was cached for it once its editor is destroyed. */
  releaseView(view: any) {
    if (this.view !== view) return;
    this.owners.delete(view);
    this.view = undefined;
    this.currentTheme = this.defaultTheme;
    this.resetLineCache();
    this.markCache.clear();
  }

  setView(view: any) {
    if (view !== this.view) {
      // Classes are mounted on a view's root; a new view needs them mounted again.
      this.markCache.clear();
    }
    this.view = view;
    return this;
  }

  async update(options: any, view: any) {
    // Theme, language or style options changed: nothing cached is valid anymore.
    this.resetLineCache();
    this.markCache.clear();
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
   * Only the first `LONG_LINE_HEAD_CHARS` characters of a line longer than
   * `tokenizeMaxLineLength` are tokenized; the rest is rendered as plain text
   * and the state after the head is passed on. A line whose tokenization runs
   * past `tokenizeTimeLimit` comes back with `tokens: null`, is rendered plain
   * and passes its start state on unchanged, like VS Code does. Without these
   * guards a single minified line of 50K characters blocks the main thread for
   * seconds, because TextMate scanning cost grows faster than linearly with
   * line length.
   */
  private tokenizeLineBounded(
    grammar: any,
    text: string,
    state: GrammarState | null,
    budget: HighlightBudgetOptions,
  ): BoundedTokenizeResult {
    const maxLineLength = Number(this.configs.tokenizeMaxLineLength) || 0;
    let source = text;
    if (maxLineLength > 0 && text.length > maxLineLength) {
      source = text.slice(0, Math.min(maxLineLength, LONG_LINE_HEAD_CHARS));
    }

    const configuredLimit = Number(this.configs.tokenizeTimeLimit) || 0;
    let timeLimit = configuredLimit;
    let boundByDeadline = false;
    if (budget.deferSlowLines && budget.deadline !== undefined) {
      const remaining = Math.max(
        1,
        Math.ceil(budget.deadline - performance.now()),
      );
      if (configuredLimit <= 0 || remaining < configuredLimit) {
        timeLimit = remaining;
        boundByDeadline = true;
      }
    }

    const result = grammar.tokenizeLine2(source, state as any, timeLimit);
    if (result.stoppedEarly) {
      return {
        tokens: null,
        ruleStack: state,
        tokenizedLength: 0,
        timedOut: true,
        boundByDeadline,
      };
    }
    return {
      tokens: result.tokens,
      ruleStack: result.ruleStack ?? null,
      tokenizedLength: source.length,
      timedOut: false,
      boundByDeadline: false,
    };
  }

  /**
   * Tokens and end state for one line: from the cache when text and start
   * state still match, otherwise freshly tokenized. Returns `null` when the
   * line has to be tried again in a later pass: either the caller's deadline
   * cut it off (see `deferSlowLines`), or it ran past `tokenizeTimeLimit` for
   * the first time. One-time costs such as lazy grammar compilation land on
   * that first attempt, so a line only turns plain after timing out twice.
   * Callers walk lines in order from a trusted anchor, which is what lets
   * `validUpTo` advance.
   */
  private resolveLine(
    line: Line,
    state: GrammarState | null,
    grammar: any,
    budget: HighlightBudgetOptions,
    trusted = true,
  ): LineCacheEntry | null {
    const cached = this.lineCache.get(line.number);
    const cachedMatches =
      cached !== undefined &&
      cached.text === line.text &&
      grammarStatesEqual(cached.startState, state);
    let entry: LineCacheEntry;
    if (cachedMatches && !(cached.tokens === null && cached.retry)) {
      entry = cached;
    } else {
      const result = this.tokenizeLineBounded(
        grammar,
        line.text,
        state,
        budget,
      );
      if (result.timedOut && result.boundByDeadline) return null;

      // A timeout against `tokenizeTimeLimit` counts as a strike; the second
      // strike makes the line plain. Deadline cut-offs are not strikes.
      const retry = result.timedOut && !cachedMatches;
      entry = {
        text: line.text,
        startState: state,
        endState: result.ruleStack,
        tokens: result.tokens,
        tokenizedLength: result.tokenizedLength,
        retry,
      };
      this.lineCache.set(line.number, entry);
      if (retry) return null;
      this.freshLines++;
    }
    if (trusted && line.number === this.validUpTo + 1) {
      this.validUpTo = line.number;
    }
    return entry;
  }

  /**
   * Whether an exact pass for the line at `pos` would first have to tokenize
   * many lines above it, e.g. right after a jump or a scrollbar drag into a
   * part of the document nothing has reached yet.
   */
  needsSpeculation(doc: Text, pos: number): boolean {
    const trusted = this.cacheDoc === doc ? this.validUpTo : 0;
    return doc.lineAt(pos).number - trusted > SPECULATIVE_MIN_GAP;
  }

  /**
   * Starting point for a speculative pass: the end state of a cached line
   * just above the range when one still matches its text, otherwise the
   * initial state at the least indented line of the lookback window, which
   * most likely begins a top-level construct.
   */
  private guessStartState(
    doc: Text,
    startLine: number,
  ): { anchorLine: number; state: GrammarState | null } {
    const floor = Math.max(1, startLine - SPECULATIVE_LOOKBACK);
    for (let n = startLine - 1; n >= floor; n--) {
      const cached = this.lineCache.get(n);
      if (cached && cached.text === doc.line(n).text) {
        return { anchorLine: n, state: cached.endState };
      }
    }
    let best = floor;
    let bestIndent = Infinity;
    for (let n = floor; n < startLine; n++) {
      const text = doc.line(n).text;
      const indent = text.length - text.trimStart().length;
      if (indent === text.length) continue;
      if (indent <= bestIndent) {
        bestIndent = indent;
        best = n;
      }
    }
    return { anchorLine: best - 1, state: null };
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
    const { maxDecorations, deadline, speculative = false } = budgetOptions;
    const trusted = !speculative;

    if (this.isCoreUpdating) {
      return { produced, nextFrom, skipped: true };
    }

    if (!this.internal) {
      console.warn('highlight: internal not ready');
      return { produced, nextFrom, skipped: true };
    }

    const langId = getPrimaryRuntimeLangId(this.configs.lang);
    const themeAlias = this.currentTheme;
    const internal = this.internal;

    if (!langId) {
      if (this.configs.warnings) {
        console.warn('highlight: lang is not configured');
      }
      return { produced, nextFrom, skipped: true };
    }

    const validTheme = this.configs.themes[themeAlias];

    // Guard: if validTheme is undefined, skip highlighting
    if (!validTheme) {
      console.warn(
        `highlight: theme '${themeAlias}' not found in themes config`,
      );
      return { produced, nextFrom, skipped: true };
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
      return { produced, nextFrom, skipped: true };
    }
    if (!grammar) {
      if (this.configs.warnings) {
        console.warn(
          `highlight: grammar not found for langId=${String(langId)}`,
        );
      }
      return { produced, nextFrom, skipped: true };
    }
    const themeForeground =
      (internal as any).getTheme?.(finalThemeName)?.fg ||
      this.shikiCore.getTheme(finalThemeName as any).fg ||
      '#000';
    const defaultForeground = colorMap[1] || themeForeground;

    this.adoptDoc(doc);

    const langLabel = getRuntimeLangLabel(this.configs.lang);
    this.view!.dom.classList.toggle(
      'lang-' + langLabel.replace(/[^\w-]/g, '_'),
      true,
    );

    const startLine = doc.lineAt(from).number;
    const endLine = doc.lineAt(to).number;

    // 1. Starting state: the nearest cached line before the range that is
    //    still trusted after any edits, or a guess for a speculative pass.
    let anchorLine: number;
    let state: GrammarState | null;
    if (speculative) {
      ({ anchorLine, state } = this.guessStartState(doc, startLine));
    } else {
      anchorLine = Math.min(startLine - 1, this.validUpTo);
      while (anchorLine >= 1 && !this.lineCache.has(anchorLine)) anchorLine--;
      state = anchorLine >= 1 ? this.lineCache.get(anchorLine)!.endState : null;
    }

    // The deadline is only honoured once at least one line was actually
    // tokenized, so every call makes progress and the caller cannot spin.
    // Cache hits cost microseconds and never count.
    const freshAtStart = this.freshLines;
    const outOfTime = () =>
      deadline !== undefined &&
      this.freshLines > freshAtStart &&
      performance.now() >= deadline;

    let lastProcessedLine = startLine - 1;
    work: {
      // 2. Walk from the anchor up to the range. Cached lines that still
      //    match cost one comparison each; this walk is where an edit above
      //    the viewport converges with the previous tokenization again.
      for (let i = anchorLine + 1; i < startLine; i++) {
        if (outOfTime()) {
          nextFrom = from;
          break work;
        }
        const entry = this.resolveLine(
          doc.line(i),
          state,
          grammar,
          budgetOptions,
          trusted,
        );
        if (entry === null) {
          nextFrom = from;
          break work;
        }
        state = entry.endState;
      }

      // 3. Lines in range: resolve and emit decorations.
      for (let i = startLine; i <= endLine; i++) {
        const line = doc.line(i);
        const overBudget =
          maxDecorations !== undefined &&
          i > startLine &&
          produced >= maxDecorations;
        if (overBudget || outOfTime()) {
          nextFrom = line.from;
          break work;
        }

        const entry = this.resolveLine(
          line,
          state,
          grammar,
          budgetOptions,
          trusted,
        );
        if (entry === null) {
          nextFrom = line.from;
          break work;
        }
        state = entry.endState;
        if (entry.tokens !== null) {
          produced += this.emitLineTokens(
            line,
            entry.tokens,
            entry.tokenizedLength,
            colorMap,
            defaultForeground,
            buildDeco,
            from,
            to,
          );
        }
        lastProcessedLine = i;
      }
    }

    this.pruneLineCache(
      lastProcessedLine >= startLine ? lastProcessedLine : startLine,
    );

    return { produced, nextFrom };
  }

  /**
   * Decoration for a token style such as `color:#f00;font-weight:bold`.
   * In `cm` mode the style is mounted once as a class rule on the view root;
   * in `shiki` mode it is inlined.
   */
  private getMark(style: string): Decoration {
    let mark = this.markCache.get(style);
    if (mark) return mark;

    if (this.isCmStyle) {
      const cls = newStyleModuleName();
      mountStyles(this.view!, {
        [`& .cm-line .${cls}`]: toStyleObject(style, false) || {},
      });
      mark = Decoration.mark({ tagName: 'span', attributes: { class: cls } });
    } else {
      mark = Decoration.mark({ tagName: 'span', attributes: { style } });
    }
    this.markCache.set(style, mark);
    return mark;
  }

  /**
   * Turn one line's binary tokens into decorations, clipped to `[from, to]`.
   * Returns how many were emitted.
   *
   * Clipping matters for long lines: CodeMirror hides the off-screen parts of
   * a line longer than ~4000 characters behind line gaps and reports each
   * visible piece as its own range. Emitting the whole line for every piece
   * would duplicate decorations and break their ordering.
   */
  private emitLineTokens(
    line: Line,
    tokens: ArrayLike<number>,
    tokenizedLength: number,
    colorMap: string[],
    defaultForeground: string,
    buildDeco: (from: number, to: number, mark: Decoration) => void,
    from: number,
    to: number,
  ): number {
    let produced = 0;
    const len = tokens.length / 2;

    // tokens format: [startOffset1, metadata1, startOffset2, metadata2, ...]
    // Each token starts at tokens[2*j] and ends at the next token's start, or
    // at the end of the tokenized text (the whole line unless it is over-long).
    for (let j = 0; j < len; j++) {
      const startOffset = tokens[2 * j];
      const endOffset = j + 1 < len ? tokens[2 * (j + 1)] : tokenizedLength;
      const tokenFrom = Math.max(line.from + startOffset, from);
      const tokenTo = Math.min(line.from + endOffset, to);
      if (tokenFrom >= tokenTo) continue; // empty, or outside the requested range

      const metadata = tokens[2 * j + 1];

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

      buildDeco(tokenFrom, tokenTo, this.getMark(style));
      produced++;
    }

    return produced;
  }
}
