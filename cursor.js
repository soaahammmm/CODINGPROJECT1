// ============================================================
// ENGAWA — cursor.js
// The persistent chrome: custom cursor, chapter counter, and the
// film-grain tile. The grain is drawn to a canvas at runtime and
// set as a repeating background — zero image files, per §9.
// ============================================================

const counterEl = () => document.getElementById('counter-num');

// chapters.js calls this as each chapter crosses mid-viewport.
export function setCounter(num) {
  const el = counterEl();
  if (el && el.textContent !== num) el.textContent = num;
}

export function initChrome() {
  makeGrain();

  // Custom cursor only where it helps: fine pointers, motion allowed.
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (finePointer && !reduceMotion) makeCursor();
}

// ---------- film grain ----------
function makeGrain() {
  const size = 140;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    // mid-gray noise; the overlay blend mode turns it into tooth, not dirt
    const v = 110 + Math.random() * 110;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  document.querySelector('.grain').style.backgroundImage = `url(${c.toDataURL()})`;
}

// ---------- custom cursor ----------
function makeCursor() {
  document.body.classList.add('cursor-on');
  const dot = document.querySelector('.cursor__dot');
  const ring = document.querySelector('.cursor__ring');

  // quickTo = one persistent tween per property; far cheaper than
  // creating a new tween every mousemove.
  const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power2.out' });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power2.out' });
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.42, ease: 'power3.out' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.42, ease: 'power3.out' });

  // Invisible until the pointer actually moves — otherwise the pair
  // sits parked in the top-left corner on load.
  gsap.set([dot, ring], { opacity: 0 });
  let shown = false;

  window.addEventListener('pointermove', (e) => {
    if (!shown) {
      shown = true;
      gsap.set([dot, ring], { x: e.clientX, y: e.clientY });
      gsap.to([dot, ring], { opacity: 1, duration: 0.25 });
    }
    dotX(e.clientX); dotY(e.clientY);
    ringX(e.clientX); ringY(e.clientY);
  });

  // The ring swells over anything interactive.
  const INTERACTIVE = 'a, button, label, input, select, textarea, .gallery';
  document.addEventListener('pointerover', (e) => {
    if (e.target.closest(INTERACTIVE)) document.body.classList.add('cursor-hover');
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest(INTERACTIVE)) document.body.classList.remove('cursor-hover');
  });

  // Hide the pair when the pointer leaves the window entirely.
  document.addEventListener('pointerleave', () => gsap.to([dot, ring], { opacity: 0, duration: 0.2 }));
  document.addEventListener('pointerenter', () => gsap.to([dot, ring], { opacity: 1, duration: 0.2 }));
}
