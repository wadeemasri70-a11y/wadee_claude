/* ═══════════════════════════════════════════════════════════════════
   main.js — smooth scroll shell, layered parallax, one reveal moment
   per section, language switch, gallery. No libraries.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var html = document.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = mqReduce.matches;

  /* ── 0. tiny helpers ─────────────────────────────────────────── */
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  /* expo out — the site's entrance curve, mirrored from CSS */
  var easeOutExpo = function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); };

  /* ═══ 1. Smooth scroll shell ═══════════════════════════════════
     A fixed, transformed wrapper lerped toward the native scroll
     position. Native scrolling stays intact (scrollbar, keyboard,
     focus, anchors); we only soften how it lands. Pointer-fine and
     wide viewports only — touch devices already scroll beautifully.  */
  var scroller = $('#scroller');
  var smooth = false, cur = 0, target = 0, energy = 0, lastY = 0;

  function canSmooth() {
    return !reduced &&
           window.matchMedia('(pointer:fine)').matches &&
           window.innerWidth >= 1024;
  }

  function setBodyHeight() {
    document.body.style.height = smooth ? scroller.offsetHeight + 'px' : '';
  }

  function enableSmooth() {
    if (smooth) return;
    smooth = true;
    html.classList.add('has-smooth');
    cur = target = window.scrollY;
    setBodyHeight();
    measureParallax();
  }
  function disableSmooth() {
    if (!smooth) return;
    smooth = false;
    html.classList.remove('has-smooth');
    scroller.style.transform = '';
    document.body.style.height = '';
    measureParallax();
  }

  /* ── layered parallax (transform only, a few elements) ───────── */
  var pars = $$('[data-par]').map(function (el) {
    return { el: el, speed: parseFloat(el.getAttribute('data-par')) || 0, base: 0, h: 0, on: true };
  });

  function measureParallax() {
    var y = window.scrollY;
    pars.forEach(function (p) {
      p.el.style.transform = '';
      var r = p.el.getBoundingClientRect();
      p.base = r.top + (smooth ? cur : y);
      p.h = r.height;
    });
  }

  function renderParallax(y) {
    var vh = window.innerHeight;
    for (var i = 0; i < pars.length; i++) {
      var p = pars[i];
      var d = (y + vh / 2) - (p.base + p.h / 2);
      if (Math.abs(d) > vh * 1.6) continue;              /* skip far-off layers */
      var off = clamp(d * p.speed, -140, 140);
      p.el.style.transform = 'translate3d(0,' + off.toFixed(2) + 'px,0)';
    }
  }

  var ticking = false, lastT = 0;
  function frame(now) {
    var dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016;
    lastT = now;

    target = window.scrollY;

    if (smooth) {
      /* frame-rate independent damping — never a linear lerp */
      var k = 1 - Math.exp(-dt * 9.5);
      cur += (target - cur) * k;
      if (Math.abs(target - cur) < 0.08) cur = target;
      scroller.style.transform = 'translate3d(0,' + (-cur).toFixed(2) + 'px,0)';
    } else {
      cur = target;
    }

    /* scroll velocity → the hero wave's "energy" */
    var v = Math.abs(cur - lastY) / (dt * 1000);
    lastY = cur;
    energy += (clamp(v * 0.55, 0, 1) - energy) * Math.min(1, dt * 6);
    window.__awanEnergy = energy;

    renderParallax(cur);
    onScrollUI(cur);

    if (smooth || Math.abs(target - cur) > 0.08 || energy > 0.004) {
      requestAnimationFrame(frame);
    } else {
      ticking = false;
    }
  }
  function kick() {
    if (ticking) return;
    ticking = true;
    lastT = 0;
    requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', kick, { passive: true });

  /* ═══ 2. Reveals — one distinct moment per section ═════════════ */
  var revealed = new WeakSet();
  function reveal(el) {
    if (revealed.has(el)) return;
    revealed.add(el);
    el.classList.add('rv-in');
    if (el.classList.contains('stats')) countUp(el);
  }

  /* An element that starts hidden by its own clipping is invisible to the
     observer too: a masked line sits outside its overflow:hidden parent, and a
     wipe is clipped to zero width. Both would wait forever for a callback that
     never comes — so watch the parent and reveal the children it holds. */
  var group = new WeakMap();
  function watchTarget(el) {
    var rv = el.getAttribute('data-rv');
    if (rv === 'line' && el.parentNode.classList.contains('line')) return el.parentNode;
    if (rv === 'wipe') return el.parentNode;
    return el;
  }

  var io = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          (group.get(e.target) || [e.target]).forEach(reveal);
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 })
    : null;

  $$('[data-rv]').forEach(function (el) {
    if (reduced || !io) { el.classList.add('rv-in'); if (el.classList.contains('stats')) countUp(el); }
    else {
      var t = watchTarget(el);
      var members = group.get(t);
      if (members) members.push(el);
      else { group.set(t, [el]); io.observe(t); }
    }
  });

  /* counters */
  function countUp(list) {
    $$('.num', list).forEach(function (n) {
      var to = parseFloat(n.getAttribute('data-to')) || 0;
      var suf = n.getAttribute('data-suffix') || '';
      if (reduced) { n.textContent = to + suf; return; }
      var t0 = 0, dur = 1500;
      requestAnimationFrame(function step(ts) {
        if (!t0) t0 = ts;
        var p = clamp((ts - t0) / dur, 0, 1);
        n.textContent = Math.round(to * easeOutExpo(p)) + (p === 1 ? suf : '');
        if (p < 1) requestAnimationFrame(step);
      });
    });
  }

  /* ═══ 3. Nav ═══════════════════════════════════════════════════ */
  var nav = $('#nav');
  var navPrev = 0;
  function onScrollUI(y) {
    nav.classList.toggle('is-stuck', y > 20);
    if (!menuOpen) {
      var down = y > navPrev && y > 520;
      nav.classList.toggle('is-hidden', down);
    }
    navPrev = y;
  }

  /* active section link */
  if (io) {
    var links = {};
    $$('.nav__links a').forEach(function (a) { links[a.getAttribute('href')] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = links['#' + e.target.id];
        if (a && e.isIntersecting) {
          $$('.nav__links a').forEach(function (x) { x.classList.remove('is-active'); });
          a.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* ── anchor navigation ───────────────────────────────────────── */
  function scrollToY(y) {
    y = Math.max(0, Math.min(y, document.body.scrollHeight - window.innerHeight));
    if (reduced) { window.scrollTo(0, y); return; }
    if (smooth) { window.scrollTo(0, y); kick(); return; }   /* shell eases it */
    var from = window.scrollY, d = y - from, t0 = 0, dur = clamp(Math.abs(d) * 0.6, 420, 1100);
    requestAnimationFrame(function step(ts) {
      if (!t0) t0 = ts;
      var p = clamp((ts - t0) / dur, 0, 1);
      window.scrollTo(0, from + d * easeOutExpo(p));
      if (p < 1) requestAnimationFrame(step);
    });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || id === '#main') return;
    var el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    if (menuOpen) closeMenu();
    var top = el.getBoundingClientRect().top + (smooth ? cur : window.scrollY);
    scrollToY(id === '#home' ? 0 : top);
    try { history.replaceState(null, '', id); } catch (err) {}
  });

  /* ── mobile menu ─────────────────────────────────────────────── */
  var burger = $('#burger'), menu = $('#menu'), menuOpen = false;
  function openMenu() {
    menuOpen = true; menu.hidden = false;
    requestAnimationFrame(function () { menu.classList.add('is-open'); });
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
    nav.classList.remove('is-hidden');
  }
  function closeMenu() {
    menuOpen = false;
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
    setTimeout(function () { if (!menuOpen) menu.hidden = true; }, reduced ? 0 : 420);
  }
  burger.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) { closeMenu(); burger.focus(); }
  });

  /* ═══ 4. Language ══════════════════════════════════════════════ */
  var langBtn = $('#langBtn');
  var COPY = {
    ar: { title: 'أوان — استوديو دوبلاج وتعليق صوتي', btn: 'EN', aria: 'Switch to English', menu: 'القائمة' },
    en: { title: 'Awan — Dubbing & Voice-over Studio', btn: 'ع',  aria: 'التبديل إلى العربية', menu: 'Menu' }
  };
  function setLang(lang) {
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    $$('[data-ar]').forEach(function (el) {
      var v = el.getAttribute('data-' + lang);
      if (v != null) el.textContent = v;
    });
    document.title = COPY[lang].title;
    langBtn.textContent = COPY[lang].btn;
    langBtn.setAttribute('aria-label', COPY[lang].aria);
    burger.setAttribute('aria-label', COPY[lang].menu);
    $$('.card__hit').forEach(function (b) {
      var t = b.getAttribute('data-title-' + lang) || '';
      b.setAttribute('aria-label', t);
      var img = $('img', b); if (img) img.alt = t;
    });
    try { localStorage.setItem('awan-lang', lang); } catch (err) {}
    measureParallax();
  }
  var saved = null;
  try { saved = localStorage.getItem('awan-lang'); } catch (err) {}
  setLang(saved === 'en' ? 'en' : 'ar');
  langBtn.addEventListener('click', function () {
    setLang(html.getAttribute('lang') === 'ar' ? 'en' : 'ar');
  });

  /* ═══ 5. Gallery ═══════════════════════════════════════════════ */
  var grid = $('#grid'), cards = $$('.card', grid);

  $$('.chip', $('#filters')).forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-f');
      $$('.chip').forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var i = 0;
      cards.forEach(function (card) {
        var cats = (card.getAttribute('data-cat') || '').split(/\s+/);
        var show = f === 'all' || cats.indexOf(f) > -1;
        card.classList.toggle('is-out', !show);
        if (show && !reduced) {
          /* replay the section's reveal moment with a fresh stagger */
          card.style.setProperty('--i', i++);
          card.classList.remove('rv-in');
          void card.offsetWidth;
          requestAnimationFrame(function () { card.classList.add('rv-in'); });
        }
      });
      if (smooth) setTimeout(setBodyHeight, 60);
    });
  });

  /* ── missing-image fallback: never show a broken poster ──────── */
  function markMissing(img) {
    var frame = img.closest('.card__frame');
    if (!frame) return;
    frame.classList.add('is-empty');
    var cap = img.closest('.card') && $('.card__cap h3', img.closest('.card'));
    frame.setAttribute('data-glyph', cap ? cap.textContent.trim().charAt(0) : 'أ');
  }
  $$('.card__frame img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) markMissing(img);
    img.addEventListener('error', function () { markMissing(img); });
  });
  $$('.brand__logo, .hero__logo').forEach(function (img) {
    var hide = function () { img.style.display = 'none'; };
    if (img.complete && img.naturalWidth === 0) hide();
    img.addEventListener('error', hide);
  });

  /* ── lightbox ────────────────────────────────────────────────── */
  var lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  var supportsDialog = lb && typeof lb.showModal === 'function';
  $$('.card__hit').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var img = $('img', btn);
      if (!supportsDialog || !img || !img.naturalWidth) return;   /* nothing to enlarge */
      var lang = html.getAttribute('lang');
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = btn.getAttribute('data-title-' + lang) || '';
      lb.showModal();
    });
  });
  if (supportsDialog) {
    $('#lbClose').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('close', function () { lbImg.removeAttribute('src'); });
  }

  /* ═══ 6. Boot ══════════════════════════════════════════════════ */
  $('#year').textContent = new Date().getFullYear();

  /* This script is deferred, so the DOM is parsed and every box already has
     its final height (images carry width/height, posters carry aspect-ratio).
     Starting here instead of on `load` means no jolt when the last poster
     finishes downloading — and the hero never waits on fonts or images. */
  if (canSmooth()) enableSmooth(); else measureParallax();
  kick();
  requestAnimationFrame(function () { html.classList.add('is-ready'); });

  window.addEventListener('load', function () {
    if (smooth) setBodyHeight();
    measureParallax();
    kick();
  });

  /* ── resize / motion-preference ──────────────────────────────── */
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (canSmooth()) { enableSmooth(); setBodyHeight(); }
      else disableSmooth();
      measureParallax();
      kick();
    }, 150);
  }, { passive: true });

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(function () { if (smooth) setBodyHeight(); }).observe(scroller);
  }

  var onPref = function () {
    reduced = mqReduce.matches;
    if (reduced) { disableSmooth(); $$('[data-rv]').forEach(function (el) { el.classList.add('rv-in'); }); }
    else if (canSmooth()) enableSmooth();
  };
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', onPref);
  else if (mqReduce.addListener) mqReduce.addListener(onPref);
})();
