import { describe, expect, it, vi } from 'vitest';
import {
  createLangResolver,
  createThemeResolver,
} from '../src/resolvers';

describe('resolver helpers', () => {
  it('should resolve language loader results', async () => {
    const javascriptLoader = vi.fn(async () => ({
      default: [{ name: 'javascript' }],
    }));
    const resolveLang = createLangResolver({
      javascript: javascriptLoader as any,
    });

    const first = await resolveLang('javascript');
    const second = await resolveLang('javascript');

    expect(javascriptLoader).toHaveBeenCalledTimes(2);
    expect(first).toEqual([{ name: 'javascript' }]);
    expect(second).toEqual([{ name: 'javascript' }]);
  });

  it('should resolve theme loader results', async () => {
    const darkThemeLoader = vi.fn(async () => ({
      default: { name: 'github-dark' },
    }));
    const resolveTheme = createThemeResolver({
      'github-dark': darkThemeLoader as any,
    });

    const first = await resolveTheme('github-dark');
    const second = await resolveTheme('github-dark');

    expect(darkThemeLoader).toHaveBeenCalledTimes(2);
    expect(first).toEqual({ name: 'github-dark' });
    expect(second).toEqual({ name: 'github-dark' });
  });
});
