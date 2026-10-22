/**
 * FIRENZE: LAST LIGHT — pack entry.
 *
 * The city itself is the save file: every restored building, every survivor,
 * every nest and every crate of stores is written to localStorage and restored
 * exactly as it was. Losing a horde never wipes or restarts the district.
 */

import { BUILDINGS, LEVELS } from './levels.js';
import { createSim } from './sim.js';
import { createWorld } from './world.js';
import { createUI } from './ui.js';

const SAVE_KEY = 'neon-arcade:firenze:city:v1';
const AUTOSAVE = 3;
const CYAN = 0x22e1ff;
const MAGENTA = 0xff2f8e;
const LIME = 0xb9ff4d;
const AMBER = 0xffc857;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const sumWaves = (cleared) =>
  Object.values(cleared || {}).reduce((total, value) => total + clamp(Number(value) || 0, 0, 3), 0);

function readSave(ctx) {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  } catch (error) {
    console.warn('firenze save unreadable', error);
  }

  const save = {
    v: 1,
    unlocked: 1,
    cleared: { 1: 0, 2: 0, 3: 0 },
    last: 1,
    meta: { routes: [], gear: [], upg: { weapon: 0, armor: 0 } },
    cities: {},
    totalWaves: 0,
    stats: { kills: 0, cured: 0, built: 0, lost: 0 },
  };

  if (raw && typeof raw === 'object') {
    save.v = 1;
    save.unlocked = clamp(Math.round(Number(raw.unlocked) || 1), 1, 3);
    save.last = clamp(Math.round(Number(raw.last) || 1), 1, 3);
    for (const order of [1, 2, 3]) {
      save.cleared[order] = clamp(Math.round(Number(raw.cleared?.[order]) || 0), 0, 3);
    }
    save.meta.routes = Array.isArray(raw.meta?.routes)
      ? [...new Set(raw.meta.routes.filter((id) => typeof id === 'string'))]
      : [];
    save.meta.gear = Array.isArray(raw.meta?.gear)
      ? [...new Set(raw.meta.gear.filter((id) => typeof id === 'string'))]
      : [];
    save.meta.upg.weapon = clamp(Math.round(Number(raw.meta?.upg?.weapon) || 0), 0, 3);
    save.meta.upg.armor = clamp(Math.round(Number(raw.meta?.upg?.armor) || 0), 0, 3);
    if (raw.cities && typeof raw.cities === 'object') {
      for (const level of LEVELS) {
        const city = raw.cities[level.id];
        if (city && typeof city === 'object' && Array.isArray(city.nodes)) {
          save.cities[level.id] = city;
        }
      }
    }
    for (const key of ['kills', 'cured', 'built', 'lost']) {
      const value = Number(raw.stats?.[key]);
      if (Number.isFinite(value)) save.stats[key] = Math.max(0, Math.round(value));
    }
  }

  // A previous arcade best (waves held) can bootstrap a save that was cleared
  // by browser storage pressure. It never lowers real progress.
  const best = Math.max(0, Math.round(Number(ctx.best) || 0));
  const fromCleared = sumWaves(save.cleared);
  save.totalWaves = Math.max(fromCleared, best);
  if (!raw && best > 0) {
    save.unlocked = best >= 6 ? 3 : best >= 3 ? 2 : 1;
  }
  save.last = clamp(save.last, 1, save.unlocked);

  return save;
}

