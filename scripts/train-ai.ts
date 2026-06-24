import { writeFile } from 'node:fs/promises';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import type { AiFeatures, AiWeights } from '../src/game/cpu/candidate';
import { activeAiWeights, DEFAULT_AI_WEIGHTS, generateMoves, lightCandidate } from '../src/game/cpu/candidate';
import { createGame, resolveWinner, scoreFor } from '../src/game/state';
import { passTurn, placeMove } from '../src/game/rules/placement';
import { createRng, randomBetween } from '../src/game/random';
import type { GameSettings, GameState, Move, PlayerId } from '../src/types/game';

type Sample = {
  playerId: PlayerId;
  chosen: AiFeatures;
  target: AiFeatures;
};

type TrainOptions = {
  games: number;
  maxTurns: number;
  learningRate: number;
  progressEvery: number;
  baseSeed: string;
  workerIndex: number;
  totalWorkers: number;
  totalGames: number;
};

type TrainResult = {
  correlations: AiWeights;
  wins: Record<PlayerId | 'draw', number>;
  totalSamples: number;
  games: number;
};

const featureKeys = Object.keys(DEFAULT_AI_WEIGHTS) as Array<keyof AiFeatures>;

const argValue = (name: string, fallback: number) => {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  return arg ? Number(arg.split('=')[1]) : fallback;
};

const emptyWeights = () => Object.fromEntries(featureKeys.map((key) => [key, 0])) as AiWeights;

const normalizeFeatures = (features: AiFeatures): AiFeatures => ({
  gainedArea: features.gainedArea * 10,
  triangleCount: features.triangleCount,
  intersectionCount: features.intersectionCount / 4,
  ownedDots: features.ownedDots / 12,
  opponentDots: features.opponentDots / 12,
  centerBias: features.centerBias,
  spread: features.spread,
  crowding: features.crowding,
  frontier: features.frontier,
  scoreDelta: features.scoreDelta * 10,
  replyRisk: features.replyRisk / 1000,
  mobilityDiff: features.mobilityDiff / 30,
  terminalBonus: features.terminalBonus,
});

const subtractFeatures = (a: AiFeatures, b: AiFeatures): AiFeatures => ({
  gainedArea: a.gainedArea - b.gainedArea,
  triangleCount: a.triangleCount - b.triangleCount,
  intersectionCount: a.intersectionCount - b.intersectionCount,
  ownedDots: a.ownedDots - b.ownedDots,
  opponentDots: a.opponentDots - b.opponentDots,
  centerBias: a.centerBias - b.centerBias,
  spread: a.spread - b.spread,
  crowding: a.crowding - b.crowding,
  frontier: a.frontier - b.frontier,
  scoreDelta: a.scoreDelta - b.scoreDelta,
  replyRisk: a.replyRisk - b.replyRisk,
  mobilityDiff: a.mobilityDiff - b.mobilityDiff,
  terminalBonus: a.terminalBonus - b.terminalBonus,
});

const opponentOf = (playerId: PlayerId): PlayerId => (playerId === 'human' ? 'cpu' : 'human');

const moveFromStart = (start: { x: number; y: number }, angle: number, length: number): Move => ({
  center: {
    x: start.x + (Math.cos(angle) * length) / 2,
    y: start.y + (Math.sin(angle) * length) / 2,
  },
  angle,
});

const ownedNodeCount = (state: GameState, playerId: PlayerId) =>
  state.nodes.filter((node) => node.active && node.ownerships.some((ownership) => ownership.playerId === playerId)).length;

const previewOwnedNodeCount = (nodes: GameState['nodes'], playerId: PlayerId) =>
  nodes.filter((node) => node.active && node.ownerships.some((ownership) => ownership.playerId === playerId)).length;

