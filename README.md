# AI Wordle Duel

A sophisticated Wordle-style duel game where players can challenge AI solvers, race against them, or watch AI-vs-AI matches. Supports variable word lengths from 3 to 7 letters with multiple AI strategies including entropy-based solvers and machine learning policies.

## Features

- **Variable Word Lengths**: Play with 3, 4, 5, 6, or 7-letter words
- **Multiple Game Modes**:
  - Custom Challenge: Submit a secret word and watch the AI solve it
  - Human Play: Classic Wordle gameplay with AI hints
  - Race Mode: Compete against AI on the same secret word
  - AI vs AI: Watch different AI strategies compete
- **Advanced AI Solvers**:
  - Frequency-based heuristic solver
  - Entropy/Information-gain solver
  - Supervised ML policy (trained on expert trajectories)
  - Optional RL fine-tuned policy
- **AI Explanation Panel**: See the AI's reasoning, top candidates, and expected information gain
- **Hard Mode**: Discovered letters must be used in subsequent guesses
- **Shareable Challenges**: Generate challenge links with specific seeds or custom secrets
- **Leaderboards**: Track performance across different word lengths and game modes

## Architecture

### Frontend
- React with TypeScript
- Responsive Wordle grid that adapts to word length
- Real-time game state updates
- AI reasoning visualization

### Backend
- Node.js with Express
- Length-agnostic game engine
- Multiple AI solver implementations
- Redis for game state caching
- PostgreSQL for user data and leaderboards

### ML Pipeline
- Python-based training pipeline
- Supervised learning from expert trajectories
- Optional RL fine-tuning with PPO/A2C
- Masked action space for valid guesses only

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Redis (optional, for production)
- PostgreSQL (optional, for leaderboards)
- Python 3.9+ (for ML training)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Custom_Wordle
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Prepare word lists:
```bash
npm run prepare-data
```

5. Start development servers:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3000`.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
Custom_Wordle/
├── backend/
│   ├── server.ts              # Express server entry point
│   ├── routes/                # API route handlers
│   ├── services/              # Business logic
│   │   ├── game-engine.ts     # Core Wordle game logic
│   │   ├── solvers/           # AI solver implementations
│   │   │   ├── frequency-solver.ts
│   │   │   ├── entropy-solver.ts
│   │   │   └── ml-solver.ts
│   │   └── word-service.ts    # Word list management
│   ├── models/                # Database models
│   └── middleware/            # Express middleware
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── WordleGrid.tsx
│   │   │   ├── Keyboard.tsx
│   │   │   ├── AIPanel.tsx
│   │   │   └── RaceMode.tsx
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API client
│   │   └── App.tsx
│   └── index.html
├── shared/
│   ├── types.ts               # Shared TypeScript types
│   └── constants.ts           # Shared constants
├── ml/
│   ├── train_policy.py        # ML training script
│   ├── models/                # ML model architectures
│   └── requirements.txt       # Python dependencies
├── data/
│   ├── words/                 # Word lists by length
│   │   ├── 3-letters-answer.txt
│   │   ├── 3-letters-guess.txt
│   │   └── ...
│   └── frequencies/           # Letter frequency data
├── scripts/
│   ├── prepare-word-lists.ts  # Word list preparation
│   └── generate-trajectories.ts # Generate training data
└── tests/
    ├── backend/
    └── frontend/
```

## Game Rules

- Players have 6 attempts to guess the secret word
- After each guess, tiles show feedback:
  - 🟩 **Green**: Correct letter in correct position
  - 🟨 **Yellow**: Correct letter in wrong position
  - ⬜ **Gray**: Letter not in the word
- Duplicate letters are handled correctly (greens take priority, then yellows)
- In Hard Mode, revealed hints must be used in subsequent guesses

## AI Solvers

### Frequency Solver
Uses letter frequency analysis and positional statistics to make educated guesses. Fast and effective for shorter words.

### Entropy Solver
Calculates expected information gain for each possible guess, selecting the one that maximally reduces the candidate set. More computationally intensive but highly effective.

### ML Policy
Trained on expert trajectories from the entropy solver. Learns to balance information gain with likelihood of being the answer. Supports both per-length and unified models.

### RL Policy (Optional)
Fine-tuned using reinforcement learning (PPO) to optimize guess efficiency. Uses masked action spaces to ensure valid guesses.

## API Endpoints

- `POST /api/game/create` - Create a new game
- `POST /api/game/:gameId/guess` - Submit a guess
- `GET /api/game/:gameId/ai-move` - Get AI's next move
- `POST /api/game/:gameId/validate` - Validate a word
- `GET /api/leaderboard/:length` - Get leaderboard for word length
- `GET /api/words/random/:length` - Get random word

## ML Training

To train the ML policy:

1. Generate expert trajectories:
```bash
npm run generate-trajectories
```

2. Train the model:
```bash
cd ml
pip install -r requirements.txt
python train_policy.py --length 5 --epochs 50
```

3. The trained model will be saved to `ml/models/`

## Testing

```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
```

## Contributing

Contributions are welcome! Please ensure:
- All tests pass
- Code follows the existing style
- New features include tests
- Documentation is updated

## License

MIT License

## Acknowledgments

- Word lists sourced from ENABLE and wordfreq datasets
- Inspired by the original Wordle by Josh Wardle
