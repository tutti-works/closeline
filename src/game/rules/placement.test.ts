import { describe, expect, it } from 'vitest';
import { createInitialState, defaultSettings } from '../state';
import { applyPlacement, placeSegment, validateSegment } from './placement';

const settings = { ...defaultSettings, lineLength: 100, maxTurns: 20 };

describe('placement rules', () => {
  it('rejects line crossings', () => {
    let state = createInitialState(settings);
    const first = placeSegment(state, { x: 100, y: 100 }, { x: 200, y: 200 });
    expect(first.ok).toBe(true);
    if (first.ok) state = applyPlacement(state, first);
    expect(validateSegment(state, { x: 100, y: 200 }, { x: 200, y: 100 })).toBe('既存の線と交差しています');
  });

  it('allows endpoint contact', () => {
    let state = createInitialState(settings);
    const first = placeSegment(state, { x: 100, y: 100 }, { x: 200, y: 100 });
    expect(first.ok).toBe(true);
    if (first.ok) state = applyPlacement(state, first);
    expect(validateSegment(state, { x: 200, y: 100 }, { x: 200, y: 200 })).toBeNull();
  });

  it('captures a square region', () => {
    let state = createInitialState(settings);
    const moves = [
      [{ x: 100, y: 100 }, { x: 200, y: 100 }],
      [{ x: 200, y: 100 }, { x: 200, y: 200 }],
      [{ x: 200, y: 200 }, { x: 100, y: 200 }],
      [{ x: 100, y: 200 }, { x: 100, y: 100 }],
    ] as const;

    for (const [a, b] of moves) {
      const result = placeSegment(state, a, b);
      expect(result.ok).toBe(true);
      if (result.ok) state = applyPlacement(state, result);
    }

    expect(state.regions).toHaveLength(1);
    expect(Math.round(state.regions[0].area)).toBe(10000);
  });

  it('does not allow a line through captured interior', () => {
    let state = createInitialState(settings);
    for (const [a, b] of [
      [{ x: 100, y: 100 }, { x: 200, y: 100 }],
      [{ x: 200, y: 100 }, { x: 200, y: 200 }],
      [{ x: 200, y: 200 }, { x: 100, y: 200 }],
      [{ x: 100, y: 200 }, { x: 100, y: 100 }],
    ] as const) {
      const result = placeSegment(state, a, b);
      if (result.ok) state = applyPlacement(state, result);
    }
    expect(validateSegment(state, { x: 125, y: 150 }, { x: 175, y: 150 })).toBe('獲得済み領域の内側には置けません');
  });
});
