import type { Options as CMShikiOptions } from "@cmshiki/shiki"
import type { EditorViewConfig, ViewUpdate } from "@codemirror/view"

export type ShikiConfigKeys = keyof (CMShikiOptions)
export type CodeMirrorConfigKeys = keyof (CMEditorOptions)

export type CMEditorOptions = EditorViewConfig & {
    /** listen view change, doc change, viewport change, other view update */
    onUpdate?: (u: ViewUpdate) => void
}

export type ShikiEditorOptions = CMShikiOptions & CMEditorOptions
