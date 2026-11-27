import { shikiViewPlugin } from './viewPlugin';
import type { Highlighter, ShikiToCMOptions, InitShikiFn } from './types/types';
import { themeCompartment } from './base';
import { ShikiHighlighter } from './highlighter';

export const shikiPlugin = async (
  highlighter: Highlighter,
  ctOptions: ShikiToCMOptions,
  initShikiFn?: InitShikiFn,
) => {
  const shikiHighlighter = new ShikiHighlighter(
    highlighter,
    ctOptions,
    initShikiFn,
  );
  const { viewPlugin } = shikiViewPlugin(shikiHighlighter, ctOptions);
  const initialTheme = shikiHighlighter.initTheme();

  return {
    /**
     * get theme
     *
     * @param { string } name `light\dark\...`
     * @returns { Extension } codemirror theme extension
     * @throws `xxxx theme not registered!`
     */
    getTheme(name?: string, view?: any) {
      if (!view) return shikiHighlighter.getTheme(name);
      // Each editor keeps its own theme. A view without this extension
      // (destroyed, or not created yet) only gets the theme extension.
      const owner = shikiHighlighter.ownerOf(view);
      return owner ? owner.getTheme(name) : shikiHighlighter.themeFor(name);
    },
    shiki: [themeCompartment.of(initialTheme), viewPlugin],
  };
};
