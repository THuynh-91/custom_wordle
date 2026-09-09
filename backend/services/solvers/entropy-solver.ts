/**
 * Entropy-based solver
 * Maximizes information gain by selecting guesses that best partition the candidate space
 */

import { BaseSolver, SolverMove } from './base-solver.js';
import { WordLength, GuessFeedback, TileState } from '../../../shared/types.js';
import { GameEngine } from '../game-engine.js';
import { DEFAULT_MAX_GUESSES } from '../../../shared/constants.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for pre-computed optimal first guesses (based on entropy analysis)
const BEST_FIRST_GUESSES: Record<WordLength, string> = {
  3: 'ale',    // Optimal for 3-letter words
  4: 'tale',   // Optimal for 4-letter words
  5: 'tares',  // Mathematically optimal for standard 5-letter Wordle
  6: 'sainer', // Optimal for 6-letter words
  7: 'stainer' // Optimal for 7-letter words
};

// Pre-computed second guesses when first guess returns all grey
// These words maximize coverage of letters NOT in the first guess
const SECOND_GUESS_AFTER_ALL_GREY: Record<WordLength, Record<string, string>> = {
  3: {
    'ale': 'nit'  // Covers n, i, t (avoids a, l, e)
  },
  4: {
    'tale': 'iron'  // Covers i, r, o, n (avoids t, a, l, e)
  },
  5: {
    'tares': 'blind'  // Covers b, l, i, n, d (avoids t, a, r, e, s)
  },
  6: {
    'sainer': 'comply'  // Covers c, o, m, p, l, y (avoids s, a, i, n, e, r)
  },
  7: {
    'stainer': 'scourge'  // Covers s, c, o, u, r, g, e (avoids s, t, a, i, n, e, r)
  }
};

// Interface for pre-computed second guess data
interface PrecomputedEntry {
  pattern: string;
  bestGuess: string;
  candidatesRemaining: number;
  entropy: number;
  expectedPartitionSize: number;
}

interface PrecomputedData {
  firstGuess: string;
  length: number;
  entries: PrecomputedEntry[];
}

// Cache for loaded pre-computed data
const PRECOMPUTED_SECOND_GUESSES: Map<WordLength, Map<string, PrecomputedEntry>> = new Map();

/**
 * Above this many candidates per remaining turn, finishing in time is not the
 * binding constraint and the solve-probability estimate below loses resolution,
 * so the solver falls back to plain entropy.
 *
 * Tuned with `npx tsx backend/scripts/benchmark-solver.ts 5 2000`, which swept
 * 2/4/6/20 over the same 2000 games: 2 was best on both win rate (99.95% vs
 * 99.90%) and average guesses (3.934 vs 3.954-3.963).
 */
const ENDGAME_CANDIDATES_PER_TURN = 2;

/**
 * Probability of solving a pool of `m` candidates with `k` guesses left.
 *
 * `m <= k` is a guaranteed win: just test them one per turn. Above that,
 * enumeration can only cover `k` of the `m`, giving k/m. That is a LOWER bound —
 * a good splitter usually does better — but it is monotone in the right
 * direction (fewer and smaller buckets score higher), which is all the ranking
 * needs. Keeping it a bound rather than a guess avoids an unfounded constant.
 */
function subSolveProbability(m: number, k: number): number {
  if (k <= 0) return 0;
  if (m <= k) return 1;
  return k / m;
}

/**
 * Convert feedback array to pattern string for lookup
 * 0 = absent, 1 = present, 2 = correct
 */
function feedbackToPattern(feedback: TileState[]): string {
  return feedback.map(state => {
    if (state === 'absent') return '0';
    if (state === 'present') return '1';
    if (state === 'correct') return '2';
    return '0';
  }).join('');
}

/**
 * Resolve the precomputed data file across the various dev / build layouts.
 *
 * Depending on whether `flatten-backend` ran, the compiled solver can live at
 * `dist/backend/services/solvers/...` or `dist/backend/backend/services/solvers/...`,
 * so a single `__dirname`-relative path is not reliable. We probe several
 * candidate roots (mirroring word-service's resolveDataFile) and return the
 * first that exists.
 */
