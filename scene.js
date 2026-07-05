// ============================================================
// ENGAWA — scene.js
// One renderer, one camera, one fog. Two objects describe what
// the throughline looks like:
//
//   viz   — the base state. Owned by *discrete* tweens (chapter
//           enter/leave transitions that play while the canvas
//           is covered by an opaque chapter).
//   scrub — two scroll-scrubbed proxies that REST AT ZERO:
//           build  (Ch.02 assembly)   spread (Ch.07 settlement).
//
// Why the split: ScrollTrigger renders scrubbed animations at
// progress 0 during its initial refresh, so a scrubbed tween
// whose from-values differ from the load state would stomp the
// hero. A proxy resting at 0 renders 0 — a no-op. The render
// loop composes viz + scrub every frame, so scroll position is
// still the clock and scrolling backward genuinely reverses.
// ============================================================

import * as THREE from 'three';

export const viz = {
  assembly: 1,     // 0 → 1: the five build phases (hero starts fully formed)
  materiality: 0,  // 0 = ghost wireframe, 1 = matte architectural model
  glow: 0,         // warm interior light through the glass (Ch.03 on)

  orbit: 0.55,     // camera angle around the model, radians
  dist: 15,        // camera distance (multiplied by quality.camFit)
  height: 3.6,     // camera height
  targetY: 1.6,    // where the camera looks

  drift: 1,        // hero-only ambient drift; 0 under reduced motion
  fog: 0.045,      // FogExp2 density
  haze: 1,         // fog-sprite opacity multiplier (heavy in the hero)
};

export const scrub = { build: 0, spread: 0 };

// What each proxy adds on top of the base state. Constants chosen so
// Ch.02 ends on the technical close-up (orbit 2.6→3.9, dist 16.5→12.5)
// and Ch.07 ends on the wide settlement shot (dist 11→26, height 2.7→8).
const BUILD  = { orbit: 1.3, dist: -4,  height: -1.8, targetY: 0.2 };
const SPREAD = { orbit: 1.1, dist: 15,  height: 5.3,  targetY: -0.5, haze: 0.32 };

// The composed per-frame state handed to the model.
const frame = { assembly: 1, materiality: 0, glow: 0, spread: 0 };

let renderer, scene, camera;
const tickables = [];

export function onTick(fn) {
  tickables.push(fn);
}

export function initScene(canvas, quality) {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true, // the CSS fog gradient shows through behind everything
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  // Fog color sits between yakisugi and verdigris so distance reads
  // as damp air, not as black vignette.
  scene.fog = new THREE.FogExp2(0x131a17, viz.fog);

  camera = new THREE.PerspectiveCamera(
    38,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  // --- Soft three-point studio light, matte-friendly (§6) ---
  const sky = new THREE.HemisphereLight(0xe8dfc8, 0x14110e, 0.6);
  scene.add(sky);

  const key = new THREE.DirectionalLight(0xfff3e0, 1.15); // warm key
  key.position.set(6, 9, 7);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x4e7c74, 0.55); // verdigris rim
  rim.position.set(-7, 4, -6);
  scene.add(rim);

  // --- Ground: a wide matte disc for the piers to meet ---
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(90, 48),
    new THREE.MeshStandardMaterial({ color: 0x1a1712, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // --- Drifting fog sprites (the "volumetric" part, cheaply) ---
  const fogSprites = makeFogSprites(quality.fogSprites);
  fogSprites.forEach((s) => scene.add(s.sprite));

  // --- Render loop on GSAP's ticker: one clock for scroll + scene ---
  const camFit = quality.camFit;
  gsap.ticker.add((time) => {
    const b = scrub.build;
    const s = scrub.spread;

    frame.assembly = Math.min(1, Math.max(0, viz.assembly + b));
    frame.materiality = viz.materiality;
    frame.glow = viz.glow;
    frame.spread = s;

    const orbit = viz.orbit + BUILD.orbit * b + SPREAD.orbit * s;
    const dist = (viz.dist + BUILD.dist * b + SPREAD.dist * s) * camFit;
    const height = viz.height + BUILD.height * b + SPREAD.height * s;
    const targetY = viz.targetY + BUILD.targetY * b + SPREAD.targetY * s;
    const haze = viz.haze + SPREAD.haze * s;

    scene.fog.density = viz.fog;

    // Almost-imperceptible drift so the hero never sits dead still.
    const a = orbit + Math.sin(time * 0.07) * 0.05 * viz.drift;
    const h = height + Math.sin(time * 0.045) * 0.14 * viz.drift;
    camera.position.set(Math.sin(a) * dist, h, Math.cos(a) * dist);
    camera.lookAt(0, targetY, 0);

    fogSprites.forEach((fs, i) => {
      fs.sprite.position.x = fs.baseX + Math.sin(time * 0.05 + i * 1.7) * 1.8;
      fs.sprite.material.opacity = fs.baseO * haze;
    });

    tickables.forEach((fn) => fn(frame, time));
    renderer.render(scene, camera);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer };
}

// A soft radial blob drawn to a canvas — no texture files anywhere.
function makeFogSprites(count) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(160, 190, 180, 0.6)');
  grad.addColorStop(1, 'rgba(160, 190, 180, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(c);
  const sprites = [];
  for (let i = 0; i < count; i++) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    const sprite = new THREE.Sprite(material);
    // Scattered in a loose ring around the dwelling, low to the ground.
    const angle = (i / count) * Math.PI * 2 + 0.4;
    const radius = 7 + (i % 3) * 4.5;
    sprite.position.set(
      Math.sin(angle) * radius,
      0.8 + (i % 4) * 1.1,
      Math.cos(angle) * radius
    );
    const scale = 14 + (i % 3) * 8;
    sprite.scale.set(scale, scale * 0.55, 1);
    sprites.push({ sprite, baseX: sprite.position.x, baseO: 0.05 + (i % 3) * 0.02 });
  }
  return sprites;
}
