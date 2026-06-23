import type { LineSegment, Point, TerritoryTriangle } from '../../types/game';
import { EPSILON } from '../constants';
import { cross, distance, pointInTriangle, pointOnSegment, samePoint, sub, dot } from './math';
import { segmentIntersection } from './segments';

export const triangleEdges = (points: [Point, Point, Point]) => [
  [points[0], points[1]] as [Point, Point],
  [points[1], points[2]] as [Point, Point],
  [points[2], points[0]] as [Point, Point],
];

export const segmentTouchesTriangle = (a: Point, b: Point, triangle: TerritoryTriangle) => {
  if (pointInTriangle(a, triangle.points[0], triangle.points[1], triangle.points[2])) return true;
  if (pointInTriangle(b, triangle.points[0], triangle.points[1], triangle.points[2])) return true;
  return triangleEdges(triangle.points).some(([c, d]) => segmentIntersection(a, b, c, d).intersects);
};

export const trianglesTouchOrOverlap = (a: [Point, Point, Point], b: [Point, Point, Point]) => {
  if (a.some((point) => pointInTriangle(point, b[0], b[1], b[2]))) return true;
  if (b.some((point) => pointInTriangle(point, a[0], a[1], a[2]))) return true;
  return triangleEdges(a).some(([a1, a2]) => triangleEdges(b).some(([b1, b2]) => segmentIntersection(a1, a2, b1, b2).intersects));
};

const projectionRange = (segmentA: Point, segmentB: Point, edgeA: Point, edgeB: Point) => {
  const axis = sub(edgeB, edgeA);
  const lengthSq = dot(axis, axis);
  const t0 = dot(sub(segmentA, edgeA), axis) / lengthSq;
  const t1 = dot(sub(segmentB, edgeA), axis) / lengthSq;
  return [Math.max(0, Math.min(t0, t1)), Math.min(1, Math.max(t0, t1))] as [number, number];
};

const lineDistance = (point: Point, edgeA: Point, edgeB: Point) => {
  const axis = sub(edgeB, edgeA);
  const length = distance(edgeA, edgeB);
  if (length <= EPSILON) return Number.POSITIVE_INFINITY;
  return Math.abs(cross(axis, sub(point, edgeA))) / length;
};

export const edgeCoverage = (from: Point, to: Point, lines: LineSegment[]) => {
  const ranges: Array<[number, number, string]> = [];
  for (const line of lines) {
    if (!line.active) continue;
    if (pointOnSegment(from, line.a, line.b, EPSILON * 20) && pointOnSegment(to, line.a, line.b, EPSILON * 20)) {
      return [line.id];
    }
    if (lineDistance(line.a, from, to) > EPSILON * 10 || lineDistance(line.b, from, to) > EPSILON * 10) continue;
    const [start, end] = projectionRange(line.a, line.b, from, to);
    if (end - start > EPSILON) ranges.push([start, end, line.id]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let cursor = 0;
  const ids: string[] = [];
  for (const [start, end, id] of ranges) {
    if (start > cursor + EPSILON) return null;
    if (end > cursor) {
      cursor = end;
      ids.push(id);
    }
    if (cursor >= 1 - EPSILON) return ids;
  }
  return cursor >= 1 - EPSILON ? ids : null;
};

export const pointInAnyTerritory = (point: Point, territories: TerritoryTriangle[]) =>
  territories.some((territory) => pointInTriangle(point, territory.points[0], territory.points[1], territory.points[2]));

export const lineCapturedByTerritory = (line: LineSegment, territory: TerritoryTriangle) =>
  pointInTriangle(line.a, territory.points[0], territory.points[1], territory.points[2]) ||
  pointInTriangle(line.b, territory.points[0], territory.points[1], territory.points[2]) ||
  segmentTouchesTriangle(line.a, line.b, territory);

export const pointEqualsAny = (point: Point, points: Point[]) => points.some((candidate) => samePoint(point, candidate));
