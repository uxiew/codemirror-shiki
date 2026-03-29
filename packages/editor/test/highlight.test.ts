import { describe, it, expect, beforeAll } from 'vitest';
import { ShikiEditor } from '../src/index';

// Stub ResizeObserver for JSDOM
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

let sharedHighlighter: any;

function createMockHighlighter() {
  return {
    loadLanguage() {},
    loadTheme() {},
    getLanguage() {
      return {
        tokenizeLine2() {
          return {
            tokens: [0, 0],
            ruleStack: undefined,
          };
        },
      };
    },
    getTheme() {
      return {
        type: 'dark',
        fg: '#ffffff',
        bg: '#000000',
        colors: {},
      };
    },
    setTheme() {
      return {
        colorMap: ['#000000', '#ffffff'],
      };
    },
  };
}

beforeAll(async () => {
  sharedHighlighter = createMockHighlighter();
});

describe('ShikiEditor', () => {
  it('should have syntax highlighting on initial load', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const editor = await ShikiEditor.create({
      parent,
      doc: 'const a = 1;',
      highlighter: sharedHighlighter,
      lang: 'javascript',
      themes: {
        nord: 'nord',
      },
      defaultColor: 'nord',
      themeStyle: 'shiki',
    });

    expect(editor.getDoc()).toBe('const a = 1;');

    editor.destroy();
    parent.remove();
  });

  it('should change theme', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const editor = await ShikiEditor.create({
      parent,
      doc: 'const a = 1;',
      highlighter: sharedHighlighter,
      lang: 'javascript',
      themes: {
        nord: 'nord',
        dark: 'github-dark',
      },
      defaultColor: 'nord',
    });

    await editor.changeTheme('dark');
    expect(editor.getDoc()).toBe('const a = 1;');

    editor.destroy();
    parent.remove();
  });

  it('should get and set value', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const editor = await ShikiEditor.create({
      parent,
      doc: 'initial code',
      highlighter: sharedHighlighter,
      lang: 'javascript',
      themes: { nord: 'nord' },
      defaultColor: 'nord',
    });

    expect(editor.getDoc()).toBe('initial code');
    editor.setDoc('new code');
    expect(editor.getDoc()).toBe('new code');

    editor.destroy();
    parent.remove();
  });
});
