import { EPS } from '../constants';
import type { GameState, PlacementResult, Point, Region, Segment } from '../../types/game';
import { pointKey, polygonArea, polygonCentroid } from '../geometry/math';
import { polygonize, polygonSignature } from '../geometry/polygonize';
import {
  isWithinBoard,
  segmentTouchesCapturedInterior,
  segmentsCrossImproperly,
  segmentsOverlap,
  snapPoint,
} from '../geometry/segments';

const nextId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const getExistingRegionSignatures = (regions: Region[]): Set<string> => new Set(regions.map((region) => polygonSignature(region.points)));

export const validateSegment = (state: GameState, a: Point, b: Point): string | null => {
  if (!isWithinBoard(a, b, state.boardSize)) return '盤面の外へはみ出しています';
  if (Math.hypot(a.x - b.x, a.y - b.y) < EPS) return '線が短すぎます';
  if (segmentTouchesCapturedInterior(a, b, state.regions)) return '獲得済み領域の内側には置けません';

  for (const segment of state.segments) {
    if (segmentsCrossImproperly(a, b, segment.a, segment.b)) return '既存の線と交差しています';
    if (segmentsOverlap(a, b, segment.a, segment.b)) return '既存の線と重なっています';
  }
  return null;
};

export const normalizePlacement = (state: GameState, rawA: Point, rawB: Point): [Point, Point] => {
  const a = snapPoint(rawA, state.segments, state.boardSize).point;
  const b = snapPoint(rawB, state.segments, state.boardSize).point;
  return [a, b];
};

const findNewRegions = (state: GameState, nextSegments: Segment[], segmentId: string, ownerId: string): Region[] => {
  const existing = getExistingRegionSignatures(state.regions);
  const polygons = polygonize(nextSegments, state.boardSize);
  const newRegions: Region[] = [];
  const seen = new Set(existing);

  for (const points of polygons) {
    const signature = polygonSignature(points);
    if (seen.has(signature)) continue;
    seen.add(signature);
    const area = polygonArea(points);
    if (area <= EPS) continue;
    const centroid = polygonCentroid(points);
    const duplicate = state.regions.some((region) => pointKey(polygonCentroid(region.points)) === pointKey(centroid));
    if (duplicate) continue;
    newRegions.push({
      id: nextId('region'),
      ownerId,
      points,
      area,
      createdBySegmentId: segmentId,
    });
  }
  return newRegions;
};

export const getNextActivePlayerId = (state: GameState, fromIndex: number): string | null => {
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const player = state.players[(fromIndex + offset) % state.players.length];
    return player.id;
  }
  return null;
};

export const placeSegment = (state: GameState, rawA: Point, rawB: Point): PlacementResult => {
  if (state.phase !== 'playing') return { ok: false, reason: 'ゲーム中ではありません' };
  const [a, b] = normalizePlacement(state, rawA, rawB);
  const validation = validateSegment(state, a, b);
  if (validation) return { ok: false, reason: validation };

  const segment: Segment = {
    id: nextId('seg'),
    ownerId: state.currentPlayerId,
    a,
    b,
  };
  const nextSegments = [...state.segments, segment];
  const newRegions = findNewRegions(state, nextSegments, segment.id, state.currentPlayerId);
  const currentIndex = state.players.findIndex((player) => player.id === state.currentPlayerId);
  return {
    ok: true,
    segment,
    newRegions,
    nextPlayerId: getNextActivePlayerId(state, currentIndex),
  };
};

export const applyPlacement = (state: GameState, result: Extract<PlacementResult, { ok: true }>): GameState => {
  const nextTurn = state.turn + 1;
  const ended = nextTurn >= state.settings.maxTurns;
  return {
    ...state,
    phase: ended ? 'ended' : state.phase,
    endedReason: ended ? '最大ターンに到達しました' : undefined,
    currentPlayerId: result.nextPlayerId ?? state.currentPlayerId,
    turn: nextTurn,
    consecutivePasses: 0,
    segments: [...state.segments, result.segment],
    regions: [...state.regions, ...result.newRegions],
  };
};

export const passTurn = (state: GameState): GameState => {
  const currentIndex = state.players.findIndex((player) => player.id === state.currentPlayerId);
  const nextPasses = state.consecutivePasses + 1;
  const ended = nextPasses >= state.players.length;
  return {
    ...state,
    phase: ended ? 'ended' : state.phase,
    endedReason: ended ? '全員が連続でパスしました' : undefined,
    currentPlayerId: getNextActivePlayerId(state, currentIndex) ?? state.currentPlayerId,
    consecutivePasses: nextPasses,
  };
};
