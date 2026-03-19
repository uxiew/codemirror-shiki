import { describe, expect, it } from 'vitest';

import { computePrunableCacheLines } from '../src/highlighter';

describe('highlighter cache prune', () => {
  it('should not prune when cache size is under limit', () => {
    const lines = [1, 2, 3, 4, 5];
    const toDelete = computePrunableCacheLines(lines, 3, {
      maxEntries: 10,
      keepBehindLines: 2,
      keepAheadLines: 2,
      anchorInterval: 3,
    });

    expect(toDelete).toEqual([]);
  });

  it('should prioritize pruning non-window non-anchor lines', () => {
    const lines = [50, 100, 150, 200, 250, 300, 350, 400];
    const toDelete = computePrunableCacheLines(lines, 210, {
      maxEntries: 5,
      keepBehindLines: 20,
      keepAheadLines: 20,
      anchorInterval: 100,
    });

    expect(toDelete).toContain(50);
    expect(toDelete).toContain(150);
    expect(toDelete).toContain(250);
    expect(toDelete).toContain(350);
  });

  it('should enforce maxEntries when must-keep set is still too large', () => {
    const lines = Array.from({ length: 20 }, (_, i) => (i + 1) * 100);
    const toDelete = computePrunableCacheLines(lines, 1000, {
      maxEntries: 6,
      keepBehindLines: 1000,
      keepAheadLines: 1000,
      anchorInterval: 100,
    });

    expect(toDelete.length).toBe(14);
  });
});
