# AI Wordle Duel

A sophisticated word-guessing game where you can compete against advanced AI solvers. Challenge yourself with variable word lengths and multiple game modes powered by intelligent algorithms.

## Features

### Game Modes
- **Human Play**: Classic Wordle gameplay - guess the secret word
- **Challenge AI**: Choose a word and watch the AI try to guess it
- **Race Mode**: Compete head-to-head against the AI solver
- **Variable Word Lengths**: Play with 3, 4, 5, 6, or 7-letter words
- **Hard Mode**: Use discovered letters in all subsequent guesses

### AI Technology
- **Entropy-Based Solver**: Uses information theory to maximize guess efficiency
- **Frequency-Based Solver**: Leverages letter patterns and positional statistics
- **Real-Time Feedback**: See the AI's reasoning and strategy

### User Experience
- Clean, Wordle-inspired interface
- Dark mode support
- Keyboard support for quick gameplay
- Visual feedback with color-coded tiles
- Scoreboard tracking in Race Mode

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

### Deploying to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy to Vercel:
```bash
vercel
```

4. For production deployment:
```bash
vercel --prod
```

The deployment is configured in `vercel.json`. The backend serves both the API and the static frontend files.

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

## How to Play

- Players have **6 attempts** to guess the secret word
- After each guess, tiles show feedback:
  - **Green**: Correct letter in the correct position
  - **Yellow**: Letter is in the word but wrong position
  - **Gray**: Letter is not in the word
- Duplicate letters are handled correctly
- **Hard Mode**: All revealed letters must be used in subsequent guesses

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
