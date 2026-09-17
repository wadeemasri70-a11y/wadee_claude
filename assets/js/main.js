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
  /* 10,000 reads better than 10000 */
  function commas(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function countUp(list) {
    $$('.num', list).forEach(function (n) {
      var to = parseFloat(n.getAttribute('data-to')) || 0;
      var suf = n.getAttribute('data-suffix') || '';
      if (reduced) { n.textContent = commas(to) + suf; return; }
      var t0 = 0, dur = 1500;
      requestAnimationFrame(function step(ts) {
        if (!t0) t0 = ts;
        var p = clamp((ts - t0) / dur, 0, 1);
        n.textContent = commas(Math.round(to * easeOutExpo(p))) + (p === 1 ? suf : '');
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
    en: { title: 'Awan — Dubbing & Voice-over Studio', btn: 'AR', aria: 'التبديل إلى العربية', menu: 'Menu' }
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
    $$('.rcard__hit').forEach(function (b) {
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

  /* ── missing-image fallback: never show a broken poster ──────── */
  function markMissing(img) {
    var frame = img.closest('.rcard__frame');
    if (!frame) return;
    frame.classList.add('is-empty');
    var item = img.closest('.rcard');
    var cap = item && $('h3', item);
    frame.setAttribute('data-glyph', cap ? cap.textContent.trim() : 'أوان');
  }
  $$('.rcard__frame img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) markMissing(img);
    img.addEventListener('error', function () { markMissing(img); });
  });
  /* ── the hero reel ────────────────────────────────────────────
     A missing or unplayable file must never leave a black rectangle:
     the stage falls back to its poster, then to the paper gradient with
     the sound wave drawn back over it. */
  (function () {
    var stage = $('.hero__media'), vid = $('#heroVideo'), hero = $('#home');
    if (!stage || !vid || !hero) return;

    var posterOk = false;
    function haveReel() {
      /* readyState climbs past 0 only once real data has arrived */
      return vid.readyState > 0 || (vid.currentSrc && vid.videoWidth > 0);
    }
    function keep() { hero.classList.add('has-reel'); }
    /* No video is not the same as nothing: the <video> keeps painting its
       poster when the media fails, so only an empty stage falls back to the
       gradient and the wave. */
    function drop() {
      try { vid.pause(); } catch (err) {}
      if (posterOk) return;
      stage.classList.add('is-empty');
      hero.classList.remove('has-reel');
    }

    vid.addEventListener('loadeddata', keep);
    vid.addEventListener('error', drop, true);
    $$('source', vid).forEach(function (src) { src.addEventListener('error', drop); });
    /* autoplay can be refused (data saver, a policy) — not a reason to hide */
    var p = vid.play && vid.play();
    if (p && p.catch) p.catch(function () {});
    setTimeout(function () { if (!haveReel()) drop(); }, 2500);
    if (vid.poster) {
      var pi = new Image();
      pi.onload = function () { posterOk = true; stage.classList.remove('is-empty'); keep(); };
      pi.onerror = function () { if (!haveReel()) drop(); };
      pi.src = vid.poster;
    }
  })();

  $$('.brand__logo, .hero__bird, .foot__logo').forEach(function (img) {
    var hide = function () { img.style.display = 'none'; };
    if (img.complete && img.naturalWidth === 0) hide();
    img.addEventListener('error', hide);
  });

  /* ── rails: native horizontal scroll, nothing hijacked ────────
     Each row is a real scroll container, so a touch swipe, a trackpad
     flick and the arrow keys all work for free. We only add what the
     browser doesn't give us: a progress bar, two buttons that move by
     exactly one card, pointer-drag on desktop, and a slight drift of
     each photo inside its frame to build depth as the row moves.
     Runs once per .rail — the studio photos and the work posters. */
  $$('.rail').forEach(function (rail) {
    /* the bar and the buttons live outside the scroller, below it — and the
       work section holds two rails, so scope to the group before the section */
    var scope = rail.closest('.wgroup') || rail.closest('section') || document;
    var track = $('.rail__track', rail);
    var cards = $$('.rcard', rail);
    var posters = rail.classList.contains('rail--posters');
    var fill = $('.rail__fill', scope);
    var prev = $('.rail__btn--prev', scope), next = $('.rail__btn--next', scope);
    if (!track || !cards.length) return;

    /* RTL reports scrollLeft as 0 → -max, LTR as 0 → +max. */
    function maxScroll() { return rail.scrollWidth - rail.clientWidth; }
    function progress() {
      var m = maxScroll();
      return m > 1 ? Math.min(1, Math.abs(rail.scrollLeft) / m) : 1;
    }
    function sign() { return html.getAttribute('dir') === 'rtl' ? -1 : 1; }
    /* Cards are not all the same width any more, so "one card along" means
       the next card's leading edge, not a fixed number of pixels. */
    function edges() {
      var pad = parseFloat(getComputedStyle(track).paddingInlineStart) || 0;
      var t = track.getBoundingClientRect(), rtl = sign() < 0;
      return cards.map(function (c) {
        var b = c.getBoundingClientRect();
        return Math.round(Math.abs(rtl ? t.right - b.right : b.left - t.left) - pad);
      });
    }
    function step(dir) {
      var here = Math.abs(rail.scrollLeft), e = edges(), i;
      if (dir > 0) {
        for (i = 0; i < e.length; i++) if (e[i] > here + 4) return e[i] - here;
      } else {
        for (i = e.length - 1; i >= 0; i--) if (e[i] < here - 4) return here - e[i];
      }
      var r = cards[0].getBoundingClientRect();
      return r.width + (parseFloat(getComputedStyle(track).columnGap) || 0);
    }

    /* Scroll the rail ourselves so it lands on the site's own curve
       rather than the browser's built-in smooth-scroll easing. */
    var anim = 0;
    function glideTo(x) {
      cancelAnimationFrame(anim);
      var m = maxScroll(), s = sign();
      x = s > 0 ? clamp(x, 0, m) : clamp(x, -m, 0);
      if (reduced) { rail.scrollLeft = x; return; }
      var from = rail.scrollLeft, d = x - from, t0 = 0;
      var dur = clamp(Math.abs(d) * 0.7, 320, 900);
      anim = requestAnimationFrame(function run(ts) {
        if (!t0) t0 = ts;
        var p = clamp((ts - t0) / dur, 0, 1);
        rail.scrollLeft = from + d * easeOutExpo(p);
        if (p < 1) anim = requestAnimationFrame(run);
      });
    }

    function paint() {
      var p = progress();
      if (fill) fill.style.transform = 'scaleX(' + Math.max(0.08, p).toFixed(3) + ')';
      if (prev) prev.disabled = p <= 0.001;
      if (next) next.disabled = p >= 0.999;

      if (reduced) return;
      /* photo drifts the opposite way to the card, inside its frame. On the
         poster rail the artwork is shown whole, so the drift is handed to the
         blurred fill behind it instead — moving the poster would crop it. */
      var rr = rail.getBoundingClientRect(), mid = rr.left + rr.width / 2;
      for (var i = 0; i < cards.length; i++) {
        var b = cards[i].getBoundingClientRect();
        if (b.right < rr.left - 200 || b.left > rr.right + 200) continue;
        var frame = cards[i].querySelector('.rcard__frame');
        if (!frame) continue;
        var off = clamp(((b.left + b.width / 2) - mid) / rr.width * -26, -26, 26);
        if (posters) frame.style.setProperty('--drift', off.toFixed(1) + 'px');
        else {
          var img = $('img', frame);
          if (img) img.style.transform = 'translate3d(' + off.toFixed(1) + 'px,0,0) scale(1.08)';
        }
      }
    }

    var queued = false;
    rail.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; paint(); });
    }, { passive: true });

    if (prev) prev.addEventListener('click', function () {
      glideTo(rail.scrollLeft - sign() * step(-1));
    });
    if (next) next.addEventListener('click', function () {
      glideTo(rail.scrollLeft + sign() * step(1));
    });

    /* drag to scroll (mouse/pen only — touch already scrolls natively) */
    var down = false, startX = 0, startLeft = 0, moved = 0;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      down = true; moved = 0;
      startX = e.clientX; startLeft = rail.scrollLeft;
      cancelAnimationFrame(anim);
      rail.style.scrollSnapType = 'none';       /* let the drag run free */
      rail.classList.add('is-grabbing');
    });
    rail.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 3) {
        if (!moved) rail.setPointerCapture(e.pointerId);
        moved = Math.max(moved, Math.abs(dx));
        rail.scrollLeft = startLeft - dx;
      }
    });
    function endDrag() {
      if (!down) return;
      down = false;
      rail.classList.remove('is-grabbing');
      rail.style.scrollSnapType = '';           /* snap to the nearest card */
    }
    rail.addEventListener('pointerup', endDrag);
    rail.addEventListener('pointercancel', endDrag);
    /* a drag that moved is not a click on the photo underneath */
    rail.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; }
    }, true);

    /* ── auto-drift: the work row moves on its own ──────────────
       The cards are cloned once and the row is wrapped back by exactly
       one set when it passes it, so the loop has no seam. It yields the
       moment anyone touches it — hover, focus, drag — and never runs
       off-screen, on a hidden tab, or under prefers-reduced-motion. */
    /* a negative rate drifts the other way — the two work rows run opposite */
    var auto = parseFloat(rail.getAttribute('data-auto')) || 0;
    if (auto && !reduced) {
      if (fill && fill.parentNode) fill.parentNode.style.display = 'none';  /* a loop has no progress */

      var originals = cards.slice();
      function oneSet() {                                  /* width of one full set */
        var gap = parseFloat(getComputedStyle(track).columnGap) || 0, w = 0;
        originals.forEach(function (c) { w += c.getBoundingClientRect().width + gap; });
        return w;
      }
      /* Enough copies that a lap is always wider than the window — a short
         set (four posters, say) would otherwise run out of cards before it
         wrapped, and the loop would show a gap at its seam. */
      var sets = Math.max(1, Math.ceil((rail.clientWidth + 240) / Math.max(oneSet(), 1)));
      for (var k = 0; k < sets; k++) {
        originals.forEach(function (card) {
          var c = card.cloneNode(true);
          c.classList.add('rail__item--clone', 'rv-in');  /* clones arrive already revealed */
          c.setAttribute('aria-hidden', 'true');
          $$('a, button', c).forEach(function (el) { el.tabIndex = -1; });
          track.appendChild(c);
        });
      }
      cards = $$('.rcard', rail);                          /* drift the clones too */

      var lap = 0;
      function measure() { lap = oneSet(); }
      measure();

      var pos = 0, held = 0, wrote = null, onScreen = true, raf = 0, prevTs = 0;
      function hold(on) { held += on ? 1 : -1; if (held < 0) held = 0; }

      rail.addEventListener('pointerenter', function () { hold(true); });
      rail.addEventListener('pointerleave', function () { hold(false); });
      rail.addEventListener('focusin', function () { hold(true); });
      rail.addEventListener('focusout', function () { hold(false); });
      rail.addEventListener('touchstart', function () { hold(true); }, { passive: true });
      rail.addEventListener('touchend', function () { hold(false); }, { passive: true });


      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; },
                                 { rootMargin: '120px' }).observe(rail);
      }

      function drift(ts) {
        raf = requestAnimationFrame(drift);
        var dt = prevTs ? Math.min((ts - prevTs) / 1000, 0.05) : 0.016;
        prevTs = ts;
        if (held || down || !onScreen || document.hidden || !lap) return;
        /* if the row sits anywhere but where we last put it, someone else
           moved it (a drag, the arrows, a wheel) — pick up from there
           rather than yanking it back */
        if (wrote !== null && Math.abs(rail.scrollLeft - wrote) > 1.5) pos = Math.abs(rail.scrollLeft);
        pos += auto * dt;
        while (pos >= lap) pos -= lap;                     /* seamless wrap: one full set */
        while (pos < 0) pos += lap;                        /* …in either direction */
        rail.scrollLeft = sign() * pos;
        wrote = rail.scrollLeft;                           /* read back what the browser kept */
      }
      raf = requestAnimationFrame(drift);

      document.addEventListener('visibilitychange', function () { prevTs = 0; });
      window.addEventListener('resize', function () {
        setTimeout(function () { measure(); pos = Math.abs(rail.scrollLeft) % (lap || 1); }, 200);
      }, { passive: true });
    }

    window.addEventListener('resize', function () { setTimeout(paint, 160); }, { passive: true });
    paint();
  });

  /* ── lightbox ────────────────────────────────────────────────── */
  var lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  var supportsDialog = lb && typeof lb.showModal === 'function';
  /* delegated: the marquee clones its cards after this runs */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.rcard__hit');
    if (!btn) return;
    var img = $('img', btn);
    if (!supportsDialog || !img || !img.naturalWidth) return;     /* nothing to enlarge */
    var lang = html.getAttribute('lang');
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = btn.getAttribute('data-title-' + lang) || '';
    lb.showModal();
  });
  if (supportsDialog) {
    $('#lbClose').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('close', function () { lbImg.removeAttribute('src'); });
  }

  /* ── day / night ──────────────────────────────────────────────
     The theme is already on <html> before first paint (see the inline
     script in the head), so this only has to handle the button and
     keep following the system until someone overrides it. */
  (function () {
    var btn = $('#themeBtn');
    if (!btn) return;
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var chosen = null;
    try { chosen = localStorage.getItem('awan-theme'); } catch (err) {}
    if (chosen !== 'day' && chosen !== 'night') chosen = null;

    function apply(t, remember) {
      html.setAttribute('data-theme', t);
      btn.setAttribute('aria-pressed', t === 'night' ? 'true' : 'false');
      var meta = $('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content',
        getComputedStyle(html).getPropertyValue('--paper').trim() || '#f4f1ec');
      if (remember) { chosen = t; try { localStorage.setItem('awan-theme', t); } catch (err) {} }
      /* the canvas wave picks its colour off --accent, so tell it to re-read */
      window.dispatchEvent(new CustomEvent('awan:theme'));
    }
    apply(chosen || (mq.matches ? 'night' : 'day'), false);
    btn.addEventListener('click', function () {
      apply(html.getAttribute('data-theme') === 'night' ? 'day' : 'night', true);
    });
    var follow = function () { if (!chosen) apply(mq.matches ? 'night' : 'day', false); };
    if (mq.addEventListener) mq.addEventListener('change', follow);
    else if (mq.addListener) mq.addListener(follow);
  })();

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
