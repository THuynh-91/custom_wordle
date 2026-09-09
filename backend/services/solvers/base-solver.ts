/**
 * Base solver interface and abstract class
 */

import { WordLength, AIMoveExplanation, GuessFeedback } from '../../../shared/types.js';

export interface SolverMove {
  guess: string;
  explanation: Omit<AIMoveExplanation, 'feedback' | 'status'>;
}

export abstract class BaseSolver {
  protected length: WordLength;
  protected candidates: string[];
  protected allGuesses: string[];

  constructor(length: WordLength, candidates: string[], allGuesses: string[]) {
    this.length = length;
    this.candidates = candidates;
    this.allGuesses = allGuesses;
  }

  /**
   * Get the next move from the solver.
   *
   * `guessesRemaining` is the number of guesses this solver still has, INCLUDING
   * the move it is about to make. It cannot be derived from `guessHistory.length`
   * because race mode passes the combined human+AI history (so the AI can read
   * the human's feedback) which overstates how many turns the AI has used.
   * Turn-aware solvers need the real budget to decide whether they can afford a
   * pure elimination guess.
   */
  abstract getNextMove(
    guessHistory: GuessFeedback[],
    candidatesRemaining: string[],
    guessesRemaining?: number
  ): SolverMove;

  /**
   * Get the name of this solver
   */
  abstract getName(): string;

  /**
   * Update candidates list after new information
   */
  updateCandidates(newCandidates: string[]): void {
    this.candidates = newCandidates;
  }

  /**
   * Get current candidates
   */
  getCandidates(): string[] {
    return this.candidates;
  }

  /**
   * Get candidate count
   */
  getCandidateCount(): number {
    return this.candidates.length;
  }
}
