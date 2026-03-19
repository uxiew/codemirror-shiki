import { describe, expect, it, vi } from 'vitest';
import { Text } from '@codemirror/state';

import { ShikiHighlighter } from '../src/highlighter';

describe('ShikiHighlighter: budgeted highlight', () => {
  it('should stop at line boundary when decoration budget is reached', () => {
    const grammar = {
      tokenizeLine2: () => ({
        // 3 tokens per line
        tokens: [0, 1, 2, 1, 4, 1],
        ruleStack: null,
      }),
    };

    const shikiCore = {
      setTheme: vi.fn(() => ({ colorMap: ['', '#c9d1d9', '#ff0000'] })),
      getLanguage: vi.fn(() => grammar),
      getTheme: vi.fn(() => ({
        colors: {},
        bg: '#0d1117',
        fg: '#c9d1d9',
        type: 'dark',
      })),
    };

    const highlighter = new ShikiHighlighter(shikiCore as any, {
      lang: 'javascript',
      themes: { dark: 'github-dark', light: 'github-light' },
      defaultColor: 'dark',
      themeStyle: 'shiki',
      cssVariablePrefix: '--cm-',
      includeExplanation: false,
      tokenizeMaxLineLength: 20000,
      tokenizeTimeLimit: 500,
      warnings: true,
    } as any);

    highlighter.initTheme();
    highlighter.setView({
      dom: {
        classList: {
          toggle: vi.fn(),
        },
      },
    } as any);

    const doc = Text.of(['line1-tokenized', 'line2-tokenized', 'line3-tokenized']);
    let tokenCount = 0;
    const result = highlighter.highlight(
      doc,
      0,
      doc.length,
      () => {
        tokenCount++;
      },
      { maxDecorations: 3 },
    );

    expect(tokenCount).toBe(3);
    expect(result.produced).toBe(3);
    expect(result.nextFrom).toBe(doc.line(2).from);
  });
});
