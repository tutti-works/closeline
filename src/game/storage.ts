import { STORAGE_KEY } from './constants';
import type { GameState } from '../types/game';

export const saveGame = (state: GameState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const loadGame = (): GameState | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.version !== 1 || !Array.isArray(parsed.players) || !Array.isArray(parsed.segments)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearSavedGame = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
