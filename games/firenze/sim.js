/**
 * FIRENZE: LAST LIGHT — economy, construction, curing, trade and horde combat.
 * Headless: units are {x, z} records; `world.js` draws whatever is here.
 */

import {
  BUILDINGS,
  CARAVANS,
  EXCHANGE,
  GEAR,
  LEVELS,
  NEST_MAX,
  NEST_RESPAWN,
  PLOT_OPTIONS,
  ROUTES,
  START,
  START_CITIZENS,
  TOWER,
  UPGRADES,
  WAVES,
} from './levels.js';

const CORE_CITIZENS = 6;

const ZOMBIES = {
  walker: { hp: 34, speed: 0.78, dmg: 5, every: 1.1, radius: 0.28, label: 'Shambler' },
  runner: { hp: 26, speed: 1.3, dmg: 4, every: 0.9, radius: 0.24, label: 'Runner' },
  brute: { hp: 130, speed: 0.52, dmg: 14, every: 1.4, radius: 0.46, label: 'Brute' },
};

const BUILD_PRIORITY = ['clinic', 'farm', 'quarry', 'furnace', 'market', 'workshop'];

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

export function createSim(level, meta, hooks = {}, saved = null) {
  const rng = mulberry32((level.seed || 1) * 7919 + Date.now() % 100000);
  const state = {
    level,
    time: 0,
    phase: 'prep',
    wave: 0,
    waveTotal: 0,
    waveSpawned: 0,
    waveKilled: 0,
    queue: [],
    bossPlanned: false,
    bossSpawned: false,
    boss: null,
    bossEnraged: false,
    resources: { ...START },
    citizens: START_CITIZENS,
    cap: CORE_CITIZENS,
    assigned: 0,
    idle: 0,
    starving: false,
    nodes: [],
    nests: [],
    zombies: [],
    militia: [],
    militiaCap: 0,
    militiaPending: 0,
    cure: null,
    caravan: { index: 0, refresh: 48 },
    abilities: {
      volley: { cd: 0, max: 32, label: 'Volley', cost: { energy: 8 } },
      rally: { cd: 0, max: 38, label: 'Rally', cost: { energy: 6 } },
      repair: { cd: 0, max: 40, label: 'Repair', cost: { materials: 18 } },
    },
    rally: 0,
    stats: { kills: 0, cured: 0, built: 0, lost: 0 },
    lastReward: null,
  };

  /* ------------------------------- level build ------------------------------ */

  const core = {
    id: 'core',
    kind: 'core',
    label: level.coreName,
    x: 0,
    z: level.coreKind === 'bridge' ? -3 : 4.2,
    restored: true,
    building: false,
    progress: 1,
    buildTime: 0,
    hp: level.coreHp,
    maxHp: level.coreHp,
    radius: level.coreKind === 'duomo' ? 2.1 : level.coreKind === 'bridge' ? 2.2 : 1.5,
    staffNeed: 0,
    staffed: 0,
    destroyed: false,
    isCore: true,
  };
  state.core = core;
  state.nodes.push(core);

  for (const def of level.nodes) {
    const plot = def.kind === 'plot';
    state.nodes.push({
      id: def.id,
      kind: def.kind,
      plot,
      label: plot ? 'Empty plot' : BUILDINGS[def.kind].label,
      x: def.x,
      z: def.z,
      restored: false,
      building: false,
      progress: 0,
      buildTime: 0,
      hp: 0,
      maxHp: 0,
      radius: 0.9,
      staffNeed: 0,
      staffed: 0,
      destroyed: false,
      isCore: false,
      militia: 0,
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
      state.resources[key] = Math.min(9999, (state.resources[key] ?? 0) + value);
    }
  }

  function scaleCost(cost, factor) {
    const out = {};
    for (const [key, value] of Object.entries(cost)) out[key] = Math.max(1, Math.round(value * factor));
    return out;
  }

  function metaReady() {
    meta.routes ??= [];
    meta.gear ??= [];
    meta.upg ??= { weapon: 0, armor: 0 };
    meta.upg.weapon ??= 0;
    meta.upg.armor ??= 0;
  }
  metaReady();

  const gearSet = () => new Set(meta.gear);
  const routeSet = () => new Set(meta.routes);

  function militiaStats() {
    const gear = gearSet();
    const damage =
      9 *
      (1 + 0.12 * meta.upg.weapon + (gear.has('sword') ? 0.25 : 0) + (gear.has('crossbow') ? 0.1 : 0));
    const health = 80 * (1 + 0.12 * meta.upg.armor + (gear.has('armor') ? 0.3 : 0));
    const range = gear.has('crossbow') ? 3.2 : 0.64;
    return { damage, health, range, speed: 2.45, every: 0.9 };
  }

  function recomputeCap() {
    let cap = CORE_CITIZENS;
    for (const node of state.nodes) {
      if (node.restored && node.kind === 'house') cap += 4;
    }
    state.cap = cap;
    if (state.citizens > cap) {
      const lost = state.citizens - cap;
      state.citizens = cap;
      hooks.onFlash?.(`Overcrowded — ${lost} survivors left the district.`, 'bad');
    }
    let militiaCap = 0;
    for (const node of state.nodes) {
      if (node.restored && node.kind === 'barracks') militiaCap += 2;
    }
    state.militiaCap = militiaCap;
  }

  function recomputeStaff() {
    let idle = state.citizens;
    for (const node of state.nodes) {
      node.staffed = 0;
      if (!node.restored || !node.staffNeed) continue;
    }
    for (const kind of BUILD_PRIORITY) {
      for (const node of state.nodes) {
        if (!node.restored || node.staffNeed <= 0) continue;
        if ((node.kind === 'plot' ? node.builtKind : node.kind) !== kind) continue;
        const need = node.staffNeed;
        const take = Math.min(need, idle);
        node.staffed = take;
        idle -= take;
      }
    }
    state.idle = idle;
    state.assigned = state.citizens - idle;
  }

  function nodeType(node) {
    return node.kind === 'plot' ? node.builtKind || 'plot' : node.kind;
  }

  const staffNeedOf = (kind) => BUILDINGS[kind]?.staff ?? 0;

  /* -------------------------------- persistence ------------------------------ */

  function applySnapshot(snap) {
    if (!snap || typeof snap !== 'object') return;
    if (snap.resources) {
      for (const key of Object.keys(state.resources)) {
        const value = snap.resources[key];
        if (Number.isFinite(value)) state.resources[key] = Math.max(0, Math.min(9999, value));
      }
    }
    if (Number.isFinite(snap.citizens)) state.citizens = Math.max(0, Math.round(snap.citizens));
    if (Number.isFinite(snap.coreHp)) core.hp = Math.max(0.01, Math.min(core.maxHp, snap.coreHp));
    for (const entry of snap.nodes ?? []) {
      const node = nodeById(entry.id);
      if (!node || node.isCore) continue;
      node.kind = entry.kind || node.kind;
      node.plot = Boolean(entry.plot);
      node.builtKind = entry.builtKind || (node.plot ? null : node.kind);
      node.label = entry.label || (node.plot ? 'Empty plot' : BUILDINGS[node.kind]?.label || node.label);
      node.restored = Boolean(entry.restored);
      node.building = Boolean(entry.building);
      node.progress = Math.max(0, Math.min(1, Number(entry.progress) || 0));
      node.buildTime = Math.max(0.1, Number(entry.buildTime) || BUILDINGS[node.kind]?.time || 1);
      node.maxHp = Math.max(1, Number(entry.maxHp) || BUILDINGS[node.kind]?.hp || 1);
      node.hp = Math.max(
        0,
        Math.min(node.maxHp, Number.isFinite(entry.hp) ? entry.hp : node.restored ? node.maxHp : 0),
      );
      node.staffNeed = Number.isFinite(entry.staffNeed) ? entry.staffNeed : staffNeedOf(node.kind);
      node.destroyed = Boolean(entry.destroyed);
    }
    for (const entry of snap.nests ?? []) {
      const nest = nestById(entry.id);
      if (!nest) continue;
      nest.count = Math.max(0, Math.min(nest.max, Math.round(Number(entry.count) || 0)));
      nest.recharge = Math.max(0, Number(entry.recharge) || NEST_RESPAWN);
    }
    if (Number.isFinite(snap.wave)) state.wave = Math.max(0, Math.min(3, Math.round(snap.wave)));
    if (snap.stats) {
      for (const key of ['kills', 'cured', 'built', 'lost']) {
        if (Number.isFinite(snap.stats[key])) state.stats[key] = snap.stats[key];
      }
    }
    if (snap.cure && nestById(snap.cure.nestId)) {
      state.cure = {
        nestId: snap.cure.nestId,
        t: Math.max(0, Number(snap.cure.t) || 0),
        duration: Math.max(1, Number(snap.cure.duration) || 6),
      };
    }
  }

  function snapshot() {
    return {
      v: 1,
      at: Date.now(),
      // Closing the tab mid-horde (or on the defeat card) replays that horde
      // instead of letting the player skip it.
      wave:
        state.phase === 'prep' || state.phase === 'victory'
          ? state.wave
          : Math.max(0, state.wave - 1),
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
          builtKind: node.builtKind || null,
          label: node.label,
          restored: node.restored,
          building: node.building,
          progress: node.progress,
          buildTime: node.buildTime,
          hp: node.hp,
          maxHp: node.maxHp,
          staffNeed: node.staffNeed,
          destroyed: node.destroyed,
        })),
      nests: state.nests.map((nest) => ({ id: nest.id, count: nest.count, recharge: nest.recharge })),
      stats: { ...state.stats },
    };
  }

  /**
   * A lost horde never wipes the city. The landmark is patched up, the street is
   * cleared, and the same horde comes back when the player rings the bell again.
   */
  function rallyCity() {
    if (state.phase !== 'defeat') return { ok: false };
    state.phase = 'prep';
    state.core.restored = true;
    state.core.destroyed = false;
    state.core.hp = Math.max(1, Math.round(state.core.maxHp * 0.35));
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
    recomputeCap();
    recomputeStaff();
    return { ok: true };
  }

  /* --------------------------------- economy -------------------------------- */

  function produce(dt) {
    const mult = state.starving ? 0.55 : 1;
    const add = { food: 0, materials: 0, energy: 0, biomass: 0 };
    add.food += 0.05;
    add.materials += 0.06;
    add.energy += 0.02;

    for (const node of state.nodes) {
      if (!node.restored) continue;
      const kind = nodeType(node);
      const def = BUILDINGS[kind];
      if (!def) continue;
      const fraction = node.staffNeed ? node.staffed / node.staffNeed : 1;
      if (fraction <= 0) continue;
      if (def.rate) {
        for (const [key, rate] of Object.entries(def.rate)) {
          if (key === 'energy' && def.burn) {
            const want = def.burn * dt * fraction;
            const used = Math.min(want, state.resources.biomass);
            state.resources.biomass = Math.max(0, state.resources.biomass - used);
            if (want > 0) add.energy += (used / want) * rate * dt * fraction * mult;
          } else {
            add[key] += rate * dt * fraction * mult;
          }
        }
      }
    }

    const routes = routeSet();
    if (routes.has('tornabuoni')) {
      add.materials += 0.18 * dt;
      add.food += 0.08 * dt;
    }
    if (routes.has('mercato')) add.energy += 0.22 * dt;
    if (routes.has('prato')) add.biomass += 0.06 * dt;

    for (const [key, value] of Object.entries(add)) {
      state.resources[key] = Math.min(9999, (state.resources[key] ?? 0) + value);
    }

    const upkeep = state.citizens * 0.015 + state.militia.length * 0.02 + state.militiaPending * 0.01;
    state.resources.food = Math.max(0, state.resources.food - upkeep * dt);
    state.starving = state.resources.food <= 0.001 && add.food < upkeep;
  }

  /* -------------------------------- buildings ------------------------------- */

  function costFor(node) {
    const kind = nodeType(node);
    const def = BUILDINGS[kind];
    if (!def) return {};
    return node.destroyed ? scaleCost(def.cost, 0.6) : { ...def.cost };
  }

  function repairCost(node) {
    if (node.isCore) {
      const missing = 1 - node.hp / node.maxHp;
      return { materials: Math.max(10, Math.round(missing * 60)) };
    }
    const missing = 1 - node.hp / node.maxHp;
    const base = BUILDINGS[nodeType(node)]?.cost.materials ?? 40;
    return { materials: Math.max(8, Math.round(missing * base * 0.55)) };
  }

  function restoreNode(id, chosenKind) {
    if (state.phase !== 'prep') return { ok: false, why: 'You cannot build during a horde.' };
    const node = nodeById(id);
    if (!node || node.isCore) return { ok: false, why: 'That cannot be rebuilt.' };
    if (node.restored) return { ok: false, why: 'Already standing.' };
    if (node.building) return { ok: false, why: 'Already under construction.' };
    let kind = nodeType(node);
    if (node.plot) {
      if (!chosenKind || !PLOT_OPTIONS.includes(chosenKind)) {
        return { ok: false, why: 'Choose what to build on this plot.' };
      }
      kind = chosenKind;
    }
    const def = BUILDINGS[kind];
    if (!def) return { ok: false, why: 'Unknown building.' };
    const cost = node.plot || !node.destroyed ? { ...def.cost } : scaleCost(def.cost, 0.6);
    if (!has(cost)) return { ok: false, why: 'Not enough resources.' };
    pay(cost);
    node.plot = false;
    node.kind = kind;
    node.builtKind = kind;
    node.label = def.label;
    node.maxHp = def.hp;
    node.hp = 1;
    node.staffNeed = staffNeedOf(kind);
    node.building = true;
    node.progress = 0;
    node.buildTime = def.time;
    node.destroyed = false;
    hooks.onBuildStart?.(node);
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

  function finishBuilding(node) {
    node.building = false;
    node.progress = 1;
    node.restored = true;
    node.hp = node.maxHp;
    state.stats.built += 1;
    recomputeCap();
    recomputeStaff();
    hooks.onBuilt?.(node);
  }

  /* ---------------------------------- cure ---------------------------------- */

  function cureCost() {
    return { energy: 14 };
  }

  function clinicReady() {
    return state.nodes.some(
      (n) => n.restored && n.kind === 'clinic' && n.staffed >= n.staffNeed && n.hp > 0,
    );
  }

  function startCure(nestId) {
    if (state.phase !== 'prep') return { ok: false, why: 'The horde is already here.' };
    if (state.cure) return { ok: false, why: 'A cure is already in progress.' };
    if (!clinicReady()) return { ok: false, why: 'Restore and staff the Infirmary first.' };
    const nest = nestById(nestId);
    if (!nest || nest.count < 3) return { ok: false, why: 'Too few infected to cure.' };
    const cost = cureCost();
    if (!has(cost)) return { ok: false, why: 'The cure needs 14 energy.' };
    pay(cost);
    state.cure = { nestId, t: 0, duration: 6 };
    hooks.onCureStart?.(nest, state.cure);
    return { ok: true };
  }

  function finishCure() {
    const nest = nestById(state.cure.nestId);
    state.cure = null;
    if (!nest) return;
    nest.count = Math.max(0, nest.count - 3);
    let gained = Math.min(3, state.cap - state.citizens);
    state.citizens += gained;
    const overflow = 3 - gained;
    if (overflow > 0) {
      state.resources.food = Math.min(9999, state.resources.food + overflow * 8);
    }
    state.resources.biomass = Math.min(9999, state.resources.biomass + 20);
    state.stats.cured += 3;
    recomputeStaff();
    hooks.onCureDone?.(nest, { gained, overflow, biomass: 20 });
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
    if (!has(item.cost)) return { ok: false, why: 'Not enough resources.' };
    pay(item.cost);
    meta.gear.push(id);
    applyMilitiaStats();
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
    applyMilitiaStats();
    hooks.onMeta?.();
    return { ok: true };
  }

  function applyMilitiaStats() {
    const stats = militiaStats();
    for (const unit of state.militia) {
      const fraction = unit.hp / unit.maxHp;
      unit.maxHp = stats.health;
      unit.hp = Math.max(1, fraction * stats.health);
      unit.damage = stats.damage;
      unit.range = stats.range;
    }
  }

  /* --------------------------------- combat --------------------------------- */

  function addZombie(type, x, z, wave) {
    const def = ZOMBIES[type];
    const waveScale = 1 + 0.1 * Math.max(0, (wave ?? state.wave) - 1);
    const hp = round(def.hp * level.scale * waveScale);
    const unit = {
      type,
      x,
      z,
      hp,
      maxHp: hp,
      speed: def.speed * (0.94 + rng() * 0.12),
      damage: round(def.dmg * level.scale),
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

  function addBoss() {
    const baseHp = [520, 900, 1500][level.order - 1] ?? 1500;
    const unit = {
      type: 'boss',
      boss: true,
      name: level.boss,
      x: 0.2,
      z: state.core.z - 9,
      hp: baseHp,
      maxHp: baseHp,
      speed: 0.86,
      damage: round(24 * level.scale),
      every: 1.25,
      radius: 0.85,
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

  function addMilitia() {
    const barracks = state.nodes.filter((n) => n.restored && n.kind === 'barracks');
    if (!barracks.length) return;
    const home = barracks[Math.floor(rng() * barracks.length)];
    const stats = militiaStats();
    state.militia.push({
      x: home.x + 0.7,
      z: home.z + 0.7,
      hp: stats.health,
      maxHp: stats.health,
      damage: stats.damage,
      range: stats.range,
      speed: stats.speed,
      every: stats.every,
      attack: 0,
      home,
      flash: 0,
      wobble: rng() * Math.PI * 2,
      target: null,
    });
    state.militiaPending = 8;
    hooks.onMilitia?.(state.militia.length, state.militiaCap);
  }

  function damageBuilding(node, amount) {
    if (!node.restored) return;
    node.hp = Math.max(0, node.hp - amount);
    if (node.hp <= 0) {
      node.restored = false;
      node.hp = 0;
      node.staffed = 0;
      node.destroyed = true;
      state.stats.lost += 1;
      recomputeCap();
      recomputeStaff();
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

  function targetFor(zombie) {
    let militia = null;
    let best = zombie.boss ? 3.4 : 2.2;
    for (const unit of state.militia) {
      const d = Math.hypot(unit.x - zombie.x, unit.z - zombie.z);
      if (d < best) {
        best = d;
        militia = unit;
      }
    }
    if (militia) return { kind: 'militia', unit: militia };

    const reach = zombie.radius + (zombie.boss ? 1.4 : 0.7);
    for (const node of state.nodes) {
      if (!node.restored) continue;
      const d = Math.hypot(node.x - zombie.x, node.z - zombie.z);
      const collision = node.radius + reach;
      if (d < collision) return { kind: 'building', node, distance: d };
    }
    return { kind: 'core', node: state.core, distance: Math.hypot(state.core.x - zombie.x, state.core.z - zombie.z) };
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
            if (Math.hypot(node.x - zombie.x, node.z - zombie.z) < 3.2) {
              damageBuilding(node, node.isCore ? 45 : 40);
            }
          }
          for (const unit of state.militia) {
            if (Math.hypot(unit.x - zombie.x, unit.z - zombie.z) < 3.2) {
              unit.hp -= 26;
              unit.flash = 0.2;
              if (unit.hp <= 0) {
                const i = state.militia.indexOf(unit);
                if (i >= 0) state.militia.splice(i, 1);
                hooks.onMilitiaDown?.(unit);
              }
            }
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
      const touching = distance <= reach;
      if (touching) {
        if (zombie.attack <= 0) {
          zombie.attack = zombie.every;
          if (target.kind === 'militia') {
            target.unit.hp -= zombie.damage;
            target.unit.flash = 0.2;
            if (target.unit.hp <= 0) {
              const i = state.militia.indexOf(target.unit);
              if (i >= 0) state.militia.splice(i, 1);
              hooks.onMilitiaDown?.(target.unit);
            }
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
        unit.hp = Math.min(unit.maxHp, unit.hp + unit.maxHp * 0.06 * dt);
      }
      let target = null;
      let best = Infinity;
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
      } else {
        tx = unit.home.x + 0.8;
        tz = unit.home.z + 0.8;
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
      let best = null;
      let bestD = TOWER.range;
      for (const zombie of state.zombies) {
        const d = Math.hypot(zombie.x - node.x, zombie.z - node.z);
        if (d < bestD) {
          bestD = d;
          best = zombie;
        }
      }
      if (best) {
        node.towerCd = TOWER.every;
        hurtZombie(best, TOWER.damage, 'tower');
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
    const runners = wave === 1 ? 0 : Math.round(count * (wave === 2 ? 0.3 : 0.32));
    const brutes = wave === 3 ? Math.max(1, Math.round(count * 0.2)) : 0;
    const walkers = Math.max(0, count - runners - brutes);
    return {
      wave,
      total: count + (wave === 3 ? 1 : 0),
      walkers,
      runners,
      brutes,
      boss: wave === 3 ? level.boss : null,
      bossHp: [520, 900, 1500][level.order - 1] ?? 1500,
      nests: nestTotal,
      contribution,
    };
  }

  function startWave() {
    if (state.phase !== 'prep') return { ok: false, why: 'Not now.' };
    const plan = previewWave();
    state.wave = plan.wave;
    state.phase = 'wave';
    state.queue = [];
    state.waveSpawned = 0;
    state.waveKilled = 0;
    state.bossPlanned = plan.wave === 3;
    state.bossSpawned = false;
    state.boss = null;
    state.bossEnraged = false;

    const types = [];
    for (let i = 0; i < plan.walkers; i++) types.push('walker');
    for (let i = 0; i < plan.runners; i++) types.push('runner');
    for (let i = 0; i < plan.brutes; i++) types.push('brute');
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    let at = 0.5;
    const interval = Math.max(0.55, 1.35 - 0.16 * (plan.wave - 1));
    for (const type of types) {
      const nests = state.nests.filter((n) => n.count > 0);
      const nest = (nests.length ? nests : state.nests)[Math.floor(rng() * (nests.length || state.nests.length))];
      state.queue.push({ type, at, nest });
      at += interval * (0.68 + rng() * 0.65);
    }
    state.bossAt = Math.max(6, at * 0.42);
    state.waveTotal = types.length + (plan.boss ? 1 : 0);
    state.queueIndex = 0;
    state.spawnClock = 0;
    recomputeStaff();
    hooks.onWaveStart?.(plan);
    return { ok: true, plan };
  }

  function spawnFromQueue(type, nest) {
    const x = nest.x + (rng() - 0.5) * 1.4;
    const z = nest.z + (rng() - 0.5) * 1.4;
    addZombie(type, x, z, state.wave);
    state.waveSpawned += 1;
  }

  function clearWave() {
    state.phase = 'prep';
    for (const unit of state.militia) unit.hp = unit.maxHp;
    for (const nest of state.nests) nest.count = Math.min(NEST_MAX, nest.count + 2);
    if (state.wave >= 3) {
      state.phase = 'victory';
      hooks.onVictory?.({ level, wave: 3, stats: state.stats });
      return;
    }
    const reward = { ...WAVES.reward };
    for (const key of Object.keys(reward)) reward[key] += (level.order - 1) * 10;
    grant(reward);
    state.lastReward = reward;
    hooks.onWaveClear?.({ level, wave: state.wave, reward, stats: state.stats });
  }

  /* --------------------------------- abilities ------------------------------- */

  function useAbility(id) {
    const ability = state.abilities[id];
    if (!ability) return { ok: false };
    if (state.phase !== 'wave') return { ok: false, why: 'Abilities only work during a horde.' };
    if (ability.cd > 0) return { ok: false, why: 'Still recharging.' };
    if (!has(ability.cost)) return { ok: false, why: 'Not enough resources.' };
    pay(ability.cost);
    ability.cd = ability.max;
    if (id === 'volley') {
      const snapshot = [...state.zombies];
      for (const zombie of snapshot) {
        hurtZombie(zombie, zombie.boss ? 140 : 55, 'volley');
      }
      hooks.onAbility?.('volley', state.core.x, state.core.z);
    } else if (id === 'rally') {
      state.rally = 8;
      hooks.onAbility?.('rally', state.core.x, state.core.z);
    } else if (id === 'repair') {
      state.core.hp = Math.min(state.core.maxHp, state.core.hp + state.core.maxHp * 0.22);
      hooks.onAbility?.('repair', state.core.x, state.core.z);
      hooks.onRepair?.(state.core);
    }
    return { ok: true };
  }

  /* ----------------------------------- tick ---------------------------------- */

  function tick(dt) {
    state.time += dt;
    for (const ability of Object.values(state.abilities)) {
      ability.cd = Math.max(0, ability.cd - dt);
    }
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
        if (node.building) {
          node.progress = Math.min(1, node.progress + dt / Math.max(0.1, node.buildTime));
          if (node.progress >= 1) finishBuilding(node);
        }
      }
      recomputeStaff();
      produce(dt);

      if (state.militia.length + (state.militiaPending > 0 ? 1 : 0) < state.militiaCap) {
        state.militiaPending = Math.max(0, state.militiaPending - dt);
        if (state.militiaPending <= 0 && state.resources.food >= 4) {
          state.resources.food -= 4;
          addMilitia();
        }
      }
    }

    if (state.phase === 'wave') {
      state.spawnClock += dt;
      while (state.queue.length && state.queue[0].at <= state.spawnClock) {
        const item = state.queue.shift();
        spawnFromQueue(item.type, item.nest);
      }
      if (state.bossPlanned && !state.bossSpawned && state.spawnClock >= state.bossAt) {
        addBoss();
      }
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
    }
  }

  applySnapshot(saved);
  recomputeCap();
  recomputeStaff();

  return {
    state,
    tick,
    snapshot,
    rallyCity,
    restoreNode,
    repairNode,
    startCure,
    exchange,
    takeCaravan,
    buyRoute,
    buyGear,
    buyUpgrade,
    previewWave,
    startWave,
    useAbility,
    militiaStats,
    costFor,
    repairCost,
    canPay: has,
    cureCost,
    clinicReady,
    nodeType,
    nodeById,
    nestById,
    clinicStaffed: () => clinicReady(),
    BUILD_PRIORITY,
    NEST_MAX,
  };
}
