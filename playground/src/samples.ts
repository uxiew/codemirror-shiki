const samples = import.meta.glob<string>("../../samples/*.sample", {
  query: "?raw",
  import: "default",
});

export function loadSample(language: string): Promise<string> {
  return (
    samples[`../../samples/${language}.sample`]?.() ??
    Promise.resolve(`No sample available for ${language}.`)
  );
}
