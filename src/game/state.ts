import type { GameSettings, GameState, Player, PlayerId } from '../types/game';
import { DEFAULT_LINE_LENGTH, DEFAULT_MAX_TURNS, DEFAULT_MIN_AREA_RATIO } from './constants';
import { generateInitialLines } from './initialBoard/generate';

export const players: Player[] = [
  { id: 'human', name: 'Human', color: '#2563eb' },
  { id: 'cpu', name: 'CPU', color: '#dc2626' },
];

export const defaultSettings = (): GameSettings => ({
  difficulty: 'HARD',
  firstPlayer: 'cpu',
  maxTurns: DEFAULT_MAX_TURNS,
  lineLength: DEFAULT_LINE_LENGTH,
  minTriangleAreaRatio: DEFAULT_MIN_AREA_RATIO,
  sound: false,
  guides: true,
  seed: String(Date.now()),
});

export const createGame = (settings: GameSettings): GameState => ({
  players,
  settings,
  phase: 'playing',
  currentPlayerId: settings.firstPlayer,
  turn: 1,
  consecutivePasses: 0,
  lines: generateInitialLines(settings),
  nodes: [],
  territories: [],
});

export const otherPlayer = (playerId: PlayerId): PlayerId => (playerId === 'human' ? 'cpu' : 'human');

export const scoreFor = (state: GameState, playerId: PlayerId) => {
  const territories = state.territories.filter((territory) => territory.ownerId === playerId);
  const totalArea = territories.reduce((sum, territory) => sum + territory.area, 0);
  return {
    totalArea,
    areaRatio: totalArea,
    count: territories.length,
    maxArea: Math.max(0, ...territories.map((territory) => territory.area)),
  };
};

export const resolveWinner = (state: GameState) => {
  const human = scoreFor(state, 'human');
  const cpu = scoreFor(state, 'cpu');
  if (Math.abs(human.totalArea - cpu.totalArea) > 1e-5) return human.totalArea > cpu.totalArea ? 'human' : 'cpu';
  if (human.count !== cpu.count) return human.count > cpu.count ? 'human' : 'cpu';
  if (Math.abs(human.maxArea - cpu.maxArea) > 1e-5) return human.maxArea > cpu.maxArea ? 'human' : 'cpu';
  return 'draw';
};

export const finishGame = (state: GameState, reason: string): GameState => ({
  ...state,
  phase: 'ended',
  result: { winner: resolveWinner(state), reason },
});
