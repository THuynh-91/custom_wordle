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
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    // Show welcome modal only on first visit
    const hasVisited = localStorage.getItem('hasVisited');
    return !hasVisited;
  });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
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
        {!gameId ? (
          <GameSetup onGameStart={handleGameStart} onShowInstructions={handleShowInstructions} />
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
