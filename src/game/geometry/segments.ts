import { BOARD_SIZE, EPS, SNAP_DISTANCE } from '../constants';
import type { Point, Region, Segment } from '../../types/game';
import { clamp, distance, pointInPolygon, samePoint } from './math';

export type SnapKind = 'point' | 'segment' | 'boundary' | 'free';

export type SnapResult = {
  point: Point;
  kind: SnapKind;
  distance: number;
};

const cross = (a: Point, b: Point, c: Point): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const dot = (a: Point, b: Point, c: Point): number => (b.x - a.x) * (c.x - a.x) + (b.y - a.y) * (c.y - a.y);

export const projectPointToSegment = (p: Point, a: Point, b: Point): Point => {
  const lenSq = distance(a, b) ** 2;
  if (lenSq < EPS) return a;
  const t = clamp(dot(a, b, p) / lenSq, 0, 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
};

export const pointOnSegment = (p: Point, a: Point, b: Point, eps = EPS): boolean =>
  Math.abs(cross(a, b, p)) <= eps && p.x >= Math.min(a.x, b.x) - eps && p.x <= Math.max(a.x, b.x) + eps && p.y >= Math.min(a.y, b.y) - eps && p.y <= Math.max(a.y, b.y) + eps;

export const segmentIntersectionPoint = (a: Point, b: Point, c: Point, d: Point): Point | null => {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const denom = r.x * s.y - r.y * s.x;
  if (Math.abs(denom) < EPS) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denom;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denom;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return { x: a.x + t * r.x, y: a.y + t * r.y };
};

export const segmentsCrossImproperly = (a: Point, b: Point, c: Point, d: Point): boolean => {
  const p = segmentIntersectionPoint(a, b, c, d);
  if (!p) return false;
  const touchesEndpoint = [a, b].some((end) => samePoint(end, p, 0.01)) || [c, d].some((end) => samePoint(end, p, 0.01));
  return !touchesEndpoint;
};

export const segmentsOverlap = (a: Point, b: Point, c: Point, d: Point): boolean => {
  if (Math.abs(cross(a, b, c)) > EPS || Math.abs(cross(a, b, d)) > EPS) return false;
  const on = [c, d].some((p) => pointOnSegment(p, a, b, EPS)) || [a, b].some((p) => pointOnSegment(p, c, d, EPS));
  if (!on) return false;
  const sharedEndpoints = [a, b].filter((p) => samePoint(p, c, 0.01) || samePoint(p, d, 0.01)).length;
  return sharedEndpoints < 2;
};

export const snapPoint = (point: Point, segments: Segment[], boardSize = BOARD_SIZE): SnapResult => {
  let best: SnapResult = { point, kind: 'free', distance: Number.POSITIVE_INFINITY };
  const consider = (candidate: Point, kind: SnapKind) => {
    const d = distance(point, candidate);
    if (d < best.distance) best = { point: candidate, kind, distance: d };
  };

  for (const segment of segments) {
    consider(segment.a, 'point');
    consider(segment.b, 'point');
    const projected = projectPointToSegment(point, segment.a, segment.b);
    if (!samePoint(projected, segment.a) && !samePoint(projected, segment.b)) consider(projected, 'segment');
  }

  consider({ x: clamp(point.x, 0, boardSize), y: 0 }, 'boundary');
  consider({ x: clamp(point.x, 0, boardSize), y: boardSize }, 'boundary');
  consider({ x: 0, y: clamp(point.y, 0, boardSize) }, 'boundary');
  consider({ x: boardSize, y: clamp(point.y, 0, boardSize) }, 'boundary');

  return best.distance <= SNAP_DISTANCE ? best : { point, kind: 'free', distance: best.distance };
};

export const isWithinBoard = (a: Point, b: Point, boardSize = BOARD_SIZE): boolean =>
  [a, b].every((p) => p.x >= -EPS && p.x <= boardSize + EPS && p.y >= -EPS && p.y <= boardSize + EPS);

export const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export const segmentTouchesCapturedInterior = (a: Point, b: Point, regions: Region[]): boolean => {
  const probes = [midpoint(a, b), { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 }];
  return regions.some((region) => probes.some((probe) => pointInPolygon(probe, region.points)));
};

export const makeFixedSegment = (start: Point, pointer: Point, length: number): [Point, Point] => {
  const angle = Math.atan2(pointer.y - start.y, pointer.x - start.x);
  return [start, { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length }];
};
