import * as THREE from 'three';

function glowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.28, 'rgba(255,255,255,0.42)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Ambient depth behind the hub: drifting starfield, slow neon rings and a
 * parallax camera. Kept deliberately cheap, and fully paused while a game runs.
 */
export function createHubScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 140);
  camera.position.set(0, 0.4, 9);

  const palette = [new THREE.Color('#22e1ff'), new THREE.Color('#ff2f8e'), new THREE.Color('#b9ff4d')];

  const starCount = 640;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starSpeeds = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 34;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 24;
    starPositions[i * 3 + 2] = -Math.random() * 26 + 4;
    const colour = palette[Math.floor(Math.random() * palette.length)].clone();
    colour.lerp(new THREE.Color('#ffffff'), 0.55 + Math.random() * 0.35);
    starColors[i * 3] = colour.r;
    starColors[i * 3 + 1] = colour.g;
    starColors[i * 3 + 2] = colour.b;
    starSpeeds[i] = 0.15 + Math.random() * 0.7;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      size: 0.085,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(stars);

  const rings = new THREE.Group();
  const ringConfigs = [
    { radius: 5.6, colour: '#22e1ff', opacity: 0.42, x: -3.2, y: 1.4, z: -13, tilt: 1.15 },
    { radius: 4.2, colour: '#ff2f8e', opacity: 0.34, x: 4.4, y: -1.6, z: -17, tilt: 0.4 },
    { radius: 7.8, colour: '#8f7dff', opacity: 0.22, x: 1.2, y: 2.8, z: -22, tilt: -0.7 },
  ];
  for (const config of ringConfigs) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(config.radius, 0.012, 3, 128),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.colour),
        transparent: true,
        opacity: config.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.position.set(config.x, config.y, config.z);
    ring.rotation.set(config.tilt, 0.2, 0.1);
    ring.userData.spin = 0.03 + Math.random() * 0.05;
    rings.add(ring);
  }
  scene.add(rings);

  const grid = new THREE.GridHelper(80, 46, 0x1d4054, 0x121c2a);
  grid.position.set(0, -7.2, -8);
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  grid.material.depthWrite = false;
  scene.add(grid);

  const glow = glowTexture();
  const glowSprites = [
    { x: -8, y: 5.2, z: -16, scale: 22, colour: '#22e1ff', opacity: 0.34 },
    { x: 9, y: -3.5, z: -19, scale: 26, colour: '#ff2f8e', opacity: 0.26 },
  ].map((config) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow,
        color: new THREE.Color(config.colour),
        transparent: true,
        opacity: config.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sprite.position.set(config.x, config.y, config.z);
    sprite.scale.setScalar(config.scale);
    scene.add(sprite);
    return sprite;
  });

  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const onPointerMove = (event) => {
    const touch = event.touches?.[0];
    const x = touch ? touch.clientX : event.clientX;
    const y = touch ? touch.clientY : event.clientY;
    pointer.x = (x / window.innerWidth - 0.5) * 2;
    pointer.y = (y / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  let raf = 0;
  let running = false;
  let active = true;
  let last = 0;
  let elapsed = 0;

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;

    const positions = starGeometry.attributes.position.array;
    for (let i = 0; i < starCount; i++) {
      positions[i * 3 + 1] -= starSpeeds[i] * dt;
      if (positions[i * 3 + 1] < -12) positions[i * 3 + 1] = 12;
    }
    starGeometry.attributes.position.needsUpdate = true;

    for (const ring of rings.children) {
      ring.rotation.z += ring.userData.spin * dt;
      ring.rotation.y += ring.userData.spin * dt * 0.4;
    }
    grid.rotation.z = Math.sin(elapsed * 0.04) * 0.05;
    for (let i = 0; i < glowSprites.length; i++) {
      const sprite = glowSprites[i];
      sprite.material.opacity = (i === 0 ? 0.34 : 0.26) + Math.sin(elapsed * 0.6 + i) * 0.05;
    }

    target.x += (pointer.x - target.x) * Math.min(1, dt * 2.2);
    target.y += (pointer.y - target.y) * Math.min(1, dt * 2.2);
    camera.position.x = target.x * 0.75;
    camera.position.y = 0.4 - target.y * 0.45 + Math.sin(elapsed * 0.32) * 0.16;
    camera.lookAt(0, 0.2, -10);

    renderer.render(scene, camera);
  }

  function start() {
    if (running || !active || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  resize();
  start();

  return {
    setActive(next) {
      active = next;
      if (next) start();
      else stop();
    },
    start,
    stop,
  };
}
