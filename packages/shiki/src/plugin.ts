import { shikiViewPlugin } from './viewPlugin';
import type { Highlighter, ShikiToCMOptions } from './types/types';
import { themeCompartment } from './base';
import { type EditorView } from '@codemirror/view';
import { ShikiHighlighter } from './highlighter';

export const shikiPlugin = async (
  highlighter: Highlighter,
  ctOptions: ShikiToCMOptions,
) => {
  const shikiHighlighter = new ShikiHighlighter(highlighter, ctOptions);
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
      if (view) {
        shikiHighlighter.setView(view as EditorView);
      }
      return shikiHighlighter.getTheme(name);
    },
    shiki: [themeCompartment.of(initialTheme), viewPlugin],
  };
};
