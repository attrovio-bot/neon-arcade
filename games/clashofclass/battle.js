/**
 * CLASH OF CLASS — the raid simulation.
 *
 * A pure state machine: buildings, troops, defenses and projectiles. No DOM, no
 * canvas. The renderer reads the state and the UI reads the same state, so the
 * battle can be previewed in menus simply by not ticking it.
 *
 * Authentic touches:
 *  - walls never count toward destruction; every other building weighs one;
 *  - stars for Town Hall, 50% and 100%;
 *  - defenses only hit the layer they can reach (cannons ground, air defence air);
 *  - troops target the closest building (giants defences, goblins resources);
 *  - ground troops break the wall in their way instead of path-finding around;
 *  - the clock starts on the first deployment, not on the menu.
 */

import {
  GRID,
  OFFSET,
  FIELD,
  BATTLE_TIME,
  MAX_UNITS,
  STRUCTURES,
  DEFENSES,
  CELL_TYPES,
  UNIT_BY_ID,
} from './data.js';

const R = 0.26;
const key = (cx, cy) => `${cx},${cy}`;
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

let uid = 1;

/* ------------------------------- construction ------------------------------ */

export function createBattle(level, { army = null, hooks = {}, preview = false } = {}) {
  const state = {
    level,
    buildings: [],
    units: [],
    projectiles: [],
    fx: [],
    queue: (army ?? []).filter((row) => row.count > 0).map((row) => ({ ...row })),
    selected: null,
    phase: preview ? 'preview' : 'deploy',
    started: false,
    timeLeft: BATTLE_TIME,
    thDown: false,
    destroyed: 0,
    total: 0,
    pct: 0,
    stars: 0,
    deployed: 0,
    kills: 0,
    result: null,
    shake: 0,
    flash: 0,
    starFlags: { th: false, half: false, all: false },
    wallGrid: new Set(),
    wallsByKey: new Map(),
    hooks,
    preview,
  };

  const scale = level.hpScale ?? 1;
  const power = level.power ?? 1;

  for (let cy = 0; cy < GRID; cy++) {
    const row = level.map[cy] ?? '';
    for (let cx = 0; cx < GRID; cx++) {
      const type = CELL_TYPES[row[cx]];
      if (!type) continue;
      const isDefense = Boolean(DEFENSES[type]);
      const base = isDefense ? DEFENSES[type] : STRUCTURES[type];
      if (!base) continue;
      const building = {
        id: uid++,
        type,
        cx,
        cy,
        x: OFFSET + cx + 0.5,
        y: OFFSET + cy + 0.5,
        kind: isDefense ? 'defense' : base.kind,
        wall: type === 'wall',
        resource: Boolean(base.resource),
        alive: true,
        hp: Math.round(base.hp * scale),
        maxHp: Math.round(base.hp * scale),
        cooldown: 0.4 + Math.random() * 0.6,
        aim: -Math.PI / 2,
        flash: 0,
        dying: 0,
      };
      if (isDefense) {
        building.dmg = base.dmg * power;
        building.atk = base.atk;
        building.range = base.range;
        building.minRange = base.minRange ?? 0;
        building.layer = base.layer;
        building.splash = base.splash ?? 0;
        building.shot = base.shot;
      }
      state.buildings.push(building);
      if (building.wall) {
        state.wallGrid.add(key(cx, cy));
        state.wallsByKey.set(key(cx, cy), building);
      } else {
        state.total += 1;
      }
    }
  }

  for (const row of state.queue) state.selected = state.selected || row.type;
  return state;
}

export function remaining(state) {
  return state.queue.reduce((sum, row) => sum + row.count, 0);
}

export function isDeployable(state, x, y) {
  if (state.preview || state.phase === 'over') return false;
  if (x < 0.15 || y < 0.15 || x > FIELD - 0.15 || y > FIELD - 0.15) return false;
  const inside = x >= OFFSET && x < OFFSET + GRID && y >= OFFSET && y < OFFSET + GRID;
  return !inside;
}

