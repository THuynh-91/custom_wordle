/**
 * Game API routes
 */

import express from 'express';
import { z } from 'zod';
import { RateLimiterMemory } from 'rate-limiter-flexible';
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
 * Backstop for the AI-move endpoint, which runs a full entropy search (~50-120ms
 * of blocking CPU per call on the single free-tier instance).
 *
 * This is NOT a usage quota. The frontend paces the AI ~1.5s apart, so a person
 * cannot exceed ~40/min from one tab; the ceiling below is an order of magnitude
 * past that and exists purely so a hot loop cannot wedge the event loop. The
 * original budget was 10/min — less than two games — which made the AI die
 * mid-board with "Failed to get AI move" whenever a second game started inside
 * the same minute. Override with AI_MOVE_RATE_LIMIT_PER_MIN.
 */
const AI_MOVE_RATE_LIMIT_PER_MIN =
  Number(process.env.AI_MOVE_RATE_LIMIT_PER_MIN) || 600;
const aiMoveRateLimiter = new RateLimiterMemory({
  points: AI_MOVE_RATE_LIMIT_PER_MIN,
  duration: 60,
});

// ---- Validation schemas (mirror shared/types.ts shapes) --------------------

const WORD_LENGTHS = [3, 4, 5, 6, 7] as const;
const GAME_MODES = [
  'custom-challenge',
  'human-play',
  'race',
  'ai-vs-ai',
  'todays-wordle',
  'multiplayer-challenge',
] as const;
const SOLVER_TYPES = ['frequency', 'entropy', 'ml', 'rl', 'hybrid'] as const;

// A word/guess: letters only (a-z, case-insensitive), 3-7 chars. Per-length
// exact matching is enforced downstream against the word lists.
const wordString = z
  .string()
  .trim()
  .regex(/^[a-zA-Z]{3,7}$/, 'Word must be 3-7 alphabetic characters');

// Game ids are UUIDs created via uuidv4().
const gameIdParamSchema = z.string().uuid('Invalid game id');

const lengthSchema = z
  .number()
  .int()
  .refine((n) => (WORD_LENGTHS as readonly number[]).includes(n), {
    message: 'length must be one of 3, 4, 5, 6, 7',
  });

const createGameSchema = z.object({
  mode: z.enum(GAME_MODES),
  length: lengthSchema,
  hardMode: z.boolean().optional(),
  secret: wordString.optional(),
  seed: z.string().trim().min(1).max(128).optional(),
  solverType: z.enum(SOLVER_TYPES).optional(),
});

const submitGuessSchema = z.object({
  word: wordString,
});

const validateWordSchema = z.object({
  word: wordString,
  length: lengthSchema,
});

const solverTypeQuerySchema = z.enum(SOLVER_TYPES).default('entropy');

/**
 * Return `words` guaranteed to contain `secret`.
 *
 * Today's Wordle answer is fetched live from the NYT API and is NOT validated
 * against our local word lists (it can't be — the whole point is to mirror NYT).
 * NYT occasionally uses a word we don't carry (e.g. "intel" on 2026-08-30).
 * Filtering a candidate pool that cannot contain the secret narrows to ZERO
 * candidates after a few guesses, which surfaced as a 500 "No valid candidates
 * remain" and therefore "Failed to get AI move" for the rest of the game.
 *
 * WordService returns a fresh array per call, so appending here is safe and does
 * not pollute the shared word lists.
 */
function poolIncludingSecret(words: string[], secret: string): string[] {
  return words.includes(secret) ? words : [...words, secret];
}

/**
 * Validate the :gameId param. Returns the id or null (and sends 400) if invalid.
 */
function parseGameId(req: express.Request, res: express.Response): string | null {
  const parsed = gameIdParamSchema.safeParse(req.params.gameId);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid Request',
      message: parsed.error.errors[0]?.message || 'Invalid game id',
    });
    return null;
  }
  return parsed.data;
}

/**
 * Create a new game
 */
