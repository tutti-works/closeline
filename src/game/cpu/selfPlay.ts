import type { GameSettings, GameState, PlayerId } from '../../types/game';
import { createGame, resolveWinner } from '../state';
import { passTurn, placeMove } from '../rules/placement';
import { chooseAiMove } from './candidate';

export type SelfPlayGameLog = {
  seed: string;
  winner: ReturnType<typeof resolveWinner>;
  turns: number;
  moves: Array<{
    turn: number;
    playerId: PlayerId;
    passed: boolean;
    score?: number;
    gainedArea?: number;
    triangles?: number;
  }>;
};

export const runSelfPlayGame = async (settings: GameSettings): Promise<SelfPlayGameLog> => {
  let state: GameState = createGame(settings);
  const moves: SelfPlayGameLog['moves'] = [];
  while (state.phase === 'playing') {
    const playerId = state.currentPlayerId;
    const candidate = await chooseAiMove(state, playerId, false);
    if (!candidate) {
      moves.push({ turn: state.turn, playerId, passed: true });
      state = passTurn(state, playerId, '自己対戦で合法手なし');
    } else {
      moves.push({
        turn: state.turn,
        playerId,
        passed: false,
        score: Number(candidate.score.toFixed(3)),
        gainedArea: Number(candidate.evaluation.gainedArea.toFixed(5)),
        triangles: candidate.evaluation.previewTriangles.length,
      });
      state = placeMove(state, playerId, candidate.move);
    }
    if (moves.length > settings.maxTurns * 2 + 4) break;
  }
  return {
    seed: settings.seed,
    winner: resolveWinner(state),
    turns: state.turn,
    moves,
  };
};
