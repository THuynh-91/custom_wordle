import React, { useState, useEffect } from 'react';
import WordleGrid from './WordleGrid';
import Keyboard from './Keyboard';
import AIPanel from './AIPanel';
import { GameMode, WordLength, SolverType, GuessFeedback, TileState, AIMoveExplanation } from '@shared/types';
import './GameBoard.css';
import { apiFetch } from '../lib/apiClient';

interface GameBoardProps {
  gameId: string;
  gameMode: GameMode;
  wordLength: WordLength;
  solverType: SolverType;
  hardMode: boolean;
  onNewGame: () => void;
  onReplay: (newWord?: string) => void;
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
  const [showResultModal, setShowResultModal] = useState(false);
  const [isInvalidWord, setIsInvalidWord] = useState(false);
  const [newChallengeWord, setNewChallengeWord] = useState('');
  const [challengeWordError, setChallengeWordError] = useState('');
  const [aiThinkingGuess, setAiThinkingGuess] = useState('');

  const maxGuesses = 6;

  // Load race mode scores from localStorage
  const getRaceScores = () => {
    const saved = localStorage.getItem('raceScores');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { humanWins: 0, aiWins: 0, ties: 0 };
      }
    }
    return { humanWins: 0, aiWins: 0, ties: 0 };
  };

  // Initialize scores from localStorage for race mode
  const [humanWins, setHumanWins] = useState(() => gameMode === 'race' ? getRaceScores().humanWins : 0);
  const [aiWins, setAiWins] = useState(() => gameMode === 'race' ? getRaceScores().aiWins : 0);
  const [ties, setTies] = useState(() => gameMode === 'race' ? getRaceScores().ties : 0);

  // Save scores to localStorage whenever they change in race mode
  useEffect(() => {
    if (gameMode === 'race') {
      localStorage.setItem('raceScores', JSON.stringify({ humanWins, aiWins, ties }));
    }
  }, [humanWins, aiWins, ties, gameMode]);

  // Fetch initial game state for race mode
  useEffect(() => {
    const fetchGameState = async () => {
      if (gameMode === 'race' && isFirstLoad) {
        try {
          const response = await apiFetch(`/api/game/${gameId}`);
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

  // Slot machine animation for AI thinking in all modes
  useEffect(() => {
    // Show animation when AI is thinking in any mode
    const shouldAnimate = loading && (
      (gameMode === 'race' && currentTurn === 'ai' && aiStatus === 'in-progress') ||
      (gameMode === 'custom-challenge' && status === 'in-progress') ||
      (gameMode === 'todays-wordle' && status === 'in-progress')
    );

    if (shouldAnimate) {
      const letters = 'abcdefghijklmnopqrstuvwxyz';
      let intervalId: NodeJS.Timeout;

      const animateSlots = () => {
        let randomWord = '';
        for (let i = 0; i < wordLength; i++) {
          randomWord += letters[Math.floor(Math.random() * letters.length)];
        }
        setAiThinkingGuess(randomWord);
      };

      // Start animation
      intervalId = setInterval(animateSlots, 100);

      return () => {
        clearInterval(intervalId);
        setAiThinkingGuess('');
      };
    } else {
      setAiThinkingGuess('');
    }
  }, [gameMode, currentTurn, aiStatus, loading, wordLength, status]);

  useEffect(() => {
    // Auto-play for custom challenge mode and today's wordle with natural delay
    if ((gameMode === 'custom-challenge' || gameMode === 'todays-wordle') && status === 'in-progress') {
      const delay = guesses.length === 0 ? 1000 : 2000; // Shorter delay for first move
      const timer = setTimeout(() => {
        playAIMove();
      }, delay);
      return () => clearTimeout(timer);
    }
    // Auto-play AI in race mode only when it's AI's turn and AI is still playing
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
      const response = await apiFetch(`/api/game/${gameId}/ai-move?solverType=${solverType}`);

      if (!response.ok) {
        throw new Error('Failed to get AI move');
      }

      const data = await response.json();

      const newGuess: GuessFeedback = {
        guess: data.guess,
        feedback: data.feedback,
        timestamp: Date.now()
      };

      if (gameMode === 'custom-challenge' || gameMode === 'todays-wordle') {
        setGuesses(prev => [...prev, newGuess]);
        setStatus(data.status);

        if (data.status === 'won') {
          const guessCount = guesses.length + 1;
          const modeText = gameMode === 'todays-wordle' ? "Today's Wordle" : 'it';
          setMessage(`AI solved ${modeText} in ${guessCount} guess${guessCount === 1 ? '' : 'es'}!`);
          setSecret(data.secret);
          setTimeout(() => setShowResultModal(true), 500);
        } else if (data.status === 'lost') {
          setMessage(`AI failed to solve!`);
          setSecret(data.secret);
          setTimeout(() => setShowResultModal(true), 500);
        }
      } else if (gameMode === 'race') {
        setAiGuesses(prev => [...prev, newGuess]);
        const newAiStatus = data.status;
        setAiStatus(newAiStatus);

        if (newAiStatus === 'won') {
          const guessCount = aiGuesses.length + 1;
          setMessage(`AI won in ${guessCount} guess${guessCount === 1 ? '' : 'es'}!`);
          setSecret(data.secret);

          // AI won - game over immediately!
          setAiWins(prev => prev + 1);
          setTimeout(() => setShowResultModal(true), 800);
        } else if (newAiStatus === 'lost') {
          setMessage(`AI is out of guesses!`);
          setSecret(data.secret);

          // AI lost, check if human already lost too
          if (status === 'lost') {
            // Both lost - tie
            setTies(prev => prev + 1);
            setTimeout(() => setShowResultModal(true), 800);
          } else {
            // Human still playing, switch turn
            setCurrentTurn('human');
          }
        } else {
          // AI hasn't finished yet, switch turn back to human
          setCurrentTurn('human');
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
    // In custom challenge mode, user tries to beat the AI
    if (gameMode === 'custom-challenge') {
      if (loading) return; // Allow typing even after AI finishes

      if (key === 'ENTER') {
        submitGuess();
      } else if (key === 'BACKSPACE') {
        setCurrentGuess(prev => prev.slice(0, -1));
      } else if (currentGuess.length < wordLength && /^[a-z]$/i.test(key)) {
        setCurrentGuess(prev => prev + key.toLowerCase());
      }
      return;
    }

    // For other modes, check status
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
    setIsInvalidWord(false);
    try {
      const response = await apiFetch(`/api/game/${gameId}/guess`, {
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
        setMessage(`Congratulations! You won!`);
        setSecret(data.secret);

        if (gameMode === 'race') {
          // Human won - game over immediately!
          setHumanWins(prev => prev + 1);
          setTimeout(() => setShowResultModal(true), 800);
        } else {
          // Show modal on win for non-race modes
          setTimeout(() => setShowResultModal(true), 800);
        }
      } else if (data.status === 'lost') {
        setMessage(`You're out of guesses!`);
        setSecret(data.secret);

        if (gameMode === 'race') {
          // Human lost, give AI one more turn if they haven't finished
          if (aiStatus === 'in-progress') {
            setCurrentTurn('ai');
          } else {
            // AI already finished, determine winner
            if (aiStatus === 'won') {
              setAiWins(prev => prev + 1);
            } else {
              // Both lost
              setTies(prev => prev + 1);
            }
            setTimeout(() => setShowResultModal(true), 800);
          }
        } else {
          // Show modal immediately for non-race modes
          setTimeout(() => setShowResultModal(true), 800);
        }
      }
    } catch (error: any) {
      // Just trigger shake animation, no message needed
      setIsInvalidWord(true);
      setTimeout(() => {
        setIsInvalidWord(false);
      }, 500);
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

    // In race mode, also show AI's guessed letters as 'absent' if not already set
    if (gameMode === 'race') {
      for (const { guess } of aiGuesses) {
        for (let i = 0; i < guess.length; i++) {
          const letter = guess[i];
          if (!states[letter]) {
            states[letter] = 'absent';
          }
        }
      }
    }

    return states;
  };

  // Calculate AI letter states for keyboard in race mode
  const getAILetterStates = (): Record<string, TileState> => {
    const states: Record<string, TileState> = {};

    for (const { guess, feedback } of aiGuesses) {
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i];
        const state = feedback[i];

        if (!states[letter] || state === 'correct' || (state === 'present' && states[letter] !== 'correct')) {
          states[letter] = state;
        }
      }
    }

    // In race mode, also show human's guessed letters as 'absent' if not already set
    if (gameMode === 'race') {
      for (const { guess } of guesses) {
        for (let i = 0; i < guess.length; i++) {
          const letter = guess[i];
          if (!states[letter]) {
            states[letter] = 'absent';
          }
        }
      }
    }

    return states;
  };

  const handleReplay = () => {
    // For Challenge AI mode, need to validate and pass the new word
    if (gameMode === 'custom-challenge') {
      if (newChallengeWord.length !== wordLength) {
        setChallengeWordError(`Word must be ${wordLength} letters`);
        return;
      }
      setChallengeWordError('');
      setShowResultModal(false);
      onReplay(newChallengeWord);
      setNewChallengeWord('');
    } else {
      // For other modes, use default replay behavior
      setShowResultModal(false);
      onReplay();
    }
  };

  const handleHomeClick = () => {
    // Reset scores when leaving race mode
    if (gameMode === 'race') {
      setHumanWins(0);
      setAiWins(0);
      setTies(0);
      localStorage.setItem('raceScores', JSON.stringify({ humanWins: 0, aiWins: 0, ties: 0 }));
    }
    onNewGame();
  };

  const getResultMessage = () => {
    if (gameMode === 'race') {
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
    } else if (gameMode === 'custom-challenge' || gameMode === 'todays-wordle') {
      const modeLabel = gameMode === 'todays-wordle' ? "Today's Wordle" : 'It';
      if (status === 'won') {
        return `AI Solved ${modeLabel}!`;
      } else {
        return 'AI Failed!';
      }
    } else {
      // human-play mode
      if (status === 'won') {
        return 'You Won!';
      } else {
        return 'Game Over!';
      }
    }
  };

  return (
    <div className="game-board">
      <div className="game-info">
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

      {message && (
        <div className={`message ${status !== 'in-progress' ? 'game-over' : ''}`}>
          {message}
        </div>
      )}

      {gameMode === 'race' && (
        <div className={`turn-indicator ${currentTurn === 'human' ? 'your-turn' : 'ai-turn'}`}>
          {status === 'in-progress' && aiStatus === 'in-progress' ? (
            currentTurn === 'human' ? (
              "Your Turn!"
            ) : (
              <span className="ai-thinking">
                AI's Turn <span className="dots">...</span>
              </span>
            )
          ) : (
            status === 'won' ? "You Won!" : aiStatus === 'won' ? "AI Won!" : "Game Over"
          )}
        </div>
      )}

      {loading && (gameMode === 'custom-challenge' || gameMode === 'todays-wordle') && (
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
                isInvalidWord={isInvalidWord}
              />
              <Keyboard
                onKeyPress={handleKeyPress}
                letterStates={getLetterStates()}
                disabled={status !== 'in-progress' || loading || (gameMode === 'race' && currentTurn !== 'human')}
                currentGuess={currentGuess}
              />
            </div>
            <div className={`board-section ${currentTurn === 'ai' ? 'active-player' : ''}`}>
              <h3>AI</h3>
              <WordleGrid
                guesses={aiGuesses}
                currentGuess={aiThinkingGuess}
                wordLength={wordLength}
                maxGuesses={maxGuesses}
              />
              <Keyboard
                onKeyPress={() => {}}
                letterStates={getAILetterStates()}
                disabled={true}
              />
            </div>
          </>
        ) : (
          <>
            <WordleGrid
              guesses={guesses}
              currentGuess={(gameMode === 'custom-challenge' || gameMode === 'todays-wordle') ? aiThinkingGuess : currentGuess}
              wordLength={wordLength}
              maxGuesses={maxGuesses}
              isInvalidWord={isInvalidWord}
            />
            {gameMode !== 'custom-challenge' && gameMode !== 'todays-wordle' && (
              <Keyboard
                onKeyPress={handleKeyPress}
                letterStates={getLetterStates()}
                disabled={status !== 'in-progress' || loading}
                currentGuess={currentGuess}
              />
            )}
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

      {/* Result Modal */}
      {showResultModal && secret && (
        <div className="modal-overlay" onClick={(e) => {
          // In race mode, prevent closing by clicking overlay - must use buttons
          if (gameMode !== 'race') {
            setShowResultModal(false);
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {gameMode !== 'race' && (
              <button className="modal-close" onClick={() => setShowResultModal(false)}>
                ×
              </button>
            )}
            <div className="modal-header">
              <h2>{getResultMessage()}</h2>
            </div>
            <div className="modal-body">
              {gameMode === 'race' && (
                <div className="modal-scoreboard">
                  <div className="modal-score-item human">
                    <span className="modal-score-label">You</span>
                    <span className="modal-score-value">{humanWins}</span>
                  </div>
                  <div className="modal-score-item tie">
                    <span className="modal-score-label">Ties</span>
                    <span className="modal-score-value">{ties}</span>
                  </div>
                  <div className="modal-score-item ai">
                    <span className="modal-score-label">AI</span>
                    <span className="modal-score-value">{aiWins}</span>
                  </div>
                </div>
              )}
              <div className="secret-word-reveal">
                <p className="secret-label">The word was:</p>
                <p
                  className="secret-word"
                  ref={(el) => {
                    if (el) {
                      console.log('=== GAMEBOARD SECRET WORD DEBUG ===');
                      console.log('Element:', el);
                      const styles = window.getComputedStyle(el);
                      console.log('Font Size:', styles.fontSize);
                      console.log('Color:', styles.color);
                      console.log('Background:', styles.backgroundColor);
                      console.log('========================');
                    }
                  }}
                >{secret.toUpperCase()}</p>
              </div>
              {gameMode === 'race' ? (
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
              ) : (
                <div className="game-summary">
                  <div className="summary-row">
                    <span>{(gameMode === 'custom-challenge' || gameMode === 'todays-wordle') ? 'AI Guesses:' : 'Your Guesses:'}</span>
                    <span className="summary-value">{guesses.length} / {maxGuesses}</span>
                  </div>
                </div>
              )}
              {gameMode === 'custom-challenge' && (
                <div className="challenge-replay-section">
                  <label className="challenge-label">Enter a new word to challenge AI:</label>
                  <input
                    type="text"
                    className="challenge-input"
                    value={newChallengeWord}
                    onChange={(e) => setNewChallengeWord(e.target.value.toLowerCase())}
                    maxLength={wordLength}
                    placeholder={`Enter a ${wordLength}-letter word`}
                  />
                  {challengeWordError && (
                    <div className="challenge-error">{challengeWordError}</div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-actions">
              {gameMode === 'todays-wordle' ? (
                <button className="modal-button home" onClick={handleHomeClick}>
                  Home
                </button>
              ) : gameMode === 'race' ? (
                <>
                  <button className="modal-button home" onClick={handleHomeClick}>
                    Home
                  </button>
                  <button className="modal-button replay" onClick={handleReplay}>
                    Play Again
                  </button>
                </>
              ) : (
                <>
                  <button className="modal-button replay" onClick={handleReplay}>
                    {gameMode === 'custom-challenge' ? 'Challenge AI' : 'Play Again'}
                  </button>
                  <button className="modal-button new-game" onClick={handleHomeClick}>
                    New Game
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
