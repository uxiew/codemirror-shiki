import { describe, expect, it } from 'vitest';
import { Text } from '@codemirror/state';

import { createMockHighlighter, mockState } from './helpers/mock-highlighter';

/**
 * State = number of open `{`, never below zero, so a wrong guess converges
 * at the next top-level `}` like a real grammar does.
 */
function depthTokenizer(text: string, state: any) {
  const depth = Math.max(
    0,
    (state ? Number(state.id) : 0) +
      (text.match(/\{/g)?.length ?? 0) -
      (text.match(/\}/g)?.length ?? 0),
  );
  return { tokens: [0, 2 << 15], ruleStack: mockState(String(depth)), stoppedEarly: false };
}

function bigDoc(lines: number) {
  return Text.of(Array.from({ length: lines }, (_, i) => (i % 10 === 0 ? 'f() {' : i % 10 === 9 ? '}' : `  x${i}`)));
}

describe('ShikiHighlighter: speculative pass', () => {
  it('needs speculation only far past the trusted prefix', () => {
    const { highlighter } = createMockHighlighter(depthTokenizer);
    const doc = bigDoc(1000);
    expect(highlighter.needsSpeculation(doc, doc.line(100).from)).toBe(false);
    expect(highlighter.needsSpeculation(doc, doc.line(900).from)).toBe(true);
    highlighter.highlight(doc, 0, doc.line(800).to, () => {});
    expect(highlighter.needsSpeculation(doc, doc.line(900).from)).toBe(false);
  });

  it('tokenizes only a short lookback above the range', () => {
    const { highlighter, tokenizedSince } = createMockHighlighter(depthTokenizer);
    const doc = bigDoc(5000);
    let count = 0;
    highlighter.highlight(doc, doc.line(4000).from, doc.line(4010).to, () => count++, {
      speculative: true,
    });
    expect(count).toBe(11);
    expect(tokenizedSince().length).toBeLessThanOrEqual(11 + 40);
    // The trusted prefix did not move, so the exact pass still has to walk.
    expect(highlighter.needsSpeculation(doc, doc.line(4000).from)).toBe(true);
  });

  it('lets the exact walk reuse speculative lines whose start state was right', () => {
    const { highlighter, tokenizedSince } = createMockHighlighter(depthTokenizer);
    const doc = bigDoc(2000);
    // The guess restarts at the `}` closing the block above line 1501, which
    // ends at depth 0 either way, so every speculative line is exact.
    highlighter.highlight(doc, doc.line(1501).from, doc.line(1520).to, () => {}, {
      speculative: true,
    });
    tokenizedSince();
    highlighter.highlight(doc, 0, doc.line(1520).to, () => {});
    const retokenized = tokenizedSince();
    expect(retokenized.length).toBe(1500);
    expect(highlighter.needsSpeculation(doc, doc.line(1600).from)).toBe(false);
  });
});
