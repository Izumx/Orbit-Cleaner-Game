import { useEffect, useState } from 'react';
import { Scene } from './scene/Scene';
import { fetchTLEs } from './data/tle';
import { useGame } from './game/store';
import type { DebrisObject } from './data/types';
import { ObjectCard } from './ui/ObjectCard';
import { HUD } from './ui/HUD';

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
      <HUD />
    </div>
  );
}