const activityCenter = (state: GameState) => {
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

const pointDistance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

const candidateToTrainingCrowding = (state: GameState, point: { x: number; y: number }) => {
  const nodeCrowding = state.nodes
    .filter((node) => node.active)
    .reduce((sum, node) => sum + Math.max(0, 1 - pointDistance(point, node.point) / 0.22), 0);
  const lineCrowding = state.lines
    .filter((line) => line.active)
    .reduce((sum, line) => {
      const center = { x: (line.a.x + line.b.x) / 2, y: (line.a.y + line.b.y) / 2 };
      return sum + Math.max(0, 1 - pointDistance(point, center) / 0.25);
    }, 0);
  return Math.min(1, (nodeCrowding + lineCrowding * 0.45) / 8);
};

const candidateToTrainingFrontier = (state: GameState, point: { x: number; y: number }) =>
  Math.min(1, pointDistance(point, activityCenter(state)) / 0.55);

const fastTrainingMoves = (state: GameState, playerId: PlayerId): Move[] => {
  const rng = createRng(`${state.settings.seed}:train:${playerId}:${state.turn}:${state.lines.length}`);
  const moves: Move[] = [];
  const lines = state.lines.filter((line) => line.active).slice(-8);
  const nodes = state.nodes.filter((node) => node.active).slice(-6);
  for (const line of lines) {
    const base = Math.atan2(line.b.y - line.a.y, line.b.x - line.a.x);
    for (const t of [0.35, 0.68]) {
      const center = { x: line.a.x + (line.b.x - line.a.x) * t, y: line.a.y + (line.b.y - line.a.y) * t };
      moves.push({ center, angle: base + Math.PI / 2.5 });
      moves.push({ center, angle: base - Math.PI / 2.5 });
    }
  }
  for (const node of nodes) moves.push(moveFromStart(node.point, randomBetween(rng, 0, Math.PI * 2), state.settings.lineLength));
  for (let i = 0; i < 12; i += 1) {
    moves.push({
      center: { x: randomBetween(rng, 0.12, 0.88), y: randomBetween(rng, 0.12, 0.88) },
      angle: randomBetween(rng, 0, Math.PI * 2),
    });
  }
  return moves;
};

const moveKey = (move: Move) => `${move.center.x.toFixed(3)},${move.center.y.toFixed(3)},${move.angle.toFixed(3)}`;

const trainingMoves = (state: GameState, playerId: PlayerId) => {
  const seen = new Set<string>();
  return [...fastTrainingMoves(state, playerId), ...generateMoves(state, playerId, 45)].filter((move) => {
    const key = moveKey(move);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const candidateToFeatures = (state: GameState, candidate: NonNullable<ReturnType<typeof lightCandidate>>, playerId: PlayerId): AiFeatures => {
  const opponent = opponentOf(playerId);
  const simulated = placeMove(state, playerId, candidate.move);
  const before = scoreFor(state, playerId).totalArea - scoreFor(state, opponent).totalArea;
  const after = scoreFor(simulated, playerId).totalArea - scoreFor(simulated, opponent).totalArea;
  const ownedDots = previewOwnedNodeCount(candidate.evaluation.previewNodes, playerId) - ownedNodeCount(state, playerId);
  const opponentDots = previewOwnedNodeCount(candidate.evaluation.previewNodes, opponent) - ownedNodeCount(state, opponent);
  return {
    gainedArea: candidate.evaluation.gainedArea,
    triangleCount: candidate.evaluation.previewTriangles.length,
    intersectionCount: candidate.evaluation.intersections.length,
    ownedDots,
    opponentDots,
    centerBias: 1 - Math.min(1, Math.hypot(candidate.move.center.x - 0.5, candidate.move.center.y - 0.5)),
    spread: Math.min(0.65, Math.hypot(candidate.move.center.x - 0.5, candidate.move.center.y - 0.5)),
    crowding: candidateToTrainingCrowding(state, candidate.move.center),
    frontier: candidateToTrainingFrontier(state, candidate.move.center),
    scoreDelta: after - before,
    replyRisk: 0,
    mobilityDiff: 0,
    terminalBonus: 0,
  };
};

const chooseTrainingMove = (state: GameState, playerId: PlayerId, weights: AiWeights, temperature: number) => {
  const candidates = trainingMoves(state, playerId)
    .map((move) => lightCandidate(state, move, playerId, weights))
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);
  if (candidates.length === 0) return null;
  const index = Math.min(candidates.length - 1, Math.floor(Math.random() ** (1 + temperature) * candidates.length));
  const enriched = candidates.map((candidate) => ({
    candidate,
    features: candidateToFeatures(state, candidate, playerId),
  }));
  const target = [...enriched].sort((a, b) => targetValue(b.features) - targetValue(a.features))[0];
  return { selected: candidates[index], target: target.candidate, targetFeatures: target.features };
};

const targetValue = (features: AiFeatures) =>
  features.gainedArea * 9000 +
  features.scoreDelta * 4500 +
  features.triangleCount * 500 +
  features.intersectionCount * 25 +
  features.ownedDots * 5 -
  features.centerBias * 8 +
  features.spread * 24 -
  features.crowding * 90 +
  features.frontier * 55;

const playTrainingGame = (settings: GameSettings, weights: AiWeights, temperature: number) => {
  let state = createGame(settings);
  const samples: Sample[] = [];
  for (let safety = 0; state.phase === 'playing' && safety < settings.maxTurns * 2 + 6; safety += 1) {
    const playerId = state.currentPlayerId;
    const choice = chooseTrainingMove(state, playerId, weights, temperature);
    if (!choice) {
      state = passTurn(state, playerId, 'training no legal move');
      continue;
    }
    samples.push({
      playerId,
      chosen: candidateToFeatures(state, choice.selected, playerId),
      target: choice.targetFeatures,
    });
    state = placeMove(state, playerId, choice.selected.move);
  }
  return { state, samples };
};

const runTrainingBatch = (options: TrainOptions, weights: AiWeights, reportProgress: boolean): TrainResult => {
  const correlations = emptyWeights();
  const startedAt = Date.now();
  const wins = { human: 0, cpu: 0, draw: 0 };
  let totalSamples = 0;

  for (let game = 0; game < options.games; game += 1) {
    const globalGame = options.workerIndex + game * options.totalWorkers;
    const settings: GameSettings = {
      difficulty: 'HARD',
      firstPlayer: globalGame % 2 === 0 ? 'human' : 'cpu',
      maxTurns: options.maxTurns,
      lineLength: 0.25,
      minTriangleAreaRatio: 0.01,
      sound: false,
      guides: true,
      seed: `${options.baseSeed}-${globalGame}`,
    };
    const { state, samples } = playTrainingGame(settings, weights, Math.max(0.15, 1 - globalGame / options.totalGames));
    const winner = resolveWinner(state);
    wins[winner] += 1;
    totalSamples += samples.length;
    for (const sample of samples) {
      const opponent = opponentOf(sample.playerId);
      const playerScore = scoreFor(state, sample.playerId).totalArea;
      const opponentScore = scoreFor(state, opponent).totalArea;
      const margin = Math.max(-1, Math.min(1, (playerScore - opponentScore) * 4));
      const playerReward = winner === 'draw' ? 0.35 + Math.abs(margin) : winner === sample.playerId ? 1 : 0.45 + Math.max(0, margin) * 0.25;
      const normalized = normalizeFeatures(subtractFeatures(sample.target, sample.chosen));
      for (const key of featureKeys) correlations[key] += normalized[key] * playerReward;
    }
    if (reportProgress && ((game + 1) % options.progressEvery === 0 || game + 1 === options.games)) {
      const elapsedSec = (Date.now() - startedAt) / 1000;
      const gamesPerSec = (game + 1) / Math.max(0.001, elapsedSec);
      const remainingSec = (options.games - game - 1) / Math.max(0.001, gamesPerSec);
      const progress = {
        type: 'progress',
        workerIndex: options.workerIndex,
        done: game + 1,
        games: options.games,
        elapsedSec,
        remainingSec,
        wins,
        avgMoves: totalSamples / (game + 1),
      };
      if (parentPort) parentPort.postMessage(progress);
      else {
        console.log(
          `progress ${progress.done}/${progress.games} ` +
          `elapsed=${elapsedSec.toFixed(1)}s eta=${remainingSec.toFixed(1)}s ` +
          `wins cpu=${wins.cpu} human=${wins.human} draw=${wins.draw} ` +
          `avgMoves=${progress.avgMoves.toFixed(1)}`,
        );
      }
    }
  }
  return { correlations, wins, totalSamples, games: options.games };
};

const mergeResult = (target: TrainResult, source: TrainResult) => {
  for (const key of featureKeys) target.correlations[key] += source.correlations[key];
  target.wins.human += source.wins.human;
  target.wins.cpu += source.wins.cpu;
  target.wins.draw += source.wins.draw;
  target.totalSamples += source.totalSamples;
  target.games += source.games;
};

const runParallelBatches = (options: Omit<TrainOptions, 'games' | 'workerIndex'>, workerCount: number, weights: AiWeights) =>
  new Promise<TrainResult>((resolve, reject) => {
    const merged: TrainResult = { correlations: emptyWeights(), wins: { human: 0, cpu: 0, draw: 0 }, totalSamples: 0, games: 0 };
    let finished = 0;
    for (let workerIndex = 0; workerIndex < workerCount; workerIndex += 1) {
      const games = Math.floor(options.totalGames / workerCount) + (workerIndex < options.totalGames % workerCount ? 1 : 0);
      const worker = new Worker(new URL(import.meta.url), {
        workerData: {
          options: { ...options, games, workerIndex },
          weights,
        },
      });
      worker.on('message', (message: { type: string; result?: TrainResult; workerIndex?: number; done?: number; games?: number; elapsedSec?: number; remainingSec?: number; wins?: TrainResult['wins']; avgMoves?: number }) => {
        if (message.type === 'progress') {
          console.log(
            `worker ${Number(message.workerIndex) + 1}/${workerCount} progress ${message.done}/${message.games} ` +
            `elapsed=${message.elapsedSec?.toFixed(1)}s eta=${message.remainingSec?.toFixed(1)}s ` +
            `wins cpu=${message.wins?.cpu} human=${message.wins?.human} draw=${message.wins?.draw} ` +
            `avgMoves=${message.avgMoves?.toFixed(1)}`,
          );
          return;
        }
        if (message.type === 'done' && message.result) {
          mergeResult(merged, message.result);
          finished += 1;
          if (finished === workerCount) resolve(merged);
        }
      });
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`worker ${workerIndex + 1} exited with ${code}`));
      });
    }
  });

