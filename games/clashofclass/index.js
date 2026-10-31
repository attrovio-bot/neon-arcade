/**
 * CLASH OF CLASS — pack entry.
 *
 * The hub owns the rAF loop and calls update/render/resize; this pack owns the
 * screen state machine (levels → army → battle → result), the localStorage save,
 * the pointer-deploy loop and the ctx bridge (stars as score, audio, haptics).
 * Simulation lives in battle.js, drawing in render.js, DOM screens in ui.js.
 */

import { LEVELS, DEPLOY_REPEAT } from './data.js';
import {
  createBattle,
  updateBattle,
  finishBattle,
  deployUnit,
  selectUnit,
} from './battle.js';
import { createRenderer } from './render.js';
import { createUI } from './ui.js';

const SAVE_KEY = 'neon-arcade:clashofclass:v1';

function readSave() {
  const fallback = { unlocked: 1, stars: {}, plays: 0, last: 1 };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      unlocked: Math.min(LEVELS.length, Math.max(1, parsed.unlocked | 0)),
      stars: parsed.stars && typeof parsed.stars === 'object' ? parsed.stars : {},
      plays: parsed.plays | 0,
      last: Math.min(LEVELS.length, Math.max(1, parsed.last | 0)),
    };
  } catch {
    return fallback;
  }
}

function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* private mode — progress lives in memory only */
  }
}