router.post('/create', async (req, res) => {
  try {
    const parsed = createGameSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: parsed.error.errors[0]?.message || 'Invalid create game request',
      });
    }

    const request: CreateGameRequest = parsed.data as CreateGameRequest;
    const { mode, length, hardMode = false, secret, seed, solverType = 'entropy' } = request;

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
    const gameId = parseGameId(req, res);
    if (gameId === null) return;

    const parsedBody = submitGuessSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: parsedBody.error.errors[0]?.message || 'Invalid guess',
      });
    }
    const { word }: SubmitGuessRequest = parsedBody.data;

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
        // A win ends the RACE, not just the winner's board. The AI cannot catch
        // up, and giving it another turn used to break outright: the human's
        // all-green guess narrows the AI's pool to exactly the secret, which is
        // then dropped as already-guessed, leaving zero candidates and a 500
        // that reached the player as "Failed to get AI move" on every win.
        if (raceGame.aiStatus === 'in-progress') {
          raceGame.aiStatus = 'lost';
        }
        raceGame.completedAt = Date.now();
      } else if (isLoss) {
        raceGame.humanStatus = 'lost';
        if (raceGame.aiStatus !== 'in-progress') {
          raceGame.completedAt = Date.now();
        }
      }

      // Hand the turn to the AI, unless the race is already decided.
      if (raceGame.aiStatus === 'in-progress') {
        raceGame.currentTurn = 'ai';
      }

      // Create response
      const response: SubmitGuessResponse = {
        feedback,
        status: raceGame.humanStatus,
        guessNumber: raceGame.humanGuesses.length,
        remainingGuesses: raceGame.maxGuesses - raceGame.humanGuesses.length,
        secret: raceGame.humanStatus !== 'in-progress' ? raceGame.secret : undefined
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

    // The secret is always a legal guess, even when it came from the NYT API and
    // is missing from our local list (see poolIncludingSecret) — otherwise typing
    // the correct answer would be rejected as "not in the word list".
    if (normalizedGuess !== game.secret && !WordService.isValidGuess(normalizedGuess, game.length)) {
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
    // Stricter per-IP limit: this endpoint runs full entropy evaluation.
    const rlKey = req.ip || req.socket.remoteAddress || 'unknown';
    try {
      await aiMoveRateLimiter.consume(rlKey);
    } catch (rejection: any) {
      // Tell the client how long to wait so it can retry instead of failing the
      // move outright.
      const retryAfterSec = Math.max(1, Math.ceil((rejection?.msBeforeNext ?? 60_000) / 1000));
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: 'Too Many Requests',
        message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
        retryAfter: retryAfterSec,
      });
    }

    const gameId = parseGameId(req, res);
    if (gameId === null) return;

    const parsedSolver = solverTypeQuerySchema.safeParse(req.query.solverType ?? 'entropy');
    if (!parsedSolver.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: ERROR_MESSAGES.INVALID_SOLVER_TYPE(String(req.query.solverType)),
      });
    }
    const solverType = parsedSolver.data;

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
      const allAnswers = poolIncludingSecret(
        WordService.getAnswerWords(raceGame.length),
        raceGame.secret
      );
      const allGuesses = poolIncludingSecret(
        WordService.getGuessWords(raceGame.length),
        raceGame.secret
      );

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
        // Nothing left the AI could legally guess means the race is over (the
        // secret has already been played). That is a finished game, not a server
        // fault, so retire the AI cleanly instead of returning a 500.
        raceGame.aiStatus = 'lost';
        raceGame.completedAt = Date.now();
        return res.status(400).json({
          error: 'Game Ended',
          message: 'The race is already decided'
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
      // Turn budget must come from the AI's OWN guess count — the combined history
      // above includes the human's guesses and would understate the turns left.
      const aiGuessesRemaining = raceGame.maxGuesses - raceGame.aiGuesses.length;
      const move = solver.getNextMove(combinedGuessHistory, candidates, aiGuessesRemaining);

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
        secret: raceGame.aiStatus !== 'in-progress' ? raceGame.secret : undefined
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
    const allAnswers = poolIncludingSecret(WordService.getAnswerWords(game.length), game.secret);
    const allGuesses = poolIncludingSecret(WordService.getGuessWords(game.length), game.secret);

    let candidates: string[];
    if (game.guesses.length === 0) {
      // First move - all answers are candidates
      candidates = allAnswers;
    } else {
      const constraints = GameEngine.buildConstraints(game.guesses);
      candidates = GameEngine.filterCandidates(allAnswers, constraints);
    }

    if (candidates.length === 0) {
      // Unreachable: poolIncludingSecret guarantees the secret is in the pool, and
      // the secret always satisfies feedback derived from itself.
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
    const move = solver.getNextMove(
      game.guesses,
      candidates,
      game.maxGuesses - game.guesses.length
    );

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
    const parsedBody = validateWordSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: parsedBody.error.errors[0]?.message || 'Invalid validate request',
      });
    }
    const { word, length }: ValidateWordRequest = parsedBody.data as ValidateWordRequest;

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
    const gameId = parseGameId(req, res);
    if (gameId === null) return;

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
