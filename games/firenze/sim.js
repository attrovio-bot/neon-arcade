/**
 * FIRENZE: LAST LIGHT — economy, construction, recruitment and siege combat.
 *
 * The city is one continuous save. A scenario only changes the besiegers. Field
 * units live in `state.militia`; reserves live in `state.army`; training is a
 * timed queue. Everything is headless, so `world.js` only has to draw it.
 */

import {
  BUILDINGS,
  CARAVANS,
  CITY_NODES,
  DEPLOY,
  EXCHANGE,
  GEAR,
  MAX_BUILDING_LEVEL,
  NEST_MAX,
  NEST_RESPAWN,
  PLOT_OPTIONS,
  ROUTES,
  START,
  START_CITIZENS,
  TOWER,
  TROOPS,
  UPGRADES,
  WAVES,
  ZONES,
} from './levels.js';

const CORE_CITIZENS = START_CITIZENS;

const ZOMBIES = {
  walker: { hp: 38, speed: 0.8, dmg: 6, every: 1.1, radius: 0.28, label: 'Shambler' },
  runner: { hp: 30, speed: 1.32, dmg: 5, every: 0.9, radius: 0.24, label: 'Runner' },
  brute: { hp: 165, speed: 0.54, dmg: 17, every: 1.4, radius: 0.46, label: 'Brute' },
};

const BUILD_PRIORITY = ['clinic', 'farm', 'quarry', 'furnace', 'market', 'workshop', 'armory', 'stable'];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n) => Math.round(n);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function sizeOf(type) {
  return TROOPS[type]?.space ?? 1;
}

function countSoldiers(units) {
  const out = { levy: 0, crossbow: 0, knight: 0 };
  for (const unit of units) {
    if (out[unit.type] !== undefined) out[unit.type] += 1;
  }
  return out;
}

