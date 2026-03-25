import type { ShikiToCMOptions } from './types/types';

type DefaultOptions = Pick<
  ShikiToCMOptions,
  | 'lang'
  | 'warnings'
  | 'versionGuard'
  | 'themeStyle'
  | 'defaultColor'
  | 'cssVariablePrefix'
  | 'tokenizeMaxLineLength'
  | 'includeExplanation'
  | 'tokenizeTimeLimit'
>;

const defaultOptions: DefaultOptions = {
  lang: 'text',
  warnings: true,
  versionGuard: true,
  themeStyle: 'shiki', // Use inline styles instead of CSS classes
  defaultColor: 'light',
  cssVariablePrefix: '--shiki-',
  tokenizeMaxLineLength: 20000,
  includeExplanation: false,
  tokenizeTimeLimit: 500,
};

export default defaultOptions;
