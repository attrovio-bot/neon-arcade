import './style.css';
import { createAudio } from './lib/audio.js';
import { Player, readScores } from './play.js';
import {
  listPacks,
  deletePack,
  clearPacks,
  storageInfo,
  requestPersist,
} from './lib/storage.js';
import { formatBytes, formatCount, formatDate } from './lib/format.js';

const BASE = import.meta.env.BASE_URL;
const REPO_URL = 'https://github.com/attrovio-bot/neon-arcade';
const CATALOG_KEY = 'neon-arcade:catalog:v1';
const ANNOUNCED_KEY = 'neon-arcade:announced:v1';

const $ = (id) => document.getElementById(id);
const audio = createAudio();

const state = {
  catalog: null,
  installed: new Map(),
  scores: readScores(),
  error: null,
  stale: false,
};

let hub = null;
let player = null;
let deferredPrompt = null;

const GLYPHS = {
  stack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="3.5" y="15.5" width="17" height="4" rx="1.2"/><rect x="6" y="10.2" width="12" height="4" rx="1.2"/><rect x="8.5" y="4.9" width="7" height="4" rx="1.2"/></svg>`,
  tunnel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>`,
  firenze: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><path d="M5.5 20v-7h13v7"/><path d="M9.5 20v-4h5v4"/><path d="M12 4v3"/><path d="M8.4 10a3.6 3.6 0 0 1 7.2 0"/><path d="M6.2 13h11.6"/></svg>`,
};

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function toast(message, kind = '', { actionLabel, onAction, timeout = 4600 } = {}) {
  const node = h('div', `toast${kind ? ` is-${kind}` : ''}`, message);
  if (actionLabel) {
    const action = h('button', 'toast-action', actionLabel);
    action.type = 'button';
    action.addEventListener('click', () => {
      onAction?.();
      dismiss();
    });
    node.append(action);
  }
  $('toasts').append(node);
  let timer = setTimeout(dismiss, timeout);
  function dismiss() {
    clearTimeout(timer);
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 220);
  }
  node.addEventListener('pointerdown', () => clearTimeout(timer));
  return dismiss;
}

/* -------------------------------- catalog -------------------------------- */

async function loadCatalog({ quiet = false } = {}) {
  try {
    const response = await fetch(`${BASE}packs/index.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    const catalog = await response.json();
    if (!Array.isArray(catalog.packs)) throw new Error('Malformed catalog');
    state.catalog = catalog;
    state.error = null;
    state.stale = false;
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
    if (!quiet) toast(`Catalog refreshed · ${catalog.packs.length} packs`, 'good');
  } catch (error) {
    console.warn('catalog', error);
    const cached = localStorage.getItem(CATALOG_KEY);
    if (cached) {
      state.catalog = JSON.parse(cached);
      state.stale = true;
    } else if (!state.catalog) {
      state.catalog = { packs: [], builtAt: null };
    }
    state.error = navigator.onLine
      ? 'Could not read the catalog from GitHub Pages.'
      : 'You are offline — showing packs already on this device.';
    if (!quiet) toast(state.error, 'bad');
  }
  await refreshInstalled();
  render();
}

async function refreshInstalled() {
  const rows = await listPacks();
  state.installed = new Map(rows.map((row) => [row.id, row]));
}

function isFresh(pack) {
  const installed = state.installed.get(pack.id);
  if (!installed) return false;
  if (installed.version !== pack.version) return false;
  if (pack.sha256 && installed.sha256 && installed.sha256 !== pack.sha256) return false;
  return true;
}

function packList() {
  const list = [...(state.catalog?.packs ?? [])];
  for (const installed of state.installed.values()) {
    if (!list.some((pack) => pack.id === installed.id)) {
      list.push({ ...installed, offlineOnly: true, file: null });
    }
  }
  return list;
}

/* ---------------------------------- cards -------------------------------- */

function buildCard(pack, index) {
  const installed = state.installed.get(pack.id);
  const fresh = isFresh(pack);
  const needsUpdate = Boolean(installed) && !fresh;
  const best = state.scores[pack.id] ?? 0;

  const card = h('article', 'card');
  card.style.setProperty('--accent', pack.accent || '#22e1ff');
  card.style.setProperty('--accent-2', pack.accent2 || '#ff2f8e');
  card.dataset.id = pack.id;

  const cover = h('div', 'cover');
  cover.dataset.art = pack.art || 'stack';
  cover.append(h('span', 'art'));
  const glyph = h('span', 'cover-glyph');
  glyph.innerHTML = GLYPHS[pack.art] || GLYPHS.stack;
  cover.append(glyph);
  cover.append(h('span', 'cover-index', String(index + 1).padStart(2, '0')));
  const status = h(
    'span',
    'cover-state',
    fresh ? 'ready offline' : needsUpdate ? 'update available' : 'not installed',
  );
  if (fresh) status.classList.add('is-ready');
  if (needsUpdate) status.classList.add('is-update');
  cover.append(status);
  card.append(cover);

  const body = h('div', 'card-body');
  body.append(h('h2', null, pack.name));
  body.append(h('p', 'card-tagline', pack.tagline));

  const meta = h('div', 'card-meta');
  meta.append(h('span', null, formatBytes(pack.size || installed?.size || 0)));
  meta.append(h('span', null, `v${pack.version}`));
  if (best) meta.append(h('span', null, `best ${formatCount(best)}`));
  else if (installed?.plays) meta.append(h('span', null, `${installed.plays} runs`));
  else meta.append(h('span', null, (pack.controls ?? ['tap']).join(' / ')));
  body.append(meta);

  const actions = h('div', 'card-actions');
  const primary = h(
    'button',
    'btn primary',
    fresh ? 'Play' : needsUpdate ? 'Update pack' : 'Get & play',
  );
  primary.type = 'button';
  if (pack.accent2 && pack.art === 'tunnel') primary.classList.add('is-accent2');
  primary.addEventListener('click', () => launch(pack, { force: needsUpdate }));
  actions.append(primary);

  if (installed) {
    const del = h('button', 'btn ghost icon-only', '✕');
    del.type = 'button';
    del.setAttribute('aria-label', `Delete ${pack.name} from this device`);
    del.addEventListener('click', () => askDelete(card, body, pack));
    actions.append(del);
  }
  body.append(actions);
  card.append(body);
  return card;
}

