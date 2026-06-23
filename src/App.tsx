import { useEffect, useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { ResultModal } from './components/ResultModal';
import { ScoreBoard } from './components/ScoreBoard';
import { SetupPanel } from './components/SetupPanel';
import { Tutorial } from './components/Tutorial';
import { findCpuMove } from './game/cpu/candidate';
import { clearSavedGame } from './game/storage';
import { applyPlacement, passTurn, placeSegment } from './game/rules/placement';
import { defaultSettings } from './game/state';
import { usePersistentGame } from './hooks/usePersistentGame';
import type { GameSettings, Point } from './types/game';

export default function App() {
  const { state, setState, restart } = usePersistentGame();
  const [settings, setSettings] = useState<GameSettings>(state.settings ?? defaultSettings);
  const [showSetup, setShowSetup] = useState(state.segments.length === 0 && state.turn === 0);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('closeline.tutorialSeen'));

  const currentPlayer = state.players.find((player) => player.id === state.currentPlayerId);

  useEffect(() => {
    if (showTutorial) localStorage.setItem('closeline.tutorialSeen', '1');
  }, [showTutorial]);

  useEffect(() => {
    if (state.phase !== 'playing' || currentPlayer?.kind !== 'cpu') return;
    const timeout = window.setTimeout(() => {
      const move = findCpuMove(state);
      if (!move) {
        setState((current) => passTurn(current));
        return;
      }
      setState((current) => {
        const result = placeSegment(current, move.a, move.b);
        return result.ok ? applyPlacement(current, result) : passTurn(current);
      });
    }, 260);
    return () => window.clearTimeout(timeout);
  }, [currentPlayer?.kind, setState, state]);

  const start = () => {
    clearSavedGame();
    restart(settings);
    setShowSetup(false);
  };

  const handlePlace = (a: Point, b: Point): string | null => {
    const result = placeSegment(state, a, b);
    if (!result.ok) return result.reason;
    setState(applyPlacement(state, result));
    return null;
  };

  if (showSetup) {
    return (
      <div className="app setup-screen">
        <SetupPanel settings={settings} onChange={setSettings} onStart={start} />
        <Tutorial open={showTutorial} onClose={() => setShowTutorial(false)} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">CLOSELINE</p>
          <h1>線の陣取り</h1>
        </div>
        <button onClick={() => setShowSetup(true)}>設定</button>
      </header>
      <div className="play-layout">
        <GameBoard state={state} onPlace={handlePlace} />
        <ScoreBoard state={state} onRestart={start} onRules={() => setShowTutorial(true)} />
      </div>
      <Tutorial open={showTutorial} onClose={() => setShowTutorial(false)} />
      <ResultModal state={state} onAgain={start} onSetup={() => setShowSetup(true)} />
    </div>
  );
}
