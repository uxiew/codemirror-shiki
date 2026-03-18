import { Text } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { type GrammarState } from '@shikijs/core';
import { EncodedTokenMetadata } from '@shikijs/vscode-textmate';
import { mountStyles, StyleModule } from '@cmshiki/utils';

import type { Highlighter, ShikiToCMOptions } from './types/types';
import { toStyleObject } from './utils';
import { Base } from './base';

// StackElementMetadata provides getForeground and getFontStyle methods
// for correctly decoding token metadata in Shiki 1.x

export class ShikiHighlighter extends Base {
  view!: any;
  // Cache grammar state for every line to enable incremental parsing
  private grammarStateCache = new Map<number, GrammarState>();
  private lastCachedLine = 0;
  private internal: any = null; // Use any to avoid complex ShikiInternal type issues

  constructor(shikiCore: Highlighter, options: ShikiToCMOptions) {
    super(shikiCore, options);
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
    // Update internal shiki instance access
    await super.update(options, view);
    this.internal = this.shikiCore;
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
  ) {
    if (!this.internal) {
      console.warn('highlight: internal not ready');
      return;
    }

    const lang = this.configs.lang;
    const themeAlias = this.currentTheme;
    const internal = this.internal;

    // Debug
    // console.log(`highlight: lang=${lang} themeAlias=${themeAlias}`)

    const validTheme = this.configs.themes[themeAlias];

    // Guard: if validTheme is undefined, skip highlighting
    if (!validTheme) {
      console.warn(
        `highlight: theme '${themeAlias}' not found in themes config`,
      );
      return;
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
    const grammar = internal.getLanguage(lang);
    if (!grammar) {
      console.error(`highlight: grammar not found for lang=${lang}`);
      return;
    }
    const themeForeground =
      (internal as any).getTheme?.(finalThemeName)?.fg ||
      this.shikiCore.getTheme(finalThemeName as any).fg ||
      '#000';
    const defaultForeground = colorMap[1] || themeForeground;

    if (!grammar) return;

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
    this.view!.dom.classList.toggle('lang-' + this.configs.lang, true);

    let currentState = state;

    for (let i = startLine; i <= endLine; i++) {
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

        // Use EncodedTokenMetadata API for correct foreground and font style extraction (Shiki 3.x)
        const foregroundId = EncodedTokenMetadata.getForeground(metadata);
        const fontStyle = EncodedTokenMetadata.getFontStyle(metadata);

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
        const cls = cmClasses[style] || StyleModule.newName();
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
        }
      }
    }

    if (this.isCmStyle) {
      Object.entries(cmClasses).forEach(([k, v]) => {
        mountStyles(this.view!, {
          // Pass important=true to match the !important rules from createTheme
          [`& .cm-line .${v}`]: toStyleObject(k, false) || {},
        });
      });
    }
  }
}
