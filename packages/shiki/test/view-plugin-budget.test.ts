import { describe, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { shikiToCodeMirror } from '../src';

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

function createCore(tokenizeLine2: (...args: any[]) => any) {
  return {
    loadLanguage() {},
    loadTheme() {},
    getLanguage: () => ({ tokenizeLine2 }),
    getTheme: () => ({ type: 'dark', fg: '#ffffff', bg: '#000000', colors: {} }),
    setTheme: () => ({ colorMap: ['', '#ffffff', '#ff0000'] }),
  };
}

async function createView(doc: string, tokenizeLine2: (...args: any[]) => any) {
  const { shiki } = await shikiToCodeMirror({
    highlighter: createCore(tokenizeLine2) as any,
    lang: 'javascript',
    themes: { dark: 'mock-dark' },
    defaultColor: 'dark',
    themeStyle: 'shiki',
  });
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const view = new EditorView({
    state: EditorState.create({ doc, extensions: [shiki] }),
    parent,
  });
  return {
    view,
    styledSpans: () => view.contentDOM.querySelectorAll('span[style]').length,
    cleanup: () => {
      view.destroy();
      parent.remove();
    },
  };
}

const oneToken = () => ({ tokens: [0, 2 << 15], ruleStack: null });
const flushIdle = () => new Promise((r) => setTimeout(r, 30));

describe('shiki view plugin: budgeted highlighting', () => {
  it('styles the first frame synchronously when the work is cheap', async () => {
    const { styledSpans, cleanup } = await createView('a\nb\nc', vi.fn(oneToken));
    expect(styledSpans()).toBe(3);
    cleanup();
  });

  it('re-styles the edited line inside the same update', async () => {
    const tokenize = vi.fn(oneToken);
    const { view, cleanup } = await createView('a\nb', tokenize);
    tokenize.mockClear();

    view.dispatch({ changes: { from: 0, insert: 'x' } });

    expect(tokenize.mock.calls.map((c) => c[0])).toEqual(['xa']);
    cleanup();
  });

  it('leaves a slow line to the idle pass and gives it the full time limit', async () => {
    const limits: number[] = [];
    const tokenize = vi.fn((text: string, _state: any, timeLimit: number) => {
      if (text !== 'slow') return oneToken();
      limits.push(timeLimit);
      return timeLimit < 100
        ? { tokens: [], ruleStack: null, stoppedEarly: true }
        : oneToken();
    });
    const { styledSpans, cleanup } = await createView('a\nslow\nb', tokenize);

    // The synchronous pass could not finish the slow line; it stopped there.
    expect(limits).toHaveLength(1);
    expect(limits[0]).toBeLessThanOrEqual(6);
    expect(styledSpans()).toBe(1);

    await flushIdle();

    expect(limits).toEqual([limits[0], 500]);
    expect(styledSpans()).toBe(3);
    cleanup();
  });

  it('keeps previous decorations on lines a chunk has not reached yet', async () => {
    let slow = false;
    const tokenize = vi.fn((text: string, _state: any, timeLimit: number) => {
      if (slow && text === 'b' && timeLimit < 100) {
        return { tokens: [], ruleStack: null, stoppedEarly: true };
      }
      return oneToken();
    });
    const { view, styledSpans, cleanup } = await createView('a\nb\nc', tokenize);
    expect(styledSpans()).toBe(3);

    // Editing line 1 invalidates b's start state; b now takes too long for
    // the synchronous pass, yet b and c stay styled from before.
    slow = true;
    view.dispatch({ changes: { from: 0, insert: 'x' } });
    expect(styledSpans()).toBe(3);

    await flushIdle();
    expect(styledSpans()).toBe(3);
    cleanup();
  });
});
