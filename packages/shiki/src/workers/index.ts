// web worker

import {
    codeToTokens,
    type CodeToTokensOptions
} from "@shikijs/core"

import { ShikiHighlighter } from "./highlighter"
import { getShikiInternal } from "./shiki"
import type {
    ShikiToCMOptions,
    Highlighter,
    MessageEventData
} from "../types/types"


let fulfil_ready: (arg?: unknown) => void
const ready = new Promise((f) => {
    fulfil_ready = f;
});

let highlighter: ShikiHighlighter
let options: ShikiToCMOptions | undefined
let shikiMiniCore: Highlighter | undefined

globalThis.addEventListener('message', async (e: MessageEventData) => {
    const { data } = e

    if (typeof data.code?.id === 'number') {
        await ready;
        if (typeof shikiMiniCore === 'undefined') throw new Error('Shiki not initialized')
        const tokensResult = codeToTokens(shikiMiniCore, data.code?.text, options as CodeToTokensOptions)
        postMessage({
            type: 'highlight',
            id: data.code.id,
            from: data.code.from,
            to: data.code.to,
            tokensResult
        })
    }

    switch (data.type) {
        case 'init': {
            fulfil_ready();
            options = data.options
            if (options) {
                shikiMiniCore = await getShikiInternal(options)
                highlighter = new ShikiHighlighter(shikiMiniCore, options)
            }
            postMessage({
                type: data.type,
                data: highlighter.loadThemes()
            })
        } break;
        case 'update': {
            await ready;
            options = data.options
            // TODO Options
            highlighter.update(options!)
        } break;
    }
})