# OrbitClean MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser 3D platform showing a photorealistic Earth with a swarm of 10 000+ real orbital objects on their true orbits; clicking an object opens a card with real data and a data-driven question that, when answered correctly, "cleans" the object, awards points, and lowers a Kessler congestion meter.

**Architecture:** Vite + React + TypeScript single-page app. Pure logic (TLE parsing, categorization, SGP4 propagation, question generation, game state) is isolated in framework-free modules and unit-tested with Vitest. The 3D scene is built with react-three-fiber and verified in the browser. Orbital positions for all objects are computed in a Web Worker (SGP4 is the expensive part) and streamed to the main thread, which updates a single `THREE.Points` buffer every frame.

**Tech Stack:** Vite, React 18, TypeScript, three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing, satellite.js, zustand, Vitest + @testing-library/react.

## Global Constraints

- **Node:** 18+ (required by Vite 5).
- **Package manager:** npm.
- **Privacy (hard rule):** Commit author email MUST stay `Izumx@users.noreply.github.com` (local git config already set). Never commit `.env`/secrets or `.claude/` (already in `.gitignore`). After any push, the only author email in history must be the noreply one.
- **Repo:** Push all work to `https://github.com/Izumx/Orbit-Cleaner-Game` (`origin/main`).
- **Attribution:** "Developed by Eskendir Bakhitzhanov" appears only in the About panel / footer — never dominating the main screen.
- **Data honesty:** Orbital catalog is sourced from CelesTrak (US Space Force / Space-Track data). NASA is credited only for Earth textures. Label sources accordingly in UI.
- **Performance target:** 60 fps with 10 000+ objects on a mid-range laptop.
- **Tests:** Co-locate `*.test.ts` next to the source file. Run with `npx vitest run`.
- **Coordinate convention:** Earth at origin, three.js Y-up. ECI (km) → scene maps `(x, y, z)_eci → (x, z, -y)_three`, scaled by `SCALE_KM_TO_SCENE`.

---

## File Structure

```
package.json, vite.config.ts, tsconfig.json, index.html
public/textures/            # earth-day.jpg, earth-night.png, earth-clouds.png, earth-bump.jpg
src/
  main.tsx                  # React entry
  App.tsx                   # composes Scene + HUD + ObjectCard + About
  config/constants.ts       # radii, scale, colors, CelesTrak URLs
  data/types.ts             # DebrisObject, Category, Question
  data/categorize.ts        # categorizeObject(name) -> Category
  data/tle.ts               # fetchTLEs(), parseTLE() -> DebrisObject[]
  orbits/propagate.ts       # eciToScene(), computePositions(satrecs, date) -> Float32Array
  orbits/orbit.worker.ts    # worker wrapping propagate
  orbits/useOrbits.ts       # hook: spins worker, exposes positions buffer + tick
  scene/Scene.tsx           # Canvas, lights, controls, postprocessing
  scene/Earth.tsx           # day/night/clouds/bump layers + atmosphere
  scene/Starfield.tsx       # background stars
  scene/DebrisField.tsx     # THREE.Points swarm + colors + raycasting
  scene/SelectedMarker.tsx  # glow ring on the selected object
  game/questions.ts         # generateQuestion(obj) -> Question
  game/store.ts             # zustand: score, caught, selectedId, actions, kesslerIndex
  ui/HUD.tsx                # score + KesslerMeter
  ui/KesslerMeter.tsx       # congestion bar
  ui/ObjectCard.tsx         # selected object data + question
  ui/About.tsx              # attribution
```

---

## Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`
- Test: `src/sanity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a running dev server (`npm run dev`) and a working test runner (`npx vitest run`).

- [ ] **Step 1: Scaffold with Vite and install deps**

Run:
```bash
cd "D:/PROJECTS FOR NASA"
npm create vite@latest . -- --template react-ts
npm install
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing satellite.js zustand
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/three
```
If `npm create vite` refuses because the folder is non-empty, scaffold in a temp dir and copy `src/`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `package.json` over (do NOT overwrite `.gitignore`, `README.md`, `docs/`).

- [ ] **Step 2: Configure Vitest in `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

Create `src/test-setup.ts`:
```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 3: Write a sanity test**

`src/sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run`
Expected: PASS, 1 test.

- [ ] **Step 5: Minimal App shell**

`src/App.tsx`:
```tsx
export default function App() {
  return <div style={{ position: 'fixed', inset: 0, background: '#000' }} />;
}
```

- [ ] **Step 6: Verify dev server**

Run: `npm run dev`
Expected: server starts, opening the URL shows a black full-screen page, no console errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Vitest"
git push
```

---

## Task 2: Object categorization

**Files:**
- Create: `src/data/types.ts`, `src/data/categorize.ts`
- Test: `src/data/categorize.test.ts`

**Interfaces:**
- Produces:
  - `type Category = 'satellite' | 'rocket' | 'debris'`
  - `categorizeObject(name: string): Category`
  - `interface DebrisObject { id: string; name: string; line1: string; line2: string; category: Category; satrec: unknown }`
  - `interface Question { text: string; options: string[]; correctIndex: number; explanation: string }`

- [ ] **Step 1: Write the failing test**

`src/data/categorize.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { categorizeObject } from './categorize';

describe('categorizeObject', () => {
  it('flags debris from DEB suffix', () => {
    expect(categorizeObject('COSMOS 2251 DEB')).toBe('debris');
    expect(categorizeObject('FENGYUN 1C DEB')).toBe('debris');
  });
  it('flags rocket bodies', () => {
    expect(categorizeObject('SL-16 R/B')).toBe('rocket');
    expect(categorizeObject('ATLAS 5 CENTAUR R/B')).toBe('rocket');
  });
  it('defaults to satellite', () => {
    expect(categorizeObject('ISS (ZARYA)')).toBe('satellite');
    expect(categorizeObject('STARLINK-1234')).toBe('satellite');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/categorize.test.ts`
Expected: FAIL ("categorizeObject is not a function" / module not found).

