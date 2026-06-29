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
  const winnerLabel = state.result.winner === 'human' ? 'あなた' : 'CPU';
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <p className="eyebrow">{state.result.reason}</p>
        <h2>{state.result.winner === 'draw' ? '引き分け' : `${winnerLabel} の勝利`}</h2>
        <div className="result-grid">
          <span>あなた</span><strong>{(human.totalArea * 100).toFixed(1)}%</strong>
          <span>CPU</span><strong>{(cpu.totalArea * 100).toFixed(1)}%</strong>
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