export function selectUnit(state, typeId) {
  const row = state.queue.find((item) => item.type === typeId && item.count > 0);
  if (row) state.selected = typeId;
  return Boolean(row);
}

export function deployUnit(state, typeId, x, y) {
  if (state.preview || state.phase === 'over') return { ok: false, why: 'The raid is over.' };
  const row = state.queue.find((item) => item.type === typeId && item.count > 0);
  if (!row) return { ok: false, why: 'No troops of that kind left.' };
  const def = UNIT_BY_ID[typeId];
  if (!def) return { ok: false, why: 'Unknown troop.' };
  if (!isDeployable(state, x, y)) return { ok: false, why: 'Deploy on the blue grass, outside the village.' };
  if (state.units.length + 1 > MAX_UNITS) return { ok: false, why: 'Too many troops on the field.' };
  const unit = {
    id: uid++,
    type: typeId,
    def,
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    target: null,
    healTarget: null,
    cooldown: 0.35,
    spawn: 0.3,
    bob: Math.random() * Math.PI * 2,
    moving: false,
    air: def.air,
    flash: 0,
    atkAnim: 0,
    atkDir: { x: 1, y: 0 },
    deathT: 0,
  };

  row.count -= 1;
  if (row.count <= 0) state.queue = state.queue.filter((item) => item !== row);
  state.units.push(unit);
  state.deployed += 1;
  state.started = true;
  if (state.phase === 'deploy') state.phase = 'fight';
  if (!state.queue.some((item) => item.type === state.selected && item.count > 0)) {
    state.selected = state.queue.find((item) => item.count > 0)?.type ?? null;
  }
  state.fx.push({ k: 'deploy', x, y, life: 0.5 });
  state.hooks.onSound?.('deploy');
  state.hooks.onDeploy?.(unit);
  return { ok: true };
}

/* --------------------------------- helpers --------------------------------- */

function blockingWall(state, x, y) {
  const xs = [Math.floor(x - R), Math.floor(x + R)];
  const ys = [Math.floor(y - R), Math.floor(y + R)];
  for (const px of xs) {
    for (const py of ys) {
      const wall = state.wallsByKey.get(key(px - OFFSET, py - OFFSET));
      if (wall?.alive) return wall;
    }
  }
  return null;
}

function blocked(state, x, y) {
  if (x < 0.12 || y < 0.12 || x > FIELD - 0.12 || y > FIELD - 0.12) return true;
  return Boolean(blockingWall(state, x, y));
}

function wallPref(state, unit) {
  let best = null;
  let bestD = Infinity;
  for (const building of state.buildings) {
    if (!building.alive || !building.wall) continue;
    const d = dist2(building, unit);
    if (d < bestD) {
      best = building;
      bestD = d;
    }
  }
  return best;
}

function pickTarget(state, unit) {
  const def = unit.def;
  const passes =
    def.pref === 'defense'
      ? ['defense', 'any']
      : def.pref === 'resource'
        ? ['resource', 'any']
        : ['any'];

  for (const pass of passes) {
    let best = null;
    let bestD = Infinity;
    for (const building of state.buildings) {
      if (!building.alive || building.wall) continue;
      if (pass === 'defense' && building.kind !== 'defense') continue;
      if (pass === 'resource' && !building.resource) continue;
      const d = dist2(building, unit);
      if (d < bestD) {
        best = building;
        bestD = d;
      }
    }
    if (best) return best;
  }
  return null;
}

function nearestWall(state, unit, radius = 1.1) {
  let best = null;
  let bestD = radius * radius;
  for (const building of state.buildings) {
    if (!building.alive || !building.wall) continue;
    const d = dist2(building, unit);
    if (d < bestD) {
      best = building;
      bestD = d;
    }
  }
  return best;
}

/* --------------------------------- damage ---------------------------------- */

