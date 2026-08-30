/* ============================================================
   AWAN — canvas layers
   1. hero    : a 3D sound-field (wave mesh + orbiting voices)
   2. dust    : slow gold motes drifting behind the whole page
   3. eq      : the equaliser behind the statement band
   All hand-rolled: points in x/y/z, rotated and perspective
   projected onto a plain 2D context. No WebGL, no library.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- shared scroll state ------------------------------ */
  var S = { y: 0, vel: 0, h: 1 };
  var lastY = window.scrollY;
  function readScroll() {
    var y = window.scrollY;
    S.vel += ((y - lastY) - S.vel) * 0.25;
    lastY = y;
    S.y = y;
    S.h = document.body.scrollHeight - window.innerHeight || 1;
  }
  window.addEventListener('scroll', readScroll, { passive: true });

  /* ---------- a reusable soft-glow sprite ----------------------- */
  function glowSprite(r, g, b) {
    var c = document.createElement('canvas');
    var s = 64;
    c.width = c.height = s;
    var x = c.getContext('2d');
    var grd = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
    grd.addColorStop(0.35, 'rgba(' + r + ',' + g + ',' + b + ',.45)');
    grd.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    x.fillStyle = grd;
    x.fillRect(0, 0, s, s);
    return c;
  }
  var glowGold = glowSprite(255, 205, 130);
  var glowCyan = glowSprite(120, 235, 225);

  /* ============================================================
     1. HERO — the sound field
     ============================================================ */
  (function hero() {
    var canvas = document.getElementById('scene');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var W = 0, H = 0, dpr = 1;
    var COLS = 46, ROWS = 26;
    var SPREAD = 1500, DEPTH = 1500;
    var FOCAL = 620, CAM_Y = 200, CAM_Z = 620;

    var t = 0, p = 0;                 // p = hero scroll progress 0..1
    var yaw = 0, yawTarget = 0, yawBase = -0.12;
    var pitch = 0, pitchTarget = 0;
    var roll = 0;                     // driven by scroll velocity
    var running = true;
    var motes = [], orbit = [];

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var small = W < 760;
      COLS = small ? 30 : 46;
      ROWS = small ? 18 : 26;
      buildMotes(small ? 40 : 90);
      buildOrbit(small ? 20 : 40);
    }

    function buildMotes(n) {
      motes = [];
      for (var i = 0; i < n; i++) {
        motes.push({
          x: (Math.random() - 0.5) * SPREAD * 1.4,
          y: Math.random() * 620 - 120,
          z: Math.random() * DEPTH * 1.2 - DEPTH * 0.2,
          r: Math.random() * 1.6 + 0.5,
          s: Math.random() * 0.35 + 0.12
        });
      }
    }

    /* a ring of "voices" orbiting the centre of the field */
    function buildOrbit(n) {
      orbit = [];
      for (var i = 0; i < n; i++) {
        orbit.push({
          a: (i / n) * Math.PI * 2,
          r: 340 + Math.random() * 260,
          y: -90 - Math.random() * 230,
          sp: 0.12 + Math.random() * 0.2,
          sz: 0.5 + Math.random() * 0.9,
          c: Math.random() > 0.72 ? glowCyan : glowGold
        });
      }
    }

    function heightAt(x, z, time) {
      var nx = x / SPREAD, nz = z / DEPTH;
      var amp = 62 + p * 78;
      var h = Math.sin(nx * 6.0 + time * 1.05) * amp;
      h += Math.sin(nz * 4.6 - time * 0.78) * amp * 0.55;
      h += Math.sin((nx + nz) * 8.4 + time * 1.55) * amp * 0.3;
      var d = Math.sqrt(nx * nx + nz * nz);
      h += Math.cos(d * 11 - time * 2.1) * (amp * 0.42) / (1 + d * 2.4);
      return h;
    }

    function project(x, y, z) {
      var cy = Math.cos(yaw), sy = Math.sin(yaw);
      var rx = x * cy - z * sy;
      var rz = x * sy + z * cy;
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      var ry = y * cp - rz * sp;
      var rz2 = y * sp + rz * cp;
      // a whisper of roll, driven by how fast the page is moving
      var cr = Math.cos(roll), sr = Math.sin(roll);
      var fx = rx * cr - ry * sr;
      var fy = rx * sr + ry * cr;

      var camZ = rz2 + CAM_Z;
      if (camZ < 40) return null;
      var k = FOCAL / camZ;
      return { x: W / 2 + fx * k, y: H * 0.58 + (fy + CAM_Y) * k, k: k, z: camZ };
    }

    function fade(z) {
      return Math.max(0, Math.min(1, 1 - (z - CAM_Z * 0.4) / (DEPTH * 1.15)));
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var i, j, pt, prev;

      /* --- motes behind everything --- */
      for (i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.z -= m.s * (1 + p * 2.6);
        if (m.z < -DEPTH * 0.25) m.z = DEPTH * 1.15;
        pt = project(m.x, m.y, m.z);
        if (!pt) continue;
        var a = fade(pt.z) * 0.7;
        if (a <= 0.01) continue;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, m.r * pt.k * 1.5, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,225,180,' + a.toFixed(3) + ')';
        ctx.fill();
      }

      /* --- the mesh: lines along depth --- */
      var stepX = SPREAD / (COLS - 1);
      var stepZ = DEPTH / (ROWS - 1);
      var x0 = -SPREAD / 2, z0 = -DEPTH * 0.15;

      ctx.lineWidth = 1;
      for (j = 0; j < ROWS; j++) {
        var z = z0 + j * stepZ;
        prev = null;
        var rowFade = 1 - j / ROWS;
        for (i = 0; i < COLS; i++) {
          var x = x0 + i * stepX;
          var y = heightAt(x, z, t);
          pt = project(x, y, z);
          if (!pt) { prev = null; continue; }
          if (prev) {
            var lift = Math.max(0, (y + 90) / 240);
            var alpha = fade(pt.z) * (0.16 + lift * 0.55) * (0.35 + rowFade * 0.65);
            if (alpha > 0.012) {
              ctx.strokeStyle = lift > 0.62
                ? 'rgba(245,181,68,' + (alpha * 1.25).toFixed(3) + ')'
                : 'rgba(120,190,220,' + alpha.toFixed(3) + ')';
              ctx.beginPath();
              ctx.moveTo(prev.x, prev.y);
              ctx.lineTo(pt.x, pt.y);
              ctx.stroke();
            }
          }
          prev = pt;
        }
      }

      /* --- cross lines for the 3D read --- */
      for (i = 0; i < COLS; i += 2) {
        var xx = x0 + i * stepX;
        prev = null;
        for (j = 0; j < ROWS; j++) {
          var zz = z0 + j * stepZ;
          var yy = heightAt(xx, zz, t);
          pt = project(xx, yy, zz);
          if (!pt) { prev = null; continue; }
          if (prev) {
            var al = fade(pt.z) * 0.2;
            if (al > 0.012) {
              ctx.strokeStyle = 'rgba(140,195,225,' + al.toFixed(3) + ')';
              ctx.beginPath();
              ctx.moveTo(prev.x, prev.y);
              ctx.lineTo(pt.x, pt.y);
              ctx.stroke();
            }
          }
          prev = pt;
        }
      }

      /* --- glowing crests --- */
      ctx.globalCompositeOperation = 'lighter';
      for (j = 0; j < ROWS; j += 2) {
        var cz = z0 + j * stepZ;
        for (i = 0; i < COLS; i += 2) {
          var cx = x0 + i * stepX;
          var cy2 = heightAt(cx, cz, t);
          if (cy2 < 62) continue;
          pt = project(cx, cy2, cz);
          if (!pt) continue;
          var da = fade(pt.z) * Math.min(1, (cy2 - 62) / 90);
          if (da <= 0.03) continue;
          var sz = Math.max(5, 17 * pt.k) * (0.7 + da * 0.8);
          ctx.globalAlpha = da * 0.6;
          ctx.drawImage(glowGold, pt.x - sz / 2, pt.y - sz / 2, sz, sz);
        }
      }

      /* --- the orbiting voices --- */
      for (i = 0; i < orbit.length; i++) {
        var o = orbit[i];
        o.a += o.sp * 0.006 * (1 + p * 1.4);
        var ox = Math.cos(o.a) * o.r;
        var oz = Math.sin(o.a) * o.r * 0.75;
        var oy = o.y + Math.sin(t * 0.9 + o.a * 3) * 26;
        pt = project(ox, oy, oz);
        if (!pt) continue;
        var oa = fade(pt.z) * 0.42;
        if (oa <= 0.03) continue;
        var os = Math.max(3, 8.5 * pt.k * o.sz);
        ctx.globalAlpha = oa;
        ctx.drawImage(o.c, pt.x - os / 2, pt.y - os / 2, os, os);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    var last = 0;
    function frame(now) {
      if (!running) { last = now; requestAnimationFrame(frame); return; }
      var dt = Math.min((now - last) / 1000 || 0.016, 0.05);
      last = now;

      t += dt * (0.55 + p * 0.5);
      yaw += (yawTarget - yaw) * 0.045;
      pitch += (pitchTarget - pitch) * 0.045;
      roll += (Math.max(-0.05, Math.min(0.05, S.vel * 0.0009)) - roll) * 0.06;

      draw();
      requestAnimationFrame(frame);
    }

    function onScroll() {
      var hero = document.getElementById('hero');
      var h = hero ? hero.offsetHeight : window.innerHeight;
      p = Math.max(0, Math.min(1, window.scrollY / h));
      pitchTarget = 0.16 + p * 0.42;
      yawTarget = yawBase + p * 0.34;
    }

    function onPointer(e) {
      var nx = (e.clientX / window.innerWidth) - 0.5;
      var ny = (e.clientY / window.innerHeight) - 0.5;
      yawBase = -0.12 + nx * 0.32;
      yawTarget = yawBase + p * 0.34;
      pitchTarget = 0.16 + p * 0.42 + ny * 0.1;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { running = es[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { running = !document.hidden; });

    size();
    onScroll();
    pitch = pitchTarget; yaw = yawTarget;

    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 140); });
    window.addEventListener('scroll', onScroll, { passive: true });
    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      window.addEventListener('pointermove', onPointer, { passive: true });
    }

    if (reduced) draw(); else requestAnimationFrame(frame);
  })();

  /* ============================================================
     2. DUST — gold motes drifting behind the whole page
     ============================================================ */
  (function dust() {
    var canvas = document.getElementById('dust');
    if (!canvas || reduced) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, bits = [];

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = W < 760 ? 26 : 60;
      bits = [];
      for (var i = 0; i < n; i++) {
        bits.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.5 + 0.35,
          s: Math.random() * 0.22 + 0.05,
          d: Math.random() * 0.8 + 0.35,          // parallax depth
          w: Math.random() * 6.28
        });
      }
    }

    var t = 0;
    function frame() {
      t += 0.006;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < bits.length; i++) {
        var b = bits[i];
        b.y -= b.s;
        b.x += Math.sin(t + b.w) * 0.22;
        var y = b.y - (S.y * 0.05 * b.d) % (H + 80);
        if (y < -40) y += H + 80;
        if (b.y < -40) b.y = H + 40;
        var a = 0.16 + Math.sin(t * 2 + b.w) * 0.1;
        ctx.beginPath();
        ctx.arc(b.x, ((y % (H + 80)) + H + 80) % (H + 80), b.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,214,150,' + Math.max(0, a).toFixed(3) + ')';
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    size();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 160); });
    requestAnimationFrame(frame);
  })();

  /* ============================================================
     3. EQ — the band behind the statement, tied to scroll
     ============================================================ */
  (function eq() {
    var canvas = document.getElementById('eq');
    if (!canvas) return;
    var section = document.getElementById('statement');
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, N = 64, seeds = [];
    var running = false, t = 0, prog = 0;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      N = W < 760 ? 34 : 72;
      seeds = [];
      for (var i = 0; i < N; i++) seeds.push(Math.random() * 6.28);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var gap = W / N;
      var bw = Math.max(2, gap * 0.34);
      for (var i = 0; i < N; i++) {
        var n = i / N;
        var wave = Math.sin(t * 1.6 + seeds[i]) * 0.5 + 0.5;
        var env = Math.sin(n * Math.PI);                 // taller in the middle
        var h = (0.06 + wave * 0.5 * env * (0.35 + prog * 0.9)) * H;
        var x = i * gap + (gap - bw) / 2;
        var g = ctx.createLinearGradient(0, H / 2 - h / 2, 0, H / 2 + h / 2);
        g.addColorStop(0, 'rgba(245,181,68,0)');
        g.addColorStop(0.5, 'rgba(245,181,68,' + (0.16 + env * 0.3).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(70,230,216,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, H / 2 - h / 2, bw, h);
      }
    }

    function frame() {
      if (running) { t += 0.016; draw(); }
      requestAnimationFrame(frame);
    }

    function onScroll() {
      if (!section) return;
      var r = section.getBoundingClientRect();
      prog = Math.max(0, Math.min(1, 1 - Math.abs(r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight));
    }

    size();
    onScroll();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { running = es[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
    } else { running = true; }
    window.addEventListener('scroll', onScroll, { passive: true });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); draw(); }, 160); });

    if (reduced) { prog = 0.5; draw(); } else requestAnimationFrame(frame);
  })();
})();
