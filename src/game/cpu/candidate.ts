import type { CpuCandidate, GameState, Move, PlayerId, Point } from '../../types/game';
import { createRng, randomBetween } from '../random';
import { evaluateMove, placeMove } from '../rules/placement';
import { distance } from '../geometry/math';
import { scoreFor } from '../state';
import { appendAiDecisionLog } from './selfPlayLog';
import learnedWeights from './learnedWeights.json';

const candidateLimit = {
  EASY: 90,
  NORMAL: 180,
  HARD: 260,
} as const;

const deepLimit = {
  EASY: 0,
  NORMAL: 14,
  HARD: 9,
} as const;

const tacticLimit = {
  EASY: 0,
  NORMAL: 50,
  HARD: 42,
} as const;

const chunkDelay = () => new Promise((resolve) => setTimeout(resolve, 0));

const opponentOf = (playerId: PlayerId): PlayerId => (playerId === 'human' ? 'cpu' : 'human');

const moveFromStart = (start: Point, angle: number, length: number): Move => ({
  center: {
    x: start.x + (Math.cos(angle) * length) / 2,
    y: start.y + (Math.sin(angle) * length) / 2,
  },
  angle,
});

export type AiFeatures = {
  gainedArea: number;
  triangleCount: number;
  intersectionCount: number;
  ownedDots: number;
  opponentDots: number;
  centerBias: number;
  spread: number;
  crowding: number;
  frontier: number;
  scoreDelta: number;
  replyRisk: number;
  mobilityDiff: number;
  terminalBonus: number;
};

export type AiWeights = Record<keyof AiFeatures, number>;

export const DEFAULT_AI_WEIGHTS: AiWeights = {
  gainedArea: 5200,
  triangleCount: 220,
  intersectionCount: 18,
  ownedDots: 3,
  opponentDots: -1.2,
  centerBias: -4,
  spread: 18,
  crowding: -55,
  frontier: 36,
  scoreDelta: 2600,
  replyRisk: -0.28,
  mobilityDiff: 0.7,
  terminalBonus: 40,
};

export const activeAiWeights: AiWeights = { ...DEFAULT_AI_WEIGHTS, ...learnedWeights.weights };

export const scoreFeatures = (features: AiFeatures, weights: AiWeights = activeAiWeights) =>
  Object.entries(features).reduce((sum, [key, value]) => sum + value * weights[key as keyof AiFeatures], 0);

const moveAroundLine = (lineA: Point, lineB: Point, angle: number, t: number): Move => ({
  center: { x: lineA.x + (lineB.x - lineA.x) * t, y: lineA.y + (lineB.y - lineA.y) * t },
  angle,
});

const addFanMoves = (moves: Move[], start: Point, baseAngle: number, length: number) => {
  for (const offset of [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2]) {
    moves.push(moveFromStart(start, baseAngle + offset, length));
  }
};

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

const ownedNodeCount = (state: GameState, playerId: PlayerId) =>
  state.nodes.filter((node) => node.active && node.ownerships.some((ownership) => ownership.playerId === playerId)).length;

const previewOwnedNodeCount = (nodes: GameState['nodes'], playerId: PlayerId) =>
  nodes.filter((node) => node.active && node.ownerships.some((ownership) => ownership.playerId === playerId)).length;

const boardActivityCenter = (state: GameState): Point => {
  const points = [
    ...state.nodes.filter((node) => node.active).map((node) => node.point),
    ...state.lines.filter((line) => line.active).flatMap((line) => [line.a, line.b]),
  ];
  if (points.length === 0) return { x: 0.5, y: 0.5 };
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
};

