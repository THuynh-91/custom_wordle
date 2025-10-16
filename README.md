# AI Wordle Duel

A sophisticated word-guessing game featuring advanced AI solvers powered by algorithmic intelligence. Compete against optimized solvers, challenge them with custom words, or race head-to-head across multiple word lengths.

## Overview

AI Wordle Duel is a full-stack TypeScript application that extends the classic Wordle concept with intelligent AI opponents. The project features multiple game modes, variable word lengths (3-7 letters), and two distinct AI solving approaches: entropy maximization and frequency analysis. Built with React, Node.js, and Express, the application provides a seamless gaming experience with real-time state management and responsive design.

## Features

### Game Modes

#### 1. Today's Wordle
Watch the AI solve the official daily Wordle puzzle. The AI demonstrates its solving strategy on the same 5-letter word everyone else is playing.

#### 2. Challenge AI
Submit your own custom word (3-7 letters) and watch the AI attempt to solve it. After the AI completes the puzzle, you can immediately challenge it with another word through the replay interface, allowing for rapid successive challenges.

#### 3. Race Mode
Compete head-to-head against the AI on the same secret word. Both players see the same puzzle and race to solve it first. Features include:
- Real-time turn indicators showing whose turn is active
- Live scoreboard tracking wins, losses, and ties
- Game-ending modal displaying the secret word and current score
- Instant replay functionality to start a new race with a different word

#### 4. Human Play
Classic Wordle gameplay where you try to guess the secret word in 6 attempts or fewer.

### AI Technology

The project implements **algorithmic solvers** (not machine learning) using two distinct approaches:

#### Entropy-Based Solver
Uses information theory to maximize information gain with each guess. The solver:
- Calculates the expected entropy reduction for every possible guess
- Selects the word that most effectively partitions the remaining solution space
- Achieves optimal performance through mathematical optimization
- Works efficiently across all word lengths (3-7 letters)

#### Frequency-Based Solver
Leverages statistical analysis of letter patterns:
- Analyzes letter frequency by position in valid words
- Scores words based on common letter combinations
- Provides fast, heuristic-based guessing
- Particularly effective for shorter words

Both solvers operate deterministically using word list analysis and pattern matching rather than neural networks or reinforcement learning.

### User Experience
- **Clean, Wordle-inspired interface** with color-coded tile feedback
- **Dark mode support** with system preference detection and local storage persistence
- **On-screen keyboard** with visual feedback for letter states (correct, present, absent)
- **Responsive design** that adapts to mobile, tablet, and desktop screens
- **Real-time game state** updates with smooth animations
- **Score persistence** across game sessions in Race Mode
- **Modal system** for game results with conditional content based on game mode

## Technical Architecture

### Technology Stack

**Frontend:**
- **React 18** with functional components and hooks
- **TypeScript** for type safety and developer experience
- **Vite** for fast development and optimized production builds
- **CSS3** with CSS variables for theming

**Backend:**
- **Node.js** runtime
- **Express** web framework
- **TypeScript** for end-to-end type safety
- **In-memory game state** management (no external database required)

**Shared:**
- Shared TypeScript types between frontend and backend
- Consistent data models and constants

### Frontend Architecture

The frontend is organized into modular React components:

#### Key Components

**`App.tsx`** - Root component managing:
- Game lifecycle (setup → active game → results)
- Dark mode state with localStorage persistence
- Game mode, word length, and solver configuration
- Game replay and new game handlers

