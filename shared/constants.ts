/**
 * Shared constants for AI Wordle Duel
 */

import { WordLength, TileState } from './types.js';

// Word length configuration
export const MIN_WORD_LENGTH: WordLength = 3;
export const MAX_WORD_LENGTH: WordLength = 7;
export const VALID_WORD_LENGTHS: readonly WordLength[] = [3, 4, 5, 6, 7] as const;

// Game configuration
export const DEFAULT_MAX_GUESSES = 6;
export const DEFAULT_WORD_LENGTH: WordLength = 5;

// Tile state constants
export const TILE_STATES: Record<string, TileState> = {
  CORRECT: 'correct',
  PRESENT: 'present',
  ABSENT: 'absent',
  EMPTY: 'empty',
} as const;

// Tile state display characters (for sharing results)
export const TILE_EMOJI: Record<TileState, string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
  empty: '⬛',
};

// API endpoints
export const API_BASE = '/api';
export const API_ENDPOINTS = {
  CREATE_GAME: `${API_BASE}/game/create`,
  SUBMIT_GUESS: (gameId: string) => `${API_BASE}/game/${gameId}/guess`,
  AI_MOVE: (gameId: string) => `${API_BASE}/game/${gameId}/ai-move`,
  VALIDATE_WORD: (gameId: string) => `${API_BASE}/game/${gameId}/validate`,
  GET_GAME: (gameId: string) => `${API_BASE}/game/${gameId}`,
  LEADERBOARD: (length: WordLength) => `${API_BASE}/leaderboard/${length}`,
  RANDOM_WORD: (length: WordLength) => `${API_BASE}/words/random/${length}`,
  STATS: `${API_BASE}/stats`,
} as const;

// Solver configuration
export const SOLVER_TYPES = ['frequency', 'entropy', 'ml', 'rl', 'hybrid'] as const;

export const SOLVER_NAMES: Record<string, string> = {
  frequency: 'Frequency Heuristic',
  entropy: 'Entropy/Information Gain',
  ml: 'ML Policy (Supervised)',
  rl: 'RL Policy (Fine-tuned)',
  hybrid: 'Hybrid (Bi-level)',
};

export const SOLVER_DESCRIPTIONS: Record<string, string> = {
  frequency: 'Uses letter and positional frequency analysis to make educated guesses',
  entropy: 'Maximizes expected information gain to reduce candidate set most efficiently',
  ml: 'Neural network trained on expert trajectories from entropy solver',
  rl: 'Reinforcement learning policy fine-tuned with PPO for optimal performance',
  hybrid: 'Combines information gain early with answer likelihood later',
};

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 100;

// Cache configuration
export const CACHE_TTL = {
  GAME_STATE: 3600, // 1 hour
  WORD_LISTS: 86400, // 24 hours
  FREQUENCY_DATA: 86400, // 24 hours
  LEADERBOARD: 300, // 5 minutes
};

// Storage paths
export const DATA_PATHS = {
  WORDS: './data/words',
  FREQUENCIES: './data/frequencies',
  TRAJECTORIES: './data/trajectories',
  MODELS: './ml/models',
};

// File naming conventions
export const WORD_LIST_FILES = {
  ANSWER: (length: WordLength) => `${DATA_PATHS.WORDS}/${length}-letters-answer.txt`,
  GUESS: (length: WordLength) => `${DATA_PATHS.WORDS}/${length}-letters-guess.txt`,
  FREQUENCY: (length: WordLength) => `${DATA_PATHS.FREQUENCIES}/${length}-letters-freq.json`,
};

// ML configuration
export const ML_CONFIG = {
  MAX_VOCAB_SIZE: 50000,
  MAX_HISTORY_LENGTH: 6,
  EMBEDDING_DIM: 128,
  HIDDEN_SIZE: 256,
  BATCH_SIZE: 64,
  LEARNING_RATE: 0.001,
  EPOCHS: 50,
};

// RL configuration
export const RL_CONFIG = {
  GAMMA: 0.99,
  LAMBDA: 0.95,
  CLIP_EPSILON: 0.2,
  VALUE_LOSS_COEF: 0.5,
  ENTROPY_COEF: 0.01,
  MAX_GRAD_NORM: 0.5,
};

// Reward shaping for RL
export const REWARDS = {
  WIN: 10,
  LOSS: -5,
  GUESS_PENALTY: -0.5,
  INFO_GAIN_BONUS: 0.1,
};

// Alphabet
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

// Validation
export const VALIDATION = {
  MIN_PLAYER_NAME_LENGTH: 2,
  MAX_PLAYER_NAME_LENGTH: 20,
  PROFANITY_FILTER_ENABLED: true,
};

// Challenge link configuration
export const CHALLENGE_BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const CHALLENGE_PATH = '/challenge';

// Error messages
export const ERROR_MESSAGES = {
  INVALID_WORD_LENGTH: (length: number) =>
    `Invalid word length: ${length}. Must be between ${MIN_WORD_LENGTH} and ${MAX_WORD_LENGTH}`,
  WORD_NOT_IN_LIST: (word: string) =>
    `Word "${word}" is not in the valid word list`,
  GAME_NOT_FOUND: (gameId: string) =>
    `Game ${gameId} not found`,
  GAME_ALREADY_ENDED: 'Game has already ended',
  INVALID_GUESS_LENGTH: (expected: number, actual: number) =>
    `Guess must be ${expected} letters long, got ${actual}`,
  HARD_MODE_VIOLATION: (reason: string) =>
    `Hard mode violation: ${reason}`,
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later',
  INVALID_SOLVER_TYPE: (type: string) =>
    `Invalid solver type: ${type}`,
};

// Success messages
export const SUCCESS_MESSAGES = {
  GAME_WON: 'Congratulations! You won!',
  AI_WON: 'The AI has solved the puzzle!',
  GAME_LOST: 'Better luck next time!',
  AI_LOST: 'The AI failed to solve the puzzle!',
};
