/**
 * Minimal dependency-free PNG writer (RGBA, 8 bit, no filtering) plus a few
 * tiny generators used to produce icons and shared game textures at build time.
 */
import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** @param {number} width @param {number} height @param {Uint8Array} rgba */
export function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

/** Deterministic PRNG so builds stay byte-identical. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft radial glow sprite used for particles, trails and light pools. */
export function makeGlow(size = 128) {
  const rgba = new Uint8Array(size * size * 4);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c) / c;
      const a = Math.pow(clamp01(1 - d), 2.4);
      const i = (y * size + x) * 4;
      rgba[i] = 255;
      rgba[i + 1] = 255;
      rgba[i + 2] = 255;
      rgba[i + 3] = Math.round(a * 255);
    }
  }
  return encodePng(size, size, rgba);
}

/** Tileable value-noise grain, used as a roughness map for a less plastic look. */
export function makeNoise(size = 128, seed = 7) {
  const rand = mulberry32(seed);
  const grid = 12;
  const lattice = Array.from({ length: grid * grid }, () => rand());
  const at = (gx, gy) => lattice[((gy % grid) + grid) % grid * grid + (((gx % grid) + grid) % grid)];
  const smooth = (t) => t * t * (3 - 2 * t);
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * grid;
      const fy = (y / size) * grid;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = smooth(fx - x0);
      const ty = smooth(fy - y0);
      const v =
        mix(mix(at(x0, y0), at(x0 + 1, y0), tx), mix(at(x0, y0 + 1), at(x0 + 1, y0 + 1), tx), ty) *
          0.82 +
        rand() * 0.18;
      const g = Math.round(clamp01(v) * 255);
      const i = (y * size + x) * 4;
      rgba[i] = g;
      rgba[i + 1] = g;
      rgba[i + 2] = g;
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}

/**
 * App icon: rounded slab, glowing rings and a play triangle.
 * `safe` shrinks the artwork so it survives Android maskable cropping.
 */
export function makeIcon(size = 512, { safe = 1 } = {}) {
  const rgba = new Uint8Array(size * size * 4);
  const c = size / 2;
  const radius = size * 0.22;
  const ringR = size * 0.29 * safe;
  const ringW = size * 0.016 * safe;
  const triApex = size * 0.17 * safe;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - c;
      const dy = y - c;

      // rounded-rect mask
      const qx = Math.abs(dx) - (c - radius);
      const qy = Math.abs(dy) - (c - radius);
      const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
      const mask = 1 - smoothstep(-1.2, 1.2, sd);
      if (mask <= 0) {
        rgba[i + 3] = 0;
        continue;
      }

      // background: vertical gradient + corner glow
      const v = clamp01((y / size) * 0.9 + 0.1);
      let r = mix(16, 5, v);
      let g = mix(21, 6, v);
      let b = mix(38, 12, v);
      const glow = Math.pow(clamp01(1 - Math.hypot(dx + size * 0.22, dy + size * 0.3) / (size * 0.75)), 3);
      r += glow * 20;
      g += glow * 40;
      b += glow * 60;

      // concentric rings (cyan + magenta halo)
      const d = Math.hypot(dx, dy);
      const ring = Math.exp(-Math.pow((d - ringR) / (ringW * 1.6), 2));
      r += ring * 20;
      g += ring * 190;
      b += ring * 235;
      const halo = Math.exp(-Math.pow((d - ringR) / (size * 0.09), 2)) * 0.35;
      g += halo * 70;
      b += halo * 90;

      // play triangle
      const tx = dx;
      const ty = dy + triApex * 0.18;
      const inside =
        tx > -triApex * 0.62 &&
        tx < triApex * 1.15 &&
        Math.abs(ty) < triApex * 1.05 * (1 - (tx + triApex * 0.62) / (triApex * 1.9));
      const tri = inside ? 1 : 0;
      if (tri) {
        r = mix(r, 255, 0.92);
        g = mix(g, 47, 0.86);
        b = mix(b, 142, 0.86);
      }

      rgba[i] = Math.round(clamp01(r / 255) * 255);
      rgba[i + 1] = Math.round(clamp01(g / 255) * 255);
      rgba[i + 2] = Math.round(clamp01(b / 255) * 255);
      rgba[i + 3] = Math.round(mask * 255);
    }
  }
  return encodePng(size, size, rgba);
}
