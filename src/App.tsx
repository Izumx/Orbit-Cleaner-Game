import { useEffect, useState } from 'react';
import { Scene } from './scene/Scene';
import { fetchTLEs } from './data/tle';
import { useGame } from './game/store';
import type { DebrisObject } from './data/types';
import { ObjectCard } from './ui/ObjectCard';

export default function App() {
  const [objects, setObjects] = useState<DebrisObject[]>([]);
  useEffect(() => {
    fetchTLEs().then((objs) => {
      setObjects(objs);
      useGame.getState().setTotal(objs.length);
    });
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Scene objects={objects} />
      <ObjectCard objects={objects} />
      <div style={{ position: 'fixed', top: 12, left: 12, color: '#9fd', font: '13px monospace' }}>
        {objects.length ? `${objects.length} objects in orbit` : 'Loading orbital catalog…'}
      </div>
    </div>
  );
}
