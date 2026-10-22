/**
 * FIRENZE: LAST LIGHT — pack entry.
 *
 * One city, saved whole. Every wall, worker, store and soldier belongs to
 * Florence itself; the three sieges only change who is at the gates. Losing a
 * siege never wipes or restarts the city.
 */

import { BUILDINGS, LEVELS } from './levels.js';
import { createSim } from './sim.js';
import { createWorld } from './world.js';
import { createUI } from './ui.js';

const SAVE_KEY = 'neon-arcade:firenze:city:v1';
const AUTOSAVE = 4;
const GOLD = 0xd8b36a;
const TERRACOTTA = 0xb05a3c;
const OLIVE = 0x8d9a5d;
const AMBER = 0xe0b25f;
const IRON = 0xaab3b5;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const sumWaves = (cleared) =>
  Object.values(cleared || {}).reduce((total, value) => total + clamp(Number(value) || 0, 0, 3), 0);

function snapshotScore(city) {
  if (!city || typeof city !== 'object') return -1;
  const restored = (city.nodes || []).filter((node) => node.restored).length;
  const levels = (city.nodes || []).reduce((sum, node) => sum + (Number(node.level) || 1), 0);
  const army = Object.values(city.army || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
  return restored * 40 + levels * 8 + army + (Number(city.citizens) || 0);
}

function migrateCity(raw) {
  if (raw?.city && typeof raw.city === 'object' && Array.isArray(raw.city.nodes)) return raw.city;
  if (!raw?.cities || typeof raw.cities !== 'object') return null;
  let best = null;
  let bestScore = -1;
  for (const city of Object.values(raw.cities)) {
    const score = snapshotScore(city);
    if (score > bestScore) {
      best = city;
      bestScore = score;
    }
  }
  return best;
}

function readSave(ctx) {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  } catch (error) {
    console.warn('firenze save unreadable', error);
  }

  const save = {
    v: 2,
    unlocked: 1,
    cleared: { 1: 0, 2: 0, 3: 0 },
    last: 1,
    meta: { routes: [], gear: [], upg: { weapon: 0, armor: 0 } },
    city: null,
    totalWaves: 0,
    stats: { kills: 0, cured: 0, built: 0, lost: 0, upgraded: 0, deployed: 0, trained: 0 },
  };

  if (raw && typeof raw === 'object') {
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
    for (const key of Object.keys(save.stats)) {
      const value = Number(raw.stats?.[key]);
      if (Number.isFinite(value)) save.stats[key] = Math.max(0, Math.round(value));
    }
    save.city = migrateCity(raw);
  }

  // A previous arcade best (waves held) can bootstrap progress after browser
  // storage pressure wiped localStorage, but it never lowers real progress.
  const best = Math.max(0, Math.round(Number(ctx.best) || 0));
  const fromCleared = sumWaves(save.cleared);
  save.totalWaves = Math.max(fromCleared, best, Math.round(Number(raw?.totalWaves) || 0));
  if (!raw && best > 0) save.unlocked = best >= 6 ? 3 : best >= 3 ? 2 : 1;
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
    let reportedKills = 0;
    let reportedCured = 0;

    ui.setCatalog(BUILDINGS);
    ui.setLevels(LEVELS);
    world.resize(ctx.width, ctx.height, ctx.dpr);
    ctx.setLabel?.(ctx.meta?.scoreLabel || 'HORDES');
    ctx.setScore?.(save.totalWaves);

    /* -------------------------------- persistence ------------------------------ */

    function captureCity() {
      if (!sim || !active) return;
      save.city = sim.snapshot();
    }

    function reportStats() {
      if (!sim) return;
      const kills = Math.max(0, sim.state.stats.kills - reportedKills);
      const cured = Math.max(0, sim.state.stats.cured - reportedCured);
      reportedKills += kills;
      reportedCured += cured;
      save.stats.kills += kills;
      save.stats.cured += cured;
      save.stats.built += sim.state.stats.built;
      save.stats.upgraded += sim.state.stats.upgraded;
      save.stats.lost += sim.state.stats.lost;
      save.stats.deployed += sim.state.stats.deployed;
      save.stats.trained += sim.state.stats.trained;
      sim.state.stats.built = 0;
      sim.state.stats.upgraded = 0;
      sim.state.stats.lost = 0;
      sim.state.stats.deployed = 0;
      sim.state.stats.trained = 0;
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
      reportStats();
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

    function cityForLevel(level, { freshSiege = false } = {}) {
      const source = save.city;
      if (!source) return null;
      if (freshSiege) return { ...source, wave: 0, scenario: level.id };
      const savedScenario = source.scenario || null;
      if (savedScenario === level.id && (Number(source.wave) || 0) < 3) return source;
      if (!savedScenario && save.last === level.order && (Number(source.wave) || 0) < 3) return source;
      return { ...source, wave: 0, scenario: level.id };
    }

    function previewLevel(order) {
      const level = LEVELS.find((lv) => lv.order === order) || LEVELS[0];
      currentLevel = level;
      active = false;
      reportedKills = 0;
      reportedCured = 0;
      sim = createSim(level, save.meta, {}, cityForLevel(level));
      world.loadLevel(level);
      world.sync(sim.state, 0);
    }

    function showStart() {
      previewLevel(save.last);
      if (!save.city) save.city = sim.snapshot();
      ui.showStart(LEVELS, save, save.last);
      world.render();
    }

    function enterLevel(order, { freshSiege = false } = {}) {
      const level = LEVELS.find((lv) => lv.order === order);
      if (!level) return;
      if (order > save.unlocked) {
        ui.flash('That siege is still cut off.', 'bad');
        return;
      }
      currentLevel = level;
      save.last = level.order;
      reportedKills = 0;
      reportedCured = 0;
      sim = createSim(level, save.meta, hooks(), cityForLevel(level, { freshSiege }));
      active = true;
      autosave = 0;

      world.loadLevel(level);
      ui.bind(sim, save, level);
      ui.hideStart();
      ui.hideVictory();
      ui.hideModal();
      ui.danger(false);
      world.sync(sim.state, 0);
      persist();
      world.fit();
      ctx.haptic?.(10);
      ui.flash(
        save.city
          ? `Welcome back to Florence. The city is as you left it.`
          : 'Florence is yours. Start rebuilding the city.',
        'good',
      );
    }

    /* ---------------------------------- hooks ---------------------------------- */

    function hooks() {
      return {
        onBuildStart(node) {
          ui.flash(`Builders begin work on the ${node.label}.`, '');
          persist();
        },
        onBuilt(node) {
          world.burst(node.x, node.z, OLIVE, 16, 2.6, 1.1);
          world.ringEffect(node.x, node.z, GOLD, 2.8, 0.7);
          ui.flash(`${node.label} is restored.`, 'good');
          ctx.haptic?.(10);
          persist();
        },
        onUpgradeStart(node) {
          ui.flash(`Masons begin raising the ${node.label}.`, '');
          persist();
        },
        onUpgraded(node) {
          world.burst(node.x, node.z, GOLD, 18, 2.7, 1.1);
          world.ringEffect(node.x, node.z, AMBER, 3.2, 0.8);
          ui.flash(`${node.label} is now level ${node.level}.`, 'good');
          ctx.haptic?.(12);
          persist();
        },
        onRepair(node) {
          world.burst(node.x, node.z, IRON, 8, 1.7, 1);
          ui.flash(`${node.label || 'The Palazzo'} repaired.`, 'good');
          persist();
        },
        onDestroyed(node) {
          world.burst(node.x, node.z, TERRACOTTA, 22, 3.2, 1.2);
          world.shake(ctx.reducedMotion ? 0.1 : 0.55);
          ui.flash(`${node.label} has fallen.`, 'bad');
          persist();
        },
        onBuildingHit(node) {
          if (Math.random() < 0.35) world.burst(node.x, node.z, AMBER, 3, 1.3, 1.1);
        },
        onCureStart(nest) {
          world.ringEffect(nest.x, nest.z, OLIVE, 3.4, 0.9);
          ui.flash('The Spezieria is curing three infected…', '');
        },
        onCureDone(nest, result) {
          world.burst(nest.x, nest.z, OLIVE, 26, 2.8, 1);
          world.ringEffect(nest.x, nest.z, GOLD, 5, 1.1);
          ui.flash(
            result.gained
              ? `+${result.gained} citizens · +${result.biomass} biomass`
              : `No room for citizens · +${result.biomass} biomass`,
            'good',
          );
          ctx.haptic?.(14);
          persist();
        },
        onTrade() {
          ui.flash('The bargain is struck.', 'good');
          persist();
        },
        onMeta() {
          ui.flash('Permanent improvement secured.', 'good');
          persist();
        },
        onTrain(type, count) {
          ui.flash(`${count} ${type === 'levy' ? 'Lancieri' : type === 'crossbow' ? 'Balestrieri' : 'Cavalieri'} begin drilling.`, '');
          persist();
        },
        onTrained() {
          /* The army panel updates live; saving every finished soldier is wasteful. */
        },
        onDeploy(zone, type, count) {
          const name = type === 'levy' ? 'Lancieri' : type === 'crossbow' ? 'Balestrieri' : 'Cavalieri';
          world.ringEffect(zone.x, zone.z, GOLD, 2.2, 0.6);
          ui.flash(`${count} ${name} deploy at ${zone.name}.`, 'good');
          ctx.haptic?.(8);
          persist();
        },
        onRecall(count) {
          ui.flash(`${count} soldiers return to reserve.`, '');
          persist();
        },
        onMilitiaDown(unit) {
          world.burst(unit.x, unit.z, TERRACOTTA, 8, 1.8, 0.9);
        },
        onMilitiaAttack(unit, target, kind) {
          if (kind === 'bolt') world.shot({ x: unit.x, z: unit.z, kind: 'militia' }, target, GOLD);
        },
        onWaveStart(plan) {
          ui.danger(true);
          ui.hideModal();
          ui.flash(`Horde ${['I', 'II', 'III'][plan.wave - 1]} is coming.`, 'bad');
          world.ringEffect(sim.state.core.x, sim.state.core.z, TERRACOTTA, 7, 1.2);
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
          world.ringEffect(sim.state.core.x, sim.state.core.z, GOLD, 9, 1.4);
          ctx.haptic?.([16, 40, 16]);
        },
        onVictory({ level, stats }) {
          ui.danger(false);
          save.cleared[level.order] = 3;
          save.unlocked = clamp(Math.max(save.unlocked, level.order + 1), 1, 3);
          persist();
          const next = LEVELS.find((lv) => lv.order === level.order + 1) || null;
          ui.showVictory({
            level,
            stats,
            totalWaves: save.totalWaves,
            final: level.order === LEVELS.length,
            next,
          });
          world.ringEffect(sim.state.core.x, sim.state.core.z, GOLD, 14, 1.8);
          ctx.haptic?.([20, 60, 20, 60, 30]);
        },
        onDefeat({ level, wave, stats }) {
          ui.danger(true);
          persist();
          ui.showDefeat({ level, wave, stats });
          ctx.haptic?.([30, 60, 30]);
        },
        onBossSpawn(unit) {
          ui.showBoss();
          ui.flash(`${unit.name} has entered the city.`, 'bad');
          world.ringEffect(unit.x, unit.z, TERRACOTTA, 8, 1.3);
          world.shake(ctx.reducedMotion ? 0.1 : 0.6);
          ctx.haptic?.([20, 40, 20, 40, 40]);
        },
        onBossDown(unit) {
          ui.hideBoss();
          world.shake(ctx.reducedMotion ? 0.1 : 0.8);
          world.burst(unit.x, unit.z, TERRACOTTA, 46, 4.4, 1.4);
          world.ringEffect(unit.x, unit.z, AMBER, 12, 1.6);
          ui.flash(`${unit.name} is broken. Hold the line.`, 'good');
        },
        onEnrage() {
          ui.flash('The crowned thing is enraged.', 'bad');
        },
        onSlam(unit) {
          world.shake(ctx.reducedMotion ? 0.08 : 0.35);
          world.ringEffect(unit.x, unit.z, TERRACOTTA, 5, 0.6);
          world.burst(unit.x, unit.z, TERRACOTTA, 12, 2.4, 0.8);
        },
        onShot(node, target, kind) {
          world.shot(node, target, kind === 'tower' ? GOLD : AMBER);
        },
        onHit(unit, source) {
          world.burst(unit.x, unit.z, source === 'volley' ? AMBER : OLIVE, 3, 1.2, 0.7);
        },
        onKill(unit) {
          world.burst(
            unit.x,
            unit.z,
            unit.boss ? TERRACOTTA : OLIVE,
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
            world.ringEffect(x, z, OLIVE, 6, 1);
          } else {
            world.burst(x, z, GOLD, 14, 2, 1.6);
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
      if (target.type === 'zone') {
        ui.openZone(target.id);
        return;
      }
      ui.openNode(target.id);
    }

    function callbacks() {
      const refresh = (force = true) => ui.refresh(sim?.state, save, force);
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
          refresh();
        },
        onRepair(id) {
          const result = sim?.repairNode(id);
          if (!result?.ok) ui.flash(result?.why || 'Cannot repair that yet.', 'bad');
          refresh();
        },
        onUpgrade(id) {
          const result = sim?.startUpgrade(id);
          if (!result?.ok) ui.flash(result?.why || 'Cannot upgrade that yet.', 'bad');
          else {
            ui.closeSheet(true);
            world.setSelected({ type: 'node', id });
          }
          refresh();
        },
        onUpgradeTrack(track) {
          const result = sim?.buyUpgrade(track);
          if (!result?.ok) ui.flash(result?.why || 'Cannot drill that yet.', 'bad');
          refresh();
        },
        onCure(id) {
          const result = sim?.startCure(id);
          if (!result?.ok) ui.flash(result?.why || 'Cannot cure that nest yet.', 'bad');
          refresh();
        },
        onExchange(index) {
          const result = sim?.exchange(index);
          if (!result?.ok) ui.flash(result?.why || 'Not enough goods.', 'bad');
          refresh();
        },
        onCaravan() {
          const result = sim?.takeCaravan();
          if (!result?.ok) ui.flash(result?.why || 'Not enough goods.', 'bad');
          refresh();
        },
        onRoute(id) {
          const result = sim?.buyRoute(id);
          if (!result?.ok) ui.flash(result?.why || 'Cannot open that route.', 'bad');
          refresh();
        },
        onGear(id) {
          const result = sim?.buyGear(id);
          if (!result?.ok) ui.flash(result?.why || 'Cannot craft that yet.', 'bad');
          refresh();
        },
        onTrain(type, count) {
          const result = sim?.train(type, count);
          if (!result?.ok) ui.flash(result?.why || 'Cannot train them yet.', 'bad');
          refresh();
        },
        onCancelTraining(index) {
          sim?.cancelTraining(index);
          refresh();
        },
        onDeploy(zoneId, type, count) {
          const result = sim?.deploy(zoneId, type, count);
          if (!result?.ok) ui.flash(result?.why || 'Cannot deploy there.', 'bad');
          refresh();
        },
        onRecall() {
          const result = sim?.recallArmy();
          if (!result?.ok) ui.flash(result?.why || 'Cannot recall yet.', 'bad');
          refresh();
        },
        onPreviewWave() {
          if (!sim) return;
          if (sim.state.phase !== 'prep') return;
          ui.showWavePreview(sim.previewWave(), sim.state);
        },
        onStartWave() {
          const result = sim?.startWave();
          if (!result?.ok) ui.flash(result?.why || 'Not now.', 'bad');
          refresh();
        },
        onAbility(id) {
          const result = sim?.useAbility(id);
          if (!result?.ok) ui.flash(result?.why || 'Not ready.', 'bad');
          refresh();
        },
        onNextLevel(order) {
          flush();
          enterLevel(order, { freshSiege: true });
        },
        onReplay() {
          flush();
          enterLevel(currentLevel?.order || save.last, { freshSiege: true });
        },
        onStay() {
          if (!sim) return;
          reportStats();
          if (sim.state.phase === 'victory') {
            sim.state.phase = 'prep';
            sim.state.wave = 0;
          }
          ui.danger(false);
          persist();
          refresh();
        },
        onRally() {
          const result = sim?.rallyCity();
          if (!result?.ok) return;
          ui.danger(false);
          world.burst(sim.state.core.x, sim.state.core.z, GOLD, 22, 2.6, 1.4);
          ui.flash('Florence rallies. Nothing was erased.', 'good');
          persist();
          refresh();
        },
        onRestart() {
          ui.flash('The city is permanent. Keep building.', 'good');
        },
      };
    }

    function targetById(type, id) {
      if (!sim) return null;
      if (type === 'nest') return sim.state.nests.find((nest) => nest.id === id) || null;
      if (type === 'zone') return sim.state.zones.find((zone) => zone.id === id) || null;
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
