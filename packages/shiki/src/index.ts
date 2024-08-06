import { type Extension } from "@codemirror/state";
import {
    type Highlighter,
    type CmSkOptions,
} from "./types/types";
import {
    shikiPlugin,
} from "./plugin";
import defaultOptions from "./config";

export { type ShikiPluginActions } from "./plugin";
export { shikiViewPlugin } from "./viewPlugin";

/**
 * integrate the Shiki highlighter to CodeMirror
 * @param { Highlighter } highlighter Shiki Highlighter instance
 * @param  { GenerateOptions } options
 */
export async function shikiToCodeMirror(highlighter: Highlighter, options: CmSkOptions) {

    if (highlighter) {
        return await shikiPlugin(highlighter, {
            ...defaultOptions,
            ...options
        })
    } else {
        throw new Error("should provide shiki's highlighter!")
    }
}
