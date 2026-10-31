/**
 * CLASH OF CLASS — canvas renderer.
 *
 * Draws the 18x18 battlefield (a 14x14 village on a 2-cell deploy ring) with
 * pre-rendered pixel sprites, a procedural ground texture per level theme,
 * health bars, projectiles and a hand-rolled particle layer.
 *
 * Animation is all state-driven from the simulation plus a few renderer-side
 * cosmetics: units flip between walk frames, lunge when they strike and topple
 * over when they die; buildings darken, crack, smoke, recoil and finally
 * collapse before turning to rubble; mortars trail smoke, rockets trail flame;
 * each theme drifts its own ambient weather (pollen, dust, snow).
 */

import { GRID, OFFSET, FIELD, THEMES } from './data.js';
import { getSprite, BUILDING_SIZE } from './sprites.js';
import { isDeployable } from './battle.js';

function buildGround(theme) {
  const node = document.createElement('canvas');
  node.width = 48;
  node.height = 48;
  const g = node.getContext('2d');
  g.fillStyle = theme.grass;
  g.fillRect(0, 0, 48, 48);
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807 + 11) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(rand() * 48);
    const y = Math.floor(rand() * 48);
    g.fillStyle = rand() < 0.5 ? theme.grassDark : theme.grassLight;
    g.fillRect(x, y, rand() < 0.3 ? 2 : 1, 1);
  }
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(rand() * 46);
    const y = Math.floor(rand() * 46);
    g.fillStyle = theme.tuft;
    g.fillRect(x, y, 1, 2);
    g.fillRect(x + 2, y + 1, 1, 1);
  }
  return node;
}

