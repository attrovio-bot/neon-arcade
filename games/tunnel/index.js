import * as THREE from 'three';

/**
 * TUNNEL RUN — steer a ship through a neon tunnel that scrolls toward you.
 * Gates are offset rings: fly through the hole, or squeeze around the outside.
 * All motion is on the Z axis, so collisions are checked exactly when an
 * object crosses the ship's plane, even at low frame rates.
 */

const TUNNEL_R = 3.2;
const SHIP_Z = -5;
const SHIP_R = 0.26;
const MAX_R = 2.0;
const RING_COUNT = 26;
const RING_SPACING = 3.7;
const GATE_R = 1.3;
const GATE_TUBE = 0.27;

export default {
  init(ctx) {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04060b, 0.012);
    const camera = new THREE.PerspectiveCamera(70, ctx.width / Math.max(ctx.height, 1), 0.1, 220);
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(ctx.dpr, 2));
    renderer.setSize(ctx.width, ctx.height);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    ctx.stage.appendChild(renderer.domElement);

    function fit(width, height) {
      const aspect = width / Math.max(height, 1);
      camera.aspect = aspect;
      camera.fov = aspect < 0.9 ? 78 : 62;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    fit(ctx.width, ctx.height);

    scene.add(new THREE.HemisphereLight(0x9dc0ff, 0x080b14, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(4, 8, 6);
    scene.add(key);

    const loader = new THREE.TextureLoader();
    const glowUrl = ctx.assets.url('glow.png');
    const glowTex = glowUrl ? loader.load(glowUrl) : null;
    if (glowTex) glowTex.colorSpace = THREE.SRGBColorSpace;

    /* --------------------------------- tunnel -------------------------------- */
    const ringPalette = [0x22e1ff, 0x22e1ff, 0xb9ff4d, 0x8f7dff, 0x22e1ff, 0xff2f8e];
    const ringGeo = new THREE.TorusGeometry(TUNNEL_R, 0.028, 4, 72);
    const ringMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tunnel = new THREE.Group();
    const rings = [];
    for (let i = 0; i < RING_COUNT; i++) {
      const ring = new THREE.Mesh(ringGeo, ringMat.clone());
      ring.material.color.set(ringPalette[i % ringPalette.length]);
      ring.position.z = -5 - i * RING_SPACING;
      tunnel.add(ring);
      rings.push(ring);
    }
    scene.add(tunnel);

    // faint far-end glow so the tunnel reads as infinite
    if (glowTex) {
      const end = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0x1f6f8f,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      end.position.set(0, 0, -95);
      end.scale.setScalar(26);
      scene.add(end);
    }

    /* ------------------------------- speed dust ------------------------------ */
    const DUST = 260;
    const dustPos = new Float32Array(DUST * 3);
    const dustSpeed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * (TUNNEL_R - 0.2);
      dustPos[i * 3] = Math.cos(angle) * radius;
      dustPos[i * 3 + 1] = Math.sin(angle) * radius;
      dustPos[i * 3 + 2] = -Math.random() * 110;
      dustSpeed[i] = 0.6 + Math.random() * 0.9;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x8fd8ff,
      size: 0.05,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(dustGeo, dustMat));

    /* ---------------------------------- ship -------------------------------- */
    const ship = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x07161d,
      emissive: 0x22e1ff,
      emissiveIntensity: 0.5,
      metalness: 0.6,
      roughness: 0.3,
    });
    const hull = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.62, 5), hullMat);
    hull.rotation.x = -Math.PI / 2;
    ship.add(hull);

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x1a0710,
      emissive: 0xff2f8e,
      emissiveIntensity: 0.55,
      metalness: 0.5,
      roughness: 0.4,
    });
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.14), wingMat);
      wing.position.set(side * 0.2, -0.02, 0.12);
      wing.rotation.z = side * 0.28;
      ship.add(wing);
    }
    if (glowTex) {
      const flare = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0x22e1ff,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      flare.scale.setScalar(1.0);
      flare.position.z = 0.34;
      ship.add(flare);
    }
    ship.position.set(0, 0, SHIP_Z);
    scene.add(ship);

    const trail = [];
    if (glowTex) {
      for (let i = 0; i < 7; i++) {
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: 0x22e1ff,
            transparent: true,
            opacity: 0.3 * (1 - i / 8),
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        sprite.position.z = SHIP_Z;
        sprite.scale.setScalar(0.9 - i * 0.08);
        scene.add(sprite);
        trail.push(sprite);
      }
    }
    const history = [];

    /* --------------------------------- pools -------------------------------- */
    const gateGeo = new THREE.TorusGeometry(GATE_R, GATE_TUBE, 10, 44);
    const gates = [];
    for (let i = 0; i < 6; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: 0x2a0f1f,
        emissive: 0xff2f8e,
        emissiveIntensity: 0.55,
        metalness: 0.55,
        roughness: 0.35,
      });
      const group = new THREE.Group();
      group.add(new THREE.Mesh(gateGeo, material));
      const first = i === 0;
      group.position.set(
        first ? 0 : (Math.random() - 0.5) * 1.8,
        first ? 0 : (Math.random() - 0.5) * 1.8,
        -60 - i * 22,
      );
      group.userData.spin = (Math.random() - 0.5) * 0.6;
      scene.add(group);
      gates.push({
        group,
        z: group.position.z,
        prevZ: group.position.z,
        checked: false,
        hit: false,
      });
    }

    const orbGeo = new THREE.IcosahedronGeometry(0.2, 0);
    const orbs = [];
    for (let i = 0; i < 9; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: 0x1a2a08,
        emissive: 0xb9ff4d,
        emissiveIntensity: 1.4,
        metalness: 0.4,
        roughness: 0.3,
      });
      const mesh = new THREE.Mesh(orbGeo, material);
      mesh.position.set(0, 0, -16 - i * 13);
      scene.add(mesh);
      orbs.push({ mesh, z: mesh.position.z, prevZ: mesh.position.z, checked: true });
    }

    /* ------------------------------- particles ------------------------------- */
    const particles = [];
    if (glowTex) {
      for (let i = 0; i < 26; i++) {
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        sprite.visible = false;
        scene.add(sprite);
        particles.push({ sprite, vx: 0, vy: 0, vz: 0, life: 0, ttl: 1 });
      }
    }
    function burst(position, colour, count, power) {
      let spawned = 0;
      for (const particle of particles) {
        if (spawned >= count) break;
        if (particle.life > 0) continue;
        spawned++;
        particle.life = particle.ttl = 0.5 + Math.random() * 0.5;
        particle.sprite.visible = true;
        particle.sprite.position.copy(position);
        particle.sprite.material.color.set(colour);
        particle.sprite.material.opacity = 1;
        particle.sprite.scale.setScalar(0.35 + Math.random() * 0.5);
        particle.vx = (Math.random() - 0.5) * power;
        particle.vy = (Math.random() - 0.5) * power;
        particle.vz = (Math.random() - 0.5) * power + 1;
      }
    }

    /* --------------------------------- state -------------------------------- */
    let speed = 17;
    let distance = 0;
    let orbCount = 0;
    let score = 0;
    let time = 0;
    let dead = false;
    let shake = 0;
    let trailHold = 0;
    let nextOrbGap = 14;

    const target = new THREE.Vector2(0, 0);
    const shipPos = new THREE.Vector2(0, 0);

    function clampShip(x, y) {
      const radius = Math.hypot(x, y);
      if (radius > MAX_R) {
        x = (x / radius) * MAX_R;
        y = (y / radius) * MAX_R;
      }
      return [x, y];
    }

    function placeGate(gate, z) {
      const angle = Math.random() * Math.PI * 2;
      const offset = 0.45 + Math.random() * 1.25;
      gate.group.position.set(Math.cos(angle) * offset, Math.sin(angle) * offset, z);
      gate.z = z;
      gate.prevZ = z;
      gate.checked = false;
      gate.group.userData.spin = (Math.random() - 0.5) * 1.1;
    }

    function placeOrb(orb, z) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * (MAX_R - 0.2);
      orb.mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
      orb.mesh.visible = true;
      orb.z = z;
      orb.prevZ = z;
      orb.checked = false;
    }

    for (const gate of gates) {
      gate.checked = false;
    }

    /* --------------------------------- input -------------------------------- */
    let dragging = false;
    let lastPointer = null;
    const onDown = (event) => {
      dragging = true;
      lastPointer = { x: event.clientX, y: event.clientY };
      ctx.stage.setPointerCapture?.(event.pointerId);
    };
    const onMove = (event) => {
      if (!dragging || dead) return;
      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;
      lastPointer = { x: event.clientX, y: event.clientY };
      const scale = 4.6 / Math.max(ctx.width, 320);
      target.x += dx * scale;
      target.y -= dy * scale;
      const [x, y] = clampShip(target.x, target.y);
      target.set(x, y);
    };
    const onUp = () => {
      dragging = false;
      lastPointer = null;
    };
    const keys = new Set();
    const onKeyDown = (event) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(event.key)) {
        keys.add(event.key);
        event.preventDefault();
      }
    };
    const onKeyUp = (event) => keys.delete(event.key);

    ctx.stage.addEventListener('pointerdown', onDown);
    ctx.stage.addEventListener('pointermove', onMove);
    ctx.stage.addEventListener('pointerup', onUp);
    ctx.stage.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    /* --------------------------------- loop --------------------------------- */
    function crash() {
      dead = true;
      shake = 0.55;
      ctx.haptic([40, 60, 90]);
      ctx.audio.tone({ freq: 220, freqEnd: 40, dur: 0.7, type: 'sawtooth', gain: 0.1 });
      ctx.audio.noise({ dur: 0.6, gain: 0.08, freq: 220 });
      burst(ship.position, 0xff2f8e, 16, 9);
      burst(ship.position, 0x22e1ff, 10, 7);
      ship.visible = false;
      for (const sprite of trail) sprite.material.opacity = 0;
      ctx.gameOver({ score, delay: 1.25, note: 'Clipped a gate. The tunnel keeps going without you.' });
    }

    function update(dt) {
      time += dt;
      const alive = !dead;
      if (alive) {
        speed = 17 + Math.min(23, distance / 130);
        distance += speed * dt;
        score = Math.floor(distance * 0.5 + orbCount * 15);
        ctx.setScore(score);
      }

      /* keyboard steering */
      if (alive) {
        const push = 3.4 * dt;
        if (keys.has('ArrowLeft') || keys.has('a')) target.x -= push;
        if (keys.has('ArrowRight') || keys.has('d')) target.x += push;
        if (keys.has('ArrowUp') || keys.has('w')) target.y += push;
        if (keys.has('ArrowDown') || keys.has('s')) target.y -= push;
        const [cx, cy] = clampShip(target.x, target.y);
        target.set(cx, cy);
      }

      const follow = Math.min(1, dt * 11);
      shipPos.x += (target.x - shipPos.x) * follow;
      shipPos.y += (target.y - shipPos.y) * follow;
      ship.position.set(shipPos.x, shipPos.y, SHIP_Z);
      if (alive) {
        ship.rotation.z = -(target.x - shipPos.x) * 0.9;
        ship.rotation.x = (target.y - shipPos.y) * 0.55;
        ship.rotation.y = Math.sin(time * 2.4) * 0.05;
      }

      /* trail history */
      history.unshift({ x: ship.position.x, y: ship.position.y });
      if (history.length > trail.length * 3) history.pop();
      trail.forEach((sprite, index) => {
        const sample = history[index * 2];
        if (sample) {
          sprite.position.x += (sample.x - sprite.position.x) * 0.5;
          sprite.position.y += (sample.y - sprite.position.y) * 0.5;
          sprite.position.z = SHIP_Z + 0.5 + index * 0.22;
        }
        sprite.material.opacity = alive ? 0.26 * (1 - index / trail.length) : 0;
      });

      /* tunnel scroll */
      tunnel.rotation.z += dt * 0.1;
      for (const ring of rings) {
        ring.position.z += speed * dt;
        if (ring.position.z > 2) ring.position.z -= RING_COUNT * RING_SPACING;
        const near = 1 - Math.min(1, Math.abs(ring.position.z - SHIP_Z) / 12);
        ring.material.opacity = 0.45 + near * 0.4;
      }

      /* dust */
      for (let i = 0; i < DUST; i++) {
        dustPos[i * 3 + 2] += speed * dt * dustSpeed[i] * 1.6;
        if (dustPos[i * 3 + 2] > 1) dustPos[i * 3 + 2] -= 112;
      }
      dustGeo.attributes.position.needsUpdate = true;

      /* gates */
      for (const gate of gates) {
        gate.prevZ = gate.z;
        gate.z += speed * dt;
        gate.group.position.z = gate.z;
        gate.group.rotation.z += gate.group.userData.spin * dt;

        if (alive && !gate.checked && gate.prevZ < SHIP_Z && gate.z >= SHIP_Z) {
          gate.checked = true;
          const dx = ship.position.x - gate.group.position.x;
          const dy = ship.position.y - gate.group.position.y;
          const ringDistance = Math.hypot(dx, dy);
          if (Math.abs(ringDistance - GATE_R) < GATE_TUBE + SHIP_R) {
            crash();
          } else {
            ctx.audio.tone({ freq: 420 + Math.random() * 80, dur: 0.06, type: 'sine', gain: 0.03 });
          }
        }

        if (gate.z > 6) {
          let farthest = 0;
          for (const other of gates) farthest = Math.min(farthest, other.z);
          const gap = Math.min(30, Math.max(15, speed * (0.8 + Math.random() * 0.45)));
          placeGate(gate, farthest - gap);
        }
      }

      /* orbs */
      for (const orb of orbs) {
        orb.prevZ = orb.z;
        orb.z += speed * dt;
        orb.mesh.position.z = orb.z;
        orb.mesh.rotation.x += dt * 1.5;
        orb.mesh.rotation.y += dt * 2;

        if (alive && !orb.checked && orb.prevZ < SHIP_Z && orb.z >= SHIP_Z) {
          orb.checked = true;
          const distanceToShip = Math.hypot(
            ship.position.x - orb.mesh.position.x,
            ship.position.y - orb.mesh.position.y,
          );
          if (distanceToShip < 0.65) {
            orbCount += 1;
            orb.mesh.visible = false;
            burst(orb.mesh.position, 0xb9ff4d, 6, 3);
            ctx.haptic(14);
            ctx.audio.tone({ freq: 720, freqEnd: 1080, dur: 0.12, type: 'triangle', gain: 0.06 });
          }
        }

        if (orb.mesh.visible && orb.z > SHIP_Z + 1.2) {
          // Passed the ship: stop it before it balloons into the camera near plane.
          orb.mesh.visible = false;
        }

        if (orb.z > 6) {
          let farthest = 0;
          for (const other of orbs) farthest = Math.min(farthest, other.z);
          nextOrbGap = Math.min(26, Math.max(10, speed * (0.4 + Math.random() * 0.55)));
          placeOrb(orb, farthest - nextOrbGap);
        }
      }

      /* particles */
      for (const particle of particles) {
        if (particle.life <= 0) continue;
        particle.life -= dt;
        particle.sprite.position.x += particle.vx * dt;
        particle.sprite.position.y += particle.vy * dt;
        particle.sprite.position.z += particle.vz * dt;
        particle.sprite.material.opacity = Math.max(0, particle.life / particle.ttl);
        if (particle.life <= 0) particle.sprite.visible = false;
      }

      /* camera */
      let roll = -shipPos.x * 0.045;
      let bob = Math.sin(time * 1.7) * 0.03;
      if (shake > 0) {
        shake = Math.max(0, shake - dt * 1.6);
        roll += (Math.random() - 0.5) * shake * 0.2;
        bob += (Math.random() - 0.5) * shake * 0.5;
      }
      camera.position.set(shipPos.x * 0.22, shipPos.y * 0.22 + bob, 0);
      camera.rotation.z = roll;
      camera.rotation.x = -shipPos.y * 0.02;
      camera.rotation.y = -shipPos.x * 0.02;
    }

    function render() {
      renderer.render(scene, camera);
    }

    function resize(width, height, dpr) {
      renderer.setPixelRatio(Math.min(dpr, 2));
      fit(width, height);
      ctx.width = width;
    }

    function dispose() {
      ctx.stage.removeEventListener('pointerdown', onDown);
      ctx.stage.removeEventListener('pointermove', onMove);
      ctx.stage.removeEventListener('pointerup', onUp);
      ctx.stage.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      scene.traverse((node) => {
        if (node.material) node.material.dispose?.();
        if (node.geometry && node.geometry !== ringGeo) node.geometry.dispose?.();
      });
      ringGeo.dispose();
      ringMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      glowTex?.dispose?.();
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
    }

    return { update, render, resize, dispose };
  },
};
