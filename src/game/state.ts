import { BOARD_SIZE, DEFAULT_PLAYERS } from './constants';
import type { CpuDifficulty, GameSettings, GameState, Player, WinMode } from '../types/game';

export const defaultSettings: GameSettings = {
  playerCount: 2,
  cpuDifficulty: 'normal',
  maxTurns: 80,
  lineLength: 180,
  effects: true,
  guides: true,
};

export const winModeForPlayerCount = (playerCount: 2 | 3 | 4): WinMode =>
  playerCount === 2 ? 'largest-region' : 'total-area';

export const createPlayers = (playerCount: 2 | 3 | 4): Player[] =>
  DEFAULT_PLAYERS.slice(0, playerCount).map((player, index) => ({
    ...player,
    kind: index === 0 ? 'human' : 'cpu',
    name: index === 0 ? 'Player' : `CPU ${index}`,
  }));

export const createInitialState = (settings: GameSettings = defaultSettings): GameState => {
  const players = createPlayers(settings.playerCount);
  return {
    version: 1,
    phase: 'playing',
    boardSize: BOARD_SIZE,
    settings,
    winMode: winModeForPlayerCount(settings.playerCount),
    players,
    currentPlayerId: players[0].id,
    turn: 0,
    consecutivePasses: 0,
    segments: [],
    regions: [],
  };
};

export const updateSettings = (
  current: GameSettings,
  patch: Partial<GameSettings> & { cpuDifficulty?: CpuDifficulty },
): GameSettings => ({
  ...current,
  ...patch,
});
