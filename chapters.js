// ============================================================
// ENGAWA — chapters.js
// All scroll choreography. Two rules keep this file sane:
//
// 1. Discrete tweens (enter/leaveBack) own `viz` — they only run
//    while an opaque chapter covers the canvas, so nobody sees
//    the state switch.
// 2. Scrubbed triggers only ever tween `scrub.build` / `scrub.spread`,
//    proxies that rest at 0. ScrollTrigger renders scrubbed
//    animations at progress 0 on its initial refresh; because the
//    proxies' from-value equals their resting value, that render
//    is a no-op instead of stomping the hero state. The camera
//    composition lives in scene.js.
//
// The journey:
//   00 hero      assembly 1, materiality 0   (ghost wireframe, drifting)
//   01 manifesto (covered) → viz eases to the dismantled technical state
//   02 system    scrub.build 0 → 1           (the pinned assembly)
//   03 config    materiality → 1, glow on    (fully material, lit)
//   04–06        (covered — state holds)
//   07 begin     scrub.spread 0 → 1          (pull back to the settlement)
// ============================================================

import { viz, scrub } from './scene.js';
import { setCounter } from './cursor.js';

let introFn = null;

// Called by main.js the moment the visitor steps through the gate.
export function playIntro() {
  introFn?.();
}

export function initChapters() {
  // ---- Chapter counter: runs in every context, motion or not ----
  document.querySelectorAll('.chapter').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => {
        if (self.isActive) setCounter(section.dataset.chapter);
      },
    });
  });

  const mm = gsap.matchMedia();
  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      if (ctx.conditions.reduce) return setupReduced();
      return setupMotion();
    }
  );
}

