/**
 * Packs every folder in /games into a versioned binary container:
 *
 *   offset 0   "ARCP"           magic
 *   offset 4   1                container format
 *   offset 5   flags            reserved
 *   offset 6   0,0              reserved
 *   offset 8   u32 LE           header length
 *   offset 12  JSON header      manifest + entry/asset table
 *   ...        payload          gzip(entry) + assets, back to back
 *
 * The header carries the sha256 of the payload, so the client can verify a
 * download end to end before it ever executes code from it.
 */
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import './make-assets.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gamesDir = join(root, 'games');
const outDir = join(root, 'public', 'packs');
const OFF = 12;
const BUDGET_BYTES = 2 * 1024 * 1024;

const gzip = (buf) => gzipSync(buf, { level: 9 });
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const kb = (n) => `${(n / 1024).toFixed(1).padStart(7)} KB`;

function encodePack({ meta, entryBytes, assets }) {
  const entry = {
    path: meta.entry || 'index.js',
    encoding: 'gzip',
    bytes: gzip(entryBytes),
  };
  const blobEntries = [entry, ...assets];
  let offset = 0;
  const table = [];
  for (const item of blobEntries) {
    table.push({ path: item.path, mime: item.mime, encoding: item.encoding, offset, length: item.bytes.length });
    offset += item.bytes.length;
  }
  const payload = Buffer.concat(blobEntries.map((b) => b.bytes));
  const header = {
    format: 1,
    id: meta.id,
    name: meta.name,
    tagline: meta.tagline,
    version: meta.version,
    accent: meta.accent,
    accent2: meta.accent2,
    art: meta.art,
    hint: meta.hint,
    controls: meta.controls ?? [],
    builtAt: new Date().toISOString(),
    payloadBytes: payload.length,
    payloadSha256: sha256(payload),
    entry: table[0],
    assets: table.slice(1),
  };
  const headerBytes = Buffer.from(JSON.stringify(header), 'utf8');
  const prefix = Buffer.alloc(OFF);
  prefix.write('ARCP', 0, 'ascii');
  prefix[4] = 1;
  prefix.writeUInt32LE(headerBytes.length, 8);
  const file = Buffer.concat([prefix, headerBytes, payload]);
  return { file, header, entryRaw: entryBytes.length, entryPacked: entry.bytes.length };
}

const dirs = readdirSync(gamesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(gamesDir, d.name, 'game.json')))
  .map((d) => d.name);

const packs = [];
const produced = new Set(['index.json']);
mkdirSync(outDir, { recursive: true });

for (const dir of dirs) {
  const gameDir = join(gamesDir, dir);
  const meta = JSON.parse(readFileSync(join(gameDir, 'game.json'), 'utf8'));
  const entryFile = join(gameDir, meta.entry || 'index.js');

  const result = await build({
    entryPoints: [entryFile],
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    platform: 'browser',
    write: false,
    legalComments: 'none',
    logLevel: 'warning',
  });
  const entryBytes = Buffer.from(result.outputFiles[0].text, 'utf8');

  const assets = (meta.assets ?? []).map((asset) => {
    const bytes = readFileSync(join(gameDir, asset.file));
    const compressible = /text|json|svg|javascript/.test(asset.mime);
    return {
      path: asset.path,
      mime: asset.mime,
      encoding: compressible ? 'gzip' : 'identity',
      bytes: compressible ? gzip(bytes) : bytes,
    };
  });

  const { file, header, entryRaw, entryPacked } = encodePack({ meta, entryBytes, assets });
  if (file.length > BUDGET_BYTES) {
    throw new Error(`Pack ${meta.id} is ${kb(file.length)} which exceeds the ${kb(BUDGET_BYTES)} budget`);
  }

  const name = `${meta.id}-${meta.version}.arcp`;
  writeFileSync(join(outDir, name), file);
  produced.add(name);

  packs.push({
    id: meta.id,
    order: meta.order ?? 99,
    name: meta.name,
    tagline: meta.tagline,
    version: meta.version,
    accent: meta.accent,
    accent2: meta.accent2,
    art: meta.art,
    hint: meta.hint,
    controls: meta.controls ?? [],
    scoreLabel: meta.scoreLabel,
    file: `packs/${name}`,
    size: file.length,
    sha256: header.payloadSha256,
  });

  console.log(
    `  ${meta.id.padEnd(8)} v${meta.version}  entry ${kb(entryRaw)} -> ${kb(entryPacked)} gz` +
      `  pack ${kb(file.length)}  ${header.payloadSha256.slice(0, 12)}`,
  );
}

for (const name of readdirSync(outDir)) {
  if (!produced.has(name)) {
    rmSync(join(outDir, name));
    console.log(`  removed stale ${name}`);
  }
}

packs.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
const catalog = {
  catalog: 1,
  builtAt: new Date().toISOString(),
  packs: packs.map(({ order, headerBytes, ...rest }) => rest),
};
writeFileSync(join(outDir, 'index.json'), JSON.stringify(catalog, null, 2));

console.log(
  `\n  catalog v1: ${packs.length} packs, ${kb(packs.reduce((s, p) => s + p.size, 0))} total -> public/packs/\n`,
);
