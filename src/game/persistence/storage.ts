import type { GameState } from '../../types/game';
import { STORAGE_KEY } from '../constants';

export const saveGame = (state: GameState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const loadGame = (): GameState | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const clearGame = () => {
  localStorage.removeItem(STORAGE_KEY);
};
