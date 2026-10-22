/**
 * Fetch with real progress: reads the response stream so the loader can show
 * bytes, speed and a smooth bar, and supports cancellation.
 */
export class DownloadError extends Error {}

export async function fetchWithProgress(url, { onProgress, signal } = {}) {
  let response;
  try {
    response = await fetch(url, { signal, cache: 'no-store', credentials: 'same-origin' });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new DownloadError('Network unreachable. Check your connection and retry.');
  }

  if (!response.ok) {
    throw new DownloadError(`Download failed with HTTP ${response.status}.`);
  }

  const total = Number(response.headers.get('content-length')) || 0;

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onProgress?.({ received: bytes.byteLength, total: total || bytes.byteLength, rate: 0, done: true });
    return { bytes, total: total || bytes.byteLength };
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  let windowStart = performance.now();
  let windowBytes = 0;
  let rate = 0;
  let lastEmit = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    windowBytes += value.byteLength;

    const now = performance.now();
    if (now - windowStart > 250) {
      rate = (windowBytes * 1000) / (now - windowStart);
      windowStart = now;
      windowBytes = 0;
    }
    if (now - lastEmit > 60 || (total && received >= total)) {
      lastEmit = now;
      onProgress?.({ received, total, rate, done: false });
    }
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  onProgress?.({ received, total: total || received, rate, done: true });
  return { bytes, total: total || received };
}
