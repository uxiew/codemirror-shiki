import { type CreateThemeOptions } from "../../utils/src/createTheme"
import {
    type CmSkOptions,
} from "./types/types"


export function convertSpecificStyles(el: HTMLElement, properties: string[]) {
    properties.forEach(prop => {
        (el.style as any)[prop] = window.getComputedStyle(el).getPropertyValue(prop);
    });
    el.className = '';
    return el
}

/**
 * get color style string like shiki using multiple themes
 */
export function toStyleObject(styleStr: string, isBgStyle: boolean = false) {
    const Styles: Record<string, string> = {};

    styleStr.split(";").forEach((str, i) => {
        const [k, v] = str.split(":")
        if (k && v) {
            Styles[k] = v
        } else {
            if (isBgStyle) {
                Styles["background-color"] = k
            } else {
                Styles["color"] = k
            }
        }
    })

    return Styles
}

/**
 * get color style string like shiki using multiple themes
 */
export function createColorsStyle(options: CmSkOptions, cacheThemes: Map<string, CreateThemeOptions>) {
    // @ts-ignore
    const { theme, themes, defaultColor = false, cssVariablePrefix = '--shiki-' } = options
    let color = ''
    for (const [_, { theme, settings }] of cacheThemes) {
        color += `${cssVariablePrefix}${theme}:${settings.foreground};${cssVariablePrefix}${theme}-bg:${settings.background};`
    }
    // console.log(theme, themes, defaultColor, color);
    if (!defaultColor) {
        color = color.replace(`${cssVariablePrefix}light`, 'color')
            .replace(`${cssVariablePrefix}light-bg`, 'background-color')
    }
    return color
}


