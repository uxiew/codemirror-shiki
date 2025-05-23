import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { cmEditor, update as updateDemoEditor, getTheme } from './demo' // Renamed 'update' to avoid conflict
import { themeCompartment, shikiToCodeMirror, configsFacet, type Options as ShikiOptions } from '../src'; // Added imports

// Helper function to introduce delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to check for Shiki-like decorations
const hasShikiDecorations = (view: EditorView): boolean => {
    const shikiOptions = view.state.facet(configsFacet);
    const prefix = shikiOptions.cssVariablePrefix || '--cm-'; // Use Shiki's configured prefix or a common default

    // Check if contentDOM is available (it might not be in some test environments or if view is destroyed)
    if (!view.contentDOM) {
        return false;
    }

    for (const line of view.contentDOM.querySelectorAll('.cm-line')) {
        for (const span of line.querySelectorAll('span')) {
            if (span.style.cssText.includes(prefix)) {
                return true;
            }
        }
    }
    return false;
};

// Helper to generate dummy code
const generateCode = (lines: number): string => {
    let code = '';
    for (let i = 0; i < lines; i++) {
        code += `console.log("This is line number ${i}");\n`;
    }
    return code;
};


describe(`shikiWithCodeMirror's themes change`, () => {
    it('codemirror init default theme', () => {
        const dom = cmEditor.dom
        expect(dom.className.includes('cm-editor')).toBe(true);

        // Note: Default styles might be affected by other tests if cmEditor is shared and modified.
        // For more robust style testing, consider creating fresh editor instances.
        // However, these existing tests seem to rely on cmEditor from demo.
        expect(window.getComputedStyle(dom).color).toBe('rgb(36, 41, 46)')
        expect(window.getComputedStyle(dom).backgroundColor).toBe('rgb(255, 255, 255)')
    });

    it('change theme to dark', async () => {
        const dom = cmEditor.dom
        await updateDemoEditor({ // Use renamed updateDemoEditor
            defaultColor: 'dark'
        })

        cmEditor.dispatch({
            effects: themeCompartment.reconfigure(getTheme(`dark`))
        })

        expect(window.getComputedStyle(dom).backgroundColor).toBe('rgb(36, 41, 46)')
    });
});

// Import vi for spy and timer control
import { vi } from 'vitest';
// Import ShikiView to spy on its prototype (ensure ShikiView is exported from viewPlugin.ts)
import { ShikiView } from '../src/viewPlugin'; 

describe('Debounce and Asynchronous Highlighting Logic', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks(); // Cleans up spies and timers
        vi.useRealTimers();
    });

    it('should only call _performHighlight once after multiple changes within debounce window', async () => {
        const performHighlightSpy = vi.spyOn(ShikiView.prototype, '_performHighlight');
        const { shiki: shikiExtension } = await shikiToCodeMirror({
            lang: 'javascript', themes: { light: 'github-light' }, cssVariablePrefix: '--debounce-test1-'
        });
        const view = new EditorView({
            state: EditorState.create({ doc: '', extensions: [shikiExtension] }),
            parent: document.body,
        });

        view.dispatch({ changes: { from: 0, insert: 'a' } }); // doc: "a"
        view.dispatch({ changes: { from: 1, insert: 'b' } }); // doc: "ab"
        
        // Advance timer by less than debounceTimeMs (250ms in ShikiView)
        vi.advanceTimersByTime(100); 
        expect(performHighlightSpy).not.toHaveBeenCalled();

        // Advance timer past the debounce threshold
        vi.advanceTimersByTime(150); // Total 250ms
        expect(performHighlightSpy).toHaveBeenCalledTimes(1);
        
        // Check that the argument to _performHighlight has the latest doc
        const lastCallArgs = performHighlightSpy.mock.calls[0];
        const viewUpdateArg = lastCallArgs[0] as ViewUpdate; // Type assertion for safety
        expect(viewUpdateArg.state.doc.toString()).toBe('ab');

        // Ensure decorations are applied (optional, but good for sanity)
        // Need to use real timers for async rendering part of _performHighlight
        vi.useRealTimers(); 
        await wait(300); // Allow async part of _performHighlight to complete and render
        expect(hasShikiDecorations(view)).toBe(true);
        vi.useFakeTimers(); // Restore fake timers if more fake timer based assertions follow

        view.destroy();
    });

    it('should call _performHighlight again for changes after debounce window', async () => {
        const performHighlightSpy = vi.spyOn(ShikiView.prototype, '_performHighlight');
        const { shiki: shikiExtension } = await shikiToCodeMirror({
            lang: 'javascript', themes: { light: 'github-light' }, cssVariablePrefix: '--debounce-test2-'
        });
        const view = new EditorView({
            state: EditorState.create({ doc: '', extensions: [shikiExtension] }),
            parent: document.body,
        });

        view.dispatch({ changes: { from: 0, insert: 'a' } }); // doc: "a"
        vi.advanceTimersByTime(300); // Past debounce window (250ms)
        expect(performHighlightSpy).toHaveBeenCalledTimes(1);
        let viewUpdateArg = performHighlightSpy.mock.calls[0][0] as ViewUpdate;
        expect(viewUpdateArg.state.doc.toString()).toBe('a');

        view.dispatch({ changes: { from: 1, insert: 'b' } }); // doc: "ab"
        vi.advanceTimersByTime(300); // Past debounce window again
        expect(performHighlightSpy).toHaveBeenCalledTimes(2);
        viewUpdateArg = performHighlightSpy.mock.calls[1][0] as ViewUpdate;
        expect(viewUpdateArg.state.doc.toString()).toBe('ab');
        
        vi.useRealTimers();
        await wait(300);
        expect(hasShikiDecorations(view)).toBe(true); // Check after the second highlight call
        vi.useFakeTimers();

        view.destroy();
    });
    
    it('should process the latest ViewUpdate when multiple changes occur within debounce window', async () => {
        const performHighlightSpy = vi.spyOn(ShikiView.prototype, '_performHighlight');
        const { shiki: shikiExtension } = await shikiToCodeMirror({
            lang: 'javascript', themes: { light: 'github-light' }, cssVariablePrefix: '--debounce-test3-'
        });
        const view = new EditorView({
            state: EditorState.create({ doc: 'Initial', extensions: [shikiExtension] }),
            parent: document.body,
        });

        view.dispatch({ changes: { from: 7, insert: ' Content A' } }); // Doc: "Initial Content A"
        const firstChangeDoc = view.state.doc.toString(); 
        
        view.dispatch({ changes: { from: 17, insert: ' And B' } }); // Doc: "Initial Content A And B"
        const secondChangeDoc = view.state.doc.toString();

        vi.advanceTimersByTime(300); // Trigger debounce (past 250ms)

        expect(performHighlightSpy).toHaveBeenCalledTimes(1);
        const viewUpdateArg = performHighlightSpy.mock.calls[0][0] as ViewUpdate;
        expect(viewUpdateArg.state.doc.toString()).toBe(secondChangeDoc);
        expect(viewUpdateArg.state.doc.toString()).not.toBe(firstChangeDoc);

        vi.useRealTimers();
        await wait(300);
        expect(hasShikiDecorations(view)).toBe(true);
        vi.useFakeTimers();
        
        view.destroy();
    });
});

