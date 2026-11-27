// 生成主题列表的色板（编辑器背景、前景和三个代表性 token 颜色）。
// 升级 shiki 后运行：pnpm -F playground exec node scripts/theme-colors.mjs
import { writeFileSync } from "node:fs";
import { bundledThemesInfo } from "shiki/themes";

const pick = (theme, scopes) => {
  for (const scope of scopes) {
    for (const rule of theme.tokenColors || theme.settings || []) {
      const names = [rule.scope ?? []].flat().flatMap((s) => s.split(","));
      if (rule.settings?.foreground && names.some((s) => s.trim() === scope))
        return rule.settings.foreground;
    }
  }
};
const out = {};
for (const info of bundledThemesInfo) {
  const theme = (await info.import()).default;
  const c = theme.colors || {};
  const dark = info.type === "dark";
  const fg = (c["editor.foreground"] || c.foreground || (dark ? "#bbbbbb" : "#333333")).slice(0, 7);
  out[info.id] = {
    bg: (c["editor.background"] || (dark ? "#1e1e1e" : "#ffffff")).slice(0, 7),
    fg,
    tokens: [
      pick(theme, ["keyword", "storage", "keyword.control"]),
      pick(theme, ["string", "string.quoted"]),
      pick(theme, ["entity.name.function", "support.function", "variable"]),
    ].map((color) => (color || fg).slice(0, 7).toLowerCase()),
  };
}
writeFileSync(new URL("../src/theme-colors.json", import.meta.url), JSON.stringify(out) + "\n");
console.log(Object.keys(out).length, "themes");