export default {
  init(ctx) {
    const stage = ctx.stage;
    const save = readSave();

    /* ------------------------------- audio glue ------------------------------ */

    const SFX = {
      deploy: () => ctx.audio.tone({ freq: 340, freqEnd: 520, dur: 0.09, type: 'triangle', gain: 0.12 }),
      zap: () => ctx.audio.noise({ dur: 0.08, gain: 0.1, freq: 2600, q: 2 }),
      hit: () => ctx.audio.noise({ dur: 0.06, gain: 0.08, freq: 900, q: 1.2 }),
      boom: () => {
        ctx.audio.noise({ dur: 0.35, gain: 0.2, freq: 180, q: 0.8 });
        ctx.audio.tone({ freq: 90, freqEnd: 40, dur: 0.3, type: 'sine', gain: 0.2 });
      },
      rubble: () => ctx.audio.noise({ dur: 0.22, gain: 0.14, freq: 500, q: 0.7 }),
      thump: () => ctx.audio.tone({ freq: 120, freqEnd: 60, dur: 0.14, type: 'sine', gain: 0.16 }),
      shoot: () => ctx.audio.tone({ freq: 720, freqEnd: 420, dur: 0.05, type: 'square', gain: 0.04 }),
      poof: () => ctx.audio.noise({ dur: 0.18, gain: 0.09, freq: 600, q: 0.9 }),
      heal: () => ctx.audio.tone({ freq: 660, freqEnd: 990, dur: 0.12, type: 'sine', gain: 0.06 }),
      wallbreak: () => {
        ctx.audio.noise({ dur: 0.16, gain: 0.16, freq: 320, q: 1.1 });
        ctx.audio.tone({ freq: 200, freqEnd: 90, dur: 0.12, type: 'square', gain: 0.08 });
      },
      star: () => {
        ctx.audio.tone({ freq: 880, dur: 0.1, type: 'triangle', gain: 0.1 });
        ctx.audio.tone({ freq: 1320, dur: 0.16, type: 'triangle', gain: 0.1, delay: 0.09 });
      },
      win: () => {
        ctx.audio.tone({ freq: 523, dur: 0.12, type: 'triangle', gain: 0.12 });
        ctx.audio.tone({ freq: 659, dur: 0.12, type: 'triangle', gain: 0.12, delay: 0.11 });
        ctx.audio.tone({ freq: 784, dur: 0.22, type: 'triangle', gain: 0.14, delay: 0.22 });
      },
      lose: () => ctx.audio.tone({ freq: 300, freqEnd: 180, dur: 0.3, type: 'sawtooth', gain: 0.06 }),
      tick: () => ctx.audio.tone({ freq: 980, dur: 0.03, type: 'square', gain: 0.035 }),
      deny: () => ctx.audio.tone({ freq: 160, dur: 0.12, type: 'square', gain: 0.06 }),
    };
    // Continuous sounds get throttled so a 200-unit brawl stays pleasant.
    const THROTTLE_MS = { shoot: 70, hit: 70, zap: 70, thump: 90, poof: 90, heal: 130 };
    const lastSfx = {};

    function playSfx(kind) {
      const now = performance.now();
      const min = THROTTLE_MS[kind] ?? 0;
      if (min && now - (lastSfx[kind] || 0) < min) return;
      lastSfx[kind] = now;
      SFX[kind]?.();
      if (kind === 'boom' || kind === 'star') ctx.haptic?.(12);
    }

    /* --------------------------------- screens -------------------------------- */

    const ui = createUI(stage, {
      onPickLevel: (order) => gotoArmy(order),
      onBackLevels: () => gotoLevels(),
      onFight: (army) => startBattle(army),
      onEndRaid: () => {
        if (battle && battle.phase !== 'over') finishBattle(battle, { retreat: true });
      },
      onSelectType: (type) => {
        if (battle) selectUnit(battle, type);
      },
      onSound: playSfx,
      onRetry: () => gotoArmy(currentLevel.order, ui.getArmy()),
      onToLevels: () => gotoLevels(),
      onNextLevel: (order) => gotoArmy(order),
    });

    const renderer = createRenderer(stage);

    let screen = 'levels'; // levels | army | battle | result
    let currentLevel = LEVELS[0];
    let battle = null;
    let preview = null;
    let previewTheme = null;

    const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);
    function commitScore() {
      const total = totalStars();
      ctx.setScore?.(total);
      ctx.saveScore?.(total);
    }

    function backdrop(level) {
      preview = createBattle(level, { preview: true });
      previewTheme = level.theme;
    }

    function gotoLevels() {
      screen = 'levels';
      battle = null;
      const lv = LEVELS[Math.min(save.unlocked, LEVELS.length) - 1];
      currentLevel = lv;
      backdrop(lv);
      ui.showLevels(save);
      commitScore();
    }

    function gotoArmy(order, army) {
      screen = 'army';
      battle = null;
      const lv = LEVELS.find((level) => level.order === order) || LEVELS[0];
      currentLevel = lv;
      save.last = lv.order;
      writeSave(save);
      backdrop(lv);
      ui.showArmy(lv, save, army);
    }

    function startBattle(army) {
      screen = 'battle';
      battle = createBattle(currentLevel, {
        army,
        hooks: { onEnd: onBattleEnd, onStar: onStar, onSound: playSfx },
      });
      ui.showBattle(currentLevel, battle);
      ui.flash('Deploy your troops!', 'good');
      ctx.haptic?.(8);
    }

    function onStar() {
      playSfx('star');
      ui.flash('★ Star earned!', 'good');
    }

    function onBattleEnd(result) {
      if (screen !== 'battle') return;
      screen = 'result';
      playSfx(result.won ? 'win' : 'lose');

      const lv = currentLevel;
      let newBest = false;
      if (result.won) {
        const before = save.stars[lv.order] || 0;
        if (result.stars > before) {
          save.stars[lv.order] = result.stars;
          newBest = true;
        }
        if (lv.order === save.unlocked && lv.order < LEVELS.length) {
          save.unlocked = lv.order + 1;
        }
      }
      save.plays = (save.plays || 0) + 1;
      writeSave(save);
      commitScore();
      if (newBest) ctx.haptic?.([16, 40, 16]);

      ui.showResult(result, lv, save);
    }

    /* --------------------------------- pointer -------------------------------- */
    // Tap the blue grass to drop the selected troop; hold to keep deploying.

    const pointer = { x: 0, y: 0, active: false, down: false };
    let holdTimer = null;

    function updatePointer(event) {
      const field = renderer.toField(event.clientX, event.clientY);
      pointer.x = field.x;
      pointer.y = field.y;
      const rect = renderer.canvas.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      pointer.active = screen === 'battle' && (pointer.down || inside);
    }

    function tryDeploy(explain) {
      if (!battle || battle.phase === 'over' || battle.phase === 'preview') return;
      const result = deployUnit(battle, battle.selected, pointer.x, pointer.y);
      if (result.ok) {
        playSfx('deploy');
        return;
      }
      if (explain && result.why) ui.flash(result.why, '');
    }

    function onPointerDown(event) {
      if (screen !== 'battle' || !battle) return;
      if (event.target !== renderer.canvas) return;
      event.preventDefault();
      pointer.down = true;
      updatePointer(event);
      tryDeploy(true);
      clearInterval(holdTimer);
      holdTimer = setInterval(() => {
        if (pointer.down) tryDeploy(false);
      }, DEPLOY_REPEAT * 1000);
    }

    function onPointerMove(event) {
      if (screen !== 'battle') return;
      updatePointer(event);
    }

    function onPointerUp() {
      pointer.down = false;
      clearInterval(holdTimer);
      holdTimer = null;
    }

    /* ------------------------------ hub lifecycle ----------------------------- */

    ctx.setLabel?.('STARS');
    renderer.resize(ctx.width, ctx.height, ctx.dpr);
    gotoLevels();

    renderer.canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return {
      update(dt) {
        if (screen === 'battle' && battle) {
          updateBattle(battle, dt);
          ui.updateBattle(battle);
        }
      },
      render() {
        const source = battle || preview;
        if (!source) return;
        renderer.draw({
          battle: source,
          theme: previewTheme,
          mode: screen,
          pointer: pointer.active ? pointer : null,
          dim: screen === 'battle' ? 0 : 0.55,
        });
      },
      resize(width, height, dpr) {
        renderer.resize(width, height, dpr);
      },
      pause() {
        pointer.down = false;
        clearInterval(holdTimer);
        holdTimer = null;
      },
      resume() {
        /* the hub restarts update/render; nothing to rewind */
      },
      dispose() {
        clearInterval(holdTimer);
        holdTimer = null;
        renderer.canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        ui.dispose();
        renderer.dispose();
      },
    };
  },
};
