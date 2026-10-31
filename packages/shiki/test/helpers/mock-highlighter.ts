import { vi } from 'vitest';

import { ShikiHighlighter } from '../../src/highlighter';

export interface MockState {
  id: string;
  equals: (other: MockState | null) => boolean;
}

export function mockState(id: string): MockState {
  return {
    id,
    equals(other) {
      return !!other && other.id === id;
    },
  };
}

/** One token per line, state id = line text, so tests can follow the state chain. */
export function simpleTokenizer(text: string, _state: any) {
  return {
    tokens: [0, 2 << 15],
    ruleStack: mockState(text),
    stoppedEarly: false,
  };
}

export function createMockHighlighter(
  tokenizeLine2: (text: string, state: any, timeLimit?: number) => any,
  options: Record<string, unknown> = {},
) {
  const grammar = { tokenizeLine2: vi.fn(tokenizeLine2) };
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
    themes: { dark: 'github-dark' },
    defaultColor: 'dark',
    themeStyle: 'shiki',
    cssVariablePrefix: '--cm-',
    includeExplanation: false,
    tokenizeMaxLineLength: 20000,
    tokenizeTimeLimit: 500,
    warnings: false,
    ...options,
  } as any);

  highlighter.initTheme();
  highlighter.setView({
    dom: { classList: { toggle: vi.fn() } },
  } as any);

  /** Texts passed to tokenizeLine2 since the last call of this helper. */
  let seen = 0;
  const tokenizedSince = () => {
    const texts = grammar.tokenizeLine2.mock.calls.slice(seen).map((c) => c[0]);
    seen = grammar.tokenizeLine2.mock.calls.length;
    return texts;
  };

  return { highlighter, grammar, tokenizedSince };
}
