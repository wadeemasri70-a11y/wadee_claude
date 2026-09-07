// useLenis — smooth scroll wired into GSAP's ticker so ScrollTrigger stays
// perfectly in sync (no double rAF loops, no jitter). Skips smooth scroll
// entirely for reduced-motion users and falls back to native scrolling.
//
// Requires: npm i lenis gsap

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useLenis({ lerp = 0.1 } = {}) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // native scroll — no smoothing

    const lenis = new Lenis({ lerp });

    // one source of truth: Lenis drives ScrollTrigger updates
    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time) => lenis.raf(time * 1000); // gsap time is seconds
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [lerp]);
}
