import { Text } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";

import type {
    MessageEventData,
    ResultData,
    ShikiToCMOptions,
    CmSkUpdateOptions,
    HighlightParams,
} from "./types/types";
import { mountStyles, StyleModule } from "@cmshiki/utils";
import { toStyleObject } from "./utils";
import { getTokenStyleObject, stringifyTokenStyle } from "@shikijs/core";


interface ShikiWorker {
    worker: Worker;
    on: (cb: any) => void;
    post: (data: any) => void;
    do: (data: any) => Promise<ResultData>;
}


export class HighlightWorker {

    private shikiWorker: ShikiWorker
    private queue: Array<{ id: number, resolve: (value: any) => void }> = [];
    private currentId = 0;


    private initWorker(url: string, options: ShikiToCMOptions) {
        const _worker = new Worker(new URL(url, import.meta.url), {
            type: "module",
            name: "HighlightWorker",
        })

        let listeners: ((arg: ResultData) => any)[] = []

        const on = (cb: (arg: ResultData) => void) => {
            listeners.push(cb)
            _worker.addEventListener('message', (e) => {
                listeners.forEach(evt => {
                    evt(e.data)
                });

                if ((e.data as ResultData).type === 'highlight') {
                    this.handleMessage(e.data)
                }
            })
        }

        // shikiWorker.onerror = (e) => {
        //     // console.error(shikiWorker.name, e)
        //     listeners = []
        // }
        /**
         * webworker postMessage
         */
        function post(data: MessageEventData['data']) {
            _worker.postMessage(data)
        }

        function process(data: MessageEventData['data']): Promise<ResultData> {
            post(data)
            return new Promise((resolve, reject) => {
                on((e) => {
                    if (e.type === data.type) {
                        resolve(e)
                    }
                })
            })
        }

        return {
            worker: _worker,
            on,
            post,
            do: process,
            // TODO 插件错误，销毁当前的 worker
            dead() {
                _worker.terminate()
                // @ts-expect-error clear listeners
                listeners = null, shikiWorker = null
            }
        }
    }

    init() {
        /** worker message */
        return this.shikiWorker.do({
            type: 'init',
            options: this.options
        }) as Promise<ResultData>
    }


    constructor(workerUrl: string, private options: ShikiToCMOptions) {
        this.shikiWorker = this.initWorker(workerUrl, options)
    }

    update(options: CmSkUpdateOptions) {
        this.options = {
            ...this.options,
            ...options
        }
        this.shikiWorker.post({
            type: 'update',
            options: this.options
        })
    }


    handleTokens(
        data: ResultData['tokensResult'], from: number, to: number,
        postActions: HighlightParams['postActions']
    ) {
        const { themeStyle, defaultColor, cssVariablePrefix, } = this.options
        const { buildDeco, handleStyles } = postActions
        const isCmStyle = themeStyle === 'cm'

        // const { data: { tokensInfo: { tokens, fg = '', bg = '', rootStyle = '' } } } = await this.shikiWorker.do({
        //     type: 'highlight',
        //     doc: {
        //         code: code.sliceString(from, to),
        //         from,
        //         to
        //     }
        // })
        const { tokens, fg = '', bg = '', rootStyle = '' } = data!
        let pos = from;

        // this.themeCache.get
        let cmClasses: Record<string, string> = {};

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
                            [isCmStyle ? 'class' : 'style']:
                                isCmStyle ? cmClasses[style] : style,
                        },
                    })
                )
                pos = to;
            })
            pos++; // 为换行符增加位置
        })

        handleStyles({ classes: cmClasses })
    }

    highlight(
        code: HighlightParams['code'],
        postActions: HighlightParams['postActions']
    ): Promise<any> {
        code.text = (code.text as Text).sliceString(code.from, code.to)
        return new Promise((resolve: (value: ResultData) => void) => {
            const id = this.currentId++;
            this.queue.push({ id, resolve });
            this.shikiWorker.post({ code: { id, ...code } });
        }).then((res) => {
            // after get tokensResult
            return this.handleTokens(res.tokensResult, code.from, code.to, postActions)
        })
    }

    private handleMessage(data: ResultData) {
        const queueItem = this.queue.find(item => item.id === data.id);
        if (queueItem) {
            queueItem.resolve(data);
            this.queue.splice(this.queue.indexOf(queueItem), 1);
        }
    }
}
