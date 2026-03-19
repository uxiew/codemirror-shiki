import { describe, expect, it } from 'vitest';
import { Text } from '@codemirror/state';
import { Decoration } from '@codemirror/view';

import {
  buildDecorationsFromEntries,
  normalizeVisibleRanges,
  shouldDeferViewportHighlight,
  trimRangesByLineBudget,
} from '../src/viewPlugin';

describe('viewPlugin range safety', () => {
  it('should normalize and merge unsorted visible ranges', () => {
    const ranges = normalizeVisibleRanges([
      { from: 80, to: 120 },
      { from: 10, to: 50 },
      { from: 40, to: 90 },
      { from: 130, to: 130 },
      { from: 130, to: 140 },
    ]);

    expect(ranges).toEqual([
      { from: 10, to: 120 },
      { from: 130, to: 140 },
    ]);
  });

  it('should build decoration set from unsorted entries without throwing', () => {
    const mark = Decoration.mark({ class: 'tok' });
    const build = () =>
      buildDecorationsFromEntries([
        { from: 30, to: 40, mark },
        { from: 10, to: 20, mark },
        { from: 20, to: 25, mark },
        { from: 5, to: 5, mark },
      ]);

    expect(build).not.toThrow();
  });

  it('should defer highlight when viewport changes too frequently', () => {
    expect(shouldDeferViewportHighlight(100, 0)).toBe(false);
    expect(shouldDeferViewportHighlight(130, 100)).toBe(true);
    expect(shouldDeferViewportHighlight(220, 100)).toBe(false);
  });

  it('should trim ranges for coarse pass using line budget', () => {
    const doc = Text.of([
      'line-1',
      'line-2',
      'line-3',
      'line-4',
      'line-5',
      'line-6',
    ]);

    const ranges = [{ from: 0, to: doc.length }];
    const trimmed = trimRangesByLineBudget(doc, ranges, 3);
    const line3To = doc.line(3).to;

    expect(trimmed).toEqual([{ from: 0, to: line3To }]);
  });
});
