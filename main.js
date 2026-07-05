// ============================================================
// ENGAWA — main.js
// Entry point. Init order matters:
//   scroll (Lenis/GSAP wiring) → scene (renderer) → model →
//   chapters (scroll choreography) → configurator → chrome.
// Also owns the threshold gate, the generated ambient sound,
// and the waitlist form — the three things with no better home.
// ============================================================

import { initScroll, getLenis } from './scroll.js';
import { initScene, viz } from './scene.js';
import { initModel } from './model.js';
import { initChapters, playIntro } from './chapters.js';
import { initConfigurator } from './configurator.js';
import { initChrome } from './cursor.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isNarrow = window.matchMedia('(max-width: 767px)').matches;

// The journey always begins at the threshold. Without this, a reload
// mid-page restores the old scroll position behind the gate, and every
// chapter-transition trigger above it would sit unfired — the model
// would be in the wrong state for wherever the visitor landed.
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

// Quality budget: phones get fewer fog sprites, fewer settlement clones,
// a lower pixel-ratio cap, and a camera that sits further back so the
// model fits a portrait viewport.
const quality = {
  dprCap: isNarrow ? 1.5 : 2,
  fogSprites: isNarrow ? 4 : 9,
  clones: isNarrow ? 2 : 3,
  camFit: isNarrow ? 1.35 : 1,
};

initScroll();
const { scene } = initScene(document.getElementById('webgl'), quality);
const model = initModel(scene, quality);
initChapters(model);
initConfigurator(model);
initChrome();

// ---------- Threshold gate ----------
// The site opens only when the visitor deliberately steps through.
// The percentage tracks two real milestones (fonts, first rendered
// frame) padded with a short ramp so it never snaps 0 → 100.
const threshold = document.getElementById('threshold');
const pctEl = document.getElementById('load-pct');
const enterBtn = document.getElementById('enter-btn');

const progress = { shown: 0, target: 12 };
gsap.ticker.add(() => {
  // ease the displayed number toward the target — a quiet count, not a bar
  progress.shown += (progress.target - progress.shown) * 0.06;
  pctEl.textContent = String(Math.round(progress.shown)).padStart(2, '0');
});

document.fonts.ready.then(() => { progress.target = Math.max(progress.target, 62); });

// One warm frame from the renderer means shaders are compiled.
requestAnimationFrame(() => requestAnimationFrame(() => {
  progress.target = Math.max(progress.target, 88);
}));

// Fallback: never strand the visitor on the gate (slow font CDN etc).
const armEnter = () => {
  if (!enterBtn.disabled) return;
  progress.target = 100;
  enterBtn.disabled = false;
  enterBtn.textContent = 'Step through';
};
Promise.race([
  document.fonts.ready,
  new Promise((r) => setTimeout(r, 4000)),
]).then(() => setTimeout(armEnter, 700));

enterBtn.addEventListener('click', () => {
  document.body.classList.remove('is-gated');
  // Chrome restores the old scroll position asynchronously, sometimes after
  // module execution — so the top is enforced here too, at the one moment
  // the journey can actually begin.
  window.scrollTo(0, 0);
  getLenis()?.start();
  getLenis()?.scrollTo(0, { immediate: true, force: true });
  // Refresh now, not after the fade: the gate is position:fixed so removing
  // it never reflows, and a refresh mid-scroll would swallow trigger
  // callbacks for anyone who starts scrolling during the fade.
  ScrollTrigger.refresh();

  gsap.to(threshold, {
    autoAlpha: 0,
    duration: reduceMotion ? 0.4 : 0.9,
    ease: 'power2.inOut',
    onComplete: () => threshold.remove(),
  });

  gsap.to('.chrome__counter', { opacity: 1, duration: 0.8, delay: 0.4 });
  playIntro();
  document.getElementById('main').focus({ preventScroll: true });
});

// ---------- Ambient sound (generated — there is no audio file) ----------
// A slow brown-noise wash through a low-pass filter plus two very quiet
// detuned drones. Built lazily on first toggle so no AudioContext exists
// until the visitor asks for one.
let audio = null;

function buildAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // Brown noise: integrate white noise, keep it leaky so it can't drift off.
  const seconds = 6;
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 220;
  lowpass.Q.value = 0.4;

  // A very slow LFO breathes the filter open and closed — wind, roughly.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 110;
  lfo.connect(lfoGain).connect(lowpass.frequency);

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.5;
  noise.connect(lowpass).connect(noiseGain).connect(master);

  // Two drones a rough fifth apart, barely audible under the wash.
  [55, 82.4].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = i * 4; // slight beat between the pair
    const g = ctx.createGain();
    g.gain.value = 0.05;
    osc.connect(g).connect(master);
    osc.start();
  });

  noise.start();
  lfo.start();
  return { ctx, master };
}

const soundBtn = document.getElementById('sound-btn');
const soundLabel = document.getElementById('sound-label');

soundBtn.addEventListener('click', async () => {
  const turningOn = soundBtn.getAttribute('aria-pressed') !== 'true';
  if (turningOn) {
    if (!audio) audio = buildAudio();
    await audio.ctx.resume();
    gsap.to(audio.master.gain, { value: 0.1, duration: 2 });
  } else if (audio) {
    gsap.to(audio.master.gain, {
      value: 0,
      duration: 0.8,
      onComplete: () => audio.ctx.suspend(),
    });
  }
  soundBtn.setAttribute('aria-pressed', String(turningOn));
  soundLabel.textContent = turningOn ? 'Sound on' : 'Sound off';
});

// ---------- Waitlist form ----------
// Validate honestly, then confirm. When the site is hosted on Netlify the
// submission also lands in Netlify Forms (see the form markup); anywhere
// else the fetch fails silently and the page behaves exactly the same —
// there is no other backend, the company is fictional.
const form = document.getElementById('waitlist');
const done = document.getElementById('form-done');

function validateField(input) {
  const wrap = input.closest('.field');
  const err = wrap.querySelector('.field__error');
  const ok = input.checkValidity();
  wrap.classList.toggle('field--invalid', !ok);
  if (err) err.hidden = ok;
  return ok;
}

// Validate on blur, not on every keystroke. Scoped to .field inputs so
// the hidden Netlify form-name field never enters the validation path.
form.querySelectorAll('.field input').forEach((input) => {
  input.addEventListener('blur', () => {
    if (input.value !== '') validateField(input);
  });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const inputs = [...form.querySelectorAll('.field input')];
  const allValid = inputs.map(validateField).every(Boolean);
  if (!allValid) {
    inputs.find((i) => !i.checkValidity())?.focus();
    return;
  }

  // Fire-and-forget to Netlify Forms; the confirmation never waits on it.
  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(new FormData(form)).toString(),
  }).catch(() => {});

  form.hidden = true;
  done.hidden = false;
  done.focus();
});

// Footer chapter index: route through Lenis when it exists so the jump
// keeps the site's momentum feel; fall back to native otherwise.
document.querySelectorAll('.footer__nav a').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
});
