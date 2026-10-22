import * as THREE from 'three';

/**
 * NEON STACK — tap to drop a sliding slab on the tower.
 * Overlap decides the new width; a dead-centre drop wins width back.
 * An orthographic camera keeps the whole swing in frame on any phone aspect.
 */

const SLAB_H = 0.5;
const MAX_WIDTH = 2.3;
const RANGE = 2.05;
const PERFECT = 0.085;
const PALETTE = ['#22e1ff', '#8f7dff', '#ff2f8e', '#ffc857', '#b9ff4d'];
const PENTA = [0, 2, 4, 7, 9];

export default {
  init(ctx) {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 240);
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
    renderer.toneMappingExposure = 1.15;
    ctx.stage.appendChild(renderer.domElement);

    const camOffset = new THREE.Vector3(9, 8.4, 11).normalize().multiplyScalar(26);
    let focusY = -1.1;
    let shake = 0;

    function fit(width, height) {
      const aspect = Math.max(0.3, width / Math.max(height, 1));
      const halfH = Math.max(4.6, 2.85 / aspect);
      const halfW = halfH * aspect;
      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    fit(ctx.width, ctx.height);

    /* ------------------------------- lighting ------------------------------ */
    scene.add(new THREE.HemisphereLight(0x9dc0ff, 0x080b14, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(7, 15, 9);
    scene.add(key);
    const rimA = new THREE.PointLight(0x22e1ff, 110, 70, 2);
    rimA.position.set(-10, 7, -7);
    scene.add(rimA);
    const rimB = new THREE.PointLight(0xff2f8e, 85, 70, 2);
    rimB.position.set(10, 2, -9);
    scene.add(rimB);

    /* ------------------------------- textures ------------------------------ */
    const loader = new THREE.TextureLoader();
    const glowUrl = ctx.assets.url('glow.png');
    const noiseUrl = ctx.assets.url('noise.png');
    const glowTex = glowUrl ? loader.load(glowUrl) : null;
    const noiseTex = noiseUrl ? loader.load(noiseUrl) : null;
    if (noiseTex) {
      noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
      noiseTex.repeat.set(4, 4);
    }
    if (glowTex) glowTex.colorSpace = THREE.SRGBColorSpace;

    /* -------------------------------- backdrop ----------------------------- */
    const starCount = 460;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starSpeeds = new Float32Array(starCount);
    const tint = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 44;
      starPos[i * 3 + 1] = Math.random() * 84 - 14;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 44 - 8;
      tint.set(PALETTE[i % PALETTE.length]).lerp(new THREE.Color('#ffffff'), 0.6);
      starCol[i * 3] = tint.r;
      starCol[i * 3 + 1] = tint.g;
      starCol[i * 3 + 2] = tint.b;
      starSpeeds[i] = 0.1 + Math.random() * 0.35;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.075,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    let halo = null;
    if (glowTex) {
      halo = new THREE.Mesh(
        new THREE.PlaneGeometry(17, 17),
        new THREE.MeshBasicMaterial({
          map: glowTex,
          color: 0x1a6a8a,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(0, 0.02, 0);
      scene.add(halo);

      const backlight = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0x1d5f86,
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      backlight.position.set(0, 10, -15);
      backlight.scale.setScalar(32);
      scene.add(backlight);
    }

    /* -------------------------------- materials ---------------------------- */
    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const edgeGeo = new THREE.EdgesGeometry(blockGeo);
    const materials = [];
    const geometries = [blockGeo, edgeGeo];

    function makeBlock(w, d, colourIndex) {
      const colour = new THREE.Color(PALETTE[colourIndex % PALETTE.length]);
      const material = new THREE.MeshStandardMaterial({
        color: colour,
        roughness: 0.55,
        metalness: 0.16,
        emissive: colour,
        emissiveIntensity: 0.14,
        bumpMap: noiseTex,
        bumpScale: 0.012,
      });
      materials.push(material);
      const mesh = new THREE.Mesh(blockGeo, material);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: colour.clone().lerp(new THREE.Color('#ffffff'), 0.55),
        transparent: true,
        opacity: 0.9,
      });
      materials.push(edgeMaterial);
      mesh.add(new THREE.LineSegments(edgeGeo, edgeMaterial));
      const group = new THREE.Group();
      group.add(mesh);
      group.scale.set(w, SLAB_H, d);
      return group;
    }

    /* --------------------------------- tower ------------------------------- */
    let topW = MAX_WIDTH;
    let topD = MAX_WIDTH;
    let topX = 0;
    let topZ = 0;
    let topY = SLAB_H;
    let level = 0;
    let axis = 'x';
    let slabPos = -RANGE;
    let dir = 1;
    let time = 0;
    let dead = false;
    const debris = [];
    const particles = [];
    const rings = [];

    const base = makeBlock(MAX_WIDTH * 1.3, MAX_WIDTH * 1.3, 1);
    base.position.set(0, SLAB_H / 2, 0);
    scene.add(base);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(2.35, 2.95, 0.3, 48, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x2a7ea1,
        transparent: true,
        opacity: 0.35,
        wireframe: true,
      }),
    );
    pedestal.position.y = -0.15;
    scene.add(pedestal);

    // neon floor: gives the empty space below the tower a horizon
    const grid = new THREE.GridHelper(90, 46, 0x1f5a72, 0x10222f);
    grid.position.y = -0.16;
    grid.material.transparent = true;
    grid.material.opacity = 0.5;
    grid.material.depthWrite = false;
    scene.add(grid);

    if (glowTex) {
      for (let i = 0; i < 14; i++) {
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

    function spawnSlab() {
      const slab = makeBlock(axis === 'x' ? topW : topD, axis === 'x' ? topD : topW, level + 2);
      slab.position.set(axis === 'x' ? slabPos : topX, topY + SLAB_H / 2, axis === 'z' ? slabPos : topZ);
      scene.add(slab);
      return slab;
    }
    let active = spawnSlab();

    function burst(position, colour, count, power = 3) {
      let spawned = 0;
      for (const particle of particles) {
        if (spawned >= count) break;
        if (particle.life > 0) continue;
        spawned++;
        particle.life = particle.ttl = 0.45 + Math.random() * 0.35;
        particle.sprite.visible = true;
        particle.sprite.position.copy(position);
        particle.sprite.material.color.set(colour);
        particle.sprite.material.opacity = 0.9;
        particle.sprite.scale.setScalar(0.5 + Math.random() * 0.7);
        particle.vx = (Math.random() - 0.5) * power;
        particle.vy = Math.random() * power * 0.9 + 0.6;
        particle.vz = (Math.random() - 0.5) * power;
      }
    }

    function popRing(position, colour) {
      const material = new THREE.MeshBasicMaterial({
        color: colour,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      materials.push(material);
      const geometry = new THREE.RingGeometry(0.55, 0.72, 48);
      geometries.push(geometry);
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(position);
      ring.position.y += 0.26;
      scene.add(ring);
      rings.push({ mesh: ring, life: 0.6, ttl: 0.6 });
    }

    function note(step) {
      const semi = PENTA[step % PENTA.length] + 12 * Math.floor((step % 15) / PENTA.length);
      return 220 * Math.pow(2, semi / 12);
    }

    function makeDebris(w, d, colourIndex, position, spin) {
      const piece = makeBlock(w, d, colourIndex);
      piece.position.copy(position);
      piece.traverse((node) => {
        if (node.material) node.material.transparent = true;
      });
      scene.add(piece);
      debris.push({ mesh: piece, vy: 0.7, spin, life: 2.4 });
    }

    function drop() {
      if (dead) return;
      const along = axis === 'x' ? slabPos - topX : slabPos - topZ;
      const span = axis === 'x' ? topW : topD;
      const overlap = span - Math.abs(along);

      if (overlap <= 0.035) {
        dead = true;
        const fall = active;
        active = null;
        if (fall) {
          fall.traverse((node) => {
            if (node.material) node.material.transparent = true;
          });
          debris.push({ mesh: fall, vy: 0.35, spin: (Math.random() - 0.5) * 4, life: 2.4 });
        }
        shake = 0.45;
        ctx.haptic([26, 50, 26]);
        ctx.audio.tone({ freq: 190, freqEnd: 48, dur: 0.5, type: 'sawtooth', gain: 0.09 });
        ctx.audio.noise({ dur: 0.35, gain: 0.05, freq: 320 });
        ctx.gameOver({ score: level, delay: 1.2, note: 'The slab missed the tower entirely.' });
        return;
      }

      const perfect = Math.abs(along) < PERFECT;
      const newSpan = perfect ? Math.min(MAX_WIDTH, span + 0.045) : overlap;
      const oldCentre = axis === 'x' ? topX : topZ;
      const newCentre = perfect ? oldCentre : oldCentre + along / 2;

      if (!perfect && Math.abs(along) > 0.02) {
        const sign = Math.sign(along);
        const width = Math.abs(along);
        const centre = oldCentre + sign * (span / 2 + width / 2);
        const position = new THREE.Vector3(
          axis === 'x' ? centre : topX,
          topY + SLAB_H / 2,
          axis === 'z' ? centre : topZ,
        );
        makeDebris(
          axis === 'x' ? width : topD,
          axis === 'z' ? width : topW,
          level + 4,
          position,
          sign * (1.2 + Math.random()),
        );
      }

      if (axis === 'x') {
        topX = newCentre;
        topW = newSpan;
      } else {
        topZ = newCentre;
        topD = newSpan;
      }
      topY += SLAB_H;
      level += 1;
      active.position.set(topX, topY - SLAB_H / 2, topZ);
      active.scale.set(topW, SLAB_H, topD);
      active = null;

      ctx.setScore(level);
      ctx.haptic(perfect ? [10, 24, 10] : 8);

      const top = new THREE.Vector3(topX, topY, topZ);
      if (perfect) {
        ctx.audio.tone({ freq: note(level), dur: 0.14, type: 'triangle', gain: 0.075 });
        ctx.audio.tone({ freq: note(level) * 1.5, dur: 0.16, type: 'sine', gain: 0.045, delay: 0.02 });
        popRing(top, 0xb9ff4d);
        burst(top, 0xb9ff4d, 8, 2.6);
        key.intensity = 3.2;
      } else {
        ctx.audio.tone({ freq: note(level), dur: 0.12, type: 'square', gain: 0.05 });
        burst(top, PALETTE[level % PALETTE.length], 4, 1.6);
        key.intensity = 2.4;
      }

      axis = axis === 'x' ? 'z' : 'x';
      slabPos = -RANGE;
      dir = 1;
      active = spawnSlab();
    }

    const onPointer = (event) => {
      if (event.cancelable) event.preventDefault();
      drop();
    };
    const onKey = (event) => {
      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'ArrowDown') {
        event.preventDefault();
        drop();
      }
    };
    ctx.stage.addEventListener('pointerdown', onPointer, { passive: false });
    window.addEventListener('keydown', onKey);

    function update(dt) {
      time += dt;
      const speed = Math.min(2.7, 1.15 + level * 0.06);
      key.intensity += (2.2 - key.intensity) * Math.min(1, dt * 4);

      if (active) {
        slabPos += dir * speed * dt;
        if (slabPos > RANGE) {
          slabPos = RANGE;
          dir = -1;
        } else if (slabPos < -RANGE) {
          slabPos = -RANGE;
          dir = 1;
        }
        if (axis === 'x') {
          active.position.x = slabPos;
          active.position.z = topZ;
        } else {
          active.position.z = slabPos;
          active.position.x = topX;
        }
        active.position.y = topY + SLAB_H / 2;
      }

      for (let i = debris.length - 1; i >= 0; i--) {
        const piece = debris[i];
        piece.life -= dt;
        piece.vy -= 17 * dt;
        piece.mesh.position.y += piece.vy * dt;
        piece.mesh.rotation.x += piece.spin * dt;
        piece.mesh.rotation.z += piece.spin * dt * 0.6;
        const fade = Math.min(1, Math.max(0, piece.life / 0.9));
        piece.mesh.traverse((node) => {
          if (node.material) node.material.opacity = fade;
        });
        if (piece.life <= 0) {
          scene.remove(piece.mesh);
          debris.splice(i, 1);
        }
      }

      for (const particle of particles) {
        if (particle.life <= 0) continue;
        particle.life -= dt;
        particle.vy -= 5 * dt;
        particle.sprite.position.x += particle.vx * dt;
        particle.sprite.position.y += particle.vy * dt;
        particle.sprite.position.z += particle.vz * dt;
        particle.sprite.material.opacity = Math.max(0, particle.life / particle.ttl) * 0.9;
        if (particle.life <= 0) particle.sprite.visible = false;
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.life -= dt;
        const t = 1 - ring.life / ring.ttl;
        ring.mesh.scale.setScalar(1 + t * 2.6);
        ring.mesh.material.opacity = Math.max(0, (1 - t) * 0.8);
        if (ring.life <= 0) {
          scene.remove(ring.mesh);
          rings.splice(i, 1);
        }
      }

      const target = topY - 1.15;
      focusY += (target - focusY) * Math.min(1, dt * 5);
      let sway = Math.sin(time * 0.35) * 0.35;
      let lift = Math.cos(time * 0.27) * 0.25;
      if (shake > 0) {
        shake = Math.max(0, shake - dt * 1.4);
        sway += (Math.random() - 0.5) * shake;
        lift += (Math.random() - 0.5) * shake;
      }
      camera.position.set(camOffset.x + sway, focusY + camOffset.y + lift, camOffset.z + sway);
      camera.lookAt(0, focusY + 0.55, 0);

      for (let i = 0; i < starCount; i++) {
        starPos[i * 3 + 1] -= starSpeeds[i] * dt * (dead ? 0.4 : 1.7);
        if (starPos[i * 3 + 1] < topY - 18) starPos[i * 3 + 1] += 88;
      }
      starGeo.attributes.position.needsUpdate = true;

      rimA.position.y = topY + 4;
      rimB.position.y = topY + 1;
      pedestal.position.y = -0.15;
      if (halo) halo.position.set(0, topY, 0);
    }

    function render() {
      renderer.render(scene, camera);
    }

    function resize(width, height, dpr) {
      renderer.setPixelRatio(Math.min(dpr, 2));
      fit(width, height);
    }

    function dispose() {
      ctx.stage.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
      scene.traverse((node) => {
        if (node.isSprite) node.material?.dispose?.();
      });
      materials.forEach((material) => material.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      starGeo.dispose();
      starMat.dispose();
      grid.geometry.dispose();
      grid.material.dispose();
      glowTex?.dispose?.();
      noiseTex?.dispose?.();
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
    }

    return { update, render, resize, dispose };
  },
};
