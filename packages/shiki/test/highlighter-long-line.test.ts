import { describe, expect, it } from 'vitest';
import { Text } from '@codemirror/state';

import { createMockHighlighter, simpleTokenizer } from './helpers/mock-highlighter';

describe('ShikiHighlighter: long line protection', () => {
  it('leaves lines over tokenizeMaxLineLength plain and carries the state through', () => {
    const { highlighter, grammar } = createMockHighlighter(simpleTokenizer, {
      tokenizeMaxLineLength: 10,
    });
    const longLine = 'x'.repeat(50);
    const doc = Text.of(['short', longLine, 'after']);

    const decorated: number[] = [];
    highlighter.highlight(doc, 0, doc.length, (from) => {
      decorated.push(doc.lineAt(from).number);
    });

    expect(decorated).toEqual([1, 3]);
    const tokenizedTexts = grammar.tokenizeLine2.mock.calls.map((c) => c[0]);
    expect(tokenizedTexts).toEqual(['short', 'after']);
    // Line 3 starts from line 1's state because the long line did not change it.
    expect(grammar.tokenizeLine2.mock.calls[1][1].id).toBe('short');
  });

  it('passes tokenizeTimeLimit and treats stoppedEarly lines as plain', () => {
    const { highlighter, grammar } = createMockHighlighter(
      (text, state, timeLimit) => {
        if (text === 'slow') {
          return { tokens: [0, 2 << 15], ruleStack: null, stoppedEarly: true };
        }
        return simpleTokenizer(text, state);
      },
      { tokenizeTimeLimit: 250 },
    );
    const doc = Text.of(['a', 'slow', 'b']);

    const decorated: number[] = [];
    highlighter.highlight(doc, 0, doc.length, (from) => {
      decorated.push(doc.lineAt(from).number);
    });

    expect(decorated).toEqual([1, 3]);
    expect(grammar.tokenizeLine2.mock.calls[1][2]).toBe(250);
    expect(grammar.tokenizeLine2.mock.calls[2][1].id).toBe('a');
  });

  it('tokenizes without a limit when both options are 0', () => {
    const { highlighter, grammar } = createMockHighlighter(simpleTokenizer, {
      tokenizeMaxLineLength: 0,
      tokenizeTimeLimit: 0,
    });
    const doc = Text.of(['y'.repeat(30000)]);

    let count = 0;
    highlighter.highlight(doc, 0, doc.length, () => count++);

    expect(count).toBe(1);
    expect(grammar.tokenizeLine2.mock.calls[0][2]).toBe(0);
  });
});
