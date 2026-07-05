// ============================================================
// ENGAWA — scroll.js
// Lenis momentum scrolling wired into GSAP's ticker (the current
// correct pattern: one clock, no competing rAF loops).
// Under prefers-reduced-motion we skip Lenis entirely — native
// scrolling *is* the calmer experience, and ScrollTrigger works
// fine without it.
// ============================================================

let lenis = null;

export function initScroll() {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return null;

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  // Lenis reports scroll → ScrollTrigger stays in sync;
  // GSAP's ticker drives Lenis → a single shared clock.
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Held until the visitor steps through the threshold (main.js).
  lenis.stop();

  return lenis;
}

export function getLenis() {
  return lenis;
}
