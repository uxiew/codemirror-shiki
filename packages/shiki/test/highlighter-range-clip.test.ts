import { describe, expect, it } from 'vitest';
import { Text } from '@codemirror/state';

import { createMockHighlighter } from './helpers/mock-highlighter';

describe('ShikiHighlighter: decorations are clipped to the requested range', () => {
  it('emits only the parts of tokens that fall inside [from, to]', () => {
    // Three tokens of two characters each: ab | cd | ef
    const { highlighter } = createMockHighlighter(() => ({
      tokens: [0, 2 << 15, 2, 2 << 15, 4, 2 << 15],
      ruleStack: null,
    }));
    const doc = Text.of(['abcdef']);

    const ranges: [number, number][] = [];
    const result = highlighter.highlight(doc, 3, 5, (from, to) => {
      ranges.push([from, to]);
    });

    expect(ranges).toEqual([
      [3, 4],
      [4, 5],
    ]);
    expect(result.produced).toBe(2);
  });

  it('does not emit duplicates when several ranges of one long line are requested', () => {
    const { highlighter } = createMockHighlighter(() => ({
      tokens: [0, 2 << 15, 10, 2 << 15, 20, 2 << 15],
      ruleStack: null,
    }));
    const doc = Text.of(['x'.repeat(30)]);

    const ranges: [number, number][] = [];
    const collect = (from: number, to: number) => {
      ranges.push([from, to]);
    };
    highlighter.highlight(doc, 0, 5, collect);
    highlighter.highlight(doc, 25, 30, collect);

    expect(ranges).toEqual([
      [0, 5],
      [25, 30],
    ]);
  });
});
