import { describe, expect, it } from 'vitest';
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
});
