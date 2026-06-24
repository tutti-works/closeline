import type { CpuCandidate, GameState, Move, PlayerId, Point } from '../../types/game';
import { createRng, randomBetween } from '../random';
import { evaluateMove, hasLikelyLegalMove, placeMove } from '../rules/placement';
import { distance } from '../geometry/math';
import { scoreFor } from '../state';
import { appendAiDecisionLog } from './selfPlayLog';

const candidateLimit = {
  EASY: 90,
  NORMAL: 180,
  HARD: 260,
} as const;

const deepLimit = {
  EASY: 0,
  NORMAL: 14,
  HARD: 26,
} as const;

const replyLimit = {
  EASY: 0,
  NORMAL: 70,
  HARD: 120,
} as const;

const chunkDelay = () => new Promise((resolve) => setTimeout(resolve, 0));

const opponentOf = (playerId: PlayerId): PlayerId => (playerId === 'human' ? 'cpu' : 'human');

const moveAroundLine = (lineA: Point, lineB: Point, angle: number, t: number): Move => ({
  center: { x: lineA.x + (lineB.x - lineA.x) * t, y: lineA.y + (lineB.y - lineA.y) * t },
  angle,
});

const moveKey = (move: Move) => `${move.center.x.toFixed(3)},${move.center.y.toFixed(3)},${move.angle.toFixed(3)}`;

const dedupeMoves = (moves: Move[]) => {
  const seen = new Set<string>();
  return moves.filter((move) => {
    const key = moveKey(move);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const validOwnedNodes = (state: GameState, playerId: PlayerId) =>
  state.nodes.filter((node) => node.active && node.ownerships.some((ownership) => ownership.playerId === playerId));

export const generateMoves = (state: GameState, playerId: PlayerId, maxRandom: number = candidateLimit[state.settings.difficulty]): Move[] => {
  const rng = createRng(`${state.settings.seed}:${playerId}:${state.turn}:${state.lines.length}:${state.nodes.length}`);
  const moves: Move[] = [];
  const activeLines = state.lines.filter((line) => line.active);
  const activeNodes = state.nodes.filter((node) => node.active);
  const ownNodes = validOwnedNodes(state, playerId);
  const enemyNodes = validOwnedNodes(state, opponentOf(playerId));

  for (const line of activeLines) {
    const baseAngle = Math.atan2(line.b.y - line.a.y, line.b.x - line.a.x);
    for (const offset of [Math.PI / 2.5, -Math.PI / 2.5, Math.PI / 3, -Math.PI / 3, Math.PI / 4, -Math.PI / 4]) {
      for (const t of [0.22, 0.38, 0.54, 0.7, 0.84]) moves.push(moveAroundLine(line.a, line.b, baseAngle + offset, t));
    }
  }

  for (const node of activeNodes) {
    for (const line of activeLines.slice(0, 18)) {
      const baseAngle = Math.atan2(line.b.y - line.a.y, line.b.x - line.a.x);
      moves.push({ center: node.point, angle: baseAngle + Math.PI / 2.5 });
      moves.push({ center: node.point, angle: baseAngle - Math.PI / 2.5 });
    }
    for (let i = 0; i < 4; i += 1) moves.push({ center: node.point, angle: randomBetween(rng, 0, Math.PI * 2) });
  }

  for (const nodes of [ownNodes, enemyNodes]) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i].point;
        const b = nodes[j].point;
        const d = distance(a, b);
        if (d <= 0.02 || d > state.settings.lineLength * 0.98) continue;
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        moves.push({ center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, angle });
        moves.push({ center: a, angle });
        moves.push({ center: b, angle: angle + Math.PI });
      }
    }
  }

  for (let i = 0; i < maxRandom; i += 1) {
    moves.push({
      center: { x: randomBetween(rng, 0.1, 0.9), y: randomBetween(rng, 0.1, 0.9) },
      angle: randomBetween(rng, 0, Math.PI * 2),
    });
  }

  return dedupeMoves(moves);
};

const mobility = (state: GameState, playerId: PlayerId, sample = 50) =>
  generateMoves(state, playerId, sample).filter((move) => evaluateMove(state, playerId, move).valid).length;