function recompute(state, building) {
  if (building && !building.wall) {
    state.destroyed += 1;
    if (building.type === 'town_hall') state.thDown = true;
  }
  state.pct = state.total ? Math.round((state.destroyed / state.total) * 100) : 0;

  if (state.thDown && !state.starFlags.th) {
    state.starFlags.th = true;
    state.hooks.onStar?.();
    state.fx.push({ k: 'star', x: building?.x ?? FIELD / 2, y: building?.y ?? FIELD / 2, life: 1.4 });
  }
  if (state.pct >= 50 && !state.starFlags.half) {
    state.starFlags.half = true;
    state.hooks.onStar?.();
    state.fx.push({ k: 'star', x: FIELD / 2, y: FIELD / 2, life: 1.2, big: true });
  }
  if (state.pct >= 100 && !state.starFlags.all) {
    state.starFlags.all = true;
    state.hooks.onStar?.();
    state.fx.push({ k: 'star', x: FIELD / 2, y: FIELD / 2, life: 1.6, big: true });
  }
  state.stars = (state.thDown ? 1 : 0) + (state.pct >= 50 ? 1 : 0) + (state.pct >= 100 ? 1 : 0);
}

function damageBuilding(state, building, amount) {
  if (!building.alive) return;
  building.hp -= amount;
  building.flash = 0.16;
  if (building.hp <= 0) {
    building.hp = 0;
    building.alive = false;
    if (building.wall) {
      state.wallGrid.delete(key(building.cx, building.cy));
      state.wallsByKey.delete(key(building.cx, building.cy));
      state.fx.push({ k: 'boom', x: building.x, y: building.y, scale: 0.7, life: 0.45 });
      state.hooks.onSound?.('rubble');
    } else {
      building.dying = 0.4;
      state.fx.push({
        k: 'boom',
        x: building.x,
        y: building.y,
        scale: building.type === 'town_hall' ? 1.8 : 1.05,
        life: building.type === 'town_hall' ? 0.9 : 0.6,
      });
      state.fx.push({ k: 'debris', x: building.x, y: building.y, life: 0.5 });
      state.shake = Math.max(state.shake, building.type === 'town_hall' ? 1 : 0.25);
      state.hooks.onSound?.('boom');
      state.hooks.onDestroy?.(building);
    }
    recompute(state, building);
  } else if (Math.random() < 0.22) {
    state.fx.push({ k: 'hit', x: building.x + (Math.random() - 0.5) * 0.5, y: building.y + (Math.random() - 0.4) * 0.4, life: 0.22 });
  }
}

function damageUnit(state, unit, amount) {
  if (unit.hp <= 0) return;
  unit.hp -= amount;
  unit.flash = 0.14;
  if (unit.hp <= 0) {
    unit.hp = 0;
    unit.deathT = 0.35;
    state.kills += 1;
    state.fx.push({ k: 'unitdown', x: unit.x, y: unit.y, life: 0.4 });
    state.hooks.onSound?.('poof');
  }
}

/* ---------------------------------- units ---------------------------------- */

