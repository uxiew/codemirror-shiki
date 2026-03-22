import type { Options, ShikiToCMOptions } from './types/types';
import { shikiPlugin } from './plugin';
import defaultOptions from './config';
import { initShiki } from './init';

export * from './types/types';
export {
  createCachedLanguageResolver,
  createCachedThemeResolver,
  createSharedHighlighterManager,
} from './resolvers';
export { ShikiHighlighter } from './highlighter';
export { updateEffect } from './viewPlugin';
export { themeCompartment, configsFacet } from './base';
/**
 * integrate the Shiki highlighter to CodeMirror
 * @param { Highlighter } highlighter Shiki Highlighter instance
 * @param  { GenerateOptions } options
 */
export async function shikiToCodeMirror(shikiOptions: Options) {
  const normalizedOptions = { ...shikiOptions };
  const { theme, themes } = normalizedOptions;
  if (!themes) {
    if (theme) {
      normalizedOptions.themes = {
        light: theme,
      };
    } else {
      throw new Error(
        '[@cmshiki/shiki]' +
          'Invalid options, either `theme` or `themes` must be provided',
      );
    }
  }

  if (themes && theme) {
    // Keep one source of truth for theme resolution.
    delete (normalizedOptions as any).theme;
  }

  const options = {
    ...defaultOptions,
    ...normalizedOptions,
  } as ShikiToCMOptions;

  if (options.warnings) {
    if (theme && themes) {
      console.warn(
        '[@cmshiki/shiki] Both `theme` and `themes` are provided. `themes` will be treated as the source of truth.',
      );
    }
    if (
      typeof options.defaultColor === 'string' &&
      options.themes &&
      !options.themes[options.defaultColor]
    ) {
      console.warn(
        `[@cmshiki/shiki] \`defaultColor: "${options.defaultColor}"\` is not a key in \`themes\`. Available keys: ${Object.keys(options.themes).join(', ')}`,
      );
    }
  }

  const shikiInternalCore = await initShiki(options);

  return shikiPlugin(shikiInternalCore, options, initShiki);
}
