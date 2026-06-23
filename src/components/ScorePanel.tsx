import type { GameState, PlayerId } from '../types/game';
import { scoreFor } from '../game/state';

type Props = {
  state: GameState;
  thinking: boolean;
  onSetup: () => void;
  onRules: () => void;
  onRestart: (newSeed?: boolean) => void;
};

const playerLabel = (playerId: PlayerId) => (playerId === 'human' ? 'Human' : 'CPU');

export function ScorePanel({ state, thinking, onSetup, onRules, onRestart }: Props) {
  const human = scoreFor(state, 'human');
  const cpu = scoreFor(state, 'cpu');
  return (
    <aside className="score-panel">
      <div className="turn-card">
        <span>{thinking ? 'CPU思考中' : `${playerLabel(state.currentPlayerId)} の手番`}</span>
        <strong>{state.turn} / {state.settings.maxTurns}</strong>
      </div>
      <div className="score-grid">
        <Score name="Human" color="human" area={human.totalArea} count={human.count} max={human.maxArea} />
        <Score name="CPU" color="cpu" area={cpu.totalArea} count={cpu.count} max={cpu.maxArea} />
      </div>
      {state.lastMessage && <p className="notice">{state.lastMessage}</p>}
      <div className="button-row stacked">
        <button onClick={() => onRestart(false)}>同じ盤面でもう一度</button>
        <button onClick={() => onRestart(true)}>新しい盤面</button>
        <button onClick={onSetup}>設定</button>
        <button onClick={onRules}>ルール</button>
      </div>
    </aside>
  );
}

function Score({ name, color, area, count, max }: { name: string; color: string; area: number; count: number; max: number }) {
  return (
    <div className={`score ${color}`}>
      <span>{name}</span>
      <strong>{(area * 100).toFixed(1)}%</strong>
      <small>三角形 {count} / 最大 {(max * 100).toFixed(1)}%</small>
    </div>
  );
}
