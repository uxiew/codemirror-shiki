import { bundledLanguagesInfo } from "shiki/langs";
import { expect, it } from "vitest";
import { loadSample } from "../src/samples";
import { languages } from "../src/grammars";

it("has a non-empty sample for every bundled language", async () => {
  await Promise.all(
    bundledLanguagesInfo.map(async ({ id }) => {
      const sample = await loadSample(id);
      expect(sample.trim(), id).not.toBe("");
      expect(sample, id).not.toContain("No sample available");
    }),
  );
});

it("has a dedicated sample for all 18 embedded and injection grammars", async () => {
  const extra = languages.filter((language) => language.injection);
  expect(extra).toHaveLength(18);
  await Promise.all(
    extra.map(async ({ id }) => {
      const sample = await loadSample(id);
      expect(sample.trim().length, id).toBeGreaterThan(20);
      expect(sample, id).not.toContain("No sample available");
    }),
  );
});

it("identifies missing samples without substituting another language", async () => {
  await expect(loadSample("not-a-language")).resolves.toBe(
    "No sample available for not-a-language.",
  );
});
