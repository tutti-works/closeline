import { describe, expect, it } from 'vitest';
import type { GameState, LineSegment } from '../../types/game';
import { defaultSettings, players } from '../state';
import { evaluateMove, placeMove } from './placement';

const baseLine = (id: string, a: [number, number], b: [number, number]): LineSegment => ({
  id,
  a: { x: a[0], y: a[1] },
  b: { x: b[0], y: b[1] },
  ownerId: null,
  neutral: true,
  generatedTurn: 0,
  active: true,
});

const stateWith = (lines: LineSegment[]): GameState => ({
  players,
  settings: { ...defaultSettings(), lineLength: 0.4, minTriangleAreaRatio: 0.005, seed: 'test' },
  phase: 'playing',
  currentPlayerId: 'human',
  turn: 1,
  consecutivePasses: 0,
  lines,
  nodes: [],
  territories: [],
});

describe('placement', () => {
  it('rejects moves without proper intersection and accepts crossing moves', () => {
    const state = stateWith([baseLine('n1', [0.2, 0.5], [0.8, 0.5])]);
    expect(evaluateMove(state, 'human', { center: { x: 0.5, y: 0.8 }, angle: 0 }).valid).toBe(false);
    expect(evaluateMove(state, 'human', { center: { x: 0.5, y: 0.5 }, angle: Math.PI / 4 }).valid).toBe(true);
  });

  it('rejects vertical, overlapping, and out of board moves', () => {
    const state = stateWith([baseLine('n1', [0.2, 0.5], [0.8, 0.5])]);
    expect(evaluateMove(state, 'human', { center: { x: 0.5, y: 0.5 }, angle: Math.PI / 2 }).valid).toBe(false);
    expect(evaluateMove(state, 'human', { center: { x: 0.5, y: 0.5 }, angle: 0 }).valid).toBe(false);
    expect(evaluateMove(state, 'human', { center: { x: 0.05, y: 0.5 }, angle: 0 }).valid).toBe(false);
  });

  it('creates dots owned by the player and merges shared ownership at same point', () => {
    const state = stateWith([baseLine('n1', [0.2, 0.5], [0.8, 0.5])]);
    const afterHuman = placeMove(state, 'human', { center: { x: 0.5, y: 0.5 }, angle: Math.PI / 4 });
    expect(afterHuman.nodes).toHaveLength(1);
    expect(afterHuman.nodes[0].ownerships[0].playerId).toBe('human');
    const cpuState = { ...afterHuman, currentPlayerId: 'cpu' as const };
    const afterCpu = placeMove(cpuState, 'cpu', { center: { x: 0.5, y: 0.5 }, angle: -Math.PI / 4 });
    const shared = afterCpu.nodes.find((node) => node.ownerships.length > 1);
    expect(shared).toBeTruthy();
  });

  it('creates a dot for endpoint contact when the move also has a proper crossing', () => {
    const state = stateWith([
      baseLine('n1', [0.2, 0.5], [0.8, 0.5]),
      baseLine('n2', [0.2, 0.7], [0.8, 0.7]),
    ]);
    const after = placeMove(state, 'human', { center: { x: 0.42, y: 0.66 }, angle: Math.atan2(0.32, 0.24) });
    expect(after.nodes.length).toBeGreaterThanOrEqual(2);
    expect(after.nodes.some((node) => Math.abs(node.point.x - 0.3) < 1e-5 && Math.abs(node.point.y - 0.5) < 1e-5)).toBe(true);
  });

  it('allows crossing the overhanging part of a line that formed an existing triangle', () => {
    const state: GameState = {
      ...stateWith([
        baseLine('base', [0.1, 0.2], [0.9, 0.2]),
        baseLine('right', [0.8, 0.2], [0.5, 0.7]),
        baseLine('left', [0.5, 0.7], [0.2, 0.2]),
        baseLine('target', [0.82, 0.45], [0.82, 0.85]),
      ]),
      territories: [
        {
          id: 'existing',
          points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.5, y: 0.7 }],
          dotIds: ['a', 'b', 'c'],
          ownerId: 'human',
          area: 0.15,
          areaRatio: 0.15,
          capturedTurn: 1,
          coverage: [],
          comboId: 'combo-existing',
        },
      ],
    };
    const valid = evaluateMove(state, 'human', { center: { x: 0.82, y: 0.75 }, angle: Math.PI / 4 });
    expect(valid.valid).toBe(true);
    const touchingEdge = evaluateMove(state, 'human', { center: { x: 0.8, y: 0.2 }, angle: Math.PI / 4 });
    expect(touchingEdge.valid).toBe(false);
  });
});
