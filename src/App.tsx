import { useEffect, useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { ResultModal } from './components/ResultModal';
import { ScorePanel } from './components/ScorePanel';
import { SetupPanel } from './components/SetupPanel';
import { Tutorial } from './components/Tutorial';
import { THEME_KEY, TUTORIAL_KEY } from './game/constants';
import { findCpuMove } from './game/cpu/candidate';
import { passTurn, placeMove } from './game/rules/placement';
import { useGame } from './hooks/useGame';

export default function App() {
  const { state, setState, settings, setSettings, startNew } = useGame();
  const [showSetup, setShowSetup] = useState(state.lines.length === 0);
  const [showTutorial, setShowTutorial] = useState(() => localStorage.getItem(TUTORIAL_KEY) !== '1');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (!showTutorial) localStorage.setItem(TUTORIAL_KEY, '1');
  }, [showTutorial]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (state.phase !== 'playing' || state.currentPlayerId !== 'cpu') return;
    let cancelled = false;
    setThinking(true);
    findCpuMove(state).then((candidate) => {
      if (cancelled) return;
      setState((current) => (candidate ? placeMove(current, 'cpu', candidate.move) : passTurn(current, 'cpu')));
      setThinking(false);
    });
    return () => {
      cancelled = true;
      setThinking(false);
    };
  }, [setState, state]);

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');
  const themeButton = (
    <button className="icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'} title={theme === 'dark' ? 'ライトモード' : 'ダークモード'}>
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );

  if (showSetup) {
    return (
      <main className="app setup-screen">
        <div className="floating-actions">{themeButton}</div>
        <SetupPanel settings={settings} onChange={setSettings} onStart={(newSeed) => { startNew(settings, newSeed); setShowSetup(false); }} />
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">CLOSELINE</p>
          <h1>線で囲む三角陣取り</h1>
        </div>
        <div className="topbar-actions">
          {themeButton}
          <button onClick={() => setShowTutorial(true)}>ルール</button>
        </div>
      </header>
      <div className="layout">
        <GameBoard state={state} setState={setState} />
        <ScorePanel state={state} thinking={thinking} onSetup={() => setShowSetup(true)} onRestart={(newSeed) => startNew(settings, newSeed)} />
      </div>
      <Tutorial open={showTutorial} onClose={() => setShowTutorial(false)} />
      <ResultModal state={state} onSame={() => startNew(settings, false)} onNew={() => startNew(settings, true)} onSetup={() => setShowSetup(true)} />
    </main>
  );
}
