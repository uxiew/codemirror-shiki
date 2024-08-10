import { Compartment, Extension } from "@codemirror/state";
import type {
    ResultData,
    ShikiToCMOptions,
} from "./types/types";
import { EditorView } from "@codemirror/view";
import {
    createTheme,
} from "@cmshiki/utils";


export const themeCompartment = new Compartment

type ThemeData = Required<ResultData>['data']

export class Theme {

    private allThemes: ThemeData['allThemes']
    private registeredIds: ThemeData['registeredIds']
    private currentTheme = 'light'
    private defaultTheme = EditorView.baseTheme({})

    /** determines whether the theme style of the current option is `cm` or not */
    get isCmStyle() {
        return this.options.themeStyle === 'cm'
    }

    static init(data: ThemeData, options: ShikiToCMOptions) {
        return new Theme(data, options)
    }

    getTheme(name: string) {
        const theme = this.allThemes?.find(t => (t.theme === name))
        if (!theme) throw new Error(`[@cmshiki/shiki] ` + `theme ${name} not found`)
        return theme
    }

    /** 
     *  default theme extension
     */
    of() {
        const { defaultColor } = this.options
        if (defaultColor === false) {
            return themeCompartment.of(this.defaultTheme)
        }
        // init current theme
        this.currentTheme = defaultColor || 'light'
        const themeExtension = createTheme(this.getTheme(this.currentTheme))

        return [themeCompartment.of(themeExtension)]
    }


    constructor(private themeData: ThemeData, private options: ShikiToCMOptions, public view?: EditorView) {
        this.allThemes = themeData.allThemes
        this.registeredIds = themeData.registeredIds
    }

    // constructor(private shikiWorker: Worker, private options: ShikiToCMOptions, public view?: EditorView) {
    // }

}