function strike(state, unit, target, dirx, diry) {
  const def = unit.def;

  if (def.explode) {
    state.fx.push({ k: 'boom', x: unit.x, y: unit.y, scale: 1.15, life: 0.6 });
    state.shake = Math.max(state.shake, 0.28);
    state.hooks.onSound?.('wallbreak');
    for (const building of state.buildings) {
      if (!building.alive) continue;
      if (dist(building, unit) > 1.35) continue;
      const amount = building.wall ? def.dmg * (def.wallBonus ?? 1) : def.dmg * 0.6;
      damageBuilding(state, building, amount);
    }
    unit.hp = 0;
    return;
  }

  const dmg = def.dmg * (target.wall ? def.wallBonus ?? 1 : 1);
  const dl = Math.hypot(dirx, diry) || 1;
  unit.atkAnim = 0.14;
  unit.atkDir = { x: dirx / dl, y: diry / dl };
  if (def.range > 1.4) {
    state.fx.push({
      k: 'shot',
      kind: def.id === 'wizard' ? 'bolt' : def.id === 'dragon' ? 'breath' : 'arrow',
      x1: unit.x,
      y1: unit.y,
      x2: target.x,
      y2: target.y,
      life: 0.16,
    });
    state.hooks.onSound?.('zap');
  } else {
    state.fx.push({ k: 'slash', x: target.x, y: target.y, a: Math.atan2(diry, dirx), life: 0.14 });
    state.hooks.onSound?.('hit');
  }

  damageBuilding(state, target, dmg);
  if (def.splash > 0) {
    for (const other of state.buildings) {
      if (other === target || !other.alive || other.wall) continue;
      if (dist(other, target) <= def.splash) damageBuilding(state, other, dmg * 0.55);
    }
  }
}

function updateFighter(state, unit, dt) {
  const def = unit.def;
  let target = unit.target;
  if (!target || !target.alive) {
    target = def.pref === 'wall' ? wallPref(state, unit) ?? pickTarget(state, unit) : pickTarget(state, unit);
  }
  unit.target = target;
  if (!target) return;

  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const distance = Math.hypot(dx, dy) || 0.001;
  const reach = def.range + 0.42;

  if (distance <= reach) {
    unit.moving = false;
    if (unit.cooldown <= 0) {
      unit.cooldown = def.atk;
      strike(state, unit, target, dx / distance, dy / distance);
    }
    return;
  }

  unit.moving = true;
  const step = def.speed * dt;
  const nx = unit.x + (dx / distance) * step;
  const ny = unit.y + (dy / distance) * step;

  if (unit.air) {
    unit.x = Math.min(FIELD - 0.15, Math.max(0.15, nx));
    unit.y = Math.min(FIELD - 0.15, Math.max(0.15, ny));
    return;
  }

  if (!blocked(state, nx, ny)) {
    unit.x = nx;
    unit.y = ny;
    return;
  }

  const wall = blockingWall(state, nx, ny);
  if (wall) {
    unit.target = wall;
    unit.moving = false;
    if (unit.cooldown <= 0 && dist(unit, wall) <= reach + 0.35) {
      unit.cooldown = def.atk;
      strike(state, unit, wall, wall.x - unit.x, wall.y - unit.y);
    }
    return;
  }
  // A wall that disappeared mid-step: nudge through the gap.
  if (!blocked(state, nx, unit.y)) unit.x = nx;
  else if (!blocked(state, unit.x, ny)) unit.y = ny;
}

function pickWoundedAlly(state, healer) {
  let best = null;
  let bestRatio = 1;
  for (const unit of state.units) {
    if (unit === healer || unit.hp <= 0 || unit.hp >= unit.maxHp) continue;
    const d = dist(unit, healer);
    if (d > 7) continue;
    const ratio = unit.hp / unit.maxHp;
    if (ratio < bestRatio || (ratio === bestRatio && d < dist(best, healer))) {
      best = unit;
      bestRatio = ratio;
    }
  }
  return best;
}

function updateHealer(state, healer, dt) {
  const def = healer.def;
  let target = healer.healTarget;
  if (!target || target.hp <= 0 || target.hp >= target.maxHp) {
    target = pickWoundedAlly(state, healer);
    healer.healTarget = target;
  }
  if (!target) {
    healer.moving = false;
    return;
  }

  const d = dist(target, healer);
  if (d > def.range - 0.3) {
    healer.moving = true;
    const step = def.speed * dt;
    const nx = healer.x + ((target.x - healer.x) / d) * step;
    const ny = healer.y + ((target.y - healer.y) / d) * step;
    if (!blocked(state, nx, ny)) {
      healer.x = nx;
      healer.y = ny;
    } else {
      // Healers cannot break walls; sidestep along the stone.
      if (!blocked(state, nx, healer.y)) healer.x = nx;
      else if (!blocked(state, healer.x, ny)) healer.y = ny;
    }
    return;
  }

  healer.moving = false;
  if (healer.cooldown <= 0) {
    healer.cooldown = def.atk;
    for (const ally of state.units) {
      if (ally.hp <= 0) continue;
      if (dist(ally, target) > 1.8) continue;
      if (ally.hp >= ally.maxHp) continue;
      ally.hp = Math.min(ally.maxHp, ally.hp + def.heal);
      state.fx.push({ k: 'heal', x: ally.x, y: ally.y, life: 0.45 });
    }
    state.hooks.onSound?.('heal');
  }
}

