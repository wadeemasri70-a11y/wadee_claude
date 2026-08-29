/* ============================================================
   AWAN — 3D sound-field
   A perspective-projected wave mesh + floating dust, drawn on a
   2D canvas. No libraries, no WebGL: works everywhere, cheap on
   battery, and reacts to scroll + pointer.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('scene');
  if (!canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1;

  /* --- tunables ------------------------------------------------ */
  var COLS = 46;          // points across
  var ROWS = 26;          // points deep
  var SPREAD = 1500;      // world width
  var DEPTH = 1500;       // world depth
  var FOCAL = 620;        // perspective focal length
  var CAM_Y = 200;        // camera height above the mesh
  var CAM_Z = 620;        // camera distance

  /* --- live state ---------------------------------------------- */
  var t = 0;
  var scroll = 0;          // 0..1 across the hero
  var yaw = 0, yawTarget = 0;
  var pitch = 0, pitchTarget = 0;
  var running = true;
  var dust = [];

  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // lighten the mesh on small screens
    var small = W < 760;
    COLS = small ? 30 : 46;
    ROWS = small ? 18 : 26;

    buildDust(small ? 40 : 90);
  }

  function buildDust(n) {
    dust = [];
    for (var i = 0; i < n; i++) {
      dust.push({
        x: (Math.random() - 0.5) * SPREAD * 1.4,
        y: Math.random() * 620 - 120,
        z: Math.random() * DEPTH * 1.2 - DEPTH * 0.2,
        r: Math.random() * 1.6 + 0.5,
        s: Math.random() * 0.35 + 0.12
      });
    }
  }

  /* --- the surface: a few stacked sine waves, like a waveform --- */
  function heightAt(x, z, time) {
    var nx = x / SPREAD;
    var nz = z / DEPTH;
    var amp = 62 + scroll * 78;             // scrolling swells the wave
    var h = Math.sin(nx * 6.0 + time * 1.05) * amp;
    h += Math.sin(nz * 4.6 - time * 0.78) * amp * 0.55;
    h += Math.sin((nx + nz) * 8.4 + time * 1.55) * amp * 0.3;
    // a pulse travelling out from the centre — the "voice"
    var d = Math.sqrt(nx * nx + nz * nz);
    h += Math.cos(d * 11 - time * 2.1) * (amp * 0.42) / (1 + d * 2.4);
    return h;
  }

  /* --- world -> screen ----------------------------------------- */
  function project(x, y, z) {
    // yaw (around Y)
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var rx = x * cy - z * sy;
    var rz = x * sy + z * cy;
    // pitch (around X)
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var ry = y * cp - rz * sp;
    var rz2 = y * sp + rz * cp;

    var camZ = rz2 + CAM_Z;
    if (camZ < 40) return null;
    var k = FOCAL / camZ;
    return {
      x: W / 2 + rx * k,
      y: H * 0.58 + (ry + CAM_Y) * k,
      k: k,
      z: camZ
    };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    var i, j, p, prev;
    var fade = function (z) {
      return Math.max(0, Math.min(1, 1 - (z - CAM_Z * 0.4) / (DEPTH * 1.15)));
    };

    /* dust behind the mesh */
    for (i = 0; i < dust.length; i++) {
      var d = dust[i];
      d.z -= d.s * (1 + scroll * 2.6);
      if (d.z < -DEPTH * 0.25) d.z = DEPTH * 1.15;
      p = project(d.x, d.y, d.z);
      if (!p) continue;
      var a = fade(p.z) * 0.7;
      if (a <= 0.01) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, d.r * p.k * 1.5, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,225,180,' + a.toFixed(3) + ')';
      ctx.fill();
    }

    /* the mesh — lines along depth then across */
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
        p = project(x, y, z);
        if (!p) { prev = null; continue; }
        if (prev) {
          var lift = Math.max(0, (y + 90) / 240);         // peaks glow
          var alpha = fade(p.z) * (0.16 + lift * 0.55) * (0.35 + rowFade * 0.65);
          if (alpha > 0.012) {
            ctx.strokeStyle = lift > 0.62
              ? 'rgba(245,181,68,' + (alpha * 1.25).toFixed(3) + ')'
              : 'rgba(120,190,220,' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
        prev = p;
      }
    }

    /* cross lines, sparser, for the 3D read */
    for (i = 0; i < COLS; i += 2) {
      var xx = x0 + i * stepX;
      prev = null;
      for (j = 0; j < ROWS; j++) {
        var zz = z0 + j * stepZ;
        var yy = heightAt(xx, zz, t);
        p = project(xx, yy, zz);
        if (!p) { prev = null; continue; }
        if (prev) {
          var al = fade(p.z) * 0.20;
          if (al > 0.012) {
            ctx.strokeStyle = 'rgba(140,195,225,' + al.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
        prev = p;
      }
    }

    /* crest dots */
    for (j = 0; j < ROWS; j += 2) {
      var cz = z0 + j * stepZ;
      for (i = 0; i < COLS; i += 2) {
        var cx = x0 + i * stepX;
        var cy2 = heightAt(cx, cz, t);
        if (cy2 < 55) continue;
        p = project(cx, cy2, cz);
        if (!p) continue;
        var da = fade(p.z) * Math.min(1, (cy2 - 55) / 90) * 0.85;
        if (da <= 0.02) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.6, 2.1 * p.k), 0, 6.2832);
        ctx.fillStyle = 'rgba(255,212,137,' + da.toFixed(3) + ')';
        ctx.fill();
      }
    }
  }

  /* --- loop ----------------------------------------------------- */
  var last = 0;
  function frame(now) {
    if (!running) { last = now; requestAnimationFrame(frame); return; }
    var dt = Math.min((now - last) / 1000 || 0.016, 0.05);
    last = now;

    t += dt * (0.55 + scroll * 0.5);
    yaw += (yawTarget - yaw) * 0.045;
    pitch += (pitchTarget - pitch) * 0.045;

    draw();
    requestAnimationFrame(frame);
  }

  /* --- inputs --------------------------------------------------- */
  function onScroll() {
    var hero = document.getElementById('hero');
    var h = hero ? hero.offsetHeight : window.innerHeight;
    scroll = Math.max(0, Math.min(1, window.scrollY / h));
    // the camera dips and the field tilts as you scroll away
    pitchTarget = 0.16 + scroll * 0.42;
    yawTarget = yawBase + scroll * 0.34;
  }

  var yawBase = -0.12;
  function onPointer(e) {
    var nx = (e.clientX / window.innerWidth) - 0.5;
    yawBase = -0.12 + nx * 0.30;
    yawTarget = yawBase + scroll * 0.34;
  }

  /* pause the loop when the hero is off screen or the tab is hidden */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      running = es[0].isIntersecting;
    }, { threshold: 0 });
    io.observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) running = false;
    else running = true;
  });

  /* --- boot ------------------------------------------------------ */
  sizeCanvas();
  onScroll();
  pitch = pitchTarget;
  yaw = yawTarget;

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(sizeCanvas, 140);
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    window.addEventListener('pointermove', onPointer, { passive: true });
  }

  if (reduced) {
    draw();               // one static frame, no animation
  } else {
    requestAnimationFrame(frame);
  }
})();
