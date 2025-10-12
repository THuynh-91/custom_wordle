# Quick Start Guide

Get AI Wordle Duel up and running in 5 minutes!

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- npm 9+ (comes with Node.js)
- Git ([Download](https://git-scm.com/))

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Custom_Wordle
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages for both frontend and backend.

### 3. Set Up Environment

```bash
cp .env.example .env
```

The default `.env.example` works for local development. No changes needed!

### 4. Prepare Word Lists

```bash
npm run prepare-data
```

This generates word lists for lengths 3-7 and calculates letter frequencies. Takes about 10 seconds.

## Running the Application

### Development Mode

Start both frontend and backend servers:

```bash
npm run dev
```

This starts:
- **Frontend** at `http://localhost:5173`
- **Backend** at `http://localhost:3000`

Open your browser to `http://localhost:5173` and start playing!

### Running Separately

If you prefer to run frontend and backend separately:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

## Your First Game

1. **Open** `http://localhost:5173` in your browser

2. **Choose a game mode:**
   - **Human Play**: Classic Wordle - guess the secret word
   - **Challenge AI**: Submit your word and watch the AI solve it
   - **Race Mode**: Compete against the AI

3. **Select word length:** 3, 4, 5, 6, or 7 letters

4. **Pick an AI solver:**
   - **Frequency Heuristic**: Fast, uses letter frequencies
   - **Entropy**: Slower but smarter, maximizes information gain

5. **Start playing!**

## Game Modes Explained

### Human Play Mode
You guess the secret word. Just like regular Wordle!
- Green = correct letter, correct position
- Yellow = correct letter, wrong position
- Gray = letter not in word

### Challenge AI Mode
Submit a custom word and watch the AI try to solve it. Great for testing the AI with tricky words!

### Race Mode
You and the AI get the same secret word. Who can solve it faster?

## Optional: ML Training

Want to train your own AI solver?

### 1. Generate Training Data

```bash
npm run generate-trajectories
```

This creates expert trajectories using the entropy solver. Takes 5-10 minutes.

### 2. Install Python Dependencies

```bash
cd ml
pip install -r requirements.txt
```

### 3. Train the Model

```bash
python train_policy.py --length 5 --epochs 50
```

Trains a neural network for 5-letter words. The model learns from expert plays!

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Building for Production

Build optimized production bundles:

```bash
npm run build
```

This creates:
- `dist/frontend/` - Static frontend files
- `dist/backend/` - Compiled backend code

Run in production mode:

```bash
npm start
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development servers |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm test` | Run tests |
| `npm run lint` | Check code quality |
| `npm run prepare-data` | Generate word lists |
| `npm run generate-trajectories` | Create ML training data |

## Project Structure

```
Custom_Wordle/
├── backend/           # Express API server
│   ├── routes/       # API endpoints
│   ├── services/     # Game engine & AI solvers
│   └── server.ts     # Server entry point
├── frontend/         # React UI
│   └── src/
│       ├── components/ # React components
│       └── App.tsx   # Main app component
├── shared/           # Shared types & constants
├── data/            # Word lists & frequencies
├── ml/              # Machine learning pipeline
│   ├── train_policy.py  # ML training script
│   └── requirements.txt # Python dependencies
└── scripts/         # Utility scripts
```

## Troubleshooting

### Port Already in Use

If port 3000 or 5173 is already in use:

```bash
# Change ports in .env
PORT=3001  # for backend
```

```typescript
// Change frontend port in vite.config.ts
server: { port: 5174 }
```

### Word Lists Not Found

Make sure you've run:

```bash
npm run prepare-data
```

### Module Not Found Errors

Reinstall dependencies:

```bash
rm -rf node_modules
npm install
```

### TypeScript Errors

Ensure TypeScript is installed:

```bash
npm install -D typescript
```

## Next Steps

- Read the full [README.md](./README.md) for detailed features
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- See [CONTRIBUTING.md](./CONTRIBUTING.md) to contribute
- Explore the codebase and customize it!

## Tips & Tricks

### Best Starting Words

For 5-letter words, these are statistically strong openers:
- **crane** - high frequency letters, good distribution
- **slate** - tests common letters
- **adieu** - covers vowels

### Hard Mode Challenge

Enable Hard Mode for an extra challenge! Revealed hints must be used in subsequent guesses.

### Watch the AI Think

In Custom Challenge mode, the AI explains its reasoning for each guess. See how it calculates information gain and chooses optimal moves!

### Compare Solvers

Try the same word with different solvers to see how they differ in strategy.

## Need Help?

- Check existing [GitHub Issues](../../issues)
- Read the [full documentation](./README.md)
- Open a new issue if you're stuck

## Have Fun!

Enjoy playing AI Wordle Duel and challenging the AI solvers! 🎮

---

**Ready to play?** Run `npm run dev` and open `http://localhost:5173`
