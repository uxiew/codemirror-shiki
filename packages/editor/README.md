# ShikiEditor

[WIP]!

ShikiEditor is a code editor. It's based on codemirror and shiki. If you're looking for a lightweight code editor with syntax highlighting similar to vscode, then this one's for you. It relies on @cmshiki/shiki.

## Usage

```ts
import { ShikiEditor } from '@cmshiki/editor';

const editor = new ShikiEditor({
  doc: 'console.log("Hello, world!");'
});

editor.mount('#container');

editor.setValue('console.log("Hello, world!");');
```
