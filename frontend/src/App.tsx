import React, { useState, useEffect } from 'react';
import GameSetup from './components/GameSetup';
import GameBoard from './components/GameBoard';
import { GameMode, WordLength, SolverType } from '@shared/types';
import './App.css';

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

  const handleReplay = async () => {
    // Create new game with current settings
    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: gameMode,
          length: wordLength,
          hardMode: hardMode,
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
            🏠 Home
          </button>
        )}
        <h1>AI Wordle Duel</h1>
        <p className="tagline">Challenge AI solvers across multiple word lengths</p>
        <button className="theme-toggle" onClick={toggleDarkMode} aria-label="Toggle dark mode">
          {isDarkMode ? '☀️' : '🌙'}
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
        <p>&copy; 2024 AI Wordle Duel | Built with React + TypeScript</p>
      </footer>
    </div>
  );
}

export default App;
