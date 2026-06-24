/**
 * Core Wordle game engine - length-agnostic implementation
 */

import { TileState, GameConstraints, LetterConstraint, GuessFeedback } from '../../shared/types.js';

export class GameEngine {
  /**
   * Generate feedback for a guess against a secret word
   * Handles duplicate letters correctly (greens first, then yellows)
   */
  static generateFeedback(guess: string, secret: string): TileState[] {
    const length = secret.length;
    const feedback: TileState[] = new Array(length).fill('absent');
    const secretLetterCounts = new Map<string, number>();

    // Count letters in secret
    for (const letter of secret) {
      secretLetterCounts.set(letter, (secretLetterCounts.get(letter) || 0) + 1);
    }

    // First pass: mark correct positions (green)
    for (let i = 0; i < length; i++) {
      if (guess[i] === secret[i]) {
        feedback[i] = 'correct';
        secretLetterCounts.set(guess[i], secretLetterCounts.get(guess[i])! - 1);
      }
    }

    // Second pass: mark present letters (yellow)
    for (let i = 0; i < length; i++) {
      if (feedback[i] !== 'correct') {
        const letter = guess[i];
        const remaining = secretLetterCounts.get(letter) || 0;
        if (remaining > 0) {
          feedback[i] = 'present';
          secretLetterCounts.set(letter, remaining - 1);
        }
      }
    }

    return feedback;
  }

  /**
   * Build constraints from guess history
   * Maintains per-letter min/max counts and position constraints
   */
  static buildConstraints(guesses: GuessFeedback[]): GameConstraints {
    if (guesses.length === 0) {
      return {
        length: 0,
        letterConstraints: new Map(),
        positionConstraints: []
      };
    }

    const length = guesses[0].guess.length;
    const letterConstraints = new Map<string, LetterConstraint>();
    const positionConstraints: (string | null)[] = new Array(length).fill(null);

    const ensureConstraint = (letter: string): LetterConstraint => {
      if (!letterConstraints.has(letter)) {
        letterConstraints.set(letter, {
          minCount: 0,
          maxCount: Infinity,
          positions: {
            mustBe: new Set(),
            cannotBe: new Set()
          }
        });
      }
      return letterConstraints.get(letter)!;
    };

    // Process each guess
    for (const { guess, feedback } of guesses) {
      // Tally per-letter green/present/absent counts for THIS guess.
      // Standard Wordle count rules (handles duplicate letters correctly):
      //   - minimum copies in answer = greens + presents (yellows)
      //   - if any copy of the letter was marked absent (gray), then the
      //     answer contains EXACTLY greens + presents of that letter, so the
      //     maximum is also greens + presents. Otherwise the max is unbounded.
      const greens = new Map<string, number>();
      const presents = new Map<string, number>();
      const hasGray = new Map<string, boolean>();

      for (let i = 0; i < length; i++) {
        const letter = guess[i];
        const state = feedback[i];

        if (state === 'correct') {
          positionConstraints[i] = letter;
          greens.set(letter, (greens.get(letter) || 0) + 1);
          ensureConstraint(letter).positions.mustBe.add(i);
        } else if (state === 'present') {
          presents.set(letter, (presents.get(letter) || 0) + 1);
          ensureConstraint(letter).positions.cannotBe.add(i);
        } else if (state === 'absent') {
          hasGray.set(letter, true);
          ensureConstraint(letter).positions.cannotBe.add(i);
        }
      }

      // Derive per-guess min/max per letter and intersect into the running
      // constraints (min = max across guesses, max = min across guesses).
      const lettersInGuess = new Set(guess);
      for (const letter of lettersInGuess) {
        const green = greens.get(letter) || 0;
        const present = presents.get(letter) || 0;
        const guessMin = green + present;
        const guessMax = hasGray.get(letter) ? guessMin : Infinity;

        const constraint = ensureConstraint(letter);
        constraint.minCount = Math.max(constraint.minCount, guessMin);
        constraint.maxCount = Math.min(constraint.maxCount, guessMax);
      }
    }

    return {
      length,
      letterConstraints,
      positionConstraints
    };
  }

