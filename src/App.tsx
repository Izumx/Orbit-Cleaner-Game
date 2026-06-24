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