export function createSim(level, meta, hooks = {}, saved = null) {
  const rng = mulberry32((level.seed || 1) * 7919 + 17);
  const state = {
    level,
    time: 0,
    phase: 'prep',
    wave: 0,
    waveTotal: 0,
    waveSpawned: 0,
    waveKilled: 0,
    queue: [],
    spawnClock: 0,
    bossAt: 0,
    bossPlanned: false,
    bossSpawned: false,
    boss: null,
    bossEnraged: false,
    resources: { ...START },
    citizens: START_CITIZENS,
    cap: START_CITIZENS,
    overcrowded: false,
    assigned: 0,
    idle: 0,
    starving: false,
    nodes: [],
    nests: [],
    zones: ZONES.map((zone) => ({ ...zone })),
    zombies: [],
    militia: [],
    army: { levy: 12, crossbow: 0, knight: 0 },
    training: [],
    armyCap: 0,
    deployCap: 0,
    cure: null,
    caravan: { index: 0, refresh: 48 },
    abilities: {
      volley: { cd: 0, max: 34, label: 'Volley', cost: { energy: 9 } },
      rally: { cd: 0, max: 40, label: 'Rally', cost: { energy: 7 } },
      repair: { cd: 0, max: 44, label: 'Repair', cost: { materials: 22 } },
    },
    rally: 0,
    stats: { kills: 0, cured: 0, built: 0, upgraded: 0, lost: 0, deployed: 0, trained: 0 },
    lastReward: null,
  };

  /* ------------------------------- city build ------------------------------- */

  const core = {
    id: 'core',
    kind: 'core',
    label: level.coreName,
    x: 0,
    z: 2.4,
    level: 1,
    restored: true,
    building: false,
    upgrading: false,
    progress: 1,
    buildTime: 0,
    hp: level.coreHp,
    maxHp: level.coreHp,
    radius: 2.05,
    staffNeed: 0,
    staffed: 0,
    destroyed: false,
    isCore: true,
  };
  state.core = core;
  state.nodes.push(core);

  for (const def of CITY_NODES) {
    const plot = def.kind === 'plot';
    const buildingDef = plot ? null : BUILDINGS[def.kind];
    const standing = Boolean(def.standing);
    const maxHp = buildingDef ? hpFor(def.kind, 1) : 0;
    state.nodes.push({
      id: def.id,
      kind: def.kind,
      plot,
      label: plot ? 'Empty lot' : buildingDef?.label || 'Ruin',
      x: def.x,
      z: def.z,
      level: 1,
      restored: standing,
      building: false,
      upgrading: false,
      progress: standing ? 1 : 0,
      buildTime: buildingDef?.time || 1,
      hp: standing ? maxHp : 0,
      maxHp,
      radius: 0.95,
      staffNeed: buildingDef?.staff || 0,
      staffed: 0,
      destroyed: false,
      isCore: false,
    });
  }

  for (const def of level.nests) {
    state.nests.push({
      id: def.id,
      x: def.x,
      z: def.z,
      count: NEST_MAX,
      max: NEST_MAX,
      recharge: NEST_RESPAWN,
    });
  }

  function nodeById(id) {
    return state.nodes.find((n) => n.id === id) || null;
  }
  function nestById(id) {
    return state.nests.find((n) => n.id === id) || null;
  }
  function zoneById(id) {
    return state.zones.find((z) => z.id === id) || null;
  }
  function nodeType(node) {
    return node.kind;
  }
  function nodeMeta(node) {
    return BUILDINGS[nodeType(node)] || null;
  }
  function nodeLevel(node) {
    return clamp(Math.round(Number(node.level) || 1), 1, MAX_BUILDING_LEVEL);
  }
  function levelScale(node) {
    return 1 + 0.4 * (nodeLevel(node) - 1);
  }
  function hpFor(kind, levelNum) {
    const def = BUILDINGS[kind];
    if (!def) return 0;
    return Math.round(def.hp * (1 + 0.45 * (clamp(levelNum, 1, MAX_BUILDING_LEVEL) - 1)));
  }
  const staffNeedOf = (kind) => BUILDINGS[kind]?.staff ?? 0;

  /* --------------------------------- helpers -------------------------------- */

  function has(cost) {
    return Object.entries(cost).every(([key, value]) => (state.resources[key] ?? 0) >= value);
  }

  function pay(cost) {
    if (!has(cost)) return false;
    for (const [key, value] of Object.entries(cost)) state.resources[key] -= value;
    return true;
  }

  function grant(resources) {
    for (const [key, value] of Object.entries(resources)) {
      state.resources[key] = Math.min(99999, (state.resources[key] ?? 0) + value);
    }
  }

  function scaleCost(cost, factor) {
    const out = {};
    for (const [key, value] of Object.entries(cost)) out[key] = Math.max(1, Math.round(value * factor));
    return out;
  }

  function costTimes(cost, count) {
    const out = {};
    for (const [key, value] of Object.entries(cost)) out[key] = value * count;
    return out;
  }

  function metaReady() {
    meta.routes ??= [];
    meta.gear ??= [];
    meta.upg ??= { weapon: 0, armor: 0 };
    meta.upg.weapon = clamp(Math.round(Number(meta.upg.weapon) || 0), 0, 3);
    meta.upg.armor = clamp(Math.round(Number(meta.upg.armor) || 0), 0, 3);
    if (!Array.isArray(meta.routes)) meta.routes = [];
    if (!Array.isArray(meta.gear)) meta.gear = [];
  }
  metaReady();

  const gearSet = () => new Set(meta.gear);
  const routeSet = () => new Set(meta.routes);

  function buildingLevel(kind) {
    let total = 0;
    for (const node of state.nodes) {
      if (!node.isCore && node.restored && node.kind === kind) total += nodeLevel(node);
    }
    return total;
  }

  function armorerLevel() {
    return buildingLevel('armory');
  }

  function recomputeCap() {
    let cap = CORE_CITIZENS;
    for (const node of state.nodes) {
      if (node.restored && node.kind === 'house') {
        cap += (BUILDINGS.house.cap || 5) + 3 * (nodeLevel(node) - 1);
      }
    }
    state.cap = cap;
    state.overcrowded = state.citizens > cap;
  }

  function recomputeStaff() {
    let idle = state.citizens;
    for (const node of state.nodes) node.staffed = 0;
    for (const kind of BUILD_PRIORITY) {
      for (const node of state.nodes) {
        if (!node.restored || node.staffNeed <= 0 || node.staffed > 0) continue;
        if (node.kind !== kind) continue;
        const take = Math.min(node.staffNeed, idle);
        node.staffed = take;
        idle -= take;
      }
    }
    state.idle = idle;
    state.assigned = state.citizens - idle;
  }

  function armySpace() {
    let used = 0;
    for (const [type, count] of Object.entries(state.army)) used += (count || 0) * sizeOf(type);
    for (const entry of state.training) used += (entry.count || 0) * sizeOf(entry.type);
    for (const unit of state.militia) used += sizeOf(unit.type);
    return used;
  }

  function deployCapForWave(waveNumber) {
    const w = clamp(Math.round(waveNumber) || 1, 1, 3);
    let cap = level.waveCap?.[w - 1] ?? [60, 90, 130][w - 1];
    cap += Math.min(DEPLOY.barracksBonusMax, buildingLevel('barracks') * DEPLOY.barracksBonus);
    return cap;
  }

  function recomputeArmy() {
    let cap = 0;
    for (const node of state.nodes) {
      if (!node.restored) continue;
      const def = BUILDINGS[node.kind];
      if (!def?.armyCap) continue;
      cap += def.armyCap + (node.kind === 'barracks' ? 50 : 20) * (nodeLevel(node) - 1);
    }
    state.armyCap = Math.max(cap, 20);
    state.deployCap = deployCapForWave(state.phase === 'wave' ? state.wave : state.wave + 1);
  }

  function troopStats(type) {
    const base = TROOPS[type];
    if (!base) return null;
    const gear = gearSet();
    let damageMult = 1 + 0.12 * meta.upg.weapon + 0.08 * armorerLevel();
    let healthMult = 1 + 0.12 * meta.upg.armor + 0.06 * armorerLevel();
    if (type === 'levy' || type === 'knight') {
      if (gear.has('sword')) damageMult += 0.25;
    }
    if (type === 'crossbow' && gear.has('crossbow')) damageMult += 0.3;
    if (gear.has('armor')) healthMult += 0.25;
    const range = base.range + (type === 'crossbow' && gear.has('crossbow') ? 1.2 : 0);
    return {
      type,
      label: base.label,
      en: base.en,
      blurb: base.blurb,
      cost: base.cost,
      time: base.time,
      space: base.space,
      speed: base.speed,
      every: base.every,
      range,
      damage: base.damage * damageMult,
      health: base.hp * healthMult,
      color: base.color,
      requires: base.requires || null,
    };
  }

  function troopUnlocked(type) {
    const def = TROOPS[type];
    if (!def) return false;
    if (!def.requires) return true;
    return state.nodes.some((node) => node.restored && node.kind === def.requires && node.hp > 0);
  }

  function lockedReason(type) {
    const def = TROOPS[type];
    if (!def?.requires) return '';
    const source = BUILDINGS[def.requires];
    return `Restore the ${source?.label || def.requires} first.`;
  }

  function applySoldierStats() {
    for (const unit of state.militia) {
      const stats = troopStats(unit.type);
      if (!stats) continue;
      const fraction = unit.hp / Math.max(1, unit.maxHp);
      unit.maxHp = stats.health;
      unit.hp = Math.max(1, fraction * stats.health);
      unit.damage = stats.damage;
      unit.range = stats.range;
    }
  }

  /* -------------------------------- persistence ------------------------------ */

  function applySnapshot(snap) {
    if (!snap || typeof snap !== 'object') return;
    if (snap.resources) {
      for (const key of Object.keys(state.resources)) {
        const value = Number(snap.resources[key]);
        if (Number.isFinite(value)) state.resources[key] = clamp(value, 0, 99999);
      }
    }
    if (Number.isFinite(snap.citizens)) state.citizens = Math.max(0, Math.round(snap.citizens));
    if (Number.isFinite(snap.coreHp)) core.hp = Math.max(0.01, Math.min(core.maxHp, snap.coreHp));

    for (const entry of snap.nodes ?? []) {
      const node = nodeById(entry.id);
      if (!node || node.isCore) continue;
      const kind = typeof entry.kind === 'string' ? entry.kind : node.kind;
      if (kind !== 'plot' && !BUILDINGS[kind]) continue;
      const plot = Boolean(entry.plot);
      const levelNum = clamp(Math.round(Number(entry.level) || 1), 1, MAX_BUILDING_LEVEL);
      node.kind = plot ? 'plot' : kind;
      node.plot = plot;
      node.level = levelNum;
      node.label = plot ? 'Empty lot' : BUILDINGS[kind]?.label || node.label;
      node.restored = Boolean(entry.restored);
      node.building = Boolean(entry.building) && !entry.upgrading;
      node.upgrading = Boolean(entry.upgrading);
      node.progress = clamp(Number(entry.progress) || 0, 0, 1);
      node.buildTime = Math.max(0.1, Number(entry.buildTime) || BUILDINGS[kind]?.time || 1);
      node.maxHp = plot ? 0 : hpFor(kind, levelNum);
      node.hp = plot
        ? 0
        : node.restored
          ? clamp(Number.isFinite(entry.hp) ? entry.hp : node.maxHp, 0, node.maxHp)
          : 0;
      node.staffNeed = plot ? 0 : staffNeedOf(kind);
      node.destroyed = Boolean(entry.destroyed);
    }

    for (const entry of snap.nests ?? []) {
      const nest = nestById(entry.id);
      if (!nest) continue;
      nest.count = clamp(Math.round(Number(entry.count) || 0), 0, nest.max);
      nest.recharge = Math.max(0, Number(entry.recharge) || NEST_RESPAWN);
    }

    if (Number.isFinite(snap.wave)) state.wave = clamp(Math.round(snap.wave), 0, 3);
    if (snap.cure && nestById(snap.cure.nestId)) {
      state.cure = {
        nestId: snap.cure.nestId,
        t: Math.max(0, Number(snap.cure.t) || 0),
        duration: Math.max(1, Number(snap.cure.duration) || 6),
      };
    }

    if (snap.army && typeof snap.army === 'object') {
      for (const type of Object.keys(state.army)) {
        state.army[type] = clamp(Math.round(Number(snap.army[type]) || 0), 0, 9999);
      }
    } else {
      state.army = { levy: 0, crossbow: 0, knight: 0 };
    }

    // A save written during a siege keeps the troops still standing on the
    // field. On reload they return to the reserve so the same horde can be met.
    for (const type of Object.keys(state.army)) {
      if (Number.isFinite(snap.field?.[type])) {
        state.army[type] += clamp(Math.round(snap.field[type]), 0, 9999);
      }
    }

    state.training = [];
    for (const entry of snap.training ?? []) {
      if (!TROOPS[entry.type]) continue;
      const count = clamp(Math.round(Number(entry.count) || 0), 0, 9999);
      if (!count) continue;
      state.training.push({
        type: entry.type,
        count,
        progress: Math.max(0, Number(entry.progress) || 0),
      });
    }
  }

  function snapshot() {
    const field = countSoldiers(state.militia);
    return {
      v: 2,
      at: Date.now(),
      scenario: level.id,
      wave: state.phase === 'prep' || state.phase === 'victory' ? state.wave : Math.max(0, state.wave - 1),
      resources: { ...state.resources },
      citizens: state.citizens,
      coreHp: core.hp,
      cure: state.cure ? { nestId: state.cure.nestId, t: state.cure.t, duration: state.cure.duration } : null,
      nodes: state.nodes
        .filter((node) => !node.isCore)
        .map((node) => ({
          id: node.id,
          kind: node.kind,
          plot: node.plot,
          level: node.level,
          label: node.label,
          restored: node.restored,
          building: node.building,
          upgrading: node.upgrading,
          progress: node.progress,
          buildTime: node.buildTime,
          hp: node.hp,
          maxHp: node.maxHp,
          staffNeed: node.staffNeed,
          destroyed: node.destroyed,
        })),
      nests: state.nests.map((nest) => ({ id: nest.id, count: nest.count, recharge: nest.recharge })),
      army: { ...state.army },
      training: state.training.map((entry) => ({
        type: entry.type,
        count: entry.count,
        progress: entry.progress,
      })),
      field,
    };
  }

  function returnField() {
    for (const unit of state.militia) {
      if (state.army[unit.type] !== undefined) state.army[unit.type] += 1;
    }
    state.militia.length = 0;
  }

  /**
   * A lost siege never erases Florence. The horde withdraws, the landmark is
   * patched up, every building and reserve survives, and the same horde returns.
   */
  function rallyCity() {
    if (state.phase !== 'defeat') return { ok: false };
    state.phase = 'prep';
    core.restored = true;
    core.destroyed = false;
    core.hp = Math.max(1, Math.round(core.maxHp * 0.35));
    state.zombies.length = 0;
    state.queue.length = 0;
    state.waveSpawned = 0;
    state.waveKilled = 0;
    state.boss = null;
    state.bossPlanned = false;
    state.bossSpawned = false;
    state.bossEnraged = false;
    state.wave = Math.max(0, state.wave - 1);
    state.cure = null;
    returnField();
    recomputeCap();
    recomputeStaff();
    recomputeArmy();
    return { ok: true };
  }

  function recallArmy() {
    if (state.phase !== 'prep') return { ok: false, why: 'Recall waits until the horde is gone.' };
    const count = state.militia.length;
    if (!count) return { ok: false, why: 'No troops are on the field.' };
    returnField();
    recomputeArmy();
    hooks.onRecall?.(count);
    return { ok: true, count };
  }

  /* --------------------------------- economy -------------------------------- */

  function produce(dt) {
    const mult = state.starving ? 0.55 : 1;
    const add = { food: 0, materials: 0, energy: 0, biomass: 0 };
    add.food += 0.06 * dt;
    add.materials += 0.07 * dt;
    add.energy += 0.025 * dt;

    for (const node of state.nodes) {
      if (!node.restored) continue;
      const def = BUILDINGS[node.kind];
      if (!def?.rate) continue;
      const fraction = node.staffNeed ? node.staffed / node.staffNeed : 1;
      if (fraction <= 0) continue;
      const scale = levelScale(node);
      for (const [key, rate] of Object.entries(def.rate)) {
        if (key === 'energy' && def.burn) {
          const want = def.burn * dt * fraction;
          const used = Math.min(want, state.resources.biomass);
          state.resources.biomass = Math.max(0, state.resources.biomass - used);
          if (want > 0) add.energy += (used / want) * rate * scale * dt * fraction * mult;
        } else {
          add[key] += rate * scale * dt * fraction * mult;
        }
      }
    }

    const routes = routeSet();
    if (routes.has('tornabuoni')) {
      add.materials += 0.2 * dt;
      add.food += 0.1 * dt;
    }
    if (routes.has('mercato')) add.energy += 0.25 * dt;
    if (routes.has('prato')) add.biomass += 0.08 * dt;

    for (const [key, value] of Object.entries(add)) {
      state.resources[key] = Math.min(99999, (state.resources[key] ?? 0) + value);
    }

    const upkeep = state.citizens * 0.014 + armySpace() * 0.007;
    state.resources.food = Math.max(0, state.resources.food - upkeep * dt);
    state.starving = state.resources.food <= 0.001 && add.food < upkeep;
  }

  /* -------------------------------- buildings ------------------------------- */

  function costFor(node) {
    if (node.isCore) return {};
    const def = nodeMeta(node);
    if (!def || node.restored) return {};
    return node.destroyed ? scaleCost(def.cost, 0.65) : { ...def.cost };
  }

  function buildCost(kind) {
    return BUILDINGS[kind] ? { ...BUILDINGS[kind].cost } : {};
  }

  function repairCost(node) {
    if (node.isCore) {
      const missing = 1 - node.hp / node.maxHp;
      return { materials: Math.max(12, Math.round(missing * 90)) };
    }
    const missing = 1 - node.hp / Math.max(1, node.maxHp);
    const base = nodeMeta(node)?.cost.materials ?? 40;
    return { materials: Math.max(8, Math.round(missing * base * 0.55)) };
  }

  function upgradeCost(node) {
    const def = nodeMeta(node);
    if (!def || !node.restored || node.isCore) return null;
    const levelNum = nodeLevel(node);
    if (levelNum >= MAX_BUILDING_LEVEL) return null;
    return def.upgradeCosts?.[levelNum - 1] || null;
  }

  function restoreNode(id, chosenKind) {
    if (state.phase !== 'prep') return { ok: false, why: 'You cannot build during a siege.' };
    const node = nodeById(id);
    if (!node || node.isCore) return { ok: false, why: 'That cannot be rebuilt.' };
    if (node.restored) return { ok: false, why: 'Already standing.' };
    if (node.building || node.upgrading) return { ok: false, why: 'Already under construction.' };
    let kind = nodeType(node);
    if (node.plot) {
      if (!chosenKind || !PLOT_OPTIONS.includes(chosenKind)) {
        return { ok: false, why: 'Choose what to raise on this lot.' };
      }
      kind = chosenKind;
    }
    const def = BUILDINGS[kind];
    if (!def) return { ok: false, why: 'Unknown building.' };
    const cost = node.plot || !node.destroyed ? { ...def.cost } : scaleCost(def.cost, 0.65);
    if (!has(cost)) return { ok: false, why: 'Not enough materials.' };
    pay(cost);
    node.plot = false;
    node.kind = kind;
    node.label = def.label;
    node.level = 1;
    node.maxHp = hpFor(kind, 1);
    node.hp = 1;
    node.staffNeed = staffNeedOf(kind);
    node.building = true;
    node.upgrading = false;
    node.progress = 0;
    node.buildTime = def.time;
    node.destroyed = false;
    hooks.onBuildStart?.(node);
    return { ok: true, node };
  }

  function startUpgrade(id) {
    if (state.phase !== 'prep') return { ok: false, why: 'Upgrades wait until the horde is gone.' };
    const node = nodeById(id);
    if (!node || node.isCore) return { ok: false, why: 'That cannot be upgraded.' };
    if (!node.restored) return { ok: false, why: 'Build it first.' };
    if (node.building || node.upgrading) return { ok: false, why: 'Already under construction.' };
    const def = nodeMeta(node);
    const cost = upgradeCost(node);
    if (!def || !cost) return { ok: false, why: 'Already at the highest level.' };
    if (!has(cost)) return { ok: false, why: 'Not enough materials.' };
    pay(cost);
    node.upgrading = true;
    node.progress = 0;
    node.buildTime = def.upgradeTime?.[nodeLevel(node) - 1] || 10;
    hooks.onUpgradeStart?.(node);
    return { ok: true, node };
  }

  function repairNode(id) {
    if (state.phase !== 'prep') return { ok: false, why: 'Repairs wait until the horde is gone.' };
    const node = nodeById(id);
    if (!node || !node.restored) return { ok: false, why: 'Nothing to repair.' };
    if (node.hp >= node.maxHp) return { ok: false, why: 'Already at full strength.' };
    const cost = repairCost(node);
    if (!has(cost)) return { ok: false, why: 'Not enough materials.' };
    pay(cost);
    node.hp = node.maxHp;
    hooks.onRepair?.(node);
    return { ok: true, node };
  }

  function finishConstruction(node) {
    node.building = false;
    node.progress = 1;
    node.restored = true;
    node.level = 1;
    node.maxHp = hpFor(node.kind, 1);
    node.hp = node.maxHp;
    state.stats.built += 1;
    recomputeCap();
    recomputeStaff();
    recomputeArmy();
    hooks.onBuilt?.(node);
  }

  function finishUpgrade(node) {
    node.upgrading = false;
    node.progress = 1;
    node.level = clamp(nodeLevel(node) + 1, 1, MAX_BUILDING_LEVEL);
    node.maxHp = hpFor(node.kind, node.level);
    node.hp = node.maxHp;
    state.stats.upgraded += 1;
    recomputeCap();
    recomputeStaff();
    recomputeArmy();
    applySoldierStats();
    hooks.onUpgraded?.(node);
  }

  /* ---------------------------------- cure ---------------------------------- */

  function cureCost() {
    return { energy: 14 };
  }

  function clinicLevel() {
    let best = 0;
    for (const node of state.nodes) {
      if (node.restored && node.kind === 'clinic' && node.hp > 0) best = Math.max(best, nodeLevel(node));
    }
    return best;
  }

  function clinicReady() {
    return state.nodes.some(
      (n) => n.restored && n.kind === 'clinic' && n.staffed >= n.staffNeed && n.hp > 0,
    );
  }

  function cureDuration() {
    const levelNum = clinicLevel();
    return Math.max(2.5, 6 - 1.1 * Math.max(0, levelNum - 1));
  }

  function startCure(nestId) {
    if (state.phase !== 'prep') return { ok: false, why: 'The siege has already begun.' };
    if (state.cure) return { ok: false, why: 'A cure is already in progress.' };
    if (!clinicReady()) return { ok: false, why: 'Restore and staff the Spezieria first.' };
    const nest = nestById(nestId);
    if (!nest || nest.count < 3) return { ok: false, why: 'Too few infected to cure.' };
    const cost = cureCost();
    if (!has(cost)) return { ok: false, why: 'The cure needs 14 energy.' };
    pay(cost);
    state.cure = { nestId, t: 0, duration: cureDuration() };
    hooks.onCureStart?.(nest, state.cure);
    return { ok: true };
  }

  function finishCure() {
    const nest = nestById(state.cure.nestId);
    state.cure = null;
    if (!nest) return;
    nest.count = Math.max(0, nest.count - 3);
    const gained = Math.min(3, Math.max(0, state.cap - state.citizens));
    state.citizens += gained;
    const overflow = 3 - gained;
    if (overflow > 0) state.resources.food = Math.min(99999, state.resources.food + overflow * 10);
    state.resources.biomass = Math.min(99999, state.resources.biomass + 22);
    state.stats.cured += 3;
    recomputeCap();
    recomputeStaff();
    hooks.onCureDone?.(nest, { gained, overflow, biomass: 22 });
  }

  /* ---------------------------------- army ---------------------------------- */

  function trainCost(type, count) {
    const def = TROOPS[type];
    if (!def) return {};
    return costTimes(def.cost, Math.max(1, Math.round(count)));
  }

  function train(type, count = 1) {
    if (state.phase !== 'prep') return { ok: false, why: 'Drill waits until the siege is over.' };
    const def = TROOPS[type];
    if (!def) return { ok: false, why: 'Unknown troop type.' };
    if (!troopUnlocked(type)) return { ok: false, why: lockedReason(type) };
    let n = clamp(Math.round(Number(count) || 0), 1, 999);
    const room = state.armyCap - armySpace();
    if (room < sizeOf(type)) return { ok: false, why: 'The barracks are full.' };
    n = Math.min(n, Math.floor(room / sizeOf(type)));
    if (n < 1) return { ok: false, why: 'Not enough army space.' };
    const cost = costTimes(def.cost, n);
    if (!has(cost)) return { ok: false, why: 'Not enough supplies to drill them.' };
    pay(cost);
    let entry = state.training.find((item) => item.type === type);
    if (!entry) {
      entry = { type, count: 0, progress: 0 };
      state.training.push(entry);
    }
    entry.count += n;
    entry.progress ??= 0;
    recomputeArmy();
    hooks.onTrain?.(type, n);
    return { ok: true, type, count: n, cost };
  }

  function cancelTraining(index) {
    const entry = state.training[index];
    if (!entry) return { ok: false };
    const def = TROOPS[entry.type];
    if (def) {
      for (const [key, value] of Object.entries(def.cost)) {
        state.resources[key] = Math.min(99999, (state.resources[key] ?? 0) + value * entry.count * 0.5);
      }
    }
    state.training.splice(index, 1);
    return { ok: true };
  }

  function trainingTick(dt) {
    if (!state.training.length) return;
    const speed = 1 + 0.28 * Math.max(0, buildingLevel('barracks') - 1);
    for (const entry of state.training) {
      const def = TROOPS[entry.type];
      if (!def) continue;
      entry.progress += dt * speed;
      while (entry.count > 0 && entry.progress >= def.time) {
        entry.progress -= def.time;
        state.army[entry.type] += 1;
        entry.count -= 1;
        state.stats.trained += 1;
        hooks.onTrained?.(entry.type, state.army[entry.type]);
      }
    }
    state.training = state.training.filter((entry) => entry.count > 0);
    recomputeArmy();
  }

  function deployedSpace() {
    let used = 0;
    for (const unit of state.militia) used += sizeOf(unit.type);
    return used;
  }

  function zoneUsed(zoneId) {
    let used = 0;
    for (const unit of state.militia) {
      if (unit.zoneId === zoneId) used += sizeOf(unit.type);
    }
    return used;
  }

  function deploy(zoneId, type, count = 1) {
    if (state.phase !== 'prep' && state.phase !== 'wave') {
      return { ok: false, why: 'The streets are closed.' };
    }
    const zone = zoneById(zoneId);
    if (!zone) return { ok: false, why: 'Choose a rally point.' };
    if (!TROOPS[type]) return { ok: false, why: 'Unknown troop type.' };
    if (!troopUnlocked(type)) return { ok: false, why: lockedReason(type) };
    const available = state.army[type] || 0;
    if (available <= 0) return { ok: false, why: `No ${TROOPS[type].label} in reserve.` };
    const cap = deployCapForWave(state.phase === 'wave' ? state.wave : state.wave + 1);
    state.deployCap = cap;
    const used = deployedSpace();
    const space = sizeOf(type);
    const room = cap - used;
    if (room < space) return { ok: false, why: `The wave limit is ${cap} army space.` };
    const zoneRoom = Math.ceil(cap * DEPLOY.zoneShare) - zoneUsed(zoneId);
    if (zoneRoom < space) return { ok: false, why: `${zone.name} is already packed. Use another rally point.` };
    const n = Math.min(
      Math.max(1, Math.round(Number(count) || 1)),
      available,
      Math.floor(room / space),
      Math.floor(zoneRoom / space),
    );
    if (n < 1) return { ok: false, why: 'No room at that rally point.' };

    state.army[type] -= n;
    const stats = troopStats(type);
    for (let i = 0; i < n; i++) {
      const spread = 0.9 + Math.sqrt(i) * 0.13;
      const angle = (i / Math.max(1, n)) * Math.PI * 2 + rng() * 0.5;
      state.militia.push({
        type,
        x: zone.x + Math.cos(angle) * spread + (rng() - 0.5) * 0.25,
        z: zone.z + Math.sin(angle) * spread + (rng() - 0.5) * 0.25,
        hp: stats.health,
        maxHp: stats.health,
        damage: stats.damage,
        range: stats.range,
        speed: stats.speed,
        every: stats.every,
        attack: rng() * 0.4,
        home: { x: zone.x, z: zone.z },
        zoneId: zone.id,
        flash: 0,
        wobble: rng() * Math.PI * 2,
        target: null,
      });
    }
    state.stats.deployed += n;
    recomputeArmy();
    hooks.onDeploy?.(zone, type, n);
    return { ok: true, count: n, zone, type };
  }

  /* --------------------------------- trade ---------------------------------- */

  function exchange(index) {
    const offer = EXCHANGE[index];
    if (!offer) return { ok: false };
    if (!has(offer.give)) return { ok: false, why: 'Not enough goods for that exchange.' };
    pay(offer.give);
    grant(offer.get);
    hooks.onTrade?.();
    return { ok: true };
  }

  function rollCaravan() {
    state.caravan.index = Math.floor(rng() * CARAVANS.length);
    state.caravan.refresh = 52;
  }

  function takeCaravan() {
    const offer = CARAVANS[state.caravan.index];
    if (!offer) return { ok: false };
    if (!has(offer.give)) return { ok: false, why: 'Not enough goods for the caravan.' };
    pay(offer.give);
    grant(offer.get);
    rollCaravan();
    hooks.onTrade?.();
    return { ok: true };
  }

  function buyRoute(id) {
    const route = ROUTES[id];
    if (!route || routeSet().has(id)) return { ok: false };
    if (!has(route.cost)) return { ok: false, why: 'Not enough resources for that route.' };
    pay(route.cost);
    meta.routes.push(id);
    hooks.onMeta?.();
    hooks.onTrade?.();
    return { ok: true };
  }

  function buyGear(id) {
    const item = GEAR[id];
    if (!item || gearSet().has(id)) return { ok: false };
    if (!has(item.cost)) return { ok: false, why: 'Not enough materials.' };
    pay(item.cost);
    meta.gear.push(id);
    applySoldierStats();
    hooks.onMeta?.();
    return { ok: true };
  }

  function buyUpgrade(track) {
    const up = UPGRADES[track];
    if (!up) return { ok: false };
    const rank = meta.upg[track] || 0;
    if (rank >= up.costs.length) return { ok: false };
    const cost = up.costs[rank];
    if (!has(cost)) return { ok: false, why: 'Not enough resources.' };
    pay(cost);
    meta.upg[track] = rank + 1;
    applySoldierStats();
    hooks.onMeta?.();
    return { ok: true };
  }

  /* --------------------------------- combat --------------------------------- */

  function addZombie(type, x, z, wave) {
    const def = ZOMBIES[type];
    const waveScale = 1 + 0.12 * Math.max(0, (wave ?? state.wave) - 1);
    const hp = round(def.hp * level.scale * waveScale);
    const unit = {
      type,
      x,
      z,
      hp,
      maxHp: hp,
      speed: def.speed * (0.94 + rng() * 0.12),
      damage: round(def.dmg * level.scale * (1 + 0.05 * Math.max(0, (wave ?? state.wave) - 1))),
      every: def.every,
      radius: def.radius,
      attack: 0,
      wobble: rng() * Math.PI * 2,
      flash: 0,
      target: null,
    };
    state.zombies.push(unit);
    return unit;
  }

  function bossHp() {
    return [6200, 11500, 19000][level.order - 1] ?? 19000;
  }

  function addBoss() {
    const unit = {
      type: 'boss',
      boss: true,
      name: level.boss,
      x: 0.2,
      z: state.core.z - 10,
      hp: bossHp(),
      maxHp: bossHp(),
      speed: 0.88,
      damage: round(30 * level.scale),
      every: 1.2,
      radius: 0.95,
      attack: 0,
      slam: 6.5,
      wobble: 0,
      flash: 0,
      target: null,
    };
    state.zombies.push(unit);
    state.boss = unit;
    state.bossSpawned = true;
    hooks.onBossSpawn?.(unit);
    return unit;
  }

  function damageBuilding(node, amount) {
    if (!node.restored) return;
    node.hp = Math.max(0, node.hp - amount);
    if (node.hp <= 0) {
      node.restored = false;
      node.hp = 0;
      node.destroyed = true;
      node.staffed = 0;
      state.stats.lost += 1;
      recomputeCap();
      recomputeStaff();
      recomputeArmy();
      hooks.onDestroyed?.(node);
      if (node.isCore) {
        state.phase = 'defeat';
        hooks.onDefeat?.({ level, wave: state.wave, stats: state.stats });
      }
    }
  }

  function hurtZombie(unit, amount, source) {
    unit.hp -= amount;
    unit.flash = 0.16;
    if (unit.hp <= 0) {
      const index = state.zombies.indexOf(unit);
      if (index >= 0) state.zombies.splice(index, 1);
      state.stats.kills += 1;
      state.waveKilled += 1;
      hooks.onKill?.(unit);
      if (unit.boss) {
        state.boss = null;
        hooks.onBossDown?.(unit);
      }
    } else {
      hooks.onHit?.(unit, source);
    }
  }

  function hurtSoldier(unit, amount) {
    unit.hp -= amount;
    unit.flash = 0.2;
    if (unit.hp <= 0) {
      const index = state.militia.indexOf(unit);
      if (index >= 0) state.militia.splice(index, 1);
      hooks.onMilitiaDown?.(unit);
    }
  }

  function targetFor(zombie) {
    let soldier = null;
    let best = zombie.boss ? 5 : 2.8;
    for (const unit of state.militia) {
      const d = Math.hypot(unit.x - zombie.x, unit.z - zombie.z);
      if (d < best) {
        best = d;
        soldier = unit;
      }
    }
    if (soldier) return { kind: 'militia', unit: soldier };

    const reach = zombie.radius + (zombie.boss ? 1.5 : 0.7);
    for (const node of state.nodes) {
      if (!node.restored) continue;
      const d = Math.hypot(node.x - zombie.x, node.z - zombie.z);
      if (d < node.radius + reach) return { kind: 'building', node, distance: d };
    }
    return {
      kind: 'core',
      node: state.core,
      distance: Math.hypot(state.core.x - zombie.x, state.core.z - zombie.z),
    };
  }

  function updateZombies(dt) {
    for (const zombie of state.zombies) {
      zombie.attack = Math.max(0, zombie.attack - dt);
      zombie.flash = Math.max(0, zombie.flash - dt);
      if (zombie.boss) {
        zombie.slam -= dt;
        if (zombie.slam <= 0) {
          zombie.slam = 6.5;
          for (const node of state.nodes) {
            if (!node.restored) continue;
            if (Math.hypot(node.x - zombie.x, node.z - zombie.z) < 3.4) {
              damageBuilding(node, node.isCore ? 55 : 50);
            }
          }
          for (const unit of [...state.militia]) {
            if (Math.hypot(unit.x - zombie.x, unit.z - zombie.z) < 3.4) hurtSoldier(unit, 34);
          }
          hooks.onSlam?.(zombie);
        }
        if (!state.bossEnraged && zombie.hp < zombie.maxHp * 0.5) {
          state.bossEnraged = true;
          zombie.speed *= 1.3;
          hooks.onEnrage?.(zombie);
        }
      }

      const target = targetFor(zombie);
      zombie.target = target;
      let tx;
      let tz;
      let reach;
      if (target.kind === 'militia') {
        tx = target.unit.x;
        tz = target.unit.z;
        reach = zombie.radius + 0.4;
      } else {
        tx = target.node.x;
        tz = target.node.z;
        reach = zombie.radius + target.node.radius + 0.1;
      }

      const dx = tx - zombie.x;
      const dz = tz - zombie.z;
      const distance = Math.hypot(dx, dz) || 0.001;
      if (distance <= reach) {
        if (zombie.attack <= 0) {
          zombie.attack = zombie.every;
          if (target.kind === 'militia') {
            hurtSoldier(target.unit, zombie.damage);
          } else {
            damageBuilding(target.node, zombie.damage);
            hooks.onBuildingHit?.(target.node, zombie.damage);
          }
        }
        continue;
      }

      let mx = dx / distance;
      let mz = dz / distance;
      for (const other of state.zombies) {
        if (other === zombie) continue;
        const ox = zombie.x - other.x;
        const oz = zombie.z - other.z;
        const d2 = ox * ox + oz * oz;
        if (d2 > 0.0001 && d2 < 0.55 * 0.55) {
          const d = Math.sqrt(d2);
          mx += (ox / d) * 0.55;
          mz += (oz / d) * 0.55;
        }
      }
      const length = Math.hypot(mx, mz) || 1;
      const speed = zombie.speed * (state.bossEnraged && zombie.boss ? 1.15 : 1);
      zombie.x += (mx / length) * speed * dt;
      zombie.z += (mz / length) * speed * dt;
    }
  }

  function updateMilitia(dt) {
    const rally = state.rally > 0;
    for (const unit of state.militia) {
      unit.flash = Math.max(0, unit.flash - dt);
      unit.attack = Math.max(0, unit.attack - dt);
      if (state.phase === 'prep' && unit.hp < unit.maxHp) {
        unit.hp = Math.min(unit.maxHp, unit.hp + unit.maxHp * 0.05 * dt);
      }
      let target = null;
      let best = state.phase === 'wave' ? 22 : unit.range + 5.5;
      for (const zombie of state.zombies) {
        const d = Math.hypot(zombie.x - unit.x, zombie.z - unit.z);
        if (d < best) {
          best = d;
          target = zombie;
        }
      }
      unit.target = target;
      let tx;
      let tz;
      if (target) {
        tx = target.x;
        tz = target.z;
      } else if (state.phase === 'wave') {
        // Between spawns the line falls back toward the Palazzo instead of
        // idling at a far gate while the horde crosses the city.
        tx = state.core.x;
        tz = state.core.z + 1.2;
      } else {
        tx = unit.home.x;
        tz = unit.home.z;
      }
      const dx = tx - unit.x;
      const dz = tz - unit.z;
      const distance = Math.hypot(dx, dz) || 0.001;
      if (target && distance <= unit.range) {
        if (unit.attack <= 0) {
          unit.attack = unit.every / (rally ? 1.25 : 1);
          const damage = unit.damage * (rally ? 1.4 : 1);
          hooks.onMilitiaAttack?.(unit, target, unit.range > 1.2 ? 'bolt' : 'blade');
          hurtZombie(target, damage, 'militia');
        }
      } else if (distance > 0.4) {
        const speed = unit.speed * (rally ? 1.3 : 1);
        unit.x += (dx / distance) * speed * dt;
        unit.z += (dz / distance) * speed * dt;
      }
    }
  }

  function updateTowers(dt) {
    for (const node of state.nodes) {
      if (!node.restored || node.kind !== 'tower') continue;
      node.towerCd = Math.max(0, (node.towerCd ?? 0) - dt);
      if (node.towerCd > 0) continue;
      const range = TOWER.range + 1.8 * (nodeLevel(node) - 1);
      let best = null;
      let bestD = range;
      for (const zombie of state.zombies) {
        const d = Math.hypot(zombie.x - node.x, zombie.z - node.z);
        if (d < bestD) {
          bestD = d;
          best = zombie;
        }
      }
      if (best) {
        node.towerCd = Math.max(0.55, TOWER.every - 0.08 * (nodeLevel(node) - 1));
        const damage = TOWER.damage * (1 + 0.4 * (nodeLevel(node) - 1));
        hurtZombie(best, damage, 'tower');
        hooks.onShot?.(node, best, 'tower');
      }
    }
  }

  /* ---------------------------------- waves --------------------------------- */

  function previewWave() {
    const wave = Math.min(3, state.wave + 1);
    const nestTotal = state.nests.reduce((sum, n) => sum + n.count, 0);
    const factor = WAVES.nestFactor[wave - 1];
    const contribution = Math.round(nestTotal * factor);
    const count = (level.waveBase[wave - 1] ?? 0) + contribution;
    const runners = wave === 1 ? 0 : Math.round(count * (wave === 2 ? 0.3 : 0.34));
    const brutes = wave === 3 ? Math.max(2, Math.round(count * 0.18)) : 0;
    const walkers = Math.max(0, count - runners - brutes);
    return {
      wave,
      total: count + (wave === 3 ? 1 : 0),
      walkers,
      runners,
      brutes,
      boss: wave === 3 ? level.boss : null,
      bossHp: bossHp(),
      nests: nestTotal,
      contribution,
      deployCap: deployCapForWave(wave),
      armySpace: armySpace(),
    };
  }

  function startWave() {
    if (state.phase !== 'prep') return { ok: false, why: 'Not now.' };
    const plan = previewWave();
    state.wave = plan.wave;
    state.phase = 'wave';
    state.deployCap = deployCapForWave(plan.wave);
    state.queue = [];
    state.waveSpawned = 0;
    state.waveKilled = 0;
    state.bossPlanned = plan.wave === 3;
    state.bossSpawned = false;
    state.boss = null;
    state.bossEnraged = false;
    state.spawnClock = 0;

    const types = [];
    for (let i = 0; i < plan.walkers; i++) types.push('walker');
    for (let i = 0; i < plan.runners; i++) types.push('runner');
    for (let i = 0; i < plan.brutes; i++) types.push('brute');
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    let at = 0.6;
    const interval = Math.max(0.28, 0.95 - 0.14 * (plan.wave - 1));
    for (const type of types) {
      const alive = state.nests.filter((n) => n.count > 0);
      const pool = alive.length ? alive : state.nests;
      const nest = pool[Math.floor(rng() * pool.length)];
      state.queue.push({ type, at, nest });
      at += interval * (0.62 + rng() * 0.55);
    }
    state.bossAt = Math.max(7, at * 0.44);
    state.waveTotal = types.length + (plan.boss ? 1 : 0);
    recomputeStaff();
    recomputeArmy();
    hooks.onWaveStart?.(plan);
    return { ok: true, plan };
  }

  function spawnFromQueue(type, nest) {
    const x = nest.x + (rng() - 0.5) * 1.6;
    const z = nest.z + (rng() - 0.5) * 1.6;
    addZombie(type, x, z, state.wave);
    state.waveSpawned += 1;
  }

  function clearWave() {
    state.phase = 'prep';
    returnField();
    state.deployCap = deployCapForWave(state.wave + 1);
    for (const nest of state.nests) nest.count = Math.min(NEST_MAX, nest.count + 2);
    recomputeArmy();
    if (state.wave >= 3) {
      state.phase = 'victory';
      hooks.onVictory?.({ level, wave: 3, stats: state.stats });
      return;
    }
    const reward = { ...WAVES.reward };
    for (const key of Object.keys(reward)) reward[key] += (level.order - 1) * 12;
    grant(reward);
    state.lastReward = reward;
    hooks.onWaveClear?.({ level, wave: state.wave, reward, stats: state.stats });
  }

  /* --------------------------------- abilities ------------------------------- */

  function useAbility(id) {
    const ability = state.abilities[id];
    if (!ability) return { ok: false };
    if (state.phase !== 'wave') return { ok: false, why: 'Abilities only work during a siege.' };
    if (ability.cd > 0) return { ok: false, why: 'Still recharging.' };
    if (!has(ability.cost)) return { ok: false, why: 'Not enough resources.' };
    pay(ability.cost);
    ability.cd = ability.max;
    if (id === 'volley') {
      for (const zombie of [...state.zombies]) hurtZombie(zombie, zombie.boss ? 220 : 70, 'volley');
      hooks.onAbility?.('volley', state.core.x, state.core.z);
    } else if (id === 'rally') {
      state.rally = 8;
      hooks.onAbility?.('rally', state.core.x, state.core.z);
    } else if (id === 'repair') {
      state.core.hp = Math.min(state.core.maxHp, state.core.hp + state.core.maxHp * 0.2);
      hooks.onAbility?.('repair', state.core.x, state.core.z);
      hooks.onRepair?.(state.core);
    }
    return { ok: true };
  }

  /* ----------------------------------- tick ---------------------------------- */

  function tick(dt) {
    state.time += dt;
    for (const ability of Object.values(state.abilities)) ability.cd = Math.max(0, ability.cd - dt);
    state.rally = Math.max(0, state.rally - dt);

    if (state.caravan.refresh > 0) {
      state.caravan.refresh -= dt;
      if (state.caravan.refresh <= 0) rollCaravan();
    }

    if (state.phase === 'prep') {
      for (const nest of state.nests) {
        nest.recharge -= dt;
        if (nest.recharge <= 0) {
          nest.recharge = NEST_RESPAWN;
          if (nest.count < nest.max) nest.count += 1;
        }
      }
      if (state.cure) {
        state.cure.t += dt;
        if (state.cure.t >= state.cure.duration) finishCure();
      }
    }

    if (state.phase === 'prep' || state.phase === 'wave') {
      for (const node of state.nodes) {
        if (!node.building && !node.upgrading) continue;
        node.progress = Math.min(1, node.progress + dt / Math.max(0.1, node.buildTime));
        if (node.progress >= 1) {
          if (node.upgrading) finishUpgrade(node);
          else finishConstruction(node);
        }
      }
      recomputeStaff();
      produce(dt);
      trainingTick(dt);
      recomputeArmy();
    }

    if (state.phase === 'wave') {
      state.spawnClock += dt;
      while (state.queue.length && state.queue[0].at <= state.spawnClock) {
        const item = state.queue.shift();
        spawnFromQueue(item.type, item.nest);
      }
      if (state.bossPlanned && !state.bossSpawned && state.spawnClock >= state.bossAt) addBoss();
      updateTowers(dt);
      updateMilitia(dt);
      updateZombies(dt);
      if (
        state.queue.length === 0 &&
        (!state.bossPlanned || state.bossSpawned) &&
        state.zombies.length === 0 &&
        state.phase === 'wave'
      ) {
        clearWave();
      }
    }

    if (state.phase === 'victory' || state.phase === 'defeat') {
      recomputeStaff();
      recomputeArmy();
    }
  }

  applySnapshot(saved);
  recomputeCap();
  recomputeStaff();
  recomputeArmy();

  return {
    state,
    tick,
    snapshot,
    rallyCity,
    recallArmy,
    restoreNode,
    repairNode,
    startUpgrade,
    startCure,
    exchange,
    takeCaravan,
    buyRoute,
    buyGear,
    buyUpgrade,
    train,
    cancelTraining,
    deploy,
    previewWave,
    startWave,
    useAbility,
    troopStats,
    troopUnlocked,
    lockedReason,
    trainCost,
    costFor,
    buildCost,
    repairCost,
    upgradeCost,
    canPay: has,
    cureCost,
    cureDuration,
    clinicReady,
    nodeType,
    nodeLevel,
    nodeById,
    nestById,
    zoneById,
    zoneUsed,
    deployedSpace,
    armySpace,
    trainingHousing: () =>
      state.training.reduce((sum, entry) => sum + entry.count * sizeOf(entry.type), 0),
    deployCapForWave,
    militiaStats: () => troopStats('levy'),
    clinicStaffed: () => clinicReady(),
    BUILD_PRIORITY,
    NEST_MAX,
  };
}