  /**
   * Check if a word satisfies all constraints
   */
  static satisfiesConstraints(word: string, constraints: GameConstraints): boolean {
    if (word.length !== constraints.length) {
      return false;
    }

    // Check position constraints
    for (let i = 0; i < word.length; i++) {
      if (constraints.positionConstraints[i] && word[i] !== constraints.positionConstraints[i]) {
        return false;
      }
    }

    // Check letter constraints
    const wordLetterCounts = new Map<string, number>();
    for (const letter of word) {
      wordLetterCounts.set(letter, (wordLetterCounts.get(letter) || 0) + 1);
    }

    for (const [letter, constraint] of constraints.letterConstraints) {
      const count = wordLetterCounts.get(letter) || 0;

      // Check min/max counts
      if (count < constraint.minCount || count > constraint.maxCount) {
        return false;
      }

      // Check position constraints
      for (let i = 0; i < word.length; i++) {
        if (word[i] === letter) {
          if (constraint.positions.cannotBe.has(i)) {
            return false;
          }
        } else {
          if (constraint.positions.mustBe.has(i)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Filter candidates based on constraints
   */
  static filterCandidates(words: string[], constraints: GameConstraints): string[] {
    return words.filter(word => this.satisfiesConstraints(word, constraints));
  }

  /**
   * Check if guess satisfies hard mode constraints
   * In hard mode, any revealed hints must be used in subsequent guesses
   */
  static checkHardMode(guess: string, constraints: GameConstraints): { valid: boolean; reason?: string } {
    // Check that all required position letters are present
    for (let i = 0; i < constraints.positionConstraints.length; i++) {
      const requiredLetter = constraints.positionConstraints[i];
      if (requiredLetter && guess[i] !== requiredLetter) {
        return {
          valid: false,
          reason: `Position ${i + 1} must be '${requiredLetter.toUpperCase()}'`
        };
      }
    }

    // Check that minimum letter counts are satisfied
    const guessLetterCounts = new Map<string, number>();
    for (const letter of guess) {
      guessLetterCounts.set(letter, (guessLetterCounts.get(letter) || 0) + 1);
    }

    for (const [letter, constraint] of constraints.letterConstraints) {
      if (constraint.minCount > 0) {
        const count = guessLetterCounts.get(letter) || 0;
        if (count < constraint.minCount) {
          return {
            valid: false,
            reason: `Must use '${letter.toUpperCase()}' at least ${constraint.minCount} time(s)`
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Calculate the expected partition size for a guess
   * Used by entropy-based solvers
   */
  static calculateExpectedPartitionSize(
    guess: string,
    candidates: string[]
  ): number {
    const patternCounts = new Map<string, number>();

    for (const candidate of candidates) {
      const feedback = this.generateFeedback(guess, candidate);
      const pattern = feedback.join(',');
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
    }

    let expectedSize = 0;
    const totalCandidates = candidates.length;

    for (const count of patternCounts.values()) {
      const probability = count / totalCandidates;
      expectedSize += probability * count;
    }

    return expectedSize;
  }

  /**
   * Calculate entropy (information gain) for a guess
   * Higher entropy = more information gained
   */
  static calculateEntropy(guess: string, candidates: string[]): number {
    const patternCounts = new Map<string, number>();

    for (const candidate of candidates) {
      const feedback = this.generateFeedback(guess, candidate);
      const pattern = feedback.join(',');
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
    }

    let entropy = 0;
    const totalCandidates = candidates.length;

    for (const count of patternCounts.values()) {
      const probability = count / totalCandidates;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  /**
   * Get distribution of patterns for a guess against candidates
   * Useful for AI explanation
   */
  static getPatternDistribution(
    guess: string,
    candidates: string[]
  ): Map<string, { count: number; examples: string[] }> {
    const distribution = new Map<string, { count: number; examples: string[] }>();

    for (const candidate of candidates) {
      const feedback = this.generateFeedback(guess, candidate);
      const pattern = feedback.join(',');

      if (!distribution.has(pattern)) {
        distribution.set(pattern, { count: 0, examples: [] });
      }

      const entry = distribution.get(pattern)!;
      entry.count++;
      if (entry.examples.length < 3) {
        entry.examples.push(candidate);
      }
    }

    return distribution;
  }

  /**
   * Check if the game is won
   */
  static isWin(feedback: TileState[]): boolean {
    return feedback.every(state => state === 'correct');
  }

  /**
   * Generate shareable result text (Unicode emojis)
   */
  static generateShareText(
    guesses: GuessFeedback[],
    length: number,
    maxGuesses: number,
    won: boolean
  ): string {
    const emojiMap: Record<TileState, string> = {
      correct: '🟩',
      present: '🟨',
      absent: '⬜',
      empty: '⬛'
    };

    let text = `Wordle ${length}-Letter `;
    text += won ? `${guesses.length}/${maxGuesses}\n\n` : `X/${maxGuesses}\n\n`;

    for (const { feedback } of guesses) {
      text += feedback.map(state => emojiMap[state]).join('') + '\n';
    }

    return text;
  }
}
