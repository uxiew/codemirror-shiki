import fs from 'node:fs';
import path from 'node:path';

const distAssetsDir = path.resolve('dist/assets');
const expectedLangs = new Set(['javascript', 'typescript', 'json']);
const expectedThemes = new Set(['github-dark', 'github-light']);

function pickName(source, prefix) {
  const idx = source.indexOf(prefix);
  if (idx < 0) return null;

  let tail = source.slice(idx + prefix.length);
  tail = tail.replace(/^dist\//, '').replace(/^src\//, '');

  const m = tail.match(/^([a-z0-9-]+)(?:\.[mc]?js|\/|$)/i);
  if (!m) return null;
  const name = m[1].toLowerCase();

  if (name === 'index' || name === 'types') return null;
  return name;
}

function collectFromSources(sources, prefix) {
  const result = new Set();
  for (const source of sources) {
    const name = pickName(source, prefix);
    if (name) result.add(name);
  }
  return result;
}

if (!fs.existsSync(distAssetsDir)) {
  throw new Error(`Missing build output: ${distAssetsDir}`);
}

const mapFiles = fs
  .readdirSync(distAssetsDir)
  .filter((file) => file.endsWith('.map'))
  .map((file) => path.join(distAssetsDir, file));

if (mapFiles.length === 0) {
  throw new Error('No sourcemap files found. Please run `pnpm run build` first.');
}

const allSources = [];
for (const mapFile of mapFiles) {
  const json = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  if (Array.isArray(json.sources)) {
    allSources.push(...json.sources);
  }
}

const includedLangs = collectFromSources(allSources, '@shikijs/langs/');
const includedThemes = collectFromSources(allSources, '@shikijs/themes/');

const extraLangs = [...includedLangs].filter((name) => !expectedLangs.has(name));
const extraThemes = [...includedThemes].filter((name) => !expectedThemes.has(name));
const missingLangs = [...expectedLangs].filter((name) => !includedLangs.has(name));
const missingThemes = [...expectedThemes].filter((name) => !includedThemes.has(name));

console.log('[verify] included langs:', [...includedLangs].sort().join(', ') || '(none)');
console.log('[verify] included themes:', [...includedThemes].sort().join(', ') || '(none)');

if (extraLangs.length || extraThemes.length || missingLangs.length || missingThemes.length) {
  console.error('[verify] unexpected bundle content detected');
  if (extraLangs.length) console.error('  extra langs:', extraLangs.join(', '));
  if (extraThemes.length) console.error('  extra themes:', extraThemes.join(', '));
  if (missingLangs.length) console.error('  missing langs:', missingLangs.join(', '));
  if (missingThemes.length) console.error('  missing themes:', missingThemes.join(', '));
  process.exit(1);
}

console.log('[verify] fine-grained bundle check passed');

if (process.env.KEEP_SOURCEMAP !== '1') {
  for (const file of mapFiles) {
    fs.unlinkSync(file);
  }
  console.log(`[verify] cleaned ${mapFiles.length} sourcemap files (set KEEP_SOURCEMAP=1 to keep)`);
}
