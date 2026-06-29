import type { GameState, PlayerId } from '../types/game';
import { scoreFor } from '../game/state';

type Props = {
  state: GameState;
  thinking: boolean;
  onSetup: () => void;
  onRestart: (newSeed?: boolean) => void;
};

const playerLabel = (playerId: PlayerId) => (playerId === 'human' ? 'あなた' : 'CPU');

export function ScorePanel({ state, thinking, onSetup, onRestart }: Props) {
  const human = scoreFor(state, 'human');
  const cpu = scoreFor(state, 'cpu');
  return (
    <aside className="score-panel">
      <div className="turn-card">
        <span>{thinking ? 'CPU思考中' : `${playerLabel(state.currentPlayerId)} の手番`}</span>
        <strong>{state.turn} / {state.settings.maxTurns}</strong>
      </div>
      <div className="score-grid">
        <Score name="あなた" color="human" area={human.totalArea} />
        <Score name="CPU" color="cpu" area={cpu.totalArea} />
      </div>
      {state.lastMessage && <p className="notice">{state.lastMessage}</p>}
      <div className="button-row stacked">
        <button onClick={() => onRestart(false)}>同じ盤面でもう一度</button>
        <button onClick={() => onRestart(true)}>新しい盤面</button>
        <button onClick={onSetup}>設定</button>
      </div>
    </aside>
  );
}

function Score({ name, color, area }: { name: string; color: string; area: number }) {
  return (
    <div className={`score ${color}`}>
      <span>{name}</span>
      <strong>{(area * 100).toFixed(1)}%</strong>
    </div>
  );
}
