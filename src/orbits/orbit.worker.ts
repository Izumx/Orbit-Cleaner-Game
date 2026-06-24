import * as satellite from 'satellite.js';
import { computePositions } from './propagate';

let satrecs: unknown[] = [];

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === 'init') {
    satrecs = (msg.tles as { line1: string; line2: string }[]).map((t) => {
      try { return satellite.twoline2satrec(t.line1, t.line2); }
      catch { return null; }
    }).filter(Boolean);
    (self as unknown as Worker).postMessage({ type: 'ready', count: satrecs.length });
  } else if (msg.type === 'tick') {
    const buf = computePositions(satrecs, new Date(msg.timeMs));
    (self as unknown as Worker).postMessage(
      { type: 'positions', buffer: buf.buffer },
      [buf.buffer]
    );
  }
};
