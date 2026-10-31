import { describe, expect, it } from 'vitest';
import { Text } from '@codemirror/state';

import { createMockHighlighter, simpleTokenizer } from './helpers/mock-highlighter';

const expired = () => performance.now() - 1;

describe('ShikiHighlighter: deadline budget', () => {
  it('stops between lines once the deadline passed, but always finishes one line', () => {
    const { highlighter, tokenizedSince } = createMockHighlighter(simpleTokenizer);
    const doc = Text.of(['a', 'b', 'c']);

    const first = highlighter.highlight(doc, 0, doc.length, () => {}, {
      deadline: expired(),
    });
    expect(first.produced).toBe(1);
    expect(first.nextFrom).toBe(doc.line(2).from);
    expect(tokenizedSince()).toEqual(['a']);

    const second = highlighter.highlight(doc, first.nextFrom!, doc.length, () => {}, {
      deadline: expired(),
    });
    expect(second.nextFrom).toBe(doc.line(3).from);
    expect(tokenizedSince()).toEqual(['b']);
  });

  it('spends the budget on the walk from the anchor before the visible range', () => {
    const { highlighter, tokenizedSince } = createMockHighlighter(simpleTokenizer);
    const doc = Text.of(['a', 'b', 'c', 'd', 'e']);
    const from = doc.line(4).from;

    const steps: (number | null)[] = [];
    for (let i = 0; i < 5; i++) {
      const result = highlighter.highlight(doc, from, doc.length, () => {}, {
        deadline: expired(),
      });
      steps.push(result.nextFrom);
    }

    // Three calls walk a, b, c (nothing visible yet), then d, then e.
    expect(steps).toEqual([from, from, from, doc.line(5).from, null]);
    expect(tokenizedSince()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('hands back a slow line untouched when deferSlowLines is set', () => {
    const { highlighter, grammar, tokenizedSince } = createMockHighlighter(
      (text, state, timeLimit) =>
        text === 'slow' && (timeLimit as number) < 100
          ? { tokens: [], ruleStack: null, stoppedEarly: true }
          : simpleTokenizer(text, state),
    );
    const doc = Text.of(['a', 'slow', 'b']);

    const sync = highlighter.highlight(doc, 0, doc.length, () => {}, {
      deadline: performance.now() + 5,
      deferSlowLines: true,
    });
    expect(sync.produced).toBe(1);
    expect(sync.nextFrom).toBe(doc.line(2).from);
    expect(tokenizedSince()).toEqual(['a', 'slow']);
    expect(grammar.tokenizeLine2.mock.calls[1][2]).toBeLessThanOrEqual(5);

    // The idle pass gives the line the configured limit and finishes.
    let count = 0;
    const idle = highlighter.highlight(doc, sync.nextFrom!, doc.length, () => count++, {
      deadline: performance.now() + 12,
    });
    expect(idle.nextFrom).toBeNull();
    expect(count).toBe(2);
    expect(tokenizedSince()).toEqual(['slow', 'b']);
    expect(grammar.tokenizeLine2.mock.calls[2][2]).toBe(500);
  });

  it('does not shorten the line limit without deferSlowLines', () => {
    const { highlighter, grammar } = createMockHighlighter(simpleTokenizer);
    const doc = Text.of(['a']);

    highlighter.highlight(doc, 0, doc.length, () => {}, {
      deadline: performance.now() + 1,
    });
    expect(grammar.tokenizeLine2.mock.calls[0][2]).toBe(500);
  });
});
