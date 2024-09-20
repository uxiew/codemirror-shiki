import { Text } from "@codemirror/state"
import { Decoration, EditorView } from "@codemirror/view"
import {
    getTokenStyleObject,
    stringifyTokenStyle,
    codeToTokens,
    type GrammarState,
    type CodeToTokensOptions,
} from '@shikijs/core'
import {
    mountStyles, StyleModule,
} from "@cmshiki/utils"

import type {
    Highlighter,
    ShikiToCMOptions,
} from "./types/types"
import { toStyleObject } from "./utils"
import { Base } from "./base"

export class ShikiHighlighter extends Base {
    view!: EditorView

    constructor(shikiCore: Highlighter, options: ShikiToCMOptions) {
        super(shikiCore, options)
    }

    setView(view: EditorView) {
        this.view = view
        return this
    }

    // getLastGrammarState(preCode: string) {
    // }

    private codeToTokens(code: string) {
        return codeToTokens(this.shikiCore, code, this.configs as CodeToTokensOptions)
    }

    /**
    * add highlighting to text
    *
    * @param doc content text
    * @param from text start
    * @param to text end
    * @returns `{ decorations }` an object that contains decorative information
    */
    highlight(doc: Text, from: number, to: number, buildDeco: (from: number, to: number, mark: Decoration) => void, preState?: GrammarState) {
        const { cssVariablePrefix, defaultColor } = this.configs
        const content = doc.sliceString(from, to);
        const { tokens } = this.codeToTokens(content)
        let pos = from;

        // this.themeCache.get
        let cmClasses: Record<string, string> = {};

        // add lang tag
        this.view!.dom.classList.toggle('lang-' + this.configs.lang)
        tokens.forEach((lines) => {
            lines.forEach((token) => {
                let style = (token.htmlStyle || stringifyTokenStyle(getTokenStyleObject(token)))
                    .replace(/color/g, cssVariablePrefix + defaultColor);

                ['font-style', 'font-weight', 'text-decoration'].forEach((s) => {
                    style = style.replace(new RegExp(`;` + s, 'g'), `;${cssVariablePrefix + defaultColor}-${s}`)
                });

                // dedupe and cache the style
                cmClasses[style] = cmClasses[style] || StyleModule.newName()

                let to = pos + token.content.length;
                // build decoration
                buildDeco(
                    pos,
                    to,
                    Decoration.mark({
                        tagName: 'span',
                        attributes: {
                            [this.isCmStyle ? 'class' : 'style']:
                                this.isCmStyle ? cmClasses[style] : style,
                        },
                    })
                )
                pos = to;
            })
            pos++; // 为换行符增加位置
        })

        if (this.isCmStyle) {
            Object.entries(cmClasses).forEach(([k, v]) => {
                mountStyles(this.view!, {
                    [`& .cm-line .${v}`]: toStyleObject(k)
                })
            })
        }

    }

}