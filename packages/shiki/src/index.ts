import type { Options } from './types/types';
import { initShiki } from './init';
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
 * integrate the Shiki highlighter to CodeMirror
 * @param { Highlighter } highlighter Shiki Highlighter instance
 * @param  { GenerateOptions } options
 */
export async function shikiToCodeMirror(shikiOptions: Options) {
  return createShikiToCodeMirror('[@cmshiki/shiki]', shikiOptions, initShiki);
}