export function createRenderer(stage, opts = {}) {
  const reducedMotion = Boolean(opts?.reducedMotion);
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let width = 1;
  let height = 1;
  let dpr = 1;
  let layout = { x: 0, y: 0, side: 0, cell: 0 };
  const ground = new Map();
  const particles = [];
  const rings = [];
  const strokes = [];
  let last = performance.now();
  let clock = 0;
  let shakeX = 0;
  let shakeY = 0;
  let ambientT = 0;

  function resize(w, h, ratio) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    dpr = Math.max(1, ratio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // Leave room for the hub HUD on top and the troop tray at the bottom.
    const top = 118;
    const bottom = 132;
    const avail = Math.max(160, height - top - bottom);
    const side = Math.min(width - 10, avail);
    const cell = side / FIELD;
    layout = {
      x: (width - side) / 2,
      y: top + (avail - side) / 2,
      side,
      cell,
    };
  }

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const cell = layout.cell || 1;
    return {
      x: (clientX - rect.left - layout.x) / cell,
      y: (clientY - rect.top - layout.y) / cell,
    };
  }

  function cellPos(cx, cy) {
    return {
      x: layout.x + (OFFSET + cx + 0.5) * layout.cell,
      y: layout.y + (OFFSET + cy + 0.5) * layout.cell,
    };
  }

  function fieldPos(x, y) {
    return { x: layout.x + x * layout.cell, y: layout.y + y * layout.cell };
  }

  function spawnBurst(x, y, count, colors, speed = 3.2, life = 0.6, size = 2.4) {
    for (let i = 0; i < count; i++) {
      if (particles.length > 420) break;
      const angle = Math.random() * Math.PI * 2;
      const vel = speed * (0.35 + Math.random() * 0.75);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel - speed * 0.35,
        g: 5.5,
        life: life * (0.6 + Math.random() * 0.7),
        max: life,
        size: size * (0.5 + Math.random()),
        color: colors[(Math.random() * colors.length) | 0],
        glow: Math.random() < 0.22,
      });
    }
  }

  function spawnRing(x, y, color, speed = 3, life = 0.5, widthPx = 2) {
    rings.push({ x, y, r: 0.4, vr: speed, life, max: life, color, w: widthPx });
  }

  function spawnSmoke(x, y, big = false) {
    if (particles.length > 400) return;
    particles.push({
      x: x + (Math.random() - 0.5) * 0.3,
      y,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -(0.25 + Math.random() * 0.3),
      g: 0,
      life: 1.1 + Math.random() * 0.5,
      max: 1.6,
      size: (big ? 3.2 : 2.2) * (0.7 + Math.random() * 0.6),
      color: Math.random() < 0.5 ? '#6f6a5e' : '#8a8578',
      alpha: 0.5,
    });
  }

  function spawnAmbient(themeKey) {
    if (particles.length > 360) return;
    if (themeKey === 'snow') {
      particles.push({
        x: Math.random() * FIELD,
        y: -0.3,
        vx: -0.1 - Math.random() * 0.15,
        vy: 0.6 + Math.random() * 0.4,
        g: 0,
        life: 22,
        max: 22,
        size: 1.2 + Math.random() * 1.2,
        color: '#ffffff',
        alpha: 0.85,
        sway: true,
        seed: Math.random() * 10,
      });
    } else if (themeKey === 'sand') {
      particles.push({
        x: -0.3,
        y: Math.random() * FIELD,
        vx: 1.4 + Math.random() * 0.8,
        vy: 0.03,
        g: 0,
        life: 6,
        max: 6,
        size: 1.1 + Math.random(),
        color: '#e8c98f',
        alpha: 0.3,
      });
    } else {
      particles.push({
        x: Math.random() * FIELD,
        y: Math.random() * FIELD,
        vx: 0.1 + Math.random() * 0.15,
        vy: -(0.12 + Math.random() * 0.18),
        g: 0,
        life: 4,
        max: 4,
        size: 1.1,
        color: '#d9ff9e',
        alpha: 0.5,
        glow: true,
        sway: true,
        seed: Math.random() * 10,
      });
    }
  }

  function consumeFx(battle) {
    if (!battle?.fx?.length) return;
    for (const fx of battle.fx) {
      switch (fx.k) {
        case 'deploy':
          spawnRing(fx.x, fx.y, '#a7ff6a', 4.2, 0.45, 2);
          spawnBurst(fx.x, fx.y, 7, ['#d6ff9e', '#8fdd58', '#6fae3c'], 2.4, 0.5, 1.8);
          break;
        case 'boom':
          spawnBurst(fx.x, fx.y, Math.round(14 * (fx.scale || 1)), ['#ffd15a', '#ff8a3d', '#5a5149', '#2b2622'], 4.4 * (fx.scale || 1), 0.7 * (fx.scale || 1), 2.8);
          spawnRing(fx.x, fx.y, 'rgba(255,190,90,0.8)', 5.5 * (fx.scale || 1), 0.5, 2);
          break;
        case 'debris':
          spawnBurst(fx.x, fx.y, 10, ['#8a6a4a', '#6f5a40', '#a89878', '#5d574c'], 3.4, 0.6, 2.2);
          break;
        case 'hit':
          spawnBurst(fx.x, fx.y, 3, ['#ffe08a', '#d8c8a8'], 2.2, 0.3, 1.6);
          break;
        case 'unitdown':
          spawnBurst(fx.x, fx.y, 7, ['#cfc6b2', '#8f8878', '#5d574c'], 2.2, 0.45, 1.8);
          break;
        case 'heal':
          spawnRing(fx.x, fx.y, 'rgba(140,230,120,0.9)', 2.4, 0.4, 1.5);
          spawnBurst(fx.x, fx.y, 4, ['#c8ffb0', '#8ce678'], 1.6, 0.5, 1.4);
          break;
        case 'star':
          spawnRing(fx.x, fx.y, 'rgba(255,215,90,0.95)', 7, 0.7, 3);
          spawnBurst(fx.x, fx.y, 16, ['#ffe58a', '#ffc83d', '#fff7d2'], 3.6, 0.9, 2);
          break;
        case 'shot': {
          const breath = fx.kind === 'breath';
          strokes.push({
            x1: fx.x1,
            y1: fx.y1,
            x2: fx.x2,
            y2: fx.y2,
            life: fx.life ?? 0.16,
            max: fx.life ?? 0.16,
            color: fx.kind === 'bolt' ? '#d79bff' : breath ? 'rgba(255,150,60,0.95)' : '#f3e6c6',
            w: breath ? 3 : 1.4,
          });
          if (breath) {
            for (let i = 0; i < 7; i++) {
              const t = i / 6;
              particles.push({
                x: fx.x1 + (fx.x2 - fx.x1) * t,
                y: fx.y1 + (fx.y2 - fx.y1) * t,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -0.3 - Math.random() * 0.3,
                g: -0.1,
                life: 0.35,
                max: 0.35,
                size: 2 + Math.random() * 2,
                color: ['#ffb03a', '#ff7a3d', '#ffe08a'][(Math.random() * 3) | 0],
                glow: true,
                alpha: 0.9,
              });
            }
          }
          break;
        }
        case 'slash':
          strokes.push({ x1: fx.x, y1: fx.y, x2: fx.x + Math.cos(fx.a) * 0.5, y2: fx.y + Math.sin(fx.a) * 0.5, life: 0.13, max: 0.13, color: '#fff3c4', w: 2.2 });
          break;
        case 'muzzle':
          spawnBurst(fx.x, fx.y, 2, ['#ffe9a8', '#ffbf5c'], 1.6, 0.18, 1.3);
          break;
        default:
          break;
      }
    }
    battle.fx.length = 0;
  }

  function drawGround(theme) {
    const key = theme.grass;
    if (!ground.has(key)) ground.set(key, buildGround(theme));
    const pattern = ctx.createPattern(ground.get(key), 'repeat');
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(layout.x, layout.y, layout.side, layout.side, Math.min(14, layout.cell * 0.6));
    ctx.clip();
    ctx.fillStyle = pattern;
    ctx.fillRect(layout.x, layout.y, layout.side, layout.side);

    // The village itself sits on slightly packed earth.
    ctx.fillStyle = theme.baseTint;
    ctx.fillRect(layout.x + OFFSET * layout.cell, layout.y + OFFSET * layout.cell, GRID * layout.cell, GRID * layout.cell);
    ctx.strokeStyle = 'rgba(20, 40, 12, 0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      const px = layout.x + (OFFSET + i) * layout.cell;
      const py = layout.y + (OFFSET + i) * layout.cell;
      ctx.beginPath();
      ctx.moveTo(px, layout.y + OFFSET * layout.cell);
      ctx.lineTo(px, layout.y + (OFFSET + GRID) * layout.cell);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(layout.x + OFFSET * layout.cell, py);
      ctx.lineTo(layout.x + (OFFSET + GRID) * layout.cell, py);
      ctx.stroke();
    }
    ctx.restore();

    // Soft edge so the battlefield melts into the arcade background.
    const edge = ctx.createLinearGradient(0, layout.y, 0, layout.y + layout.side);
    edge.addColorStop(0, 'rgba(4, 8, 4, 0.22)');
    edge.addColorStop(0.2, 'rgba(4, 8, 4, 0)');
    edge.addColorStop(0.8, 'rgba(4, 8, 4, 0)');
    edge.addColorStop(1, 'rgba(4, 8, 4, 0.3)');
    ctx.fillStyle = edge;
    ctx.fillRect(layout.x, layout.y, layout.side, layout.side);
  }

  function drawZone(theme, battle) {
    if (!battle || battle.preview || battle.phase === 'over') return;
    const remainingTroops = battle.queue.reduce((sum, row) => sum + row.count, 0);
    if (!remainingTroops && battle.phase === 'fight') return;
    const cell = layout.cell;
    const pulse = reducedMotion ? 0.72 : 0.7 + Math.sin(clock * 3.2) * 0.18;
    const innerX = layout.x + OFFSET * cell;
    const innerY = layout.y + OFFSET * cell;
    const innerW = GRID * cell;
    const outerX = layout.x;
    const outerY = layout.y;
    const outerW = layout.side;

    ctx.save();
    ctx.beginPath();
    ctx.rect(outerX, outerY, outerW, outerW);
    ctx.rect(innerX, innerY, innerW, innerW);
    ctx.clip('evenodd');
    ctx.globalAlpha = pulse;
    ctx.fillStyle = theme.zone;
    ctx.fillRect(outerX, outerY, outerW, outerW);
    ctx.strokeStyle = theme.zoneLine;
    ctx.globalAlpha = pulse * 0.5;
    ctx.lineWidth = 1;
    const step = cell * 0.85;
    ctx.beginPath();
    for (let d = -outerW; d < outerW * 2; d += step) {
      ctx.moveTo(outerX + d, outerY);
      ctx.lineTo(outerX + d - outerW, outerY + outerW);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = theme.zoneLine;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([cell * 0.35, cell * 0.3]);
    ctx.lineDashOffset = reducedMotion ? 0 : -clock * 26;
    ctx.strokeRect(innerX, innerY, innerW, innerW);
    ctx.restore();
  }

  function drawShadow(x, y, radius) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHealth(x, y, ratio, w) {
    if (ratio >= 1) return;
    const h = Math.max(2, layout.cell * 0.1);
    const left = x - w / 2;
    ctx.fillStyle = 'rgba(12, 10, 8, 0.72)';
    ctx.fillRect(left - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = ratio > 0.55 ? '#78d64b' : ratio > 0.28 ? '#f2c53d' : '#e5533c';
    ctx.fillRect(left, y, w * Math.max(0, ratio), h);
  }

  function drawDyingBuilding(building, x, y, cell) {
    const p = 1 - Math.max(0, building.dying) / 0.4; // 0 → 1 as it collapses
    const sprite = getSprite(building.type);
    const size = cell * (building.type === 'town_hall' ? 1.52 : 1.4);
    ctx.save();
    ctx.translate(x, y + cell * 0.12 * p);
    ctx.rotate(p * 0.3 * (building.id % 2 ? 1 : -1));
    ctx.globalAlpha = Math.max(0, 1 - p * 0.6);
    ctx.drawImage(sprite, -size / 2, -size * 0.58 - cell * 0.1 * p, size, size);
    ctx.restore();
    if (Math.random() < 0.25) spawnSmoke(x + (Math.random() - 0.5) * size, y - size * 0.4, true);
  }

  function drawBuildings(battle) {
    if (!battle) return;
    const cell = layout.cell;
    const sorted = [...battle.buildings].sort((a, b) => a.cy - b.cy);
    for (const building of sorted) {
      const { x, y } = cellPos(building.cx, building.cy);
      if (!building.alive) {
        if (!building.wall) {
          if (building.dying > 0) {
            drawDyingBuilding(building, x, y, cell);
            continue;
          }
          drawShadow(x, y + cell * 0.16, cell * 0.34);
          const rubble = getSprite('rubble');
          const size = cell * 1.05;
          ctx.drawImage(rubble, x - size / 2, y - size * 0.52, size, size);
        }
        continue;
      }
      drawShadow(x, y + cell * 0.18, cell * 0.36);

      const isWall = building.wall;
      const size = cell * (building.type === 'town_hall' ? 1.52 : 1.4);
      const drawSize = isWall ? cell * 1.02 : size;
      const sprite = getSprite(isWall ? 'wall' : building.type);
      ctx.drawImage(sprite, x - drawSize / 2, y - (isWall ? drawSize * 0.5 : size * 0.58), drawSize, drawSize);

      if (!isWall && building.kind === 'defense' && building.type === 'cannon') {
        const barrel = getSprite('cannonBarrel');
        const scale = size / BUILDING_SIZE;
        const aim = building.aim ?? -Math.PI / 2;
        const recoil = building.flash > 0 ? (building.flash / 0.16) * cell * 0.07 : 0;
        ctx.save();
        ctx.translate(x - Math.cos(aim) * recoil, y - cell * 0.18 - Math.sin(aim) * recoil);
        ctx.rotate(aim);
        ctx.drawImage(barrel, -2 * scale, -barrel.height * scale * 0.5, barrel.width * scale, barrel.height * scale);
        ctx.restore();
      }

      if (building.flash > 0) {
        ctx.globalAlpha = (building.flash / 0.16) * 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - drawSize * 0.5, y - drawSize * 0.6, drawSize, drawSize);
        ctx.globalAlpha = 1;
      }

      const ratio = building.hp / building.maxHp;
      if (ratio < 0.985) {
        // Battle damage: scorch, cracks, then smoke when it gets critical.
        ctx.globalAlpha = (1 - ratio) * 0.34;
        ctx.fillStyle = '#160d06';
        ctx.fillRect(x - drawSize * 0.5, y - drawSize * 0.6, drawSize, drawSize);
        ctx.globalAlpha = 1;
        if (ratio < 0.55) {
          ctx.strokeStyle = 'rgba(24, 14, 6, 0.85)';
          ctx.lineWidth = Math.max(1, cell * 0.045);
          ctx.beginPath();
          ctx.moveTo(x - cell * 0.26, y - cell * 0.5);
          ctx.lineTo(x - cell * 0.12, y - cell * 0.28);
          ctx.lineTo(x - cell * 0.2, y - cell * 0.05);
          ctx.moveTo(x + cell * 0.22, y - cell * 0.48);
          ctx.lineTo(x + cell * 0.3, y - cell * 0.24);
          ctx.lineTo(x + cell * 0.18, y - cell * 0.08);
          ctx.stroke();
        }
        if (!isWall && ratio < 0.5 && Math.random() < 0.06) {
          spawnSmoke(x + (Math.random() - 0.5) * cell * 0.6, y - cell * 0.55);
        }
      }

      if (!isWall && building.type === 'wizard_tower') {
        const pulse = 0.22 + Math.sin(clock * 4 + building.id) * 0.12;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#9be8ff';
        ctx.beginPath();
        ctx.arc(x, y - size * 0.62, cell * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (!isWall && building.type === 'air_defense') {
        const blink = Math.sin(clock * 5 + building.id) > 0.4 ? 0.85 : 0.25;
        ctx.globalAlpha = blink;
        ctx.fillStyle = '#ff5a4a';
        ctx.beginPath();
        ctx.arc(x, y - size * 0.6, cell * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      drawHealth(x, y - cell * 0.62, ratio, cell * 0.92);
    }
  }

  function frameFor(unit) {
    const wingy = unit.air || unit.type === 'wallbreaker';
    return Math.floor(unit.bob * (wingy ? 1.15 : 1.2)) % 2;
  }

  function drawUnits(battle) {
    if (!battle) return;
    const cell = layout.cell;
    const sorted = [...battle.units].sort((a, b) => a.y - b.y);
    for (const unit of sorted) {
      const { x, y } = fieldPos(unit.x, unit.y);
      const dead = unit.hp <= 0;
      const deathLeft = unit.deathT ?? 0.35;
      const lift = unit.air ? cell * 0.72 * (dead ? Math.max(0, deathLeft / 0.35) : 1) : 0;
      const bob = unit.air
        ? Math.sin(unit.bob) * cell * 0.09
        : unit.moving
          ? Math.abs(Math.sin(unit.bob)) * cell * 0.06
          : 0;
      drawShadow(x, y + cell * 0.24, cell * (unit.air ? 0.2 : 0.26));
      let size = cell * (unit.type === 'giant' || unit.type === 'pekka' || unit.type === 'dragon' ? 1.32 : 1.05);
      if (unit.spawn > 0 && !dead) size *= 0.55 + 0.45 * (1 - unit.spawn / 0.3);
      const sprite = getSprite(unit.type, frameFor(unit));
      ctx.save();
      ctx.translate(x, y - lift - bob + (dead ? cell * 0.08 : 0));
      if (dead) {
        const p = 1 - Math.max(0, deathLeft) / 0.35;
        ctx.rotate(p * 1.3 * (unit.id % 2 ? 1 : -1));
        ctx.globalAlpha = Math.max(0, 1 - p * 0.9);
      } else {
        if (unit.atkAnim > 0) {
          const k = Math.sin((1 - unit.atkAnim / 0.14) * Math.PI) * cell * 0.2;
          ctx.translate(unit.atkDir.x * k, unit.atkDir.y * k * 0.6);
        }
        if (!unit.air && unit.moving) ctx.rotate(Math.sin(unit.bob * 2) * 0.05);
        ctx.globalAlpha = unit.spawn > 0 ? Math.min(1, 0.35 + (1 - unit.spawn / 0.3) * 0.65) : 1;
      }
      ctx.drawImage(sprite, -size / 2, -size * 0.82, size, size);
      if (!dead && unit.flash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (unit.flash / 0.14) * 0.55;
        ctx.drawImage(sprite, -size / 2, -size * 0.82, size, size);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
      if (!dead) drawHealth(x, y - lift - bob - size * 0.92, unit.hp / unit.maxHp, cell * 0.5);
    }
  }

  function drawProjectiles(battle) {
    if (!battle) return;
    const cell = layout.cell;
    for (const shot of battle.projectiles) {
      const { x, y } = fieldPos(shot.x, shot.y);
      const total = shot.total || Math.hypot(shot.tx - shot.x, shot.ty - shot.y) || 1;
      const travelled = Math.max(0, 1 - Math.hypot(shot.tx - shot.x, shot.ty - shot.y) / total);
      const arc = shot.arc ? Math.sin(Math.min(1, travelled) * Math.PI) * shot.arc * cell : 0;
      const sy = y - arc;
      if (shot.arc) drawShadow(x, y, cell * 0.12);
      if (shot.kind === 'shell' && Math.random() < 0.5) {
        spawnSmoke(shot.x, shot.y - arc / cell);
      } else if (shot.kind === 'rocket' && Math.random() < 0.7) {
        particles.push({
          x: shot.x,
          y: shot.y,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.2,
          g: 0,
          life: 0.25,
          max: 0.25,
          size: 1.6,
          color: Math.random() < 0.5 ? '#ff8a3d' : '#ffd15a',
          glow: true,
          alpha: 0.9,
        });
      } else if (shot.kind === 'bolt' && Math.random() < 0.4) {
        particles.push({
          x: shot.x,
          y: shot.y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          g: 0,
          life: 0.2,
          max: 0.2,
          size: 1.2,
          color: '#d79bff',
          glow: true,
          alpha: 0.8,
        });
      }
      if (shot.kind === 'arrow' || shot.kind === 'rocket') {
        const angle = Math.atan2(shot.ty - shot.y, shot.tx - shot.x);
        ctx.save();
        ctx.translate(x, sy);
        ctx.rotate(angle);
        if (shot.kind === 'arrow') {
          ctx.fillStyle = '#f3e6c6';
          ctx.fillRect(-cell * 0.18, -1, cell * 0.36, 2);
          ctx.fillStyle = '#d8c8a8';
          ctx.fillRect(cell * 0.12, -2, 4, 4);
        } else {
          ctx.fillStyle = '#c9cfd3';
          ctx.fillRect(-cell * 0.22, -2, cell * 0.36, 4);
          ctx.fillStyle = '#e5533c';
          ctx.fillRect(cell * 0.1, -2, 4, 4);
          ctx.fillStyle = '#ffd15a';
          ctx.fillRect(-cell * 0.34, -1, 5, 2);
        }
        ctx.restore();
        continue;
      }
      if (shot.kind === 'shell') {
        ctx.fillStyle = '#3a3630';
        ctx.beginPath();
        ctx.arc(x, sy, cell * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a8170';
        ctx.beginPath();
        ctx.arc(x - 1, sy - 1, cell * 0.06, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      if (shot.kind === 'bolt') {
        ctx.fillStyle = 'rgba(183, 110, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(x, sy, cell * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d79bff';
        ctx.beginPath();
        ctx.arc(x, sy, cell * 0.1, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      // cannonball
      ctx.fillStyle = '#2c2a26';
      ctx.beginPath();
      ctx.arc(x, sy, cell * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9aa0a4';
      ctx.beginPath();
      ctx.arc(x - 1, sy - 1, cell * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.sway) p.x += Math.sin(p.life * 2.5 + (p.seed || 0)) * dt * 0.5;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
    for (const ring of rings) {
      ring.life -= dt;
      ring.r += ring.vr * dt;
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      if (rings[i].life <= 0) rings.splice(i, 1);
    }
    for (const stroke of strokes) stroke.life -= dt;
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (strokes[i].life <= 0) strokes.splice(i, 1);
    }
  }

  function drawParticles() {
    const cell = layout.cell;
    for (const p of particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = Math.min(1, a * 1.4) * (p.alpha ?? 1);
      ctx.fillStyle = p.color;
      const px = fieldSX(p.x);
      const py = fieldSY(p.y);
      const size = Math.max(1, p.size * (cell / 24));
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    for (const ring of rings) {
      const a = Math.max(0, ring.life / ring.max);
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.w;
      ctx.beginPath();
      ctx.arc(fieldSX(ring.x), fieldSY(ring.y), ring.r * cell, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const stroke of strokes) {
      const a = Math.max(0, stroke.life / stroke.max);
      ctx.globalAlpha = a;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.w;
      ctx.beginPath();
      ctx.moveTo(fieldSX(stroke.x1), fieldSY(stroke.y1));
      ctx.lineTo(fieldSX(stroke.x2), fieldSY(stroke.y2));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function fieldSX(x) {
    return layout.x + x * layout.cell;
  }

  function fieldSY(y) {
    return layout.y + y * layout.cell;
  }

  function drawCursor(battle, pointer) {
    if (!battle || battle.preview || battle.phase === 'over' || !pointer?.active) return;
    const { x, y } = pointer;
    const cell = layout.cell;
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    const px = layout.x + (cx + 0.5) * cell;
    const py = layout.y + (cy + 0.5) * cell;
    const valid = isDeployable(battle, x, y);
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = valid ? 'rgba(130, 255, 120, 0.18)' : 'rgba(255, 90, 70, 0.16)';
    ctx.strokeStyle = valid ? 'rgba(180, 255, 140, 0.9)' : 'rgba(255, 110, 90, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px - cell * 0.42, py - cell * 0.42, cell * 0.84, cell * 0.84, 4);
    ctx.fill();
    ctx.stroke();
    if (valid && battle.selected) {
      const sprite = getSprite(battle.selected);
      const size = cell * 1.1;
      ctx.globalAlpha = 0.66;
      ctx.drawImage(sprite, px - size / 2, py - size * 0.86, size, size);
    }
    ctx.restore();
  }

  function draw({ battle, theme = THEMES.grass, themeKey = 'grass', mode = 'battle', pointer = null, dim = 0 }) {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;

    if (battle) consumeFx(battle);
    updateParticles(dt);
    if (!reducedMotion) {
      ambientT -= dt;
      if (ambientT <= 0) {
        ambientT = 0.16;
        spawnAmbient(themeKey);
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);

    // Backdrop: dark arcade night with a green horizon.
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#080d07');
    bg.addColorStop(0.55, '#0b1209');
    bg.addColorStop(1, '#0e1a0b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const shake = reducedMotion ? 0 : battle?.shake ?? 0;
    shakeX = shake ? Math.sin(clock * 73) * shake * 5 : 0;
    shakeY = shake ? Math.cos(clock * 61) * shake * 4 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawGround(theme);
    drawZone(theme, battle);
    drawBuildings(battle);
    drawUnits(battle);
    drawProjectiles(battle);
    drawParticles();
    drawCursor(battle, pointer);

    ctx.restore();

    if (dim > 0) {
      ctx.fillStyle = `rgba(4, 7, 4, ${dim})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  return {
    canvas,
    resize,
    toField,
    draw,
    dispose() {
      canvas.remove();
      particles.length = 0;
      rings.length = 0;
      strokes.length = 0;
      ground.clear();
    },
  };
}