function updateUnits(state, dt) {
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;
    unit.spawn = Math.max(0, unit.spawn - dt);
    unit.cooldown = Math.max(0, unit.cooldown - dt);
    unit.flash = Math.max(0, unit.flash - dt);
    unit.bob += dt * (unit.air ? 2.6 : 6.4);
    if (unit.spawn > 0) continue;
    if (unit.def.heals) updateHealer(state, unit, dt);
    else updateFighter(state, unit, dt);
  }
  state.units = state.units.filter((unit) => unit.hp > 0 || unit.deathT > 0);
}

function separate(state) {
  const units = state.units;
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j];
      if (a.air !== b.air || a.hp <= 0 || b.hp <= 0) continue;
      const min = a.air ? 0.5 : 0.4;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 < 0.0001) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) * 0.45;
      dx /= d;
      dy /= d;
      const ax = a.x - dx * push;
      const ay = a.y - dy * push;
      const bx = b.x + dx * push;
      const by = b.y + dy * push;
      if (a.air || !blocked(state, ax, ay)) {
        a.x = ax;
        a.y = ay;
      }
      if (b.air || !blocked(state, bx, by)) {
        b.x = bx;
        b.y = by;
      }
    }
  }
}

/* -------------------------------- defenses --------------------------------- */

function layerMatches(layer, unit) {
  if (layer === 'air') return unit.air;
  if (layer === 'ground') return !unit.air;
  return true;
}

function pickUnitTarget(state, defense) {
  let best = null;
  let bestD = Infinity;
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;
    if (!layerMatches(defense.layer, unit)) continue;
    if (unit.spawn > 0) continue;
    const d = dist2(defense, unit);
    if (d > defense.range * defense.range) continue;
    if (d < defense.minRange * defense.minRange) continue;
    if (d < bestD) {
      best = unit;
      bestD = d;
    }
  }
  return best;
}

function updateDefenses(state, dt) {
  for (const defense of state.buildings) {
    if (!defense.alive || defense.kind !== 'defense') continue;
    defense.flash = Math.max(0, defense.flash - dt);
    const target = pickUnitTarget(state, defense);
    if (target) {
      // Barrels sweep toward their mark instead of snapping around.
      defense.aim = lerpAngle(
        defense.aim,
        Math.atan2(target.y - defense.y, target.x - defense.x),
        Math.min(1, 7 * dt),
      );
    }
    if (defense.cooldown > 0) {
      defense.cooldown -= dt;
      continue;
    }
    if (!target) continue;
    defense.cooldown = defense.atk;

    const flight = defense.shot === 'shell' ? 0.75 : 0.16;
    state.projectiles.push({
      id: uid++,
      kind: defense.shot,
      x: defense.x + Math.cos(defense.aim) * 0.5,
      y: defense.y + Math.sin(defense.aim) * 0.5,
      tx: target.x,
      ty: target.y,
      target,
      dmg: defense.dmg,
      splash: defense.splash,
      speed: defense.shot === 'shell' ? 5.5 : 10,
      arc: defense.shot === 'shell' ? 1.7 : 0,
      t: 0,
      life: flight + 0.6,
    });
    state.fx.push({ k: 'muzzle', x: defense.x, y: defense.y, kind: defense.shot, life: 0.12 });
    state.hooks.onSound?.(defense.shot === 'shell' ? 'thump' : 'shoot');
    state.hooks.onShot?.(defense, target);
  }
}

