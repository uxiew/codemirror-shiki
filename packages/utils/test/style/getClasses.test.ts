import { getClasses } from "../../src/index";

// 假设我们有一个模拟的EditorView类
class MockEditorView {
    constructor(public themeClasses = '') {
    }
}

describe('style.getClasses', () => {
    it('should return an empty array when no themeClasses are set', () => {
        const view = new MockEditorView();
        const classes = getClasses(view);
        expect(classes).toEqual([]);
    });

    it('should return an array of classes when themeClasses are set', () => {
        const view = new MockEditorView('cm-theme cm-theme-dark cm-base');
        const classes = getClasses(view);
        expect(classes).toEqual(['cm-theme', 'cm-theme-dark', 'cm-base']);
    });

    it('should filter out empty strings from the classes', () => {
        const view = new MockEditorView('cm-theme  cm-theme-dark  cm-base ');
        const classes = getClasses(view);
        expect(classes).toEqual(['cm-theme', 'cm-theme-dark', 'cm-base']);
    });

    it('should handle themeClasses with leading/trailing spaces', () => {
        const view = new MockEditorView(' cm-theme cm-theme-dark cm-base ');
        const classes = getClasses(view);
        expect(classes).toEqual(['cm-theme', 'cm-theme-dark', 'cm-base']);
    });

    it('should handle themeClasses with multiple spaces between classes', () => {
        const view = new MockEditorView('cm-theme   cm-theme-dark  cm-base');
        const classes = getClasses(view);
        expect(classes).toEqual(['cm-theme', 'cm-theme-dark', 'cm-base']);
    });
});
