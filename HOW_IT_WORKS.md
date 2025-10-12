# 🎮 How AI Wordle Duel Works - Complete Guide

## ✅ IT'S WORKING NOW!

The backend server is running! Here's how everything works:

## 📊 Where Do The Words Come From?

### Source: Hardcoded Lists in `scripts/prepare-word-lists.ts`

The words are **embedded directly in the code** in the prepare script. Here's what happens:

1. **Word Lists Defined**: The script contains curated English word arrays:
   ```typescript
   const WORD_LISTS = {
     3: { answer: ['ace', 'act', 'add', ...], guess: [...] },
     4: { answer: ['able', 'acid', ...], guess: [...] },
     5: { answer: ['about', 'above', ...], guess: [...] },
     ...
   };
   ```

2. **Script Execution**: When you run `npm run prepare-data`:
   - Reads these arrays from the script
   - Writes them to `.txt` files in `data/words/`
   - Calculates letter frequencies
   - Saves frequency data to `data/frequencies/`

3. **Server Loading**: When the server starts:
   - Reads `.txt` files from `data/words/`
   - Loads them into memory
   - Makes them available via API

### Current Word Count

```
3 letters: 439 answer words, 500 valid guesses
4 letters: 563 answer words, 889 valid guesses
5 letters: 508 answer words, 882 valid guesses
6 letters: 550 answer words, 1,345 valid guesses
Total: 2,060 answer words
```

## 🚀 Running The App (3 Options)

### Option 1: Simple Server (RECOMMENDED - Currently Running!)

**The simple server is already running!** Backend is at `http://localhost:3000`

```bash
# It's already started! Test it:
curl http://localhost:3000/health

# To restart it manually:
node simple-server.cjs
```

Then open `demo.html` in your browser to play!

### Option 2: Full TypeScript Stack

```bash
# 1. Build the TypeScript code
npm run build

# 2. Run the built version
node dist/backend/server.js

# 3. Open frontend
open http://localhost:5174
```

### Option 3: Development Mode (Hot Reload)

```bash
# Start both frontend and backend with hot reload
npm run dev

# Frontend: http://localhost:5174
# Backend: http://localhost:3000
```

## 🎯 How To Play RIGHT NOW

### Quick Demo (No Setup Needed)

1. **Server is running** at `http://localhost:3000` ✅
2. **Open `demo.html`** in your browser
3. **Choose word length** (3, 4, 5, or 6)
4. **Start playing!**

### Using The React Frontend

```bash
# In a new terminal
cd frontend
npm install
npm run dev

# Open http://localhost:5174
```

## 🏗️ Architecture Explained

```
┌─────────────┐
│   Browser   │  ← You type guesses here
└──────┬──────┘
       │
       │ HTTP Request
       │ POST /api/game/:id/guess
       │ { "word": "CRANE" }
       ↓
┌──────────────────┐
│  Express Server  │  ← simple-server.cjs
│  (Port 3000)     │     backend/server.ts (TypeScript)
└────────┬─────────┘
         │
         │ 1. Load game state
         │ 2. Validate guess
         │ 3. Generate feedback
         ↓
┌──────────────────┐
│   Game Engine    │  ← backend/services/game-engine.ts
│                  │     Calculates Green/Yellow/Gray
└────────┬─────────┘
         │
         │ Compare guess vs secret
         │ Handle duplicate letters
         ↓
┌──────────────────┐
│   Word Lists     │  ← data/words/*.txt
│                  │     Loaded from disk
└──────────────────┘
```

## 🔄 Request Flow Example

**You type: "CRANE"**

1. Frontend sends:
   ```json
   POST http://localhost:3000/api/game/abc123/guess
   { "word": "crane" }
   ```

2. Server receives:
   - Loads game `abc123` from memory
   - Secret word is `"slate"`

3. Game Engine calculates:
   ```javascript
   // c !== s → absent (gray)
   // r !== l → absent (gray)
   // a === a → correct (green) ✓
   // n !== t → absent (gray)
   // e === e → correct (green) ✓
   ```