const localCrowding = (state: GameState, point: Point) => {
  const nodeCrowding = state.nodes
    .filter((node) => node.active)
    .reduce((sum, node) => sum + Math.max(0, 1 - distance(point, node.point) / 0.22), 0);
  const lineCrowding = state.lines
    .filter((line) => line.active)
    .reduce((sum, line) => {
      const center = { x: (line.a.x + line.b.x) / 2, y: (line.a.y + line.b.y) / 2 };
      return sum + Math.max(0, 1 - distance(point, center) / 0.25);
    }, 0);
  return Math.min(1, (nodeCrowding + lineCrowding * 0.45) / 8);
};

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
      moves.push(moveFromStart(node.point, baseAngle + Math.PI / 2.5, state.settings.lineLength));
      moves.push(moveFromStart(node.point, baseAngle - Math.PI / 2.5, state.settings.lineLength));
    }
    for (let i = 0; i < 4; i += 1) moves.push(moveFromStart(node.point, randomBetween(rng, 0, Math.PI * 2), state.settings.lineLength));
  }

  const activityCenter = boardActivityCenter(state);
  for (const node of [...ownNodes, ...enemyNodes].slice(-18)) {
    const outward = Math.atan2(node.point.y - activityCenter.y, node.point.x - activityCenter.x);
    addFanMoves(moves, node.point, outward, state.settings.lineLength);
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
        moves.push(moveFromStart(a, angle, state.settings.lineLength));
        moves.push(moveFromStart(b, angle + Math.PI, state.settings.lineLength));
      }
    }
  }

  for (let i = 0; i < maxRandom; i += 1) {
    moves.push({
      center: { x: randomBetween(rng, 0.1, 0.9), y: randomBetween(rng, 0.1, 0.9) },
      angle: randomBetween(rng, 0, Math.PI * 2),
    });
  }

  for (const line of activeLines.slice(-12)) {
    const baseAngle = Math.atan2(line.b.y - line.a.y, line.b.x - line.a.x);
    const lineCenter = { x: (line.a.x + line.b.x) / 2, y: (line.a.y + line.b.y) / 2 };
    const outward = Math.atan2(lineCenter.y - activityCenter.y, lineCenter.x - activityCenter.x);
    for (const t of [0.2, 0.5, 0.8]) {
      const center = { x: line.a.x + (line.b.x - line.a.x) * t, y: line.a.y + (line.b.y - line.a.y) * t };
      moves.push({ center, angle: outward + Math.PI / 5 });
      moves.push({ center, angle: outward - Math.PI / 5 });
      moves.push({ center, angle: baseAngle + Math.PI / 2.2 });
    }
  }

  return dedupeMoves(moves);
};

type TacticalThreat = {
  score: number;
  area: number;
  triangles: number;
  candidates: number;
};

const emptyThreat: TacticalThreat = {
  score: 0,
  area: 0,
  triangles: 0,
  candidates: 0,
};

const tacticalThreat = (state: GameState, playerId: PlayerId, maxRandom: number): TacticalThreat => {
  if (maxRandom <= 0) return emptyThreat;
  let best = emptyThreat;
  for (const move of generateMoves(state, playerId, maxRandom)) {
    const evaluation = evaluateMove(state, playerId, move);
    if (!evaluation.valid || evaluation.previewTriangles.length === 0) continue;
    const largestArea = Math.max(...evaluation.previewTriangles.map((triangle) => triangle.area));
    const score = evaluation.gainedArea * 18000 + largestArea * 6000 + evaluation.previewTriangles.length * 1200;
    if (score > best.score) {
      best = {
        score,
        area: evaluation.gainedArea,
        triangles: evaluation.previewTriangles.length,
        candidates: best.candidates + 1,
      };
    } else {
      best = { ...best, candidates: best.candidates + 1 };
    }
  }
  return best;
};

export const lightCandidate = (state: GameState, move: Move, playerId: PlayerId, weights: AiWeights = activeAiWeights): CpuCandidate | null => {
  const evaluation = evaluateMove(state, playerId, move);
  if (!evaluation.valid) return null;
  const centerBias = 1 - Math.min(1, distance(move.center, { x: 0.5, y: 0.5 }));
  const spread = Math.min(0.65, distance(move.center, { x: 0.5, y: 0.5 }));
  const activityCenter = boardActivityCenter(state);
  const frontier = Math.min(1, distance(move.center, activityCenter) / 0.55);
  const crowding = localCrowding(state, move.center);
  const ownedDots = previewOwnedNodeCount(evaluation.previewNodes, playerId) - ownedNodeCount(state, playerId);
  const opponentDots = previewOwnedNodeCount(evaluation.previewNodes, opponentOf(playerId)) - ownedNodeCount(state, opponentOf(playerId));
  const features: AiFeatures = {
    gainedArea: evaluation.gainedArea,
    triangleCount: evaluation.previewTriangles.length,
    intersectionCount: evaluation.intersections.length,
    ownedDots,
    opponentDots,
    centerBias,
    spread,
    crowding,
    frontier,
    scoreDelta: 0,
    replyRisk: 0,
    mobilityDiff: 0,
    terminalBonus: 0,
  };
  const score = scoreFeatures(features, weights);
  return { move, evaluation, score };
};

