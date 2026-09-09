/**
 * Solver benchmark: plays the entropy solver against a deterministic sample of
 * answers and reports win rate / average guesses / worst case.
 *
 * Usage: npx tsx backend/scripts/benchmark-solver.ts [length] [sampleSize]
 */

import { WordService } from '../services/word-service.js';
import { GameEngine } from '../services/game-engine.js';
import { EntropySolver } from '../services/solvers/entropy-solver.js';
import { GuessFeedback, WordLength } from '../../shared/types.js';
import { DEFAULT_MAX_GUESSES } from '../../shared/constants.js';

/** Deterministic PRNG so runs are comparable across code changes. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playGame(
  secret: string,
  length: WordLength,
  all: string[],
  allGuesses: string[]
): { guesses: number; solved: boolean; maxMoveMs: number } {
  const history: GuessFeedback[] = [];
  let maxMoveMs = 0;

  for (let turn = 1; turn <= DEFAULT_MAX_GUESSES; turn++) {
    const candidates =
      history.length === 0
        ? all
        : GameEngine.filterCandidates(all, GameEngine.buildConstraints(history));
    if (candidates.length === 0) {
      return { guesses: turn - 1, solved: false, maxMoveMs };
    }

    const t0 = Date.now();
    const solver = new EntropySolver(length, candidates, allGuesses);
    const move = solver.getNextMove(history, candidates, DEFAULT_MAX_GUESSES - history.length);
    maxMoveMs = Math.max(maxMoveMs, Date.now() - t0);

    const feedback = GameEngine.generateFeedback(move.guess, secret);
    history.push({ guess: move.guess, feedback, timestamp: Date.now() });
    if (GameEngine.isWin(feedback)) {
      return { guesses: turn, solved: true, maxMoveMs };
    }
  }
  return { guesses: DEFAULT_MAX_GUESSES, solved: false, maxMoveMs };
}

async function main() {
  const length = (Number(process.argv[2]) || 5) as WordLength;
  const sampleSize = Number(process.argv[3]) || 400;

  await WordService.initialize();
  const all = WordService.getAnswerWords(length);
  const allGuesses = WordService.getGuessWords(length);

  const rand = mulberry32(20260909);
  const sample: string[] = [];
  for (let i = 0; i < sampleSize; i++) {
    sample.push(all[Math.floor(rand() * all.length)]);
  }

  const dist = new Map<number, number>();
  let solved = 0;
  let totalGuesses = 0;
  let maxMoveMs = 0;
  const failures: string[] = [];

  const started = Date.now();
  for (const secret of sample) {
    const r = playGame(secret, length, all, allGuesses);
    maxMoveMs = Math.max(maxMoveMs, r.maxMoveMs);
    if (r.solved) {
      solved++;
      totalGuesses += r.guesses;
      dist.set(r.guesses, (dist.get(r.guesses) || 0) + 1);
    } else {
      failures.push(secret);
    }
  }

  console.log(`\n${length}-letter, ${sampleSize} games (seed 20260909)`);
  console.log(`  win rate        : ${((solved / sampleSize) * 100).toFixed(2)}%  (${solved}/${sampleSize})`);
  console.log(`  avg guesses/win : ${(totalGuesses / Math.max(solved, 1)).toFixed(3)}`);
  console.log(`  distribution    : ${[...dist.entries()].sort((a, b) => a[0] - b[0]).map(([g, n]) => `${g}:${n}`).join('  ')}`);
  console.log(`  slowest move    : ${maxMoveMs}ms`);
  console.log(`  wall clock      : ${((Date.now() - started) / 1000).toFixed(1)}s`);
  if (failures.length) {
    console.log(`  losses          : ${failures.slice(0, 25).join(', ')}${failures.length > 25 ? ` (+${failures.length - 25} more)` : ''}`);
  }
}

main();
