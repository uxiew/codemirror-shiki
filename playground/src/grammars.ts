import { grammars, injections } from "tm-grammars";
import { bundledLanguagesInfo } from "shiki/langs";
import type { LanguageRegistration } from "shiki/core";

// Injection grammars need a host scope to demonstrate their actual behavior.
// In particular, Markdown injections must load the fenced language as well.
const previewHosts: Record<string, string> = {
  "angular-inline-style": "angular-ts",
  "angular-inline-template": "angular-ts",
  "angular-let-declaration": "angular-html",
  "angular-template": "angular-html",
  "angular-template-blocks": "angular-html",
  "cpp-macro": "cpp",
  "es-tag-css": "typescript",
  "es-tag-glsl": "typescript",
  "es-tag-html": "typescript",
  "es-tag-sql": "typescript",
  "es-tag-xml": "typescript",
  "markdown-nix": "markdown",
  "markdown-vue": "markdown",
  "vue-directives": "vue",
  "vue-interpolations": "vue",
  "vue-sfc-style-variable-injection": "vue",
};

const bundledOnly = bundledLanguagesInfo
  .filter(({ id }) => !grammars.some(({ name }) => name === id))
  .map(({ id, name, aliases }) => ({
    name: id,
    displayName: name,
    aliases,
    embedded: [] as string[],
  }));

export const languages = [...grammars, ...injections, ...bundledOnly].map(
  (info) => ({
    ...info,
    id: info.name,
    displayName: injections.some(({ name }) => name === info.name)
      ? info.name
      : info.displayName || info.name,
    injection: injections.some(({ name }) => name === info.name),
    host: previewHosts[info.name] || info.name,
  }),
);

const languageMap = new Map(languages.map((info) => [info.id, info]));

export function getGrammarImport(id: string) {
  return bundledOnly.some(({ name }) => name === id)
    ? `shiki/langs/${id}.mjs`
    : `tm-grammars/grammars/${id}.json`;
}

export function getLanguage(id: string) {
  const info = languageMap.get(id);
  if (!info) throw new Error(`Unknown grammar: ${id}`);
  return info;
}

export function getGrammarDependencies(id: string): string[] {
  const selected = getLanguage(id);
  const names = new Set<string>();
  function visit(name: string) {
    if (names.has(name)) return;
    names.add(name);
    getLanguage(name).embedded?.forEach(visit);
    // These helpers refer back to a host scope, not listed in `embedded`.
    if (name === "jinja-html") visit("jinja");
    if (name === "markdown-vue") visit("vue");
    if (name === "markdown-nix") visit("nix");
  }
  visit(selected.host);
  visit(id);
  return [...names];
}

// Keep grammar JSON in lazy chunks, as in the textmate-grammars-themes
// playground. Using one registry avoids mixing different versions of a scope.
const modules = import.meta.glob<LanguageRegistration>(
  "../node_modules/tm-grammars/grammars/*.json",
  { import: "default" },
);

export async function loadGrammars(id: string) {
  const loaded = await Promise.all(
    getGrammarDependencies(id).map(async (name) => {
      const load = modules[`../node_modules/tm-grammars/grammars/${name}.json`];
      if (load) return [await load()];
      const bundled = bundledLanguagesInfo.find(({ id }) => id === name);
      if (!bundled) throw new Error(`Missing grammar module: ${name}`);
      return (await bundled.import()).default;
    }),
  );
  return loaded.flat();
}
