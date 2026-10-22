/**
 * Client side of the pack container. Never trust a downloaded file: parse the
 * header, verify the sha256 of the payload, and only then decompress.
 */
const MAGIC = 'ARCP';
const SUPPORTED_FORMAT = 1;
const HEADER_OFFSET = 12;

export class PackError extends Error {}

export function parsePack(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength < HEADER_OFFSET + 2) throw new PackError('File is too small to be a game pack.');

  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== MAGIC) throw new PackError('Not a game pack (bad signature).');

  const format = bytes[4];
  if (format !== SUPPORTED_FORMAT) {
    throw new PackError(`This pack uses container v${format}; update the arcade to play it.`);
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLength = view.getUint32(8, true);
  const headerEnd = HEADER_OFFSET + headerLength;
  if (headerEnd > bytes.byteLength) throw new PackError('Pack header is truncated.');

  let header;
  try {
    header = JSON.parse(new TextDecoder().decode(bytes.subarray(HEADER_OFFSET, headerEnd)));
  } catch {
    throw new PackError('Pack header is not valid JSON.');
  }

  const payload = bytes.subarray(headerEnd);
  if (payload.byteLength !== header.payloadBytes) {
    throw new PackError(
      `Pack is incomplete (${payload.byteLength} of ${header.payloadBytes} bytes).`,
    );
  }

  return { header, payload, bytes };
}

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPack(parsed, expectedSha256) {
  const actual = await sha256Hex(parsed.payload);
  const expected = expectedSha256 || parsed.header.payloadSha256;
  return { ok: actual === expected, actual, expected };
}

export async function inflate(bytes, encoding) {
  if (!encoding || encoding === 'identity') return bytes;
  if (encoding !== 'gzip') throw new PackError(`Unknown entry encoding "${encoding}".`);
  if (typeof DecompressionStream === 'undefined') {
    throw new PackError('This browser cannot unpack compressed game code.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function slice(payload, item) {
  return payload.slice(item.offset, item.offset + item.length);
}

/** Splits a verified pack into runnable source plus asset bytes. */
export async function unpack(parsed) {
  const { header, payload } = parsed;
  const entryBytes = await inflate(slice(payload, header.entry), header.entry.encoding);
  const assets = await Promise.all(
    header.assets.map(async (asset) => ({
      path: asset.path,
      mime: asset.mime || 'application/octet-stream',
      bytes: await inflate(slice(payload, asset), asset.encoding),
    })),
  );
  return { header, source: new TextDecoder().decode(entryBytes), assets };
}
