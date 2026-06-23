import type { GameState } from '../types/game';
import { scoreFor } from '../game/state';

type Props = {
  state: GameState;
  onSame: () => void;
  onNew: () => void;
  onSetup: () => void;
};

export function ResultModal({ state, onSame, onNew, onSetup }: Props) {
  if (state.phase !== 'ended' || !state.result) return null;
  const human = scoreFor(state, 'human');
  const cpu = scoreFor(state, 'cpu');
  const biggestCombo = state.territories.reduce((best, territory) => {
    const combo = state.territories.filter((item) => item.comboId === territory.comboId);
    const area = combo.reduce((sum, item) => sum + item.area, 0);
    return area > best.area ? { count: combo.length, area } : best;
  }, { count: 0, area: 0 });
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <p className="eyebrow">{state.result.reason}</p>
        <h2>{state.result.winner === 'draw' ? '引き分け' : `${state.result.winner === 'human' ? 'Human' : 'CPU'} の勝利`}</h2>
        <div className="result-grid">
          <span>Human</span><strong>{(human.totalArea * 100).toFixed(1)}%</strong>
          <span>CPU</span><strong>{(cpu.totalArea * 100).toFixed(1)}%</strong>
          <span>獲得三角形</span><strong>{state.territories.length}</strong>
          <span>最大コンボ</span><strong>{biggestCombo.count}個 / {(biggestCombo.area * 100).toFixed(1)}%</strong>
        </div>
        <div className="button-row">
          <button onClick={onSame}>同じ盤面でもう一度</button>
          <button className="primary" onClick={onNew}>新しい盤面で遊ぶ</button>
          <button onClick={onSetup}>設定を変更</button>
        </div>
      </section>
    </div>
  );
}
