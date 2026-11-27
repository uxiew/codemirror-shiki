import type { ChangeSet, Text } from '@codemirror/state';

import type { GrammarState } from './types/shiki.types';

/**
 * Compare two grammar states. vscode-textmate stacks implement `equals()`;
 * the document start is `null` on both sides.
 */
export function grammarStatesEqual(
  a: GrammarState | null | undefined,
  b: GrammarState | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const equals = (a as any).equals;
  return typeof equals === 'function' ? Boolean(equals.call(a, b)) : false;
}

/**
 * Move cached lines through a document change.
 *
 * Lines the change touched are dropped and lines after it are renumbered, so
 * their entries can be reused once the walk from the edit reaches them.
 * Returns the first line number (in the new document) whose cached state can
 * no longer be trusted as a starting point. Lines before it are untouched.
 */
export function remapLineCache<T>(
  cache: Map<number, T>,
  oldDoc: Text,
  newDoc: Text,
  changes: ChangeSet,
): number {
  const spans: { oldStart: number; oldEnd: number; delta: number }[] = [];
  let firstDirty = newDoc.lines + 1;
  changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    const oldStart = oldDoc.lineAt(fromA).number;
    const oldEnd = oldDoc.lineAt(toA).number;
    const newStart = newDoc.lineAt(fromB).number;
    const newEnd = newDoc.lineAt(toB).number;
    firstDirty = Math.min(firstDirty, newStart);
    spans.push({
      oldStart,
      oldEnd,
      delta: newEnd - newStart - (oldEnd - oldStart),
    });
  });
  if (spans.length === 0 || cache.size === 0) return firstDirty;

  const lines = Array.from(cache.keys()).sort((a, b) => a - b);
  const moved: [number, T][] = [];
  let spanIndex = 0;
  let delta = 0;
  for (const line of lines) {
    while (spanIndex < spans.length && spans[spanIndex].oldEnd < line) {
      delta += spans[spanIndex].delta;
      spanIndex++;
    }
    if (spanIndex < spans.length && spans[spanIndex].oldStart <= line) {
      continue; // the change touched this line, its text is stale
    }
    moved.push([line + delta, cache.get(line)!]);
  }
  cache.clear();
  for (const [line, entry] of moved) cache.set(line, entry);
  return firstDirty;
}
