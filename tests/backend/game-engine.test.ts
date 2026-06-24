/**
 * Tests for the core game engine
 */

import { GameEngine } from '../../backend/services/game-engine';
import { TileState, GuessFeedback } from '../../shared/types';

describe('GameEngine', () => {
  describe('generateFeedback', () => {
    it('should handle all correct letters', () => {
      const feedback = GameEngine.generateFeedback('hello', 'hello');
      expect(feedback).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    });

    it('should handle all absent letters', () => {
      const feedback = GameEngine.generateFeedback('abcde', 'fghij');
      expect(feedback).toEqual(['absent', 'absent', 'absent', 'absent', 'absent']);
    });

    it('should handle mixed feedback', () => {
      const feedback = GameEngine.generateFeedback('roast', 'toast');
      expect(feedback).toEqual(['absent', 'correct', 'correct', 'correct', 'correct']);
    });

    it('should handle duplicate letters correctly', () => {
      // Secret 'loops' has 1 'l' (at position 0) and no 'a' or 'm'.
      // Guess 'llama' has 2 'l's.
      const feedback = GameEngine.generateFeedback('llama', 'loops');
      // First 'l' is correct; the second 'l' is absent (only one 'l' in secret).
      expect(feedback[0]).toBe('correct'); // l at position 0
      expect(feedback[1]).toBe('absent');  // second l at position 1
    });

    it('should prioritize greens over yellows for duplicates', () => {
      // Secret 'tinge' has exactly one 'e' (at the last position) and shares no
      // other letters with the guess.
      const feedback = GameEngine.generateFeedback('speed', 'tinge');
      // 'e' appears twice in guess, once in secret; only one 'e' may be matched.
      const correctCount = feedback.filter(f => f === 'correct').length;
      const presentCount = feedback.filter(f => f === 'present').length;
      // The two e's account for the only matches: one present + one absent.
      expect(feedback.filter((f, i) => 'speed'[i] === 'e' && f === 'correct').length).toBe(0);
      expect(feedback.filter((f, i) => 'speed'[i] === 'e' && f === 'present').length).toBe(1);
      expect(correctCount + presentCount).toBeLessThanOrEqual(1);
    });

    it('should work with different word lengths', () => {
      expect(GameEngine.generateFeedback('cat', 'car')).toHaveLength(3);
      expect(GameEngine.generateFeedback('test', 'best')).toHaveLength(4);
      expect(GameEngine.generateFeedback('hello', 'world')).toHaveLength(5);
      expect(GameEngine.generateFeedback('laptop', 'prompt')).toHaveLength(6);
      expect(GameEngine.generateFeedback('testing', 'resting')).toHaveLength(7);
    });
  });

  describe('buildConstraints', () => {
    it('should build empty constraints for no guesses', () => {
      const constraints = GameEngine.buildConstraints([]);
      expect(constraints.length).toBe(0);
      expect(constraints.letterConstraints.size).toBe(0);
    });

    it('should track confirmed positions', () => {
      const guesses: GuessFeedback[] = [
        { guess: 'toast', feedback: ['absent', 'correct', 'absent', 'absent', 'absent'], timestamp: 0 }
      ];
      const constraints = GameEngine.buildConstraints(guesses);
      expect(constraints.positionConstraints[1]).toBe('o');
    });

    it('should track letter counts', () => {
      const guesses: GuessFeedback[] = [
        { guess: 'hello', feedback: ['present', 'correct', 'present', 'absent', 'absent'], timestamp: 0 }
      ];
      const constraints = GameEngine.buildConstraints(guesses);
      const hConstraint = constraints.letterConstraints.get('h');
      const eConstraint = constraints.letterConstraints.get('e');
      const lConstraint = constraints.letterConstraints.get('l');

      expect(hConstraint?.minCount).toBeGreaterThan(0);
      expect(eConstraint?.minCount).toBeGreaterThan(0);
      expect(lConstraint?.minCount).toBeGreaterThan(0);
    });
  });

  describe('satisfiesConstraints', () => {
    it('should validate words against constraints', () => {
      // Guess 'share' vs an answer like 'trace'/'crate': s,h absent;
      // a correct@2; r present (in answer but not at 3); e correct@4.
      const guesses: GuessFeedback[] = [
        { guess: 'share', feedback: ['absent', 'absent', 'correct', 'present', 'correct'], timestamp: 0 }
      ];
      const constraints = GameEngine.buildConstraints(guesses);

      // Word must have 'a' at position 2, 'e' at position 4, an 'r' (not at 3), and no 's'/'h'
      expect(GameEngine.satisfiesConstraints('trace', constraints)).toBe(true);
      expect(GameEngine.satisfiesConstraints('crate', constraints)).toBe(true);
      expect(GameEngine.satisfiesConstraints('slate', constraints)).toBe(false); // has 's' which is absent
    });
  });

  describe('calculateEntropy', () => {
    it('should calculate non-zero entropy for ambiguous guesses', () => {
      const candidates = ['crane', 'plane', 'frame'];
      const entropy = GameEngine.calculateEntropy('crane', candidates);
      expect(entropy).toBeGreaterThan(0);
    });

    it('should calculate zero entropy when only one candidate', () => {
      const candidates = ['hello'];
      const entropy = GameEngine.calculateEntropy('hello', candidates);
      expect(entropy).toBe(0);
    });
  });

  describe('isWin', () => {
    it('should detect winning feedback', () => {
      const winningFeedback: TileState[] = ['correct', 'correct', 'correct', 'correct', 'correct'];
      expect(GameEngine.isWin(winningFeedback)).toBe(true);
    });

    it('should detect non-winning feedback', () => {
      const nonWinningFeedback: TileState[] = ['correct', 'correct', 'present', 'correct', 'correct'];
      expect(GameEngine.isWin(nonWinningFeedback)).toBe(false);
    });
  });
});
