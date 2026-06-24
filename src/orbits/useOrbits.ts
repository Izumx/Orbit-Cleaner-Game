import { useEffect, useRef, useState } from 'react';
import type { DebrisObject } from '../data/types';

/**
 * Spins a Web Worker that propagates orbital positions for `objects`.
 * IMPORTANT: `objects` MUST be referentially stable across renders (store it
 * in state or wrap in useMemo). Passing a new array identity every render will
 * recreate the worker on each render.
 */
export function useOrbits(objects: DebrisObject[], timeScale = 60) {
  const [positions, setPositions] = useState<Float32Array | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (objects.length === 0) { setPositions(null); return; }
    const worker = new Worker(new URL('./orbit.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'positions') {
        setPositions(new Float32Array(e.data.buffer));
        busyRef.current = false;
      }
    };
    worker.postMessage({
      type: 'init',
      tles: objects.map((o) => ({ line1: o.line1, line2: o.line2 })),
    });

    let raf = 0;
    const start = Date.now();
    const loop = () => {
      if (!busyRef.current) {
        busyRef.current = true;
        const simNow = start + (Date.now() - start) * timeScale;
        worker.postMessage({ type: 'tick', timeMs: simNow });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      busyRef.current = false;
      cancelAnimationFrame(raf);
      worker.terminate();
    };
  }, [objects, timeScale]);

  return { positions };
}
