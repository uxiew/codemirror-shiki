
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Assuming createEditor from simple.ts is exported via ../src (e.g., from an index.ts)
import { createEditor as createSimpleEditor, type SimpleEditor } from '../src/simple'; 
import type { Position } from 'codejar';

const hasShikiHighlightingApplied = (editorEl: HTMLElement | undefined): boolean => {
    if (!editorEl) return false;
    const preElement = editorEl.querySelector('pre.shiki');
    if (!preElement) return false;
    return !!preElement.querySelector('span[style*="color"]');
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const DEBOUNCE_TIME = 250; // Must match simple.ts

describe('ShikiEditor (simple.ts) Performance Optimizations', () => {
    let editorApi: SimpleEditor;
    let hostElement: HTMLElement;

    beforeEach(() => {
        vi.useFakeTimers();
        hostElement = document.createElement('div');
        document.body.appendChild(hostElement);
    });

    afterEach(async () => {
        if (editorApi && editorApi.destroy) {
            await editorApi.destroy(); // Assuming destroy might be async or shiki.dispose is
        }
        if (hostElement && hostElement.parentNode) {
            hostElement.parentNode.removeChild(hostElement);
        }
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('should not highlight on every input within debounce window, only after', async () => {
        editorApi = await createSimpleEditor(hostElement, { 
            lang: 'javascript', 
            theme: 'github-light', 
            code: 'let a = 1;' 
        });

        // Initial highlight for "let a = 1;" will be scheduled.
        // Let all initial timers run to get a clean state after initial setup and highlight.
        await vi.runAllTimersAsync();
        expect(hasShikiHighlightingApplied(hostElement)).toBe(true);
        expect(hostElement.textContent).toBe('let a = 1;');

        // Now, test debouncing for subsequent changes
        // Reset innerHTML to plain text to clearly see the new highlight's effect
        const preElement = hostElement.querySelector('pre');
        if (preElement) { // It should exist after shiki highlighting
            preElement.innerHTML = `<code>${editorApi.toString()}</code>`; // Reset to plain code
        }
        expect(hasShikiHighlightingApplied(hostElement)).toBe(false); // Confirm it's reset

        editorApi.updateCode('let b = 2;'); // Change 1
        editorApi.updateCode('let c = 3;'); // Change 2, quickly after

        // Should not be highlighted to "let c = 3;" yet
        expect(hasShikiHighlightingApplied(hostElement)).toBe(false); 

        vi.advanceTimersByTime(DEBOUNCE_TIME - 50); // Just before debounce triggers
        expect(hasShikiHighlightingApplied(hostElement)).toBe(false);

        vi.advanceTimersByTime(100); // Total DEBOUNCE_TIME + 50, well past 250ms for "let c = 3;"
        // Now it should be highlighted
        expect(hasShikiHighlightingApplied(hostElement)).toBe(true);
        expect(hostElement.textContent).toBe('let c = 3;');
    });

    it('should preserve cursor position after debounced highlight', async () => {
        editorApi = await createSimpleEditor(hostElement, { 
            lang: 'javascript', 
            theme: 'github-light', 
            code: 'one two three' 
        });
        await vi.runAllTimersAsync(); // Initial highlight

        const targetSelection: Position = { start: 4, end: 7, dir: 'ltr' }; // Selects "two"
        editorApi.restoreSelection(targetSelection);
        expect(editorApi.saveSelection()).toEqual(targetSelection);

        // Trigger a change that schedules a highlight.
        // updateCode will call the highlighter callback which is debounced.
        // The highlighter itself (_performActualHighlight) saves/restores selection.
        editorApi.updateCode('one NEW two three'); 
        
        // After updateCode, CodeJar might move the cursor (e.g., to the end of "NEW").
        // Let's set it again to where we want it to be *when the highlight runs*.
        // The text "two" is now at a new position: "one NEW ".length = 8. "two" is at index 8.
        const newTargetPos = 8;
        const newTargetSelection: Position = { start: newTargetPos, end: newTargetPos + 3, dir: 'ltr'}; // "two"
        editorApi.restoreSelection(newTargetSelection);
        expect(editorApi.saveSelection()).toEqual(newTargetSelection);


        await vi.runAllTimersAsync(); // Allow debounced highlight to execute

        // Check if selection is preserved by _performActualHighlight's save/restore.
        expect(editorApi.saveSelection()).toEqual(newTargetSelection);
        expect(hasShikiHighlightingApplied(hostElement)).toBe(true);
    });

    it('should update content correctly and highlight eventually after rapid input', async () => {
        editorApi = await createSimpleEditor(hostElement, { 
            lang: 'javascript', 
            theme: 'github-light', 
            code: '' 
        });
        await vi.runAllTimersAsync(); // Initial setup

        const preElement = hostElement.querySelector('pre');
        if (preElement) {
             preElement.innerHTML = `<code></code>`; // Start with no highlight classes
        }
        expect(hasShikiHighlightingApplied(hostElement)).toBe(false);

        editorApi.updateCode('a');
        editorApi.updateCode('ab');
        editorApi.updateCode('abc');

        expect(editorApi.toString()).toBe('abc'); // Content should update synchronously
        
        // Highlight should not have happened yet for "abc" due to debouncing
        expect(hasShikiHighlightingApplied(hostElement)).toBe(false);

        await vi.runAllTimersAsync(); // Allow debounced highlight to occur

        expect(hasShikiHighlightingApplied(hostElement)).toBe(true);
        expect(hostElement.textContent).toBe('abc');
    });
    
    // Original basic test, adapted to new setup
    it('original: update content', async () => {
        editorApi = await createSimpleEditor(hostElement, { 
            lang: 'python', 
            theme: 'one-dark-pro', 
            code: 'console.log("Hello, World!")' 
        });
        await vi.runAllTimersAsync();

        editorApi.updateCode('print("Hello, Python!")');
        expect(editorApi.toString()).toBe('print("Hello, Python!")');
        
        await vi.runAllTimersAsync(); // Allow highlight to apply
        expect(hasShikiHighlightingApplied(hostElement)).toBe(true);
    });
});