- [ ] **Step 3: Implement types and categorize**

`src/data/types.ts`:
```ts
export type Category = 'satellite' | 'rocket' | 'debris';

export interface DebrisObject {
  id: string;        // NORAD catalog id
  name: string;
  line1: string;
  line2: string;
  category: Category;
  satrec: unknown;   // satellite.js SatRec (kept opaque to consumers)
}

export interface Question {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
```

`src/data/categorize.ts`:
```ts
import type { Category } from './types';

export function categorizeObject(name: string): Category {
  const n = name.toUpperCase();
  if (n.includes('DEB') || n.includes('DEBRIS')) return 'debris';
  if (n.includes('R/B') || n.includes('ROCKET')) return 'rocket';
  return 'satellite';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/categorize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/types.ts src/data/categorize.ts src/data/categorize.test.ts
git commit -m "feat: object types and categorization"
git push
```

---

## Task 3: TLE parsing

**Files:**
- Create: `src/config/constants.ts`, `src/data/tle.ts`
- Test: `src/data/tle.test.ts`

**Interfaces:**
- Consumes: `categorizeObject`, `DebrisObject`.
- Produces:
  - `parseTLE(raw: string): DebrisObject[]` — parses 3-line TLE blocks.
  - `fetchTLEs(): Promise<DebrisObject[]>` — fetches + caches from CelesTrak.
  - `constants.ts`: `EARTH_RADIUS_KM`, `SCENE_EARTH_RADIUS`, `SCALE_KM_TO_SCENE`, `CATEGORY_COLORS`, `CELESTRAK_GROUPS`.

- [ ] **Step 1: Write the failing test**

`src/data/tle.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseTLE } from './tle';

const SAMPLE = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005
2 25544  51.6400 247.4627 0006703 130.5360 325.0288 15.50000000    05
COSMOS 2251 DEB
1 34427U 93036SX  24001.50000000  .00000500  00000-0  20000-3 0  9991
2 34427  74.0000 100.0000 0010000  50.0000 310.0000 14.20000000    03`;

