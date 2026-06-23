import type { BoundaryCoverage, GameState, IntersectionNode, PlayerId, Point, TerritoryTriangle } from '../../types/game';
import { canonicalTriangleId, pointInTriangle, triangleArea } from '../geometry/math';
import { edgeCoverage, trianglesTouchOrOverlap } from '../geometry/triangles';

const ownsNode = (node: IntersectionNode, playerId: PlayerId) => node.active && node.ownerships.some((ownership) => ownership.playerId === playerId);

export const detectPlayerTriangles = (state: GameState, playerId: PlayerId, turn: number) => {
  const nodes = state.nodes.filter((node) => ownsNode(node, playerId));
  const lines = state.lines.filter((line) => line.active);
  const found = new Map<string, TerritoryTriangle>();
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      for (let k = j + 1; k < nodes.length; k += 1) {
        const points = [nodes[i].point, nodes[j].point, nodes[k].point] as [Point, Point, Point];
        const area = triangleArea(points[0], points[1], points[2]);
        if (area < state.settings.minTriangleAreaRatio || area <= 1e-5) continue;
        const key = canonicalTriangleId(points);
        if (state.territories.some((territory) => territory.id === key) || found.has(key)) continue;
        const coverage: BoundaryCoverage[] = [];
        const edges = [
          [points[0], points[1]],
          [points[1], points[2]],
          [points[2], points[0]],
        ] as Array<[Point, Point]>;
        let covered = true;
        for (const [from, to] of edges) {
          const lineIds = edgeCoverage(from, to, lines);
          if (!lineIds) {
            covered = false;
            break;
          }
          coverage.push({ from, to, lineIds });
        }
        if (!covered) continue;
        if (state.territories.some((territory) => trianglesTouchOrOverlap(points, territory.points))) continue;
        found.set(key, {
          id: key,
          points,
          dotIds: [nodes[i].id, nodes[j].id, nodes[k].id],
          ownerId: playerId,
          area,
          areaRatio: area,
          capturedTurn: turn,
          coverage,
          comboId: `combo-${turn}-${playerId}`,
        });
      }
    }
  }
  return [...found.values()];
};

export const applyTerritoryCapture = (state: GameState, newTerritories: TerritoryTriangle[]) => {
  if (newTerritories.length === 0) return state;
  const territories = [...state.territories, ...newTerritories];
  const nodes = state.nodes.map((node) => {
    const captured = newTerritories.find((territory) => pointInTriangle(node.point, territory.points[0], territory.points[1], territory.points[2]));
    return captured ? { ...node, active: false, capturedBy: captured.id } : node;
  });
  return { ...state, nodes, territories };
};
