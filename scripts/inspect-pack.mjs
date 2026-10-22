/** Prints the header of one or more .arcp files: node scripts/inspect-pack.mjs public/packs/*.arcp */
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const args = process.argv.slice(2);
const files = args.length
  ? args
  : readdirSync('public/packs')
      .filter((f) => f.endsWith('.arcp'))
      .map((f) => join('public/packs', f));

for (const file of files) {
  const buf = readFileSync(file);
  const magic = buf.toString('ascii', 0, 4);
  const format = buf[4];
  const headerLen = buf.readUInt32LE(8);
  const header = JSON.parse(buf.toString('utf8', 12, 12 + headerLen));
  const payload = buf.subarray(12 + headerLen);

  console.log(`\n${file}`);
  console.log(`  magic ${magic}  format ${format}  bytes ${buf.length}`);
  console.log(`  ${header.id} v${header.version} — ${header.name}`);
  console.log(`  payload ${payload.length} bytes  sha256 ${createHash('sha256').update(payload).digest('hex')}`);
  console.log(`  header sha256 ${header.payloadSha256} ${header.payloadSha256 === createHash('sha256').update(payload).digest('hex') ? 'OK' : 'MISMATCH'}`);
  console.log(`  entry ${header.entry.path} ${header.entry.length} bytes (${header.entry.encoding}) @${header.entry.offset}`);
  for (const a of header.assets) {
    console.log(`  asset ${a.path} ${a.length} bytes (${a.encoding}) ${a.mime}`);
  }
}
