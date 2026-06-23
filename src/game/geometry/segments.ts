import { EPSILON } from '../constants';
import type { Point } from '../../types/game';
import { cross, distancePointToSegment, dot, pointOnSegment, samePoint, sub } from './math';

export type SegmentIntersection = {
  intersects: boolean;
  proper: boolean;
  point?: Point;
  touches: boolean;
  overlaps: boolean;
};

export const segmentIntersection = (a: Point, b: Point, c: Point, d: Point): SegmentIntersection => {
  const r = sub(b, a);
  const s = sub(d, c);
  const denom = cross(r, s);
  const qp = sub(c, a);

  if (Math.abs(denom) <= EPSILON) {
    if (Math.abs(cross(qp, r)) > EPSILON) {
      return { intersects: false, proper: false, touches: false, overlaps: false };
    }
    const rr = dot(r, r);
    const t0 = dot(sub(c, a), r) / rr;
    const t1 = dot(sub(d, a), r) / rr;
    const min = Math.max(0, Math.min(t0, t1));
    const max = Math.min(1, Math.max(t0, t1));
    const overlaps = max - min > EPSILON;
    const touches = Math.abs(max - min) <= EPSILON && max >= -EPSILON && min <= 1 + EPSILON;
    return { intersects: overlaps || touches, proper: false, touches, overlaps };
  }

  const t = cross(qp, s) / denom;
  const u = cross(qp, r) / denom;
  if (t < -EPSILON || t > 1 + EPSILON || u < -EPSILON || u > 1 + EPSILON) {
    return { intersects: false, proper: false, touches: false, overlaps: false };
  }

  const point = { x: a.x + t * r.x, y: a.y + t * r.y };
  const touches = t <= EPSILON || t >= 1 - EPSILON || u <= EPSILON || u >= 1 - EPSILON;
  return { intersects: true, proper: !touches, point, touches, overlaps: false };
};

export const collinearOverlap = (a: Point, b: Point, c: Point, d: Point) => segmentIntersection(a, b, c, d).overlaps;

export const properIntersectionPoint = (a: Point, b: Point, c: Point, d: Point) => {
  const hit = segmentIntersection(a, b, c, d);
  return hit.proper ? hit.point : undefined;
};

export const segmentTouchesOrCrosses = (a: Point, b: Point, c: Point, d: Point) => segmentIntersection(a, b, c, d).intersects;

export const segmentDistance = (a: Point, b: Point, c: Point, d: Point) => {
  if (segmentIntersection(a, b, c, d).intersects) return 0;
  return Math.min(
    distancePointToSegment(a, c, d),
    distancePointToSegment(b, c, d),
    distancePointToSegment(c, a, b),
    distancePointToSegment(d, a, b),
  );
};

export const uniquePoints = (points: Point[]) => {
  const unique: Point[] = [];
  for (const point of points) {
    if (!unique.some((existing) => samePoint(existing, point))) unique.push(point);
  }
  return unique;
};

export const pointStrictlyInsideSegment = (point: Point, a: Point, b: Point) =>
  pointOnSegment(point, a, b) && !samePoint(point, a) && !samePoint(point, b);
