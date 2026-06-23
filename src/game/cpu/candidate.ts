import type { CpuCandidate, GameState, Move, Point } from '../../types/game';
import { createRng, randomBetween } from '../random';
import { evaluateMove, hasLikelyLegalMove } from '../rules/placement';
import { distance } from '../geometry/math';

const candidateLimit = {
  EASY: 80,
  NORMAL: 180,
  HARD: 280,
} as const;

const moveAroundLine = (lineA: Point, lineB: Point, angle: number, t: number): Move => ({
  center: { x: lineA.x + (lineB.x - lineA.x) * t, y: lineA.y + (lineB.y - lineA.y) * t },
  angle,
});

const generateMoves = (state: GameState): Move[] => {
  const rng = createRng(`${state.settings.seed}:cpu:${state.turn}:${state.lines.length}`);
  const moves: Move[] = [];
  const activeLines = state.lines.filter((line) => line.active);
  for (const line of activeLines) {
    const baseAngle = Math.atan2(line.b.y - line.a.y, line.b.x - line.a.x);
    for (const offset of [Math.PI / 3, -Math.PI / 3, Math.PI / 2.8, -Math.PI / 2.8, Math.PI / 5, -Math.PI / 5]) {
      for (const t of [0.25, 0.4, 0.55, 0.7]) {
        moves.push(moveAroundLine(line.a, line.b, baseAngle + offset, t));
      }
    }
  }
  for (const node of state.nodes.filter((node) => node.active)) {
    for (let i = 0; i < 10; i += 1) {
      moves.push({ center: node.point, angle: randomBetween(rng, 0, Math.PI * 2) });
    }
  }
  for (let i = 0; i < candidateLimit[state.settings.difficulty]; i += 1) {
    moves.push({
      center: { x: randomBetween(rng, 0.14, 0.86), y: randomBetween(rng, 0.14, 0.86) },
      angle: randomBetween(rng, 0, Math.PI * 2),
    });
  }
  return moves;
};

const evaluateCpuScore = (state: GameState, move: Move): CpuCandidate | null => {
  const evaluation = evaluateMove(state, 'cpu', move);
  if (!evaluation.valid) return null;
  const centerBias = 1 - Math.min(1, distance(move.center, { x: 0.5, y: 0.5 }));
  const spread = Math.min(0.6, distance(move.center, { x: 0.5, y: 0.5 }));
  let score = evaluation.gainedArea * 1000 + evaluation.previewTriangles.length * 30 + evaluation.intersections.length * 6;
  score += centerBias * 2 + spread * 3;
  if (state.settings.difficulty === 'EASY') score += Math.random() * 40;
  if (state.settings.difficulty === 'HARD') score += (hasLikelyLegalMove({ ...state, currentPlayerId: 'human' }, 'human') ? 0 : 20);
  return { move, evaluation, score };
};

export const findCpuMove = async (state: GameState): Promise<CpuCandidate | null> => {
  const moves = generateMoves(state);
  const candidates: CpuCandidate[] = [];
  const chunkSize = 60;
  for (let i = 0; i < moves.length; i += chunkSize) {
    for (const move of moves.slice(i, i + chunkSize)) {
      const candidate = evaluateCpuScore(state, move);
      if (candidate) candidates.push(candidate);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  if (state.settings.difficulty === 'EASY') {
    const top = candidates.slice(0, Math.min(12, candidates.length));
    return top[Math.floor(Math.random() * top.length)];
  }
  return candidates[0];
};
