import { describe, expect, it, vi } from 'vitest';
import { bundledLanguages, bundledThemes } from 'shiki';
import { createSharedHighlighterManager } from '../src/resolvers';

describe('createSharedHighlighterManager', () => {
  it('should create and cache a shared highlighter', async () => {
    const manager = createSharedHighlighterManager({
      languageLoaders: {
        javascript: bundledLanguages.javascript,
        json: bundledLanguages.json,
      },
      themeLoaders: {
        'github-dark': bundledThemes['github-dark'],
        'github-light': bundledThemes['github-light'],
      },
      preloadLanguage: 'javascript',
      preloadThemes: ['github-dark', 'github-light'],
      engine: 'javascript',
      warnings: true,
    });

    const first = await manager.getHighlighter();
    const second = await manager.getHighlighter();

    expect(first).toBe(second);
    expect(first.getTheme('github-dark')).toBeTruthy();

    const jsonLanguage = await manager.resolveLanguage('json');
    expect(jsonLanguage?.length).toBeGreaterThan(0);
  });

  it('should cache manager language and theme loader calls', async () => {
    const languageLoader = vi.fn(async () => ({
      default: [{ name: 'javascript' }],
    }));
    const themeLoader = vi.fn(async () => ({
      default: { name: 'github-dark' },
    }));

    const manager = createSharedHighlighterManager({
      languageLoaders: {
        javascript: languageLoader,
      },
      themeLoaders: {
        'github-dark': themeLoader,
      },
      preloadLanguage: 'javascript',
      preloadThemes: ['github-dark'],
      engine: 'javascript',
      warnings: false,
    });

    await manager.resolveLanguage('javascript');
    await manager.resolveLanguage('javascript');
    await manager.resolveTheme('github-dark');
    await manager.resolveTheme('github-dark');

    expect(languageLoader).toHaveBeenCalledTimes(1);
    expect(themeLoader).toHaveBeenCalledTimes(1);
  });
});
