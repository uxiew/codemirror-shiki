## Useage

```ts
// demo
const editor = new EditorView({
  doc: 'initial document content',
  parent: document.body,
  extensions: [
    cmshiki.of({
      lang: 'ts',
      theme: 'dark-plus',
      debounceTime: 100
    }),
    highlightPlugin
  ]
});
```
