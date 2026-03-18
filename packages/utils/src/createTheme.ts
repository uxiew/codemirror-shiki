import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { type StyleSpec } from 'style-mod';

interface Nothing {
}
/**
 * type StringLiteralUnion<'foo'> = 'foo' | string
 * This has auto completion whereas `'foo' | string` doesn't
 * Adapted from https://github.com/microsoft/TypeScript/issues/29729
 */
type StringLiteralUnion<T extends U, U = string> = T | (U & Nothing);

export interface CreateThemeOptions {
    /**
     * Theme inheritance. Determines which styles CodeMirror will apply by default.
     */
    theme: 'light' | 'dark';
    /**
     * Settings to customize the look of the editor, like background, gutter, selection and others.
     */
    settings: ThemeSettings;

    /**
     * other custom classes
     */
    classes?: { [selector: string]: StyleSpec; }
}

export interface ThemeSettings {
    /** Editor background color. */
    background?: string;
    /** Editor background image. */
    backgroundImage?: string;
    /** Default text color. */
    foreground?: string;
    /** Cursor Caret color. */
    caret?: string;
    /** Selection background. */
    selection?: string;
    /** Selection match background. */
    selectionMatch?: string;
    /** Background of highlighted lines. */
    lineHighlight?: string;
    /** Gutter background. */
    gutterBackground?: string;
    /** Text color inside gutter. */
    gutterForeground?: string;
    /** Text active color inside gutter. */
    gutterActiveForeground?: string;
    /** Gutter right border color. */
    gutterBorder?: string;
    /** set editor font */
    fontFamily?: string;
    /** set editor font size */
    fontSize?: StyleSpec['fontSize'];
}

export const createTheme = ({ theme, settings, classes }: CreateThemeOptions): Extension => {
    settings = {
        // default settings
        caret: '#FFFFFF',
        // Note: selection default is now handled in base.ts with theme-aware colors
        ...settings,
    }
    let themeOptions: Record<string, StyleSpec> = {
        '.cm-gutters': {},
    };
    const baseStyle: StyleSpec = {};
    if (settings.background) {
        baseStyle.backgroundColor = settings.background;
    }
    if (settings.backgroundImage) {
        baseStyle.backgroundImage = settings.backgroundImage;
    }
    if (settings.foreground) {
        baseStyle.color = settings.foreground;
    }
    if (settings.fontSize) {
        baseStyle.fontSize = settings.fontSize;
    }
    if (settings.background || settings.foreground) {
        themeOptions['&'] = baseStyle;
    }

    if (settings.fontFamily) {
        themeOptions['&.cm-editor .cm-scroller'] = {
            fontFamily: settings.fontFamily,
        };
    }
    if (settings.gutterBackground) {
        themeOptions['.cm-gutters'].backgroundColor = settings.gutterBackground;
    }
    if (settings.gutterForeground) {
        themeOptions['.cm-gutters'].color = settings.gutterForeground;
    }
    if (settings.gutterBorder) {
        themeOptions['.cm-gutters'].borderRightColor = settings.gutterBorder;
    }

    if (settings.caret) {
        themeOptions['.cm-content'] = {
            caretColor: settings.caret,
        };
        themeOptions['.cm-cursor, .cm-dropCursor'] = {
            borderLeftColor: settings.caret,
        };
    }
    let activeLineGutterStyle: StyleSpec = {};
    if (settings.gutterActiveForeground) {
        activeLineGutterStyle.color = settings.gutterActiveForeground;
    }

    // Build &.cm-editor styles as a single object to avoid overwriting
    const cmEditorStyle: StyleSpec = {};

    if (settings.lineHighlight) {
        cmEditorStyle["& .cm-activeLine"] = {
            backgroundColor: settings.lineHighlight,
        };
        activeLineGutterStyle.backgroundColor = settings.lineHighlight;
    }
    themeOptions['.cm-activeLineGutter'] = activeLineGutterStyle;

    if (settings.selection) {
        cmEditorStyle["& .cm-line"] = {
            "& ::selection, &::selection": { backgroundColor: settings.selection },
            "& span::selection": { backgroundColor: settings.selection },
        };
        cmEditorStyle["& .cm-selectionBackground, & .cm-selectionLayer .selectionBackground"] = {
            backgroundColor: settings.selection + ' !important',
        };
    }

    // Only add &.cm-editor if there are styles to apply
    if (Object.keys(cmEditorStyle).length > 0) {
        themeOptions['&.cm-editor'] = cmEditorStyle;
    }

    if (settings.selectionMatch) {
        themeOptions['& .cm-selectionMatch'] = {
            backgroundColor: settings.selectionMatch,
        };
    }

    // other custom classes
    if (classes) {
        themeOptions = {
            ...themeOptions,
            ...classes
        }
    }

    return EditorView.theme(themeOptions, {
        dark: theme === 'dark',
    });
};

export default createTheme;
