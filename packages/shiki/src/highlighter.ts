import { Text } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { type GrammarState } from '@shikijs/core';
import { createStyleModuleName, mountStyles } from '@cmshiki/utils';

import type { Highlighter, ShikiToCMOptions } from './types/types';
import { toStyleObject } from './utils';
import { Base, type InitShikiFn } from './base';
import {
  getPrimaryRuntimeLang,
  getRuntimeLangLabel,
} from './language-normalize';

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
  maxDecorations?: number;
}

export interface HighlightResult {
  produced: number;
  nextFrom: number | null;
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
  // Cache grammar state for every line to enable incremental parsing
  private grammarStateCache = new Map<number, GrammarState>();
  private lastCachedLine = 0;
  private internal: any = null; // Use any to avoid complex ShikiInternal type issues
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
    // Clear cache when options/theme/language changes
    this.grammarStateCache.clear();
    this.lastCachedLine = 0;
    this.isCoreUpdating = true;
    try {
      // Update internal shiki instance access
      await super.update(options, view);
      this.internal = this.shikiCore;
    } finally {
      this.isCoreUpdating = false;
    }
  }

  private pruneGrammarStateCache(centerLine: number) {
    const lines = Array.from(this.grammarStateCache.keys());
    const toDelete = computePrunableCacheLines(lines, centerLine);

    for (const line of toDelete) {
      this.grammarStateCache.delete(line);
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

    const lang = getPrimaryRuntimeLang(this.configs.lang);
    const themeAlias = this.currentTheme;
    const internal = this.internal;

    if (!lang) {
      if (this.configs.warnings) {
        console.warn('highlight: language is not configured');
      }
      return { produced, nextFrom };
    }

    // Debug
    // console.log(`highlight: lang=${lang} themeAlias=${themeAlias}`)

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
      grammar = internal.getLanguage(lang);
    } catch (error) {
      if (this.configs.warnings) {
        console.warn(
          `highlight: language '${String(lang)}' is not ready yet, skip this frame`,
          error,
        );
      }
      return { produced, nextFrom };
    }
    if (!grammar) {
      if (this.configs.warnings) {
        console.warn(`highlight: grammar not found for lang=${String(lang)}`);
      }
      return { produced, nextFrom };
    }
    const themeForeground =
      (internal as any).getTheme?.(finalThemeName)?.fg ||
      this.shikiCore.getTheme(finalThemeName as any).fg ||
      '#000';
    const defaultForeground = colorMap[1] || themeForeground;

    if (!grammar) return { produced, nextFrom };

    // 1. Identify line ranges
    const startLine = doc.lineAt(from).number;
    const endLine = doc.lineAt(to).number;

    // 2. Bridge gap if necessary (tokenize previous lines to restore state)
    // Find the nearest cached state before startLine
    let stateLine = startLine - 1;
    let state: GrammarState | undefined = undefined;

    if (stateLine >= 1) {
      if (this.grammarStateCache.has(stateLine)) {
        state = this.grammarStateCache.get(stateLine);
      } else {
        // Fallback: look backwards
        let nearest = 0;
        for (let i = stateLine; i >= 1; i--) {
          if (this.grammarStateCache.has(i)) {
            nearest = i;
            state = this.grammarStateCache.get(i);
            break;
          }
        }

        // If gap exists, bridge it
        if (nearest < stateLine) {
          // Tokenize from nearest+1 to stateLine
          let bridgeState = state; // Start from nearest state (or undefined if nearest=0)
          for (let i = nearest + 1; i <= stateLine; i++) {
            const lineContent = doc.line(i).text;
            // Use tokenizeLine2 (v2) which handles colors internally
            const result = grammar.tokenizeLine2(
              lineContent,
              bridgeState as any,
            );
            bridgeState = result.ruleStack;
            this.grammarStateCache.set(i, bridgeState!);
          }
          state = bridgeState;
        }
      }
    }

    // 3. Tokenize visible lines and emit decorations
    let cmClasses: Record<string, string> = {};
    this.view!.dom.classList.toggle(
      'lang-' + getRuntimeLangLabel(lang).replace(/[^\w-]/g, '_'),
      true,
    );

    let currentState = state;
    let lastProcessedLine = startLine - 1;

    for (let i = startLine; i <= endLine; i++) {
      if (maxDecorations !== undefined && produced >= maxDecorations) {
        nextFrom = doc.line(i).from;
        break;
      }

      const line = doc.line(i);
      const lineContent = line.text;
      // Use tokenizeLine2 for performance and correct ID mapping
      const result = grammar.tokenizeLine2(lineContent, currentState as any);

      // Update cache for next lines
      currentState = result.ruleStack;
      this.grammarStateCache.set(i, currentState!);
      this.lastCachedLine = Math.max(this.lastCachedLine, i);

      const tokens = result.tokens;
      const len = tokens.length / 2;

      let pos = line.from;
      // tokens format: [startOffset1, metadata1, startOffset2, metadata2, ...]
      // Each token starts at tokens[2*j] and ends at the next token's start (or line end)

      for (let j = 0; j < len; j++) {
        const startOffset = tokens[2 * j];
        const metadata = tokens[2 * j + 1];
        // Next token start or line end
        const endOffset = j + 1 < len ? tokens[2 * (j + 1)] : line.text.length;

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
        const cls = cmClasses[style] || createStyleModuleName();
        cmClasses[style] = cls;

        // convert to CodeMirror decoration
        const tokenFrom = pos + startOffset;
        const tokenTo = pos + endOffset;

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

      lastProcessedLine = i;

      if (maxDecorations !== undefined && produced >= maxDecorations) {
        if (i < endLine) {
          nextFrom = doc.line(i + 1).from;
        }
        break;
      }
    }

    const pruneCenterLine =
      lastProcessedLine >= startLine ? lastProcessedLine : startLine;
    this.pruneGrammarStateCache(pruneCenterLine);

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
}