function askDelete(card, body, pack) {
  if (card.querySelector('.card-confirm')) return;
  const actions = card.querySelector('.card-actions');
  const installed = state.installed.get(pack.id);
  const confirm = h('div', 'card-confirm');

  const label = h('p', null, `Remove ${formatBytes(installed?.size ?? pack.size ?? 0)} from this device?`);
  const yes = h('button', 'btn danger small', 'Delete');
  yes.type = 'button';
  const keep = h('button', 'btn ghost small', 'Keep');
  keep.type = 'button';

  keep.addEventListener('click', () => {
    confirm.remove();
    actions.hidden = false;
  });
  yes.addEventListener('click', async () => {
    yes.disabled = true;
    await deletePack(pack.id);
    await refreshInstalled();
    render();
    toast(`${pack.name} removed. Re-download it any time.`, 'good');
  });

  const row = h('div', 'card-confirm-actions');
  row.append(yes, keep);
  confirm.append(label, row);
  actions.hidden = true;
  body.append(confirm);
}

function render() {
  const cards = $('cards');
  const list = packList();
  cards.replaceChildren(...list.map((pack, index) => buildCard(pack, index)));

  const errorEl = $('shelfError');
  if (state.error) {
    errorEl.hidden = false;
    errorEl.textContent = state.error;
  } else {
    errorEl.hidden = true;
  }
  if (!list.length) {
    cards.replaceChildren(
      h(
        'p',
        'pack-empty',
        'No catalog yet. Connect to the internet once, then packs stay available offline.',
      ),
    );
  }
  updateStats();
}

function updateStats() {
  const list = packList();
  const installed = [...state.installed.values()];
  const bytes = installed.reduce((sum, pack) => sum + (pack.size || 0), 0);
  const total = Object.values(state.scores).reduce((sum, score) => sum + (score || 0), 0);
  const bestRuns = installed.filter((pack) => state.scores[pack.id]).length;

  $('statPacks').textContent = list.length ? formatCount(list.length) : '—';
  $('statCache').textContent = bytes ? formatBytes(bytes) : '0 KB';
  $('statBest').textContent = total ? formatCount(total) : '0';
  $('storageLabel').textContent = installed.length
    ? `${installed.length} pack${installed.length === 1 ? '' : 's'} · ${formatBytes(bytes)}`
    : 'no packs';
  $('storageBtn').classList.toggle('has-packs', installed.length > 0);
  $('buildStamp').textContent = state.catalog?.builtAt
    ? `build ${formatDate(state.catalog.builtAt)}`
    : 'build pending';

  const note = $('sheetNote');
  if (note && !$('sheetBackdrop').hidden) void renderSheet();
  if (bestRuns === 0) $('statBest').title = 'No runs yet';
}

/* --------------------------------- playing -------------------------------- */

async function launch(pack, { force = false } = {}) {
  hub?.setActive(false);
  await player.play(pack, { force });
}

/* --------------------------------- storage -------------------------------- */

async function openSheet() {
  $('sheetBackdrop').hidden = false;
  await renderSheet();
}

function closeSheet() {
  $('sheetBackdrop').hidden = true;
}

