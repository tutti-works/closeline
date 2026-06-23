import { useEffect, useState } from 'react';
import type { GameSettings, GameState } from '../types/game';
import { createGame, defaultSettings } from '../game/state';
import { loadGame, saveGame } from '../game/persistence/storage';

const loadValidGame = () => {
  const saved = loadGame();
  if (!saved || !Array.isArray(saved.lines) || saved.lines.filter((line) => line.neutral).length !== 3) return null;
  return {
    ...saved,
    lines: saved.lines.map((line) => ({ ...line, active: true })),
  };
};

export const useGame = () => {
  const saved = loadValidGame();
  const [settings, setSettings] = useState<GameSettings>(() => saved?.settings ?? defaultSettings());
  const [state, setState] = useState<GameState>(() => saved ?? createGame(settings));

  useEffect(() => {
    saveGame(state);
  }, [state]);

  const startNew = (nextSettings = settings, newSeed = false) => {
    const seed = newSeed ? String(Date.now()) : nextSettings.seed;
    const merged = { ...nextSettings, seed };
    setSettings(merged);
    setState(createGame(merged));
  };

  return { state, setState, settings, setSettings, startNew };
};
