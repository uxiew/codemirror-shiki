import type { Options, ShikiToCMOptions } from './types/types';
import { shikiPlugin } from './plugin';
import defaultOptions from './config';
import { initShikiCore } from './init-core';

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
 * Core entrypoint for fine-grained bundling.
 *
 * This variant is designed to align with `shiki/core` usage:
 * you should pass a pre-created `highlighter` with explicit langs/themes.
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
        '[@cmshiki/shiki/core]' +
          'Invalid options, either `theme` or `themes` must be provided',
      );
    }
  }

  if (themes && theme) {
    delete (normalizedOptions as any).theme;
  }

  const options = {
    ...defaultOptions,
    ...normalizedOptions,
  } as ShikiToCMOptions;

  if (options.warnings) {
    if (theme && themes) {
      console.warn(
        '[@cmshiki/shiki/core] Both `theme` and `themes` are provided. `themes` will be treated as the source of truth.',
      );
    }
    if (
      typeof options.defaultColor === 'string' &&
      options.themes &&
      !options.themes[options.defaultColor]
    ) {
      console.warn(
        `[@cmshiki/shiki/core] \`defaultColor: "${options.defaultColor}"\` is not a key in \`themes\`. Available keys: ${Object.keys(options.themes).join(', ')}`,
      );
    }
  }

  const shikiInternalCore = await initShikiCore(options);

  return shikiPlugin(shikiInternalCore, options, initShikiCore);
}
