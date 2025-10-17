# AI Wordle Duel

A sophisticated word-guessing game featuring advanced AI solvers powered by algorithmic intelligence. Compete against optimized solvers, challenge them with custom words, or race head-to-head across multiple word lengths.

## Try the live site
https://custom-ai-wordle.vercel.app

## Overview

AI Wordle Duel is a full-stack TypeScript application that extends the classic Wordle concept with intelligent AI opponents. The project features multiple game modes, variable word lengths (3-7 letters). Built with React, Node.js, and Express, the application provides a seamless gaming experience with real-time state management and responsive design.

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


## Quick start (developer)
Requirements: Node.js 18+ and npm 9+.

1. Install

```bash
npm install
```

2. Run in development (frontend + backend)

```bash
npm run dev
```

3. Build for production

```bash
npm run build
```

4. Run the production server locally

```bash
npm start
```


## How to Play

### Basic Rules
- Players have **6 attempts** to guess the secret word
- Each guess must be a valid word from the word list
- After each guess, tiles change color to show feedback:
  - **🟩 Green**: Letter is correct and in the correct position
  - **🟨 Yellow**: Letter is in the word but in the wrong position
  - **⬜ Gray**: Letter is not in the word at all


## License
MIT License - Feel free to use this project for learning, modification, or commercial purposes.

## Acknowledgments

- **Original Wordle** by Josh Wardle - Inspiration for this project

---

**Built with ❤️ using TypeScript, React, Python, and Node.js**
