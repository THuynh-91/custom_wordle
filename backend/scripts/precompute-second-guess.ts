/**
 * Pre-compute optimal second guesses for all possible feedback patterns
 * from the first guess "tares" (and other optimal first guesses)
 *
 * This dramatically speeds up the AI by avoiding real-time computation
 * of the second guess. Instead of computing entropy for thousands of words,
 * we just look up the pre-computed answer.
 */

import { WordService } from '../services/word-service.js';
import { GameEngine } from '../services/game-engine.js';
import { TileState, WordLength, GuessFeedback } from '../../shared/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// First guesses to pre-compute for
const FIRST_GUESSES: Record<WordLength, string> = {
  3: 'ale',
  4: 'tale',
  5: 'tares',
  6: 'sainer',
  7: 'stainer'
};

interface PrecomputedEntry {
  pattern: string; // Encoded feedback pattern (e.g., "00120" for absent,absent,present,yellow,absent)
  feedbackArray: TileState[]; // Actual feedback array
  bestGuess: string;
  candidatesRemaining: number;
  entropy: number;
  expectedPartitionSize: number;
}

/**
 * Convert feedback array to pattern string
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
 * Generate all possible feedback patterns for a given word length
 * For 5-letter words: 3^5 = 243 patterns
 */
function generateAllPatterns(length: number): TileState[][] {
  const patterns: TileState[][] = [];
  const states: TileState[] = ['absent', 'present', 'correct'];

  function generate(current: TileState[]) {
    if (current.length === length) {
      patterns.push([...current]);
      return;
    }

    for (const state of states) {
      current.push(state);
      generate(current);
      current.pop();
    }
  }

  generate([]);
  return patterns;
}

/**
 * Find the best guess for a given set of candidates
 */
function findBestGuess(
  candidates: string[],
  allGuesses: string[],
  length: WordLength
): { word: string; entropy: number; expectedPartitionSize: number } {
  if (candidates.length === 0) {
    return { word: '', entropy: 0, expectedPartitionSize: 0 };
  }

  if (candidates.length === 1) {
    return { word: candidates[0], entropy: 0, expectedPartitionSize: 0 };
  }

  // For larger candidate sets, consider all possible guesses for optimal play
  const wordsToEvaluate = candidates.length > 10 ? allGuesses : candidates;

  let bestWord = candidates[0];
  let bestEntropy = -1;
  let bestExpectedSize = Infinity;

  for (const guess of wordsToEvaluate) {
    const entropy = GameEngine.calculateEntropy(guess, candidates);
    const expectedSize = GameEngine.calculateExpectedPartitionSize(guess, candidates);

    // Small bonus for words that are in the candidate list
    const candidateBonus = candidates.includes(guess) ? 0.1 : 0;
    const score = entropy + candidateBonus;

    if (score > bestEntropy) {
      bestEntropy = score;
      bestWord = guess;
      bestExpectedSize = expectedSize;
    }
  }

  return { word: bestWord, entropy: bestEntropy, expectedPartitionSize: bestExpectedSize };
}

/**
 * Filter candidates that match a given feedback pattern for a guess
 */
function filterCandidatesByFeedback(
  guess: string,
  feedback: TileState[],
  candidates: string[]
): string[] {
  return candidates.filter(candidate => {
    const actualFeedback = GameEngine.generateFeedback(guess, candidate);
    return actualFeedback.every((state, i) => state === feedback[i]);
  });
}

/**
 * Pre-compute all second guesses for a given word length
 */
async function precomputeForLength(length: WordLength) {
  console.log(`\n=== Pre-computing for ${length}-letter words ===`);

  const firstGuess = FIRST_GUESSES[length];
  console.log(`First guess: ${firstGuess}`);

  // Initialize word service if not already initialized
  await WordService.initialize();

  // Load all candidates and valid guesses
  const candidates = WordService.getAnswerWords(length);
  const allGuesses = WordService.getGuessWords(length);

  console.log(`Candidates: ${candidates.length}, All guesses: ${allGuesses.length}`);

  // Generate all possible feedback patterns
  const allPatterns = generateAllPatterns(length);
  console.log(`Total patterns to compute: ${allPatterns.length}`);

  const precomputed: PrecomputedEntry[] = [];
  let processed = 0;

  for (const feedback of allPatterns) {
    processed++;

    if (processed % 50 === 0) {
      console.log(`Progress: ${processed}/${allPatterns.length} (${((processed/allPatterns.length)*100).toFixed(1)}%)`);
    }

    // Filter candidates that match this feedback pattern
    const matchingCandidates = filterCandidatesByFeedback(firstGuess, feedback, candidates);

    const pattern = feedbackToPattern(feedback);

    // Skip patterns that result in 0 candidates (impossible patterns)
    if (matchingCandidates.length === 0) {
      continue;
    }

    // Find the best second guess for this scenario
    const bestGuess = findBestGuess(matchingCandidates, allGuesses, length);

    precomputed.push({
      pattern,
      feedbackArray: feedback,
      bestGuess: bestGuess.word,
      candidatesRemaining: matchingCandidates.length,
      entropy: bestGuess.entropy,
      expectedPartitionSize: bestGuess.expectedPartitionSize
    });
  }

  console.log(`\nCompleted! Valid patterns: ${precomputed.length}/${allPatterns.length}`);

  // Save to file
  const outputDir = path.join(__dirname, '..', 'data', 'precomputed');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `second-guess-${length}.json`);

  const output = {
    firstGuess,
    length,
    totalPatterns: allPatterns.length,
    validPatterns: precomputed.length,
    generatedAt: new Date().toISOString(),
    entries: precomputed
  };

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`Saved to: ${outputFile}`);

  // Print some statistics
  const avgCandidates = precomputed.reduce((sum, e) => sum + e.candidatesRemaining, 0) / precomputed.length;
  const maxCandidates = Math.max(...precomputed.map(e => e.candidatesRemaining));
  const avgEntropy = precomputed.reduce((sum, e) => sum + e.entropy, 0) / precomputed.length;

  console.log(`\nStatistics:`);
  console.log(`  Avg candidates remaining: ${avgCandidates.toFixed(1)}`);
  console.log(`  Max candidates remaining: ${maxCandidates}`);
  console.log(`  Avg entropy of 2nd guess: ${avgEntropy.toFixed(2)}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Second Guess Pre-computation Script ===');
  console.log('This will compute the optimal second guess for all possible');
  console.log('feedback patterns from the first guess.');
  console.log('');

  // Focus on 5-letter words first (standard Wordle)
  const lengthsToCompute: WordLength[] = [5];

  for (const length of lengthsToCompute) {
    await precomputeForLength(length);
  }

  console.log('\n=== All pre-computation complete! ===');
}

main().catch(console.error);
