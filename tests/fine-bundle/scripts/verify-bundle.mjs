import fs from 'node:fs';
import path from 'node:path';

const expectedLangs = new Set(['javascript', 'typescript', 'json']);
const expectedThemes = new Set(['github-dark', 'github-light']);
const noisyTokens = ['python', 'ruby', 'rust', 'dracula', 'nord'];

const scenarios = {
  default: {
    outDir: 'dist-default',
    mode: 'broad',
  },
  'core-preload': {
    outDir: 'dist-core-preload',
    mode: 'strict',
  },
  'core-resolve': {
    outDir: 'dist-core-resolve',
    mode: 'strict',
  },
  'core-cache': {
    outDir: 'dist-core-cache',
    mode: 'strict',
  },
};

const scenario = process.argv[2];
if (!scenario || !scenarios[scenario]) {
  const names = Object.keys(scenarios).join(', ');
  throw new Error(
    `Usage: node ./scripts/verify-bundle.mjs <scenario>, available: ${names}`,
  );
}

const { outDir, mode } = scenarios[scenario];
const distAssetsDir = path.resolve(outDir, 'assets');

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

const assetFiles = fs.readdirSync(distAssetsDir);
const jsAssets = assetFiles.filter((file) => file.endsWith('.js'));
const mapFiles = assetFiles
  .filter((file) => file.endsWith('.map'))
  .map((file) => path.join(distAssetsDir, file));

if (jsAssets.length === 0) {
  throw new Error(`No JS assets found in ${distAssetsDir}`);
}

const noisyMatches = noisyTokens.filter((token) =>
  jsAssets.some((file) => file.includes(token)),
);

console.log(`[verify:${scenario}] js assets:`, jsAssets.length);
console.log(
  `[verify:${scenario}] noisy token matches:`,
  noisyMatches.join(', ') || '(none)',
);

if (mapFiles.length === 0) {
  throw new Error(
    'No sourcemap files found. Please run `pnpm run build` first.',
  );
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

console.log(
  `[verify:${scenario}] included langs:`,
  [...includedLangs].sort().join(', ') || '(none)',
);
console.log(
  `[verify:${scenario}] included themes:`,
  [...includedThemes].sort().join(', ') || '(none)',
);

if (mode === 'broad') {
  if (jsAssets.length < 50 || noisyMatches.length === 0) {
    console.error(
      `[verify:${scenario}] expected broad dynamic bundle footprint, but got too few assets or no noisy tokens.`,
    );
    process.exit(1);
  }

  console.log(
    `[verify:${scenario}] broad dynamic loading check passed (default entry behavior).`,
  );
} else {
  const extraLangs = [...includedLangs].filter(
    (name) => !expectedLangs.has(name),
  );
  const extraThemes = [...includedThemes].filter(
    (name) => !expectedThemes.has(name),
  );
  const missingLangs = [...expectedLangs].filter(
    (name) => !includedLangs.has(name),
  );
  const missingThemes = [...expectedThemes].filter(
    (name) => !includedThemes.has(name),
  );

  if (
    extraLangs.length ||
    extraThemes.length ||
    missingLangs.length ||
    missingThemes.length
  ) {
    console.error(`[verify:${scenario}] unexpected bundle content detected`);
    if (extraLangs.length)
      console.error('  extra langs:', extraLangs.join(', '));
    if (extraThemes.length)
      console.error('  extra themes:', extraThemes.join(', '));
    if (missingLangs.length)
      console.error('  missing langs:', missingLangs.join(', '));
    if (missingThemes.length)
      console.error('  missing themes:', missingThemes.join(', '));
    process.exit(1);
  }

  if (noisyMatches.length > 0) {
    console.error(
      `[verify:${scenario}] unexpected unrelated chunks detected: ${noisyMatches.join(', ')}`,
    );
    process.exit(1);
  }

  console.log(`[verify:${scenario}] strict fine-grained bundle check passed.`);
}

if (process.env.KEEP_SOURCEMAP !== '1') {
  for (const file of mapFiles) {
    fs.unlinkSync(file);
  }
  console.log(
    `[verify:${scenario}] cleaned ${mapFiles.length} sourcemap files (set KEEP_SOURCEMAP=1 to keep)`,
  );
}
