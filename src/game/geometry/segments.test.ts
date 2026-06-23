import { describe, expect, it } from 'vitest';
import { segmentsCrossImproperly, segmentsOverlap } from './segments';

describe('segment validation helpers', () => {
  it('detects normal crossing', () => {
    expect(segmentsCrossImproperly({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(true);
  });

  it('allows endpoint contact', () => {
    expect(segmentsCrossImproperly({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 })).toBe(false);
  });

  it('detects overlap', () => {
    expect(segmentsOverlap({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }, { x: 15, y: 0 })).toBe(true);
  });
});
