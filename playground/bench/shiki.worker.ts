import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { exposeTokenizer } from '../../packages/shiki/src/worker';

// Matches the bench page defaults.
const lang = 'javascript';
const theme = 'github-dark';

exposeTokenizer(async () =>
  createHighlighterCore({
    langs: [(await import(`../node_modules/tm-grammars/grammars/${lang}.json`)).default],
    themes: [(await import(`../node_modules/tm-themes/themes/${theme}.json`)).default],
    engine: createOnigurumaEngine(() => import('shiki/wasm')),
  }),
);
