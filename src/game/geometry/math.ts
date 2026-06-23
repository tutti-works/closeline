import { EPS } from '../constants';
import type { Point } from '../../types/game';

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export const almostEqual = (a: number, b: number, eps = EPS): boolean => Math.abs(a - b) <= eps;

export const samePoint = (a: Point, b: Point, eps = EPS): boolean => distance(a, b) <= eps;

export const pointKey = (p: Point): string => `${Math.round(p.x * 1000) / 1000},${Math.round(p.y * 1000) / 1000}`;

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const polygonAreaSigned = (points: Point[]): number => {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
};

export const polygonArea = (points: Point[]): number => Math.abs(polygonAreaSigned(points));

export const polygonCentroid = (points: Point[]): Point => {
  const signedArea = polygonAreaSigned(points);
  if (Math.abs(signedArea) < EPS) {
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
  }

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  return { x: cx / (6 * signedArea), y: cy / (6 * signedArea) };
};

export const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y + Number.EPSILON) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
};

export const normalizeSegment = (a: Point, b: Point): [Point, Point] => {
  if (a.x < b.x || (almostEqual(a.x, b.x) && a.y <= b.y)) return [a, b];
  return [b, a];
};

export const segmentKey = (a: Point, b: Point): string => {
  const [start, end] = normalizeSegment(a, b);
  return `${pointKey(start)}|${pointKey(end)}`;
};
