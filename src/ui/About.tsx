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
