import { describe, expect, it } from 'vitest';
import { Decoration } from '@codemirror/view';

import {
  buildDecorationsFromEntries,
  normalizeVisibleRanges,
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
});
