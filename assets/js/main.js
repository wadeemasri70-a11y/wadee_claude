/* ============================================================
   AWAN — interactions
   Scroll choreography, language switch, filters, 3D tilt.
   ============================================================ */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ---------------------------------------------------------- 1. boot */
  function boot() {
    var pre = $('#preloader');
    if (pre) pre.classList.add('is-done');
    doc.classList.add('is-ready');
  }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
  setTimeout(boot, 2600); // never trap the visitor behind a slow font

  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------- 2. language */
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

    splitWords();          // the word-reveal spans were just overwritten
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

  /* ---------------------------------------------------------- 3. nav */
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

  /* ---------------------------------------------------------- 4. reveal */
  if ('IntersectionObserver' in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        revealIO.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (el) { revealIO.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------------------------------------------------- 5. counters */
  function runCounter(el) {
    var to = parseFloat(el.getAttribute('data-to')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1700, t0 = null;
    function tick(now) {
      if (t0 === null) t0 = now;
      var p = clamp((now - t0) / dur, 0, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased).toLocaleString(
        doc.getAttribute('lang') === 'en' ? 'en-US' : 'ar-EG'
      ) + (p === 1 ? suffix : '');
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

  /* ---------------------------------------------------------- 6. word reveal */
  var wordBlocks = [];
  function splitWords() {
    wordBlocks = $$('.scroll-words');
    wordBlocks.forEach(function (block) {
      if (block.querySelector('.w')) return;   // already split, and still intact
      var text = block.textContent.trim();
      block.textContent = '';
      text.split(/\s+/).forEach(function (w, i) {
        var span = document.createElement('span');
        span.className = 'w';
        span.textContent = w;
        block.appendChild(span);
        block.appendChild(document.createTextNode(' '));
      });
      block.dataset.split = '1';
    });
  }
  splitWords();

  function paintWords() {
    wordBlocks.forEach(function (block) {
      var r = block.getBoundingClientRect();
      var start = window.innerHeight * 0.88;
      var end = window.innerHeight * 0.30;
      var p = clamp((start - r.top) / (start - end), 0, 1);
      var words = block.getElementsByClassName('w');
      var lit = Math.round(p * words.length);
      for (var i = 0; i < words.length; i++) {
        words[i].classList.toggle('on', i < lit);
      }
    });
  }

  /* ---------------------------------------------------------- 7. works filter */
  var grid = $('#workGrid');
  var filters = $$('#filters .filter');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var want = btn.getAttribute('data-filter');
      $$('.work', grid).forEach(function (card) {
        var cats = (card.getAttribute('data-cat') || '').split(/\s+/);
        var show = want === 'all' || cats.indexOf(want) !== -1;
        card.classList.toggle('is-hidden', !show);
        card.classList.remove('is-fresh');
        if (show) { void card.offsetWidth; card.classList.add('is-fresh'); }
      });
    });
  });

  /* ---------------------------------------------------------- 8. 3D tilt */
  if (!reduced && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    $$('.tilt').forEach(function (card) {
      var raf = null, rx = 0, ry = 0;
      function apply() {
        card.style.transform =
          'perspective(1100px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateZ(6px)';
        raf = null;
      }
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        ry = (px - 0.5) * 11;
        rx = (0.5 - py) * 9;
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        if (!raf) raf = requestAnimationFrame(apply);
      });
      card.addEventListener('pointerleave', function () {
        card.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
        card.style.transform = '';
        setTimeout(function () { card.style.transition = ''; }, 620);
      });
      card.addEventListener('pointerenter', function () { card.style.transition = ''; });
    });
  }

  /* ---------------------------------------------------------- 9. horizontal process */
  var processSec = $('#process');
  var track = $('#processTrack');
  var pBar = $('#processBar');

  function paintProcess() {
    if (!processSec || !track) return;
    var rect = processSec.getBoundingClientRect();
    var travel = processSec.offsetHeight - window.innerHeight;
    var p = clamp(-rect.top / (travel || 1), 0, 1);
    var overflow = Math.max(0, track.scrollWidth - window.innerWidth);
    var factor = doc.getAttribute('dir') === 'rtl' ? 1 : -1;
    track.style.transform = 'translate3d(' + (factor * p * overflow).toFixed(1) + 'px,0,0)';
    if (pBar) pBar.style.width = (p * 100).toFixed(1) + '%';
  }

  /* ---------------------------------------------------------- 10. misc scroll */
  var bar = $('#scrollProgress');
  var barFill = bar ? bar.firstElementChild : null;

  function onScroll() {
    var max = document.body.scrollHeight - window.innerHeight;
    if (barFill) barFill.style.width = (clamp(window.scrollY / (max || 1), 0, 1) * 100).toFixed(2) + '%';
    if (nav) nav.classList.toggle('is-stuck', window.scrollY > 24);
    paintProcess();
    paintWords();
    spy();
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------------------------------------------------------- 11. cursor glow */
  var glow = $('#cursorGlow');
  if (glow && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    var gx = 0, gy = 0, tx = 0, ty = 0, gRaf = null;
    function moveGlow() {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = 'translate3d(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px,0)';
      gRaf = (Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) ? requestAnimationFrame(moveGlow) : null;
    }
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!gRaf) gRaf = requestAnimationFrame(moveGlow);
    }, { passive: true });
  }

  /* ---------------------------------------------------------- 12. marquee */
  var mq = $('#marqueeTrack');
  if (mq) mq.innerHTML += mq.innerHTML;   // seamless loop for translate(-50%)
})();
