
import { type EditorView } from '@codemirror/view';
import { StyleModule, type StyleSpec } from 'style-mod';

export * from "style-mod"


/**
 * get editor root dom's classList
 * 
 * @param {EditorView} view editor instance  
 */
export function classList(view: EditorView) {
    return view.dom.classList
}

/**
 * Gets a list of class names for the editor view.
 * Returns a list of class names
 * 
 * @param view editor instance 
 * @returns  `[baseId, darkThemeId/lightId, themeId]`
 */
export function getClasses(view: EditorView) {
    return view.themeClasses.split(' ').filter(id => !!id.trim())
    // [baseId,baseDarkID : baseLightID, mainId]
}

/**
 *  Mounts a style to codemirror editor root view.
 *  multiple calls, cause multiple mounts styles.
 * 
 *  @param view - editor instance 
 *  @param spec - a style specification object that defines selectors and corresponding styles
 *  @param scopes - Optional scope records, Used to handle a particular style selector replacement
 */
export function mountStyles(view: EditorView, spec: {
    [selector: string]: StyleSpec;
}, scopes?: Record<string, string>) {
    return StyleModule.mount(view.root, new StyleModule(spec, {
        finish(sel) {
            const main = `.` + getClasses(view)[0]
            return /&/.test(sel) ? sel.replace(/&\w*/, m => {
                if (m == "&") return main
                if (!scopes || !scopes[m]) throw new RangeError(`Unsupported selector: ${m}`)
                return scopes[m]
            }) : main + " " + sel
        }
    }))
}



export function unmountStyles(view: EditorView, id: string) {

}