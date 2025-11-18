import React, { useState, useEffect } from 'react';
import WordleGrid from './WordleGrid';
import Keyboard from './Keyboard';
import { GuessFeedback, TileState, MultiplayerRoomState, WordLength } from '@shared/types';
import {
  socketService,
  GuessSubmittedData,
  GameOverData,
  PlayerLeftData,
  TurnChangedData,
} from '../services/socketService';
import './MultiplayerGameBoard.css';

interface MultiplayerGameBoardProps {
  roomId: string;
  playerId: string;
  isHost: boolean;
  initialRoomState: MultiplayerRoomState;
  onNewGame: () => void;
}

const MultiplayerGameBoard: React.FC<MultiplayerGameBoardProps> = ({
  roomId,
  playerId,
  isHost,
  initialRoomState,
  onNewGame,
}) => {
  console.log('=== MultiplayerGameBoard Mounted ===');
  console.log('Room ID:', roomId);
  console.log('Player ID:', playerId);
  console.log('Is Host:', isHost);
  console.log('Initial Room State:', initialRoomState);

  // Validate room state
  if (!initialRoomState) {
    console.error('ERROR: initialRoomState is null or undefined!');
    return (
      <div className="error-screen">
        <h2>Error: No room state available</h2>
        <button onClick={onNewGame}>Back to Home</button>
      </div>
    );
  }

  if (!initialRoomState.players || initialRoomState.players.length < 2) {
    console.error('ERROR: Invalid players array!', initialRoomState.players);
    return (
      <div className="error-screen">
        <h2>Error: Invalid game state</h2>
        <button onClick={onNewGame}>Back to Home</button>
      </div>
    );
  }

  const [currentGuess, setCurrentGuess] = useState('');
  const [myGuesses, setMyGuesses] = useState<GuessFeedback[]>([]);
  const [opponentGuesses, setOpponentGuesses] = useState<GuessFeedback[]>([]);
  const [myStatus, setMyStatus] = useState<'in-progress' | 'won' | 'lost'>('in-progress');
  const [opponentStatus, setOpponentStatus] = useState<'in-progress' | 'won' | 'lost'>('in-progress');
  const [currentTurn, setCurrentTurn] = useState<string | undefined>(initialRoomState.currentTurn);
  const [secret, setSecret] = useState<string>('');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | undefined>();
  const [message, setMessage] = useState('');
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [isInvalidWord, setIsInvalidWord] = useState(false);

  // Scoreboard
  const [scores, setScores] = useState(() => {
    const saved = localStorage.getItem(`multiplayer-scores-${roomId}`);
    return saved ? JSON.parse(saved) : { player1: 0, player2: 0 };
  });

  const wordLength = initialRoomState.length;
  const maxGuesses = initialRoomState.maxGuesses;
  const gameMode = initialRoomState.gameMode;
  const myPlayer = initialRoomState.players.find(p => p?.id === playerId);
  const opponentPlayer = initialRoomState.players.find(p => p?.id !== playerId);

  console.log('My Player:', myPlayer);
  console.log('Opponent Player:', opponentPlayer);

  if (!myPlayer || !opponentPlayer) {
    console.error('ERROR: Could not find players!');
    return (
      <div className="error-screen">
        <h2>Error: Could not find player data</h2>
        <button onClick={onNewGame}>Back to Home</button>
      </div>
    );
  }

  useEffect(() => {
    // Set up socket event listeners
    socketService.on<GuessSubmittedData>('guess-submitted', handleGuessSubmitted);
    socketService.on<GameOverData>('game-over', handleGameOver);
    socketService.on<PlayerLeftData>('player-left', handlePlayerLeft);
    socketService.on<{ playerId: string }>('player-disconnected', handlePlayerDisconnected);
    socketService.on<{ playerId: string }>('player-reconnected', handlePlayerReconnected);
    socketService.on<TurnChangedData>('turn-changed', handleTurnChanged);
    socketService.on<{ message: string }>('socket-error', handleSocketError);

    return () => {
      socketService.off('guess-submitted');
      socketService.off('game-over');
      socketService.off('player-left');
      socketService.off('player-disconnected');
      socketService.off('player-reconnected');
      socketService.off('turn-changed');
      socketService.off('socket-error');
    };
  }, []);

  const handleGuessSubmitted = (data: GuessSubmittedData) => {
    const guessFeedback: GuessFeedback = {
      guess: data.guess,
      feedback: data.feedback,
      timestamp: Date.now(),
    };

    if (data.playerId === playerId) {
      // My guess
      setMyGuesses(prev => [...prev, guessFeedback]);
      setMyStatus(data.playerStatus);
      setCurrentGuess('');
      setIsInvalidWord(false);
    } else {
      // Opponent's guess
      setOpponentGuesses(prev => [...prev, guessFeedback]);
      setOpponentStatus(data.playerStatus);
    }
  };

  const handleGameOver = (data: GameOverData) => {
    setGameOver(true);
    setSecret(data.secret);
    setWinner(data.winner);

    // Update scoreboard
    if (data.winner) {
      const newScores = { ...scores };
      if (data.winner === myPlayer?.id) {
        newScores.player1++;
        setMessage('You won!');
      } else {
        newScores.player2++;
        setMessage('You lost!');
      }
      setScores(newScores);
      localStorage.setItem(`multiplayer-scores-${roomId}`, JSON.stringify(newScores));
    } else {
      setMessage('Game over - no winner');
    }
  };

  const handlePlayerLeft = (data: PlayerLeftData) => {
    setMessage('Opponent left the game');
    setOpponentDisconnected(true);
  };

  const handlePlayerDisconnected = (data: { playerId: string }) => {
    if (data.playerId !== playerId) {
      setMessage('Opponent disconnected - waiting for reconnection...');
      setOpponentDisconnected(true);
    }
  };

  const handlePlayerReconnected = (data: { playerId: string }) => {
    if (data.playerId !== playerId) {
      setMessage('Opponent reconnected!');
      setOpponentDisconnected(false);

      // Clear message after a delay
      setTimeout(() => {
        setMessage('');
      }, 2000);
    }
  };

  const handleTurnChanged = (data: TurnChangedData) => {
    setCurrentTurn(data.currentTurn);
  };

  const handleSocketError = (data: { message: string }) => {
    setMessage(data.message);
    setIsInvalidWord(true);

    // Clear error after a delay
    setTimeout(() => {
      setMessage('');
      setIsInvalidWord(false);
    }, 2000);
  };

  // Calculate letter states for keyboard
  // In turn-based mode, combine both players' guesses since they share the same puzzle
  const getLetterStates = (): Record<string, TileState> => {
    const states: Record<string, TileState> = {};

    // Combine guesses from both players in turn-based mode
    const guessesToConsider = gameMode === 'turn-based'
      ? [...myGuesses, ...opponentGuesses]
      : myGuesses;

    for (const { guess, feedback } of guessesToConsider) {
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i];
        const state = feedback[i];

        // Prioritize: correct > present > absent
        if (!states[letter] || state === 'correct' || (state === 'present' && states[letter] !== 'correct')) {
          states[letter] = state;
        }
      }
    }

    return states;
  };

  const handleKeyPress = (key: string) => {
    if (gameOver || myStatus !== 'in-progress') return;

    // Check turn for turn-based mode
    if (gameMode === 'turn-based' && currentTurn !== playerId) {
      setMessage('Not your turn!');
      setTimeout(() => setMessage(''), 1500);
      return;
    }

    if (key === 'ENTER') {
      if (currentGuess.length === wordLength) {
        submitGuess();
      }
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (currentGuess.length < wordLength) {
      setCurrentGuess(prev => prev + key.toLowerCase());
    }
  };

  const submitGuess = () => {
    if (currentGuess.length !== wordLength) return;

    try {
      socketService.submitGuess(roomId, currentGuess);
    } catch (error: any) {
      setMessage(error.message);
      setIsInvalidWord(true);
      setTimeout(() => {
        setMessage('');
        setIsInvalidWord(false);
      }, 2000);
    }
  };

  const isMyTurn = gameMode === 'simultaneous' || currentTurn === playerId;

  return (
    <div className="multiplayer-game-board">
      <div className="game-header">
        <div className="game-info">
          <h2>Multiplayer Game</h2>
          <div className="game-mode-badge">
            {gameMode === 'turn-based' ? 'Turn-based' : 'Simultaneous'}
          </div>
        </div>
        <div className="scoreboard">
          <div className="score-item">
            <span className="score-label">You</span>
            <span className="score-value">{scores.player1}</span>
          </div>
          <div className="score-divider">-</div>
          <div className="score-item">
            <span className="score-label">Opponent</span>
            <span className="score-value">{scores.player2}</span>
          </div>
        </div>
        <button className="new-game-button" onClick={onNewGame}>
          Exit
        </button>
      </div>

      {message && (
        <div className={`game-message ${isInvalidWord ? 'error' : ''}`}>
          {message}
        </div>
      )}

      <div className="players-container">
        {/* My Grid */}
        <div className="player-section">
          <div className="player-header">
            <h3>{myPlayer?.name} (You)</h3>
            <div className={`status-badge ${myStatus}`}>
              {myStatus === 'in-progress' ? 'Playing' : myStatus === 'won' ? 'Won!' : 'Lost'}
            </div>
          </div>
          {gameMode === 'turn-based' && (
            <div className={`turn-indicator ${isMyTurn ? 'active' : ''}`}>
              {isMyTurn ? 'Your Turn' : 'Waiting...'}
            </div>
          )}
          <WordleGrid
            guesses={myGuesses}
            currentGuess={isMyTurn ? currentGuess : ''}
            maxGuesses={maxGuesses}
            wordLength={wordLength}
            isInvalidWord={isInvalidWord}
          />
        </div>

        {/* Opponent Grid */}
        <div className="player-section">
          <div className="player-header">
            <h3>{opponentPlayer?.name}</h3>
            <div className={`status-badge ${opponentStatus}`}>
              {opponentDisconnected
                ? 'Disconnected'
                : opponentStatus === 'in-progress'
                ? 'Playing'
                : opponentStatus === 'won'
                ? 'Won!'
                : 'Lost'}
            </div>
          </div>
          {gameMode === 'turn-based' && (
            <div className={`turn-indicator ${!isMyTurn ? 'active' : ''}`}>
              {!isMyTurn ? 'Their Turn' : 'Waiting...'}
            </div>
          )}
          <WordleGrid
            guesses={opponentGuesses}
            currentGuess=""
            maxGuesses={maxGuesses}
            wordLength={wordLength}
            isInvalidWord={false}
            hideLetters={gameMode === 'simultaneous' && !gameOver}
          />
        </div>
      </div>

      {!gameOver && (
        <div className="keyboard-container">
          <Keyboard
            onKeyPress={handleKeyPress}
            letterStates={getLetterStates()}
            disabled={!isMyTurn || myStatus !== 'in-progress'}
            currentGuess={currentGuess}
          />
        </div>
      )}

      {gameOver && (
        <div className="game-over-modal">
          <div className="modal-content">
            <h2>{message}</h2>
            <p className="secret-word">
              The word was: <strong
                ref={(el) => {
                  if (el) {
                    console.log('=== SECRET WORD DEBUG ===');
                    console.log('Element:', el);
                    const styles = window.getComputedStyle(el);
                    console.log('Font Size:', styles.fontSize);
                    console.log('Color:', styles.color);
                    console.log('Display:', styles.display);
                    const rootStyles = window.getComputedStyle(document.documentElement);
                    console.log('--color-accent:', rootStyles.getPropertyValue('--color-accent').trim());
                    console.log('========================');
                  }
                }}
              >{secret.toUpperCase()}</strong>
            </p>
            <div className="game-stats">
              <div className="stat">
                <span className="stat-label">Your guesses:</span>
                <span className="stat-value">{myGuesses.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Opponent guesses:</span>
                <span className="stat-value">{opponentGuesses.length}</span>
              </div>
            </div>
            <div className="final-scoreboard">
              <h3>Match Score</h3>
              <div className="final-score">
                <div className="final-score-item">
                  <span className="player-name">{myPlayer?.name}</span>
                  <span className="final-score-value">{scores.player1}</span>
                </div>
                <span className="score-separator">-</span>
                <div className="final-score-item">
                  <span className="player-name">{opponentPlayer?.name}</span>
                  <span className="final-score-value">{scores.player2}</span>
                </div>
              </div>
            </div>
            <div className="game-over-actions">
              <button className="rematch-button" onClick={() => {
                // Request rematch - for now just show message
                setMessage('Rematch feature coming soon! Click "Exit" and create a new room.');
                setTimeout(() => setMessage(message), 3000);
              }}>
                Rematch
              </button>
              <button className="new-game-button" onClick={onNewGame}>
                Exit to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiplayerGameBoard;