// ============================================================
// Full-motion choreography
// ============================================================
function setupMotion() {
  // ---- Ch.00 · intro, played once the threshold lifts ----
  introFn = () => {
    const split = SplitText.create('.hero__mark', { type: 'chars' });
    gsap.from(split.chars, {
      yPercent: 110,
      opacity: 0,
      duration: 0.9,
      stagger: 0.05, // letter-by-letter — the Rose Island logo reveal, borrowed
      ease: 'power3.out',
      onComplete: () => split.revert(),
    });
    gsap.from(['.hero__tagline', '.hero__coord', '.hero__cue'], {
      opacity: 0,
      y: 14,
      duration: 1,
      delay: 0.55,
      stagger: 0.12,
      ease: 'power2.out',
    });
  };

  // ---- Ch.01 · while the opaque manifesto covers the canvas, ease the
  // model to its Ch.02 starting state (dismantled, distant, technical).
  // A plain tween, not a scrub: nobody can see the change happen. ----
  const heroState = { assembly: 1, materiality: 0, orbit: 0.55, dist: 15, height: 3.6, targetY: 1.6, fog: 0.045, haze: 1, drift: 1 };
  const techState = { assembly: 0, materiality: 0.15, orbit: 2.6, dist: 16.5, height: 5, targetY: 2, fog: 0.03, haze: 0.3, drift: 0.3 };
  ScrollTrigger.create({
    trigger: '#ch-01',
    start: 'top 60%',
    onEnter: () => gsap.to(viz, { ...techState, duration: 0.8 }),
    onLeaveBack: () => gsap.to(viz, { ...heroState, duration: 0.8 }),
  });

  // ---- Ch.01 · the broken headline, revealed line by line on scrub ----
  const linesTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.manifesto__stack',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
    },
  });
  gsap.utils.toArray('.mline').forEach((line, i) => {
    linesTl.fromTo(
      line,
      { autoAlpha: 0, yPercent: 32 },
      { autoAlpha: 1, yPercent: 0, duration: 0.22, ease: 'power2.out' },
      i * 0.3
    );
  });
  linesTl.to({}, { duration: 0.1 }); // hold the finished headline briefly

  // Manifesto prose: one gentle rise per block, then leave it alone.
  gsap.from(['.manifesto__para', '.manifesto__pull'], {
    autoAlpha: 0,
    y: 36,
    duration: 0.9,
    stagger: 0.15,
    ease: 'power2.out',
    scrollTrigger: { trigger: '.manifesto__body', start: 'top 75%' },
  });

  // ---- Ch.02 · the pinned assembly. Scroll position IS the build state,
  // so scrolling up genuinely takes the building apart again. ----
  const system = document.querySelector('.system');
  system.classList.add('system--pinned'); // switches callouts to overlay layout

  const buildTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.system',
      start: 'top top',
      end: 'bottom bottom',
      pin: '.system__pin',
      pinSpacing: false, // the section's 500vh already reserves the room
      anticipatePin: 1,
      scrub: 0.9,
    },
  });
  // One proxy drives assembly AND the camera push-in (composed in scene.js).
  buildTl.fromTo(
    scrub,
    { build: 0 },
    { build: 1, duration: 1, ease: 'none', immediateRender: false },
    0
  );

  // Five callouts, each owning a fifth of the scrub — synced to its phase.
  // (Their resting state in pinned mode is hidden via CSS, so the initial
  // progress-0 render agrees with what's already on screen.)
  gsap.utils.toArray('.callout').forEach((callout, i) => {
    buildTl.fromTo(
      callout,
      { autoAlpha: 0, y: 26 },
      { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power2.out', immediateRender: false },
      i * 0.2 + 0.03
    );
    if (i < 4) {
      buildTl.to(callout, { autoAlpha: 0, y: -20, duration: 0.04 }, i * 0.2 + 0.16);
    }
  });

  // ---- Ch.03 · materialize. The same object, now matte and lit.
  // Targets are pre-offset for scrub.build = 1 (see BUILD in scene.js):
  // shown orbit 5.75, dist 11, height 2.7, targetY 1.7. ----
  ScrollTrigger.create({
    trigger: '#ch-03',
    start: 'top 70%',
    onEnter: () =>
      gsap.to(viz, {
        materiality: 1, glow: 1,
        orbit: 4.45, dist: 15, height: 4.5, targetY: 1.5,
        fog: 0.02, haze: 0.18,
        duration: 1.1, ease: 'power2.inOut',
      }),
    onLeaveBack: () =>
      gsap.to(viz, {
        materiality: 0.15, glow: 0,
        orbit: 2.6, dist: 16.5, height: 5, targetY: 2,
        fog: 0.03, haze: 0.3,
        duration: 0.8,
      }),
  });

  // ---- Ch.05 · count-ups: the only place numbers are allowed to move ----
  gsap.utils.toArray('.stat__num').forEach((el) => {
    const end = Number(el.dataset.count);
    const proxy = { v: 0 };
    gsap.to(proxy, {
      v: end,
      duration: 1.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => {
        el.textContent = Math.round(proxy.v).toLocaleString('en-US');
      },
    });
  });

  // ---- Ch.06 · field notes settle in one at a time ----
  gsap.from('.note', {
    autoAlpha: 0,
    y: 30,
    duration: 0.8,
    stagger: 0.18,
    ease: 'power2.out',
    scrollTrigger: { trigger: '.notes__strip', start: 'top 80%' },
  });

  // ---- Ch.07 · the payoff: pull back, multiply into a settlement.
  // One proxy again — spread, camera pull-back and haze all composed. ----
  gsap.timeline({
    scrollTrigger: {
      trigger: '#ch-07',
      start: 'top bottom',
      end: 'center center',
      scrub: 1,
    },
  }).fromTo(
    scrub,
    { spread: 0 },
    { spread: 1, duration: 1, ease: 'none', immediateRender: false },
    0
  );

  // Cleanup for when this matchMedia context is torn down.
  return () => {
    system.classList.remove('system--pinned');
    introFn = null;
  };
}

// ============================================================
// Reduced motion: genuinely calmer, not merely faster (§8).
// The model stands fully built and material from the first frame;
// there are no pins, scrubs, splits, or count-ups. The single
// concession is a slow crossfade to the settlement in Ch.07.
// ============================================================
function setupReduced() {
  gsap.set(viz, {
    assembly: 1,
    materiality: 1,
    glow: 1,
    drift: 0,
    haze: 0.45,
    orbit: 0.9,
    dist: 13.5,
    height: 3.2,
    targetY: 1.7,
    fog: 0.03,
  });

  ScrollTrigger.create({
    trigger: '#ch-07',
    start: 'top 70%',
    onEnter: () => gsap.to(scrub, { spread: 1, duration: 1.4, ease: 'power2.inOut' }),
    onLeaveBack: () => gsap.to(scrub, { spread: 0, duration: 1 }),
  });

  introFn = null; // the threshold's own fade is reveal enough
}
