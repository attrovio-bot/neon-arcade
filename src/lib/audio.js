/**
 * Tiny WebAudio synth so games can ship without audio files, plus haptics.
 * The AudioContext is created lazily on the first user gesture.
 */
const MUTE_KEY = 'neon-arcade:muted';

export function createAudio() {
  let context = null;
  let master = null;
  let muted = localStorage.getItem(MUTE_KEY) === '1';
  const listeners = new Set();

  function ensure() {
    if (muted) return null;
    if (!context) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.9;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  function tone({
    freq = 220,
    freqEnd,
    dur = 0.12,
    type = 'sine',
    gain = 0.12,
    attack = 0.004,
    delay = 0,
    detune = 0,
  } = {}) {
    const ctx = ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    if (detune) osc.detune.value = detune;
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.2, gain = 0.1, freq = 900, q = 0.8, delay = 0 } = {}) {
    const ctx = ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const length = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    source.connect(filter).connect(amp).connect(master);
    source.start(t0);
  }

  return {
    tone,
    noise,
    unlock: ensure,
    isMuted: () => muted,
    setMuted(next) {
      muted = next;
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      if (muted && context) {
        master.gain.setTargetAtTime(0.0001, context.currentTime, 0.02);
      } else if (!muted && master && context) {
        master.gain.setTargetAtTime(0.9, context.currentTime, 0.02);
        ensure();
      }
      listeners.forEach((fn) => fn(muted));
    },
    onMuteChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function haptic(pattern = 12) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* iOS ignores it */
    }
  }
}
