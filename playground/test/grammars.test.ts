import { expect, it } from "vitest";
import { createHighlighterCore } from "shiki/core";
import { bundledLanguagesInfo } from "shiki/langs";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import {
  getGrammarDependencies,
  getLanguage,
  languages,
  loadGrammars,
} from "../src/grammars";
import { loadSample } from "../src/samples";

const engine = createOnigurumaEngine(() => import("shiki/wasm"));

it.each(languages.filter(({ injection }) => injection).map(({ id }) => id))(
  "loads %s with its host and produces syntax-colored sample tokens",
  async (id) => {
    const dependencies = getGrammarDependencies(id);
    expect(new Set(dependencies).size).toBe(dependencies.length);
    expect(dependencies).toContain(id);
    const grammars = await loadGrammars(id);
    const highlighter = await createHighlighterCore({
      langs: grammars,
      themes: [import("shiki/themes/github-light.mjs")],
      engine,
    });
    try {
      const { tokens } = highlighter.codeToTokens(await loadSample(id), {
        lang: getLanguage(id).host,
        theme: "github-light",
      });
      const colors = new Set(
        tokens
          .flat()
          .filter(({ content }) => content.trim())
          .map(({ color }) => color),
      );
      expect(colors.size).toBeGreaterThan(1);
    } finally {
      highlighter.dispose();
    }
  },
);

it("keeps every existing Shiki language available", async () => {
  expect(languages.map(({ id }) => id)).toEqual(
    expect.arrayContaining(bundledLanguagesInfo.map(({ id }) => id)),
  );
  const grammars = await loadGrammars("ron");
  expect(grammars.some(({ name }) => name === "ron")).toBe(true);
});

it("resolves back-references and fenced-code dependencies without cycles", () => {
  expect(getGrammarDependencies("jinja-html")).toContain("jinja");
  expect(getGrammarDependencies("markdown-vue")).toEqual(
    expect.arrayContaining(["markdown", "vue", "vue-directives"]),
  );
  expect(getGrammarDependencies("markdown-nix")).toEqual(
    expect.arrayContaining(["markdown", "nix"]),
  );
  expect(() => getGrammarDependencies("not-a-language")).toThrow(
    "Unknown grammar",
  );
});