async function renderSheet() {
  const info = await storageInfo();
  const installed = [...state.installed.values()].sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
  const bytes = installed.reduce((sum, pack) => sum + (pack.size || 0), 0);

  $('sheetUsage').textContent = `${installed.length} pack${installed.length === 1 ? '' : 's'} · ${formatBytes(bytes)}`;
  $('storageBar').style.width = info.quota
    ? `${Math.min(100, ((info.usage || bytes) / info.quota) * 100).toFixed(1)}%`
    : '0%';

  $('sheetNote').textContent = info.persisted
    ? `Persistent storage granted. ${formatBytes(info.usage || bytes)} of ${formatBytes(info.quota)} used — the browser will not evict your packs automatically.`
    : `Best-effort storage: ${formatBytes(info.usage || bytes)} of about ${formatBytes(info.quota)} used. Browsers may evict packs under pressure — protect them below.`;

  const persistBtn = $('persistBtn');
  persistBtn.disabled = info.persisted;
  persistBtn.textContent = info.persisted ? 'Protected from eviction' : 'Protect from eviction';

  const list = $('packList');
  list.replaceChildren();
  if (!installed.length) {
    list.append(h('li', 'pack-empty', 'No packs installed yet. Grab one from the shelf.'));
  }
  for (const pack of installed) {
    const row = h('li', 'pack-row');
    const swatch = h('span', 'swatch');
    swatch.style.setProperty('--swatch', pack.accent || 'var(--cyan)');
    const name = h('div', 'pack-name');
    name.append(h('strong', null, pack.name));
    name.append(
      h(
        'span',
        null,
        `${formatBytes(pack.size)} · v${pack.version} · ${pack.plays || 0} ${
          (pack.plays || 0) === 1 ? 'load' : 'loads'
        }${pack.savedAt ? ` · ${formatDate(pack.savedAt)}` : ''}`,
      ),
    );
    const remove = h('button', null, '✕');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete ${pack.name}`);
    remove.addEventListener('click', async () => {
      await deletePack(pack.id);
      await refreshInstalled();
      render();
      await renderSheet();
      toast(`${pack.name} removed.`, 'good');
    });
    row.append(swatch, name, remove);
    list.append(row);
  }
}

/* ----------------------------------- boot --------------------------------- */

function wireUi() {
  $('repoLink').href = REPO_URL;

  $('storageBtn').addEventListener('click', openSheet);
  $('sheetClose').addEventListener('click', closeSheet);
  $('sheetBackdrop').addEventListener('click', (event) => {
    if (event.target === $('sheetBackdrop')) closeSheet();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('sheetBackdrop').hidden) closeSheet();
  });

  $('clearBtn').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (!button.dataset.armed) {
      button.dataset.armed = '1';
      button.textContent = 'Tap again to confirm';
      setTimeout(() => {
        delete button.dataset.armed;
        button.textContent = 'Delete all packs';
      }, 3200);
      return;
    }
    delete button.dataset.armed;
    button.textContent = 'Delete all packs';
    await clearPacks();
    await refreshInstalled();
    render();
    await renderSheet();
    toast('All packs deleted. The shelf can re-download them.', 'good');
  });

  $('persistBtn').addEventListener('click', async () => {
    const granted = await requestPersist();
    toast(
      granted
        ? 'Packs are now protected from automatic eviction.'
        : 'The browser declined. Installing the app to the home screen usually helps.',
      granted ? 'good' : 'bad',
    );
    await renderSheet();
  });

  $('refreshBtn').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Checking…';
    await loadCatalog();
    button.disabled = false;
    button.textContent = 'Check for updates';
  });

  $('resetScoresBtn').addEventListener('click', (event) => {
    const button = event.currentTarget;
    if (!button.dataset.armed) {
      button.dataset.armed = '1';
      button.textContent = 'tap again to confirm';
      setTimeout(() => {
        delete button.dataset.armed;
        button.textContent = 'reset scores';
      }, 3200);
      return;
    }
    delete button.dataset.armed;
    button.textContent = 'reset scores';
    localStorage.removeItem('neon-arcade:scores:v1');
    state.scores = {};
    render();
    toast('Scores cleared.', 'good');
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    $('installBtn').hidden = false;
  });
  $('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      /* ignored */
    }
    deferredPrompt = null;
    $('installBtn').hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    $('installBtn').hidden = true;
    toast('Installed. The arcade and its packs now work offline.', 'good');
  });

  window.addEventListener('online', () => {
    toast('Back online — checking the catalog.', 'good');
    loadCatalog({ quiet: true });
  });

  if ('serviceWorker' in navigator) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.ready.then(() => {
      if (localStorage.getItem(ANNOUNCED_KEY)) return;
      localStorage.setItem(ANNOUNCED_KEY, '1');
      setTimeout(() => {
        toast('Arcade shell cached. Installed packs now launch offline.', 'good');
      }, 1600);
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      toast('A new build of the arcade is ready.', '', {
        actionLabel: 'Reload',
        onAction: () => location.reload(),
        timeout: 12000,
      });
    });
  }
}

async function boot() {
  player = new Player({
    audio,
    onExit: async () => {
      hub?.setActive(true);
      await refreshInstalled();
      state.scores = readScores();
      render();
    },
    onInstall: async () => {
      await refreshInstalled();
      render();
      state.scores = readScores();
    },
    onScoresChanged: () => {
      state.scores = readScores();
      updateStats();
    },
    onToast: (message, kind) => toast(message, kind || ''),
  });

  wireUi();
  await loadCatalog({ quiet: true });

  requestAnimationFrame(() => {
    import('./hub/hubScene.js')
      .then(({ createHubScene }) => {
        hub = createHubScene($('bg'));
        if (player.isOpen) hub.setActive(false);
      })
      .catch((error) => console.warn('hub scene unavailable', error));
  });
}

boot();
