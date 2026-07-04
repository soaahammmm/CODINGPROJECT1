# ENGAWA
*Dwellings for the space between.*

A one-page, scroll-driven brand site for a fictional off-grid dwelling — one 3D model, generated entirely in code, that assembles and evolves as you scroll.

![ENGAWA hero screen — wireframe dwelling behind the wordmark](screenshots/hero.png)



## Quick start

- **Run locally:** `npx serve .` from this folder, then open the printed URL. No build step — it just needs a real server, since ES modules won't load from a `file://` URL. (VS Code's Live Server extension works too.)
- **Deploy:** drag the folder onto [app.netlify.com/drop](https://app.netlify.com/drop). No build command needed — `netlify.toml` is already set up.

## Features

- **One model, whole page** — wireframe in the hero, assembling itself in Chapter 02, textured and configurable in Chapter 03, multiplying into a settlement by the end
- **Nothing pre-made** — every visual and sound is generated in code (WebGL, SVG, CSS gradients, canvas noise, WebAudio); no image or audio files anywhere
- **Scroll is the clock** — the model is driven directly by scroll position, so scrolling back up genuinely reverses the assembly
- **Live configurator** in Chapter 03 — swap cladding, footprint, and interior, with a real-time spec read-out
- **Real reduced-motion mode** — the model stands fully built and static, no scroll-jacking, page reads as plain HTML
- **Working waitlist form** — stores real submissions via Netlify Forms once deployed

![Chapter 02, "The System" — the model assembling as you scroll](screenshots/assembly.png)

## How it works

One transparent `<canvas>` sits behind the whole page. A single shared state object tracks assembly progress, material, camera, and fog; scrolling tweens those values, and the render loop reads them every frame, so the 3D scene never drifts out of sync with the scroll position.

## Credits

Built with three.js, GSAP, and Lenis, plus four Google Fonts (Newsreader, Unbounded, Bricolage Grotesque, IBM Plex Mono) — all loaded from CDNs, no npm install required.

*ENGAWA and EN-01 are fictional — this is a demo, not a real product.*
