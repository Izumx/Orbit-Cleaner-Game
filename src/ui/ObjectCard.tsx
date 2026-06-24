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
      if (!pv || typeof pv.position === 'boolean' || typeof pv.velocity === 'boolean') return null;
      const alt = Math.round(altitudeKm(pv.position));
      const v = pv.velocity;
      const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z).toFixed(2);
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
