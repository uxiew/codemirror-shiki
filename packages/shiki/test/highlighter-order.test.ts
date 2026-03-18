import { describe, expect, it, vi } from 'vitest';
import { Text } from '@codemirror/state';
import { ShikiHighlighter } from '../src/highlighter';

describe('ShikiHighlighter: theme apply order', () => {
  it('should call setTheme before getLanguage on first highlight', () => {
    const calls: string[] = [];

    const grammar = {
      tokenizeLine2: () => ({
        tokens: [0, 0],
        ruleStack: null,
      }),
    };

    const shikiCore = {
      setTheme: vi.fn(() => {
        calls.push('setTheme');
        return { colorMap: ['', '#c9d1d9'] };
      }),
      getLanguage: vi.fn(() => {
        calls.push('getLanguage');
        return grammar;
      }),
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

    const doc = Text.of(['const answer = 42;']);
    highlighter.highlight(doc, 0, doc.length, () => {});

    expect(calls.slice(0, 2)).toEqual(['setTheme', 'getLanguage']);
  });
});
