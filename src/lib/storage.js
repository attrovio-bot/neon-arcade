/**
 * Installed packs live in IndexedDB, split into a light `meta` store (used to
 * paint the shelf instantly) and a `blobs` store (the actual bytes).
 */
const DB_NAME = 'neon-arcade';
const DB_VERSION = 1;
const META = 'meta';
const BLOBS = 'blobs';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Storage is locked by another tab.'));
  });
  return dbPromise;
}

function tx(store, mode, run) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const request = run(transaction.objectStore(store));
        transaction.oncomplete = () => resolve(request?.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted.'));
      }),
  );
}

export function listPacks() {
  return tx(META, 'readonly', (store) => store.getAll()).then((rows) => rows ?? []);
}

export function getMeta(id) {
  return tx(META, 'readonly', (store) => store.get(id));
}

export function getBlobs(id) {
  return tx(BLOBS, 'readonly', (store) => store.get(id));
}

export async function getPack(id) {
  const [meta, blobs] = await Promise.all([getMeta(id), getBlobs(id)]);
  if (!meta || !blobs) return null;
  return { ...meta, ...blobs };
}

/** meta + blobs are written in one transaction so a quota failure leaves no orphan. */
export async function savePack({ meta, blobs }) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([META, BLOBS], 'readwrite');
    transaction.objectStore(META).put(meta);
    transaction.objectStore(BLOBS).put(blobs);
    transaction.oncomplete = () => resolve(meta);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function markPlayed(id) {
  const meta = await getMeta(id);
  if (!meta) return;
  meta.plays = (meta.plays ?? 0) + 1;
  meta.lastPlayed = Date.now();
  await tx(META, 'readwrite', (store) => store.put(meta));
}

export async function deletePack(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([META, BLOBS], 'readwrite');
    transaction.objectStore(META).delete(id);
    transaction.objectStore(BLOBS).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function clearPacks() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([META, BLOBS], 'readwrite');
    transaction.objectStore(META).clear();
    transaction.objectStore(BLOBS).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function storageInfo() {
  const info = { usage: 0, quota: 0, persisted: false, supported: 'storage' in navigator };
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    info.usage = estimate.usage ?? 0;
    info.quota = estimate.quota ?? 0;
  }
  if (navigator.storage?.persisted) info.persisted = await navigator.storage.persisted();
  return info;
}

export async function requestPersist() {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
