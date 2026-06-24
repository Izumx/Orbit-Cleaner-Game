import { useEffect, useRef, useState } from 'react';
import type { DebrisObject } from '../data/types';

export function useOrbits(objects: DebrisObject[], timeScale = 60) {
  const [positions, setPositions] = useState<Float32Array | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (objects.length === 0) return;
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
      cancelAnimationFrame(raf);
      worker.terminate();
    };
  }, [objects, timeScale]);

  return { positions };
}
