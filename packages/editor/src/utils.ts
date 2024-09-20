import type { CodeMirrorConfigKeys, ShikiConfigKeys, CMEditorOptions, ShikiEditorOptions } from "./types";
import type { Options } from "@cmshiki/shiki";

export function partitionOptions(options: ShikiEditorOptions) {
    const ShikiKeys: ShikiConfigKeys[] = [
        'lang',
        'langAlias',
        'theme',
        'themes',
        'themeStyle',
        'includeExplanation',
        'cssVariablePrefix',
        'colorReplacements',
        'warnings',
        'tokenizeMaxLineLength',
        'tokenizeTimeLimit',
        'defaultColor'
    ]
    const CodeMirrorKeys: CodeMirrorConfigKeys[] = [
        'extensions',
        'parent',
        'state',
        'selection',
        'dispatch',
        'dispatchTransactions',
        'root',
        'scrollTo',
        'doc',
        'onUpdate'
    ]

    function filter<T extends keyof ShikiEditorOptions>(keys: T[]) {
        return Object.fromEntries(Object.entries(options).filter(([key]) => keys.includes(key as T))) as (T extends keyof Options ? Options : CMEditorOptions)
    }

    return {
        shikiOptions: filter(ShikiKeys),
        CodeMirrorOptions: filter(CodeMirrorKeys)
    }

}