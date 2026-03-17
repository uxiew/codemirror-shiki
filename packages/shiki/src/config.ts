import type {
    ShikiToCMOptions
} from "./types/types";

const defaultOptions: Omit<ShikiToCMOptions, 'themes'> = {
    lang: 'text',
    warnings: true,
    themeStyle: 'shiki', // Use inline styles instead of CSS classes
    defaultColor: 'light',
    cssVariablePrefix: '--shiki-',
    tokenizeMaxLineLength: 20000,
    includeExplanation: false,
    tokenizeTimeLimit: 500
}

export default defaultOptions