const lightCandidate = (state: GameState, move: Move, playerId: PlayerId): CpuCandidate | null => {
  const evaluation = evaluateMove(state, playerId, move);
  if (!evaluation.valid) return null;
  const centerBias = 1 - Math.min(1, distance(move.center, { x: 0.5, y: 0.5 }));
  const spread = Math.min(0.65, distance(move.center, { x: 0.5, y: 0.5 }));
  const ownedDots = evaluation.previewNodes.filter((node) => node.active && node.ownerships.some((ownership) => ownership.playerId === playerId)).length;
  const opponentDots = evaluation.previewNodes.filter((node) => node.active && node.ownerships.some((ownership) => ownership.playerId === opponentOf(playerId))).length;
  const score =
    evaluation.gainedArea * 1800 +
    evaluation.previewTriangles.length * 85 +
    evaluation.intersections.length * 13 +
    ownedDots * 1.7 -
    opponentDots * 0.6 +
    centerBias * 2 +
    spread * 2;
  return { move, evaluation, score };
};

const bestReplyScore = (state: GameState, playerId: PlayerId, maxMoves: number) => {
  const candidates = generateMoves(state, playerId, maxMoves)
    .map((move) => lightCandidate(state, move, playerId))
    .filter((candidate): candidate is CpuCandidate => candidate !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  return candidates.reduce((best, candidate) => Math.max(best, candidate.score), 0);
};

const deepenCandidate = (state: GameState, candidate: CpuCandidate, playerId: PlayerId): CpuCandidate => {
  if (state.settings.difficulty === 'EASY') return candidate;
  const simulated = placeMove(state, playerId, candidate.move);
  const opponent = opponentOf(playerId);
  const before = scoreFor(state, playerId).totalArea - scoreFor(state, opponent).totalArea;
  const after = scoreFor(simulated, playerId).totalArea - scoreFor(simulated, opponent).totalArea;
  const replyRisk = bestReplyScore(simulated, opponent, replyLimit[state.settings.difficulty]);
  const ownMobility = mobility(simulated, playerId, state.settings.difficulty === 'HARD' ? 80 : 45);
  const enemyMobility = mobility(simulated, opponent, state.settings.difficulty === 'HARD' ? 80 : 45);
  const terminalBonus = hasLikelyLegalMove({ ...simulated, currentPlayerId: opponent }, opponent) ? 0 : 40;
  const riskWeight = state.settings.difficulty === 'HARD' ? 0.34 : 0.16;
  const score = candidate.score + (after - before) * 900 - replyRisk * riskWeight + (ownMobility - enemyMobility) * 0.45 + terminalBonus;
  return { ...candidate, score };
};

export const chooseAiMove = async (state: GameState, playerId: PlayerId, shouldLog = false): Promise<CpuCandidate | null> => {
  const rng = createRng(`${state.settings.seed}:choice:${playerId}:${state.turn}:${state.lines.length}`);
  const moves = generateMoves(state, playerId);
  const candidates: CpuCandidate[] = [];
  for (let i = 0; i < moves.length; i += 80) {
    for (const move of moves.slice(i, i + 80)) {
      const candidate = lightCandidate(state, move, playerId);
      if (candidate) candidates.push(candidate);
    }
    await chunkDelay();
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  const narrowed = candidates.slice(0, deepLimit[state.settings.difficulty] || candidates.length);
  const scored: CpuCandidate[] = [];
  for (const candidate of narrowed) scored.push(deepenCandidate(state, candidate, playerId));
  scored.sort((a, b) => b.score - a.score);

  const selected = state.settings.difficulty === 'EASY'
    ? scored[Math.floor(rng() * Math.min(12, scored.length))]
    : scored[0];

  if (shouldLog) {
    appendAiDecisionLog({
      seed: state.settings.seed,
      turn: state.turn,
      playerId,
      difficulty: state.settings.difficulty,
      candidateCount: candidates.length,
      selected,
      topCandidates: scored.slice(0, 8),
    });
  }
  return selected;
};

export const findCpuMove = (state: GameState): Promise<CpuCandidate | null> => chooseAiMove(state, 'cpu', true);
