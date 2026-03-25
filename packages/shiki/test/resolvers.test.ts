import { describe, expect, it, vi } from 'vitest';
import {
  createCachedLangResolver,
  createCachedThemeResolver,
} from '../src/resolvers';

describe('resolver helpers', () => {
  it('should cache language loader results', async () => {
    const javascriptLoader = vi.fn(async () => ({
      default: [{ name: 'javascript' }],
    }));
    const resolveLang = createCachedLangResolver({
      javascript: javascriptLoader,
    });

    const first = await resolveLang('javascript');
    const second = await resolveLang('javascript');

    expect(javascriptLoader).toHaveBeenCalledTimes(1);
    expect(first).toEqual([{ name: 'javascript' }]);
    expect(second).toEqual([{ name: 'javascript' }]);
  });

  it('should cache theme loader results', async () => {
    const darkThemeLoader = vi.fn(async () => ({
      default: { name: 'github-dark' },
    }));
    const resolveTheme = createCachedThemeResolver({
      'github-dark': darkThemeLoader,
    });

    const first = await resolveTheme('github-dark');
    const second = await resolveTheme('github-dark');

    expect(darkThemeLoader).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ name: 'github-dark' });
    expect(second).toEqual({ name: 'github-dark' });
  });
});
