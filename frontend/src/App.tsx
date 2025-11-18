import React, { useState, useEffect } from 'react';
import GameSetup from './components/GameSetup';
import GameBoard from './components/GameBoard';
import MultiplayerLobby from './components/MultiplayerLobby';
import MultiplayerGameBoard from './components/MultiplayerGameBoard';
import { GameMode, WordLength, SolverType, MultiplayerRoomState } from '@shared/types';
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

  // Multiplayer state
  const [showMultiplayerLobby, setShowMultiplayerLobby] = useState(false);
  const [multiplayerRoomId, setMultiplayerRoomId] = useState<string | null>(null);
  const [multiplayerPlayerId, setMultiplayerPlayerId] = useState<string | null>(null);
  const [isMultiplayerHost, setIsMultiplayerHost] = useState(false);
  const [multiplayerRoomState, setMultiplayerRoomState] = useState<MultiplayerRoomState | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    // Show welcome modal only on first visit
    const hasVisited = localStorage.getItem('hasVisited');
    return !hasVisited;
  });

  // Debug multiplayer state changes
  useEffect(() => {
    console.log('=== MULTIPLAYER STATE CHANGED ===');
    console.log('showMultiplayerLobby:', showMultiplayerLobby);
    console.log('multiplayerRoomId:', multiplayerRoomId);
    console.log('multiplayerPlayerId:', multiplayerPlayerId);
    console.log('multiplayerRoomState:', multiplayerRoomState);
  }, [showMultiplayerLobby, multiplayerRoomId, multiplayerPlayerId, multiplayerRoomState]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [showPingPongModal, setShowPingPongModal] = useState(false);
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

    // DEBUG: Log CSS variables to verify they're loading correctly
    setTimeout(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      console.log('=== CSS VARIABLES DEBUG ===');
      console.log('Dark Mode:', isDarkMode);
      console.log('Selected Button BG:', styles.getPropertyValue('--color-button-selected-bg').trim());
      console.log('Selected Button Text:', styles.getPropertyValue('--color-button-selected-text').trim());
      console.log('Accent Color:', styles.getPropertyValue('--color-accent').trim());
      console.log('Border Color:', styles.getPropertyValue('--color-border').trim());
      console.log('========================');
    }, 100);
  }, [isDarkMode]);

  useEffect(() => {
    if (!showPingPongModal) return;

    const canvas = document.getElementById('pingPongCanvas');
    const ball = document.getElementById('pingPongBall');
    const paddleLeft = document.getElementById('pingPongPaddleLeft');
    const paddleRight = document.getElementById('pingPongPaddleRight');
    const scoreLeftEl = document.getElementById('pingPongScoreLeft');
    const scoreRightEl = document.getElementById('pingPongScoreRight');
    const pauseBtn = document.getElementById('pingPongPauseBtn');

    if (!canvas || !ball || !paddleLeft || !paddleRight || !scoreLeftEl || !scoreRightEl || !pauseBtn) return;

    let gameActive = true;
    let isPaused = false;
    let scoreLeft = 0;
    let scoreRight = 0;

    // Get canvas width dynamically
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    // Ball properties
    let ballX = canvasWidth / 2;
    let ballY = canvasHeight / 2;
    let ballSpeedX = 3;
    let ballSpeedY = 2;

    // Paddle properties
    let paddleLeftY = (canvasHeight - 50) / 2;
    let paddleRightY = (canvasHeight - 50) / 2;
    const paddleHeight = 50;

    // Mouse/touch position
    let mouseY = canvasHeight / 2;

    // Reset ball
    function resetBall(direction: 'left' | 'right') {
      ballX = canvasWidth / 2;
      ballY = canvasHeight / 2;
      ballSpeedX = (direction === 'left' ? -3 : 3);
      ballSpeedY = (Math.random() - 0.5) * 4;
    }

    // Update game
    function update() {
      if (!gameActive || isPaused) return;

      // Move ball
      ballX += ballSpeedX;
      ballY += ballSpeedY;

      // Ball collision with top/bottom
      if (ballY <= 0 || ballY >= canvasHeight - 12) {
        ballSpeedY = -ballSpeedY;
      }

      // Ball collision with left paddle
      if (ballX <= 20 && ballX >= 15 &&
          ballY >= paddleLeftY - 6 && ballY <= paddleLeftY + paddleHeight + 6) {
        ballSpeedX = Math.abs(ballSpeedX) + 0.3;
        ballSpeedY += (ballY - (paddleLeftY + paddleHeight / 2)) * 0.15;
      }

      // Ball collision with right paddle
      if (ballX >= canvasWidth - 22 && ballX <= canvasWidth - 17 &&
          ballY >= paddleRightY - 6 && ballY <= paddleRightY + paddleHeight + 6) {
        ballSpeedX = -Math.abs(ballSpeedX) - 0.3;
        ballSpeedY += (ballY - (paddleRightY + paddleHeight / 2)) * 0.15;
      }

      // Score points
      if (ballX < 0) {
        scoreRight++;
        scoreRightEl.textContent = scoreRight.toString();
        resetBall('right');
      } else if (ballX > canvasWidth) {
        scoreLeft++;
        scoreLeftEl.textContent = scoreLeft.toString();
        resetBall('left');
      }

      // Update ball position
      ball.style.left = ballX + 'px';
      ball.style.top = ballY + 'px';

      // Move left paddle (player controlled)
      const targetY = mouseY - paddleHeight / 2;
      if (Math.abs(paddleLeftY - targetY) > 2) {
        paddleLeftY += (targetY - paddleLeftY) * 0.15;
      }
      paddleLeftY = Math.max(0, Math.min(canvasHeight - paddleHeight, paddleLeftY));
      paddleLeft.style.top = paddleLeftY + 'px';

      // AI for right paddle
      const aiTargetY = ballY - paddleHeight / 2;
      if (ballX > canvasWidth / 2) {
        if (Math.abs(paddleRightY - aiTargetY) > 1) {
          paddleRightY += (aiTargetY - paddleRightY) * 0.08;
        }
      } else {
        const centerY = (canvasHeight - paddleHeight) / 2;
        paddleRightY += (centerY - paddleRightY) * 0.05;
      }
      paddleRightY = Math.max(0, Math.min(canvasHeight - paddleHeight, paddleRightY));
      paddleRight.style.top = paddleRightY + 'px';
    }

    // Mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseY = e.clientY - rect.top;
    };

    // Touch movement
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      mouseY = e.touches[0].clientY - rect.top;
    };

    // Pause button
    const handlePause = (e: MouseEvent) => {
      e.stopPropagation();
      isPaused = !isPaused;
      pauseBtn.textContent = isPaused ? '▶' : '⏸';
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove);
    pauseBtn.addEventListener('click', handlePause);

    // Start game
    const gameLoop = setInterval(update, 1000 / 60);

    // Cleanup
    return () => {
      gameActive = false;
      clearInterval(gameLoop);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      pauseBtn.removeEventListener('click', handlePause);
    };
  }, [showPingPongModal]);

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
    console.log('[App] handleNewGame called - resetting all game state');

    // Reset race mode scores when exiting to home
    if (gameMode === 'race') {
      localStorage.setItem('raceScores', JSON.stringify({ humanWins: 0, aiWins: 0, ties: 0 }));
    }

    // Clear URL parameters
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.toString());

    // Reset all game state
    setGameId(null);
    setShowMultiplayerLobby(false);
    setMultiplayerRoomId(null);
    setMultiplayerPlayerId(null);
    setIsMultiplayerHost(false);
    setMultiplayerRoomState(null);

    console.log('[App] Game state reset complete');
  };

  const handleShowMultiplayer = () => {
    setShowMultiplayerLobby(true);
  };

  const handleMultiplayerBack = () => {
    setShowMultiplayerLobby(false);
  };

  const handleMultiplayerGameStart = (
    roomId: string,
    playerId: string,
    isHost: boolean,
    roomState: MultiplayerRoomState
  ) => {
    console.log('[App] ========== GAME START HANDLER ==========');
    console.log('[App] Starting multiplayer game with:');
    console.log('  roomId:', roomId);
    console.log('  playerId:', playerId);
    console.log('  isHost:', isHost);
    console.log('  roomState:', roomState);

    // Validate inputs
    if (!roomId || !playerId || !roomState) {
      console.error('[App] ERROR: Missing required data for game start!');
      alert('Error: Missing game data. Please try again.');
      handleNewGame();
      return;
    }

    // Use React's startTransition to batch state updates
    React.startTransition(() => {
      console.log('[App] Setting multiplayer state...');
      setShowMultiplayerLobby(false);
      setMultiplayerRoomId(roomId);
      setMultiplayerPlayerId(playerId);
      setIsMultiplayerHost(isHost);
      setMultiplayerRoomState(roomState);
      console.log('[App] State update dispatched');
    });

    // Update URL after state is set (in next tick)
    setTimeout(() => {
      if (roomState && roomState.roomCode) {
        const url = new URL(window.location.href);
        url.searchParams.set('mode', 'multiplayer');
        url.searchParams.set('code', roomState.roomCode);
        url.searchParams.set('game', 'active');
        window.history.replaceState({}, '', url.toString());
        console.log('[App] URL updated to:', url.toString());
      }
    }, 0);
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

  const handleCloseWelcomeModal = () => {
    localStorage.setItem('hasVisited', 'true');
    setShowWelcomeModal(false);
  };

  const handleShowInstructions = () => {
    setShowWelcomeModal(true);
  };

  const handleOpenFeedback = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowFeedbackModal(true);
    setFeedbackError('');
    setFeedbackSuccess(false);
  };

  const handleCloseFeedback = () => {
    setShowFeedbackModal(false);
    setFeedbackText('');
    setFeedbackEmail('');
    setFeedbackError('');
    setFeedbackSuccess(false);
  };

  const handleOpenPingPong = () => {
    setShowPingPongModal(true);
  };

  const handleClosePingPong = () => {
    setShowPingPongModal(false);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      setFeedbackError('Please enter your feedback');
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackError('');

    try {
      const response = await apiFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: feedbackText,
          email: feedbackEmail || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setFeedbackSuccess(true);
      setTimeout(() => {
        handleCloseFeedback();
      }, 2000);
    } catch (error) {
      setFeedbackError('Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
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
        <div className="header-buttons">
          <button
            onClick={handleOpenPingPong}
            className="pingpong-button"
            title="Play Ping Pong"
          >
            🏓
          </button>
          <button
            onClick={handleOpenFeedback}
            className="feedback-button"
            title="Send feedback"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button className="theme-toggle" onClick={toggleDarkMode} aria-label="Toggle dark mode">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {isDarkMode ? (
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
              ) : (
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
              )}
            </svg>
          </button>
        </div>
      </header>

      <main className="app-main container">
        {(() => {
          console.log('[App] ========== RENDER DECISION ==========');
          console.log('[App] State check:');
          console.log('  showMultiplayerLobby:', showMultiplayerLobby);
          console.log('  multiplayerRoomId:', multiplayerRoomId);
          console.log('  multiplayerPlayerId:', multiplayerPlayerId);
          console.log('  multiplayerRoomState:', multiplayerRoomState ? 'EXISTS' : 'NULL');
          console.log('  gameId:', gameId);

          // Multiplayer game in progress
          if (multiplayerRoomId && multiplayerPlayerId && multiplayerRoomState) {
            console.log('[App] ✅ Rendering MultiplayerGameBoard');
            return (
              <MultiplayerGameBoard
                roomId={multiplayerRoomId}
                playerId={multiplayerPlayerId}
                isHost={isMultiplayerHost}
                initialRoomState={multiplayerRoomState}
                onNewGame={handleNewGame}
              />
            );
          }

          // Check if we're waiting for multiplayer state to load
          if (multiplayerRoomId || multiplayerPlayerId) {
            console.log('[App] ⏳ Waiting for multiplayer state to fully load...');
            return (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                gap: '20px'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>MP</div>
                <div style={{ fontSize: '1.2rem' }}>Loading multiplayer game...</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  Room: {multiplayerRoomId ? 'Connected' : 'Connecting...'}
                </div>
                <button
                  onClick={handleNewGame}
                  style={{
                    marginTop: '20px',
                    padding: '10px 20px',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel and Return Home
                </button>
              </div>
            );
          }

          // Multiplayer lobby
          if (showMultiplayerLobby) {
            console.log('[App] ✅ Rendering MultiplayerLobby');
            return (
              <MultiplayerLobby
                onGameStart={handleMultiplayerGameStart}
                onBack={handleMultiplayerBack}
              />
            );
          }

          // Single player game in progress
          if (gameId) {
            console.log('[App] ✅ Rendering GameBoard');
            return (
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
            );
          }

          // Default: Game setup screen
          console.log('[App] ✅ Rendering GameSetup (default)');
          return (
            <GameSetup
              onGameStart={handleGameStart}
              onShowInstructions={handleShowInstructions}
              onShowMultiplayer={handleShowMultiplayer}
            />
          );
        })()}
      </main>

      <footer className="app-footer">
      </footer>

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="modal-overlay" onClick={handleCloseWelcomeModal}>
          <div className="modal-content welcome-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Welcome to AI Wordle Duel!</h2>
            </div>
            <div className="modal-body">

              <div className="instructions-section">
                <h3>Game Modes:</h3>
                <ul className="instructions-list">
                  <li><strong>Human Play:</strong> Classic Wordle - solve the puzzle on your own</li>
                  <li><strong>Race AI:</strong> Compete head-to-head with AI to solve first</li>
                  <li><strong>Challenge AI:</strong> Pick a word and watch the AI try to solve it</li>
                  <li><strong>Today's Wordle:</strong> Watch AI solve the daily puzzle</li>
                </ul>
              </div>

              <div className="instructions-section">
                <h3>How to Play:</h3>
                <ul className="instructions-list">
                  <li>Guess the word in 6 tries or less</li>
                  <li>Green tiles mean the letter is correct and in the right position</li>
                  <li>Yellow tiles mean the letter is in the word but wrong position</li>
                  <li>Gray tiles mean the letter is not in the word</li>
                </ul>
              </div>

              <div className="instructions-section">
                <h3>Choose Your Settings:</h3>
                <ul className="instructions-list">
                  <li><strong>Word Length:</strong> 3 to 7 letters</li>
                </ul>
              </div>

              <p className="loading-note">Note: First load may take a moment as the server initializes. Thank you for your patience!</p>
            </div>
            <div className="modal-actions">
              <button className="modal-button primary" onClick={handleCloseWelcomeModal}>
                Let's Play!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ping Pong Modal */}
      {showPingPongModal && (
        <div className="modal-overlay" onClick={handleClosePingPong}>
          <div className="modal-content pingpong-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ping Pong Game</h2>
              <button className="modal-close" onClick={handleClosePingPong}>×</button>
            </div>
            <div className="modal-body pingpong-body">
              <p className="pingpong-instructions">Move your mouse or tap to control the left paddle!</p>
              <div className="pingpong-game-canvas" id="pingPongCanvas">
                <div className="pingpong-pause-btn" id="pingPongPauseBtn">⏸</div>
                <div className="pingpong-center-line"></div>
                <div className="pingpong-paddle pingpong-paddle-left" id="pingPongPaddleLeft"></div>
                <div className="pingpong-paddle pingpong-paddle-right" id="pingPongPaddleRight"></div>
                <div className="pingpong-ball" id="pingPongBall"></div>
              </div>
              <div className="pingpong-game-score">You: <span id="pingPongScoreLeft">0</span> | AI: <span id="pingPongScoreRight">0</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={handleCloseFeedback}>
          <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Send Feedback</h2>
              <button className="modal-close" onClick={handleCloseFeedback}>×</button>
            </div>
            <div className="modal-body">
              {feedbackSuccess ? (
                <div className="feedback-success">
                  <p>✓ Thank you for your feedback!</p>
                  <p>Your feedback has been submitted successfully.</p>
                </div>
              ) : (
                <>
                  <p className="feedback-description">
                    Help us improve AI Wordle Duel! Share your thoughts, report bugs, or suggest features.
                  </p>
                  <div className="form-group">
                    <label htmlFor="feedback-text">Your Feedback *</label>
                    <textarea
                      id="feedback-text"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Tell us what you think..."
                      rows={6}
                      disabled={feedbackSubmitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="feedback-email">Email (optional)</label>
                    <input
                      id="feedback-email"
                      type="email"
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      placeholder="your@email.com (if you'd like a response)"
                      disabled={feedbackSubmitting}
                    />
                  </div>
                  {feedbackError && (
                    <div className="feedback-error">{feedbackError}</div>
                  )}
                </>
              )}
            </div>
            {!feedbackSuccess && (
              <div className="modal-actions">
                <button className="modal-button secondary" onClick={handleCloseFeedback} disabled={feedbackSubmitting}>
                  Cancel
                </button>
                <button className="modal-button primary" onClick={handleSubmitFeedback} disabled={feedbackSubmitting}>
                  {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default App;
