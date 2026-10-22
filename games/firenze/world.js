/**
 * FIRENZE: LAST LIGHT — a historical Florence diorama.
 * Builds Florence from primitives, draws instanced units, and owns pad/zoom input.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CITY_NODES, ZONES } from './levels.js';

// A restrained Renaissance palette: travertine, terracotta, olive, gilt.
const GOLD = 0xd8b36a;
const TERRACOTTA = 0xa9573c;
const OLIVE = 0x7d8a54;
const AMBER = 0xd9a441;
const IRON = 0x7c8791;
const CYAN = GOLD;
const MAGENTA = TERRACOTTA;
const LIME = OLIVE;
const VIOLET = 0x8a7b63;
const ZOMBIE_COLORS = [0x9aa35f, 0xb2b678, 0x7d8a4f, 0xc3c08a, 0x8f9a55];

function canvasTexture(draw, width = 1024, height = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function hexToRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => v / 255);
}

function makeUnitGeometry(mounted) {
  const parts = [];
  const body = new THREE.BoxGeometry(mounted ? 0.32 : 0.24, mounted ? 0.46 : 0.4, mounted ? 0.22 : 0.18);
  body.translate(0, mounted ? 0.38 : 0.34, 0);
  const head = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  head.translate(0, mounted ? 0.7 : 0.62, 0);
  const arms = new THREE.BoxGeometry(mounted ? 0.56 : 0.48, 0.07, 0.07);
  arms.translate(0, mounted ? 0.48 : 0.42, 0.1);
  parts.push(body, head, arms);
  if (mounted) {
    const blade = new THREE.BoxGeometry(0.05, 0.52, 0.05);
    blade.rotateZ(-0.42);
    blade.translate(0.23, 0.58, 0.1);
    const shield = new THREE.BoxGeometry(0.06, 0.3, 0.26);
    shield.translate(-0.2, 0.4, 0.06);
    parts.push(blade, shield);
  }
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged;
}

function makeTroopGeometry(type) {
  const parts = [];
  const body = new THREE.BoxGeometry(type === 'knight' ? 0.3 : 0.24, 0.42, type === 'knight' ? 0.22 : 0.18);
  body.translate(0, 0.36, 0);
  const head = new THREE.BoxGeometry(0.17, 0.17, 0.17);
  head.translate(0, 0.67, 0);
  const arms = new THREE.BoxGeometry(0.5, 0.07, 0.07);
  arms.translate(0, 0.44, 0.1);
  parts.push(body, head, arms);
  if (type === 'levy') {
    const spear = new THREE.BoxGeometry(0.035, 0.95, 0.035);
    spear.translate(0.26, 0.48, 0.08);
    const shield = new THREE.BoxGeometry(0.05, 0.28, 0.24);
    shield.translate(-0.17, 0.39, 0.06);
    parts.push(spear, shield);
  } else if (type === 'crossbow') {
    const stock = new THREE.BoxGeometry(0.62, 0.045, 0.05);
    stock.translate(0.18, 0.46, 0.16);
    const bow = new THREE.BoxGeometry(0.04, 0.34, 0.04);
    bow.translate(0.49, 0.46, 0.16);
    parts.push(stock, bow);
  } else {
    const lance = new THREE.BoxGeometry(0.04, 1.05, 0.04);
    lance.rotateZ(-0.28);
    lance.translate(0.28, 0.55, 0.08);
    const shield = new THREE.BoxGeometry(0.06, 0.32, 0.28);
    shield.translate(-0.2, 0.4, 0.06);
    const plume = new THREE.BoxGeometry(0.07, 0.22, 0.05);
    plume.translate(0, 0.88, 0);
    parts.push(lance, shield, plume);
  }
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged;
}

export function createWorld({ stage, onTap }) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.style.touchAction = 'none';
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x18130e, 0.0115);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 240);

  /* -------------------------------- materials ------------------------------- */

  const M = {
    stone: new THREE.MeshStandardMaterial({ color: 0xa99b83, roughness: 0.9, metalness: 0.04 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x655a48, roughness: 0.95, metalness: 0.03 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xd2c1a1, roughness: 0.92, metalness: 0.02 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x9b4a35, roughness: 0.86, metalness: 0.03 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5c4933, roughness: 0.97, metalness: 0 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1c1812, roughness: 1, metalness: 0 }),
    water: new THREE.MeshBasicMaterial({ color: 0x3f5b60, transparent: true, opacity: 0.55 }),
    ember: new THREE.MeshBasicMaterial({ color: 0x5a3b24 }),
    cyan: new THREE.MeshStandardMaterial({ color: 0x3a3021, emissive: GOLD, emissiveIntensity: 0.55, roughness: 0.55 }),
    magenta: new THREE.MeshStandardMaterial({
      color: 0x3a1e17,
      emissive: TERRACOTTA,
      emissiveIntensity: 0.45,
      roughness: 0.62,
    }),
    lime: new THREE.MeshStandardMaterial({ color: 0x2c3120, emissive: OLIVE, emissiveIntensity: 0.42, roughness: 0.6 }),
    amber: new THREE.MeshStandardMaterial({ color: 0x3d2f18, emissive: AMBER, emissiveIntensity: 0.55, roughness: 0.55 }),
    violet: new THREE.MeshStandardMaterial({ color: 0x322b23, emissive: VIOLET, emissiveIntensity: 0.32, roughness: 0.6 }),
    window: new THREE.MeshStandardMaterial({ color: 0x241b12, emissive: 0xffc27a, emissiveIntensity: 0.8, roughness: 0.4 }),
    windowWarm: new THREE.MeshStandardMaterial({ color: 0x2b1d10, emissive: 0xffa94d, emissiveIntensity: 0.9, roughness: 0.4 }),
    zombie: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x20250c,
      emissiveIntensity: 0.22,
      roughness: 0.88,
      metalness: 0.02,
    }),
    militia: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x17130d,
      emissiveIntensity: 0.16,
      roughness: 0.7,
      metalness: 0.18,
    }),
    ruin: new THREE.MeshStandardMaterial({ color: 0x6b5d4b, roughness: 0.98, metalness: 0 }),
    rubble: new THREE.MeshStandardMaterial({ color: 0x7a6a55, roughness: 0.98, metalness: 0 }),
    banner: new THREE.MeshStandardMaterial({
      color: 0x5b2118,
      emissive: TERRACOTTA,
      emissiveIntensity: 0.28,
      side: THREE.DoubleSide,
      roughness: 0.8,
    }),
    bannerCyan: new THREE.MeshStandardMaterial({
      color: 0x3d321e,
      emissive: GOLD,
      emissiveIntensity: 0.24,
      side: THREE.DoubleSide,
      roughness: 0.8,
    }),
  };

  const lineMats = {
    cyan: new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.42 }),
    magenta: new THREE.LineBasicMaterial({ color: TERRACOTTA, transparent: true, opacity: 0.42 }),
    lime: new THREE.LineBasicMaterial({ color: OLIVE, transparent: true, opacity: 0.38 }),
    amber: new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.36 }),
    violet: new THREE.LineBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.32 }),
    ruin: new THREE.LineBasicMaterial({ color: 0xa89475, transparent: true, opacity: 0.26 }),
  };

  for (const material of Object.values(M)) material.userData.shared = true;
  for (const material of Object.values(lineMats)) material.userData.shared = true;

  /* ---------------------------------- scene --------------------------------- */

  const levelRoot = new THREE.Group();
  scene.add(levelRoot);
  let level = null;
  let bounds = { minX: -10, maxX: 10, minZ: -12, maxZ: 10 };
  let groundPlane = null;
  let groundTexture = null;
  let waterMesh = null;
  let waterTexture = null;
  let hitRoot = null;
  let hitMeshes = [];
  const visuals = new Map();
  const nestVisuals = new Map();
  const zoneVisuals = new Map();
  let unitMeshes = null;
  let bossVisual = null;
  let bossLight = null;
  let selected = { type: null, id: null };
  let viewW = 390;
  let viewH = 844;
  let shake = 0;
  let selectedPulse = 0;

  /* ------------------------------- camera rig ------------------------------- */

  const rig = {
    target: new THREE.Vector3(0, 0, 1),
    dist: 46,
    az: Math.PI * 0.23,
    pol: 0.9,
    min: 24,
    max: 90,
  };
  let fitDist = 46;
  let userZoomed = false;

  function defaultDist() {
    const portrait = viewH >= viewW;
    return fitDist * (portrait ? 0.66 : 0.82);
  }

  function computeFit() {
    const w = bounds.maxX - bounds.minX + 7;
    const d = bounds.maxZ - bounds.minZ + 7;
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const aspect = viewW / Math.max(viewH, 1);
    const byWidth = w / (2 * tan * aspect);
    const byDepth = d / (2 * tan);
    fitDist = Math.max(byWidth, byDepth) * 1.04;
    rig.min = Math.max(16, fitDist * 0.3);
    rig.max = fitDist * 1.22;
    if (!userZoomed) rig.dist = defaultDist();
    rig.dist = THREE.MathUtils.clamp(rig.dist, rig.min, rig.max);
  }

  function applyCamera(dt) {
    selectedPulse += dt;
    const cx = Math.sin(rig.az) * Math.cos(rig.pol) * rig.dist;
    const cy = Math.sin(rig.pol) * rig.dist;
    const cz = Math.cos(rig.az) * Math.cos(rig.pol) * rig.dist;
    camera.position.set(rig.target.x + cx, rig.target.y + cy, rig.target.z + cz);
    camera.lookAt(rig.target.x, 0, rig.target.z);
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake * 0.5;
      camera.position.z += (Math.random() - 0.5) * shake * 0.5;
      shake = Math.max(0, shake - dt * 2.6);
    }
  }

  function clampTarget() {
    const pad = 2.5;
    rig.target.x = THREE.MathUtils.clamp(
      rig.target.x,
      bounds.minX - pad,
      bounds.maxX + pad,
    );
    rig.target.z = THREE.MathUtils.clamp(
      rig.target.z,
      bounds.minZ - pad,
      bounds.maxZ + pad,
    );
  }

  /* --------------------------------- effects -------------------------------- */

  const effectsRoot = new THREE.Group();
  scene.add(effectsRoot);

  const glowTex = canvasTexture(
    (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.65)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    64,
    64,
  );
  glowTex.colorSpace = THREE.NoColorSpace;

  const P_MAX = 160;
  const pPositions = new Float32Array(P_MAX * 3);
  const pColors = new Float32Array(P_MAX * 3);
  const particles = Array.from({ length: P_MAX }, () => ({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1 }));
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
  const particlePoints = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({
      size: 0.34,
      map: glowTex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  particlePoints.frustumCulled = false;
  effectsRoot.add(particlePoints);

  function burst(x, z, color, count = 8, power = 2.2, y = 0.8) {
    const [r, g, b] = hexToRgb(color);
    let made = 0;
    for (let i = 0; i < P_MAX && made < count; i++) {
      const p = particles[i];
      if (p.life > 0) continue;
      p.life = 0.55 + Math.random() * 0.7;
      p.max = p.life;
      p.r = r;
      p.g = g;
      p.b = b;
      pPositions[i * 3] = x + (Math.random() - 0.5) * 0.5;
      pPositions[i * 3 + 1] = y + Math.random() * 0.5;
      pPositions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.5;
      p.vx = (Math.random() - 0.5) * power;
      p.vy = 0.6 + Math.random() * power;
      p.vz = (Math.random() - 0.5) * power;
      made += 1;
    }
  }

  const RING_MAX = 12;
  const rings = Array.from({ length: RING_MAX }, () => {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    effectsRoot.add(mesh);
    return { mesh, life: 0, max: 1, grow: 4 };
  });

  function ringEffect(x, z, color, grow = 4, duration = 0.65) {
    const slot = rings.find((r) => r.life <= 0) || rings[0];
    slot.mesh.position.set(x, 0.07, z);
    slot.mesh.material.color.setHex(color);
    slot.mesh.visible = true;
    slot.life = duration;
    slot.max = duration;
    slot.grow = grow;
  }

  function updateRings(dt) {
    for (const slot of rings) {
      if (slot.life <= 0) continue;
      slot.life -= dt;
      const t = 1 - Math.max(0, slot.life) / slot.max;
      const scale = 1 + t * slot.grow;
      slot.mesh.scale.setScalar(scale);
      slot.mesh.material.opacity = Math.max(0, 0.9 * (1 - t));
      if (slot.life <= 0) slot.mesh.visible = false;
    }
  }

  const TRACER_MAX = 32;
  const tracerPositions = new Float32Array(TRACER_MAX * 6);
  const tracerColors = new Float32Array(TRACER_MAX * 6);
  const tracers = Array.from({ length: TRACER_MAX }, () => ({ life: 0, max: 0.13 }));
  const tracerGeo = new THREE.BufferGeometry();
  tracerGeo.setAttribute('position', new THREE.BufferAttribute(tracerPositions, 3));
  tracerGeo.setAttribute('color', new THREE.BufferAttribute(tracerColors, 3));
  const tracerLines = new THREE.LineSegments(
    tracerGeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  tracerLines.frustumCulled = false;
  effectsRoot.add(tracerLines);

  function shot(from, to, color = CYAN) {
    const slot = tracers.find((t) => t.life <= 0) || tracers[0];
    const index = tracers.indexOf(slot);
    slot.life = 0.13;
    const fy = from.isCore ? 2 : from.kind === 'tower' ? 3.2 : 0.9;
    const ty = to.boss ? 1.8 : 0.8;
    tracerPositions.set([from.x, fy, from.z, to.x, ty, to.z], index * 6);
    const [r, g, b] = hexToRgb(color);
    tracerColors.set([r, g, b, r, g, b], index * 6);
    tracerGeo.attributes.position.needsUpdate = true;
    tracerGeo.attributes.color.needsUpdate = true;
  }

  function updateTracers(dt) {
    let dirty = false;
    for (let i = 0; i < TRACER_MAX; i++) {
      const slot = tracers[i];
      if (slot.life <= 0) continue;
      slot.life -= dt;
      const alpha = Math.max(0, slot.life / slot.max);
      for (let v = 0; v < 2; v++) {
        tracerColors[(i * 2 + v) * 3] *= 0.86;
        tracerColors[(i * 2 + v) * 3 + 1] *= 0.86;
        tracerColors[(i * 2 + v) * 3 + 2] *= 0.86;
      }
      if (slot.life <= 0) {
        tracerPositions.fill(0, i * 6, i * 6 + 6);
        tracerColors.fill(0, i * 6, i * 6 + 6);
      }
      dirty = dirty || alpha < 1;
    }
    if (dirty) {
      tracerGeo.attributes.position.needsUpdate = true;
      tracerGeo.attributes.color.needsUpdate = true;
    }
  }

  /* ------------------------------- ground art ------------------------------- */

  function drawGround(ctx, S) {
    const b = bounds;
    const W = b.maxX - b.minX + 7;
    const D = b.maxZ - b.minZ + 7;
    const ux = S / W;
    const vz = S / D;
    const u = (x) => (x - b.minX + 3.5) * ux;
    const v = (z) => (z - b.minZ + 3.5) * vz;
    let seed = (level.seed || 1) * 1000;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed & 0xffff) / 65535;
    };

    ctx.fillStyle = '#3a3329';
    ctx.fillRect(0, 0, S, S);

    // A dense medieval fabric of stone and plaster blocks.
    for (let x = b.minX - 3; x < b.maxX + 3; x += 2.55) {
      for (let z = b.minZ - 3; z < b.maxZ + 3; z += 2.55) {
        const w = 1.95 * ux;
        const h = 1.95 * vz;
        const shade = 48 + Math.floor(rnd() * 24);
        ctx.fillStyle = `rgb(${shade + 18},${shade + 10},${shade - 2})`;
        ctx.fillRect(u(x) + (rnd() - 0.5) * 5, v(z) + (rnd() - 0.5) * 5, w, h);
        ctx.strokeStyle = 'rgba(199,177,134,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(u(x) + (rnd() - 0.5) * 5, v(z) + (rnd() - 0.5) * 5, w, h);
      }
    }

    // Cobbled streets.
    ctx.fillStyle = '#786a55';
    ctx.fillRect(u(0) - 1.15 * ux, 0, 2.3 * ux, S);
    ctx.fillRect(0, v(-2.2) - 0.9 * vz, S, 1.8 * vz);
    ctx.strokeStyle = 'rgba(43,35,26,0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i < S; i += 12) {
      ctx.beginPath();
      ctx.moveTo(u(0) - 1.1 * ux, i);
      ctx.lineTo(u(0) + 1.1 * ux, i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, v(-2.2) - 0.86 * vz);
      ctx.lineTo(i, v(-2.2) + 0.86 * vz);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(218,194,148,0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(u(0) - 1.15 * ux, 0, 2.3 * ux, S);
    ctx.strokeRect(0, v(-2.2) - 0.9 * vz, S, 1.8 * vz);

    // Travertine piazza around the palazzo.
    const core = level.coreCenter;
    ctx.beginPath();
    ctx.ellipse(u(core.x), v(core.z), 5.8 * ux, 5.8 * vz, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#9e9077';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(216,179,106,0.5)';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(u(core.x), v(core.z), 4.2 * ux, 4.2 * vz, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(169,87,60,0.36)';
    ctx.stroke();
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(u(core.x) + Math.cos(a) * 4.3 * ux, v(core.z) + Math.sin(a) * 4.3 * vz);
      ctx.lineTo(u(core.x) + Math.cos(a) * 5.7 * ux, v(core.z) + Math.sin(a) * 5.7 * vz);
      ctx.strokeStyle = 'rgba(70,58,42,0.18)';
      ctx.stroke();
    }

    // A low wall around the city edge.
    ctx.strokeStyle = 'rgba(93,78,57,0.9)';
    ctx.lineWidth = 8;
    ctx.strokeRect(u(b.minX) - 8, v(b.minZ) - 8, u(b.maxX) - u(b.minX) + 16, v(b.maxZ) - v(b.minZ) + 16);
    ctx.strokeStyle = 'rgba(216,179,106,0.22)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(u(b.minX) - 8, v(b.minZ) - 8, u(b.maxX) - u(b.minX) + 16, v(b.maxZ) - v(b.minZ) + 16);

    // River, when a scenario uses one.
    if (level.river) {
      const top = v(level.river.z - level.river.depth / 2);
      const height = level.river.depth * vz;
      ctx.fillStyle = '#3c5558';
      ctx.fillRect(0, top, S, height);
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = `rgba(216,220,198,${0.03 + rnd() * 0.07})`;
        ctx.fillRect(rnd() * S, top + rnd() * height, 6 + rnd() * 42, 1);
      }
      ctx.strokeStyle = 'rgba(216,179,106,0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, top, S, height);
    }

    // Sickly ground around the infected nests.
    for (const nest of level.nests) {
      const grad = ctx.createRadialGradient(u(nest.x), v(nest.z), 0, u(nest.x), v(nest.z), 3 * ux);
      grad.addColorStop(0, 'rgba(125,138,84,0.3)');
      grad.addColorStop(0.6, 'rgba(91,76,48,0.16)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(u(nest.x), v(nest.z), 3 * ux, 3 * vz, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Worn stone, straw and rubble.
    for (let i = 0; i < 460; i++) {
      ctx.fillStyle = `rgba(${120 + rnd() * 60},${105 + rnd() * 50},${82 + rnd() * 45},${0.05 + rnd() * 0.14})`;
      const size = 1 + rnd() * 4;
      ctx.fillRect(rnd() * S, rnd() * S, size, size);
    }
    for (let i = 0; i < 20; i++) {
      const x = b.minX + rnd() * (b.maxX - b.minX);
      const z = b.minZ + rnd() * (b.maxZ - b.minZ);
      ctx.fillStyle = 'rgba(255,196,112,0.34)';
      ctx.beginPath();
      ctx.arc(u(x), v(z), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const vig = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.74);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(14,10,7,0.66)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, S, S);
  }

  function buildGround() {
    const W = bounds.maxX - bounds.minX + 7;
    const D = bounds.maxZ - bounds.minZ + 7;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;

    groundTexture = canvasTexture((ctx, S) => drawGround(ctx, S), 1024, 1024);
    groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 0.94, metalness: 0.06 }),
    );
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.set(cx, 0, cz);
    levelRoot.add(groundPlane);

    const base = new THREE.Mesh(new THREE.BoxGeometry(W, 1.4, D), M.stoneDark);
    base.position.set(cx, -0.7, cz);
    levelRoot.add(base);
    const rim = new THREE.LineSegments(
      new THREE.EdgesGeometry(base.geometry),
      new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.22 }),
    );
    rim.position.copy(base.position);
    levelRoot.add(rim);

    if (level.river) {
      waterTexture = canvasTexture(
        (ctx, w, h) => {
          ctx.fillStyle = '#344b4e';
          ctx.fillRect(0, 0, w, h);
          for (let i = 0; i < 26; i++) {
            ctx.fillStyle = `rgba(226,216,184,${0.04 + Math.random() * 0.08})`;
            ctx.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 1.4);
          }
        },
        256,
        128,
      );
      waterTexture.wrapS = THREE.RepeatWrapping;
      waterTexture.wrapT = THREE.RepeatWrapping;
      waterTexture.repeat.set(5, 1);
      waterMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(W - 1, level.river.depth),
        new THREE.MeshBasicMaterial({
          map: waterTexture,
          transparent: true,
          opacity: 0.62,
          depthWrite: false,
        }),
      );
      waterMesh.rotation.x = -Math.PI / 2;
      waterMesh.position.set(cx, 0.045, level.river.z);
      levelRoot.add(waterMesh);
    }
  }

  /* ------------------------------- landmarks -------------------------------- */

  function addBox(parent, w, h, d, mat, x = 0, y = 0, z = 0, rotY = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.rotation.y = rotY;
    parent.add(mesh);
    return mesh;
  }

  function trim(mesh, color = 'cyan') {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 32), lineMats[color]);
    mesh.add(edges);
    return edges;
  }

  function addBanner(parent, x, y, z, color = 'magenta', w = 0.6, h = 0.9) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      color === 'cyan' ? M.bannerCyan : M.banner,
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function buildHouse() {
    const g = new THREE.Group();
    const body = addBox(g, 1.9, 1.45, 1.9, M.plaster, 0, 0.05, 0);
    trim(body, 'magenta');
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.52, 0.85, 4), M.roof);
    roof.position.y = 1.92;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    trim(roof, 'cyan');
    for (const x of [-0.44, 0.44]) {
      addBox(g, 0.3, 0.34, 0.05, M.window, x, 0.95, 0.96);
      addBox(g, 0.05, 0.34, 0.3, M.windowWarm, 0.96, 0.95, x);
    }
    addBox(g, 0.42, 0.62, 0.06, M.dark, 0, 0.02, 0.97);
    addBox(g, 2.05, 0.08, 2.05, M.roof, 0, 1.45, 0);
    return { group: g, height: 2.8 };
  }

  function buildFarm() {
    const g = new THREE.Group();
    addBox(g, 2.3, 0.12, 2.3, M.wood, 0, 0, 0);
    for (let i = 0; i < 5; i++) {
      const row = addBox(g, 1.9, 0.07, 0.14, M.lime, 0, 0.14, -0.8 + i * 0.4);
      row.material = M.lime;
    }
    for (const [x, z] of [
      [-1.05, -1.05],
      [1.05, -1.05],
      [-1.05, 1.05],
      [1.05, 1.05],
      [0, 1.05],
      [0, -1.05],
    ]) {
      addBox(g, 0.08, 0.55, 0.08, M.wood, x, 0, z);
    }
    const scare = addBox(g, 0.1, 1, 0.1, M.wood, -0.7, 0.2, 0.5);
    addBox(g, 0.55, 0.08, 0.08, M.amber, -0.7, 0.95, 0.5);
    trim(scare, 'amber');
    return { group: g, height: 1.1 };
  }

  function buildQuarry() {
    const g = new THREE.Group();
    const pit = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 0.55, 12), M.dark);
    pit.position.y = 0.2;
    g.add(pit);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.05, 6, 28),
      M.violet,
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.48;
    g.add(rim);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const block = addBox(
        g,
        0.45 + (i % 3) * 0.18,
        0.35 + (i % 2) * 0.35,
        0.45,
        M.stone,
        Math.cos(a) * 1.55,
        0.02,
        Math.sin(a) * 1.55,
        a,
      );
      trim(block, i % 2 ? 'violet' : 'cyan');
    }
    const pole = addBox(g, 0.09, 2.1, 0.09, M.wood, 0.95, 0.1, -0.6);
    trim(pole, 'amber');
    const arm = addBox(g, 1.4, 0.08, 0.08, M.wood, 0.35, 2.1, -0.6);
    trim(arm, 'amber');
    return { group: g, height: 2.4 };
  }

  function buildFurnace() {
    const g = new THREE.Group();
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 1.55, 10), M.stone);
    tank.position.y = 0.8;
    g.add(tank);
    trim(tank, 'amber');
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.76, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.stoneDark);
    dome.position.y = 1.57;
    g.add(dome);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 8), M.stone);
    pipe.position.set(-0.38, 2.45, 0);
    g.add(pipe);
    trim(pipe, 'amber');
    for (const y of [0.55, 1.05]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.045, 6, 24), M.lime);
      band.rotation.x = -Math.PI / 2;
      band.position.y = y;
      g.add(band);
    }
    addBox(g, 0.42, 0.44, 0.06, M.amber, 0, 0.25, 0.88);
    return { group: g, height: 3.2 };
  }

  function buildClinic() {
    const g = new THREE.Group();
    const body = addBox(g, 1.9, 1.45, 1.7, M.plaster, 0, 0.05, 0);
    trim(body, 'lime');
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.7, 4), M.roof);
    roof.position.y = 1.9;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    trim(roof, 'lime');
    addBox(g, 0.55, 0.16, 0.08, M.lime, 0, 1.05, 0.87);
    addBox(g, 0.16, 0.55, 0.08, M.lime, 0, 0.86, 0.87);
    addBox(g, 0.4, 0.55, 0.06, M.dark, -0.6, 0.02, 0.87);
    addBox(g, 0.3, 0.3, 0.05, M.window, 0.55, 1.15, 0.87);
    addBox(g, 1.1, 0.9, 1.2, M.stone, 1.35, 0.02, -0.2);
    return { group: g, height: 2.5 };
  }

  function buildBarracks() {
    const g = new THREE.Group();
    const body = addBox(g, 2.7, 1.15, 1.5, M.stone, 0, 0.04, 0);
    trim(body, 'magenta');
    addBox(g, 2.9, 0.12, 1.65, M.roof, 0, 1.19, 0);
    for (let i = 0; i < 5; i++) addBox(g, 0.22, 0.26, 0.22, M.stoneDark, -1.2 + i * 0.6, 1.3, 0.65);
    addBanner(g, -0.95, 1.7, 0.15, 'magenta', 0.5, 0.8);
    addBanner(g, 0.95, 1.7, 0.15, 'cyan', 0.5, 0.8);
    for (let i = 0; i < 3; i++) {
      addBox(g, 0.05, 0.7, 0.05, M.wood, -0.4 + i * 0.4, 0.1, 0.95, 0.2);
      addBox(g, 0.06, 0.42, 0.06, M.cyan, -0.36 + i * 0.4, 0.42, 0.95, 0.2);
    }
    addBox(g, 0.45, 0.6, 0.06, M.dark, 0, 0.02, 0.76);
    return { group: g, height: 2.1 };
  }

  function buildMarket() {
    const g = new THREE.Group();
    addBox(g, 2.6, 0.1, 2.1, M.wood, 0, 0, 0);
    const colors = ['cyan', 'magenta', 'amber'];
    for (let i = 0; i < 3; i++) {
      const x = -0.8 + i * 0.8;
      for (const dx of [-0.32, 0.32]) {
        for (const dz of [-0.38, 0.38]) {
          addBox(g, 0.06, 1.05, 0.06, M.wood, x + dx, 0.03, dz);
        }
      }
      addBox(g, 0.9, 0.07, 0.95, M[colors[i]], x, 1.08, 0);
      addBox(g, 0.65, 0.1, 0.5, M.stoneDark, x, 0.13, 0);
      addBox(g, 0.24, 0.2, 0.24, M.amber, x - 0.2, 0.22, 0.2);
      addBox(g, 0.2, 0.16, 0.2, M.cyan, x + 0.22, 0.22, 0.14);
    }
    return { group: g, height: 1.6 };
  }

  function buildWorkshop() {
    const g = new THREE.Group();
    const body = addBox(g, 1.9, 1.4, 1.7, M.stone, 0, 0.04, 0);
    trim(body, 'amber');
    addBox(g, 1.95, 0.5, 1.75, M.roof, 0, 1.44, 0);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.1, 8), M.stoneDark);
    chimney.position.set(-0.55, 2.2, -0.3);
    g.add(chimney);
    trim(chimney, 'amber');
    addBox(g, 0.35, 0.45, 0.07, M.amber, 0, 0.3, 0.87);
    addBox(g, 0.28, 0.28, 0.05, M.windowWarm, 0.55, 1.0, 0.87);
    addBox(g, 0.8, 0.35, 0.7, M.stoneDark, -0.6, 0.02, 1.05);
    trim(addBox(g, 0.5, 0.1, 0.3, M.cyan, -0.6, 0.4, 1.05), 'cyan');
    return { group: g, height: 2.9 };
  }

  function buildTower() {
    const g = new THREE.Group();
    const body = addBox(g, 1.05, 2.8, 1.05, M.stone, 0, 0, 0);
    trim(body, 'cyan');
    addBox(g, 1.25, 0.18, 1.25, M.stoneDark, 0, 2.78, 0);
    for (const [x, z] of [
      [-0.48, -0.48],
      [0.48, -0.48],
      [-0.48, 0.48],
      [0.48, 0.48],
    ]) {
      addBox(g, 0.22, 0.38, 0.22, M.stone, x, 2.95, z);
    }
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), M.lime);
    beacon.position.y = 3.35;
    g.add(beacon);
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 5, 18), M.cyan);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 3.3;
    g.add(ringMesh);
    return { group: g, height: 3.8 };
  }

  function buildPorta() {
    const g = new THREE.Group();
    for (const x of [-1.35, 1.35]) {
      const tower = addBox(g, 1.15, 3.5, 1.15, M.stone, x, 0, 0);
      trim(tower, 'cyan');
      for (const [dx, dz] of [
        [-0.42, -0.42],
        [0.42, -0.42],
        [-0.42, 0.42],
        [0.42, 0.42],
      ]) {
        addBox(g, 0.24, 0.42, 0.24, M.stone, x + dx, 3.5, dz);
      }
    }
    const span = addBox(g, 2.8, 0.75, 1.0, M.stone, 0, 2.5, 0);
    trim(span, 'magenta');
    addBox(g, 1.5, 1.8, 0.2, M.dark, 0, 0.02, 0.05);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 6, 22, Math.PI), M.cyan);
    arch.position.set(0, 1.85, 0.56);
    g.add(arch);
    addBanner(g, 0, 2.95, 0.5, 'magenta', 1.1, 0.55);
    addBox(g, 0.22, 0.5, 0.06, M.lime, 0, 2.05, 0.6);
    return { group: g, height: 4.2 };
  }

  function buildBridge() {
    const g = new THREE.Group();
    const deck = addBox(g, 2.5, 0.3, 4.8, M.stone, 0, 0.72, 0);
    trim(deck, 'magenta');
    for (const x of [-1.2, 1.2]) addBox(g, 0.14, 0.5, 4.8, M.stoneDark, x, 1.0, 0);
    for (const z of [-4.05, -3, -1.95]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.09, 6, 20, Math.PI), M.cyan);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(0, 0.35, z);
      g.add(arch);
    }
    for (let i = 0; i < 4; i++) {
      for (const side of [-1, 1]) {
        const shop = addBox(g, 0.55, 0.72, 0.62, M.plaster, side * 0.82, 1.0, -4 + i * 0.75);
        trim(shop, i % 2 ? 'magenta' : 'cyan');
        addBox(g, 0.62, 0.08, 0.72, M[i % 2 ? 'magenta' : 'cyan'], side * 0.82, 1.72, -4 + i * 0.75);
        addBox(g, 0.18, 0.16, 0.05, M.windowWarm, side * 0.82, 1.28, -3.7 + i * 0.75);
      }
    }
    const tower = addBox(g, 1.1, 2.6, 1.1, M.stone, 0, 1.0, 0);
    trim(tower, 'magenta');
    for (const [dx, dz] of [
      [-0.4, -0.4],
      [0.4, -0.4],
      [-0.4, 0.4],
      [0.4, 0.4],
    ]) {
      addBox(g, 0.2, 0.3, 0.2, M.stone, dx, 3.6, dz);
    }
    addBanner(g, 0, 2.2, 0.56, 'cyan', 0.5, 0.8);
    return { group: g, height: 4.4 };
  }

  function buildDuomo() {
    const g = new THREE.Group();
    const nave = addBox(g, 4.4, 2.0, 2.6, M.plaster, 0, 0.05, 1.2);
    trim(nave, 'cyan');
    const facade = addBox(g, 3.2, 2.7, 0.6, M.stone, 0, 0.05, 2.75);
    trim(facade, 'magenta');
    addBox(g, 1.0, 1.0, 0.1, M.magenta, 0, 1.55, 3.06);
    const rose = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), M.magenta);
    rose.position.set(0, 1.65, 3.07);
    g.add(rose);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.75, 1.5, 8), M.stone);
    drum.position.y = 2.8;
    g.add(drum);
    trim(drum, 'cyan');
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x2c2233, roughness: 0.65, metalness: 0.2 }),
    );
    dome.scale.y = 1.18;
    dome.position.y = 3.55;
    g.add(dome);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * 1.62, 3.62, Math.sin(a) * 1.62),
        new THREE.Vector3(Math.cos(a) * 1.2, 4.42, Math.sin(a) * 1.2),
        new THREE.Vector3(Math.cos(a) * 0.45, 4.98, Math.sin(a) * 0.45),
        new THREE.Vector3(0, 5.18, 0),
      ]);
      const rib = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.035, 4, false), M.cyan);
      g.add(rib);
    }
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.55, 8), M.stone);
    lantern.position.y = 5.35;
    g.add(lantern);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 8), M.magenta);
    cap.position.y = 5.85;
    g.add(cap);
    const campanile = addBox(g, 1.0, 5.0, 1.0, M.stone, -3.15, 0.02, 2.9);
    trim(campanile, 'cyan');
    for (let i = 0; i < 4; i++) {
      addBox(g, 1.06, 0.08, 1.06, M.cyan, -3.15, 0.9 + i * 1.05, 2.9);
    }
    for (const [dx, dz] of [
      [-0.38, -0.38],
      [0.38, -0.38],
      [-0.38, 0.38],
      [0.38, 0.38],
    ]) {
      addBox(g, 0.2, 0.36, 0.2, M.stone, -3.15 + dx, 5.0, 2.9 + dz);
    }
    addBox(g, 1.2, 1.4, 1.0, M.stone, 2.75, 0.02, 1.9);
    trim(addBox(g, 0.8, 1.0, 0.7, M.stone, -2.65, 0.02, 0.95), 'violet');
    return { group: g, height: 6.6 };
  }

  function buildStable() {
    const g = new THREE.Group();
    const body = addBox(g, 2.8, 1.1, 1.8, M.plaster, 0, 0.04, 0);
    trim(body, 'amber');
    addBox(g, 3.0, 0.12, 1.95, M.roof, 0, 1.16, 0);
    for (let i = 0; i < 3; i++) {
      addBox(g, 0.7, 0.65, 0.05, M.dark, -0.85 + i * 0.85, 0.05, 0.92);
    }
    for (const x of [-1.5, 1.5]) {
      addBox(g, 0.09, 1.2, 0.09, M.wood, x, 0.1, -0.25);
    }
    for (let i = 0; i < 5; i++) {
      addBox(g, 0.07, 0.7, 0.07, M.wood, 1.55 + i * 0.28, 0.05, 0.55);
    }
    addBox(g, 1.25, 0.06, 0.06, M.wood, 2.1, 0.55, 0.55);
    addBox(g, 0.65, 0.22, 0.5, M.amber, -1.65, 0.05, 0.65);
    addBox(g, 0.55, 0.18, 0.45, M.amber, -1.65, 0.05, -0.35);
    addBanner(g, 0.95, 1.62, 0.2, 'cyan', 0.45, 0.7);
    return { group: g, height: 2.2 };
  }

  function buildArmory() {
    const g = new THREE.Group();
    const body = addBox(g, 2.0, 1.45, 1.8, M.stone, 0, 0.04, 0);
    trim(body, 'magenta');
    addBox(g, 2.1, 0.48, 1.9, M.roof, 0, 1.45, 0);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.23, 1.0, 8), M.stoneDark);
    chimney.position.set(-0.62, 2.1, -0.35);
    g.add(chimney);
    trim(chimney, 'amber');
    for (let i = 0; i < 3; i++) {
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 10), M.cyan);
      shield.rotation.x = Math.PI / 2;
      shield.position.set(-0.52 + i * 0.52, 1.08, 0.94);
      g.add(shield);
    }
    for (let i = 0; i < 4; i++) {
      addBox(g, 0.035, 1.15, 0.035, M.wood, -0.75 + i * 0.5, 0.1, 0.98, 0.08);
    }
    addBox(g, 0.42, 0.58, 0.06, M.dark, 0, 0.02, 0.92);
    addBanner(g, -0.95, 1.8, 0.2, 'magenta', 0.42, 0.7);
    return { group: g, height: 2.8 };
  }

  function buildPalazzo() {
    const g = new THREE.Group();
    const body = addBox(g, 3.8, 2.1, 2.9, M.stone, 0, 0.04, 0);
    trim(body, 'cyan');
    addBox(g, 4.0, 0.2, 3.1, M.stoneDark, 0, 2.14, 0);
    for (let i = 0; i < 7; i++) {
      addBox(g, 0.3, 0.34, 0.3, M.stone, -1.65 + i * 0.55, 2.34, 1.35);
      addBox(g, 0.3, 0.34, 0.3, M.stone, -1.65 + i * 0.55, 2.34, -1.35);
    }
    const tower = addBox(g, 1.55, 4.6, 1.55, M.stone, -0.15, 2.2, -0.2);
    trim(tower, 'magenta');
    addBox(g, 1.8, 0.18, 1.8, M.stoneDark, -0.15, 6.75, -0.2);
    for (const [dx, dz] of [
      [-0.62, -0.62],
      [0.62, -0.62],
      [-0.62, 0.62],
      [0.62, 0.62],
    ]) {
      addBox(g, 0.28, 0.44, 0.28, M.stone, -0.15 + dx, 6.9, -0.2 + dz);
    }
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.44, 24), M.amber);
    clock.position.set(-0.15, 5.7, 0.59);
    g.add(clock);
    const hand = addBox(g, 0.06, 0.42, 0.03, M.dark, -0.15, 5.55, 0.62);
    hand.rotation.z = 0.5;
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.08, 6, 20, Math.PI), M.stoneDark);
    arch.position.set(0.85, 1.15, 1.48);
    g.add(arch);
    addBox(g, 1.12, 1.05, 0.08, M.dark, 0.85, 0.02, 1.47);
    addBanner(g, 0.85, 2.1, 1.35, 'cyan', 0.75, 1.0);
    addBanner(g, -1.4, 2.55, 1.25, 'magenta', 0.48, 0.85);
    return { group: g, height: 7.6 };
  }


  const BUILDERS = {
    house: buildHouse,
    farm: buildFarm,
    quarry: buildQuarry,
    furnace: buildFurnace,
    clinic: buildClinic,
    barracks: buildBarracks,
    stable: buildStable,
    armory: buildArmory,
    market: buildMarket,
    workshop: buildWorkshop,
    tower: buildTower,
    porta: buildPorta,
    bridge: buildBridge,
    duomo: buildDuomo,
    palazzo: buildPalazzo,
  };

  function buildCore() {
    return (BUILDERS[level.coreKind] || buildPalazzo)();
  }

  /* ---------------------------------- ruins --------------------------------- */

  function buildRuin(seed) {
    const g = new THREE.Group();
    let s = seed * 9973 + 17;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return (s & 0xffff) / 65535;
    };
    addBox(g, 1.9, 0.14, 1.9, M.stoneDark, 0, 0, 0);
    trim(g.children[g.children.length - 1], 'violet');
    const count = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rnd() * 0.5;
      const w = 0.3 + rnd() * 0.7;
      const h = 0.3 + rnd() * 0.9;
      const d = 0.18 + rnd() * 0.2;
      const wall = addBox(
        g,
        w,
        h,
        d,
        M.ruin,
        Math.cos(a) * (0.7 + rnd() * 0.4),
        0.04,
        Math.sin(a) * (0.7 + rnd() * 0.4),
        a + rnd() * 0.8,
      );
      if (i % 2 === 0) trim(wall, 'ruin');
    }
    const rubbleGeo = new THREE.DodecahedronGeometry(0.16, 0);
    for (let i = 0; i < 7; i++) {
      const rock = new THREE.Mesh(rubbleGeo, M.rubble);
      rock.position.set((rnd() - 0.5) * 1.6, 0.1, (rnd() - 0.5) * 1.6);
      rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      rock.scale.setScalar(0.6 + rnd());
      g.add(rock);
    }
    // charred beams
    for (let i = 0; i < 2; i++) {
      const beam = addBox(g, 1.1, 0.07, 0.07, M.wood, (rnd() - 0.5) * 0.6, 0.12, (rnd() - 0.5) * 0.6);
      beam.rotation.z = (rnd() - 0.5) * 0.7;
    }
    const embers = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), M.amber);
    embers.position.set((rnd() - 0.5) * 1.2, 0.18, (rnd() - 0.5) * 1.2);
    g.add(embers);
    return { group: g, height: 1.3 };
  }

  /* -------------------------------- hp bars --------------------------------- */

  function makeBar() {
    const group = new THREE.Group();
    const bgMat = new THREE.SpriteMaterial({
      color: 0x1a0a12,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false,
    });
    const fillMat = new THREE.SpriteMaterial({
      color: LIME,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
      depthWrite: false,
    });
    const bg = new THREE.Sprite(bgMat);
    bg.center.set(0, 0.5);
    bg.scale.set(1.5, 0.12, 1);
    bg.position.x = -0.75;
    const fill = new THREE.Sprite(fillMat);
    fill.center.set(0, 0.5);
    fill.scale.set(1.5, 0.09, 1);
    fill.position.set(-0.75, 0, 0.001);
    bg.renderOrder = 30;
    fill.renderOrder = 31;
    group.add(bg, fill);
    group.userData.fill = fill;
    group.userData.bg = bg;
    return group;
  }

  function disposeGroup(group) {
    group.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) {
          if (material.userData?.shared !== true) material.dispose?.();
        }
      }
    });
  }

  /* ------------------------------- level build ------------------------------ */

  function clearLevel() {
    for (const child of [...levelRoot.children]) {
      levelRoot.remove(child);
      disposeGroup(child);
    }
    visuals.clear();
    nestVisuals.clear();
    zoneVisuals.clear();
    hitMeshes = [];
    if (groundTexture) groundTexture.dispose();
    if (waterTexture) waterTexture.dispose();
    groundTexture = null;
    waterTexture = null;
    unitMeshes = null;
    bossVisual = null;
    bossLight = null;
    if (waterMesh) waterMesh = null;
  }

  function loadLevel(def) {
    clearLevel();
    level = def;
    bounds = def.bounds;
    def.coreCenter = {
      x: 0,
      z: 2.4,
    };
    userZoomed = false;
    selected = { type: null, id: null };
    rig.target.set(
      (bounds.minX + bounds.maxX) / 2,
      0,
      (bounds.minZ + bounds.maxZ) / 2 + 1,
    );
    computeFit();
    rig.dist = defaultDist();

    buildGround();
    buildCoreVisuals();
    for (const def of CITY_NODES) {
      const visual = createVisual({ id: def.id, x: def.x, z: def.z, kind: def.kind }, def.kind, false);
      visuals.set(def.id, visual);
    }
    buildNests();
    buildZones();
    buildUnits();
    buildBoss();
    buildHits();
    buildStars();

    recomputeTargetClamp();
  }

  function buildCoreVisuals() {
    const core = { id: 'core', x: 0, z: level.coreCenter.z, kind: 'core' };
    const v = createVisual(core, level.coreKind, true);
    visuals.set('core', v);
  }

  function createVisual(node, kind, isCore) {
    const group = new THREE.Group();
    group.position.set(node.x, 0, node.z);
    const ruinSeed = (node.id.charCodeAt(0) || 1) * (node.x + 20) + (node.z + 20) * 7;
    const ruin = buildRuin(Math.abs(Math.round(ruinSeed)) + 1).group;
    group.add(ruin);
    const builtGroup = new THREE.Group();
    group.add(builtGroup);
    const scaffold = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.8, 1, 1.8)),
      new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.35 }),
    );
    scaffold.visible = false;
    group.add(scaffold);
    const prog = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 0.98, 36),
      new THREE.MeshBasicMaterial({
        color: LIME,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    prog.rotation.x = -Math.PI / 2;
    prog.position.y = 0.06;
    prog.visible = false;
    group.add(prog);
    const selectRing = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.28, 40),
      new THREE.MeshBasicMaterial({
        color: CYAN,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    selectRing.rotation.x = -Math.PI / 2;
    selectRing.position.y = 0.07;
    selectRing.visible = false;
    group.add(selectRing);
    const slot = new THREE.Mesh(
      new THREE.RingGeometry(1.02, 1.16, 32),
      new THREE.MeshBasicMaterial({
        color: VIOLET,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    slot.rotation.x = -Math.PI / 2;
    slot.position.y = 0.08;
    slot.visible = !isCore;
    group.add(slot);
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.34, 8), M.amber);
    beacon.position.y = 1.9;
    beacon.visible = !isCore;
    group.add(beacon);
    const bar = makeBar();
    group.add(bar);
    levelRoot.add(group);
    return {
      group,
      ruin,
      built: builtGroup,
      builtKind: null,
      scaffold,
      progress: prog,
      ring: selectRing,
      slot,
      beacon,
      bar,
      height: isCore ? 5 : 1.3,
      isCore,
    };
  }

  function ensureBuilt(visual, kind) {
    if (visual.builtKind === kind) return;
    for (const child of [...visual.built.children]) {
      visual.built.remove(child);
      disposeGroup(child);
    }
    const builder = BUILDERS[kind];
    if (!builder) return;
    const { group, height } = builder();
    visual.built.add(group);
    visual.builtKind = kind;
    visual.height = height;
    visual.bar.position.y = height + 0.45;
    visual.scaffold.scale.y = Math.max(1, height / 1);
    visual.scaffold.position.y = Math.max(0.5, height / 2);
  }

  function buildNests() {
    for (const nest of level.nests) {
      const group = new THREE.Group();
      group.position.set(nest.x, 0, nest.z);
      const mound = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 0.5, 9), M.ruin);
      mound.position.y = 0.2;
      group.add(mound);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.15, 1.42, 36),
        new THREE.MeshBasicMaterial({
          color: LIME,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      group.add(ring);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55 + (i % 3) * 0.18, 4), M.ember);
        spike.position.set(Math.cos(a) * (0.5 + (i % 2) * 0.35), 0.5, Math.sin(a) * (0.5 + (i % 2) * 0.35));
        spike.rotation.z = (i % 2 ? 1 : -1) * 0.25;
        group.add(spike);
      }
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), M.lime);
      glow.position.y = 0.7;
      group.add(glow);
      levelRoot.add(group);
      nestVisuals.set(nest.id, { group, ring, glow });
    }
  }

  function buildZones() {
    for (const zone of ZONES) {
      const group = new THREE.Group();
      group.position.set(zone.x, 0, zone.z);
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 0.18, 10), M.stoneDark);
      plinth.position.y = 0.09;
      group.add(plinth);
      const pole = addBox(group, 0.08, 2.8, 0.08, M.wood, 0, 0.14, 0);
      trim(pole, 'amber');
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.62), M.bannerCyan);
      banner.position.set(0.5, 2.62, 0);
      group.add(banner);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.25, 1.5, 42),
        new THREE.MeshBasicMaterial({
          color: GOLD,
          transparent: true,
          opacity: 0.54,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.07;
      group.add(ring);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), M.amber);
      glow.position.y = 2.98;
      group.add(glow);
      levelRoot.add(group);
      zoneVisuals.set(zone.id, { group, ring, glow, banner });
    }
  }

  function buildUnits() {
    const zombieGeo = makeUnitGeometry(false);
    const zombies = new THREE.InstancedMesh(zombieGeo, M.zombie, 320);
    zombies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    zombies.frustumCulled = false;
    zombies.count = 0;
    for (let i = 0; i < 320; i++) zombies.setColorAt(i, new THREE.Color(0x9aa35f));
    zombies.instanceColor.needsUpdate = true;
    levelRoot.add(zombies);

    const troops = {};
    const caps = { levy: 240, crossbow: 180, knight: 120 };
    for (const type of ['levy', 'crossbow', 'knight']) {
      const mesh = new THREE.InstancedMesh(makeTroopGeometry(type), M.militia, caps[type]);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.count = 0;
      const tint = type === 'levy' ? 0xc9d3dc : type === 'crossbow' ? 0xd8b36a : 0x9c3f32;
      for (let i = 0; i < caps[type]; i++) mesh.setColorAt(i, new THREE.Color(tint));
      mesh.instanceColor.needsUpdate = true;
      levelRoot.add(mesh);
      troops[type] = mesh;
    }

    unitMeshes = { zombies, troops, dummy: new THREE.Object3D() };
  }

  function buildBoss() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2b2119,
      emissive: 0x4a241b,
      emissiveIntensity: 0.5,
      roughness: 0.55,
      metalness: 0.25,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 1.1), bodyMat);
    body.position.y = 1.1;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.66), bodyMat);
    head.position.y = 2.45;
    group.add(head);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0x2a1c06,
      emissive: AMBER,
      emissiveIntensity: 1.5,
      metalness: 0.7,
      roughness: 0.3,
    });
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.55, 6, 1, true), crownMat);
    crown.position.y = 2.98;
    group.add(crown);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 0.3), bodyMat);
      arm.position.set(side * 0.95, 1.2, 0);
      arm.rotation.z = side * 0.16;
      group.add(arm);
    }
    const eyeMat = new THREE.MeshBasicMaterial({ color: LIME });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), eyeMat);
      eye.position.set(side * 0.17, 2.5, 0.34);
      group.add(eye);
    }
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), M.magenta);
    heart.position.set(0, 1.35, 0.58);
    group.add(heart);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.3, 1.6, 40),
      new THREE.MeshBasicMaterial({
        color: MAGENTA,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);
    group.visible = false;
    levelRoot.add(group);
    bossVisual = { group, head, crown, ring, heart };
    bossLight = new THREE.PointLight(MAGENTA, 0, 11, 2);
    levelRoot.add(bossLight);
  }

  function buildHits() {
    hitRoot = new THREE.Group();
    hitRoot.name = 'hits';
    levelRoot.add(hitRoot);
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    for (const node of CITY_NODES) {
      const radius = node.kind === 'plot' ? 1.25 : 1.3;
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 4.5, 10), hitMat);
      mesh.position.set(node.x, 2.2, node.z);
      mesh.userData = { pick: 'node', id: node.id };
      hitRoot.add(mesh);
      hitMeshes.push(mesh);
    }
    const coreHit = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 9, 10), hitMat);
    coreHit.position.set(0, 4.5, level.coreCenter.z);
    coreHit.userData = { pick: 'node', id: 'core' };
    hitRoot.add(coreHit);
    hitMeshes.push(coreHit);
    for (const nest of level.nests) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.4, 10), hitMat);
      mesh.position.set(nest.x, 1.2, nest.z);
      mesh.userData = { pick: 'nest', id: nest.id };
      hitRoot.add(mesh);
      hitMeshes.push(mesh);
    }
    for (const zone of ZONES) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 3.1, 10), hitMat);
      mesh.position.set(zone.x, 1.55, zone.z);
      mesh.userData = { pick: 'zone', id: zone.id };
      hitRoot.add(mesh);
      hitMeshes.push(mesh);
    }
  }

  let stars = null;
  function buildStars() {
    if (stars) return;
    const count = 160;
    const positions = new Float32Array(count * 3);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    for (let i = 0; i < count; i++) {
      positions[i * 3] = cx + (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = 6 + Math.random() * 18;
      positions[i * 3 + 2] = cz + (Math.random() - 0.5) * 90;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xd8c7a6,
        size: 0.08,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    stars.frustumCulled = false;
    scene.add(stars);
  }

  function recomputeTargetClamp() {
    clampTarget();
  }

  /* --------------------------------- lighting -------------------------------- */

  scene.add(new THREE.HemisphereLight(0xd8c7a6, 0x2a2118, 1.65));
  scene.add(new THREE.AmbientLight(0x5b4a38, 0.55));
  const key = new THREE.DirectionalLight(0xffe0b8, 2.35);
  key.position.set(9, 18, 12);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8fa3a0, 0.72);
  fill.position.set(-12, 8, -8);
  scene.add(fill);
  const coreLight = new THREE.PointLight(0xffc277, 22, 16, 2);
  scene.add(coreLight);

  /* --------------------------------- picking -------------------------------- */

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const canvas = renderer.domElement;
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  let lastTap = null;

  function ndc(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    return pointer;
  }

  function pick(clientX, clientY) {
    raycaster.setFromCamera(ndc(clientX, clientY), camera);
    const hits = raycaster.intersectObjects(hitMeshes, false);
    if (!hits.length) return null;
    const data = hits[0].object.userData;
    return { type: data.pick, id: data.id };
  }

  function zoomBy(factor) {
    userZoomed = true;
    rig.dist = THREE.MathUtils.clamp(rig.dist * factor, rig.min, rig.max);
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    canvas.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      drag = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: 0,
        at: performance.now(),
      };
      pinch = null;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        startDist: rig.dist,
      };
      drag = null;
    }
  }

  function onPointerMove(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > 4) {
        userZoomed = true;
        rig.dist = THREE.MathUtils.clamp(
          pinch.startDist * (pinch.distance / distance),
          rig.min,
          rig.max,
        );
      }
      event.preventDefault();
      return;
    }
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    const scale = rig.dist * 0.00135;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    right.y = 0;
    right.normalize();
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    rig.target.addScaledVector(right, -dx * scale);
    rig.target.addScaledVector(forward, dy * scale);
    clampTarget();
    event.preventDefault();
  }

  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (drag && drag.id === event.pointerId) {
      const tap =
        drag.moved < 9 &&
        performance.now() - drag.at < 420 &&
        Math.abs(event.clientX - drag.startX) < 12 &&
        Math.abs(event.clientY - drag.startY) < 12;
      if (tap) {
        lastTap = { x: event.clientX, y: event.clientY, at: performance.now() };
        const target = pick(event.clientX, event.clientY);
        setSelected(target);
        onTap?.(target);
      }
      drag = null;
    }
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 1) {
      const [id, value] = [...pointers.entries()][0];
      drag = {
        id,
        startX: value.x,
        startY: value.y,
        lastX: value.x,
        lastY: value.y,
        moved: 20,
        at: performance.now(),
      };
    }
  }

  function onWheel(event) {
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? 1.12 : 0.89);
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContextMenu);

  function setSelected(target) {
    selected = target ? { type: target.type, id: target.id } : { type: null, id: null };
    for (const [id, v] of visuals) {
      v.ring.visible = selected.type === 'node' && selected.id === id;
    }
    for (const [id, v] of nestVisuals) {
      v.ring.material.opacity = selected.type === 'nest' && selected.id === id ? 0.9 : 0.4;
    }
    for (const [id, v] of zoneVisuals) {
      v.ring.material.opacity = selected.type === 'zone' && selected.id === id ? 0.95 : 0.54;
    }
  }

  function focusOn(x, z) {
    rig.target.set(x, 0, z);
    clampTarget();
  }

  function fitView() {
    userZoomed = false;
    rig.target.set(
      (bounds.minX + bounds.maxX) / 2,
      0,
      (bounds.minZ + bounds.maxZ) / 2 + 1,
    );
    computeFit();
    rig.dist = defaultDist();
    clampTarget();
  }

  /* ---------------------------------- sync ---------------------------------- */

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let time = 0;

  function syncUnits(state, dt) {
    if (!unitMeshes) return;
    const { zombies, troops } = unitMeshes;
    if (!troops) return;

    // The boss has a hand-built model; keep it out of the instanced horde.
    let zIndex = 0;
    const zombieCap = zombies.instanceMatrix.count;
    for (let i = 0; i < state.zombies.length && zIndex < zombieCap; i++) {
      const u = state.zombies[i];
      if (u.boss) continue;
      if (u._yaw === undefined) u._yaw = 0;
      let tx = state.core.x;
      let tz = state.core.z;
      if (u.target) {
        if (u.target.kind === 'militia') {
          tx = u.target.unit.x;
          tz = u.target.unit.z;
        } else {
          tx = u.target.node.x;
          tz = u.target.node.z;
        }
        u._yaw = Math.atan2(tx - u.x, tz - u.z);
      }
      const scale = (u.type === 'brute' ? 1.35 : u.type === 'runner' ? 0.9 : 1) * 1.6;
      const bob = Math.sin(time * 7 + u.wobble) * 0.035 + 0.03;
      dummy.position.set(u.x, bob, u.z);
      dummy.rotation.set(0, u._yaw, Math.sin(time * 5 + u.wobble) * 0.08);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      zombies.setMatrixAt(zIndex, dummy.matrix);
      const base = ZOMBIE_COLORS[zIndex % ZOMBIE_COLORS.length];
      color.setHex(u.flash > 0 ? 0xffffff : u.type === 'brute' ? 0xb2b678 : base);
      zombies.setColorAt(zIndex, color);
      zIndex += 1;
    }
    zombies.count = zIndex;
    zombies.instanceMatrix.needsUpdate = true;
    if (zombies.instanceColor) zombies.instanceColor.needsUpdate = true;

    const used = { levy: 0, crossbow: 0, knight: 0 };
    const tints = { levy: 0xc9d3dc, crossbow: 0xd8b36a, knight: 0x9c3f32 };
    for (const u of state.militia) {
      const mesh = troops[u.type];
      if (!mesh) continue;
      const index = used[u.type];
      if (index >= mesh.instanceMatrix.count) continue;
      used[u.type] += 1;
      if (u._yaw === undefined) u._yaw = 0;
      if (u.target) u._yaw = Math.atan2(u.target.x - u.x, u.target.z - u.z);
      const bob = Math.sin(time * 8 + u.wobble) * 0.03 + 0.02;
      dummy.position.set(u.x, bob, u.z);
      dummy.rotation.set(0, u._yaw, 0);
      dummy.scale.setScalar(u.type === 'knight' ? 1.72 : u.type === 'crossbow' ? 1.4 : 1.48);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      color.setHex(u.flash > 0 ? 0xffffff : tints[u.type] || 0xc9d3dc);
      mesh.setColorAt(index, color);
    }
    for (const type of ['levy', 'crossbow', 'knight']) {
      const mesh = troops[type];
      mesh.count = used[type];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  function updateParticles(dt) {
    for (let i = 0; i < P_MAX; i++) {
      const p = particles[i];
      if (p.life <= 0) {
        if (pColors[i * 3] !== 0) {
          pColors[i * 3] = 0;
          pColors[i * 3 + 1] = 0;
          pColors[i * 3 + 2] = 0;
        }
        continue;
      }
      p.life -= dt;
      p.vy -= 1.8 * dt;
      pPositions[i * 3] += p.vx * dt;
      pPositions[i * 3 + 1] += p.vy * dt;
      pPositions[i * 3 + 2] += p.vz * dt;
      const alpha = Math.max(0, p.life / p.max);
      pColors[i * 3] = p.r * alpha;
      pColors[i * 3 + 1] = p.g * alpha;
      pColors[i * 3 + 2] = p.b * alpha;
    }
    particleGeo.attributes.position.needsUpdate = true;
    particleGeo.attributes.color.needsUpdate = true;
  }

  function sync(state, dt) {
    time += dt;
    applyCamera(dt);
    updateParticles(dt);
    updateRings(dt);
    updateTracers(dt);
    if (waterTexture) waterTexture.offset.x = (waterTexture.offset.x + dt * 0.05) % 1;
    if (!state || !level) {
      if (coreLight) coreLight.position.set(0, 5, 3);
      return;
    }

    if (coreLight) coreLight.position.set(state.core.x, 4.5, state.core.z);

    for (const node of state.nodes) {
      const v = visuals.get(node.id);
      if (!v) continue;
      if (node.restored) {
        ensureBuilt(v, node.isCore ? level.coreKind : node.kind);
        v.ruin.visible = false;
        v.built.visible = true;
        v.scaffold.visible = false;
        v.progress.visible = false;
      } else if (node.building) {
        v.ruin.visible = true;
        v.built.visible = false;
        v.scaffold.visible = true;
        v.progress.visible = true;
        v.progress.scale.setScalar(0.55 + node.progress * 0.7);
        v.progress.material.opacity = 0.45 + 0.25 * Math.sin(time * 8);
      } else {
        v.ruin.visible = true;
        v.built.visible = false;
        v.scaffold.visible = false;
        v.progress.visible = false;
      }

      if (v.slot) {
        v.slot.visible = !node.restored;
        v.slot.material.color.setHex(node.destroyed ? MAGENTA : GOLD);
        v.slot.material.opacity = 0.22 + Math.sin(time * 2 + node.x) * 0.08;
        v.slot.scale.setScalar(1 + Math.sin(time * 2 + node.z) * 0.035);
      }
      if (v.beacon) {
        v.beacon.visible = !node.restored && !node.building;
        v.beacon.rotation.y = time * 1.5;
        v.beacon.position.y = 1.9 + Math.sin(time * 2 + node.x) * 0.12;
      }

      const damaged = node.restored && node.hp < node.maxHp - 0.1;
      const showBar = node.restored && (damaged || node.isCore || selected.id === node.id);
      v.bar.visible = showBar;
      if (showBar) {
        const frac = Math.max(0, Math.min(1, node.hp / Math.max(1, node.maxHp)));
        const fill = v.bar.userData.fill;
        fill.scale.x = 1.5 * frac;
        fill.material.color.setHex(frac > 0.6 ? LIME : frac > 0.3 ? AMBER : MAGENTA);
        v.bar.position.y = v.height + 0.45;
      }
      v.ring.visible = selected.type === 'node' && selected.id === node.id;
      if (v.ring.visible) {
        const pulse = 1 + Math.sin(selectedPulse * 5) * 0.05;
        v.ring.scale.setScalar(pulse);
      }
    }

    for (const nest of state.nests) {
      const v = nestVisuals.get(nest.id);
      if (!v) continue;
      const pulse = 1 + Math.sin(time * 2.4 + nest.x) * 0.06;
      v.ring.scale.setScalar(pulse);
      v.ring.material.opacity = 0.25 + 0.2 * (nest.count / nest.max);
      v.glow.material = M.lime;
      v.glow.scale.setScalar(0.8 + (nest.count / nest.max) * 0.5);
      if (state.cure?.nestId === nest.id) {
        v.ring.material.opacity = 0.8;
        v.ring.scale.setScalar(1.1 + Math.sin(time * 9) * 0.12);
      }
    }

    for (const zone of state.zones || ZONES) {
      const v = zoneVisuals.get(zone.id);
      if (!v) continue;
      const selectedHere = selected.type === 'zone' && selected.id === zone.id;
      const pulse = 1 + Math.sin(time * 2.2 + zone.x) * (selectedHere ? 0.08 : 0.035);
      v.ring.scale.setScalar(pulse);
      v.ring.material.opacity = selectedHere ? 0.95 : 0.45 + Math.sin(time * 1.8 + zone.z) * 0.08;
      v.glow.scale.setScalar(0.85 + Math.sin(time * 4 + zone.x) * 0.15);
      v.banner.rotation.y = Math.sin(time * 1.1 + zone.z) * 0.12;
    }

    syncUnits(state, dt);

    const boss = state.boss;
    if (bossVisual) {
      bossVisual.group.visible = Boolean(boss);
      if (boss) {
        bossVisual.group.position.set(boss.x, Math.sin(time * 3) * 0.06, boss.z);
        bossVisual.group.rotation.y = Math.atan2(state.core.x - boss.x, state.core.z - boss.z);
        bossVisual.group.scale.setScalar(1.5);
        bossVisual.crown.rotation.y = time * 0.8;
        const pulse = 0.85 + Math.sin(time * 5) * 0.15;
        bossVisual.ring.scale.setScalar(pulse * (state.bossEnraged ? 1.25 : 1));
        bossVisual.ring.material.opacity = state.bossEnraged ? 0.95 : 0.6;
        bossLight.position.set(boss.x, 2.2, boss.z);
        bossLight.intensity = state.bossEnraged ? 40 : 22;
        bossLight.color.setHex(state.bossEnraged ? AMBER : MAGENTA);
      } else if (bossLight) {
        bossLight.intensity = 0;
      }
    }

    if (stars) stars.rotation.y += dt * 0.006;
    if (state.core.hp <= 0) shake = Math.max(shake, 0.3);
  }

  function render() {
    renderer.render(scene, camera);
  }

  function resize(width, height, dpr) {
    viewW = width;
    viewH = height;
    renderer.setPixelRatio(Math.min(dpr, 2));
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    computeFit();
    applyCamera(0);
  }

  function dispose() {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', endPointer);
    canvas.removeEventListener('pointercancel', endPointer);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onContextMenu);
    clearLevel();
    if (stars) {
      scene.remove(stars);
      stars.geometry.dispose();
      stars.material.dispose();
      stars = null;
    }
    for (const material of Object.values(M)) material.dispose?.();
    for (const material of Object.values(lineMats)) material.dispose?.();
    particlePoints.material.dispose?.();
    particleGeo.dispose();
    tracerGeo.dispose();
    tracerLines.material.dispose();
    for (const slot of rings) {
      slot.mesh.geometry.dispose();
      slot.mesh.material.dispose();
    }
    glowTex.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
    canvas.remove();
  }

  return {
    loadLevel,
    sync,
    render,
    resize,
    dispose,
    burst,
    ringEffect,
    shot,
    shake: (amount) => {
      shake = Math.min(1.2, shake + amount);
    },
    setSelected,
    focusOn,
    fit: fitView,
    get selected() {
      return selected;
    },
  };
}
