import { describe, expect, it, vi } from 'vitest';
import { Text } from '@codemirror/state';

import { ShikiHighlighter } from '../src/highlighter';

describe('ShikiHighlighter: language guard', () => {
  it('should not throw when language is not ready', () => {
    const shikiCore = {
      setTheme: vi.fn(() => ({ colorMap: ['', '#c9d1d9'] })),
      getLanguage: vi.fn(() => {
        throw new Error('ShikiError: Language `dart` not found');
      }),
      getTheme: vi.fn(() => ({
        colors: {},
        bg: '#0d1117',
        fg: '#c9d1d9',
        type: 'dark',
      })),
    };

    const highlighter = new ShikiHighlighter(shikiCore as any, {
      lang: 'dart',
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

    const doc = Text.of(['void main() {}']);
    expect(() => {
      highlighter.highlight(doc, 0, doc.length, () => {});
    }).not.toThrow();
  });
});