export default {
  init(ctx) {
    const save = readSave(ctx);
    const world = createWorld({ stage: ctx.stage, onTap: handleTap });
    const ui = createUI(ctx.stage, callbacks());

    let sim = null;
    let currentLevel = null;
    let active = false;
    let autosave = 0;
    let disposed = false;

    ui.setCatalog(BUILDINGS);
    ui.setLevels(LEVELS);

    world.resize(ctx.width, ctx.height, ctx.dpr);
    ctx.setLabel?.(ctx.meta?.scoreLabel || 'WAVES');
    ctx.setScore?.(save.totalWaves);

    /* -------------------------------- persistence ------------------------------ */

    function captureCity() {
      if (!sim || !currentLevel) return;
      save.cities[currentLevel.id] = sim.snapshot();
    }

    function persist() {
      if (disposed) return;
      captureCity();
      save.totalWaves = sumWaves(save.cleared);
      save.last = currentLevel?.order || save.last || 1;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      } catch (error) {
        console.warn('firenze could not save', error);
      }
      const waves = save.totalWaves;
      ctx.setScore?.(waves);
      ctx.saveScore?.(waves);
    }

    function flush() {
      captureCity();
      save.totalWaves = sumWaves(save.cleared);
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      } catch {
        /* storage full: the run continues in memory */
      }
    }

    const onHide = () => {
      if (document.hidden) flush();
    };
    const onPageHide = () => flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);

    /* --------------------------------- screens --------------------------------- */

    function previewLevel(order) {
      const level = LEVELS.find((lv) => lv.order === order) || LEVELS[0];
      currentLevel = level;
      active = false;
      sim = createSim(level, save.meta, {}, save.cities[level.id] || null);
      world.loadLevel(level);
      world.sync(sim.state, 0);
    }

    function showStart() {
      previewLevel(save.last);
      ui.showStart(LEVELS, save, save.last);
      world.render();
    }

    function enterLevel(order, { fromVictory = false } = {}) {
      const level = LEVELS.find((lv) => lv.order === order);
      if (!level) return;
      if (order > save.unlocked) {
        ui.flash('That district is still cut off.', 'bad');
        return;
      }
      if (currentLevel && currentLevel.id !== level.id) {
        captureCity();
      }
      currentLevel = level;
      save.last = level.order;
      sim = createSim(level, save.meta, hooks(), save.cities[level.id] || null);
      active = true;
      autosave = 0;

      world.loadLevel(level);
      ui.bind(sim, save, level);
      ui.hideStart();
      ui.hideVictory();
      ui.hideModal();
      ui.danger(false);
      ui.fromVictory?.(fromVictory);
      world.sync(sim.state, 0);
      persist();
      world.fit();
      ctx.haptic?.(10);
      ui.flash(`Welcome back to ${level.name}. The city is as you left it.`, 'good');
    }

    /* ---------------------------------- hooks ---------------------------------- */

    function hooks() {
      return {
        onBuilt(node) {
          world.burst(node.x, node.z, LIME, 16, 2.6, 1.1);
          world.ringEffect(node.x, node.z, LIME, 2.4, 0.7);
          ui.flash(`${node.label} restored.`, 'good');
          persist();
        },
        onRepair(node) {
          world.burst(node.x, node.z, CYAN, 8, 1.7, 1);
          ui.flash(`${node.label} repaired.`, 'good');
          persist();
        },
        onBuildStart() {
          persist();
        },
        onDestroyed(node) {
          world.burst(node.x, node.z, MAGENTA, 22, 3.2, 1.2);
          world.shake(ctx.reducedMotion ? 0.1 : 0.55);
          ui.flash(`${node.label} has fallen.`, 'bad');
          persist();
        },
        onBuildingHit(node) {
          if (Math.random() < 0.4) world.burst(node.x, node.z, AMBER, 3, 1.3, 1.1);
        },
        onCureStart(nest) {
          world.ringEffect(nest.x, nest.z, LIME, 3.4, 0.9);
          ui.flash('The Infirmary is curing three infected…', '');
        },
        onCureDone(nest, result) {
          world.burst(nest.x, nest.z, LIME, 26, 2.8, 1);
          world.ringEffect(nest.x, nest.z, LIME, 5, 1.1);
          ui.flash(
            result.gained
              ? `+${result.gained} survivors · +${result.biomass} biomass`
              : `No room for survivors · +${result.biomass} biomass`,
            'good',
          );
          ctx.haptic?.(14);
          persist();
        },
        onTrade() {
          ui.flash('Trade agreed.', 'good');
          persist();
        },
        onMeta() {
          ui.flash('Permanent upgrade secured.', 'good');
          persist();
        },
        onMilitia(count, cap) {
          ui.flash(`Militia ${count}/${cap} mustered.`, '');
        },
        onMilitiaDown(unit) {
          world.burst(unit.x, unit.z, CYAN, 8, 1.8, 0.9);
        },
        onMilitiaAttack(unit, target, kind) {
          if (kind === 'bolt') world.shot({ x: unit.x, z: unit.z, kind: 'militia' }, target, AMBER);
        },
        onWaveStart(plan) {
          ui.danger(true);
          ui.hideModal();
          ui.flash(`Horde ${['I', 'II', 'III'][plan.wave - 1]} is coming.`, 'bad');
          world.ringEffect(sim.state.core.x, sim.state.core.z, MAGENTA, 7, 1.2);
          world.shake(ctx.reducedMotion ? 0.1 : 0.35);
          ctx.haptic?.([14, 30, 14]);
          persist();
        },
        onWaveClear({ level, wave, reward }) {
          ui.danger(false);
          save.cleared[level.order] = Math.max(save.cleared[level.order] || 0, wave);
          persist();
          ui.flash(
            `Horde ${['I', 'II', 'III'][wave - 1]} broken · +${Math.round(reward.food)} food, +${Math.round(
              reward.materials,
            )} materials`,
            'good',
          );
          world.ringEffect(sim.state.core.x, sim.state.core.z, LIME, 9, 1.4);
          ctx.haptic?.([16, 40, 16]);
        },
        onVictory({ level, stats }) {
          ui.danger(false);
          save.cleared[level.order] = 3;
          save.unlocked = clamp(Math.max(save.unlocked, level.order + 1), 1, 3);
          save.stats.kills += stats.kills;
          save.stats.cured += stats.cured;
          persist();
          const next = LEVELS.find((lv) => lv.order === level.order + 1) || null;
          ui.showVictory({
            level,
            stats,
            totalWaves: 3,
            final: level.order === LEVELS.length,
            next,
          });
          world.ringEffect(sim.state.core.x, sim.state.core.z, LIME, 14, 1.8);
          ctx.haptic?.([20, 60, 20, 60, 30]);
        },
        onDefeat({ level, wave, stats }) {
          ui.danger(true);
          save.stats.kills += stats.kills;
          save.stats.cured += stats.cured;
          persist();
          ui.showDefeat({ level, wave, stats });
          ctx.haptic?.([30, 60, 30]);
        },
        onRally() {
          ui.danger(false);
          world.burst(sim.state.core.x, sim.state.core.z, LIME, 22, 2.6, 1.4);
          ui.flash('The city rallies. Nothing was erased.', 'good');
          persist();
        },
        onBossSpawn(unit) {
          ui.showBoss();
          ui.flash(`${unit.name} has entered the city.`, 'bad');
          world.ringEffect(unit.x, unit.z, MAGENTA, 8, 1.3);
          world.shake(ctx.reducedMotion ? 0.1 : 0.6);
          ctx.haptic?.([20, 40, 20, 40, 40]);
        },
        onBossDown(unit) {
          ui.hideBoss();
          world.shake(ctx.reducedMotion ? 0.1 : 0.8);
          world.burst(unit.x, unit.z, MAGENTA, 46, 4.4, 1.4);
          world.ringEffect(unit.x, unit.z, AMBER, 12, 1.6);
          ui.flash(`${unit.name} is broken. Hold the line.`, 'good');
        },
        onEnrage() {
          ui.flash('The boss is enraged.', 'bad');
        },
        onSlam(unit) {
          world.shake(ctx.reducedMotion ? 0.08 : 0.35);
          world.ringEffect(unit.x, unit.z, MAGENTA, 5, 0.6);
          world.burst(unit.x, unit.z, MAGENTA, 12, 2.4, 0.8);
        },
        onShot(node, target, kind) {
          world.shot(node, target, kind === 'tower' ? CYAN : AMBER);
        },
        onHit(unit, source) {
          world.burst(unit.x, unit.z, source === 'volley' ? AMBER : LIME, 3, 1.2, 0.7);
        },
        onKill(unit) {
          world.burst(
            unit.x,
            unit.z,
            unit.boss ? MAGENTA : LIME,
            unit.boss ? 30 : 7,
            unit.boss ? 4 : 1.8,
            unit.boss ? 1.4 : 0.7,
          );
        },
        onAbility(id, x, z) {
          if (id === 'volley') {
            world.ringEffect(x, z, AMBER, 16, 0.9);
            world.shake(ctx.reducedMotion ? 0.06 : 0.25);
          } else if (id === 'rally') {
            world.ringEffect(x, z, LIME, 6, 1);
          } else {
            world.burst(x, z, CYAN, 14, 2, 1.6);
          }
          ctx.haptic?.(12);
        },
        onFlash(message, tone) {
          ui.flash(message, tone);
        },
      };
    }

    /* ---------------------------------- input ---------------------------------- */

    function handleTap(target) {
      if (!sim || !active) return;
      if (!target) {
        ui.closeSheet();
        return;
      }
      if (target.type === 'nest') {
        ui.openNest(target.id);
        return;
      }
      ui.openNode(target.id);
    }

    function callbacks() {
      return {
        onPickLevel(order) {
          if (active) return;
          previewLevel(order);
        },
        onStart(order) {
          enterLevel(order);
        },
        onSelect(type, id) {
          if (type && targetById(type, id)) {
            world.setSelected({ type, id });
            const target = targetById(type, id);
            if (target?.x !== undefined) world.focusOn(target.x, target.z);
          } else {
            world.setSelected(null);
          }
        },
        onDeselect() {
          world.setSelected(null);
        },
        onFit() {
          world.fit();
        },
        onRestore(id, kind) {
          const result = sim?.restoreNode(id, kind);
          if (!result?.ok) ui.flash(result?.why || 'Cannot build that yet.', 'bad');
          else {
            ui.closeSheet(true);
            world.setSelected({ type: 'node', id });
          }
          ui.refresh?.(sim?.state, save, true);
        },
        onRepair(id) {
          const result = sim?.repairNode(id);
          if (!result?.ok) ui.flash(result?.why || 'Cannot repair that yet.', 'bad');
          ui.refresh?.(sim?.state, save, true);
        },
        onCure(id) {
          const result = sim?.startCure(id);
          if (!result?.ok) ui.flash(result?.why || 'Cannot cure that nest yet.', 'bad');
          ui.refresh?.(sim?.state, save, true);
        },
        onExchange(index) {
          const result = sim?.exchange(index);
          if (!result?.ok) ui.flash(result?.why || 'Not enough goods.', 'bad');
        },
        onCaravan() {
          const result = sim?.takeCaravan();
          if (!result?.ok) ui.flash(result?.why || 'Not enough goods.', 'bad');
          ui.refresh?.(sim?.state, save, true);
        },
        onRoute(id) {
          const result = sim?.buyRoute(id);
          if (!result?.ok) ui.flash(result?.why || 'Cannot open that route.', 'bad');
          ui.refresh?.(sim?.state, save, true);
        },
        onGear(id) {
          const result = sim?.buyGear(id);
          if (!result?.ok) ui.flash(result?.why || 'Cannot craft that yet.', 'bad');
          ui.refresh?.(sim?.state, save, true);
        },
        onUpgrade(track) {
          const result = sim?.buyUpgrade(track);
          if (!result?.ok) ui.flash(result?.why || 'Cannot train that yet.', 'bad');
          ui.refresh?.(sim?.state, save, true);
        },
        onPreviewWave() {
          if (!sim) return;
          if (sim.state.phase !== 'prep') return;
          ui.showWavePreview(sim.previewWave(), sim.state);
        },
        onStartWave() {
          const result = sim?.startWave();
          if (!result?.ok) ui.flash(result?.why || 'Not now.', 'bad');
          ui.refresh?.(sim?.state, save, true);
        },
        onAbility(id) {
          const result = sim?.useAbility(id);
          if (!result?.ok) ui.flash(result?.why || 'Not ready.', 'bad');
          ui.refresh?.(sim?.state, save, true);
        },
        onNextLevel(order) {
          flush();
          enterLevel(order, { fromVictory: true });
        },
        onReplay() {
          flush();
          enterLevel(currentLevel?.order || save.last, { fromVictory: true });
        },
        onStay() {
          if (!sim) return;
          if (sim.state.phase === 'victory') sim.state.phase = 'prep';
          ui.danger(false);
          persist();
          ui.refresh?.(sim.state, save, true);
        },
        onRally() {
          const result = sim?.rallyCity();
          if (!result?.ok) return;
          ui.danger(false);
          world.burst(sim.state.core.x, sim.state.core.z, LIME, 22, 2.6, 1.4);
          ui.flash('The city rallies. Nothing was erased.', 'good');
          persist();
          ui.refresh?.(sim.state, save, true);
        },
        onRestart() {
          // Kept for compatibility: the city is never wiped.
          ui.flash('The city is permanent. Keep building.', 'good');
        },
      };
    }

    function targetById(type, id) {
      if (!sim) return null;
      if (type === 'nest') return sim.state.nests.find((nest) => nest.id === id) || null;
      return sim.state.nodes.find((node) => node.id === id) || null;
    }

    /* -------------------------------- lifecycle -------------------------------- */

    showStart();

    return {
      update(dt) {
        if (disposed) return;
        if (sim) {
          if (active) sim.tick(dt);
          world.sync(sim.state, dt);
          if (active) {
            ui.refresh(sim.state, save);
            autosave += dt;
            if (autosave >= AUTOSAVE) {
              autosave = 0;
              persist();
            }
          }
        } else {
          world.sync(null, dt);
        }
      },
      render() {
        world.render();
      },
      resize(width, height, dpr) {
        world.resize(width, height, dpr);
      },
      pause() {
        flush();
      },
      resume() {
        world.fit();
      },
      dispose() {
        disposed = true;
        flush();
        document.removeEventListener('visibilitychange', onHide);
        window.removeEventListener('pagehide', onPageHide);
        ui.dispose();
        world.dispose();
      },
    };
  },
};
