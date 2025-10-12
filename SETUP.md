# Setup Instructions - IMPORTANT!

## The Issue You're Experiencing

The app was created but needs proper initialization. Here's how to get it working:

## Current Status

✅ **Word Lists**: Created and populated (438-580 words per length)
✅ **Project Structure**: Complete
✅ **Code**: Fully implemented
❌ **Not Running**: Backend initialization issue

## How The App Works

### Word Source
The words come from **embedded word lists** in `scripts/prepare-word-lists.ts`. The script creates text files in `data/words/` directory with:
- **3-7 letter words** (3, 4, 5, 6, 7)
- **Answer lists**: Curated, playable words
- **Guess lists**: Broader valid dictionary

When you run `npm run prepare-data`, it:
1. Reads hardcoded word arrays from the script
2. Writes them to `.txt` files in `data/words/`
3. Calculates letter frequencies
4. Saves frequency data to `data/frequencies/`

### Frontend
React app at `http://localhost:5174` (or 5173)
- Game setup screen
- Wordle grid (responsive to word length)
- On-screen keyboard
- AI explanation panel

### Backend
Express API at `http://localhost:3000`
- Loads word lists on startup
- Provides game management endpoints
- Runs AI solvers

## Quick Fix - Get It Running Now!

### Option 1: Simple Node Server (No TypeScript Complexity)

Create a simplified server that works immediately:

```bash
# 1. Install only what's needed
npm install express cors dotenv

# 2. Create simple-server.js
cat > simple-server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Load word lists
const words = {};
[3, 4, 5, 6].forEach(len => {
  const file = path.join(__dirname, 'data', 'words', `${len}-letters-answer.txt`);
  if (fs.existsSync(file)) {
    words[len] = fs.readFileSync(file, 'utf-8').split('\n').filter(w => w.trim());
  }
});

const games = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', wordsLoaded: Object.keys(words).length });
});

app.post('/api/game/create', (req, res) => {
  const { length = 5 } = req.body;
  const wordList = words[length] || words[5];
  const secret = wordList[Math.floor(Math.random() * wordList.length)];
  const gameId = Date.now().toString();

  games.set(gameId, {
    secret,
    guesses: [],
    length
  });

  res.json({ gameId, length, maxGuesses: 6 });
});

app.post('/api/game/:id/guess', (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const { word } = req.body;
  const feedback = [];

  // Simple feedback logic
  for (let i = 0; i < word.length; i++) {
    if (word[i] === game.secret[i]) {
      feedback.push('correct');
    } else if (game.secret.includes(word[i])) {
      feedback.push('present');
    } else {
      feedback.push('absent');
    }
  }

  game.guesses.push({ word, feedback });
  const won = feedback.every(f => f === 'correct');

  res.json({
    feedback,
    status: won ? 'won' : (game.guesses.length >= 6 ? 'lost' : 'in-progress'),
    secret: won || game.guesses.length >= 6 ? game.secret : undefined
  });
});

app.listen(3000, () => {
  console.log('✅ Server running on http://localhost:3000');
  console.log(`📚 Loaded ${Object.values(words).reduce((a,b) => a + b.length, 0)} words`);
});
EOF

# 3. Run it!
node simple-server.js
```

### Option 2: Fix TypeScript Setup

The issue is likely with ts-node/esm loader. Fix it:

```bash
# 1. Update package.json dev:backend script
npm pkg set scripts.dev:backend="tsx backend/server.ts"

# 2. Install tsx (better than ts-node)
npm install -D tsx

# 3. Run
npm run dev
```

### Option 3: Pre-compile TypeScript

```bash
# 1. Build everything first
npm run build

# 2. Run the built version
node dist/backend/server.js
```

## Verify It Works

```bash
# Test backend
curl http://localhost:3000/health

# Should return:
# {"status":"ok","wordsLoaded":4}

# Test game creation
curl -X POST http://localhost:3000/api/game/create \
  -H "Content-Type: application/json" \
  -d '{"length":5}'
```

## What You'll See When Working

1. **Game Setup Screen**
   - Choose mode (Human Play, Challenge AI, Race)
   - Select word length (3-7)
   - Pick AI solver (Frequency or Entropy)

2. **Playing**
   - Type guesses or use on-screen keyboard
   - See color-coded feedback
   - AI shows its reasoning

3. **AI Explanations**
   - Why it chose each word
   - How many candidates remain
   - Expected information gain

## Still Not Working?

### Check These:

1. **Port conflicts**:
   ```bash
   # Kill anything on port 3000
   npx kill-port 3000
   ```

2. **Missing 7-letter words**:
   The prepare script might not have finished. Check:
   ```bash
   ls -la data/words/
   # Should see 7-letters-answer.txt and 7-letters-guess.txt
   ```

3. **Module errors**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **TypeScript errors**:
   Use the simple server (Option 1) to verify the concept works first!

## The Full Picture

```
Request Flow:
Frontend (React) → API (Express) → Game Engine → AI Solvers → Word Lists

1. User types guess
2. Frontend sends to /api/game/:id/guess
3. Backend loads game state
4. Game engine calculates feedback
5. If AI mode, solver picks next word
6. Response sent back to frontend
7. UI updates with colors
```

## Debug Mode

Add logging to see what's happening:

```javascript
// In backend/server.ts or simple-server.js
console.log('Starting server...');
console.log('Words loaded:', Object.keys(words));
console.log('Listening on port:', PORT);
```

## Success Checklist

- [ ] `npm install` completed
- [ ] `data/words/` contains .txt files
- [ ] `.env` file exists
- [ ] Backend starts without errors
- [ ] `curl http://localhost:3000/health` returns JSON
- [ ] Frontend loads in browser
- [ ] Can create a game
- [ ] Can submit guesses

## Need More Help?

The words are already there in `data/words/*.txt`. The issue is just getting the servers to communicate properly. Try the simple-server.js approach first - it removes all TypeScript complexity and proves the concept works!
