/**
 * Build step: writes the icons and the textures that games reference through
 * their asset manifests. Everything here is generated, so nothing binary is
 * committed to the repo.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeGlow, makeIcon, makeNoise } from './png.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function write(path, buf) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  return `${(buf.length / 1024).toFixed(1)} KB`;
}

const targets = [
  ['public/icons/icon-192.png', makeIcon(192)],
  ['public/icons/icon-512.png', makeIcon(512)],
  ['public/icons/maskable-512.png', makeIcon(512, { safe: 0.78 })],
  ['public/icons/apple-touch-icon.png', makeIcon(180)],
  ['games/stack/assets/glow.png', makeGlow(128)],
  ['games/tunnel/assets/glow.png', makeGlow(128)],
  ['games/tunnel/assets/noise.png', makeNoise(64)],
  ['games/stack/assets/noise.png', makeNoise(64, 11)],
];

for (const [path, data] of targets) {
  console.log(`  asset ${path.padEnd(38)} ${write(join(root, path), data)}`);
}