4. Server responds:
   ```json
   {
     "feedback": ["absent", "absent", "correct", "absent", "correct"],
     "status": "in-progress",
     "remainingGuesses": 5
   }
   ```

5. Frontend displays:
   ```
   C  R  A  N  E
   ⬜ ⬜ 🟩 ⬜ 🟩
   ```

## 🎲 Game Modes

### 1. Human Play (Default)
- **You** guess the secret word
- Server provides feedback
- 6 attempts to win

### 2. Custom Challenge
- **You** provide the secret word
- **AI** tries to solve it
- Watch the AI's reasoning

### 3. Race Mode
- Same secret for you **and** AI
- Side-by-side boards
- Who solves it first?

### 4. AI vs AI (Advanced)
- Watch different AI strategies compete
- Compare entropy vs frequency solver

## 🤖 AI Solvers Explained

### Frequency Solver
- Uses letter frequency statistics
- Prioritizes common letters
- Fast but not optimal

### Entropy Solver
- Calculates information gain
- Maximizes expected reduction
- Slower but smarter

### ML Solver (Future)
- Neural network trained on expert games
- Learns optimal strategies
- Requires training first

## 📁 File Structure

```
Custom_Wordle/
├── simple-server.cjs     ← WORKING SERVER (Node.js, no TypeScript)
├── demo.html             ← PLAY NOW! (Single file demo)
│
├── backend/              ← Full TypeScript implementation
│   ├── server.ts         ← Express server
│   ├── services/
│   │   ├── game-engine.ts    ← Core logic
│   │   ├── word-service.ts   ← Word management
│   │   └── solvers/          ← AI strategies
│   └── routes/           ← API endpoints
│
├── frontend/             ← React UI
│   └── src/
│       ├── components/   ← UI components
│       └── App.tsx       ← Main app
│
├── data/                 ← Generated data
│   ├── words/            ← Word list .txt files
│   └── frequencies/      ← Letter frequency JSON
│
└── scripts/              ← Utilities
    └── prepare-word-lists.ts  ← Word list generator
```

## 🔧 API Endpoints (Working Now!)

```bash
# Health check
curl http://localhost:3000/health

# Create game
curl -X POST http://localhost:3000/api/game/create \
  -H "Content-Type: application/json" \
  -d '{"mode":"human-play","length":5}'

# Submit guess
curl -X POST http://localhost:3000/api/game/GAME_ID/guess \
  -H "Content-Type: application/json" \
  -d '{"word":"crane"}'

# Get word list info
curl http://localhost:3000/api/words/info

# Get random word
curl http://localhost:3000/api/words/random/5
```

## 🐛 Troubleshooting

### "Connection refused"
```bash
# Check if server is running
curl http://localhost:3000/health

# If not, start it
node simple-server.cjs
```

### "Module not found"
```bash
# Make sure you're in the right directory
cd "Custom_Wordle"

# Install dependencies
npm install
```

### "Word lists empty"
```bash
# Check files exist
ls data/words/

# If missing, run prepare script
npm run prepare-data
```

### "Port already in use"
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 node simple-server.cjs
```

## 🎯 Next Steps

### Play Now
1. Server is running ✓
2. Open `demo.html` in browser
3. Start playing!

### Full React App
1. `cd frontend && npm install`
2. `npm run dev`
3. Open `http://localhost:5174`

### Train ML Model
1. `npm run generate-trajectories`
2. `cd ml && pip install -r requirements.txt`
3. `python train_policy.py --length 5`

## 📚 Learn More

- **README.md** - Full feature list
- **QUICKSTART.md** - 5-minute setup guide
- **DEPLOYMENT.md** - Production deployment
- **SETUP.md** - Detailed troubleshooting

## 🎉 Success!

You now understand:
- ✅ Words come from hardcoded arrays
- ✅ Server loads them from .txt files
- ✅ Game engine provides feedback
- ✅ Multiple game modes available
- ✅ AI solvers use different strategies
- ✅ Full stack: React + Express + TypeScript

**Happy playing! 🎮**
