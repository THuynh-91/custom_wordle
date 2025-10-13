/**
 * Shared TypeScript types for AI Wordle Duel
 */

// Tile feedback states
export type TileState = 'correct' | 'present' | 'absent' | 'empty';

// Word lengths supported
export type WordLength = 3 | 4 | 5 | 6 | 7;

// Game modes
export type GameMode = 'custom-challenge' | 'human-play' | 'race' | 'ai-vs-ai';

// AI solver types
export type SolverType = 'frequency' | 'entropy' | 'ml' | 'rl' | 'hybrid';

// Game feedback for a single guess
export interface GuessFeedback {
  guess: string;
  feedback: TileState[];
  timestamp: number;
}

// Game state
export interface GameState {
  gameId: string;
  mode: GameMode;
  length: WordLength;
  secret: string; // Server-side only, never exposed to client
  maxGuesses: number;
  hardMode: boolean;
  guesses: GuessFeedback[];
  status: 'in-progress' | 'won' | 'lost';
  startedAt: number;
  completedAt?: number;
}

// Constraint tracking for AI solvers
export interface LetterConstraint {
  minCount: number;
  maxCount: number;
  positions: {
    mustBe: Set<number>;
    cannotBe: Set<number>;
  };
}

export interface GameConstraints {
  length: number;
  letterConstraints: Map<string, LetterConstraint>;
  positionConstraints: (string | null)[]; // null means unknown, string means must be this letter
}

// AI move explanation
export interface AIMoveExplanation {
  chosenGuess: string;
  reasoning: string;
  candidateCountBefore: number;
  candidateCountAfter?: number;
  expectedPartitionSize?: number;
  topAlternatives: Array<{
    word: string;
    score: number;
    reason: string;
  }>;
  computationTimeMs: number;
}

// AI move response
export interface AIMoveResponse {
  guess: string;
  feedback: TileState[];
  explanation: AIMoveExplanation;
  remainingCandidates: number;
  status: 'in-progress' | 'won' | 'lost';
  secret?: string;
}

// Create game request
export interface CreateGameRequest {
  mode: GameMode;
  length: WordLength;
  hardMode?: boolean;
  secret?: string; // For custom-challenge mode
  seed?: string; // For reproducible random games
  solverType?: SolverType;
}

// Create game response
export interface CreateGameResponse {
  gameId: string;
  mode: GameMode;
  length: WordLength;
  maxGuesses: number;
  hardMode: boolean;
  challengeLink?: string; // For sharing
}

// Submit guess request
export interface SubmitGuessRequest {
  word: string;
}

// Submit guess response
export interface SubmitGuessResponse {
  feedback: TileState[];
  status: 'in-progress' | 'won' | 'lost';
  guessNumber: number;
  remainingGuesses: number;
  secret?: string; // Only returned when game ends
}

// Validate word request
export interface ValidateWordRequest {
  word: string;
  length: WordLength;
}

// Validate word response
export interface ValidateWordResponse {
  valid: boolean;
  reason?: string;
}

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  avgGuesses: number;
  winRate: number;
  gamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
}

// Statistics
export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[]; // Index = number of guesses - 1
  avgGuesses: number;
  winRate: number;
  statsByLength: Record<WordLength, {
    played: number;
    won: number;
    avgGuesses: number;
  }>;
}

// Word frequency data
export interface WordFrequencyData {
  word: string;
  frequency: number;
  rank: number;
}

// Letter frequency for a specific length
export interface LetterFrequency {
  letter: string;
  totalFrequency: number;
  positionalFrequency: number[]; // Frequency at each position
}

// Training trajectory for ML
export interface TrainingTrajectory {
  length: WordLength;
  secret: string;
  guesses: string[];
  feedbacks: TileState[][];
  won: boolean;
  solverType: SolverType;
  timestamp: number;
}

// ML model input features
export interface MLFeatures {
  length: number;
  guessHistory: string[];
  feedbackHistory: TileState[][];
  candidateMask: boolean[]; // Which words in vocabulary are still candidates
  letterCounts: Record<string, number>;
  positionConstraints: (string | null)[];
  guessNumber: number;
}

// Race mode state
export interface RaceState {
  gameId: string;
  secret: string;
  length: WordLength;
  humanGuesses: GuessFeedback[];
  aiGuesses: GuessFeedback[];
  humanStatus: 'in-progress' | 'won' | 'lost';
  aiStatus: 'in-progress' | 'won' | 'lost';
  solverType: SolverType;
  currentTurn: 'human' | 'ai'; // Track whose turn it is
  maxGuesses: number;
  startedAt: number;
  completedAt?: number;
}

// Error response
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}
