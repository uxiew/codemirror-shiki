import { describe, expect, it } from 'vitest';
import { ChangeSet, Text } from '@codemirror/state';

import { remapLineCache } from '../src/highlighter';
import { createMockHighlighter, simpleTokenizer } from './helpers/mock-highlighter';

function edit(doc: Text, spec: { from: number; to?: number; insert?: string }) {
  const changes = ChangeSet.of(spec, doc.length);
  return { changes, newDoc: changes.apply(doc) };
}

describe('ShikiHighlighter: per-line token cache', () => {
  it('does not tokenize again when the same document is highlighted twice', () => {
    const { highlighter, tokenizedSince } = createMockHighlighter(simpleTokenizer);
    const doc = Text.of(['a', 'b', 'c']);

    let count = 0;
    highlighter.highlight(doc, 0, doc.length, () => count++);
    expect(tokenizedSince()).toEqual(['a', 'b', 'c']);
    expect(count).toBe(3);

    count = 0;
    highlighter.highlight(doc, 0, doc.length, () => count++);
    expect(tokenizedSince()).toEqual([]);
    expect(count).toBe(3);
  });

  it('re-tokenizes from an edit only until the grammar state converges', () => {
    const { highlighter, tokenizedSince } = createMockHighlighter(simpleTokenizer);
    const doc = Text.of(['a', 'b', 'c', 'd']);
    highlighter.highlight(doc, 0, doc.length, () => {});
    tokenizedSince();

    // Replace line 2. Its own text changed, line 3 starts from a new state,
    // line 4 starts from the same state as before and is reused.
    const line2 = doc.line(2);
    const { changes, newDoc } = edit(doc, { from: line2.from, to: line2.to, insert: 'B' });
    highlighter.applyDocChanges(doc, newDoc, changes);

    let count = 0;
    highlighter.highlight(newDoc, 0, newDoc.length, () => count++);
    expect(tokenizedSince()).toEqual(['B', 'c']);
    expect(count).toBe(4);
  });

  it('renumbers cached lines when lines are inserted above them', () => {
    const { highlighter, tokenizedSince } = createMockHighlighter(simpleTokenizer);
    const doc = Text.of(['a', 'b', 'c', 'd']);
    highlighter.highlight(doc, 0, doc.length, () => {});
    tokenizedSince();

    const { changes, newDoc } = edit(doc, { from: doc.line(2).from, insert: 'x\n' });
    highlighter.applyDocChanges(doc, newDoc, changes);
    expect(newDoc.toString()).toBe('a\nx\nb\nc\nd');

    highlighter.highlight(newDoc, 0, newDoc.length, () => {});
    // 'x' is new, 'b' now starts from x's state, 'c' and 'd' are reused.
    expect(tokenizedSince()).toEqual(['x', 'b']);
  });

  it('walks forward from an edit above the viewport before highlighting it', () => {
    const { highlighter, tokenizedSince } = createMockHighlighter(simpleTokenizer);
    const doc = Text.of(['a', 'b', 'c', 'd', 'e']);
    highlighter.highlight(doc, 0, doc.length, () => {});
    tokenizedSince();

    const { changes, newDoc } = edit(doc, { from: 0, to: 1, insert: 'A' });
    highlighter.applyDocChanges(doc, newDoc, changes);

    // Only lines 4-5 are visible, but the edit on line 1 must be followed.
    const from = newDoc.line(4).from;
    highlighter.highlight(newDoc, from, newDoc.length, () => {});
    expect(tokenizedSince()).toEqual(['A', 'b']);
  });

  it('keeps plain lines plain without retrying them', () => {
    const { highlighter, tokenizedSince } = createMockHighlighter((text, state) =>
      text === 'slow'
        ? { tokens: [0, 2 << 15], ruleStack: null, stoppedEarly: true }
        : simpleTokenizer(text, state),
    );
    const doc = Text.of(['a', 'slow', 'b']);
    highlighter.highlight(doc, 0, doc.length, () => {});
    expect(tokenizedSince()).toEqual(['a', 'slow', 'b']);

    highlighter.highlight(doc, 0, doc.length, () => {});
    expect(tokenizedSince()).toEqual([]);
  });

  it('reuses one Decoration per token style across lines and passes', () => {
    const { highlighter } = createMockHighlighter(simpleTokenizer);
    const doc = Text.of(['a', 'b', 'c']);

    const marks = new Set<unknown>();
    highlighter.highlight(doc, 0, doc.length, (_f, _t, mark) => marks.add(mark));
    highlighter.highlight(doc, 0, doc.length, (_f, _t, mark) => marks.add(mark));

    expect(marks.size).toBe(1);
  });

  it('starts over when asked to highlight an unrelated document', () => {
    const { highlighter, tokenizedSince } = createMockHighlighter(simpleTokenizer);
    const docA = Text.of(['a', 'b']);
    const docB = Text.of(['c', 'd']);

    highlighter.highlight(docA, 0, docA.length, () => {});
    highlighter.highlight(docB, 0, docB.length, () => {});
    expect(tokenizedSince()).toEqual(['a', 'b', 'c', 'd']);

    highlighter.highlight(docA, 0, docA.length, () => {});
    expect(tokenizedSince()).toEqual(['a', 'b']);
  });
});

describe('remapLineCache', () => {
  it('drops touched lines and renumbers the ones after a deletion', () => {
    const doc = Text.of(['l1', 'l2', 'l3', 'l4']);
    const cache = new Map([
      [1, 'l1'],
      [2, 'l2'],
      [3, 'l3'],
      [4, 'l4'],
    ]);
    const { changes, newDoc } = edit(doc, { from: doc.line(2).from, to: doc.line(3).from });

    const firstDirty = remapLineCache(cache, doc, newDoc, changes);

    expect(newDoc.toString()).toBe('l1\nl3\nl4');
    expect(firstDirty).toBe(2);
    // l2 and l3 were both touched by the deleted range, l4 moved up.
    expect([...cache.entries()]).toEqual([
      [1, 'l1'],
      [3, 'l4'],
    ]);
  });

  it('shifts lines after an insertion and applies several changes in order', () => {
    const doc = Text.of(['l1', 'l2', 'l3', 'l4', 'l5']);
    const cache = new Map([1, 2, 3, 4, 5].map((n) => [n, `l${n}`] as [number, string]));
    const changes = ChangeSet.of(
      [
        { from: doc.line(2).from, insert: 'x\ny\n' },
        { from: doc.line(4).from, to: doc.line(4).to, insert: 'L4' },
      ],
      doc.length,
    );
    const newDoc = changes.apply(doc);

    const firstDirty = remapLineCache(cache, doc, newDoc, changes);

    expect(newDoc.toString()).toBe('l1\nx\ny\nl2\nl3\nL4\nl5');
    expect(firstDirty).toBe(2);
    expect([...cache.entries()]).toEqual([
      [1, 'l1'],
      [5, 'l3'],
      [7, 'l5'],
    ]);
  });

  it('returns one past the last line when nothing changed', () => {
    const doc = Text.of(['l1', 'l2']);
    const cache = new Map([[1, 'l1']]);
    const changes = ChangeSet.empty(doc.length);

    expect(remapLineCache(cache, doc, doc, changes)).toBe(3);
    expect([...cache.entries()]).toEqual([[1, 'l1']]);
  });
});
