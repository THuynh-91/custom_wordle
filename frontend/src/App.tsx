import React, { useState, useEffect } from 'react';
import GameSetup from './components/GameSetup';
import GameBoard from './components/GameBoard';
import { GameMode, WordLength, SolverType } from '@shared/types';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './App.css';
import { apiFetch } from './lib/apiClient';

function App() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('human-play');
  const [wordLength, setWordLength] = useState<WordLength>(5);
  const [solverType, setSolverType] = useState<SolverType>('entropy');
  const [hardMode, setHardMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage or system preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Apply dark mode class to html element
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    // Save preference
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleGameStart = (id: string, mode: GameMode, length: WordLength, solver: SolverType, hard: boolean) => {
    setGameId(id);
    setGameMode(mode);
    setWordLength(length);
    setSolverType(solver);
    setHardMode(hard);
  };

  const handleNewGame = () => {
    setGameId(null);
  };

  const handleReplay = async (newWord?: string) => {
    // Create new game with current settings
    try {
      const response = await apiFetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: gameMode,
          length: wordLength,
          hardMode: hardMode,
          secret: gameMode === 'custom-challenge' && newWord ? newWord : undefined,
          solverType: solverType
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGameId(data.gameId);
      }
    } catch (error) {
      console.error('Error creating replay game:', error);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        {gameId && (
          <button className="home-button" onClick={handleNewGame} title="Return to home">
            Home
          </button>
        )}
        <h1>AI Wordle Duel</h1>
        <p className="tagline">Challenge AI solvers across multiple word lengths</p>
        <button className="theme-toggle" onClick={toggleDarkMode} aria-label="Toggle dark mode">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            {isDarkMode ? (
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
            ) : (
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
            )}
          </svg>
        </button>
      </header>

      <main className="app-main container">
        {!gameId ? (
          <GameSetup onGameStart={handleGameStart} />
        ) : (
          <GameBoard
            key={gameId}
            gameId={gameId}
            gameMode={gameMode}
            wordLength={wordLength}
            solverType={solverType}
            hardMode={hardMode}
            onNewGame={handleNewGame}
            onReplay={handleReplay}
          />
        )}
      </main>

      <footer className="app-footer">
      </footer>
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default App;
