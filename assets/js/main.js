/* ============================================================
   AWAN — interactions
   One rAF ticker drives the cursor, the magnets and the
   marquees; scroll work is throttled to a frame of its own.
   ============================================================ */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp  = function (a, b, n) { return a + (b - a) * n; };

  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  /* ============================================================ 1. INTRO */
  var intro = $('#intro');
  var introFill = $('#introFill');
  var introPct = $('#introPct');
  var opened = false;

  function openSite() {
    if (opened) return;
    opened = true;
    document.body.classList.remove('is-loading');
    doc.classList.add('is-ready');
    if (intro) {
      intro.classList.add('is-done');
      setTimeout(function () { intro.style.display = 'none'; }, 1300);
    }
    // the hero copy comes in behind the curtain
    setTimeout(function () {
      $$('.hero [data-reveal], .hero .split').forEach(function (el) { el.classList.add('is-in'); });
    }, 260);
    onScroll();
  }

  if (intro && !reduced) {
    var pct = 0, done = false;
    window.addEventListener('load', function () { done = true; });
    setTimeout(function () { done = true; }, 2400);           // never trap the visitor
    (function tick() {
      var target = done ? 100 : Math.min(92, pct + 1.6 + Math.random() * 3);
      pct = lerp(pct, target, done ? 0.35 : 0.12);
      if (introFill) introFill.style.width = pct.toFixed(1) + '%';
      if (introPct) introPct.textContent = Math.round(pct);
      if (pct > 99.3) { openSite(); return; }
      requestAnimationFrame(tick);
    })();
  } else {
    openSite();
  }
  // failsafe: if rAF is throttled (background tab, odd browser) the curtain
  // must still lift — the site is never allowed to stay behind it.
  setTimeout(openSite, 3000);

  /* ============================================================ 2. SPLIT TEXT */
  function splitEl(el) {
    if (el.querySelector('.wm')) return;
    var idx = 0;
    var stagger = parseInt(el.getAttribute('data-stagger') || '30', 10);

    function walk(node) {
      if (node.nodeType === 3) {
        if (!node.textContent.trim()) return;
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (word) {
          if (!word) return;
          if (!word.trim()) { frag.appendChild(document.createTextNode(word)); return; }
          var mask = document.createElement('span');
          mask.className = 'wm';
          var inner = document.createElement('span');
          inner.className = 'wi';
          inner.textContent = word;
          inner.style.setProperty('--wd', (idx++ * stagger) + 'ms');
          mask.appendChild(inner);
          frag.appendChild(mask);
        });
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        Array.prototype.slice.call(node.childNodes).forEach(walk);
      }
    }
    Array.prototype.slice.call(el.childNodes).forEach(walk);
  }
  function splitAll() { $$('.split').forEach(splitEl); }

  /* ---- the word-by-word lit paragraph ---- */
  var wordBlocks = [];
  function splitWords() {
    wordBlocks = $$('.scroll-words');
    wordBlocks.forEach(function (block) {
      if (block.querySelector('.w')) return;
      var text = block.textContent.trim();
      block.textContent = '';
      text.split(/\s+/).forEach(function (w) {
        var span = document.createElement('span');
        span.className = 'w';
        span.textContent = w;
        block.appendChild(span);
        block.appendChild(document.createTextNode(' '));
      });
    });
  }

  splitAll();
  splitWords();

  /* ============================================================ 3. LANGUAGE */
  var STORE = 'awan-lang';
  var langToggle = $('#langToggle');

  function applyLang(lang) {
    var isEn = lang === 'en';
    doc.setAttribute('lang', isEn ? 'en' : 'ar');
    doc.setAttribute('dir', isEn ? 'ltr' : 'rtl');
    document.title = isEn
      ? 'Awan | Dubbing & Audio Post Studios'
      : 'أوان | استوديوهات الدوبلاج والإنتاج الصوتي';

    $$('[data-ar]').forEach(function (el) {
      var txt = isEn ? el.getAttribute('data-en') : el.getAttribute('data-ar');
      if (txt != null) el.textContent = txt;
    });

    splitAll();      // the masks were overwritten with the new strings
    splitWords();
    try { localStorage.setItem(STORE, lang); } catch (e) {}
  }

  var saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  if (saved === 'en') applyLang('en');

  if (langToggle) {
    langToggle.addEventListener('click', function () {
      applyLang(doc.getAttribute('lang') === 'en' ? 'ar' : 'en');
      onScroll();
    });
  }

  /* ============================================================ 4. NAV */
  var nav = $('#nav');
  var navLinks = $('#navLinks');
  var burger = $('#burger');

  if (burger && navLinks) {
    burger.addEventListener('click', function () {
      var open = navLinks.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-locked', open);
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') return;
      navLinks.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
    });
  }

  var sections = $$('main section[id]');
  var linkFor = {};
  $$('#navLinks a').forEach(function (a) { linkFor[a.getAttribute('href').slice(1)] = a; });

  function spy() {
    var mark = window.scrollY + window.innerHeight * 0.35;
    var current = null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= mark) current = sections[i].id;
    }
    $$('#navLinks a').forEach(function (a) { a.classList.remove('is-active'); });
    if (current && linkFor[current]) linkFor[current].classList.add('is-active');
  }

  var toTop = $('#toTop');
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ============================================================ 5. REVEAL */
  var revealTargets = $$('[data-reveal], .split, .stat, .svc');
  if ('IntersectionObserver' in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var d = el.getAttribute('data-delay');
        if (d) el.style.setProperty('--d', d + 'ms');
        el.classList.add('is-in');
        revealIO.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(function (el) { revealIO.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ============================================================ 6. COUNTERS */
  function runCounter(el) {
    var to = parseFloat(el.getAttribute('data-to')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1900, t0 = null;
    var loc = doc.getAttribute('lang') === 'en' ? 'en-US' : 'ar-EG';
    function tick(now) {
      if (t0 === null) t0 = now;
      var p = clamp((now - t0) / dur, 0, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(to * eased).toLocaleString(loc) + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  var counters = $$('.counter');
  if (counters.length && 'IntersectionObserver' in window && !reduced) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        runCounter(en.target);
        countIO.unobserve(en.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { countIO.observe(c); });
  } else {
    counters.forEach(function (c) {
      c.textContent = c.getAttribute('data-to') + (c.getAttribute('data-suffix') || '');
    });
  }

  /* ============================================================ 7. FILTERS */
  var grid = $('#workGrid');
  var filters = $$('#filters .filter');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var want = btn.getAttribute('data-filter');
      $$('.work', grid).forEach(function (card, i) {
        var cats = (card.getAttribute('data-cat') || '').split(/\s+/);
        var show = want === 'all' || cats.indexOf(want) !== -1;
        card.classList.toggle('is-hidden', !show);
        card.classList.remove('is-fresh');
        if (show) {
          void card.offsetWidth;
          card.style.animationDelay = (i * 45) + 'ms';
          card.classList.add('is-fresh');
        }
      });
    });
  });

  /* ============================================================ 8. TILT */
  var tilts = [];
  if (!reduced && fine) {
    $$('.tilt').forEach(function (card) {
      var st = { el: card, rx: 0, ry: 0, trx: 0, tryy: 0, on: false };
      tilts.push(st);
      card.addEventListener('pointerenter', function () { st.on = true; });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        st.tryy = (px - 0.5) * 12;
        st.trx = (0.5 - py) * 10;
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        st.trx = 0; st.tryy = 0;
        setTimeout(function () { st.on = false; }, 700);
      });
    });
  }

  /* ============================================================ 9. MAGNETS */
  var magnets = [];
  if (!reduced && fine) {
    $$('.magnet').forEach(function (el) {
      magnets.push({ el: el, x: 0, y: 0, tx: 0, ty: 0 });
    });
  }

  /* ============================================================ 10. CURSOR */
  var cursor = $('#cursor');
  var cursorLabel = $('#cursorLabel');
  var cur = { x: 0, y: 0, rx: 0, ry: 0 };
  var pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  if (fine && !reduced) {
    document.addEventListener('pointermove', function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY;

      for (var i = 0; i < magnets.length; i++) {
        var m = magnets[i];
        var r = m.el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = e.clientX - cx, dy = e.clientY - cy;
        var dist = Math.hypot(dx, dy);
        var reach = Math.max(r.width, r.height) * 0.9 + 40;
        if (dist < reach) { m.tx = dx * 0.28; m.ty = dy * 0.32; }
        else { m.tx = 0; m.ty = 0; }
      }
    }, { passive: true });

    var hoverSel = 'a, button, .tilt, .filter';
    document.addEventListener('pointerover', function (e) {
      if (!cursor) return;
      var hit = e.target.closest ? e.target.closest(hoverSel) : null;
      if (!hit) return;
      var card = e.target.closest('[data-cursor-ar]');
      if (card) {
        var isEn = doc.getAttribute('lang') === 'en';
        if (cursorLabel) cursorLabel.textContent = card.getAttribute(isEn ? 'data-cursor-en' : 'data-cursor-ar') || '';
        cursor.classList.add('is-label');
      } else {
        cursor.classList.add('is-hover');
      }
    });
    document.addEventListener('pointerout', function (e) {
      if (!cursor) return;
      var hit = e.target.closest ? e.target.closest(hoverSel) : null;
      if (!hit) return;
      cursor.classList.remove('is-hover', 'is-label');
    });
  }

  /* ============================================================ 11. MARQUEES */
  var marquees = $$('.marquee').map(function (m) {
    var track = m.firstElementChild;
    track.innerHTML += track.innerHTML;                 // seamless loop
    return {
      track: track,
      half: 0,
      off: 0,
      speed: parseFloat(m.getAttribute('data-speed') || '1')
    };
  });
  function measureMarquees() {
    marquees.forEach(function (m) { m.half = m.track.scrollWidth / 2 || 1; });
  }
  measureMarquees();
  window.addEventListener('load', measureMarquees);

  /* ============================================================ 12. SCROLL WORK */
  var bar = $('#scrollProgress');
  var barFill = bar ? bar.firstElementChild : null;
  var processSec = $('#process');
  var track = $('#processTrack');
  var pBar = $('#processBar');
  var steps = $$('.step');
  var leaks = $$('#leaks i');
  var booth = $('#booth');
  var studios = $('#studios');

  var lastY = window.scrollY, vel = 0, navHidden = false;

  function paintWords() {
    for (var b = 0; b < wordBlocks.length; b++) {
      var block = wordBlocks[b];
      var r = block.getBoundingClientRect();
      var start = window.innerHeight * 0.88;
      var end = window.innerHeight * 0.28;
      var p = clamp((start - r.top) / (start - end), 0, 1);
      var words = block.getElementsByClassName('w');
      var lit = Math.round(p * words.length);
      for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < lit);
    }
  }

  function paintProcess() {
    if (!processSec || !track) return;
    var rect = processSec.getBoundingClientRect();
    var travel = processSec.offsetHeight - window.innerHeight;
    var p = clamp(-rect.top / (travel || 1), 0, 1);
    var overflow = Math.max(0, track.scrollWidth - window.innerWidth);
    var factor = doc.getAttribute('dir') === 'rtl' ? 1 : -1;
    track.style.transform = 'translate3d(' + (factor * p * overflow).toFixed(1) + 'px,0,0)';
    if (pBar) pBar.style.width = (p * 100).toFixed(1) + '%';

    // give the cards depth as they pass the middle of the screen
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      var mid = window.innerWidth / 2;
      for (var i = 0; i < steps.length; i++) {
        var sr = steps[i].getBoundingClientRect();
        var d = (sr.left + sr.width / 2 - mid) / window.innerWidth;   // -1 .. 1
        steps[i].style.transform =
          'perspective(1400px) rotateY(' + (-d * 16).toFixed(2) + 'deg) translateZ(' +
          (-Math.abs(d) * 120).toFixed(1) + 'px) scale(' + (1 - Math.abs(d) * 0.07).toFixed(3) + ')';
        steps[i].style.opacity = (1 - Math.min(0.55, Math.abs(d) * 0.7)).toFixed(3);
      }
    }
  }

  function paintParallax() {
    var sy = window.scrollY;
    for (var i = 0; i < leaks.length; i++) {
      leaks[i].style.transform = 'translate3d(0,' + (sy * (0.05 + i * 0.045)).toFixed(1) + 'px,0)';
    }
    if (booth && studios) {
      var r = studios.getBoundingClientRect();
      var p = clamp((window.innerHeight - r.top) / (window.innerHeight + r.height), 0, 1);
      booth.style.setProperty('--ry', ((p - 0.5) * 46).toFixed(2) + 'deg');
    }
  }

  function onScroll() {
    var sy = window.scrollY;
    var max = document.body.scrollHeight - window.innerHeight;
    vel = sy - lastY;

    if (barFill) barFill.style.width = (clamp(sy / (max || 1), 0, 1) * 100).toFixed(2) + '%';
    if (nav) {
      nav.classList.toggle('is-stuck', sy > 24);
      var menuOpen = navLinks && navLinks.classList.contains('is-open');
      var shouldHide = sy > 500 && vel > 4 && !menuOpen;
      if (shouldHide !== navHidden) { navHidden = shouldHide; nav.classList.toggle('is-hidden', shouldHide); }
      if (vel < -4 && navHidden) { navHidden = false; nav.classList.remove('is-hidden'); }
    }
    paintProcess();
    paintParallax();
    paintWords();
    spy();
    lastY = sy;
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', function () { measureMarquees(); onScroll(); });
  onScroll();

  /* ============================================================ 13. TICKER */
  var smoothVel = 0;
  function ticker() {
    smoothVel = lerp(smoothVel, vel, 0.1);

    /* marquees drift, and lean into the scroll */
    for (var i = 0; i < marquees.length; i++) {
      var m = marquees[i];
      m.off -= (m.speed * 0.6 + smoothVel * m.speed * 0.06);
      if (m.half) {
        if (m.off <= -m.half) m.off += m.half;
        if (m.off >= 0) m.off -= m.half;
      }
      m.track.style.transform =
        'translate3d(' + m.off.toFixed(2) + 'px,0,0) skewX(' + clamp(-smoothVel * 0.12, -6, 6).toFixed(2) + 'deg)';
    }

    if (fine && !reduced) {
      /* cursor: dot snaps, ring lags */
      cur.x = lerp(cur.x, pointer.x, 0.85);
      cur.y = lerp(cur.y, pointer.y, 0.85);
      cur.rx = lerp(cur.rx, pointer.x, 0.16);
      cur.ry = lerp(cur.ry, pointer.y, 0.16);
      if (cursor) {
        var dot = cursor.firstElementChild.nextElementSibling;
        cursor.style.transform = 'translate3d(' + cur.rx.toFixed(1) + 'px,' + cur.ry.toFixed(1) + 'px,0)';
        if (dot) dot.style.transform =
          'translate3d(' + (cur.x - cur.rx).toFixed(1) + 'px,' + (cur.y - cur.ry).toFixed(1) + 'px,0)';
      }

      /* magnets ease toward the pointer */
      for (var j = 0; j < magnets.length; j++) {
        var mg = magnets[j];
        mg.x = lerp(mg.x, mg.tx, 0.16);
        mg.y = lerp(mg.y, mg.ty, 0.16);
        mg.el.style.transform = 'translate3d(' + mg.x.toFixed(2) + 'px,' + mg.y.toFixed(2) + 'px,0)';
      }

      /* tilt cards settle back on their own */
      for (var k = 0; k < tilts.length; k++) {
        var t = tilts[k];
        if (!t.on && Math.abs(t.rx) < 0.01 && Math.abs(t.ry) < 0.01) continue;
        t.rx = lerp(t.rx, t.trx, 0.12);
        t.ry = lerp(t.ry, t.tryy, 0.12);
        t.el.style.transform =
          'perspective(1100px) rotateX(' + t.rx.toFixed(2) + 'deg) rotateY(' + t.ry.toFixed(2) + 'deg) translateZ(8px)';
      }
    }

    vel *= 0.86;
    requestAnimationFrame(ticker);
  }
  requestAnimationFrame(ticker);
})();
