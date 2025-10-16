/**
 * Game API routes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { WordService } from '../services/word-service.js';
import { GameEngine } from '../services/game-engine.js';
import { FrequencySolver } from '../services/solvers/frequency-solver.js';
import { EntropySolver } from '../services/solvers/entropy-solver.js';
import { TodaysWordleService } from '../services/todays-wordle-service.js';
import {
  CreateGameRequest,
  CreateGameResponse,
  SubmitGuessRequest,
  SubmitGuessResponse,
  ValidateWordRequest,
  ValidateWordResponse,
  GameState,
  RaceState,
  AIMoveResponse,
  SolverType,
  WordLength
} from '../../shared/types.js';
import { DEFAULT_MAX_GUESSES, ERROR_MESSAGES } from '../../shared/constants.js';

const router = express.Router();

// In-memory game storage (use Redis in production)
const games = new Map<string, GameState>();
const raceGames = new Map<string, RaceState>();

/**
 * Create a new game
 */
router.post('/create', async (req, res) => {
  try {
    const request: CreateGameRequest = req.body;
    const { mode, length, hardMode = false, secret, seed, solverType = 'entropy' } = request;

    // Validate length
    if (![3, 4, 5, 6, 7].includes(length)) {
      return res.status(400).json({
        error: 'Invalid Length',
        message: ERROR_MESSAGES.INVALID_WORD_LENGTH(length)
      });
    }

    // Determine secret word
    let secretWord: string;

    if (mode === 'todays-wordle') {
      // Get today's official Wordle answer
      secretWord = await TodaysWordleService.getTodaysAnswer();
      secretWord = secretWord.toLowerCase();
    } else if (mode === 'custom-challenge' && secret) {
      // Validate custom secret
      if (!WordService.isValidAnswer(secret, length)) {
        return res.status(400).json({
          error: 'Invalid Word',
          message: ERROR_MESSAGES.WORD_NOT_IN_LIST(secret)
        });
      }
      secretWord = secret.toLowerCase();
    } else if (seed) {
      // Use seeded random
      secretWord = WordService.getSeededAnswer(length, seed);
    } else {
      // Random word
      secretWord = WordService.getRandomAnswer(length);
    }

    // Create game state
    const gameId = uuidv4();

    // Race mode uses separate storage
    if (mode === 'race') {
      const raceState: RaceState = {
        gameId,
        secret: secretWord,
        length,
        humanGuesses: [],
        aiGuesses: [],
        humanStatus: 'in-progress',
        aiStatus: 'in-progress',
        solverType: solverType || 'entropy',
        currentTurn: Math.random() < 0.5 ? 'human' : 'ai', // Randomly decide who goes first
        maxGuesses: DEFAULT_MAX_GUESSES,
        startedAt: Date.now()
      };
      raceGames.set(gameId, raceState);
    } else {
      const gameState: GameState = {
        gameId,
        mode,
        length,
        secret: secretWord,
        maxGuesses: DEFAULT_MAX_GUESSES,
        hardMode,
        guesses: [],
        status: 'in-progress',
        startedAt: Date.now()
      };
      games.set(gameId, gameState);
    }

    // Create response
    const response: CreateGameResponse = {
      gameId,
      mode,
      length,
      maxGuesses: DEFAULT_MAX_GUESSES,
      hardMode,
      challengeLink: seed ? `${process.env.FRONTEND_URL}/challenge/${seed}/${length}` : undefined
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * Submit a guess
 */
router.post('/:gameId/guess', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { word }: SubmitGuessRequest = req.body;

    // Check if this is a race game
    const raceGame = raceGames.get(gameId);
    if (raceGame) {
      // Handle race mode guess
      if (raceGame.humanStatus !== 'in-progress') {
        return res.status(400).json({
          error: 'Game Ended',
          message: 'Your game has ended'
        });
      }

      if (raceGame.currentTurn !== 'human') {
        return res.status(400).json({
          error: 'Not Your Turn',
          message: 'Wait for AI to complete their turn'
        });
      }

      // Validate guess
      const normalizedGuess = word.toLowerCase().trim();

      if (normalizedGuess.length !== raceGame.length) {
        return res.status(400).json({
          error: 'Invalid Guess',
          message: ERROR_MESSAGES.INVALID_GUESS_LENGTH(raceGame.length, normalizedGuess.length)
        });
      }

      if (!WordService.isValidGuess(normalizedGuess, raceGame.length)) {
        return res.status(400).json({
          error: 'Invalid Word',
          message: ERROR_MESSAGES.WORD_NOT_IN_LIST(normalizedGuess)
        });
      }

      // Generate feedback
      const feedback = GameEngine.generateFeedback(normalizedGuess, raceGame.secret);
      const isWin = GameEngine.isWin(feedback);
      const isLoss = raceGame.humanGuesses.length + 1 >= raceGame.maxGuesses && !isWin;

      // Update race state
      raceGame.humanGuesses.push({
        guess: normalizedGuess,
        feedback,
        timestamp: Date.now()
      });

      if (isWin) {
        raceGame.humanStatus = 'won';
        if (raceGame.aiStatus !== 'in-progress') {
          raceGame.completedAt = Date.now();
        }
      } else if (isLoss) {
        raceGame.humanStatus = 'lost';
        if (raceGame.aiStatus !== 'in-progress') {
          raceGame.completedAt = Date.now();
        }
      }

      // Switch turn to AI
      raceGame.currentTurn = 'ai';

      // Create response
      const response: SubmitGuessResponse = {
        feedback,
        status: raceGame.humanStatus,
        guessNumber: raceGame.humanGuesses.length,
        remainingGuesses: raceGame.maxGuesses - raceGame.humanGuesses.length,
        secret: raceGame.humanStatus !== 'in-progress' && raceGame.aiStatus !== 'in-progress' ? raceGame.secret : undefined
      };

      return res.json(response);
    }

    // Normal game mode
    const game = games.get(gameId);

    if (!game) {
      return res.status(404).json({
        error: 'Not Found',
        message: ERROR_MESSAGES.GAME_NOT_FOUND(gameId)
      });
    }

    if (game.status !== 'in-progress') {
      return res.status(400).json({
        error: 'Game Ended',
        message: ERROR_MESSAGES.GAME_ALREADY_ENDED
      });
    }

    // Validate guess
    const normalizedGuess = word.toLowerCase().trim();

    if (normalizedGuess.length !== game.length) {
      return res.status(400).json({
        error: 'Invalid Guess',
        message: ERROR_MESSAGES.INVALID_GUESS_LENGTH(game.length, normalizedGuess.length)
      });
    }

    if (!WordService.isValidGuess(normalizedGuess, game.length)) {
      return res.status(400).json({
        error: 'Invalid Word',
        message: ERROR_MESSAGES.WORD_NOT_IN_LIST(normalizedGuess)
      });
    }

    // Check hard mode constraints
    if (game.hardMode && game.guesses.length > 0) {
      const constraints = GameEngine.buildConstraints(game.guesses);
      const hardModeCheck = GameEngine.checkHardMode(normalizedGuess, constraints);

      if (!hardModeCheck.valid) {
        return res.status(400).json({
          error: 'Hard Mode Violation',
          message: ERROR_MESSAGES.HARD_MODE_VIOLATION(hardModeCheck.reason || 'Unknown')
        });
      }
    }

    // Generate feedback
    const feedback = GameEngine.generateFeedback(normalizedGuess, game.secret);
    const isWin = GameEngine.isWin(feedback);
    const isLoss = game.guesses.length + 1 >= game.maxGuesses && !isWin;

    // Update game state
    game.guesses.push({
      guess: normalizedGuess,
      feedback,
      timestamp: Date.now()
    });

    if (isWin) {
      game.status = 'won';
      game.completedAt = Date.now();
    } else if (isLoss) {
      game.status = 'lost';
      game.completedAt = Date.now();
    }

    // Create response
    const response: SubmitGuessResponse = {
      feedback,
      status: game.status,
      guessNumber: game.guesses.length,
      remainingGuesses: game.maxGuesses - game.guesses.length,
      secret: game.status !== 'in-progress' ? game.secret : undefined
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error submitting guess:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * Get AI move
 */
router.get('/:gameId/ai-move', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { solverType = 'entropy' } = req.query;

    // Check if this is a race game
    const raceGame = raceGames.get(gameId);
    if (raceGame) {
      // Handle race mode AI move
      if (raceGame.aiStatus !== 'in-progress') {
        return res.status(400).json({
          error: 'Game Ended',
          message: 'AI game has ended'
        });
      }

      if (raceGame.currentTurn !== 'ai') {
        return res.status(400).json({
          error: 'Not AI Turn',
          message: 'It is the human\'s turn'
        });
      }

      // Build constraints and filter candidates based on BOTH AI's and human's guesses
      // In turn-based race mode, AI can see all human guesses and their feedback
      const allAnswers = WordService.getAnswerWords(raceGame.length);
      const allGuesses = WordService.getGuessWords(raceGame.length);

      let candidates: string[];
      if (raceGame.aiGuesses.length === 0 && raceGame.humanGuesses.length === 0) {
        // First move - all answers are candidates
        candidates = allAnswers;
      } else {
        // Combine BOTH AI's and human's guesses to build constraints
        // This allows AI to learn from both players' feedback for optimal play
        const combinedGuesses = [...raceGame.aiGuesses, ...raceGame.humanGuesses];
        const constraints = GameEngine.buildConstraints(combinedGuesses);
        candidates = GameEngine.filterCandidates(allAnswers, constraints);
      }

      // Get all previously guessed words to avoid repeating
      const alreadyGuessed = new Set([
        ...raceGame.aiGuesses.map(g => g.guess),
        ...raceGame.humanGuesses.map(g => g.guess)
      ]);

      // Filter out already guessed words from candidates
      candidates = candidates.filter(word => !alreadyGuessed.has(word));

      if (candidates.length === 0) {
        return res.status(500).json({
          error: 'No Candidates',
          message: 'No valid candidates remain'
        });
      }

      // Get solver
      let solver;
      switch (raceGame.solverType) {
        case 'frequency':
          solver = new FrequencySolver(raceGame.length, candidates, allGuesses);
          break;
        case 'entropy':
        default:
          solver = new EntropySolver(raceGame.length, candidates, allGuesses);
          break;
      }

      // Get move - pass COMBINED guess history so AI knows about human's guesses
      // This prevents AI from using precomputed first guess if human already played
      const combinedGuessHistory = [...raceGame.humanGuesses, ...raceGame.aiGuesses];
      const move = solver.getNextMove(combinedGuessHistory, candidates);

      // Generate feedback
      const feedback = GameEngine.generateFeedback(move.guess, raceGame.secret);
      const isWin = GameEngine.isWin(feedback);
      const isLoss = raceGame.aiGuesses.length + 1 >= raceGame.maxGuesses && !isWin;

      // Update race state
      raceGame.aiGuesses.push({
        guess: move.guess,
        feedback,
        timestamp: Date.now()
      });

      if (isWin) {
        raceGame.aiStatus = 'won';
        if (raceGame.humanStatus !== 'in-progress') {
          raceGame.completedAt = Date.now();
        }
      } else if (isLoss) {
        raceGame.aiStatus = 'lost';
        if (raceGame.humanStatus !== 'in-progress') {
          raceGame.completedAt = Date.now();
        }
      }

      // Switch turn back to human
      raceGame.currentTurn = 'human';

      // Calculate remaining candidates using COMBINED guesses for accuracy
      const updatedCombinedGuesses = [...raceGame.humanGuesses, ...raceGame.aiGuesses];
      const newConstraints = GameEngine.buildConstraints(updatedCombinedGuesses);
      const newCandidates = GameEngine.filterCandidates(allAnswers, newConstraints);

      // Create response
      const response: AIMoveResponse = {
        guess: move.guess,
        feedback,
        explanation: {
          ...move.explanation,
          candidateCountAfter: newCandidates.length
        },
        remainingCandidates: newCandidates.length,
        status: raceGame.aiStatus,
        secret: raceGame.humanStatus !== 'in-progress' && raceGame.aiStatus !== 'in-progress' ? raceGame.secret : undefined
      };

      return res.json(response);
    }

    // Normal game mode
    const game = games.get(gameId);

    if (!game) {
      return res.status(404).json({
        error: 'Not Found',
        message: ERROR_MESSAGES.GAME_NOT_FOUND(gameId)
      });
    }

    if (game.status !== 'in-progress') {
      return res.status(400).json({
        error: 'Game Ended',
        message: ERROR_MESSAGES.GAME_ALREADY_ENDED
      });
    }

    // Build constraints and filter candidates
    const allAnswers = WordService.getAnswerWords(game.length);
    const allGuesses = WordService.getGuessWords(game.length);

    let candidates: string[];
    if (game.guesses.length === 0) {
      // First move - all answers are candidates
      candidates = allAnswers;
    } else {
      const constraints = GameEngine.buildConstraints(game.guesses);
      candidates = GameEngine.filterCandidates(allAnswers, constraints);
    }

    if (candidates.length === 0) {
      return res.status(500).json({
        error: 'No Candidates',
        message: 'No valid candidates remain (this should not happen)'
      });
    }

    // Get solver
    let solver;
    switch (solverType) {
      case 'frequency':
        solver = new FrequencySolver(game.length, candidates, allGuesses);
        break;
      case 'entropy':
      default:
        solver = new EntropySolver(game.length, candidates, allGuesses);
        break;
    }

    // Get move
    const move = solver.getNextMove(game.guesses, candidates);

    // Generate feedback
    const feedback = GameEngine.generateFeedback(move.guess, game.secret);
    const isWin = GameEngine.isWin(feedback);
    const isLoss = game.guesses.length + 1 >= game.maxGuesses && !isWin;

    // Update game state
    game.guesses.push({
      guess: move.guess,
      feedback,
      timestamp: Date.now()
    });

    if (isWin) {
      game.status = 'won';
      game.completedAt = Date.now();
    } else if (isLoss) {
      game.status = 'lost';
      game.completedAt = Date.now();
    }

    // Calculate remaining candidates after this move
    const newConstraints = GameEngine.buildConstraints(game.guesses);
    const newCandidates = GameEngine.filterCandidates(allAnswers, newConstraints);

    // Create response
    const response: AIMoveResponse = {
      guess: move.guess,
      feedback,
      explanation: {
        ...move.explanation,
        candidateCountAfter: newCandidates.length
      },
      remainingCandidates: newCandidates.length,
      status: game.status,
      secret: game.status !== 'in-progress' ? game.secret : undefined
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error getting AI move:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * Validate a word
 */
router.post('/:gameId/validate', async (req, res) => {
  try {
    const { word, length }: ValidateWordRequest = req.body;

    if (![3, 4, 5, 6, 7].includes(length)) {
      return res.status(400).json({
        error: 'Invalid Length',
        message: ERROR_MESSAGES.INVALID_WORD_LENGTH(length)
      });
    }

    const normalizedWord = word.toLowerCase().trim();
    const valid = WordService.isValidGuess(normalizedWord, length as WordLength);

    const response: ValidateWordResponse = {
      valid,
      reason: valid ? undefined : `"${word}" is not in the valid word list`
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error validating word:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * Get game state
 */
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    // Check for race game first
    const raceGame = raceGames.get(gameId);
    if (raceGame) {
      const bothEnded = raceGame.humanStatus !== 'in-progress' && raceGame.aiStatus !== 'in-progress';
      const response = {
        ...raceGame,
        secret: bothEnded ? raceGame.secret : undefined
      };
      return res.json(response);
    }

    const game = games.get(gameId);

    if (!game) {
      return res.status(404).json({
        error: 'Not Found',
        message: ERROR_MESSAGES.GAME_NOT_FOUND(gameId)
      });
    }

    // Don't expose secret unless game is over
    const response = {
      ...game,
      secret: game.status !== 'in-progress' ? game.secret : undefined
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error getting game:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

export default router;
