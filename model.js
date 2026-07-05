// ============================================================
// ENGAWA — model.js
// EN-01 as an architectural model built from primitives (§6):
// a box volume on slender cylinder piers, shallow roof with deep
// overhang, one glass threshold wall. Every mesh is a unit
// primitive positioned/scaled by a layout function, so the
// configurator can resize the footprint by tweening two numbers.
//
// The model has five assembly phases (piers → frame → skin →
// glass → systems) driven by viz.assembly, and a wireframe ⇄
// matte crossfade driven by viz.materiality. In Ch.07 a small
// settlement (clones + trees) fades in with viz.spread.
// ============================================================

import * as THREE from 'three';
import { onTick } from './scene.js';

// ---- Shared unit geometries (scaled per mesh, never rebuilt) ----
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const BOX_EDGES = new THREE.EdgesGeometry(UNIT_BOX);
const CYL_EDGES = new THREE.EdgesGeometry(UNIT_CYL, 30);
const PLANE_EDGES = new THREE.EdgesGeometry(UNIT_PLANE);

// ---- Configurator material definitions (colors derived from tokens) ----
const CLADDING = {
  charred: { color: 0x1b1712, roughness: 0.92, metalness: 0.0 },  // yakisugi
  raw:     { color: 0xc7b48e, roughness: 0.85, metalness: 0.0 },  // hinoki, darkened
  copper:  { color: 0x4e7c74, roughness: 0.45, metalness: 0.72 }, // verdigris, literally
};
const INTERIOR = {
  hinoki: { floor: 0xcfc0a0, glow: 0xe8dfc8 }, // warm cypress
  ash:    { floor: 0x9a958a, glow: 0xc9cec9 }, // cool weathered gray
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (p) => 1 - Math.pow(1 - p, 3);

export function initModel(scene, quality) {
  // Registry: every material the configurator must recolor, across the
  // main dwelling AND the settlement clones, so a copper choice in Ch.03
  // is still copper when the camera pulls back in Ch.07.
  const registry = { cladding: [], floor: [], glow: [] };

  const dims = { w: 6.4, d: 6.6 }; // 42 m² default
  const main = buildDwelling({ dims, edges: true, registry });
  scene.add(main.group);

  // ---- Settlement: 2–3 more units at fixed sizes, plus a treeline ----
  const settlement = new THREE.Group();
  settlement.visible = false;
  const cloneMats = [];
  const cloneDefs = [
    { dims: { w: 5.2, d: 5.4 }, pos: [-10, 0, -8], rot: 0.6,  scl: 0.95 },
    { dims: { w: 7.6, d: 7.7 }, pos: [9.5, 0, -10], rot: -0.5, scl: 0.9 },
    { dims: { w: 6.4, d: 6.6 }, pos: [14.5, 0, 2],  rot: 2.5,  scl: 0.85 },
  ].slice(0, quality.clones);

  const clones = cloneDefs.map((def) => {
    const clone = buildDwelling({ dims: def.dims, edges: false, registry });
    clone.group.position.set(...def.pos);
    clone.group.rotation.y = def.rot;
    clone.group.scale.setScalar(def.scl);
    clone.parts.forEach((part) => {
      part.solidMats.forEach((m) => cloneMats.push(m));
    });
    settlement.add(clone.group);
    return clone;
  });

  const trees = makeTreeline(quality.clones === 3 ? 16 : 9);
  trees.forEach((t) => settlement.add(t.mesh));
  scene.add(settlement);

  // ---- Per-frame state application ----
  onTick((viz) => {
    // Main dwelling: assembly + wireframe/material crossfade.
    main.parts.forEach((part, i) => {
      const p = clamp01((viz.assembly - i * 0.2) / 0.2);
      const e = easeOut(p);
      part.group.position.set(
        part.offset.x * (1 - e),
        part.offset.y * (1 - e),
        part.offset.z * (1 - e)
      );
      part.group.visible = p > 0.001;

      // Lines carry the ghost state; a trace of them survives into the
      // material state so it still reads as a working model, not a render.
      const lineO = p * (0.85 - 0.69 * viz.materiality);
      part.lineMats.forEach((m) => {
        m.opacity = lineO;
        m.visible = lineO > 0.004;
      });
      part.solidMats.forEach((m) => {
        let o = p * viz.materiality * m.userData.baseO;
        if (m.userData.isGlow) o *= viz.glow;
        m.opacity = o;
        m.visible = o > 0.004;
      });
    });

    // Settlement: everything scales/fades on viz.spread.
    settlement.visible = viz.spread > 0.002;
    if (settlement.visible) {
      const s = easeOut(viz.spread);
      cloneMats.forEach((m) => {
        let o = m.userData.baseO * s;
        if (m.userData.isGlow) o *= viz.glow;
        m.opacity = o;
        m.visible = o > 0.004;
      });
      trees.forEach((t) => t.mesh.scale.setScalar(t.scale * s));
    }
  });

  // ---- Configurator API ----
  const api = {
    setCladding(key) {
      const def = CLADDING[key];
      registry.cladding.forEach((m) => {
        m.color.setHex(def.color);
        m.roughness = def.roughness;
        m.metalness = def.metalness;
      });
    },
    setInterior(key) {
      const def = INTERIOR[key];
      registry.floor.forEach((m) => m.color.setHex(def.floor));
      registry.glow.forEach((m) => m.color.setHex(def.glow));
    },
    setFootprint({ w, d, piers }, animate = true) {
      main.midPiers.forEach((p) => (p.visible = piers >= 6));
      gsap.to(dims, {
        w, d,
        duration: animate ? 0.9 : 0,
        ease: 'power3.inOut',
        onUpdate: () => main.layout(dims),
      });
    },
  };
  return api;
}

// ============================================================
// buildDwelling — one EN-01. Returns its parts (in assembly
// order), a layout(dims) function, and the mid piers that hide
// at the 28 m² footprint.
// ============================================================
function buildDwelling({ dims, edges, registry }) {
  const group = new THREE.Group();
  const parts = [];
  const layoutFns = [];
  const midPiers = [];

  // Every dwelling gets its own material instances so opacity can be
  // driven independently (main model vs settlement clones).
  const mat = (opts, baseO = 1, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0,
      polygonOffset: true, // keeps the edge lines from z-fighting the faces
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      ...opts,
    });
    m.userData = { baseO, ...extra };
    return m;
  };

  const pierMat = mat({ color: 0x565049, roughness: 0.5, metalness: 0.6 });
  const frameMat = mat({ color: 0xb3a37f, roughness: 0.8 });
  const claddingMat = mat({ ...CLADDING.charred });
  const floorMat = mat({ color: INTERIOR.hinoki.floor, roughness: 0.9 });
  const glassMat = mat(
    { color: 0x7ea8a0, roughness: 0.15, metalness: 0, side: THREE.DoubleSide, depthWrite: false },
    0.18
  );
  const mullionMat = mat({ color: 0x14110e, roughness: 0.85 });
  const solarMat = mat({ color: 0x24303d, roughness: 0.35, metalness: 0.4 });
  const glowM = new THREE.MeshBasicMaterial({
    color: INTERIOR.hinoki.glow,
    transparent: true,
    opacity: 0,
  });
  glowM.userData = { baseO: 0.32, isGlow: true };

  registry.cladding.push(claddingMat);
  registry.floor.push(floorMat);
  registry.glow.push(glowM);

  // Adds one mesh (+ optional edge lines) and remembers how to lay it out.
  const newPart = (offset) => {
    const part = {
      group: new THREE.Group(),
      offset: new THREE.Vector3(...offset),
      solidMats: [],
      lineMats: [],
    };
    if (edges) {
      part.lineMat = new THREE.LineBasicMaterial({
        color: 0xa8c0b8, // pale verdigris-ash — reads on dark and indigo alike
        transparent: true,
        opacity: 0,
      });
      part.lineMats.push(part.lineMat);
    }
    group.add(part.group);
    parts.push(part);
    return part;
  };

  const addMesh = (part, geom, edgeGeom, material, layoutFn) => {
    const mesh = new THREE.Mesh(geom, material);
    if (edges && edgeGeom) {
      mesh.add(new THREE.LineSegments(edgeGeom, part.lineMat));
    }
    if (!part.solidMats.includes(material)) part.solidMats.push(material);
    part.group.add(mesh);
    layoutFns.push(() => layoutFn(mesh, dims));
    return mesh;
  };

  // ---- Phase 01 · piers (rise from the ground) ----
  const piers = newPart([0, -2.4, 0]);
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 2; row++) {
      const m = addMesh(piers, UNIT_CYL, CYL_EDGES, pierMat, (mesh, d) => {
        const px = (col - 1) * (d.w / 2 - 0.75);
        const pz = (row === 0 ? -1 : 1) * (d.d / 2 - 0.75);
        mesh.position.set(px, 0.575, pz);
        mesh.scale.set(0.18, 1.15, 0.18);
      });
      if (col === 1) midPiers.push(m); // the middle pair hides at 28 m²
    }
  }

  // ---- Phase 02 · frame (floor slab, posts, beams — descends) ----
  const frame = newPart([0, 3.4, 0]);
  addMesh(frame, UNIT_BOX, BOX_EDGES, frameMat, (mesh, d) => {
    mesh.position.set(0, 1.28, 0);
    mesh.scale.set(d.w - 0.15, 0.26, d.d - 0.15);
  });
  addMesh(frame, UNIT_PLANE, null, floorMat, (mesh, d) => {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 1.42, 0);
    mesh.scale.set(d.w - 0.6, d.d - 0.6, 1);
  });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addMesh(frame, UNIT_BOX, BOX_EDGES, frameMat, (mesh, d) => {
        mesh.position.set(sx * (d.w / 2 - 0.14), 2.76, sz * (d.d / 2 - 0.14));
        mesh.scale.set(0.16, 2.7, 0.16);
      });
    }
  }
  for (const sz of [-1, 1]) {
    addMesh(frame, UNIT_BOX, BOX_EDGES, frameMat, (mesh, d) => {
      mesh.position.set(0, 4.21, sz * (d.d / 2 - 0.14));
      mesh.scale.set(d.w, 0.2, 0.16);
    });
  }
  for (const sx of [-1, 1]) {
    addMesh(frame, UNIT_BOX, BOX_EDGES, frameMat, (mesh, d) => {
      mesh.position.set(sx * (d.w / 2 - 0.14), 4.21, 0);
      mesh.scale.set(0.16, 0.2, d.d - 0.6);
    });
  }

  // ---- Phase 03 · skin (three charred walls + roof — descends) ----
  const skin = newPart([0, 4.2, 0]);
  addMesh(skin, UNIT_BOX, BOX_EDGES, claddingMat, (mesh, d) => {
    mesh.position.set(0, 2.76, -(d.d / 2 - 0.06));
    mesh.scale.set(d.w, 2.7, 0.12);
  });
  for (const sx of [-1, 1]) {
    addMesh(skin, UNIT_BOX, BOX_EDGES, claddingMat, (mesh, d) => {
      mesh.position.set(sx * (d.w / 2 - 0.06), 2.76, 0);
      mesh.scale.set(0.12, 2.7, d.d - 0.24);
    });
  }
  addMesh(skin, UNIT_BOX, BOX_EDGES, claddingMat, (mesh, d) => {
    // Deep overhang: 0.85 m past the walls on every side; shallow pitch.
    mesh.position.set(0, 4.42, 0);
    mesh.rotation.x = -0.04;
    mesh.scale.set(d.w + 1.7, 0.22, d.d + 1.7);
  });

  // ---- Phase 04 · the glass threshold wall (slides in from the front) ----
  const glass = newPart([0, 0, 6]);
  addMesh(glass, UNIT_PLANE, PLANE_EDGES, glassMat, (mesh, d) => {
    mesh.position.set(0, 2.76, d.d / 2 - 0.02);
    mesh.scale.set(d.w - 0.28, 2.7, 1);
  });
  for (const sx of [-1, 1]) {
    addMesh(glass, UNIT_BOX, BOX_EDGES, mullionMat, (mesh, d) => {
      mesh.position.set(sx * (d.w / 6), 2.76, d.d / 2 - 0.02);
      mesh.scale.set(0.07, 2.7, 0.07);
    });
  }

  // ---- Phase 05 · systems (solar, tank, interior glow — descends) ----
  const systems = newPart([0, 3.2, 0]);
  addMesh(systems, UNIT_BOX, BOX_EDGES, solarMat, (mesh, d) => {
    mesh.position.set(-d.w * 0.1, 4.62, 0);
    mesh.rotation.x = -0.04;
    mesh.scale.set(d.w * 0.55, 0.06, d.d * 0.42);
  });
  addMesh(systems, UNIT_CYL, CYL_EDGES, pierMat, (mesh, d) => {
    mesh.rotation.z = Math.PI / 2; // rain tank slung between the piers
    mesh.position.set(0, 0.62, 0.3);
    mesh.scale.set(0.7, d.w * 0.4, 0.7);
  });
  addMesh(systems, UNIT_BOX, null, glowM, (mesh, d) => {
    mesh.position.set(0, 2.7, 0);
    mesh.scale.set(d.w - 0.7, 2.3, d.d - 0.7);
  });
  systems.solidMats.push(glowM);

  const layout = () => layoutFns.forEach((fn) => fn());
  layout();

  return { group, parts, layout, midPiers };
}

// ============================================================
// makeTreeline — low-poly cedars: a cone on a stick. They only
// exist for the Ch.07 pull-back, scaled up from zero by spread.
// ============================================================
function makeTreeline(count) {
  const coneGeom = new THREE.ConeGeometry(1, 3, 7);
  const trunkGeom = new THREE.CylinderGeometry(0.08, 0.12, 1, 6);
  const coneMat = new THREE.MeshStandardMaterial({ color: 0x25403a, roughness: 1 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a221a, roughness: 1 });

  const trees = [];
  for (let i = 0; i < count; i++) {
    // Deterministic ring: no Math.random, so the treeline never flickers
    // between visits and stays out of the camera's front corridor.
    const angle = 2.2 + i * 0.31;
    const radius = 13 + (i % 5) * 3.4;
    const height = 2.2 + ((i * 7) % 5) * 0.55;

    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 0.5;
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.y = 1 + height / 2;
    cone.scale.set(height / 3.4, height / 3, height / 3.4);
    tree.add(trunk, cone);
    tree.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    tree.scale.setScalar(0);
    trees.push({ mesh: tree, scale: 0.9 + (i % 3) * 0.25 });
  }
  return trees;
}
