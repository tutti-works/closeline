import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../state';
import { generateInitialLines } from './generate';
import { isVerticalForbidden } from '../geometry/math';
import { segmentDistance, segmentIntersection } from '../geometry/segments';
import { distance } from '../geometry/math';

describe('initial board', () => {
  it('generates three deterministic neutral lines without contact', () => {
    const settings = { ...defaultSettings(), seed: 'fixed-seed' };
    const a = generateInitialLines(settings);
    const b = generateInitialLines(settings);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    for (const line of a) {
      expect(line.neutral).toBe(true);
      expect(distance(line.a, line.b)).toBeGreaterThan(settings.lineLength);
      expect(isVerticalForbidden(Math.atan2(line.b.y - line.a.y, line.b.x - line.a.x))).toBe(false);
      expect(line.a.x).toBeGreaterThanOrEqual(0);
      expect(line.b.x).toBeLessThanOrEqual(1);
    }
    for (let i = 0; i < a.length; i += 1) {
      for (let j = i + 1; j < a.length; j += 1) {
        expect(segmentIntersection(a[i].a, a[i].b, a[j].a, a[j].b).intersects).toBe(false);
        expect(segmentDistance(a[i].a, a[i].b, a[j].a, a[j].b)).toBeGreaterThanOrEqual(0.09 - 1e-5);
      }
    }
  });
});
