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
