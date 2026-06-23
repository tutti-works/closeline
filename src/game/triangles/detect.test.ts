import { describe, expect, it } from 'vitest';
import type { GameState, IntersectionNode, LineSegment } from '../../types/game';
import { defaultSettings, players } from '../state';
import { detectPlayerTriangles } from './detect';

const line = (id: string, a: [number, number], b: [number, number], ownerId: 'human' | 'cpu' | null = null): LineSegment => ({
  id,
  a: { x: a[0], y: a[1] },
  b: { x: b[0], y: b[1] },
  ownerId,
  neutral: ownerId === null,
  generatedTurn: 1,
  active: true,
});

const node = (id: string, x: number, y: number): IntersectionNode => ({
  id,
  point: { x, y },
  ownerships: [{ playerId: 'human', turn: 1, lineIds: [] }],
  generatedTurn: 1,
  lineIds: [],
  active: true,
});

const state = (lines: LineSegment[], nodes: IntersectionNode[]): GameState => ({
  players,
  settings: { ...defaultSettings(), minTriangleAreaRatio: 0.005 },
  phase: 'playing',
  currentPlayerId: 'human',
  turn: 3,
  consecutivePasses: 0,
  lines,
  nodes,
  territories: [],
});

describe('triangle detection', () => {
  it('uses neutral and opponent lines as triangle edges', () => {
    const s = state(
      [
        line('a', [0.2, 0.2], [0.8, 0.2], null),
        line('b', [0.8, 0.2], [0.5, 0.75], 'cpu'),
        line('c', [0.5, 0.75], [0.2, 0.2], 'human'),
      ],
      [node('p1', 0.2, 0.2), node('p2', 0.8, 0.2), node('p3', 0.5, 0.75)],
    );
    const triangles = detectPlayerTriangles(s, 'human', 3);
    expect(triangles).toHaveLength(1);
    expect(triangles[0].area).toBeGreaterThan(0.1);
  });

  it('allows multiple collinear segments to cover one edge and rejects gaps', () => {
    const nodes = [node('p1', 0.2, 0.2), node('p2', 0.8, 0.2), node('p3', 0.5, 0.7)];
    const covered = state(
      [
        line('a1', [0.2, 0.2], [0.5, 0.2]),
        line('a2', [0.5, 0.2], [0.8, 0.2]),
        line('b', [0.8, 0.2], [0.5, 0.7]),
        line('c', [0.5, 0.7], [0.2, 0.2]),
      ],
      nodes,
    );
    expect(detectPlayerTriangles(covered, 'human', 3)).toHaveLength(1);
    const gap = state(
      [
        line('a1', [0.2, 0.2], [0.45, 0.2]),
        line('a2', [0.55, 0.2], [0.8, 0.2]),
        line('b', [0.8, 0.2], [0.5, 0.7]),
        line('c', [0.5, 0.7], [0.2, 0.2]),
      ],
      nodes,
    );
    expect(detectPlayerTriangles(gap, 'human', 3)).toHaveLength(0);
  });

  it('detects triangles when intersection coordinates have small angular floating point drift', () => {
    const nodes = [
      node('p1', 0.20000001, 0.20000001),
      node('p2', 0.79999999, 0.2),
      node('p3', 0.50000002, 0.70000001),
    ];
    const s = state(
      [
        line('a', [0.1, 0.19999999], [0.9, 0.20000001]),
        line('b', [0.80000001, 0.19999998], [0.49999998, 0.70000002]),
        line('c', [0.50000001, 0.70000001], [0.19999999, 0.19999998]),
      ],
      nodes,
    );
    expect(detectPlayerTriangles(s, 'human', 3)).toHaveLength(1);
  });
});
