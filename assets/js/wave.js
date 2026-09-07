/* ═══════════════════════════════════════════════════════════════════
   wave.js — the one ambient visual: a soft standing wave under the hero.
   Vanilla canvas, capped DPR, paused off-screen and on hidden tabs,
   static single frame under prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var cv = document.getElementById('wave');
  if (!cv || !cv.getContext) return;

  var ctx = cv.getContext('2d', { alpha: true });
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, dpr = 1;
  var running = false, visible = true, raf = 0, t = 0, last = 0;

  /* three layers: far → near. amp/speed/alpha build depth. */
  var LAYERS = [
    { amp: 0.34, freq: 1.35, speed: 0.14, alpha: 0.20, y: 0.58, w: 1.0 },
    { amp: 0.58, freq: 0.95, speed: 0.21, alpha: 0.32, y: 0.72, w: 1.3 },
    { amp: 0.88, freq: 0.62, speed: 0.30, alpha: 0.50, y: 0.86, w: 1.6 }
  ];

  function accent() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    return (v || '#c9552f').trim();
  }
  var COLOR = accent();

  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var RGB = hexToRgb(COLOR);

  function resize() {
    var r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, r.width < 720 ? 1.5 : 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(0);
  }

  /* energy: 0..1, nudged by scroll velocity from main.js — gives the wave
     a reason to breathe that answers the user, not just the clock. */
  function energy() {
    var e = window.__awanEnergy;
    return typeof e === 'number' ? Math.max(0, Math.min(1, e)) : 0;
  }

  function draw(time) {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);

    var e = energy();
    var step = W < 640 ? 10 : 7;

    for (var i = 0; i < LAYERS.length; i++) {
      var L = LAYERS[i];
      var base = H * L.y;
      var amp = H * 0.13 * L.amp * (1 + e * 0.85);
      var ph = time * L.speed;

      ctx.beginPath();
      for (var x = 0; x <= W + step; x += step) {
        var u = x / W;
        /* two detuned sines + a soft envelope = an organic, non-repeating line */
        var s =
          Math.sin(u * Math.PI * 2 * L.freq + ph) * 0.62 +
          Math.sin(u * Math.PI * 2 * (L.freq * 2.37) - ph * 1.31) * 0.28 +
          Math.sin(u * Math.PI * 2 * (L.freq * 0.51) + ph * 0.67) * 0.36;
        var env = Math.sin(u * Math.PI); /* fade the ends to nothing */
        var y = base + s * amp * env;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(' + RGB[0] + ',' + RGB[1] + ',' + RGB[2] + ',' + (L.alpha + e * 0.12) + ')';
      ctx.lineWidth = L.w;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    t += dt;
    draw(t);
  }

  function start() {
    if (running || reduced || !visible) return;
    running = true; last = 0;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* only paint while the hero is actually on screen */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      visible ? start() : stop();
    }, { rootMargin: '80px' }).observe(cv);
  } else {
    visible = true; start();
  }

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 140);
  }, { passive: true });

  resize();
  if (reduced) draw(0.4); else start();
})();
