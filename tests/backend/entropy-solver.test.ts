/**
 * Tests for the entropy solver's elimination ("sacrifice") behaviour.
 *
 * The regression these cover: the solver used to consider non-candidate words
 * only when more than 10 candidates remained, so one-letter-apart traps like
 * bight/dight/fight/hight/might/night/wight — which sit BELOW that threshold —
 * were played by testing candidates one at a time until the guesses ran out.
 */

import { GameEngine } from '../../backend/services/game-engine';
import { EntropySolver } from '../../backend/services/solvers/entropy-solver';
import { GuessFeedback, WordLength } from '../../shared/types';
import { DEFAULT_MAX_GUESSES } from '../../shared/constants';

/** The -IGHT family: identical except for the first letter. */
const IGHT_TRAP = ['bight', 'dight', 'fight', 'hight', 'might', 'night', 'wight'];

/**
 * A guess pool wide enough to contain real splitters for the trap above
 * (words carrying several of b/d/f/h/m/n/w) without loading the full word list.
 */
const GUESS_POOL = [
  ...IGHT_TRAP,
  'admen', 'bawdy', 'bedim', 'dumbo', 'found', 'hemin', 'numbs', 'thumb', 'dwarf',
  'tares', 'litho', 'crane', 'blimp',
];

function feedbackFor(guess: string, secret: string): GuessFeedback {
  return { guess, feedback: GameEngine.generateFeedback(guess, secret), timestamp: 0 };
}

/** Pad a history to `n` entries so `turnsLeft` can be varied in tests. */
function historyOfLength(n: number, secret: string): GuessFeedback[] {
  return Array.from({ length: n }, (_, i) => feedbackFor(IGHT_TRAP[i % IGHT_TRAP.length], secret));
}

describe('EntropySolver elimination guesses', () => {
  it('spends a turn on a non-candidate when the pool cannot be enumerated in time', () => {
    // 7 candidates, 4 turns left: guessing them one by one cannot finish.
    const solver = new EntropySolver(5 as WordLength, IGHT_TRAP, GUESS_POOL);
    const move = solver.getNextMove(historyOfLength(2, 'might'), IGHT_TRAP, 4);

    expect(IGHT_TRAP).not.toContain(move.guess);
    expect(move.explanation.reasoning).toMatch(/CANNOT be the answer/);
  });

  it('never wastes the final guess on a word that cannot win', () => {
    const solver = new EntropySolver(5 as WordLength, IGHT_TRAP, GUESS_POOL);
    const move = solver.getNextMove(historyOfLength(5, 'might'), IGHT_TRAP, 1);

    expect(IGHT_TRAP).toContain(move.guess);
  });

  it('guesses candidates when enumeration is already a guaranteed win', () => {
    // 3 candidates and 4 turns: testing each one in turn wins for certain, so
    // spending a turn on a probe would only delay the win.
    const threeLeft = ['fight', 'might', 'night'];
    const solver = new EntropySolver(5 as WordLength, threeLeft, GUESS_POOL);
    const move = solver.getNextMove(historyOfLength(2, 'might'), threeLeft, 4);

    expect(threeLeft).toContain(move.guess);
  });

  it('solves the -IGHT trap within the guess limit', () => {
    const secret = 'might';
    const history: GuessFeedback[] = [];
    let solved = false;

    for (let turn = 1; turn <= DEFAULT_MAX_GUESSES; turn++) {
      const candidates =
        history.length === 0
          ? IGHT_TRAP
          : GameEngine.filterCandidates(IGHT_TRAP, GameEngine.buildConstraints(history));
      expect(candidates.length).toBeGreaterThan(0);

      const solver = new EntropySolver(5 as WordLength, candidates, GUESS_POOL);
      const move = solver.getNextMove(history, candidates, DEFAULT_MAX_GUESSES - history.length);
      const entry = feedbackFor(move.guess, secret);
      history.push(entry);

      if (GameEngine.isWin(entry.feedback)) {
        solved = true;
        break;
      }
    }

    expect(solved).toBe(true);
  });
});