describe('parseTLE', () => {
  it('parses each 3-line block into an object', () => {
    const objs = parseTLE(SAMPLE);
    expect(objs).toHaveLength(2);
    expect(objs[0].name).toBe('ISS (ZARYA)');
    expect(objs[0].id).toBe('25544');
    expect(objs[0].category).toBe('satellite');
    expect(objs[1].category).toBe('debris');
    expect(objs[0].satrec).toBeTruthy();
  });
  it('skips malformed trailing lines', () => {
    const objs = parseTLE(SAMPLE + '\nINCOMPLETE NAME\n1 99999U');
    expect(objs).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/tle.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement constants**

`src/config/constants.ts`:
```ts
export const EARTH_RADIUS_KM = 6371;
export const SCENE_EARTH_RADIUS = 2;
export const SCALE_KM_TO_SCENE = SCENE_EARTH_RADIUS / EARTH_RADIUS_KM;

export const CATEGORY_COLORS: Record<string, [number, number, number]> = {
  satellite: [0.4, 0.8, 1.0], // cyan
  rocket: [1.0, 0.7, 0.2],    // orange
  debris: [1.0, 0.3, 0.3],    // red
};

// CelesTrak GP groups (CORS-enabled, TLE format). Combined > 10k objects.
export const CELESTRAK_GROUPS = [
  'active',
  'cosmos-2251-debris',
  'iridium-33-debris',
  'fengyun-1c-debris',
  'cosmos-1408-debris',
];

export const celestrakUrl = (group: string) =>
  `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`;

export const TLE_CACHE_KEY = 'orbitclean.tle.v1';
export const TLE_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h
```

- [ ] **Step 4: Implement tle.ts**

`src/data/tle.ts`:
```ts
import * as satellite from 'satellite.js';
import type { DebrisObject } from './types';
import { categorizeObject } from './categorize';
import {
  CELESTRAK_GROUPS,
  celestrakUrl,
  TLE_CACHE_KEY,
  TLE_CACHE_TTL_MS,
} from '../config/constants';

export function parseTLE(raw: string): DebrisObject[] {
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));
  const out: DebrisObject[] = [];
  for (let i = 0; i + 2 < lines.length + 1; i += 3) {
    const name = lines[i]?.trim();
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!name || !l1?.startsWith('1 ') || !l2?.startsWith('2 ')) continue;
    const id = l1.substring(2, 7).trim();
    let satrec: unknown;
    try {
      satrec = satellite.twoline2satrec(l1, l2);
    } catch {
      continue;
    }
    out.push({ id, name, line1: l1, line2: l2, category: categorizeObject(name), satrec });
  }
  return out;
}

function dedupe(objs: DebrisObject[]): DebrisObject[] {
  const seen = new Set<string>();
  return objs.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
}

export async function fetchTLEs(): Promise<DebrisObject[]> {
  const cached = readCache();
  if (cached) return dedupe(parseTLE(cached));

  const texts = await Promise.all(
    CELESTRAK_GROUPS.map((g) =>
      fetch(celestrakUrl(g))
        .then((r) => (r.ok ? r.text() : ''))
        .catch(() => '')
    )
  );
  const raw = texts.join('\n');
  if (raw.trim()) writeCache(raw);
  return dedupe(parseTLE(raw));
}

function readCache(): string | null {
  try {
    const item = localStorage.getItem(TLE_CACHE_KEY);
    if (!item) return null;
    const { ts, raw } = JSON.parse(item);
    if (Date.now() - ts > TLE_CACHE_TTL_MS) return null;
    return raw;
  } catch {
    return null;
  }
}

function writeCache(raw: string): void {
  try {
    localStorage.setItem(TLE_CACHE_KEY, JSON.stringify({ ts: Date.now(), raw }));
  } catch {
    /* quota — ignore */
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/tle.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/config/constants.ts src/data/tle.ts src/data/tle.test.ts
git commit -m "feat: TLE fetch, cache and parsing"
git push
```

---

## Task 4: SGP4 propagation + ECI→scene conversion

**Files:**
- Create: `src/orbits/propagate.ts`
- Test: `src/orbits/propagate.test.ts`

**Interfaces:**
- Consumes: `DebrisObject.satrec`, `SCALE_KM_TO_SCENE`.
- Produces:
  - `eciToScene(eci: {x:number;y:number;z:number}): [number, number, number]`
  - `computePositions(satrecs: unknown[], date: Date): Float32Array` — length `satrecs.length * 3`, scene coords; objects that fail to propagate get `NaN` (so the field can hide them).
  - `altitudeKm(eci: {x:number;y:number;z:number}): number`

- [ ] **Step 1: Write the failing test**

`src/orbits/propagate.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import * as satellite from 'satellite.js';
import { computePositions, eciToScene, altitudeKm } from './propagate';
import { SCALE_KM_TO_SCENE } from '../config/constants';

const ISS_L1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005';
const ISS_L2 = '2 25544  51.6400 247.4627 0006703 130.5360 325.0288 15.50000000    05';

describe('propagate', () => {
  it('maps ECI km to scaled Y-up scene coords', () => {
    expect(eciToScene({ x: 6371, y: 0, z: 0 })).toEqual([
      6371 * SCALE_KM_TO_SCENE, 0, 0,
    ]);
    // ECI z (north) becomes scene y
    expect(eciToScene({ x: 0, y: 0, z: 6371 })[1]).toBeCloseTo(2, 5);
  });

  it('places ISS at low-earth-orbit altitude', () => {
    const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);
    const pv = satellite.propagate(satrec, new Date(Date.UTC(2024, 0, 1, 12)));
    const alt = altitudeKm(pv.position as any);
    expect(alt).toBeGreaterThan(300);
    expect(alt).toBeLessThan(500);
  });

  it('computePositions returns 3 floats per object', () => {
    const satrec = satellite.twoline2satrec(ISS_L1, ISS_L2);
    const buf = computePositions([satrec, satrec], new Date(Date.UTC(2024, 0, 1, 12)));
    expect(buf.length).toBe(6);
    expect(Number.isNaN(buf[0])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/orbits/propagate.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement propagate.ts**

`src/orbits/propagate.ts`:
```ts
import * as satellite from 'satellite.js';
import { EARTH_RADIUS_KM, SCALE_KM_TO_SCENE } from '../config/constants';

interface Eci { x: number; y: number; z: number }

export function eciToScene(eci: Eci): [number, number, number] {
  return [
    eci.x * SCALE_KM_TO_SCENE,
    eci.z * SCALE_KM_TO_SCENE,
    -eci.y * SCALE_KM_TO_SCENE,
  ];
}

export function altitudeKm(eci: Eci): number {
  return Math.sqrt(eci.x * eci.x + eci.y * eci.y + eci.z * eci.z) - EARTH_RADIUS_KM;
}

export function computePositions(satrecs: unknown[], date: Date): Float32Array {
  const out = new Float32Array(satrecs.length * 3);
  for (let i = 0; i < satrecs.length; i++) {
    let pos: Eci | false = false;
    try {
      const pv = satellite.propagate(satrecs[i] as satellite.SatRec, date);
      pos = pv && pv.position ? (pv.position as Eci) : false;
    } catch {
      pos = false;
    }
    if (pos && Number.isFinite(pos.x)) {
      const [x, y, z] = eciToScene(pos);
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    } else {
      out[i * 3] = NaN; out[i * 3 + 1] = NaN; out[i * 3 + 2] = NaN;
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/orbits/propagate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/orbits/propagate.ts src/orbits/propagate.test.ts
git commit -m "feat: SGP4 propagation and ECI to scene conversion"
git push
```

---

## Task 5: Orbit Web Worker + useOrbits hook

**Files:**
- Create: `src/orbits/orbit.worker.ts`, `src/orbits/useOrbits.ts`
- Test: `src/orbits/orbit.worker.test.ts` (tests the pure compute path the worker calls)

**Interfaces:**
- Consumes: `computePositions`, `DebrisObject`.
- Produces:
  - Worker protocol: post `{ type: 'init', tles: {line1,line2}[] }`, then `{ type: 'tick', timeMs: number }`; worker replies `{ type: 'positions', buffer: ArrayBuffer }` (transferable).
  - `useOrbits(objects: DebrisObject[], timeScale: number): { positions: Float32Array | null }` — React hook that spins the worker, drives ticks via `requestAnimationFrame`, and exposes the latest positions buffer.

- [ ] **Step 1: Write the failing test (worker compute contract)**

`src/orbits/orbit.worker.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import * as satellite from 'satellite.js';
import { computePositions } from './propagate';

// The worker rebuilds satrecs from TLE lines, then calls computePositions.
// This test locks the contract the worker relies on.
describe('worker compute contract', () => {
  it('rebuilds satrecs from lines and produces positions', () => {
    const l1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005';
    const l2 = '2 25544  51.6400 247.4627 0006703 130.5360 325.0288 15.50000000    05';
    const satrecs = [satellite.twoline2satrec(l1, l2)];
    const buf = computePositions(satrecs, new Date(1704110400000));
    expect(buf.length).toBe(3);
    expect(Number.isFinite(buf[0])).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it passes the contract**

Run: `npx vitest run src/orbits/orbit.worker.test.ts`
Expected: PASS (this guards the function the worker uses; the worker file itself is verified in the browser).

- [ ] **Step 3: Implement the worker**

`src/orbits/orbit.worker.ts`:
```ts
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
```

- [ ] **Step 4: Implement the hook**

`src/orbits/useOrbits.ts`:
```ts
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
```

- [ ] **Step 5: Commit**

```bash
git add src/orbits/orbit.worker.ts src/orbits/useOrbits.ts src/orbits/orbit.worker.test.ts
git commit -m "feat: orbit web worker and useOrbits hook"
git push
```

---

## Task 6: Scene shell — Canvas, controls, starfield

**Files:**
- Create: `src/scene/Scene.tsx`, `src/scene/Starfield.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: nothing yet (Earth/Debris added later).
- Produces: `<Scene>` component mounting an R3F `<Canvas>` with camera, lighting, `OrbitControls` (auto-rotate), and `<Starfield>`.

- [ ] **Step 1: Implement Starfield**

`src/scene/Starfield.tsx`:
```tsx
import { Stars } from '@react-three/drei';

export function Starfield() {
  return <Stars radius={300} depth={60} count={8000} factor={7} saturation={0} fade speed={0.5} />;
}
```

- [ ] **Step 2: Implement Scene**

`src/scene/Scene.tsx`:
```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Starfield } from './Starfield';

export function Scene() {
  return (
    <Canvas camera={{ position: [0, 2, 6], fov: 50 }} dpr={[1, 2]}>
      <color attach="background" args={['#01020a']} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={1.6} />
      <Starfield />
      <OrbitControls
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
        minDistance={3}
        maxDistance={20}
      />
    </Canvas>
  );
}
```

- [ ] **Step 3: Wire into App**

`src/App.tsx`:
```tsx
import { Scene } from './scene/Scene';

export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Scene />
    </div>
  );
}
```

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Expected: dark scene with a slowly drifting starfield; mouse drag orbits the camera; scroll zooms. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/scene/Scene.tsx src/scene/Starfield.tsx src/App.tsx
git commit -m "feat: 3D scene shell with controls and starfield"
git push
```

---

## Task 7: Photorealistic Earth + atmosphere

**Files:**
- Create: `src/scene/Earth.tsx`
- Modify: `src/scene/Scene.tsx`
- Assets: `public/textures/earth-day.jpg`, `earth-night.png`, `earth-clouds.png`, `earth-bump.jpg`

**Interfaces:**
- Consumes: nothing.
- Produces: `<Earth>` — rotating sphere with day/night/bump, a separate cloud sphere, and a fresnel atmosphere shell.

- [ ] **Step 1: Add texture assets**

Download into `public/textures/` (NASA-derived, free for demo use — credit NASA in About):
```bash
mkdir -p public/textures
curl -L -o public/textures/earth-day.jpg   https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg
curl -L -o public/textures/earth-night.png https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_lights_2048.png
curl -L -o public/textures/earth-clouds.png https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png
curl -L -o public/textures/earth-bump.jpg  https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg
```
Verify each file is > 50 KB (a failed download yields a tiny HTML error page).

- [ ] **Step 2: Implement Earth (day/night shader + clouds + atmosphere)**

`src/scene/Earth.tsx`:
```tsx
import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_EARTH_RADIUS } from '../config/constants';

export function Earth() {
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [day, night, clouds, bump] = useLoader(THREE.TextureLoader, [
    '/textures/earth-day.jpg',
    '/textures/earth-night.png',
    '/textures/earth-clouds.png',
    '/textures/earth-bump.jpg',
  ]);

  // Day/night blend driven by the directional light direction.
  const surfaceMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: day,
      bumpMap: bump,
      bumpScale: 0.03,
      emissiveMap: night,
      emissive: new THREE.Color(0xffffaa),
      emissiveIntensity: 1.2,
      metalness: 0.1,
      roughness: 0.9,
    });
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float dayAmount = clamp(dot(normalize(vNormal), normalize(directionalLights[0].direction)), 0.0, 1.0);
         totalEmissiveRadiance *= (1.0 - smoothstep(0.0, 0.25, dayAmount));`
      );
    };
    return mat;
  }, [day, night, bump]);

  useFrame((_, dt) => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += dt * 0.008;
  });

  return (
    <group>
      <mesh material={surfaceMat}>
        <sphereGeometry args={[SCENE_EARTH_RADIUS, 64, 64]} />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[SCENE_EARTH_RADIUS * 1.01, 64, 64]} />
        <meshStandardMaterial map={clouds} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <Atmosphere />
    </group>
  );
}

function Atmosphere() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color(0x3a86ff) } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          varying vec3 vNormal;
          uniform vec3 uColor;
          void main() {
            float intensity = pow(0.75 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
            gl_FragColor = vec4(uColor, 1.0) * intensity;
          }`,
      }),
    []
  );
  return (
    <mesh material={mat}>
      <sphereGeometry args={[SCENE_EARTH_RADIUS * 1.15, 64, 64]} />
    </mesh>
  );
}
```
> Note: `vNormal` is provided by three's standard material chunks; the injected snippet reads `directionalLights[0]`, which exists because the scene has one directional light.

- [ ] **Step 3: Add Earth to Scene (with Suspense for texture loading)**

In `src/scene/Scene.tsx`, import `Suspense` from `react` and `Earth`, and place `<Suspense fallback={null}><Earth /></Suspense>` inside the `<Canvas>` after the lights.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Expected: a textured Earth with visible continents, subtle clouds drifting, a blue atmospheric glow at the rim, and city lights appearing on the night side as the camera orbits.

- [ ] **Step 5: Commit**

```bash
git add src/scene/Earth.tsx src/scene/Scene.tsx public/textures
git commit -m "feat: photorealistic Earth with day/night, clouds and atmosphere"
git push
```

---

## Task 8: Debris swarm (THREE.Points) + live orbits

**Files:**
- Create: `src/scene/DebrisField.tsx`
- Modify: `src/App.tsx` (load TLEs, pass objects down), `src/scene/Scene.tsx` (render field)

**Interfaces:**
- Consumes: `useOrbits`, `DebrisObject`, `CATEGORY_COLORS`.
- Produces: `<DebrisField objects={DebrisObject[]} onSelect={(index:number)=>void} />` — a `THREE.Points` cloud whose positions update each frame from the worker, colored by category, using an additive radial-gradient sprite.

- [ ] **Step 1: Load objects in App and lift state**

`src/App.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Scene } from './scene/Scene';
import { fetchTLEs } from './data/tle';
import type { DebrisObject } from './data/types';

export default function App() {
  const [objects, setObjects] = useState<DebrisObject[]>([]);
  useEffect(() => { fetchTLEs().then(setObjects); }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Scene objects={objects} onSelect={(i) => console.log('selected', objects[i]?.name)} />
      <div style={{ position: 'fixed', top: 12, left: 12, color: '#9fd', font: '13px monospace' }}>
        {objects.length ? `${objects.length} objects in orbit` : 'Loading orbital catalog…'}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement DebrisField**

`src/scene/DebrisField.tsx`:
```tsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DebrisObject } from '../data/types';
import { CATEGORY_COLORS } from '../config/constants';
import { useOrbits } from '../orbits/useOrbits';

