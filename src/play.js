import { fetchWithProgress } from './lib/download.js';
import { parsePack, verifyPack, unpack } from './lib/pack.js';
import { getPack, savePack, markPlayed } from './lib/storage.js';
import { formatBytes, formatRate, formatCount } from './lib/format.js';
import { haptic } from './lib/audio.js';

const BASE = import.meta.env.BASE_URL;
const SCORE_KEY = 'neon-arcade:scores:v1';
const CHUNKS = 28;

export function readScores() {
  try {
    return JSON.parse(localStorage.getItem(SCORE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function writeScore(id, score) {
  const scores = readScores();
  if (!(score > (scores[id] ?? 0))) return false;
  scores[id] = score;
  localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
  return true;
}

function readBest(id) {
  return readScores()[id] ?? 0;
}

/**
 * Owns the full-screen play surface: download -> verify -> unpack -> run.
 * A game pack never touches the network again once it is installed.
 */
export class Player {
  constructor({ audio, onExit, onInstall, onScoresChanged, onToast }) {
    this.audio = audio;
    this.onExit = onExit;
    this.onInstall = onInstall;
    this.onScoresChanged = onScoresChanged;
    this.onToast = onToast;

    this.root = document.getElementById('play');
    this.stage = document.getElementById('stage');
    this.hudScore = document.getElementById('hudScore');
    this.hudLabel = document.getElementById('hudLabel');
    this.hudBest = document.getElementById('hudBest');
    this.hint = document.getElementById('playHint');
    this.muteBtn = document.getElementById('muteBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.loader = document.getElementById('loader');
    this.loaderBar = document.getElementById('loaderBar');
    this.loaderTitle = document.getElementById('loaderTitle');
    this.loaderEyebrow = document.getElementById('loaderEyebrow');
    this.loaderStatus = document.getElementById('loaderStatus');
    this.loaderPct = document.getElementById('loaderPct');
    this.chunkStrip = document.getElementById('chunkStrip');
    this.retryBtn = document.getElementById('retryBtn');
    this.againBtn = document.getElementById('againBtn');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.over = document.getElementById('over');
    this.pausedEl = document.getElementById('paused');

    this.chunkCells = [];
    for (let i = 0; i < CHUNKS; i++) {
      const cell = document.createElement('i');
      this.chunkStrip.appendChild(cell);
      this.chunkCells.push(cell);
    }

    this.session = null;
    this.abort = null;
    this.retryAction = null;

    document.getElementById('exitBtn').addEventListener('click', () => this.close());
    document.getElementById('overExitBtn').addEventListener('click', () => this.close());
    this.retryBtn.addEventListener('click', () => {
      const action = this.retryAction;
      this.retryAction = null;
      this.#resetLoaderButtons();
      if (action) action();
      else this.#retry();
    });
    this.cancelBtn.addEventListener('click', () => {
      this.abort?.abort();
      this.close();
    });
    this.againBtn.addEventListener('click', () => this.#retry());
    this.pauseBtn.addEventListener('click', () => this.#pause());
    document.getElementById('resumeBtn').addEventListener('click', () => this.#resume());
    document.getElementById('quitBtn').addEventListener('click', () => this.close());
    this.muteBtn.addEventListener('click', () => {
      this.audio.setMuted(!this.audio.isMuted());
      this.#paintMute();
    });
    this.#paintMute();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.session?.playing) this.#pause();
    });
    window.addEventListener('keydown', (event) => {
      if (!this.session) return;
      if (event.key === 'Escape') {
        const modal = !this.pausedEl.hidden || !this.over.hidden;
        if (!this.loader.hidden || modal) {
          this.abort?.abort();
          this.close();
        } else if (this.session.playing) {
          this.#pause();
        } else if (this.session.paused) {
          this.#resume();
        }
      }
      if (event.key === 'p' && this.session.paused) this.#resume();
    });
    document.getElementById('stage').addEventListener('pointerdown', () => this.audio.unlock(), {
      once: true,
    });
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => this.#resize()).observe(this.stage);
    } else {
      window.addEventListener('resize', () => this.#resize());
    }
  }

  get isOpen() {
    return !this.root.hidden;
  }

  async play(meta, { force = false } = {}) {
    if (this.session) await this.close({ silent: true });
    this.meta = meta;
    this.best = readBest(meta.id);
    this.root.hidden = false;
    document.body.classList.add('is-playing');
    this.stage.style.setProperty('--glow', meta.accent || '#22e1ff');
    this.over.hidden = true;
    this.pausedEl.hidden = true;
    this.hint.textContent = meta.hint || '';
    this.hint.classList.remove('fade');
    this.hudLabel.textContent = meta.scoreLabel || 'SCORE';
    this.hudBest.textContent = `BEST ${formatCount(this.best)}`;
    this.hudScore.textContent = '0';
    this.score = 0;
    this.session = { meta, record: null, handle: null, raf: 0, playing: false, paused: false, ended: false, ending: false };

    const record = await this.#install(meta, force);
    if (!record) return;
    this.session.record = record;
    await this.#launch(record);
  }

  async close({ silent = false } = {}) {
    this.abort?.abort();
    this.abort = null;
    const session = this.session;
    this.session = null;
    if (session) {
      cancelAnimationFrame(session.raf);
      try {
        session.handle?.dispose?.();
      } catch (error) {
        console.warn('dispose failed', error);
      }
      this.#revokeAssets();
      this.stage.replaceChildren();
    }
    this.root.hidden = true;
    this.loader.hidden = true;
    this.over.hidden = true;
    this.pausedEl.hidden = true;
    this.root.classList.remove('is-loading');
    document.body.classList.remove('is-playing');
    if (!silent) this.onExit?.();
  }

  async #install(meta, force) {
    const cached = await getPack(meta.id);
    const fresh =
      cached && cached.version === meta.version && (!meta.sha256 || cached.sha256 === meta.sha256);
    if (cached && fresh && !force) {
      this.loader.hidden = true;
      return cached;
    }

    this.#showLoader(meta, 'fetching pack', 'connect to github pages');
    this.#paintChunks(-1, '');
    this.abort = new AbortController();

    try {
      this.#setStatus(`streaming ${formatBytes(meta.size)} container`, 0);
      const { bytes } = await fetchWithProgress(`${BASE}${meta.file}`, {
        signal: this.abort.signal,
        onProgress: ({ received, total, rate }) => {
          const size = total || meta.size || received;
          const pct = size ? Math.min(1, received / size) : 0;
          this.#setProgress(pct, `${formatBytes(received)} / ${formatBytes(size)}  ·  ${formatRate(rate)}`);
        },
      });

      this.#loaderEyebrow('verifying');
      this.#setStatus('hashing sha-256…', 1);
      this.#paintChunks(1, 'verified');
      const parsed = parsePack(bytes);
      const verdict = await verifyPack(parsed, meta.sha256);
      if (!verdict.ok) {
        throw new Error('Checksum mismatch — the pack was altered in transit.');
      }

      this.#loaderEyebrow('unpacking');
      this.#setStatus('inflating game code…', 1);
      const { header, source, assets } = await unpack(parsed);

      const metaRecord = {
        id: header.id,
        name: header.name,
        tagline: header.tagline,
        version: header.version,
        sha256: header.payloadSha256,
        size: bytes.byteLength,
        accent: header.accent,
        accent2: header.accent2,
        art: header.art,
        hint: header.hint,
        controls: header.controls,
        scoreLabel: meta.scoreLabel,
        savedAt: Date.now(),
        plays: cached?.plays ?? 0,
        lastPlayed: cached?.lastPlayed ?? 0,
      };
      const blobs = {
        id: header.id,
        source,
        assets: assets.map((asset) => ({
          path: asset.path,
          mime: asset.mime,
          bytes: asset.bytes.buffer.slice(asset.bytes.byteOffset, asset.bytes.byteOffset + asset.bytes.byteLength),
        })),
      };

      let stored = true;
      try {
        await savePack({ meta: metaRecord, blobs });
      } catch (error) {
        stored = false;
        console.warn('could not cache pack', error);
        this.onToast?.(
          'Pack plays now but could not be cached (storage full). It will re-download next time.',
          'bad',
        );
      }
      if (stored) this.onInstall?.();
      this.loader.hidden = true;
      return { ...metaRecord, source, assets };
    } catch (error) {
      if (error.name === 'AbortError') {
        this.close();
        return null;
      }
      console.warn(error);
      this.#fail(error, () => this.play(meta, { force: true }));
      return null;
    }
  }

  #fail(error, retry) {
    const offline = !navigator.onLine;
    const message = offline
      ? 'You are offline and this pack is not installed yet. Reconnect to download it.'
      : error.message || 'Something went wrong.';
    this.#loaderEyebrow('failed');
    this.loaderTitle.textContent = this.meta?.name ?? 'Pack';
    this.#setStatus(message, 0);
    this.loaderPct.textContent = '—';
    this.loaderBar.style.width = '0%';
    this.retryAction = retry;
    this.retryBtn.hidden = false;
    this.cancelBtn.textContent = 'Arcade';
  }

  async #launch(record) {
    const session = this.session;
    if (!session) return;
    this.#showLoader(this.meta, 'starting engine', 'loading webgl…');
    this.#setProgress(1, 'ready');
    this.#loaderEyebrow('running');
    this.#setStatus('mounting renderer…', 1);
    this.#resetLoaderButtons();

    const assetUrls = [];
    const assets = new Map();
    for (const asset of record.assets ?? []) {
      const url = URL.createObjectURL(new Blob([asset.bytes], { type: asset.mime }));
      assetUrls.push(url);
      assets.set(asset.path, url);
    }
    this.assetUrls = assetUrls;

    const moduleUrl = URL.createObjectURL(new Blob([record.source], { type: 'text/javascript' }));
    let module;
    try {
      module = await import(/* @vite-ignore */ moduleUrl);
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }
    const game = module.default ?? module;
    if (typeof game?.init !== 'function') throw new Error('Pack entry does not export a game.');

    this.stage.replaceChildren();
    const rect = this.stage.getBoundingClientRect();
    const ctx = {
      stage: this.stage,
      meta: this.meta,
      width: rect.width,
      height: rect.height,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      assets: {
        url: (path) => assets.get(path) ?? null,
        has: (path) => assets.has(path),
      },
      audio: this.audio,
      haptic,
      best: this.best,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      coarsePointer: window.matchMedia('(pointer: coarse)').matches,
      setScore: (value) => this.#setScore(value),
      setLabel: (label) => {
        this.hudLabel.textContent = label;
      },
      gameOver: (payload) => this.#gameOver(payload),
      toast: (message) => this.onToast?.(message),
    };

    try {
      session.handle = await game.init(ctx);
    } catch (error) {
      this.#revokeAssets();
      this.#fail(error, () => this.play(this.meta, { force: true }));
      return;
    }
    session.ctx = ctx;
    session.playing = true;
    this.loader.hidden = true;
    this.root.classList.remove('is-loading');
    markPlayed(this.meta.id).catch(() => {});
    this.#fadeHint(5200);
    this.last = performance.now();
    session.raf = requestAnimationFrame((now) => this.#tick(now));
  }

  #tick(now) {
    const session = this.session;
    if (!session) return;
    session.raf = requestAnimationFrame((now) => this.#tick(now));
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;

    if (session.ending && now >= session.endAt) {
      this.#finish();
      return;
    }
    if (!session.playing || session.paused) return;

    try {
      session.handle?.update?.(dt);
      session.handle?.render?.();
    } catch (error) {
      console.error('game crashed', error);
      session.playing = false;
      this.onToast?.('The game stopped unexpectedly.', 'bad');
      this.#gameOver({ score: this.score, delay: 0, note: 'The pack hit a runtime error.' });
    }
  }

  #setScore(value) {
    this.score = Math.max(0, Math.round(value));
    const text = formatCount(this.score);
    if (this.hudScore.textContent !== text) {
      this.hudScore.textContent = text;
      this.hudScore.classList.add('bump');
      setTimeout(() => this.hudScore.classList.remove('bump'), 130);
    }
    // Show a live record instead of a stale "BEST 0" while the run beats it.
    if (this.score > this.best) {
      this.hudBest.textContent = `BEST ${formatCount(this.score)}`;
    }
  }

  #gameOver({ score, note = '', delay = 0.9 } = {}) {
    const session = this.session;
    if (!session || session.ending) return;
    session.ending = true;
    session.endAt = performance.now() + delay * 1000;
    session.note = note;
    if (typeof score === 'number') this.#setScore(score);
  }

  #finish() {
    const session = this.session;
    if (!session) return;
    session.ending = false;
    session.playing = false;
    cancelAnimationFrame(session.raf);
    const score = this.score;
    const isBest = writeScore(this.meta.id, score);
    if (isBest) this.best = score;
    this.hudBest.textContent = `BEST ${formatCount(this.best)}`;
    if (isBest) this.onScoresChanged?.();
    haptic(isBest ? [18, 40, 18] : 20);

    document.getElementById('overScore').textContent = formatCount(score);
    document.getElementById('overBest').textContent = `best ${formatCount(this.best)}`;
    const eyebrow = document.getElementById('overEyebrow');
    eyebrow.textContent = isBest && score > 0 ? 'new personal best' : 'run over';
    eyebrow.classList.toggle('is-best', isBest && score > 0);
    document.getElementById('overNote').textContent = session.note || '';
    this.over.hidden = false;
    this.hint.classList.add('fade');
    this.audio.tone({ freq: isBest ? 660 : 180, freqEnd: isBest ? 990 : 120, dur: 0.22, type: 'triangle', gain: 0.07 });
  }

  async #retry() {
    const session = this.session;
    if (!session) return;
    this.#resetLoaderButtons();
    this.retryAction = null;
    session.handle?.dispose?.();
    session.handle = null;
    this.stage.replaceChildren();
    this.#revokeAssets();
    this.over.hidden = true;
    this.pausedEl.hidden = true;
    session.ended = false;
    session.ending = false;
    session.paused = false;
    this.hudScore.textContent = '0';
    this.score = 0;
    this.hint.classList.remove('fade');
    try {
      await this.#launch(session.record);
      this.#fadeHint(4200);
    } catch (error) {
      this.#fail(error, () => this.#retry());
    }
  }

  #pause() {
    const session = this.session;
    if (!session?.playing || session.paused) return;
    session.paused = true;
    cancelAnimationFrame(session.raf);
    session.handle?.pause?.();
    this.pausedEl.hidden = false;
    this.audio.tone({ freq: 320, dur: 0.08, type: 'sine', gain: 0.05 });
  }

  #resume() {
    const session = this.session;
    if (!session || !session.paused) return;
    session.paused = false;
    this.pausedEl.hidden = true;
    session.handle?.resume?.();
    this.last = performance.now();
    session.raf = requestAnimationFrame((now) => this.#tick(now));
  }

  #resize() {
    const session = this.session;
    if (!session?.handle?.resize) return;
    const rect = this.stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    session.ctx.width = rect.width;
    session.ctx.height = rect.height;
    session.ctx.dpr = Math.min(window.devicePixelRatio || 1, 2);
    session.handle.resize(rect.width, rect.height, session.ctx.dpr);
  }

  #revokeAssets() {
    for (const url of this.assetUrls ?? []) URL.revokeObjectURL(url);
    this.assetUrls = [];
  }

  #fadeHint(delay) {
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hint.classList.add('fade'), delay);
  }

  #paintMute() {
    const muted = this.audio.isMuted();
    this.muteBtn.textContent = muted ? '✕' : '♪';
    this.muteBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
  }

  #showLoader(meta, eyebrow, status) {
    this.root.classList.add('is-loading');
    this.loader.hidden = false;
    this.loaderTitle.textContent = meta.name;
    this.#loaderEyebrow(eyebrow);
    this.#setStatus(status, 0);
    this.#paintChunks(0, '');
    this.#resetLoaderButtons();
  }

  #loaderEyebrow(text) {
    this.loaderEyebrow.textContent = text;
  }

  #setProgress(pct, status) {
    const clamped = Math.max(0, Math.min(1, pct));
    this.loaderBar.style.width = `${(clamped * 100).toFixed(1)}%`;
    this.loaderPct.textContent = `${Math.round(clamped * 100)}%`;
    if (status) this.loaderStatus.textContent = status;
    this.#paintChunks(clamped, '');
  }

  #setStatus(status, pct) {
    this.loaderStatus.textContent = status;
    this.#paintChunks(pct, '');
  }

  #paintChunks(progress, state) {
    const filled = Math.round(Math.max(0, Math.min(1, progress)) * CHUNKS);
    this.chunkCells.forEach((cell, index) => {
      cell.className = index < filled ? (state === 'verified' ? 'verified' : 'on') : '';
    });
  }

  #resetLoaderButtons() {
    this.retryAction = null;
    this.retryBtn.hidden = true;
    this.cancelBtn.textContent = 'Cancel download';
  }
}
