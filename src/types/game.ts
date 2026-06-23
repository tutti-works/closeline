export type PlayerKind = 'human' | 'cpu';
export type CpuDifficulty = 'easy' | 'normal' | 'hard';
export type WinMode = 'largest-region' | 'total-area';

export type Point = {
  x: number;
  y: number;
};

export type Segment = {
  id: string;
  ownerId: string;
  a: Point;
  b: Point;
};

export type Region = {
  id: string;
  ownerId: string;
  points: Point[];
  area: number;
  createdBySegmentId: string;
};

export type Player = {
  id: string;
  name: string;
  kind: PlayerKind;
  color: string;
};

export type GameSettings = {
  playerCount: 2 | 3 | 4;
  cpuDifficulty: CpuDifficulty;
  maxTurns: number;
  lineLength: number;
  effects: boolean;
  guides: boolean;
};

export type GamePhase = 'setup' | 'playing' | 'ended';

export type PlacementResult =
  | {
      ok: true;
      segment: Segment;
      newRegions: Region[];
      nextPlayerId: string | null;
    }
  | {
      ok: false;
      reason: string;
    };

export type GameState = {
  version: 1;
  phase: GamePhase;
  boardSize: number;
  settings: GameSettings;
  winMode: WinMode;
  players: Player[];
  currentPlayerId: string;
  turn: number;
  consecutivePasses: number;
  segments: Segment[];
  regions: Region[];
  endedReason?: string;
};

export type Score = {
  playerId: string;
  totalArea: number;
  largestArea: number;
  regionCount: number;
  coveragePercent: number;
};

export type Winner = {
  playerIds: string[];
  scores: Score[];
};
