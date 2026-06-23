import type { GameState } from '../types/game';
import { getScores } from '../game/rules/scoring';

type Props = {
  state: GameState;
  onRestart: () => void;
  onRules: () => void;
};

export function ScoreBoard({ state, onRestart, onRules }: Props) {
  const scores = getScores(state);
  const current = state.players.find((player) => player.id === state.currentPlayerId);
  const metric = state.winMode === 'largest-region' ? '最大領域' : '合計面積';

  return (
    <aside className="panel scoreboard">
      <div className="turn">
        <span>Turn {state.turn} / {state.settings.maxTurns}</span>
        <strong style={{ color: current?.color }}>{current?.name}</strong>
      </div>
      <p className="mode-note">{metric}で勝敗判定</p>

      <div className="scores">
        {scores.map((score) => {
          const player = state.players.find((p) => p.id === score.playerId)!;
          const mainValue = state.winMode === 'largest-region' ? score.largestArea : score.totalArea;
          return (
            <div className="score-row" key={player.id}>
              <span className="swatch" style={{ background: player.color }} />
              <div>
                <strong>{player.name}</strong>
                <small>{player.kind === 'cpu' ? 'CPU' : 'Human'} / 領域 {score.regionCount}</small>
              </div>
              <b>{Math.round(mainValue).toLocaleString()}</b>
            </div>
          );
        })}
      </div>

      <div className="actions compact">
        <button onClick={onRestart}>リスタート</button>
        <button onClick={onRules}>ルール</button>
      </div>
    </aside>
  );
}
