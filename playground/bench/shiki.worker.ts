import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { exposeTokenizer } from '../../packages/shiki/src/worker';

// The bench page passes `lang|theme|engine` as the worker name.
const [lang = 'javascript', theme = 'github-dark', engine = 'oniguruma'] = (
  self.name || ''
).split('|');

exposeTokenizer(async () =>
  createHighlighterCore({
    langs: [(await import(`../node_modules/tm-grammars/grammars/${lang}.json`)).default],
    themes: [(await import(`../node_modules/tm-themes/themes/${theme}.json`)).default],
    engine:
      engine === 'javascript'
        ? createJavaScriptRegexEngine()
        : createOnigurumaEngine(() => import('shiki/wasm')),
  }),
);
