// Scene — the AWAN "voice field": an instanced grid of bars driven by a radial
// wave, so the hero reads as sound made visible.
//
// Fast by construction: one draw call for ~550 bars (InstancedMesh), no model
// download, no HDRI, unlit material, capped DPR, and fog doing the depth work.
// The frame loop is gated by `active` so it stops dead when the canvas is
// off-screen or the tab is hidden.

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const COLS = 34;
const ROWS = 16;
const COUNT = COLS * ROWS;
const SPACING = 0.26;

const GOLD = new THREE.Color('#f5b544');
const CYAN = new THREE.Color('#46e6d8');
const DEEP = new THREE.Color('#2b3550');

function VoiceField({ active, reduced }) {
  const mesh = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const amp = useRef(reduced ? 1 : 0); // swells in once, with the headline
  const clock = useRef(0);
  const invalidate = useThree((s) => s.invalidate);

  // Per-instance layout + colour: computed once, never per frame.
  const cells = useMemo(() => {
    const out = [];
    for (let i = 0; i < COLS; i++) {
      for (let j = 0; j < ROWS; j++) {
        const x = (i - (COLS - 1) / 2) * SPACING;
        const z = (j - (ROWS - 1) / 2) * SPACING;
        const d = Math.hypot(x, z * 1.35);
        out.push({ x, z, d, falloff: Math.exp(-d * 0.42) });
      }
    }
    return out;
  }, []);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new THREE.Color();
    cells.forEach((cell, k) => {
      const t = Math.min(1, cell.d / 2.6);
      c.copy(GOLD).lerp(CYAN, t * 0.55).lerp(DEEP, t * 0.7);
      m.setColorAt(k, c);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [cells]);

  // A static pose for reduced motion / the first painted frame.
  const write = (time) => {
    const m = mesh.current;
    if (!m) return;
    for (let k = 0; k < COUNT; k++) {
      const { x, z, d, falloff } = cells[k];
      const wave = Math.sin(d * 2.1 - time * 1.7) * 0.5 + 0.5;
      const h = 0.05 + amp.current * (0.06 + wave * 1.15 * falloff);
      dummy.position.set(x, h / 2, z);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      m.setMatrixAt(k, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  };

  useEffect(() => {
    write(reduced ? 1.2 : 0);
    invalidate(); // the first pose must land even under frameloop="demand"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, reduced]);

  useFrame(({ camera }, delta) => {
    if (!active || reduced) return;
    const d = Math.min(delta, 0.05); // a backgrounded tab must not jump the wave
    clock.current += d;
    amp.current = Math.min(1, amp.current + d * 0.9);
    write(clock.current);

    // one slow drift — depth, not decoration
    camera.position.x = Math.sin(clock.current * 0.16) * 0.28;
    camera.position.y = 1.35 + Math.sin(clock.current * 0.21) * 0.06;
    camera.lookAt(0, 0.25, 0);
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, COUNT]}
      frustumCulled={false}
      rotation={[0, -0.22, 0]}
    >
      <boxGeometry args={[0.055, 1, 0.055]} />
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
}

export default function Scene({ active = true, reduced = false }) {
  return (
    <Canvas
      dpr={[1, reduced ? 1 : 2]}
      frameloop={active && !reduced ? 'always' : 'demand'}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 1.35, 4.2], fov: 42 }}
      onCreated={({ scene, camera }) => {
        scene.fog = new THREE.Fog('#04050a', 3.2, 8.4);
        camera.lookAt(0, 0.25, 0);
      }}
    >
      <VoiceField active={active} reduced={reduced} />
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
