# ShikiEditor

ShikiEditor is a code editor. It's based on CodeJar and Shiki. If you're looking for a lightweight code editor with syntax highlighting similar to VS Code, then this one's for you. It relies on `@cmshiki/shiki` for its Shiki integration when used in more complex CodeMirror 6 setups, but the `simple.ts` editor (often wrapped as `ShikiEditor`) provides a direct, lightweight CodeJar-based implementation.

## Usage

```ts
import { ShikiEditor } // Typically refers to the simple editor setup
  from '@cmshiki/editor'; // Or specific import for the simple editor if distinct

// Example assuming ShikiEditor wraps the simple editor from simple.ts
const editor = new ShikiEditor({ // Or: await createSimpleEditor(element, options)
  doc: 'Hello, world!',
  lang: 'javascript',
  theme: 'github-light'
});

editor.setValue('console.log("Hello, world!");');
```

## Features

The `ShikiEditor` (referring to the `simple.ts` CodeJar-based editor) provides a user-friendly coding experience with several key features:

-   **High-Quality Syntax Highlighting**: Leverages Shiki for accurate and beautiful syntax highlighting, similar to VS Code, across a wide variety of languages.
-   **Themeable**: Supports multiple themes, allowing users to customize the editor's appearance.
-   **Performance Optimizations for Highlighting**:
    *   **Debounced Updates**: The Shiki-based syntax highlighting (using `codeToHtml`) is debounced with a 250ms delay. This means highlighting doesn't run on every keystroke, only activating after a brief pause in typing, which significantly reduces processing load.
    *   **Cursor Position Preservation**: During highlighting updates, the editor carefully manages and restores the cursor position using `CodeJar.saveSelection` and `CodeJar.restoreSelection`. This prevents the common issue of the cursor jumping unexpectedly after content is re-highlighted.
    *   These optimizations lead to a smoother typing experience and improved perceived performance, especially when editing larger code blocks.
-   **Line Numbers**: Includes line number support via `codejar-linenumbers`.