const train = async () => {
  const games = Math.max(1, Math.floor(argValue('games', 20)));
  const maxTurns = Math.max(8, Math.floor(argValue('turns', 14)));
  const learningRate = argValue('lr', 0.035);
  const workerCount = Math.max(1, Math.min(games, Math.floor(argValue('workers', 1))));
  const weights: AiWeights = { ...activeAiWeights };
  const progressEvery = Math.max(1, Math.floor(argValue('progressEvery', Math.max(1, Math.floor(games / 10)))));
  const baseSeed = `train-${Date.now()}`;

  console.log(`training start: games=${games}, turns=${maxTurns}, lr=${learningRate}, workers=${workerCount}`);

  const result = workerCount === 1
    ? runTrainingBatch({
      games,
      maxTurns,
      learningRate,
      progressEvery,
      baseSeed,
      workerIndex: 0,
      totalWorkers: 1,
      totalGames: games,
    }, weights, true)
    : await runParallelBatches({
      maxTurns,
      learningRate,
      progressEvery: Math.max(1, Math.floor(progressEvery / workerCount)),
      baseSeed,
      totalWorkers: workerCount,
      totalGames: games,
    }, workerCount, weights);

  const scale = Math.max(1, result.games);
  for (const key of featureKeys) {
    const direction = result.correlations[key] / scale;
    const base = weights[key] || DEFAULT_AI_WEIGHTS[key];
    const adjustment = Math.max(-0.5, Math.min(0.5, direction * learningRate));
    weights[key] = Number((base * (1 + adjustment)).toFixed(5));
  }

  const output = {
    version: 1,
    trainedGames: games,
    updatedAt: new Date().toISOString(),
    weights,
  };
  await writeFile('src/game/cpu/learnedWeights.json', `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`trained ${games} games`);
  console.log(`wins cpu=${result.wins.cpu} human=${result.wins.human} draw=${result.wins.draw} avgMoves=${(result.totalSamples / Math.max(1, result.games)).toFixed(1)}`);
  console.log(JSON.stringify(output.weights, null, 2));
};

if (isMainThread) {
  await train();
} else {
  const data = workerData as { options: TrainOptions; weights: AiWeights };
  const result = runTrainingBatch(data.options, data.weights, true);
  parentPort?.postMessage({ type: 'done', result });
}
