/**
 * Frequency-based solver
 * Uses letter and positional frequency to make guesses
 */

import { BaseSolver, SolverMove } from './base-solver.js';
import { WordLength, GuessFeedback } from '../../../shared/types.js';
import { WordService } from '../word-service.js';

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
