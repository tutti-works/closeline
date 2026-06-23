import type { Player } from '../types/game';

export const BOARD_SIZE = 1000;
export const EPS = 0.001;
export const SNAP_DISTANCE = 18;
export const STORAGE_KEY = 'closeline.savedGame.v1';

export const PLAYER_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea'] as const;

export const DEFAULT_PLAYERS: Player[] = [
  { id: 'p1', name: 'Blue', kind: 'human', color: PLAYER_COLORS[0] },
  { id: 'p2', name: 'Red CPU', kind: 'cpu', color: PLAYER_COLORS[1] },
  { id: 'p3', name: 'Green CPU', kind: 'cpu', color: PLAYER_COLORS[2] },
  { id: 'p4', name: 'Violet CPU', kind: 'cpu', color: PLAYER_COLORS[3] },
];
