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

const oneToken = () => ({ tokens: [0, 2 << 15], ruleStack: null });
const flushIdle = () => new Promise((r) => setTimeout(r, 30));

async function createExtension(tokenizeLine2: (...args: any[]) => any) {
  const { shiki } = await shikiToCodeMirror({
    highlighter: createCore(tokenizeLine2) as any,
    lang: 'javascript',
    themes: { dark: 'mock-dark' },
    defaultColor: 'dark',
    themeStyle: 'shiki',
  });
  return shiki;
}

function mount(doc: string, shiki: any) {
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

/** A mounted editor whose grammar has already tokenized once. */
async function createWarmView(doc: string, tokenizeLine2: (...args: any[]) => any) {
  const shiki = await createExtension(tokenizeLine2);
  const mounted = mount(doc, shiki);
  await flushIdle();
  return { ...mounted, shiki };
}

describe('shiki view plugin: budgeted highlighting', () => {
  it('highlights a cold grammar in idle time, not inside editor creation', async () => {
    const tokenize = vi.fn(oneToken);
    const shiki = await createExtension(tokenize);
    const { styledSpans, cleanup } = mount('a\nb\nc', shiki);

    expect(tokenize).not.toHaveBeenCalled();
    expect(styledSpans()).toBe(0);

    await flushIdle();
    expect(styledSpans()).toBe(3);
    cleanup();
  });

  it('styles the first frame synchronously once the grammar is warm', async () => {
    const warm = await createWarmView('x', vi.fn(oneToken));
    warm.cleanup();

    const { styledSpans, cleanup } = mount('a\nb\nc', warm.shiki);
    // At least the first line is styled before the constructor returns; the
    // rest depends on whether the 6ms budget ran out on a busy machine.
    expect(styledSpans()).toBeGreaterThanOrEqual(1);
    await flushIdle();
    expect(styledSpans()).toBe(3);
    cleanup();
  });

  it('re-styles the edited line inside the same update', async () => {
    const tokenize = vi.fn(oneToken);
    const { view, cleanup } = await createWarmView('a\nb', tokenize);
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
    const { view, styledSpans, cleanup } = await createWarmView('a\nb', tokenize);

    view.dispatch({ changes: { from: 1, insert: '\nslow' } });
    expect(view.state.doc.toString()).toBe('a\nslow\nb');

    // The synchronous pass could not finish the slow line and stopped there;
    // the lines after it keep their previous decorations.
    expect(limits).toHaveLength(1);
    expect(limits[0]).toBeLessThanOrEqual(6);
    expect(styledSpans()).toBe(2);

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
    const { view, styledSpans, cleanup } = await createWarmView('a\nb\nc', tokenize);
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
