import { EditorView } from "@codemirror/view";


export const cmEditor = new EditorView({
    doc: "Hi",
    parent: document.body,
});
