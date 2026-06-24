export type PlayerId = 'human' | 'cpu';
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';
export type GamePhase = 'setup' | 'playing' | 'ended';

export type Point = {
  x: number;
  y: number;
};

export type Player = {
  id: PlayerId;
  name: string;
  color: string;
};

export type DotOwnership = {
  playerId: PlayerId;
  turn: number;
  lineIds: string[];
};

export type IntersectionNode = {
  id: string;
  point: Point;
  ownerships: DotOwnership[];
  generatedTurn: number;
  lineIds: string[];
  active: boolean;
  capturedBy?: string;
};

export type LineSegment = {
  id: string;
  a: Point;
  b: Point;
  ownerId: PlayerId | null;
  neutral: boolean;
  generatedTurn: number;
  active: boolean;
  capturedBy?: string;
};

export type NeutralLine = LineSegment & {
  neutral: true;
  ownerId: null;
};

export type BoundaryCoverage = {
  from: Point;
  to: Point;
  lineIds: string[];
};

export type TerritoryTriangle = {
  id: string;
  points: [Point, Point, Point];
  dotIds: [string, string, string];
  ownerId: PlayerId;
  area: number;
  areaRatio: number;
  capturedTurn: number;
  coverage: BoundaryCoverage[];
  comboId: string;
};

export type GameSettings = {
  difficulty: Difficulty;
  firstPlayer: PlayerId;
  maxTurns: number;
  lineLength: number;
  minTriangleAreaRatio: number;
  sound: boolean;
  guides: boolean;
  seed: string;
};

export type Move = {
  center: Point;
  angle: number;
};

export type MoveEvaluation = {
  valid: boolean;
  reason?: string;
  intersections: Point[];
  previewNodes: IntersectionNode[];
  previewTriangles: TerritoryTriangle[];
  gainedArea: number;
};

export type CpuCandidate = {
  move: Move;
  evaluation: MoveEvaluation;
  score: number;
};

export type GameResult = {
  winner: PlayerId | 'draw';
  reason: string;
};

export type GameState = {
  players: Player[];
  settings: GameSettings;
  phase: GamePhase;
  currentPlayerId: PlayerId;
  turn: number;
  consecutivePasses: number;
  lines: LineSegment[];
  nodes: IntersectionNode[];
  territories: TerritoryTriangle[];
  lastPass?: PlayerId;
  lastMessage?: string;
  result?: GameResult;
};
