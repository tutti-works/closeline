import { describe, expect, it } from 'vitest';
import { isVerticalForbidden, segmentFromCenter, segmentWithinBoard, triangleArea } from './math';
import { segmentIntersection } from './segments';

describe('geometry', () => {
  it('detects proper intersection separately from endpoint touch', () => {
    expect(segmentIntersection({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 0 }).proper).toBe(true);
    const touch = segmentIntersection({ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 0 }, { x: 1, y: 0.5 });
    expect(touch.intersects).toBe(true);
    expect(touch.proper).toBe(false);
  });

  it('forbids vertical and near vertical angles', () => {
    expect(isVerticalForbidden(Math.PI / 2)).toBe(true);
    expect(isVerticalForbidden((85 * Math.PI) / 180)).toBe(true);
    expect(isVerticalForbidden(0)).toBe(false);
  });

  it('creates fixed length segments inside normalized board', () => {
    const [a, b] = segmentFromCenter({ x: 0.5, y: 0.5 }, 0, 0.25);
    expect(segmentWithinBoard(a, b)).toBe(true);
    expect(Math.abs(triangleArea({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }) - 0.5)).toBeLessThan(1e-6);
  });
});