describe(`shikiWithCodeMirror's options update`, () => {
    it(`option update correctly`, async () => {
        const dom = cmEditor.dom
        await updateDemoEditor({ // Use renamed updateDemoEditor
            lang: 'vue',
        })

        // Ensure Shiki has had a chance to apply new language styles
        await wait(300); // Wait for debounce and async highlighting

        expect(hasShikiDecorations(cmEditor)).toBe(true); // General check for Shiki styles
        // The specific style check below is good but can be brittle if theme details change.
        // Consider making it more general or ensuring the theme provides these exact variables.
        const spanWithStyle = dom.querySelector('.cm-line span[style]') as HTMLElement;
        if (spanWithStyle) {
            expect(spanWithStyle.style.cssText).toMatch(/var\(--test-cm-(dark|light|dim)/);
        }


        await updateDemoEditor({ // Use renamed updateDemoEditor
            defaultColor: 'dim',
        })
        await wait(300); // Wait for debounce and theme application

        expect(window.getComputedStyle(cmEditor.dom).color).toBe('rgb(225, 228, 232)')
    });
});

describe('Performance and Responsiveness Stress Tests', () => {
    it('should remain stable and update content correctly after rapid input', async () => {
        const { shiki: shikiExtension } = await shikiToCodeMirror({ 
            lang: 'javascript',
            themes: { light: 'github-light', dark: 'github-dark' }, // Provide themes
            cssVariablePrefix: '--stress-cm-' // Custom prefix for this test
        });
        const view = new EditorView({
            state: EditorState.create({ doc: '', extensions: [shikiExtension] }),
            parent: document.body, // Required for contentDOM
        });

        let expectedContent = '';
        const numInserts = 20;
        const textPerInsert = 'textN ';

        for (let i = 0; i < numInserts; i++) {
            const currentText = textPerInsert.replace('N', i.toString());
            expectedContent += currentText;
            view.dispatch({
                changes: { from: view.state.doc.length, insert: currentText }
            });
        }

        expect(view.state.doc.toString()).toBe(expectedContent);
        
        await wait(500); // Wait for debounced highlighting (debounce is 250ms)

        expect(hasShikiDecorations(view)).toBe(true);

        view.destroy();
    });

    it('should handle large content and subsequent changes correctly', async () => {
        const { shiki: shikiExtension } = await shikiToCodeMirror({
            lang: 'javascript',
            themes: { light: 'github-light', dark: 'github-dark' },
            cssVariablePrefix: '--large-cm-'
        });
        
        const largeContent = generateCode(500); // 500 lines
        const view = new EditorView({
            state: EditorState.create({ doc: largeContent, extensions: [shikiExtension] }),
            parent: document.body,
        });

        expect(view.state.doc.toString()).toBe(largeContent);
        // Adjusted to reflect observed behavior where content ending with \n counts as N+1 lines.
        expect(view.state.doc.lines).toBe(501);

        const insertAtStart = "/* start */\n";
        const insertAtEnd = "\n/* end */";
        
        // Get the state before making changes to correctly apply multiple changes simultaneously
        const stateBeforeChanges = view.state;
        view.dispatch(stateBeforeChanges.update({
            changes: [
                { from: 0, insert: insertAtStart },
                // 'from' for the second change should be relative to the document state *before* this transaction started
                { from: stateBeforeChanges.doc.length, insert: insertAtEnd } 
            ]
        }));

        const expectedContentAfterChange = insertAtStart + largeContent + insertAtEnd;
        expect(view.state.doc.toString()).toBe(expectedContentAfterChange);
        
        await wait(500); // Wait for debounced highlighting

        expect(hasShikiDecorations(view)).toBe(true);

        view.destroy();
    });
});

