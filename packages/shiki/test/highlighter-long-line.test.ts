import { describe, expect, it } from 'vitest';
import { Text } from '@codemirror/state';

import { createMockHighlighter, simpleTokenizer } from './helpers/mock-highlighter';

describe('ShikiHighlighter: long line protection', () => {
  it('tokenizes only the head of a line over tokenizeMaxLineLength and continues from its state', () => {
    const { highlighter, grammar } = createMockHighlighter(simpleTokenizer, {
      tokenizeMaxLineLength: 10,
    });
    const longLine = 'x'.repeat(50);
    const doc = Text.of(['short', longLine, 'after']);

    const decorated: [number, number, number][] = [];
    highlighter.highlight(doc, 0, doc.length, (from, to) => {
      decorated.push([doc.lineAt(from).number, from, to]);
    });

    const line2 = doc.line(2);
    expect(decorated).toEqual([
      [1, 0, 5],
      // Only the first 10 characters of the long line carry a decoration.
      [2, line2.from, line2.from + 10],
      [3, doc.line(3).from, doc.line(3).to],
    ]);
    const tokenizedTexts = grammar.tokenizeLine2.mock.calls.map((c) => c[0]);
    expect(tokenizedTexts).toEqual(['short', 'x'.repeat(10), 'after']);
    // Line 3 starts from the state after the long line's head.
    expect(grammar.tokenizeLine2.mock.calls[2][1].id).toBe('x'.repeat(10));
  });

  it('passes tokenizeTimeLimit and treats lines that time out twice as plain', () => {
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
    const collect = (from: number) => {
      decorated.push(doc.lineAt(from).number);
    };
    // The first timeout asks for a retry; the second makes the line plain.
    const first = highlighter.highlight(doc, 0, doc.length, collect);
    highlighter.highlight(doc, first.nextFrom!, doc.length, collect);

    expect(decorated).toEqual([1, 3]);
    expect(grammar.tokenizeLine2.mock.calls[1][2]).toBe(250);
    // Line 3 starts from line 1's state because the plain line did not change it.
    expect(grammar.tokenizeLine2.mock.calls[3][1].id).toBe('a');
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
