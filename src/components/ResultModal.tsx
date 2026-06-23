import type { GameState } from '../types/game';
import { getWinner } from '../game/rules/scoring';

type Props = {
  state: GameState;
  onAgain: () => void;
  onSetup: () => void;
};

export function ResultModal({ state, onAgain, onSetup }: Props) {
  if (state.phase !== 'ended') return null;
  const winner = getWinner(state);
  const names = winner.playerIds.map((id) => state.players.find((player) => player.id === id)?.name).join(', ');

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <p className="eyebrow">Game Over</p>
        <h2>{winner.playerIds.length > 1 ? '引き分け' : `${names} の勝利`}</h2>
        <p>{state.endedReason}</p>
        <div className="result-grid">
          {winner.scores.map((score) => {
            const player = state.players.find((p) => p.id === score.playerId)!;
            return (
              <div key={score.playerId}>
                <strong style={{ color: player.color }}>{player.name}</strong>
                <span>合計 {Math.round(score.totalArea).toLocaleString()}</span>
                <span>最大 {Math.round(score.largestArea).toLocaleString()}</span>
                <span>{score.coveragePercent.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
        <div className="actions">
          <button className="primary" onClick={onAgain}>もう一度</button>
          <button onClick={onSetup}>設定を変える</button>
        </div>
      </section>
    </div>
  );
}