function resolvePrecomputedPath(length: WordLength): string | null {
  const fileName = `second-guess-${length}.json`;
  const candidates = [
    // dev / flattened-dist layout: services/solvers -> data/precomputed
    path.join(__dirname, '..', '..', 'data', 'precomputed', fileName),
    // nested-dist layout (no flatten): backend/services/solvers -> backend/data/precomputed
    path.join(__dirname, '..', '..', '..', 'data', 'precomputed', fileName),
    // cwd-based fallbacks for various deploy roots
    path.resolve(process.cwd(), 'dist', 'backend', 'data', 'precomputed', fileName),
    path.resolve(process.cwd(), 'dist', 'data', 'precomputed', fileName),
    path.resolve(process.cwd(), 'backend', 'data', 'precomputed', fileName),
    path.resolve(process.cwd(), 'data', 'precomputed', fileName)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Load pre-computed second guess data for a given word length
 */
function loadPrecomputedData(length: WordLength): void {
  if (PRECOMPUTED_SECOND_GUESSES.has(length)) {
    return; // Already loaded
  }

  try {
    const dataPath = resolvePrecomputedPath(length);

    if (!dataPath) {
      console.log(`[EntropySolver] No pre-computed data found for length ${length}`);
      return;
    }

    const data: PrecomputedData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    const patternMap = new Map<string, PrecomputedEntry>();
    for (const entry of data.entries) {
      patternMap.set(entry.pattern, entry);
    }

    PRECOMPUTED_SECOND_GUESSES.set(length, patternMap);
    console.log(`[EntropySolver] Loaded ${data.entries.length} pre-computed second guesses for ${length}-letter words`);
  } catch (error) {
    console.error(`[EntropySolver] Failed to load pre-computed data for length ${length}:`, error);
  }
}

export class EntropySolver extends BaseSolver {
  private useAllGuesses: boolean;
  private entropyCache: Map<
    string,
    { entropy: number; expectedSize: number; solveProbability: number }
  >;

  constructor(length: WordLength, candidates: string[], allGuesses: string[], useAllGuesses = true) {
    super(length, candidates, allGuesses);
    this.useAllGuesses = useAllGuesses;
    this.entropyCache = new Map();

    // Load pre-computed second guess data
    loadPrecomputedData(length);
  }

  getName(): string {
    return 'Optimized AI';
  }

  getNextMove(
    guessHistory: GuessFeedback[],
    candidatesRemaining: string[],
    guessesRemaining: number = DEFAULT_MAX_GUESSES - guessHistory.length
  ): SolverMove {
    const startTime = Date.now();
    // Turns we have left, counting the one we are about to play. Clamped so a
    // miscounted history can never make the solver think it has no budget.
    const turnsLeft = Math.max(1, guessesRemaining);

    // If only one candidate left, return it
    if (candidatesRemaining.length === 1) {
      return {
        guess: candidatesRemaining[0],
        explanation: {
          chosenGuess: candidatesRemaining[0],
          reasoning: 'Only one possible word remaining',
          candidateCountBefore: 1,
          remainingCandidates: candidatesRemaining,
          expectedPartitionSize: 0,
          topAlternatives: [],
          computationTimeMs: Date.now() - startTime
        }
      };
    }

    // Use pre-computed first guess for speed
    if (guessHistory.length === 0) {
      const bestFirstGuess = BEST_FIRST_GUESSES[this.length];
      const entropy = 5.0;
      const expectedSize = candidatesRemaining.length / 10;

      return {
        guess: bestFirstGuess,
        explanation: {
          chosenGuess: bestFirstGuess,
          reasoning: `Selected "${bestFirstGuess}" as the pre-optimized starting word. This word maximizes information gain across the entire ${this.length}-letter word space.`,
          candidateCountBefore: candidatesRemaining.length,
          remainingCandidates: candidatesRemaining.slice(0, 50),
          expectedPartitionSize: expectedSize,
          topAlternatives: [],
          computationTimeMs: Date.now() - startTime
        }
      };
    }

    // OPTIMIZATION: Use pre-computed second guess for ALL scenarios after the first guess
    // This dramatically speeds up computation by avoiding real-time entropy calculation
    if (guessHistory.length === 1) {
      const firstGuess = guessHistory[0];
      const firstWord = firstGuess.guess;
      const bestFirstGuess = BEST_FIRST_GUESSES[this.length];

      // Check if we used the optimal first guess and have pre-computed data
      if (firstWord === bestFirstGuess) {
        const precomputedMap = PRECOMPUTED_SECOND_GUESSES.get(this.length);

        if (precomputedMap) {
          const pattern = feedbackToPattern(firstGuess.feedback);
          const precomputed = precomputedMap.get(pattern);

          if (precomputed && this.allGuesses.includes(precomputed.bestGuess)) {
            return {
              guess: precomputed.bestGuess,
              explanation: {
                chosenGuess: precomputed.bestGuess,
                reasoning: `Using pre-computed optimal second guess. After "${firstWord}" with feedback pattern ${pattern}, "${precomputed.bestGuess}" is the mathematically optimal choice. This should narrow down from ${candidatesRemaining.length} candidates to approximately ${precomputed.expectedPartitionSize.toFixed(0)} words (pre-computed entropy: ${precomputed.entropy.toFixed(2)}).`,
                candidateCountBefore: candidatesRemaining.length,
                remainingCandidates: candidatesRemaining.slice(0, 50),
                expectedPartitionSize: precomputed.expectedPartitionSize,
                topAlternatives: [],
                computationTimeMs: Date.now() - startTime
              }
            };
          }
        }
      }

      // Fallback: Old all-grey optimization for non-standard first guesses
      const isAllGrey = firstGuess.feedback.every(tile => tile === 'absent');
      if (isAllGrey) {
        const precomputedSecond = SECOND_GUESS_AFTER_ALL_GREY[this.length]?.[firstWord];

        if (precomputedSecond && this.allGuesses.includes(precomputedSecond)) {
          const expectedSize = candidatesRemaining.length / 15;

          return {
            guess: precomputedSecond,
            explanation: {
              chosenGuess: precomputedSecond,
              reasoning: `Previous guess "${firstWord}" yielded no correct letters. Selected "${precomputedSecond}" as the optimal follow-up, maximizing coverage of unused letters. This should narrow down from ${candidatesRemaining.length} to approximately ${expectedSize.toFixed(0)} candidates.`,
              candidateCountBefore: candidatesRemaining.length,
              remainingCandidates: candidatesRemaining.slice(0, 50),
              expectedPartitionSize: expectedSize,
              topAlternatives: [],
              computationTimeMs: Date.now() - startTime
            }
          };
        }
      }
    }

    // Determine which words to evaluate for optimal play
    let wordsToEvaluate: string[];

    // May we spend this turn on a pure elimination guess?
    //
    // Testing candidates one at a time can check at most `turnsLeft` of them, so:
    //   - N <= turnsLeft  -> enumeration is already a GUARANTEED win. Never waste
    //                        a turn; and the guarantee is self-sustaining, since a
    //                        wrong guess drops both N and turnsLeft by at least 1.
    //   - turnsLeft == 1  -> a probe has zero chance of winning. Must guess a candidate.
    //   - otherwise       -> sequential guessing is a LOSING plan, so a turn spent
    //                        splitting the pool is worth more than a 1-in-N shot.
    //
    // This is what the old `candidatesRemaining.length > 10` gate got wrong: traps
    // like bight/dight/fight/hight/might/night/wight (7 candidates that differ only
    // in the first letter) fall BELOW that gate, so the solver was restricted to
    // candidate words and burned every remaining turn one letter at a time.
    const canProbe =
      this.useAllGuesses && turnsLeft > 1 && candidatesRemaining.length > turnsLeft;

    if (candidatesRemaining.length === 1) {
      // Only one candidate - must be it
      const chosen = candidatesRemaining[0];
      return {
        guess: chosen,
        explanation: {
          chosenGuess: chosen,
          reasoning: 'Only one possible word remaining',
          candidateCountBefore: 1,
          remainingCandidates: candidatesRemaining,
          expectedPartitionSize: 0,
          topAlternatives: [],
          computationTimeMs: Date.now() - startTime
        }
      };
    } else if (candidatesRemaining.length === 2) {
      // Two candidates - just pick first one (50/50 either way)
      const chosen = candidatesRemaining[0];
      return {
        guess: chosen,
        explanation: {
          chosenGuess: chosen,
          reasoning: `Only 2 candidates remain: ${candidatesRemaining.join(', ')}. Guessing one of them.`,
          candidateCountBefore: 2,
          remainingCandidates: candidatesRemaining,
          expectedPartitionSize: 1,
          topAlternatives: candidatesRemaining.slice(1).map(word => ({
            word,
            score: 1.0,
            reason: 'Other candidate'
          })),
          computationTimeMs: Date.now() - startTime
        }
      };
    } else if (canProbe) {
      // Consider all possible guesses (including words that cannot be the answer).
      // A "probe" sacrifices this turn's chance of winning to split the candidate
      // pool, which is the only way out of a one-letter-apart trap.
      //
      // PERFORMANCE CAP: the cost of this branch is O(wordsToEvaluate * candidatesRemaining)
      // feedback computations. For 6/7-letter words allGuesses is 15k-23k; combined with even a
      // modest candidate set (the typical move-3 situation) that blocks the event loop for
      // 0.5-1.6s. To keep EVERY move well under target (~60-120ms) we bound the work two ways:
      //   1. A feedback-op budget (guess*candidate product) calibrated to the per-op cost of
      //      the inlined single-pass scorer below.
      //   2. An absolute cap on how many guesses we evaluate, so a small candidate set can never
      //      drag in the full 23k guess pool.
      // We ALWAYS evaluate every remaining candidate (the true answer is never excluded), then
      // top up with an evenly-spaced sample of strategic (non-candidate) guesses. Sampling the
      // huge guess pool barely affects solve quality because the remaining candidates already
      // dominate the high-entropy choices once the field has been narrowed.
      //
      // The breadth cap is set ABOVE the largest guess pool (23k for 7 letters) so that a
      // small candidate set — exactly the endgame trap case — always gets the complete pool
      // to search for a splitter. The op budget still bounds total work: with a small
      // candidate set, 23k guesses is only ~160k ops, well inside budget.
      const MAX_EVALUATIONS = 400_000;    // guess*candidate feedback-op budget
      const MAX_GUESSES_EVALUATED = 25_000; // breadth cap; op budget is the real limiter
      const budgetFromOps = Math.floor(MAX_EVALUATIONS / Math.max(candidatesRemaining.length, 1));
      const guessBudget = Math.min(
        MAX_GUESSES_EVALUATED,
        Math.max(candidatesRemaining.length, budgetFromOps)
      );

      if (this.allGuesses.length <= guessBudget) {
        wordsToEvaluate = this.allGuesses;
      } else {
        // Always include the actual candidates, then top up with a representative
        // sample of strategic (non-candidate) guesses up to the budget.
        const candidateSet = new Set(candidatesRemaining);
        const strategicPool = this.allGuesses.filter(w => !candidateSet.has(w));
        const strategicBudget = Math.max(0, guessBudget - candidatesRemaining.length);
        const sampledStrategic = this.sampleWords(strategicPool, strategicBudget);
        wordsToEvaluate = [...candidatesRemaining, ...sampledStrategic];
      }
    } else {
      // Enumerating candidates already wins (or it is the last turn, where a probe
      // cannot win at all) — only real candidates are worth evaluating.
      wordsToEvaluate = candidatesRemaining;
    }

    // Encode the candidate set once into fixed-width char-code arrays so the inner
    // entropy loop avoids per-call string indexing and Map allocation (the dominant
    // cost in GameEngine.generateFeedback). Reused across every guess this move.
    const encodedCandidates = this.encodeWords(candidatesRemaining);
    const candidateSet = new Set(candidatesRemaining);

    // Which objective applies depends on how close the 6-guess cliff is.
    //
    // ENDGAME (few candidates relative to turns left): what matters is not raw
    // information but whether we can still FINISH in time, and that depends on the
    // exact bucket sizes a guess produces. Score by solve probability.
    //
    // MIDGAME/OPENING (large pool): no guess can plausibly finish soon, and the
    // solve-probability estimate below degenerates once most buckets are bigger
    // than the turns left (it stops distinguishing a bucket of 4 from one of 400).
    // Raw entropy is the better-calibrated objective there.
    const useSolveProbability =
      candidatesRemaining.length <= ENDGAME_CANDIDATES_PER_TURN * turnsLeft;

    // Calculate entropy for each potential guess - single pass derives entropy,
    // expected partition size AND solve probability (one walk over candidates).
    const scoredGuesses = wordsToEvaluate.map(guess => {
      const cacheKey = `${guess}:${turnsLeft}:${candidatesRemaining.length}:${candidatesRemaining.slice(0, 5).join(',')}`;

      let entropy: number;
      let expectedSize: number;
      let solveProbability: number;

      const cached = this.entropyCache.get(cacheKey);
      if (cached) {
        entropy = cached.entropy;
        expectedSize = cached.expectedSize;
        solveProbability = cached.solveProbability;
      } else {
        const scored = this.scoreGuessFast(guess, encodedCandidates, turnsLeft);
        entropy = scored.entropy;
        expectedSize = scored.expectedSize;
        solveProbability = scored.solveProbability;
        this.entropyCache.set(cacheKey, { entropy, expectedSize, solveProbability });

        // Limit cache size to prevent memory issues
        if (this.entropyCache.size > 10000) {
          const firstKey = this.entropyCache.keys().next().value;
          if (firstKey) {
            this.entropyCache.delete(firstKey);
          }
        }
      }

      // Small bonus for words that are in the candidate list (helps avoid wasting guesses)
      const candidateBonus = candidateSet.has(guess) ? 0.1 : 0;

      return {
        word: guess,
        entropy,
        expectedSize,
        solveProbability,
        score: entropy + candidateBonus
      };
    });

    // Endgame: highest solve probability wins, entropy breaks ties (and a candidate
    // breaks a remaining tie, so an equally-good guess that could just win is preferred).
    // Otherwise: highest entropy.
    if (useSolveProbability) {
      scoredGuesses.sort(
        (a, b) =>
          b.solveProbability - a.solveProbability ||
          b.entropy - a.entropy ||
          (candidateSet.has(b.word) ? 1 : 0) - (candidateSet.has(a.word) ? 1 : 0)
      );
    } else {
      scoredGuesses.sort((a, b) => b.score - a.score);
    }

    const chosen = scoredGuesses[0];
    const topAlternatives = scoredGuesses.slice(1, 4).map(({ word, entropy, expectedSize }) => ({
      word,
      score: entropy,
      reason: `Entropy: ${entropy.toFixed(2)}, Expected partition: ${expectedSize.toFixed(1)}`
    }));

    return {
      guess: chosen.word,
      explanation: {
        chosenGuess: chosen.word,
        reasoning: this.generateReasoning(chosen, candidatesRemaining, guessHistory, turnsLeft),
        candidateCountBefore: candidatesRemaining.length,
        remainingCandidates: candidatesRemaining.slice(0, 50),
        expectedPartitionSize: chosen.expectedSize,
        topAlternatives,
        computationTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Encode a list of words into fixed-width arrays of char codes (0-25) so the
   * hot entropy loop can operate on integers without repeated string indexing.
   */
  private encodeWords(words: string[]): Uint8Array[] {
    const encoded: Uint8Array[] = new Array(words.length);
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const arr = new Uint8Array(word.length);
      for (let i = 0; i < word.length; i++) {
        arr[i] = word.charCodeAt(i) - 97; // 'a' -> 0
      }
      encoded[w] = arr;
    }
    return encoded;
  }

  /**
   * Compute BOTH the entropy and the expected partition size of `guess` against
   * the (pre-encoded) candidate set in a single pass.
   *
   * This is a hot path: for a large guess pool it runs guesses*candidates times
   * per move. It is functionally identical to
   * GameEngine.calculateEntropy / calculateExpectedPartitionSize (same standard
   * Wordle feedback rules incl. duplicate-letter handling) but:
   *   - inlines feedback generation against integer arrays (no per-call Maps),
   *   - encodes each feedback pattern as a single base-3 integer key,
   *   - derives entropy and expected size from one pattern-count map.
   */
  private scoreGuessFast(
    guess: string,
    encodedCandidates: Uint8Array[],
    turnsLeft: number
  ): { entropy: number; expectedSize: number; solveProbability: number } {
    const length = guess.length;
    const total = encodedCandidates.length;
    if (total === 0) {
      return { entropy: 0, expectedSize: 0, solveProbability: 0 };
    }

    // Encode the guess once.
    const g = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      g[i] = guess.charCodeAt(i) - 97;
    }

    // Pattern key (base-3 per tile) -> count. Map of small ints stays fast.
    const patternCounts = new Map<number, number>();
    // Per-letter remaining counts for the secret, reused per candidate.
    const letterCounts = new Int8Array(26);
    const tileState = new Uint8Array(length); // 0 absent, 1 present, 2 correct

    for (let c = 0; c < total; c++) {
      const secret = encodedCandidates[c];

      // Reset only the 26 letter buckets (cheap, fixed cost).
      letterCounts.fill(0);
      for (let i = 0; i < length; i++) {
        letterCounts[secret[i]]++;
      }

      // First pass: greens.
      for (let i = 0; i < length; i++) {
        if (g[i] === secret[i]) {
          tileState[i] = 2;
          letterCounts[g[i]]--;
        } else {
          tileState[i] = 0;
        }
      }
      // Second pass: yellows.
      for (let i = 0; i < length; i++) {
        if (tileState[i] !== 2) {
          const letter = g[i];
          if (letterCounts[letter] > 0) {
            tileState[i] = 1;
            letterCounts[letter]--;
          }
        }
      }

      // Fold tile states into a single base-3 integer key.
      let key = 0;
      for (let i = 0; i < length; i++) {
        key = key * 3 + tileState[i];
      }

      patternCounts.set(key, (patternCounts.get(key) || 0) + 1);
    }

    // The all-green pattern is the one where every tile is state 2, i.e. the
    // base-3 key 22...2 == 3^length - 1. Its bucket is the immediate win.
    const allCorrectKey = Math.pow(3, length) - 1;

    let entropy = 0;
    let expectedSize = 0;
    let solveProbability = 0;
    for (const [key, count] of patternCounts) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
      expectedSize += probability * count;

      if (key === allCorrectKey) {
        // This guess IS the answer: solved on this very turn.
        solveProbability += probability;
      } else {
        solveProbability +=
          probability * subSolveProbability(count, turnsLeft - 1);
      }
    }

    return { entropy, expectedSize, solveProbability };
  }

  /**
   * Sample words for performance (prefer diverse, high-frequency words)
   */
  private sampleWords(words: string[], count: number): string[] {
    if (words.length <= count) {
      return words;
    }

    // Take evenly spaced samples
    const step = words.length / count;
    const sampled: string[] = [];

    for (let i = 0; i < count; i++) {
      const index = Math.floor(i * step);
      sampled.push(words[index]);
    }

    return sampled;
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(
    chosen: { word: string; entropy: number; expectedSize: number; solveProbability: number },
    candidates: string[],
    guessHistory: GuessFeedback[],
    turnsLeft: number
  ): string {
    const { word, entropy, expectedSize, solveProbability } = chosen;
    const isCandidate = candidates.includes(word);

    // Check if this is a strategic guess (doesn't match known constraints)
    let isStrategicGuess = false;
    if (guessHistory.length > 0) {
      const constraints = GameEngine.buildConstraints(guessHistory);
      isStrategicGuess = !GameEngine.satisfiesConstraints(word, constraints);
    }

    let reasoning = `Selected "${word}" as the optimal next guess. `;

    // A sacrifice: a word that cannot be the answer, played because guessing the
    // candidates one at a time cannot fit in the turns that are left.
    if (isStrategicGuess && !isCandidate && candidates.length > turnsLeft) {
      reasoning +=
        `Deliberately spending this turn on a word that CANNOT be the answer. ` +
        `${candidates.length} candidates remain but only ${turnsLeft} guess${turnsLeft === 1 ? '' : 'es'} ` +
        `are left, so testing them one by one would run out of turns. ` +
        `"${word}" instead splits those ${candidates.length} into groups of about ` +
        `${expectedSize.toFixed(0)} (${entropy.toFixed(2)} bits), raising the chance of ` +
        `finishing in time to roughly ${(solveProbability * 100).toFixed(0)}%.`;
    } else if (isStrategicGuess) {
      reasoning += `This is a strategic elimination guess to maximize information gain. While it doesn't match all known constraints, it will help narrow down the ${candidates.length} remaining candidates to approximately ${expectedSize.toFixed(0)} words by testing new letter combinations.`;
    } else if (guessHistory.length === 0) {
      reasoning += `This word should narrow down the ${candidates.length.toLocaleString()} possible words to approximately ${expectedSize.toFixed(0)} candidates.`;
    } else if (candidates.length <= 5) {
      if (isCandidate) {
        reasoning += `One of ${candidates.length} remaining words with the highest potential to solve the puzzle.`;
      } else {
        reasoning += `This word will best distinguish between the ${candidates.length} remaining possibilities.`;
      }
    } else if (candidates.length <= 50) {
      reasoning += `From ${candidates.length} possible words, this choice should reduce options to approximately ${expectedSize.toFixed(0)} words.`;
    } else {
      reasoning += `Expected to narrow down from ${candidates.length} candidates to approximately ${expectedSize.toFixed(0)} possibilities.`;
    }

    return reasoning;
  }

  /**
   * Get detailed pattern distribution for explanation
   */
  getPatternDistribution(guess: string, candidates: string[]): Map<string, { count: number; percentage: number }> {
    const distribution = GameEngine.getPatternDistribution(guess, candidates);
    const total = candidates.length;

    const result = new Map<string, { count: number; percentage: number }>();

    for (const [pattern, { count }] of distribution) {
      result.set(pattern, {
        count,
        percentage: (count / total) * 100
      });
    }

    return result;
  }
}
