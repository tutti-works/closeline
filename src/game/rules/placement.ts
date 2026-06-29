import type { GameState, IntersectionNode, LineSegment, Move, MoveEvaluation, PlayerId, Point } from '../../types/game';
import { EPSILON } from '../constants';
import { finishGame, otherPlayer } from '../state';
import { isVerticalForbidden, pointInTriangle, pointKey, pointOnSegment, segmentFromCenter, segmentWithinBoard } from '../geometry/math';
import { collinearOverlap, properIntersectionPoint, segmentIntersection } from '../geometry/segments';
import { segmentTouchesTriangle } from '../geometry/triangles';
import { applyTerritoryCapture, detectPlayerTriangles } from '../triangles/detect';

const lineFromMove = (move: Move, length: number): [Point, Point] => segmentFromCenter(move.center, move.angle, length);

const findNodeAt = (nodes: IntersectionNode[], point: Point) => nodes.find((node) => node.active && pointKey(node.point) === pointKey(point));

const uniquePoints = (points: Point[]) => {
  const map = new Map<string, Point>();
  for (const point of points) map.set(pointKey(point), point);
  return [...map.values()];
};

const pointInExistingTerritory = (state: GameState, point: Point) =>
  state.territories.some((territory) => pointInTriangle(point, territory.points[0], territory.points[1], territory.points[2]));

export const evaluateMove = (state: GameState, playerId: PlayerId, move: Move): MoveEvaluation => {
  const [a, b] = lineFromMove(move, state.settings.lineLength);
  if (!segmentWithinBoard(a, b)) return invalid('線が盤面外へ出ています');
  if (isVerticalForbidden(move.angle)) return invalid('縦方向に近い線は禁止です');
  const activeLines = state.lines.filter((line) => line.active);
  if (activeLines.some((line) => collinearOverlap(a, b, line.a, line.b))) return invalid('既存線と重なっています');
  if (state.territories.some((territory) => segmentTouchesTriangle(a, b, territory))) return invalid('獲得済み陣地には触れられません');

  const intersections: Point[] = [];
  for (const line of activeLines) {
    const hit = segmentIntersection(a, b, line.a, line.b);
    if (hit.intersects && !hit.overlaps && hit.point && !pointInExistingTerritory(state, hit.point)) intersections.push(hit.point);
  }
  for (const node of state.nodes.filter((node) => node.active)) {
    if (pointOnSegment(node.point, a, b) && !pointInExistingTerritory(state, node.point)) intersections.push(node.point);
  }
  const properCount = activeLines.filter((line) => {
    const point = properIntersectionPoint(a, b, line.a, line.b);
    return point && !pointInExistingTerritory(state, point);
  }).length;
  if (properCount < 1) return invalid('既存線と1回以上交差させてください');

  const previewNodes = makePreviewNodes(state, playerId, uniquePoints(intersections), a, b);
  const previewState = {
    ...state,
    lines: [...state.lines, makeLine(state, playerId, a, b)],
    nodes: previewNodes,
  };
  const beforeIds = new Set(detectPlayerTriangles(state, playerId, state.turn).map((triangle) => triangle.id));
  const previewTriangles = detectPlayerTriangles(previewState, playerId, state.turn).filter((triangle) => !beforeIds.has(triangle.id));
  return {
    valid: true,
    intersections: uniquePoints(intersections),
    previewNodes,
    previewTriangles,
    gainedArea: previewTriangles.reduce((sum, triangle) => sum + triangle.area, 0),
  };
};

const invalid = (reason: string): MoveEvaluation => ({
  valid: false,
  reason,
  intersections: [],
  previewNodes: [],
  previewTriangles: [],
  gainedArea: 0,
});

const makeLine = (state: GameState, playerId: PlayerId, a: Point, b: Point): LineSegment => ({
  id: `line-${state.turn}-${playerId}-${state.lines.length + 1}`,
  a,
  b,
  ownerId: playerId,
  neutral: false,
  generatedTurn: state.turn,
  active: true,
});

const makePreviewNodes = (state: GameState, playerId: PlayerId, points: Point[], a: Point, b: Point) => {
  const nodes = state.nodes.map((node) => ({ ...node, ownerships: [...node.ownerships] }));
  const newLineId = `line-${state.turn}-${playerId}-${state.lines.length + 1}`;
  for (const point of points) {
    const lineIds = state.lines.filter((line) => line.active && pointOnSegment(point, line.a, line.b)).map((line) => line.id);
    if (pointOnSegment(point, a, b)) lineIds.push(newLineId);
    const existing = findNodeAt(nodes, point);
    if (existing) {
      existing.lineIds = [...new Set([...existing.lineIds, ...lineIds])];
    } else {
      nodes.push({
        id: `dot-${pointKey(point)}`,
        point,
        ownerships: [{ playerId, turn: state.turn, lineIds }],
        generatedTurn: state.turn,
        lineIds,
        active: true,
      });
    }
  }
  return nodes;
};

export const placeMove = (state: GameState, playerId: PlayerId, move: Move): GameState => {
  const evaluation = evaluateMove(state, playerId, move);
  if (!evaluation.valid) return state;
  const [a, b] = lineFromMove(move, state.settings.lineLength);
  const line = makeLine(state, playerId, a, b);
  let next: GameState = {
    ...state,
    lines: [...state.lines, line],
    nodes: evaluation.previewNodes,
    consecutivePasses: 0,
    lastPass: undefined,
    lastMessage: undefined,
  };
  next = applyTerritoryCapture(next, evaluation.previewTriangles);
  const advanced = advanceTurn(next);
  if (advanced.turn > advanced.settings.maxTurns) return finishGame(advanced, '最大ターンに到達しました');
  return advanced;
};

export const passTurn = (state: GameState, playerId: PlayerId, reason = '合法手が見つかりませんでした'): GameState => {
  const next = {
    ...state,
    consecutivePasses: state.consecutivePasses + 1,
    lastPass: playerId,
    lastMessage: `${playerId === 'human' ? 'Human' : 'CPU'} がパス: ${reason}`,
  };
  if (next.consecutivePasses >= 2) return finishGame(next, '双方が連続してパスしました');
  return advanceTurn(next);
};

const advanceTurn = (state: GameState): GameState => ({
  ...state,
  currentPlayerId: otherPlayer(state.currentPlayerId),
  turn: state.currentPlayerId === otherPlayer(state.settings.firstPlayer) ? state.turn + 1 : state.turn,
});

export const makeMoveFromDrag = (center: Point, pointer: Point): Move => ({
  center,
  angle: Math.atan2(pointer.y - center.y, pointer.x - center.x),
});

export const makeMoveFromStart = (start: Point, pointer: Point, length: number): Move => {
  const angle = Math.atan2(pointer.y - start.y, pointer.x - start.x);
  return {
    center: {
      x: start.x + (Math.cos(angle) * length) / 2,
      y: start.y + (Math.sin(angle) * length) / 2,
    },
    angle,
  };
};

export const hasLikelyLegalMove = (state: GameState, playerId: PlayerId) => {
  const activeLines = state.lines.filter((line) => line.active);
  for (const line of activeLines) {
    for (let i = 0; i < 16; i += 1) {
      const t = (i + 1) / 17;
      const center = { x: line.a.x + (line.b.x - line.a.x) * t, y: line.a.y + (line.b.y - line.a.y) * t };
      for (let j = 0; j < 12; j += 1) {
        const angle = (j / 12) * Math.PI * 2 + EPSILON;
        if (evaluateMove(state, playerId, { center, angle }).valid) return true;
      }
    }
  }
  return false;
};