function updateProjectiles(state, dt) {
  for (const shot of state.projectiles) {
    shot.t += dt;
    if (shot.target && shot.target.hp > 0) {
      shot.tx = shot.target.x;
      shot.ty = shot.target.y;
    }
    const dx = shot.tx - shot.x;
    const dy = shot.ty - shot.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const step = shot.speed * dt;
    if (d <= step + 0.08) {
      shot.x = shot.tx;
      shot.y = shot.ty;
      shot.done = true;
      applyShot(state, shot);
      continue;
    }
    shot.x += (dx / d) * step;
    shot.y += (dy / d) * step;
    shot.life -= dt;
  }
  state.projectiles = state.projectiles.filter((shot) => !shot.done && shot.life > 0);
}

function applyShot(state, shot) {
  const radius = shot.splash > 0 ? shot.splash : 0.5;
  let hit = false;
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;
    if (Math.hypot(unit.x - shot.x, unit.y - shot.y) > radius) continue;
    damageUnit(state, unit, shot.dmg);
    hit = true;
  }
  if (shot.splash > 0) {
    state.fx.push({ k: 'boom', x: shot.x, y: shot.y, scale: 0.55, life: 0.35 });
    state.hooks.onSound?.('thump');
  } else if (hit) {
    state.fx.push({ k: 'hit', x: shot.x, y: shot.y, life: 0.18 });
  }
}

/* --------------------------------- lifecycle -------------------------------- */

export function finishBattle(state, { retreat = false } = {}) {
  if (state.phase === 'over') return state.result;
  state.phase = 'over';
  const pct = state.pct;
  const stars = (state.thDown ? 1 : 0) + (pct >= 50 ? 1 : 0) + (pct >= 100 ? 1 : 0);
  state.stars = stars;
  state.result = {
    won: !state.preview && pct >= state.level.winPct,
    retreated: retreat,
    stars,
    pct,
    threshold: state.level.winPct,
    timeLeft: Math.max(0, Math.ceil(state.timeLeft)),
    timeUsed: Math.round(BATTLE_TIME - state.timeLeft),
    deployed: state.deployed,
    destroyed: state.destroyed,
    total: state.total,
    thDown: state.thDown,
    kills: state.kills,
  };
  if (state.result.won) {
    for (let i = 0; i < 3; i++) {
      state.fx.push({
        k: 'star',
        x: 3 + Math.random() * 12,
        y: 2.5 + Math.random() * 9,
        life: 1.8,
        big: true,
      });
    }
  }
  state.hooks.onSound?.('end');
  state.hooks.onEnd?.(state.result);
  return state.result;
}

export function updateBattle(state, dt) {
  if (state.preview) return;
  state.shake = Math.max(0, state.shake - dt * 1.6);

  // Cosmetics keep ticking after the whistle so collapses and the last
  // corpses finish their animation behind the result modal.
  for (const building of state.buildings) {
    if (building.dying > 0) building.dying -= dt;
    if (building.flash > 0) building.flash -= dt;
  }
  for (const unit of state.units) {
    if (unit.hp <= 0) unit.deathT -= dt;
    else if (unit.atkAnim > 0) unit.atkAnim -= dt;
  }
  if (state.phase === 'over') {
    state.units = state.units.filter((unit) => unit.hp > 0 || unit.deathT > 0);
    return;
  }

  if (state.started) {
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      finishBattle(state);
      return;
    }
  }

  updateUnits(state, dt);
  separate(state);
  updateDefenses(state, dt);
  updateProjectiles(state, dt);

  if (state.pct >= 100) {
    finishBattle(state);
    return;
  }
  if (state.started && state.units.length === 0 && remaining(state) === 0) {
    finishBattle(state);
  }
}
