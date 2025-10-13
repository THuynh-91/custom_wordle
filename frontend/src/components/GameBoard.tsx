import React, { useState, useEffect } from 'react';
import WordleGrid from './WordleGrid';
import Keyboard from './Keyboard';
import AIPanel from './AIPanel';
import { GameMode, WordLength, SolverType, GuessFeedback, TileState, AIMoveExplanation } from '@shared/types';
import './GameBoard.css';

interface GameBoardProps {
  gameId: string;
  gameMode: GameMode;
  wordLength: WordLength;
  solverType: SolverType;
  hardMode: boolean;
  onNewGame: () => void;
  onReplay: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameId,
  gameMode,
  wordLength,
  solverType,
  hardMode,
  onNewGame,
  onReplay
}) => {
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState<GuessFeedback[]>([]);
  const [status, setStatus] = useState<'in-progress' | 'won' | 'lost'>('in-progress');
  const [secret, setSecret] = useState<string>();
  const [message, setMessage] = useState('');
  const [aiExplanation, setAiExplanation] = useState<AIMoveExplanation | null>(null);
  const [aiGuesses, setAiGuesses] = useState<GuessFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<'in-progress' | 'won' | 'lost'>('in-progress');
  const [currentTurn, setCurrentTurn] = useState<'human' | 'ai'>('human');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showAIThoughts, setShowAIThoughts] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [humanWins, setHumanWins] = useState(0);
  const [aiWins, setAiWins] = useState(0);
  const [ties, setTies] = useState(0);

  const maxGuesses = 6;

  // Fetch initial game state for race mode
  useEffect(() => {
    const fetchGameState = async () => {
      if (gameMode === 'race' && isFirstLoad) {
        try {
          const response = await fetch(`/api/game/${gameId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.currentTurn) {
              setCurrentTurn(data.currentTurn);
              // Load existing guesses if any (for page refresh scenarios)
              if (data.humanGuesses) {
                setGuesses(data.humanGuesses);
                setStatus(data.humanStatus);
              }
              if (data.aiGuesses) {
                setAiGuesses(data.aiGuesses);
                setAiStatus(data.aiStatus);
              }
              setIsFirstLoad(false);
            }
          }
        } catch (error) {
          console.error('Error fetching game state:', error);
        }
      }
    };
    fetchGameState();
  }, [gameId, gameMode, isFirstLoad]);

  useEffect(() => {
    // Auto-play for custom challenge mode with natural delay
    if (gameMode === 'custom-challenge' && status === 'in-progress') {
      const delay = guesses.length === 0 ? 1000 : 2000; // Shorter delay for first move
      const timer = setTimeout(() => {
        playAIMove();
      }, delay);
      return () => clearTimeout(timer);
    }
    // Auto-play AI in race mode only when it's AI's turn
    if (gameMode === 'race' && aiStatus === 'in-progress' && currentTurn === 'ai') {
      const delay = aiGuesses.length === 0 ? 800 : 600; // Faster in race mode
      const timer = setTimeout(() => {
        playAIMove();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [gameMode, guesses.length, status, aiGuesses.length, aiStatus, currentTurn]);

  const playAIMove = async () => {
    if (gameMode === 'race' && aiStatus !== 'in-progress') return;
    if (gameMode !== 'race' && status !== 'in-progress') return;

    setLoading(true);
    try {
      const response = await fetch(`/api/game/${gameId}/ai-move?solverType=${solverType}`);

      if (!response.ok) {
        throw new Error('Failed to get AI move');
      }

      const data = await response.json();

      const newGuess: GuessFeedback = {
        guess: data.guess,
        feedback: data.feedback,
        timestamp: Date.now()
      };

      if (gameMode === 'custom-challenge') {
        setGuesses(prev => [...prev, newGuess]);
        setStatus(data.status);

        if (data.status === 'won') {
          const guessCount = guesses.length + 1;
          setMessage(`AI solved it in ${guessCount} guess${guessCount === 1 ? '' : 'es'}!`);
          setSecret(data.secret);
        } else if (data.status === 'lost') {
          setMessage(`AI failed to solve!`);
          setSecret(data.secret);
        }
      } else if (gameMode === 'race') {
        setAiGuesses(prev => [...prev, newGuess]);
        setAiStatus(data.status);
        setCurrentTurn('human'); // Switch turn back to human

        if (data.status === 'won') {
          const guessCount = aiGuesses.length + 1;
          setMessage(`AI won in ${guessCount} guess${guessCount === 1 ? '' : 'es'}!`);
          setSecret(data.secret);
          setAiWins(prev => prev + 1);
          setShowResultModal(true);
        } else if (data.status === 'lost') {
          setMessage(`AI failed to solve!`);
          setSecret(data.secret);
          // Check if human also lost/won
          if (status !== 'in-progress') {
            setShowResultModal(true);
          }
        }
      }

      setAiExplanation(data.explanation);
    } catch (error: any) {
      setMessage(error.message || 'Error getting AI move');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (key: string) => {
    if (status !== 'in-progress' || loading) return;
    // In race mode, check if it's the human's turn
    if (gameMode === 'race' && currentTurn !== 'human') return;

    if (key === 'ENTER') {
      submitGuess();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (currentGuess.length < wordLength && /^[a-z]$/i.test(key)) {
      setCurrentGuess(prev => prev + key.toLowerCase());
    }
  };

  const submitGuess = async () => {
    if (currentGuess.length !== wordLength) {
      setMessage(`Word must be ${wordLength} letters`);
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/game/${gameId}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: currentGuess })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid guess');
      }

      const data = await response.json();

      const newGuess: GuessFeedback = {
        guess: currentGuess,
        feedback: data.feedback,
        timestamp: Date.now()
      };

      setGuesses(prev => [...prev, newGuess]);
      setCurrentGuess('');
      setStatus(data.status);
      setMessage('');

      // In race mode, switch turn to AI
      if (gameMode === 'race') {
        setCurrentTurn('ai');
      }

      if (data.status === 'won') {
        setMessage(`Congratulations! You solved it in ${guesses.length + 1} guess${guesses.length + 1 === 1 ? '' : 'es'}!`);
        setSecret(data.secret);
        if (gameMode === 'race') {
          setHumanWins(prev => prev + 1);
          setShowResultModal(true);
        }
      } else if (data.status === 'lost') {
        setMessage(`Game over!`);
        setSecret(data.secret);
        if (gameMode === 'race' && aiStatus !== 'in-progress') {
          setShowResultModal(true);
        }
      }
    } catch (error: any) {
      setMessage(error.message || 'Error submitting guess');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setLoading(false);
    }
  };

  // Calculate letter states for keyboard
  const getLetterStates = (): Record<string, TileState> => {
    const states: Record<string, TileState> = {};

    for (const { guess, feedback } of guesses) {
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i];
        const state = feedback[i];

        if (!states[letter] || state === 'correct' || (state === 'present' && states[letter] !== 'correct')) {
          states[letter] = state;
        }
      }
    }

    return states;
  };

  const handleReplay = () => {
    // Close modal and trigger replay in parent
    setShowResultModal(false);
    onReplay();
  };

  const getResultMessage = () => {
    if (gameMode !== 'race') return '';

    if (status === 'won' && aiStatus !== 'won') {
      return 'You Won!';
    } else if (aiStatus === 'won' && status !== 'won') {
      return 'AI Won!';
    } else if (status === 'won' && aiStatus === 'won') {
      if (guesses.length < aiGuesses.length) {
        return 'You Won! (Fewer Guesses)';
      } else if (aiGuesses.length < guesses.length) {
        return 'AI Won! (Fewer Guesses)';
      } else {
        return 'Tie!';
      }
    } else {
      return 'Both Lost!';
    }
  };

  return (
    <div className="game-board">
      <div className="game-info">
        <div className="info-item">
          <span className="label">Mode:</span>
          <span className="value">{gameMode}</span>
        </div>
        <div className="info-item">
          <span className="label">Length:</span>
          <span className="value">{wordLength} letters</span>
        </div>
        <div className="info-item">
          <span className="label">AI:</span>
          <span className="value">AI</span>
        </div>
        {hardMode && <div className="hard-mode-badge">HARD MODE</div>}
      </div>

      {/* Scoreboard for race mode */}
      {gameMode === 'race' && (
        <div className="scoreboard">
          <div className="score-item human">
            <span className="score-label">You</span>
            <span className="score-value">{humanWins}</span>
          </div>
          <div className="score-item tie">
            <span className="score-label">Ties</span>
            <span className="score-value">{ties}</span>
          </div>
          <div className="score-item ai">
            <span className="score-label">AI</span>
            <span className="score-value">{aiWins}</span>
          </div>
        </div>
      )}

      {/* AI Thoughts Toggle */}
      {(gameMode === 'race' || gameMode === 'custom-challenge') && (
        <div className="ai-toggle">
          <label>
            <input
              type="checkbox"
              checked={showAIThoughts}
              onChange={(e) => setShowAIThoughts(e.target.checked)}
            />
            <span>Show AI Thoughts</span>
          </label>
        </div>
      )}

      {message && (
        <div className={`message ${status !== 'in-progress' ? 'game-over' : ''}`}>
          {message}
        </div>
      )}

      {gameMode === 'race' && (
        <div className={`turn-indicator ${currentTurn === 'human' ? 'your-turn' : 'ai-turn'}`}>
          {status === 'in-progress' && aiStatus === 'in-progress' ? (
            currentTurn === 'human' ? (
              "Your Turn! (Use opponent's feedback)"
            ) : (
              <span className="ai-thinking">
                AI's Turn... <span className="dots">⚡</span>
              </span>
            )
          ) : (
            status === 'won' ? "You Won! 🎉" : aiStatus === 'won' ? "AI Won! 🤖" : "Game Over"
          )}
        </div>
      )}

      {loading && gameMode === 'custom-challenge' && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>AI is thinking...</p>
        </div>
      )}

      <div className={`game-content ${gameMode === 'race' ? 'race-mode' : ''}`}>
        {gameMode === 'race' ? (
          <>
            <div className={`board-section ${currentTurn === 'human' ? 'active-player' : ''}`}>
              <h3>You</h3>
              <WordleGrid
                guesses={guesses}
                currentGuess={currentGuess}
                wordLength={wordLength}
                maxGuesses={maxGuesses}
              />
              <Keyboard
                onKeyPress={handleKeyPress}
                letterStates={getLetterStates()}
                disabled={status !== 'in-progress' || loading || (gameMode === 'race' && currentTurn !== 'human')}
              />
            </div>
            <div className={`board-section ${currentTurn === 'ai' ? 'active-player' : ''}`}>
              <h3>AI</h3>
              <WordleGrid
                guesses={aiGuesses}
                currentGuess=""
                wordLength={wordLength}
                maxGuesses={maxGuesses}
              />
              {showAIThoughts && aiExplanation && <AIPanel explanation={aiExplanation} />}
            </div>
          </>
        ) : (
          <>
            <WordleGrid
              guesses={guesses}
              currentGuess={currentGuess}
              wordLength={wordLength}
              maxGuesses={maxGuesses}
            />
            {gameMode !== 'custom-challenge' && (
              <Keyboard
                onKeyPress={handleKeyPress}
                letterStates={getLetterStates()}
                disabled={status !== 'in-progress' || loading}
              />
            )}
            {showAIThoughts && aiExplanation && <AIPanel explanation={aiExplanation} />}
          </>
        )}
      </div>

      <div className="game-stats">
        <div className="stat">
          <span className="stat-value">{guesses.length}</span>
          <span className="stat-label">Guesses</span>
        </div>
        <div className="stat">
          <span className="stat-value">{maxGuesses - guesses.length}</span>
          <span className="stat-label">Remaining</span>
        </div>
      </div>

      <div className="game-actions">
        {(status !== 'in-progress' || aiStatus !== 'in-progress') && (
          <button className="replay-button" onClick={handleReplay}>
            Play Again (Same Mode)
          </button>
        )}
        <button className="new-game-button" onClick={onNewGame}>
          New Game
        </button>
      </div>

      {/* Result Modal */}
      {showResultModal && secret && (
        <div className="modal-overlay" onClick={() => setShowResultModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowResultModal(false)}>
              ×
            </button>
            <div className="modal-header">
              <h2>{getResultMessage()}</h2>
            </div>
            <div className="modal-body">
              <div className="secret-word-reveal">
                <p className="secret-label">The word was:</p>
                <p className="secret-word">{secret.toUpperCase()}</p>
              </div>
              <div className="game-summary">
                <div className="summary-row">
                  <span>Your Guesses:</span>
                  <span className="summary-value">{guesses.length} / {maxGuesses}</span>
                </div>
                <div className="summary-row">
                  <span>AI Guesses:</span>
                  <span className="summary-value">{aiGuesses.length} / {maxGuesses}</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-button replay" onClick={handleReplay}>
                Play Again
              </button>
              <button className="modal-button new-game" onClick={onNewGame}>
                New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
