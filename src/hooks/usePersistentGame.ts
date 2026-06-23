import { useEffect, useState } from 'react';
import { createInitialState, defaultSettings } from '../game/state';
import { loadGame, saveGame } from '../game/storage';
import type { GameSettings, GameState } from '../types/game';

export const usePersistentGame = () => {
  const [state, setState] = useState<GameState>(() => loadGame() ?? createInitialState(defaultSettings));

  useEffect(() => {
    saveGame(state);
  }, [state]);

  const restart = (settings: GameSettings) => setState(createInitialState(settings));

  return { state, setState, restart };
};
