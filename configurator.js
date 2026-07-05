// ============================================================
// ENGAWA — configurator.js
// Chapter 03: the Dirty-Line homage, translated from font tester
// to dwelling tester. Three segmented radio groups drive the 3D
// model's materials/size and a mono spec read-out, live.
// Radios (not custom sliders) because the options are discrete —
// and the keyboard/screen-reader behavior comes for free.
// ============================================================

import { viz } from './scene.js';

// One row per footprint: real units on the spec sheet (§7).
const FOOTPRINTS = [
  { label: '28 M²', w: 5.2, d: 5.4, piers: 4, envelope: '5.2 × 5.4 × 3.3 M', pierSpec: '4 × ⌀168 MM STEEL', weight: '8,600 KG' },
  { label: '42 M²', w: 6.4, d: 6.6, piers: 6, envelope: '6.4 × 6.6 × 3.4 M', pierSpec: '6 × ⌀168 MM STEEL', weight: '11,400 KG' },
  { label: '58 M²', w: 7.6, d: 7.7, piers: 6, envelope: '7.6 × 7.7 × 3.4 M', pierSpec: '6 × ⌀168 MM STEEL', weight: '14,100 KG' },
];
const CLADDING_NAMES = {
  charred: 'YAKISUGI CEDAR',
  raw: 'RAW CEDAR, OILED',
  copper: 'STANDING-SEAM COPPER',
};
const INTERIOR_NAMES = {
  hinoki: 'HINOKI, WARM',
  ash: 'ASH, COOL',
};

export function initConfigurator(model) {
  const form = document.getElementById('config-form');
  const out = {
    footprint: document.getElementById('spec-footprint'),
    envelope: document.getElementById('spec-envelope'),
    cladding: document.getElementById('spec-cladding'),
    piers: document.getElementById('spec-piers'),
    interior: document.getElementById('spec-interior'),
    weight: document.getElementById('spec-weight'),
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // A small camera swing acknowledges each change, then settles back to
  // exactly where it was — net-zero so the Ch.07 scroll handoff stays true.
  const nudge = () => {
    if (reduceMotion) return;
    gsap.timeline()
      .to(viz, { orbit: '+=0.24', duration: 0.55, ease: 'sine.out' })
      .to(viz, { orbit: '-=0.24', duration: 0.9, ease: 'sine.inOut' });
  };

  form.addEventListener('change', (e) => {
    const { name, value } = e.target;

    if (name === 'cladding') {
      model.setCladding(value);
      out.cladding.textContent = CLADDING_NAMES[value];
    }
    if (name === 'interior') {
      model.setInterior(value);
      out.interior.textContent = INTERIOR_NAMES[value];
    }
    if (name === 'footprint') {
      const fp = FOOTPRINTS[Number(value)];
      model.setFootprint(fp, !reduceMotion);
      out.footprint.textContent = fp.label;
      out.envelope.textContent = fp.envelope;
      out.piers.textContent = fp.pierSpec;
      out.weight.textContent = fp.weight;
    }
    nudge();
  });
}
