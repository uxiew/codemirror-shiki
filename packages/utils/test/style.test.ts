
// import ist from "ist"

import { cmEditor } from "./demo"
import { mountStyles, getClasses } from "../src/style"

const [baseId] = getClasses(cmEditor)

describe("style.ts", () => {
    it("renders objects to CSS text", () => {
        mountStyles(cmEditor, {
            main: { color: "red" },
            "@media screen and (min-width: 400px)": {
                main: { fontFamily: '"URW Bookman"' }
            }
        })

        // Find the style sheet that contains our rules
        const styleSheets = Array.from(document.styleSheets)
        const ourStyleSheet = styleSheets.find(sheet => {
            try {
                const rules = Array.from(sheet.cssRules || [])
                return rules.some(rule =>
                    (rule as CSSStyleRule).selectorText?.includes('main') &&
                    (rule as CSSStyleRule).style?.color === 'red'
                )
            } catch {
                return false
            }
        })

        expect(ourStyleSheet).toBeDefined()

        if (ourStyleSheet) {
            const rules = Array.from(ourStyleSheet.cssRules)
            const mainRule = rules.find(r =>
                (r as CSSStyleRule).selectorText?.includes('main') &&
                (r as CSSStyleRule).style?.color === 'red'
            )
            expect(mainRule).toBeDefined()
        }
    })

    it("handles multiple rules", () => {
        mountStyles(cmEditor, {
            one: { color: "green" },
            two: { color: "blue" }
        })

        // Find style sheets containing our rules
        const styleSheets = Array.from(document.styleSheets)
        let foundOne = false
        let foundTwo = false

        for (const sheet of styleSheets) {
            try {
                const rules = Array.from(sheet.cssRules || [])
                for (const rule of rules) {
                    const styleRule = rule as CSSStyleRule
                    if (styleRule.selectorText?.includes('one') && styleRule.style?.color === 'green') {
                        foundOne = true
                    }
                    if (styleRule.selectorText?.includes('two') && styleRule.style?.color === 'blue') {
                        foundTwo = true
                    }
                }
            } catch {
                // Some style sheets may not be accessible
            }
        }

        expect(foundOne).toBe(true)
        expect(foundTwo).toBe(true)
    })
})