function makeSprite(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

interface Props {
  objects: DebrisObject[];
  caught: Set<string>;
  onSelect: (index: number) => void;
}

export function DebrisField({ objects, caught, onSelect }: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const { positions } = useOrbits(objects, 60);
  const sprite = useMemo(makeSprite, []);

  const colors = useMemo(() => {
    const arr = new Float32Array(objects.length * 3);
    objects.forEach((o, i) => {
      const [r, g, b] = CATEGORY_COLORS[o.category];
      arr[i * 3] = r; arr[i * 3 + 1] = g; arr[i * 3 + 2] = b;
    });
    return arr;
  }, [objects]);

  // Static geometry buffers; positions filled per-frame from worker output.
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(objects.length * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [objects.length, colors]);

  useFrame(() => {
    if (!positions || !pointsRef.current) return;
    const attr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const dst = attr.array as Float32Array;
    for (let i = 0; i < objects.length; i++) {
      const hidden = caught.has(objects[i].id) || Number.isNaN(positions[i * 3]);
      if (hidden) {
        dst[i * 3] = dst[i * 3 + 1] = dst[i * 3 + 2] = 1e6; // park far away
      } else {
        dst[i * 3] = positions[i * 3];
        dst[i * 3 + 1] = positions[i * 3 + 1];
        dst[i * 3 + 2] = positions[i * 3 + 2];
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geom}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.index !== undefined) onSelect(e.index);
      }}
    >
      <pointsMaterial
        size={0.05}
        sizeAttenuation
        map={sprite}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
```

- [ ] **Step 3: Render field in Scene and raise the raycaster Points threshold**

In `src/scene/Scene.tsx`: accept props `{ objects, onSelect }`, pass an empty `caught` set for now (`new Set()`), render `<DebrisField objects={objects} caught={caught} onSelect={onSelect} />` inside the Canvas. Add `raycaster={{ params: { Points: { threshold: 0.06 } } }}` to `<Canvas>` so the tiny points are easy to click.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Expected: thousands of colored glowing dots orbiting the Earth along realistic paths (dense shells in LEO), counter shows 10 000+ objects, smooth ~60 fps. Clicking a dot logs its name in the console.

- [ ] **Step 5: Commit**

```bash
git add src/scene/DebrisField.tsx src/scene/Scene.tsx src/App.tsx
git commit -m "feat: live debris swarm with real orbits and click picking"
git push
```

---

## Task 9: Question generator

**Files:**
- Create: `src/game/questions.ts`
- Test: `src/game/questions.test.ts`

**Interfaces:**
- Consumes: `DebrisObject`, `Question`, `altitudeKm`, `propagate`.
- Produces: `generateQuestion(obj: DebrisObject, now?: Date): Question` — picks a template by category + altitude band, fills real values; always returns valid `options`, in-range `correctIndex`, non-empty `explanation`.

- [ ] **Step 1: Write the failing test**

`src/game/questions.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import * as satellite from 'satellite.js';
import { generateQuestion } from './questions';
import type { DebrisObject } from '../data/types';

function makeObj(l1: string, l2: string, name: string): DebrisObject {
  return { id: '1', name, line1: l1, line2: l2, category: 'debris', satrec: satellite.twoline2satrec(l1, l2) };
}
const ISS = makeObj(
  '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005',
  '2 25544  51.6400 247.4627 0006703 130.5360 325.0288 15.50000000    05',
  'ISS (ZARYA)'
);

describe('generateQuestion', () => {
  it('returns a well-formed question', () => {
    const q = generateQuestion(ISS, new Date(Date.UTC(2024, 0, 1, 12)));
    expect(q.text.length).toBeGreaterThan(0);
    expect(q.options.length).toBeGreaterThanOrEqual(2);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThan(q.options.length);
    expect(q.explanation.length).toBeGreaterThan(0);
  });
  it('is deterministic for the same object and time', () => {
    const t = new Date(Date.UTC(2024, 0, 1, 12));
    expect(generateQuestion(ISS, t)).toEqual(generateQuestion(ISS, t));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/questions.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement questions.ts**

`src/game/questions.ts`:
```ts
import * as satellite from 'satellite.js';
import type { DebrisObject, Question } from '../data/types';
import { altitudeKm } from '../orbits/propagate';

function currentAltitude(obj: DebrisObject, now: Date): number {
  try {
    const pv = satellite.propagate(obj.satrec as satellite.SatRec, now);
    if (pv && pv.position) return Math.round(altitudeKm(pv.position as any));
  } catch { /* ignore */ }
  return 0;
}

export function generateQuestion(obj: DebrisObject, now: Date = new Date()): Question {
  const alt = currentAltitude(obj, now);

  if (alt < 600) {
    return {
      text: `«${obj.name}» сейчас на высоте ~${alt} км (низкая орбита, LEO). Как быстро такой объект сам сойдёт с орбиты из-за остаточной атмосферы?`,
      options: ['За годы — десятилетия', 'За тысячи лет', 'Никогда'],
      correctIndex: 0,
      explanation: 'Ниже ~600 км атмосфера ещё ощутимо тормозит объекты, поэтому они сходят за годы–десятки лет. Именно поэтому МКС (~400 км) приходится регулярно поднимать.',
    };
  }
  if (alt < 2000) {
    return {
      text: `«${obj.name}» на высоте ~${alt} км. На этой высоте сопротивление атмосферы почти нулевое. Сколько обломок проведёт здесь, прежде чем упадёт?`,
      options: ['Несколько недель', 'Сотни лет и более', 'Пару лет'],
      correctIndex: 1,
      explanation: 'На высотах ~800–2000 км объекты остаются на орбите сотни и тысячи лет — это самая «грязная» зона и главный очаг риска синдрома Кесслера.',
    };
  }
  return {
    text: `«${obj.name}» на высоте ~${alt} км — это уже область высоких орбит. Чем опасно столкновение на орбитальных скоростях (~7–8 км/с)?`,
    options: [
      'Один обломок порождает тысячи новых',
      'Ничем, объекты просто отскакивают',
      'Они слипаются в один',
    ],
    correctIndex: 0,
    explanation: 'На орбитальных скоростях даже сантиметровый осколок несёт энергию гранаты. Столкновение дробит объекты на тысячи фрагментов — это и есть механизм каскада Кесслера.',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/questions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/questions.ts src/game/questions.test.ts
git commit -m "feat: data-driven question generator"
git push
```

---

## Task 10: Game state store

**Files:**
- Create: `src/game/store.ts`
- Test: `src/game/store.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces a zustand store with:
  - state: `score: number`, `caught: Set<string>`, `selectedIndex: number | null`, `totalObjects: number`
  - actions: `setTotal(n)`, `select(index|null)`, `catchObject(id, points)`
  - selector: `kesslerIndex(state): number` — `100 * remaining / total` (100 = full, 0 = clean).

- [ ] **Step 1: Write the failing test**

`src/game/store.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useGame, kesslerIndex } from './store';

describe('game store', () => {
  beforeEach(() => {
    useGame.setState({ score: 0, caught: new Set(), selectedIndex: null, totalObjects: 0 });
  });

  it('catching adds points and marks caught', () => {
    useGame.getState().setTotal(10);
    useGame.getState().catchObject('abc', 50);
    expect(useGame.getState().score).toBe(50);
    expect(useGame.getState().caught.has('abc')).toBe(true);
  });

  it('catching is idempotent per id', () => {
    useGame.getState().setTotal(10);
    useGame.getState().catchObject('abc', 50);
    useGame.getState().catchObject('abc', 50);
    expect(useGame.getState().score).toBe(50);
  });

  it('kesslerIndex drops as objects are cleaned', () => {
    useGame.getState().setTotal(4);
    expect(kesslerIndex(useGame.getState())).toBe(100);
    useGame.getState().catchObject('a', 10);
    expect(kesslerIndex(useGame.getState())).toBe(75);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/store.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement store.ts**

`src/game/store.ts`:
```ts
import { create } from 'zustand';

interface GameState {
  score: number;
  caught: Set<string>;
  selectedIndex: number | null;
  totalObjects: number;
  setTotal: (n: number) => void;
  select: (index: number | null) => void;
  catchObject: (id: string, points: number) => void;
}

const PERSIST_KEY = 'orbitclean.progress.v1';

function loadScore(): number {
  try { return JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}').score ?? 0; }
  catch { return 0; }
}

export const useGame = create<GameState>((set, get) => ({
  score: loadScore(),
  caught: new Set<string>(),
  selectedIndex: null,
  totalObjects: 0,
  setTotal: (n) => set({ totalObjects: n }),
  select: (index) => set({ selectedIndex: index }),
  catchObject: (id, points) => {
    if (get().caught.has(id)) return;
    const caught = new Set(get().caught);
    caught.add(id);
    const score = get().score + points;
    set({ caught, score });
    try { localStorage.setItem(PERSIST_KEY, JSON.stringify({ score })); } catch { /* ignore */ }
  },
}));

export function kesslerIndex(s: { caught: Set<string>; totalObjects: number }): number {
  if (s.totalObjects === 0) return 100;
  return Math.round((100 * (s.totalObjects - s.caught.size)) / s.totalObjects);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/store.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/store.ts src/game/store.test.ts
git commit -m "feat: game state store with score, caught set and Kessler index"
git push
```

---

## Task 11: Wire selection → store, render selected marker

**Files:**
- Create: `src/scene/SelectedMarker.tsx`
- Modify: `src/App.tsx`, `src/scene/Scene.tsx`, `src/scene/DebrisField.tsx`

**Interfaces:**
- Consumes: `useGame`, `positions` exposure.
- Produces: clicking a point sets `selectedIndex` in the store; `<SelectedMarker>` draws a glowing ring at the selected object's live position; `DebrisField` reads `caught` from the store.

- [ ] **Step 1: Lift positions so the marker can read them**

In `src/scene/DebrisField.tsx`, accept an optional `onPositions?: (p: Float32Array) => void` prop and call it inside `useFrame` after updating (e.g. `onPositions?.(positions)`). This lets the marker read the same buffer without a second worker.

- [ ] **Step 2: Implement SelectedMarker**

`src/scene/SelectedMarker.tsx`:
```tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props { index: number | null; positionsRef: React.MutableRefObject<Float32Array | null>; }

export function SelectedMarker({ index, positionsRef }: Props) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = positionsRef.current;
    if (ref.current && index !== null && p && !Number.isNaN(p[index * 3])) {
      ref.current.visible = true;
      ref.current.position.set(p[index * 3], p[index * 3 + 1], p[index * 3 + 2]);
    } else if (ref.current) {
      ref.current.visible = false;
    }
  });
  return (
    <mesh ref={ref} visible={false}>
      <ringGeometry args={[0.06, 0.09, 32]} />
      <meshBasicMaterial color={0xffffff} side={THREE.DoubleSide} transparent opacity={0.9} />
    </mesh>
  );
}
```

- [ ] **Step 3: Connect store in Scene/App**

In `src/scene/Scene.tsx`: keep a `positionsRef = useRef<Float32Array|null>(null)`, pass `onPositions={(p)=>{positionsRef.current=p;}}` to `DebrisField`, read `selectedIndex` and `caught` from `useGame`, pass `caught` to `DebrisField`, and render `<SelectedMarker index={selectedIndex} positionsRef={positionsRef} />`. On select, call `useGame.getState().select(index)`.

In `src/App.tsx`: after objects load, call `useGame.getState().setTotal(objects.length)`.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Expected: clicking any dot draws a white ring that tracks that object as it orbits. Clicking another moves the ring.

- [ ] **Step 5: Commit**

```bash
git add src/scene/SelectedMarker.tsx src/scene/DebrisField.tsx src/scene/Scene.tsx src/App.tsx
git commit -m "feat: object selection with tracking marker"
git push
```

---

## Task 12: Object card + answer flow

**Files:**
- Create: `src/ui/ObjectCard.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useGame`, `generateQuestion`, `DebrisObject`, `satellite` (for live altitude/velocity display).
- Produces: `<ObjectCard objects={DebrisObject[]} />` — reads `selectedIndex`, shows real object data + a generated question; correct answer → `catchObject` + clears selection; wrong → inline feedback.

- [ ] **Step 1: Implement ObjectCard**

`src/ui/ObjectCard.tsx`:
```tsx
import { useMemo, useState, useEffect } from 'react';
import * as satellite from 'satellite.js';
import { useGame } from '../game/store';
import { generateQuestion } from '../game/questions';
import { altitudeKm } from '../orbits/propagate';
import type { DebrisObject } from '../data/types';

const POINTS: Record<string, number> = { satellite: 10, rocket: 20, debris: 30 };

export function ObjectCard({ objects }: { objects: DebrisObject[] }) {
  const selectedIndex = useGame((s) => s.selectedIndex);
  const select = useGame((s) => s.select);
  const catchObject = useGame((s) => s.catchObject);
  const obj = selectedIndex !== null ? objects[selectedIndex] : null;

  const [answered, setAnswered] = useState<number | null>(null);
  useEffect(() => setAnswered(null), [selectedIndex]);

  const q = useMemo(() => (obj ? generateQuestion(obj) : null), [obj]);
  const stats = useMemo(() => {
    if (!obj) return null;
    try {
      const pv = satellite.propagate(obj.satrec as satellite.SatRec, new Date());
      const alt = Math.round(altitudeKm(pv.position as any));
      const v = pv.velocity as any;
      const speed = (Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)).toFixed(2);
      return { alt, speed };
    } catch { return null; }
  }, [obj]);

  if (!obj || !q) return null;
  const correct = answered === q.correctIndex;

  return (
    <div style={panel}>
      <button style={close} onClick={() => select(null)}>×</button>
      <div style={{ fontSize: 12, color: '#7fd', textTransform: 'uppercase' }}>{obj.category}</div>
      <h2 style={{ margin: '4px 0 8px', fontSize: 18 }}>{obj.name}</h2>
      <div style={{ fontSize: 13, color: '#bcd', marginBottom: 12 }}>
        NORAD #{obj.id}
        {stats && <> · высота ~{stats.alt} км · скорость {stats.speed} км/с</>}
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.4 }}>{q.text}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '10px 0' }}>
        {q.options.map((opt, i) => (
          <button
            key={i}
            disabled={answered !== null}
            onClick={() => setAnswered(i)}
            style={{
              ...option,
              borderColor:
                answered === null ? '#345'
                : i === q.correctIndex ? '#2e2'
                : i === answered ? '#e33' : '#345',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      {answered !== null && (
        <div style={{ fontSize: 13, color: '#cde' }}>
          <strong style={{ color: correct ? '#5e5' : '#f77' }}>
            {correct ? 'Верно! Орбита очищена.' : 'Мимо.'}
          </strong>
          <p style={{ margin: '6px 0' }}>{q.explanation}</p>
          {correct && (
            <button
              style={{ ...option, borderColor: '#2e2' }}
              onClick={() => { catchObject(obj.id, POINTS[obj.category]); select(null); }}
            >
              Забрать +{POINTS[obj.category]} очков
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const panel: React.CSSProperties = {
  position: 'fixed', right: 16, top: 16, width: 340, padding: 18,
  background: 'rgba(8,14,28,0.92)', color: '#eaf2ff', borderRadius: 14,
  border: '1px solid #1d2a44', boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
  font: '14px system-ui', backdropFilter: 'blur(8px)',
};
const close: React.CSSProperties = {
  position: 'absolute', right: 10, top: 8, background: 'none', border: 'none',
  color: '#9ab', fontSize: 22, cursor: 'pointer',
};
const option: React.CSSProperties = {
  textAlign: 'left', padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
  background: 'rgba(255,255,255,0.04)', color: '#eaf2ff', border: '1px solid #345',
};
```

- [ ] **Step 2: Render card in App**

In `src/App.tsx`, render `<ObjectCard objects={objects} />` after `<Scene .../>`.

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Expected: clicking a dot opens a card with the real name, NORAD id, live altitude/velocity and a question. Right answer reveals the explanation + "забрать очки" button; taking points removes the dot from the swarm (it stops rendering) and closes the card.

- [ ] **Step 4: Commit**

```bash
git add src/ui/ObjectCard.tsx src/App.tsx
git commit -m "feat: object card with real data and answer flow"
git push
```

---

## Task 13: HUD — score + Kessler meter

**Files:**
- Create: `src/ui/HUD.tsx`, `src/ui/KesslerMeter.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useGame`, `kesslerIndex`.
- Produces: `<HUD>` showing score, cleaned count, and a `<KesslerMeter>` bar bound to `kesslerIndex`.

- [ ] **Step 1: Implement KesslerMeter**

`src/ui/KesslerMeter.tsx`:
```tsx
export function KesslerMeter({ value }: { value: number }) {
  const color = value > 66 ? '#e44' : value > 33 ? '#ec4' : '#4e8';
  return (
    <div style={{ width: 220 }}>
      <div style={{ fontSize: 12, color: '#9ab', marginBottom: 4 }}>
        Kessler-индекс: {value}%
      </div>
      <div style={{ height: 8, background: '#12203a', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, transition: 'width .4s' }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement HUD**

`src/ui/HUD.tsx`:
```tsx
import { useGame, kesslerIndex } from '../game/store';
import { KesslerMeter } from './KesslerMeter';

export function HUD() {
  const score = useGame((s) => s.score);
  const cleaned = useGame((s) => s.caught.size);
  const kessler = useGame(kesslerIndex);
  return (
    <div style={{
      position: 'fixed', top: 14, left: 14, color: '#eaf2ff', font: '14px system-ui',
      background: 'rgba(8,14,28,0.7)', padding: '12px 16px', borderRadius: 12,
      border: '1px solid #1d2a44', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{score} очков</div>
      <div style={{ fontSize: 12, color: '#9ab' }}>Очищено объектов: {cleaned}</div>
      <KesslerMeter value={kessler} />
    </div>
  );
}
```

- [ ] **Step 3: Render HUD in App (replace the temporary counter)**

In `src/App.tsx`, remove the temporary "objects in orbit" div and render `<HUD />`.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Expected: HUD shows score and Kessler bar. Cleaning objects raises the score, increments cleaned count, and nudges the Kessler bar down.

- [ ] **Step 5: Commit**

```bash
git add src/ui/HUD.tsx src/ui/KesslerMeter.tsx src/App.tsx
git commit -m "feat: HUD with score and Kessler meter"
git push
```

---

## Task 14: Postprocessing (bloom + vignette)

**Files:**
- Modify: `src/scene/Scene.tsx`

**Interfaces:**
- Consumes: `@react-three/postprocessing`.
- Produces: bloom + vignette applied to the whole scene.

- [ ] **Step 1: Add EffectComposer**

In `src/scene/Scene.tsx`, import `{ EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'` and add inside `<Canvas>` (after the scene contents):
```tsx
<EffectComposer>
  <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.4} mipmapBlur />
  <Vignette eskil={false} offset={0.2} darkness={0.9} />
</EffectComposer>
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Expected: debris dots and city lights glow softly (bloom); edges of the viewport darken (vignette). Confirm fps stays smooth (~60).

- [ ] **Step 3: Commit**

```bash
git add src/scene/Scene.tsx
git commit -m "feat: bloom and vignette postprocessing"
git push
```

---

## Task 15: About / attribution + data credits

**Files:**
- Create: `src/ui/About.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: a small footer button opening an About panel crediting the author and data sources.

- [ ] **Step 1: Implement About**

`src/ui/About.tsx`:
```tsx
import { useState } from 'react';

export function About() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={btn}>About</button>
      {open && (
        <div style={overlay} onClick={() => setOpen(false)}>
          <div style={card} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>OrbitClean</h2>
            <p>Очисти орбиту от космического мусора и узнай, почему это важно.</p>
            <p style={{ fontWeight: 700 }}>Developed by Eskendir Bakhitzhanov</p>
            <p style={{ fontSize: 13, color: '#9ab' }}>
              Орбитальные данные: CelesTrak (каталог US Space Force / Space-Track).
              Текстуры Земли: NASA. Создано для хакатона StarDance (Hack Club).
            </p>
            <button onClick={() => setOpen(false)} style={btn}>Закрыть</button>
          </div>
        </div>
      )}
    </>
  );
}

const btn: React.CSSProperties = {
  position: 'fixed', bottom: 14, right: 14, padding: '8px 14px', borderRadius: 10,
  background: 'rgba(8,14,28,0.7)', color: '#eaf2ff', border: '1px solid #1d2a44',
  cursor: 'pointer', font: '13px system-ui',
};
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'grid', placeItems: 'center', zIndex: 10,
};
const card: React.CSSProperties = {
  width: 380, padding: 24, background: '#0a1222', color: '#eaf2ff',
  borderRadius: 16, border: '1px solid #1d2a44', font: '14px system-ui',
};
```
> The `position: fixed` on the About button overrides the inherited overlay style when the panel is closed; that is intentional — the button always sits bottom-right.

- [ ] **Step 2: Render in App**

In `src/App.tsx`, render `<About />`.

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Expected: an "About" button bottom-right opens a panel with the author credit and honest data-source attribution.

- [ ] **Step 4: Final full-test run + commit**

Run: `npx vitest run`
Expected: all test files PASS.
```bash
git add src/ui/About.tsx src/App.tsx
git commit -m "feat: About panel with attribution and data credits"
git push
```

---

## Self-Review

**Spec coverage:**
- Photorealistic Earth (day/night/clouds/bump/atmosphere) → Task 7 ✓
- Stars + cinematic look → Tasks 6, 14 ✓
- 10k+ real objects on real orbits → Tasks 3, 4, 5, 8 ✓ (Points instead of InstancedMesh — rationale noted; satisfies "one draw call, 60fps, clickable")
- Click → card with real object data + data-driven question → Tasks 9, 11, 12 ✓
- Points + Kessler meter (localStorage) → Tasks 10, 13 ✓
- Honest data sourcing (CelesTrak vs NASA) → Tasks 3, 15 ✓
- Attribution in footer/About only → Task 15 ✓
- Privacy/repo constraints → Global Constraints + every commit step ✓
- Supabase leaderboard → intentionally deferred to a follow-up plan (stretch); MVP uses localStorage. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; every test step has real assertions.

**Type consistency:** `DebrisObject`/`Question`/`Category` defined in Task 2 and used unchanged throughout. `computePositions`/`eciToScene`/`altitudeKm` (Task 4) reused in Tasks 5, 9, 12. `useGame`/`kesslerIndex`/`catchObject`/`select`/`setTotal` (Task 10) used consistently in Tasks 11–13. Worker protocol (`init`/`tick`/`positions`) consistent between Task 5 worker and hook.

**Note for executor:** Camera fly-to on select, sound, and Supabase leaderboard are stretch — out of MVP scope and not in these tasks.
