import type { GameState, Point, Segment } from '../../types/game';
import { distance } from '../geometry/math';
import { makeFixedSegment } from '../geometry/segments';
import { placeSegment } from '../rules/placement';

export type CpuCandidate = {
  a: Point;
  b: Point;
  score: number;
  regions: number;
  area: number;
};

const random = (min: number, max: number) => min + Math.random() * (max - min);

const endpoints = (segments: Segment[]): Point[] => segments.flatMap((segment) => [segment.a, segment.b]);

const boundaryPoint = (boardSize: number): Point => {
  const side = Math.floor(Math.random() * 4);
  const t = random(0, boardSize);
  if (side === 0) return { x: t, y: 0 };
  if (side === 1) return { x: boardSize, y: t };
  if (side === 2) return { x: t, y: boardSize };
  return { x: 0, y: t };
};

const seedPoint = (state: GameState): Point => {
  const candidates = endpoints(state.segments);
  if (candidates.length > 0 && Math.random() < 0.65) return candidates[Math.floor(Math.random() * candidates.length)];
  if (Math.random() < 0.35) return boundaryPoint(state.boardSize);
  return { x: random(120, state.boardSize - 120), y: random(120, state.boardSize - 120) };
};

const sampleCandidate = (state: GameState): CpuCandidate | null => {
  const start = seedPoint(state);
  const angle = random(0, Math.PI * 2);
  const pointer = { x: start.x + Math.cos(angle) * state.settings.lineLength, y: start.y + Math.sin(angle) * state.settings.lineLength };
  const [a, b] = makeFixedSegment(start, pointer, state.settings.lineLength);
  const result = placeSegment(state, a, b);
  if (!result.ok) return null;
  const area = result.newRegions.reduce((sum, region) => sum + region.area, 0);
  const centerBias = -distance({ x: state.boardSize / 2, y: state.boardSize / 2 }, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) / 1000;
  return {
    a,
    b,
    regions: result.newRegions.length,
    area,
    score: area / 1000 + result.newRegions.length * 250 + state.segments.length * 0.15 + centerBias,
  };
};

export const findCpuMove = (state: GameState): CpuCandidate | null => {
  const attempts = state.settings.cpuDifficulty === 'easy' ? 120 : state.settings.cpuDifficulty === 'normal' ? 450 : 1000;
  const top: CpuCandidate[] = [];

  for (let i = 0; i < attempts; i += 1) {
    const candidate = sampleCandidate(state);
    if (!candidate) continue;
    if (state.settings.cpuDifficulty === 'easy' && Math.random() < 0.7) return candidate;
    top.push(candidate);
    top.sort((a, b) => b.score - a.score);
    top.length = Math.min(top.length, state.settings.cpuDifficulty === 'hard' ? 12 : 6);
  }

  if (top.length === 0) return null;
  if (state.settings.cpuDifficulty === 'hard') return top[0];
  return top[Math.floor(Math.random() * Math.min(3, top.length))];
};
