// LazyScene — keeps the WebGL canvas off the critical path.
// The heavy <Scene> chunk is code-split and only mounted once it scrolls near
// the viewport, so first paint and LCP never wait on Three.js.
//
// A lightweight `fallback` (a still gradient) holds the space so there is no
// layout shift (CLS) when the canvas appears. Unlike a mount-once observer,
// this one stays alive and reports visibility to the scene, which pauses its
// render loop when the hero scrolls away or the tab is hidden.

import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

const Scene = lazy(() => import('./Scene'));

export default function LazyScene({ fallback = null, rootMargin = '200px' }) {
  const ref = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setMounted(true); // mount once, never unmount
      },
      { rootMargin } // start loading a bit before it's visible
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <div ref={ref} className="scene-wrap">
      {mounted && (
        <Suspense fallback={fallback}>
          <Scene active={inView && tabVisible} reduced={reduced} />
        </Suspense>
      )}
    </div>
  );
}
