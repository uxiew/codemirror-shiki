import type {
  CodeMirrorConfigKeys,
  ShikiConfigKeys,
  CMEditorOptions,
  ShikiEditorOptions,
  ThemeRegistry,
} from './types';
import type { Options } from '@cmshiki/shiki';

export function partitionOptions<TThemes extends ThemeRegistry = ThemeRegistry>(
  options: ShikiEditorOptions<TThemes>,
) {
  const ShikiKeys: ShikiConfigKeys[] = [
    'lang',
    'langAlias',
    'theme',
    'themes',
    'themeStyle',
    'includeExplanation',
    'cssVariablePrefix',
    'colorReplacements',
    'warnings',
    'tokenizeMaxLineLength',
    'tokenizeTimeLimit',
    'defaultColor',
    'engine',
    'highlighter',
  ];
  const CodeMirrorKeys: CodeMirrorConfigKeys[] = [
    'extensions',
    'parent',
    'state',
    'selection',
    'dispatch',
    'dispatchTransactions',
    'root',
    'scrollTo',
    'doc',
    'onDocChanged',
  ];

  function filter<T extends keyof ShikiEditorOptions<TThemes>>(keys: T[]) {
    return Object.fromEntries(
      Object.entries(options).filter(([key]) => keys.includes(key as T)),
    ) as T extends keyof Options<TThemes> ? Options<TThemes> : CMEditorOptions;
  }

  return {
    shikiOptions: filter(ShikiKeys),
    CodeMirrorOptions: filter(CodeMirrorKeys),
  };
}
