import React, { useState } from 'react';
import { GameMode, WordLength, SolverType } from '@shared/types';
import './GameSetup.css';
import { apiFetch } from '../lib/apiClient';

interface GameSetupProps {
  onGameStart: (gameId: string, mode: GameMode, length: WordLength, solver: SolverType, hardMode: boolean) => void;
  onShowInstructions?: () => void;
  onShowMultiplayer?: () => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onGameStart, onShowInstructions, onShowMultiplayer }) => {
  const [mode, setMode] = useState<GameMode>('todays-wordle');
  const [length, setLength] = useState<WordLength>(5);
  const solver: SolverType = 'entropy'; // Always use entropy solver (best performance)
  const [customWord, setCustomWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          length,
          hardMode: false,
          secret: mode === 'custom-challenge' ? customWord : undefined,
          solverType: solver
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create game');
      }

      const data = await response.json();
      onGameStart(data.gameId, mode, length, solver, false);
    } catch (err: any) {
      setError(err.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="game-setup">
      <div className="setup-header">
        <div className="header-spacer"></div>
        <h2>Setup Your Game</h2>
        {onShowInstructions && (
          <button className="help-button" onClick={onShowInstructions} title="Show instructions">
            <span className="help-icon">?</span>
          </button>
        )}
      </div>

      <div className="setup-section">
        <label>Game Mode</label>
        <div className="mode-buttons">
          <button
            className={mode === 'todays-wordle' ? 'active' : ''}
            onClick={() => {
              setMode('todays-wordle');
              setLength(5); // Today's Wordle is always 5 letters
            }}
          >
            Today's Wordle
          </button>
          <button
            className={mode === 'custom-challenge' ? 'active' : ''}
            onClick={() => setMode('custom-challenge')}
          >
            Challenge AI
          </button>
          <button
            className={mode === 'race' ? 'active' : ''}
            onClick={() => setMode('race')}
          >
            Race Mode
          </button>
          <button
            className={mode === 'human-play' ? 'active' : ''}
            onClick={() => setMode('human-play')}
          >
            Human Play
          </button>
        </div>
      </div>

      {onShowMultiplayer && (
        <div className="setup-section">
          <label>Multiplayer</label>
          <div className="mode-buttons">
            <button
              className="multiplayer-mode-button"
              onClick={onShowMultiplayer}
            >
              Challenge Human
            </button>
          </div>
        </div>
      )}

      {mode !== 'todays-wordle' && (
        <div className="setup-section">
          <label>Word Length</label>
          <div className="length-buttons">
            {[3, 4, 5, 6, 7].map((len) => (
              <button
                key={len}
                className={length === len ? 'active' : ''}
                onClick={() => setLength(len as WordLength)}
              >
                {len}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="setup-section ai-info-box">
        <h3>AI Opponent</h3>
        <div className="ai-badge">
          <div className="ai-details">
            <strong>Optimized AI Solver</strong>
            <p>Advanced algorithm that finds optimal solutions across all word lengths.</p>
          </div>
        </div>
      </div>

      {mode === 'custom-challenge' && (
        <div className="setup-section">
          <label>Your Secret Word ({length} letters)</label>
          <input
            type="text"
            value={customWord}
            onChange={(e) => setCustomWord(e.target.value.toLowerCase())}
            maxLength={length}
            placeholder={`Enter a ${length}-letter word`}
          />
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <button
        className="start-button"
        onClick={handleStart}
        disabled={loading || (mode === 'custom-challenge' && customWord.length !== length)}
      >
        {loading ? 'Starting...' : 'Start Game'}
      </button>

      <div className="game-modes-info">
        <h3>Game Modes</h3>
        <ul>
          <li><strong>Today's Wordle:</strong> Watch the AI solve today's official Wordle puzzle</li>
          <li><strong>Challenge AI:</strong> Submit a custom word and watch the AI solve it</li>
          <li><strong>Race Mode:</strong> Compete against AI on the same secret word</li>
          <li><strong>Human Play:</strong> Classic Wordle - guess the secret word</li>
        </ul>
      </div>
    </div>
  );
};

export default GameSetup;