export const candidateFeatures = (state: GameState, candidate: CpuCandidate, playerId: PlayerId): AiFeatures => {
  const opponent = opponentOf(playerId);
  const simulated = placeMove(state, playerId, candidate.move);
  const before = scoreFor(state, playerId).totalArea - scoreFor(state, opponent).totalArea;
  const after = scoreFor(simulated, playerId).totalArea - scoreFor(simulated, opponent).totalArea;
  return {
    gainedArea: candidate.evaluation.gainedArea,
    triangleCount: candidate.evaluation.previewTriangles.length,
    intersectionCount: candidate.evaluation.intersections.length,
    ownedDots: previewOwnedNodeCount(candidate.evaluation.previewNodes, playerId) - ownedNodeCount(state, playerId),
    opponentDots: previewOwnedNodeCount(candidate.evaluation.previewNodes, opponent) - ownedNodeCount(state, opponent),
    centerBias: 1 - Math.min(1, distance(candidate.move.center, { x: 0.5, y: 0.5 })),
    spread: Math.min(0.65, distance(candidate.move.center, { x: 0.5, y: 0.5 })),
    crowding: localCrowding(state, candidate.move.center),
    frontier: Math.min(1, distance(candidate.move.center, boardActivityCenter(state)) / 0.55),
    scoreDelta: after - before,
    replyRisk: 0,
    mobilityDiff: 0,
    terminalBonus: 0,
  };
};

const tacticalScore = (state: GameState, candidate: CpuCandidate, playerId: PlayerId, opponentThreatBefore: TacticalThreat) => {
  if (state.settings.difficulty === 'EASY') return 0;
  const opponent = opponentOf(playerId);
  const simulated = placeMove(state, playerId, candidate.move);
  const ownFollowupThreat = tacticalThreat(simulated, playerId, state.settings.difficulty === 'HARD' ? 20 : 18);
  const hasImmediateCapture = candidate.evaluation.previewTriangles.length > 0;
  const afterOpponentThreat = hasImmediateCapture ? tacticalThreat(simulated, opponent, tacticLimit[state.settings.difficulty]) : opponentThreatBefore;
  const immediateCapture =
    candidate.evaluation.gainedArea * 26000 +
    candidate.evaluation.previewTriangles.length * 1500;
  const preemptedThreat = hasImmediateCapture ? Math.max(0, opponentThreatBefore.score - afterOpponentThreat.score) * 0.9 : 0;
  const setupBonus = ownFollowupThreat.score * (state.settings.difficulty === 'HARD' ? 0.22 : 0.12);
  return immediateCapture + preemptedThreat + setupBonus;
};

const deepenCandidate = (
  state: GameState,
  candidate: CpuCandidate,
  playerId: PlayerId,
  opponentThreatBefore: TacticalThreat,
): CpuCandidate => {
  if (state.settings.difficulty === 'EASY') return candidate;
  const score = candidate.score + tacticalScore(state, candidate, playerId, opponentThreatBefore);
  return { ...candidate, score };
};

export const chooseAiMove = async (state: GameState, playerId: PlayerId, shouldLog = false, weights: AiWeights = activeAiWeights): Promise<CpuCandidate | null> => {
  const rng = createRng(`${state.settings.seed}:choice:${playerId}:${state.turn}:${state.lines.length}`);
  const moves = generateMoves(state, playerId);
  const candidates: CpuCandidate[] = [];
  for (let i = 0; i < moves.length; i += 80) {
    for (const move of moves.slice(i, i + 80)) {
      const candidate = lightCandidate(state, move, playerId, weights);
      if (candidate) candidates.push(candidate);
    }
    await chunkDelay();
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  const narrowed = candidates.slice(0, deepLimit[state.settings.difficulty] || candidates.length);
  const opponentThreatBefore = tacticalThreat(state, opponentOf(playerId), tacticLimit[state.settings.difficulty]);
  const scored: CpuCandidate[] = [];
  for (const candidate of narrowed) scored.push(deepenCandidate(state, candidate, playerId, opponentThreatBefore));
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