**`GameSetup.tsx`** - Game configuration interface:
- Game mode selection (Today's Wordle, Challenge AI, Race Mode, Human Play)
- Word length selection (3-7 letters)
- Custom word input for Challenge AI mode
- API integration for game creation

**`GameBoard.tsx`** - Main game interface:
- Dual board rendering for Race Mode (human vs AI side-by-side)
- Single board for other modes
- Turn indicator system with active player highlighting
- Keyboard input handling and validation
- Game state management (guesses, feedback, game status)
- Modal system for game results with mode-specific content
- AI move automation with configurable delays

**`WordleGrid.tsx`** - Letter grid visualization:
- Dynamic grid sizing based on word length (3-7 letters)
- Color-coded tile feedback (correct=green, present=yellow, absent=gray)
- Flip animations for guess reveals
- Empty row indicators for remaining guesses

**`Keyboard.tsx`** - On-screen keyboard:
- QWERTY layout with Enter and Backspace keys
- Letter state tracking (correct, present, absent, unused)
- Click handlers for virtual keyboard input
- Visual feedback matching game state

#### State Management

The application uses React hooks for state management:
- `useState` for local component state
- `useEffect` for side effects (API calls, timers, AI moves)
- `useCallback` for memoized event handlers
- Props drilling for parent-child communication

### Backend Architecture

#### Core Services

**`game-engine.ts`** - Game logic engine:
- Word validation and feedback generation
- Duplicate letter handling with correct precedence (correct > present > absent)
- Game state management (attempts, guesses, status)
- Win/loss condition checking
- Support for all word lengths (3-7 letters)

**`entropy-solver.ts`** - Entropy-based AI solver:
- Information theory implementation
- Entropy calculation for each possible guess
- Candidate set partitioning and pattern analysis
- Optimal guess selection based on expected information gain
- Length-agnostic algorithm

**`frequency-solver.ts`** - Frequency-based AI solver:
- Letter frequency analysis by position
- Scoring system for word candidates
- Fast heuristic-based approach
- Effective for shorter words

**`word-service.ts`** - Word list management:
- Separate answer lists (valid secret words) and guess lists (valid guesses)
- Support for word lengths 3-7 letters
- Random word selection
- Word validation against appropriate lists

#### API Endpoints

**Game Management:**
- `POST /api/game/create` - Create new game instance
  - Body: `{ mode: GameMode, length: WordLength, hardMode: boolean, secret?: string, solverType: SolverType }`
  - Returns: `{ gameId: string }`

**Game Actions:**
- `POST /api/game/:gameId/guess` - Submit a player guess
  - Body: `{ guess: string }`
  - Returns: `{ feedback: LetterFeedback[], isCorrect: boolean, attempts: number, humanStatus?: GameStatus, aiStatus?: GameStatus, secret?: string }`

- `GET /api/game/:gameId/ai-move` - Get AI's next move (Race Mode)
  - Returns: `{ guess: string, feedback: LetterFeedback[], aiStatus: GameStatus, secret?: string }`

- `POST /api/game/:gameId/validate` - Validate if a word is in the guess list
  - Body: `{ word: string }`
  - Returns: `{ valid: boolean }`

#### Game State Structure

The backend maintains in-memory game state with the following structure:

```typescript
interface GameState {
  gameId: string;
  mode: GameMode; // 'human-play' | 'ai-play' | 'race' | 'custom-challenge' | 'todays-wordle'
  secret: string;
  length: WordLength; // 3 | 4 | 5 | 6 | 7
  hardMode: boolean;
  solverType: SolverType; // 'entropy' | 'frequency'

  // Human player state
  attempts: number;
  guesses: string[];
  feedback: LetterFeedback[][];
  status: GameStatus; // 'in-progress' | 'won' | 'lost'

  // AI state (for Race Mode)
  aiGuesses?: string[];
  aiFeedback?: LetterFeedback[][];
  aiStatus?: GameStatus;
}
```

## Recent Enhancements

### Race Mode Modal System
**Problem Solved:** Race Mode wasn't displaying a game-ending modal when a player won.

**Solution:** Modified the backend to send the secret word immediately when either player finishes, rather than waiting for both players to complete. This ensures the frontend can display the result modal instantly.

**Implementation Details:**
- Updated `backend/routes/game.ts:200` to reveal secret when human finishes
- Updated `backend/routes/game.ts:407` to reveal secret when AI finishes
- Frontend modal displays the secret word, current scoreboard, and action buttons (Home, Play Again, New Race)
- Modal includes smooth animations (fadeIn, slideUp) for better UX

### Challenge AI Replay Enhancement
**Problem Solved:** When playing Challenge AI mode, clicking "Play Again" would generate a random word instead of allowing the user to challenge the AI with a new custom word.

**Solution:** Added an input field in the game result modal for Challenge AI mode, allowing users to immediately enter a new word for the next challenge.

**Implementation Details:**
- Added `newChallengeWord` and `challengeWordError` state in `GameBoard.tsx`
- Modified `handleReplay` to validate word length and pass to parent component
- Updated `App.tsx` replay handler to accept optional `newWord` parameter
- API call includes `secret` field when user provides a new challenge word
- Input field appears only in Challenge AI mode, maintains consistent UI for other modes

### Modal Scoreboard Integration
Added persistent scoreboard display within the Race Mode result modal, giving players immediate visibility into their performance without needing to look elsewhere on the page.

**Features:**
- Shows current wins, ties, and AI wins
- Styled consistently with in-game scoreboard
- Appears at the top of modal body for prominence
- Uses CSS variables for theme compatibility

## Getting Started

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

No external databases, Redis, or Python required. The application runs entirely with Node.js and in-memory state management.

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd Custom_Wordle
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start development servers:**
```bash
npm run dev
```

This starts both the Vite development server (frontend) and the Express backend concurrently.
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

### Building for Production

```bash
npm run build
```

This command:
1. Builds the backend TypeScript to JavaScript
2. Builds the frontend React app with Vite
3. Creates optimized production bundles

### Running Production Build

```bash
npm start
```

The Express server serves both the API routes and the static frontend files on port 3000.

## Project Structure

```
Custom_Wordle/
├── backend/
│   ├── server.ts                      # Express server entry point
│   ├── routes/
│   │   ├── game.ts                    # Game API endpoints (create, guess, ai-move, validate)
│   │   └── wordle.ts                  # Today's Wordle integration
│   ├── services/
│   │   ├── game-engine.ts             # Core game logic (feedback generation, win/loss)
│   │   ├── entropy-solver.ts          # Entropy-based AI solver
│   │   ├── frequency-solver.ts        # Frequency-based AI solver
│   │   └── word-service.ts            # Word list loading and management
│   └── utils/
│       └── wordle-scraper.ts          # NYT Wordle answer scraper
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── App.tsx                # Root component
│   │   │   ├── GameSetup.tsx          # Game mode & settings configuration
│   │   │   ├── GameBoard.tsx          # Main game interface
│   │   │   ├── WordleGrid.tsx         # Letter grid with color feedback
│   │   │   ├── Keyboard.tsx           # On-screen keyboard
│   │   │   └── *.css                  # Component styles
│   │   ├── App.css                    # Global styles
│   │   └── main.tsx                   # React entry point
│   ├── index.html                     # HTML template
│   └── vite.config.ts                 # Vite configuration
├── shared/
│   └── types.ts                       # Shared TypeScript types
├── data/
│   └── words/                         # Word lists by length
│       ├── 3-letters-answer.txt       # Valid 3-letter answers
│       ├── 3-letters-guess.txt        # Valid 3-letter guesses
│       ├── 4-letters-answer.txt
│       ├── 4-letters-guess.txt
│       ├── 5-letters-answer.txt
│       ├── 5-letters-guess.txt
│       ├── 6-letters-answer.txt
│       ├── 6-letters-guess.txt
│       ├── 7-letters-answer.txt
│       └── 7-letters-guess.txt
├── package.json                       # Project dependencies and scripts
├── tsconfig.json                      # TypeScript configuration
└── README.md                          # This file
```

## How to Play

### Basic Rules
- Players have **6 attempts** to guess the secret word
- Each guess must be a valid word from the word list
- After each guess, tiles change color to show feedback:
  - **🟩 Green**: Letter is correct and in the correct position
  - **🟨 Yellow**: Letter is in the word but in the wrong position
  - **⬜ Gray**: Letter is not in the word at all

### Duplicate Letter Handling
The game correctly handles duplicate letters with proper precedence:
1. Correct positions (green) are marked first
2. Present letters (yellow) are marked only for remaining instances
3. Absent letters (gray) are marked when all instances are accounted for

**Example:** If the secret word is "ROBOT" and you guess "FLOOR":
- First O → Yellow (O exists but wrong position)
- Second O → Green (O is correct in position 4)

### Keyboard Feedback
The on-screen keyboard updates to reflect letter states:
- Green letters: Confirmed correct positions
- Yellow letters: In the word but wrong position
- Gray letters: Not in the word
- White letters: Not yet guessed

## AI Solver Deep Dive

### How the Entropy Solver Works

The entropy solver is the primary AI opponent and uses information theory to play optimally:

1. **Initial State**: Starts with all possible answer words as candidates
2. **Pattern Calculation**: For each possible guess, calculates all possible feedback patterns (green/yellow/gray combinations)
3. **Entropy Computation**:
   - For each pattern, determines how many candidates would remain
   - Calculates probability of each pattern occurring
   - Computes entropy: `H = -Σ(p * log₂(p))` where p is probability of each pattern
4. **Guess Selection**: Chooses the word with maximum expected entropy (most information gained)
5. **Candidate Filtering**: After receiving feedback, filters candidates to only those matching the pattern
6. **Iteration**: Repeats until the word is found

**Performance:** The entropy solver typically solves words in 3-4 guesses on average.

### How the Frequency Solver Works

The frequency solver uses statistical analysis of letter patterns:

1. **Letter Frequency Analysis**: Analyzes letter frequency at each position across all candidate words
2. **Scoring System**: Assigns scores to words based on:
   - Frequency of each letter in its position
   - Presence of common vowels
   - Diversity of letters (avoiding too many repeats)
3. **Guess Selection**: Chooses the highest-scoring word from candidates
4. **Candidate Filtering**: Filters candidates based on feedback

**Performance:** Faster than entropy solver but slightly less optimal. Effective for shorter words.

### Why Algorithmic (Not Machine Learning)?

This project uses **deterministic algorithms** rather than neural networks or reinforcement learning because:
- **Transparency**: Every decision is explainable and traceable
- **Consistency**: Always makes the same decision given the same game state
- **No Training Required**: Works immediately without requiring training data or computational resources
- **Optimal Performance**: Entropy maximization is mathematically proven to be information-theoretically optimal
- **Lightweight**: No model files, no GPU requirements, runs efficiently in any environment

## Word Lists

The game uses separate word lists for answers and guesses:

**Answer Lists** (`*-letters-answer.txt`):
- Curated lists of common words
- Used as possible secret words
- Generally 500-2000 words per length

**Guess Lists** (`*-letters-guess.txt`):
- Comprehensive lists of valid guesses
- Includes answer words plus additional valid words
- Generally 2000-15000 words per length

This two-tier system ensures:
- Secret words are common and guessable
- Players can use obscure but valid words as guesses
- AI has access to comprehensive vocabulary for optimal play

## Development Notes

### Key Implementation Decisions

**In-Memory State Management:**
The application uses in-memory game state rather than a database. This design choice:
- Simplifies deployment (no database setup required)
- Provides instant read/write performance
- Suitable for the stateless nature of Wordle games
- Trade-off: Game state is lost on server restart (acceptable for casual gameplay)

**Shared Types:**
TypeScript types are shared between frontend and backend via the `shared/types.ts` file. This ensures:
- Type safety across the full stack
- Single source of truth for data structures
- Compile-time error detection for API contract changes

**Component Architecture:**
The frontend uses a component hierarchy where:
- `App.tsx` manages global state (game configuration, dark mode)
- `GameBoard.tsx` manages game-specific state (guesses, feedback, AI moves)
- Child components (`WordleGrid`, `Keyboard`) are presentational with minimal state

**Modal System:**
The game result modal dynamically changes content based on game mode:
- Race Mode: Shows scoreboard and three action buttons
- Challenge AI: Shows input field for new challenge word
- Other modes: Shows standard replay/home buttons

### Browser Compatibility

The application uses modern JavaScript features and requires:
- ES2020+ JavaScript support
- CSS Grid and Flexbox
- CSS Custom Properties (variables)
- LocalStorage API

Tested and confirmed working on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Future Enhancement Ideas

- **Persistent Leaderboards**: Add database integration for global leaderboards
- **Multiplayer**: Real-time multiplayer with WebSocket connections
- **Statistics Dashboard**: Track personal statistics (win rate, guess distribution)
- **Custom Word Lists**: Allow users to upload and play with custom word lists
- **AI Difficulty Levels**: Add suboptimal AI modes for easier gameplay
- **Accessibility**: Enhanced screen reader support and keyboard navigation
- **Mobile App**: React Native version for iOS/Android
- **Social Sharing**: Share game results with styled graphics

## Troubleshooting

### Port Already in Use (EADDRINUSE)

If you see "Port 3000 is already in use":

**Windows:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or kill all node processes
taskkill /F /IM node.exe
```

**Mac/Linux:**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Build Errors

If you encounter TypeScript build errors:
1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear TypeScript cache: `rm -rf backend/dist frontend/dist`
3. Ensure you're using Node.js 18+: `node --version`

### Frontend Not Loading

If the frontend doesn't load in development:
1. Check that both servers are running (`npm run dev`)
2. Verify frontend is on http://localhost:5173
3. Check browser console for errors
4. Clear browser cache and reload

## License

MIT License - Feel free to use this project for learning, modification, or commercial purposes.

## Acknowledgments

- **Original Wordle** by Josh Wardle - Inspiration for this project
- **Word Lists** sourced from various open-source word databases
- **Information Theory** concepts for entropy-based solving approach
- **NYT Wordle** for the "Today's Wordle" feature integration

---

**Built with ❤️ using TypeScript, React, and Node.js**
