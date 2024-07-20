# ShikiEditor

[WIP]
ShikiEditor is a code editor. It based on codemirror and shiki.
If you're looking for a code editor whose syntax highlighting is similar to vscode, but not as big as monaco, it's for you. Or use @cmshiki/core.

## Usage

```ts
import { editor } from '@cmshiki/editor';

const editor = new ShikiEditor({
  doc: 'console.log("Hello, world!");'
});

editor.mount('#container');

editor.setValue('console.log("Hello, world!");');
```
