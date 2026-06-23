import { BOARD_MAX, BOARD_MIN, EPSILON, VERTICAL_FORBIDDEN_RANGE_DEGREES } from '../constants';
import type { Point } from '../../types/game';

export const clamp = (value: number, min = BOARD_MIN, max = BOARD_MAX) => Math.min(max, Math.max(min, value));

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const samePoint = (a: Point, b: Point, eps = EPSILON) => distance(a, b) <= eps;

export const pointKey = (point: Point) => `${point.x.toFixed(5)},${point.y.toFixed(5)}`;

export const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;

export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });

export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

export const scale = (a: Point, amount: number): Point => ({ x: a.x * amount, y: a.y * amount });

export const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;

export const angleToPoint = (center: Point, pointer: Point) => Math.atan2(pointer.y - center.y, pointer.x - center.x);

export const angleDegrees = (angle: number) => {
  const deg = (angle * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
};

export const isVerticalForbidden = (angle: number, range = VERTICAL_FORBIDDEN_RANGE_DEGREES) => {
  const deg = angleDegrees(angle);
  return Math.abs(deg - 90) <= range || Math.abs(deg - 270) <= range;
};

export const segmentFromCenter = (center: Point, angle: number, length: number): [Point, Point] => {
  const half = length / 2;
  const vector = { x: Math.cos(angle) * half, y: Math.sin(angle) * half };
  return [sub(center, vector), add(center, vector)];
};

export const segmentWithinBoard = (a: Point, b: Point, eps = EPSILON) =>
  [a, b].every((p) => p.x >= BOARD_MIN - eps && p.x <= BOARD_MAX + eps && p.y >= BOARD_MIN - eps && p.y <= BOARD_MAX + eps);

export const triangleArea = (a: Point, b: Point, c: Point) => Math.abs(cross(sub(b, a), sub(c, a))) / 2;

export const triangleCentroid = (points: [Point, Point, Point]): Point => ({
  x: (points[0].x + points[1].x + points[2].x) / 3,
  y: (points[0].y + points[1].y + points[2].y) / 3,
});

export const pointOnSegment = (point: Point, a: Point, b: Point, eps = EPSILON) => {
  const ab = sub(b, a);
  const ap = sub(point, a);
  if (Math.abs(cross(ab, ap)) > eps) return false;
  const projection = dot(ap, ab);
  const lengthSq = dot(ab, ab);
  return projection >= -eps && projection <= lengthSq + eps;
};

export const distancePointToSegment = (point: Point, a: Point, b: Point) => {
  const ab = sub(b, a);
  const lengthSq = dot(ab, ab);
  if (lengthSq <= EPSILON) return distance(point, a);
  const t = clamp(dot(sub(point, a), ab) / lengthSq, 0, 1);
  return distance(point, add(a, scale(ab, t)));
};

export const pointInTriangle = (p: Point, a: Point, b: Point, c: Point, includeBoundary = true) => {
  const area = triangleArea(a, b, c);
  const sum = triangleArea(p, b, c) + triangleArea(a, p, c) + triangleArea(a, b, p);
  if (Math.abs(sum - area) > EPSILON) return false;
  if (includeBoundary) return true;
  return !pointOnSegment(p, a, b) && !pointOnSegment(p, b, c) && !pointOnSegment(p, c, a);
};

export const canonicalTriangleId = (points: [Point, Point, Point]) =>
  points.map(pointKey).sort().join('|');
