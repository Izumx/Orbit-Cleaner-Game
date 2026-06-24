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
