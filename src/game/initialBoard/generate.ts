import type { GameSettings, NeutralLine, Point } from '../../types/game';
import { EPSILON } from '../constants';
import { isVerticalForbidden, segmentFromCenter, segmentWithinBoard } from '../geometry/math';
import { segmentDistance, segmentIntersection } from '../geometry/segments';
import { createRng, randomBetween } from '../random';

const minDistance = 0.15;
const edgeMargin = 0.1;

const fallback = (settings: GameSettings): NeutralLine[] => [
  makeNeutral('neutral-1', { x: 0.25, y: 0.32 }, -0.42, settings.lineLength * 1.22),
  makeNeutral('neutral-2', { x: 0.72, y: 0.38 }, 0.38, settings.lineLength * 1.16),
  makeNeutral('neutral-3', { x: 0.47, y: 0.72 }, -0.18, settings.lineLength * 1.28),
];

const makeNeutral = (id: string, center: Point, angle: number, length: number): NeutralLine => {
  const [a, b] = segmentFromCenter(center, angle, length);
  return { id, a, b, neutral: true, ownerId: null, generatedTurn: 0, active: true };
};

const farFromEdge = (line: NeutralLine) =>
  [line.a, line.b].every((p) => p.x >= edgeMargin && p.x <= 1 - edgeMargin && p.y >= edgeMargin && p.y <= 1 - edgeMargin);

const validLine = (line: NeutralLine, existing: NeutralLine[]) => {
  if (!segmentWithinBoard(line.a, line.b)) return false;
  if (!farFromEdge(line)) return false;
  if (isVerticalForbidden(Math.atan2(line.b.y - line.a.y, line.b.x - line.a.x))) return false;
  return existing.every((candidate) => {
    const hit = segmentIntersection(line.a, line.b, candidate.a, candidate.b);
    return !hit.intersects && segmentDistance(line.a, line.b, candidate.a, candidate.b) >= minDistance - EPSILON;
  });
};

const notAlmostParallel = (lines: NeutralLine[]) => {
  const angles = lines.map((line) => Math.atan2(line.b.y - line.a.y, line.b.x - line.a.x));
  const normalized = angles.map((angle) => Math.abs(Math.sin(angle)));
  return Math.max(...normalized) - Math.min(...normalized) > 0.18;
};

export const generateInitialLines = (settings: GameSettings): NeutralLine[] => {
  const rng = createRng(settings.seed);
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const lines: NeutralLine[] = [];
    const anchors = [
      { x: randomBetween(rng, 0.38, 0.62), y: randomBetween(rng, 0.38, 0.62) },
      { x: randomBetween(rng, 0.16, 0.34), y: randomBetween(rng, 0.18, 0.72) },
      { x: randomBetween(rng, 0.66, 0.84), y: randomBetween(rng, 0.28, 0.82) },
    ];
    for (let i = 0; i < 3; i += 1) {
      let added = false;
      for (let tries = 0; tries < 80 && !added; tries += 1) {
        const length = settings.lineLength * randomBetween(rng, 1.05, 1.45);
        const angle = randomBetween(rng, -Math.PI * 0.42, Math.PI * 0.42) + (i === 2 ? Math.PI * 0.08 : 0);
        const line = makeNeutral(`neutral-${i + 1}`, anchors[i], angle, length);
        if (validLine(line, lines)) {
          lines.push(line);
          added = true;
        }
      }
    }
    if (lines.length === 3 && notAlmostParallel(lines)) return lines;
  }
  return fallback(settings);
};
