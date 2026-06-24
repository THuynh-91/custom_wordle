/**
 * Frequency-based solver
 * Uses letter and positional frequency to make guesses
 */

import { BaseSolver, SolverMove } from './base-solver.js';
import { WordLength, GuessFeedback } from '../../../shared/types.js';
import { WordService } from '../word-service.js';

// Module-level cache of the best opening guess per word length.
// The opener is independent of game state (it's purely a function of the full
// candidate list + frequency data for that length), so it is safe to compute
// once and reuse across every fresh game. JavaScript executes synchronously on a
// single thread, so a plain Map populated under that model is inherently safe for
// repeated/concurrent solver calls -- there is no torn-read risk and at worst the
// (deterministic) computation runs twice before the entry is stored.
const OPENING_MOVE_CACHE: Map<WordLength, SolverMove> = new Map();

export class FrequencySolver extends BaseSolver {
  private frequencyData: Record<string, { total: number; positions: number[] }>;

  constructor(length: WordLength, candidates: string[], allGuesses: string[]) {
    super(length, candidates, allGuesses);
    this.frequencyData = WordService.getFrequencies(length);
  }

  getName(): string {
    return 'Frequency Heuristic';
  }

  getNextMove(guessHistory: GuessFeedback[], candidatesRemaining: string[]): SolverMove {
    const startTime = Date.now();

    // If only one candidate left, return it
    if (candidatesRemaining.length === 1) {
      return {
        guess: candidatesRemaining[0],
        explanation: {
          chosenGuess: candidatesRemaining[0],
          reasoning: 'Only one possible word remaining',
          candidateCountBefore: 1,
          remainingCandidates: candidatesRemaining,
          topAlternatives: [],
          computationTimeMs: Date.now() - startTime
        }
      };
    }

    // OPTIMIZATION: the opening move scans the entire candidate list (321ms for
    // 6-letter, 719ms for 7-letter). Since the opener only depends on word length,
    // compute it once per length and memoize. Detect the opening move by an empty
    // guess history.
    if (guessHistory.length === 0) {
      const cached = OPENING_MOVE_CACHE.get(this.length);
      if (cached) {
        // Return a fresh copy so callers can't mutate the cached entry, and report
        // the (near-zero) lookup time rather than the original computation time.
        return {
          guess: cached.guess,
          explanation: {
            ...cached.explanation,
            remainingCandidates: candidatesRemaining.slice(0, 50),
            candidateCountBefore: candidatesRemaining.length,
            computationTimeMs: Date.now() - startTime
          }
        };
      }

      const move = this.computeBestMove(guessHistory, candidatesRemaining, startTime);
      OPENING_MOVE_CACHE.set(this.length, move);
      return move;
    }

    return this.computeBestMove(guessHistory, candidatesRemaining, startTime);
  }

  /**
   * Score every remaining candidate by frequency and return the best move.
   */
  private computeBestMove(
    guessHistory: GuessFeedback[],
    candidatesRemaining: string[],
    startTime: number
  ): SolverMove {
    // Score all candidates based on frequency
    const scoredCandidates = candidatesRemaining.map(word => ({
      word,
      score: this.scoreWord(word, guessHistory, candidatesRemaining)
    }));

    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);

    const chosenGuess = scoredCandidates[0].word;
    const topAlternatives = scoredCandidates.slice(1, 4).map(({ word, score }) => ({
      word,
      score,
      reason: `Frequency score: ${score.toFixed(2)}`
    }));

    return {
      guess: chosenGuess,
      explanation: {
        chosenGuess,
        reasoning: this.generateReasoning(chosenGuess, candidatesRemaining, guessHistory),
        candidateCountBefore: candidatesRemaining.length,
        remainingCandidates: candidatesRemaining.slice(0, 50),
        topAlternatives,
        computationTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Score a word based on letter and positional frequencies
   */
  private scoreWord(word: string, guessHistory: GuessFeedback[], candidates: string[]): number {
    let score = 0;
    const usedLetters = new Set<string>();

    // Get letters already guessed
    const guessedLetters = new Set<string>();
    for (const { guess } of guessHistory) {
      for (const letter of guess) {
        guessedLetters.add(letter);
      }
    }

    for (let i = 0; i < word.length; i++) {
      const letter = word[i];

      // Positional frequency score
      if (this.frequencyData[letter]) {
        score += this.frequencyData[letter].positions[i];
      }

      // Bonus for unique letters (letter diversity)
      if (!usedLetters.has(letter)) {
        usedLetters.add(letter);

        // Higher bonus for letters not yet guessed
        if (!guessedLetters.has(letter)) {
          if (this.frequencyData[letter]) {
            score += this.frequencyData[letter].total * 2;
          }
        } else {
          // Smaller bonus for already-guessed letters
          if (this.frequencyData[letter]) {
            score += this.frequencyData[letter].total * 0.5;
          }
        }
      }
    }

    // Boost for words in candidate list (prefer likely answers)
    if (candidates.includes(word)) {
      score *= 1.2;
    }

    return score;
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(guess: string, candidates: string[], guessHistory: GuessFeedback[]): string {
    const uniqueLetters = new Set(guess).size;
    const guessedLetters = new Set<string>();

    for (const { guess: g } of guessHistory) {
      for (const letter of g) {
        guessedLetters.add(letter);
      }
    }

    const newLetters = Array.from(guess).filter(l => !guessedLetters.has(l)).length;

    let reasoning = `Selected "${guess}" based on letter frequency analysis. `;

    if (guessHistory.length === 0) {
      reasoning += `Contains ${uniqueLetters} unique letters with high frequency in ${this.length}-letter words.`;
    } else if (candidates.length <= 10) {
      reasoning += `From ${candidates.length} remaining candidates, this word best matches common letter patterns.`;
    } else if (newLetters > 0) {
      reasoning += `Tests ${newLetters} new letter(s) to maximize information gain.`;
    } else {
      reasoning += `Uses known letters in high-frequency positions.`;
    }

    return reasoning;
  }
}
