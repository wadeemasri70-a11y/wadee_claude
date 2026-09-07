# AWAN — landing (Vite + React Three Fiber)

A 3D landing page for **أوان للدوبلاج**, scaffolded from the `vite-r3f-starter`
template (React + Vite + R3F + GSAP/ScrollTrigger + Lenis). Arabic, RTL,
night-and-gold — the same palette as the static site at the repo root.

The root site (`../index.html`) is untouched and still runs on its own.

## Run

```bash
cd landing
npm install
npm run dev      # http://localhost:5173
npm run build && npm run preview
```

> `npm install` has not been run in this repo yet — the session that scaffolded
> this had `registry.npmjs.org` blocked by network policy, so the lockfile is
> generated on your first install.

## What's here

```
index.html            RTL shell, Tajawal + Space Grotesk
src/main.jsx          entry
src/App.jsx           page content + the one hero timeline and one shared reveal
src/Scene.jsx         the "voice field": instanced wave grid (no model to download)
src/LazyScene.jsx     code-split canvas; mounts near-viewport, pauses off-screen
src/useLenis.js       smooth scroll synced to GSAP's ticker
src/useReducedMotion.js
src/styles.css        tokens: one easing family, three durations
vite.config.js        three/ r3f split into their own cacheable chunks
```

## The 3D

`Scene.jsx` draws ~550 bars as a single `InstancedMesh` on a radial sine wave —
sound made visible, and one draw call. No `.glb`, no HDRI, no texture downloads,
so nothing is fetched for the hero beyond the JS chunk itself.

Fast by construction:

- canvas is `lazy()`-imported and mounted only when it nears the viewport
- DPR capped at `[1, 2]`, `AdaptiveDpr` drops resolution when the GPU struggles
- the frame loop **stops** when the hero scrolls away or the tab is hidden
- fog does the depth work instead of lights; the material is unlit
- `prefers-reduced-motion` renders a single static pose and skips every timeline

### Swapping in a real model

If you later want a modelled object (a mic, a booth) instead of the wave field,
compress it first and keep it under ~500 KB:

```bash
npx @gltf-transform/cli optimize input.glb src/models/hero-draco.glb --texture-compress ktx2
```

Then replace `<VoiceField>` in `Scene.jsx` with a `useGLTF` primitive.

## Motion

One memorable moment: the headline masks up word-by-word while the wave field
swells from flat to full amplitude, then drifts. Everything else shares a single
reveal so the page reads as one hand. Sections use `.reveal` — don't add a second
motion vocabulary.

## Before shipping

- [ ] Lighthouse on **mobile throttling**: LCP < 2.5s, CLS ~0
- [ ] Real mid-range Android: 60fps on scroll, no jank
- [ ] Swap `info@awan-group.com` and the placeholder works/stats for real ones
      (the stats mirror the root site's estimates — fix both together)
- [ ] Add real poster images to the works list
