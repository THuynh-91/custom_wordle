/**
 * Generate expert trajectories for ML training
 * Uses entropy solver to generate high-quality training data
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { WordService } from '../backend/services/word-service.js';
import { GameEngine } from '../backend/services/game-engine.js';
import { EntropySolver } from '../backend/services/solvers/entropy-solver.js';
import { WordLength, TrainingTrajectory } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'trajectories');

async function generateTrajectories(length: WordLength, numGames: number) {
  console.log(`\nGenerating ${numGames} trajectories for ${length}-letter words...`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, `expert-${length}.jsonl`);
  const writeStream = fs.createWriteStream(outputPath, { flags: 'w' });

  const answerWords = WordService.getAnswerWords(length);
  const allGuesses = WordService.getGuessWords(length);

  let won = 0;
  let lost = 0;
  let totalGuesses = 0;

  for (let i = 0; i < numGames; i++) {
    // Select random secret word
    const secret = answerWords[Math.floor(Math.random() * answerWords.length)];

    // Play game with entropy solver
    const solver = new EntropySolver(length, answerWords, allGuesses);
    const guesses: string[] = [];
    const feedbacks: any[] = [];
    let gameWon = false;

    for (let attempt = 0; attempt < 6; attempt++) {
      const candidates = GameEngine.filterCandidates(
        answerWords,
        GameEngine.buildConstraints(guesses.map((g, i) => ({
          guess: g,
          feedback: feedbacks[i],
          timestamp: Date.now()
        })))
      );

      const move = solver.getNextMove(
        guesses.map((g, i) => ({ guess: g, feedback: feedbacks[i], timestamp: Date.now() })),
        candidates
      );

      const feedback = GameEngine.generateFeedback(move.guess, secret);
      guesses.push(move.guess);
      feedbacks.push(feedback);

      if (GameEngine.isWin(feedback)) {
        gameWon = true;
        won++;
        totalGuesses += guesses.length;
        break;
      }
    }

    if (!gameWon) {
      lost++;
    }

    // Save trajectory
    const trajectory: TrainingTrajectory = {
      length,
      secret,
      guesses,
      feedbacks,
      won: gameWon,
      solverType: 'entropy',
      timestamp: Date.now()
    };

    writeStream.write(JSON.stringify(trajectory) + '\n');

    if ((i + 1) % 100 === 0) {
      const progress = ((i + 1) / numGames * 100).toFixed(1);
      const winRate = (won / (i + 1) * 100).toFixed(1);
      const avgGuesses = (totalGuesses / won).toFixed(2);
      console.log(`  Progress: ${progress}% | Win rate: ${winRate}% | Avg guesses: ${avgGuesses}`);
    }
  }

  writeStream.end();

  console.log(`\n✓ Generated ${numGames} trajectories`);
  console.log(`  Won: ${won} (${(won / numGames * 100).toFixed(1)}%)`);
  console.log(`  Lost: ${lost} (${(lost / numGames * 100).toFixed(1)}%)`);
  console.log(`  Avg guesses (when won): ${(totalGuesses / won).toFixed(2)}`);
  console.log(`  Saved to: ${outputPath}`);
}

async function main() {
  console.log('🤖 Expert Trajectory Generator\n');
  console.log('Initializing word service...');

  await WordService.initialize();

  const lengths: WordLength[] = [3, 4, 5, 6, 7];
  const gamesPerLength = 1000; // Adjust as needed

  for (const length of lengths) {
    await generateTrajectories(length, gamesPerLength);
  }

  console.log('\n✅ All trajectories generated successfully!');
  console.log('\nYou can now train ML models using:');
  console.log('  cd ml');
  console.log('  pip install -r requirements.txt');
  console.log('  python train_policy.py --length 5 --epochs 50');
}

main().catch(error => {
  console.error('Error generating trajectories:', error);
  process.exit(1);
});
