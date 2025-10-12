/**
 * Simple working server for AI Wordle Duel
 * No TypeScript complexity - just Node.js
 * Run with: node simple-server.js
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

console.log('🚀 Starting AI Wordle Duel Server...\n');

// Load word lists
const answerWords = {};
const guessWords = {};

[3, 4, 5, 6, 7].forEach(length => {
  const answerFile = path.join(__dirname, 'data', 'words', `${length}-letters-answer.txt`);
  const guessFile = path.join(__dirname, 'data', 'words', `${length}-letters-guess.txt`);

  if (fs.existsSync(answerFile)) {
    answerWords[length] = fs.readFileSync(answerFile, 'utf-8')
      .split('\n')
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length === length);
    console.log(`✓ Loaded ${answerWords[length].length} answer words for length ${length}`);
  }

  if (fs.existsSync(guessFile)) {
    guessWords[length] = fs.readFileSync(guessFile, 'utf-8')
      .split('\n')
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length === length);
    console.log(`✓ Loaded ${guessWords[length].length} guess words for length ${length}`);
  }
});

// In-memory game storage
const games = new Map();

// Helper: Generate feedback
function generateFeedback(guess, secret) {
  const feedback = Array(secret.length).fill('absent');
  const secretCounts = {};

  // Count letters in secret
  for (const letter of secret) {
    secretCounts[letter] = (secretCounts[letter] || 0) + 1;
  }

  // First pass: mark correct positions
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) {
      feedback[i] = 'correct';
      secretCounts[guess[i]]--;
    }
  }

  // Second pass: mark present letters
  for (let i = 0; i < guess.length; i++) {
    if (feedback[i] !== 'correct') {
      const remaining = secretCounts[guess[i]] || 0;
      if (remaining > 0) {
        feedback[i] = 'present';
        secretCounts[guess[i]]--;
      }
    }
  }

  return feedback;
}

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    wordsLoaded: Object.keys(answerWords).reduce((sum, len) => sum + answerWords[len].length, 0),
    gamesActive: games.size
  });
});

app.post('/api/game/create', (req, res) => {
  const { mode = 'human-play', length = 5, hardMode = false, secret } = req.body;

  if (![3, 4, 5, 6, 7].includes(length)) {
    return res.status(400).json({ error: 'Invalid length', message: 'Length must be 3-7' });
  }

  if (!answerWords[length]) {
    return res.status(500).json({ error: 'No words', message: `No words loaded for length ${length}` });
  }

  let secretWord;
  if (mode === 'custom-challenge' && secret) {
    secretWord = secret.toLowerCase();
    if (!answerWords[length].includes(secretWord)) {
      return res.status(400).json({ error: 'Invalid word', message: 'Word not in answer list' });
    }
  } else {
    const wordList = answerWords[length];
    secretWord = wordList[Math.floor(Math.random() * wordList.length)];
  }

  const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  games.set(gameId, {
    gameId,
    mode,
    length,
    secret: secretWord,
    maxGuesses: 6,
    hardMode,
    guesses: [],
    status: 'in-progress',
    startedAt: Date.now()
  });

  console.log(`🎮 Game created: ${gameId} (${length} letters, mode: ${mode})`);

  res.status(201).json({
    gameId,
    mode,
    length,
    maxGuesses: 6,
    hardMode
  });
});

app.post('/api/game/:gameId/guess', (req, res) => {
  const { gameId } = req.params;
  const { word } = req.body;

  const game = games.get(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Not Found', message: `Game ${gameId} not found` });
  }

  if (game.status !== 'in-progress') {
    return res.status(400).json({ error: 'Game Ended', message: 'Game has already ended' });
  }

  const normalizedWord = word.toLowerCase().trim();

  if (normalizedWord.length !== game.length) {
    return res.status(400).json({
      error: 'Invalid Guess',
      message: `Guess must be ${game.length} letters, got ${normalizedWord.length}`
    });
  }

  if (!guessWords[game.length].includes(normalizedWord)) {
    return res.status(400).json({
      error: 'Invalid Word',
      message: `"${word}" is not in the valid word list`
    });
  }

  const feedback = generateFeedback(normalizedWord, game.secret);
  const isWin = feedback.every(f => f === 'correct');
  const isLoss = game.guesses.length + 1 >= game.maxGuesses && !isWin;

  game.guesses.push({
    guess: normalizedWord,
    feedback,
    timestamp: Date.now()
  });

  if (isWin) {
    game.status = 'won';
    game.completedAt = Date.now();
  } else if (isLoss) {
    game.status = 'lost';
    game.completedAt = Date.now();
  }

  console.log(`  Guess: ${normalizedWord} → ${feedback.join('')} (${game.status})`);

  res.json({
    feedback,
    status: game.status,
    guessNumber: game.guesses.length,
    remainingGuesses: game.maxGuesses - game.guesses.length,
    secret: game.status !== 'in-progress' ? game.secret : undefined
  });
});

app.get('/api/game/:gameId', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Not Found' });
  }

  res.json({
    ...game,
    secret: game.status !== 'in-progress' ? game.secret : undefined
  });
});

app.get('/api/words/random/:length', (req, res) => {
  const length = parseInt(req.params.length);
  if (!answerWords[length]) {
    return res.status(400).json({ error: 'Invalid length' });
  }

  const wordList = answerWords[length];
  const word = wordList[Math.floor(Math.random() * wordList.length)];

  res.json({ word, length });
});

app.get('/api/words/info', (req, res) => {
  const info = {};
  Object.keys(answerWords).forEach(length => {
    info[length] = {
      answers: answerWords[length].length,
      guesses: guessWords[length].length
    };
  });
  res.json(info);
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('✅ AI Wordle Duel Server Ready!');
  console.log('='.repeat(50));
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`\n📊 Word Lists:`);
  Object.entries(answerWords).forEach(([len, words]) => {
    console.log(`   ${len} letters: ${words.length} answers`);
  });
  console.log('\n🎮 Ready to play!\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Server shutting down...');
  process.exit(0);
});
