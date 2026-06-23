import { BOARD_SIZE, EPS } from '../constants';
import type { Point, Segment } from '../../types/game';
import { pointKey, polygonArea, polygonAreaSigned, samePoint, segmentKey } from './math';
import { pointOnSegment } from './segments';

type EdgeRef = {
  from: string;
  to: string;
};

const boardSegments = (boardSize: number): Segment[] => [
  { id: 'board-top', ownerId: 'board', a: { x: 0, y: 0 }, b: { x: boardSize, y: 0 } },
  { id: 'board-right', ownerId: 'board', a: { x: boardSize, y: 0 }, b: { x: boardSize, y: boardSize } },
  { id: 'board-bottom', ownerId: 'board', a: { x: boardSize, y: boardSize }, b: { x: 0, y: boardSize } },
  { id: 'board-left', ownerId: 'board', a: { x: 0, y: boardSize }, b: { x: 0, y: 0 } },
];

const addUniquePoint = (points: Point[], point: Point) => {
  if (!points.some((existing) => samePoint(existing, point, 0.01))) points.push(point);
};

export const polygonSignature = (points: Point[]): string => {
  const keys = points.map(pointKey);
  let best = keys.join('|');
  for (let i = 1; i < keys.length; i += 1) {
    const rotated = [...keys.slice(i), ...keys.slice(0, i)].join('|');
    if (rotated < best) best = rotated;
  }
  const reversed = [...keys].reverse();
  for (let i = 0; i < reversed.length; i += 1) {
    const rotated = [...reversed.slice(i), ...reversed.slice(0, i)].join('|');
    if (rotated < best) best = rotated;
  }
  return best;
};

export const polygonize = (segments: Segment[], boardSize = BOARD_SIZE): Point[][] => {
  const allSegments = [...segments, ...boardSegments(boardSize)];
  const pointsBySegment = new Map<string, Point[]>();

  for (const segment of allSegments) {
    pointsBySegment.set(segment.id, [segment.a, segment.b]);
  }

  for (const segment of allSegments) {
    for (const other of allSegments) {
      for (const p of [other.a, other.b]) {
        if (pointOnSegment(p, segment.a, segment.b, 0.01)) addUniquePoint(pointsBySegment.get(segment.id)!, p);
      }
    }
  }

  const points = new Map<string, Point>();
  const adjacency = new Map<string, string[]>();
  const undirected = new Set<string>();

  const putPoint = (point: Point): string => {
    const key = pointKey(point);
    points.set(key, point);
    if (!adjacency.has(key)) adjacency.set(key, []);
    return key;
  };

  const addEdge = (a: Point, b: Point) => {
    if (samePoint(a, b)) return;
    const ak = putPoint(a);
    const bk = putPoint(b);
    const key = segmentKey(a, b);
    if (undirected.has(key)) return;
    undirected.add(key);
    adjacency.get(ak)!.push(bk);
    adjacency.get(bk)!.push(ak);
  };

  for (const segment of allSegments) {
    const split = pointsBySegment.get(segment.id)!;
    split.sort((p, q) => (Math.abs(segment.a.x - segment.b.x) >= Math.abs(segment.a.y - segment.b.y) ? p.x - q.x : p.y - q.y));
    for (let i = 0; i < split.length - 1; i += 1) addEdge(split[i], split[i + 1]);
  }

  for (const [key, neighbors] of adjacency) {
    const center = points.get(key)!;
    neighbors.sort((left, right) => {
      const lp = points.get(left)!;
      const rp = points.get(right)!;
      return Math.atan2(lp.y - center.y, lp.x - center.x) - Math.atan2(rp.y - center.y, rp.x - center.x);
    });
  }

  const visited = new Set<string>();
  const faces: Point[][] = [];
  const directedEdges: EdgeRef[] = [];
  for (const [from, neighbors] of adjacency) for (const to of neighbors) directedEdges.push({ from, to });

  for (const start of directedEdges) {
    const startKey = `${start.from}->${start.to}`;
    if (visited.has(startKey)) continue;
    const faceKeys: string[] = [];
    let from = start.from;
    let to = start.to;

    for (let guard = 0; guard < 1000; guard += 1) {
      visited.add(`${from}->${to}`);
      faceKeys.push(from);
      const neighbors = adjacency.get(to)!;
      const incomingIndex = neighbors.indexOf(from);
      const nextIndex = (incomingIndex - 1 + neighbors.length) % neighbors.length;
      const next = neighbors[nextIndex];
      from = to;
      to = next;
      if (from === start.from && to === start.to) break;
    }

    if (faceKeys.length >= 3) {
      const face = faceKeys.map((key) => points.get(key)!);
      const area = polygonArea(face);
      if (area > EPS && area < boardSize * boardSize - EPS && polygonAreaSigned(face) > EPS) faces.push(face);
    }
  }

  const unique = new Map<string, Point[]>();
  for (const face of faces) unique.set(polygonSignature(face), face);
  return [...unique.values()];
};
