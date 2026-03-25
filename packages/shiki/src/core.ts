import type { Options } from './types/types';
import { initShikiCore } from './init-core';
import { createShikiToCodeMirror } from './create-shiki-to-codemirror';

export * from './types/types';
export {
  createCachedLangResolver,
  createCachedThemeResolver,
  createHighlighterManager,
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
  return createShikiToCodeMirror(
    '[@cmshiki/shiki/core]',
    shikiOptions,
    initShikiCore,
  );
}
