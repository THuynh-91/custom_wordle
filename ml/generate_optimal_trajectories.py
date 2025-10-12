#!/usr/bin/env python3
"""
Generate OPTIMAL training trajectories using entropy-based solver.

This version optimizes for MINIMUM GUESS COUNT, not just wins.
Uses information-theoretic approach for each guess.
"""

import json
import os
import random
from collections import Counter
from pathlib import Path
from typing import List, Tuple, Dict
import math

# Tile states
CORRECT = 'correct'
PRESENT = 'present'
ABSENT = 'absent'


def load_word_list(filepath: str) -> List[str]:
    """Load words from file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return [line.strip().lower() for line in f if line.strip()]


def generate_feedback(guess: str, secret: str) -> List[str]:
    """Generate Wordle feedback for a guess."""
    length = len(secret)
    feedback = [ABSENT] * length
    secret_counts = Counter(secret)

    # First pass: mark correct positions
    for i in range(length):
        if guess[i] == secret[i]:
            feedback[i] = CORRECT
            secret_counts[guess[i]] -= 1

    # Second pass: mark present letters
    for i in range(length):
        if feedback[i] != CORRECT and guess[i] in secret_counts:
            if secret_counts[guess[i]] > 0:
                feedback[i] = PRESENT
                secret_counts[guess[i]] -= 1

    return feedback


def apply_feedback_to_candidates(candidates: List[str], guess: str, feedback: List[str]) -> List[str]:
    """Filter candidates based on feedback."""
    new_candidates = []

    for word in candidates:
        # Check if this word is consistent with the feedback
        test_feedback = generate_feedback(guess, word)
        if test_feedback == feedback:
            new_candidates.append(word)

    return new_candidates


def calculate_entropy(guess: str, candidates: List[str]) -> float:
    """
    Calculate expected information gain (entropy) for a guess.
    Higher entropy = more information gained = better guess.
    """
    if not candidates:
        return 0.0

    # Group candidates by the feedback pattern they would produce
    pattern_counts = {}

    for candidate in candidates:
        feedback = generate_feedback(guess, candidate)
        pattern = tuple(feedback)  # Convert to hashable type
        pattern_counts[pattern] = pattern_counts.get(pattern, 0) + 1

    # Calculate entropy: -sum(p * log2(p))
    total = len(candidates)
    entropy = 0.0

    for count in pattern_counts.values():
        if count > 0:
            p = count / total
            entropy -= p * math.log2(p)

    return entropy


def get_optimal_guess(candidates: List[str], all_words: List[str], max_search: int = 30) -> str:
    """
    Get the optimal next guess using entropy maximization.

    Strategy:
    1. If only 1-2 candidates remain, just guess one
    2. Otherwise, find the word that maximizes expected information gain
    3. Prefer words that are actual candidates (could be the answer)
    """
    if len(candidates) == 1:
        return candidates[0]

    if len(candidates) == 2:
        # With 2 candidates, either could be right - just pick one
        return candidates[0]

    # For small candidate sets, evaluate all
    if len(candidates) <= 10:
        words_to_evaluate = candidates
    else:
        # Sample words to evaluate (mix of candidates and common words)
        words_to_evaluate = candidates[:20]  # Limit to 20 for speed

        # Add some high-information words if we have a large search space
        if len(candidates) > 50:
            # Add diverse starter words
            common_starters = {
                3: ['are', 'ate', 'ear'],
                4: ['tear', 'rate', 'late'],
                5: ['arose', 'slate', 'crane'],
                6: ['strain', 'trains', 'grains'],
                7: ['stainer', 'trained', 'detains']
            }
            length = len(candidates[0])
            if length in common_starters:
                for word in common_starters[length]:
                    if word in all_words and word not in words_to_evaluate:
                        words_to_evaluate.append(word)

    # Limit search space for performance
    if len(words_to_evaluate) > max_search:
        words_to_evaluate = words_to_evaluate[:max_search]

    # Calculate entropy for each word
    best_word = candidates[0]
    best_score = -1.0

    for word in words_to_evaluate:
        entropy = calculate_entropy(word, candidates)

        # Bonus for words that are actual candidates (could win immediately)
        is_candidate = word in candidates
        score = entropy + (0.1 if is_candidate else 0)

        if score > best_score:
            best_score = score
            best_word = word

    return best_word


def play_optimal_game(secret: str, all_words: List[str], max_guesses: int = 6) -> Dict:
    """
    Play one game using optimal entropy-based strategy.
    Returns trajectory with all guesses and feedbacks.
    """
    candidates = all_words.copy()
    guesses = []
    feedbacks = []
    won = False

    for guess_num in range(max_guesses):
        # Get optimal guess
        guess = get_optimal_guess(candidates, all_words)

        # Generate feedback
        feedback = generate_feedback(guess, secret)

        guesses.append(guess)
        feedbacks.append(feedback)

        # Check if won
        if guess == secret:
            won = True
            break

        # Update candidates
        candidates = apply_feedback_to_candidates(candidates, guess, feedback)

        if len(candidates) == 0:
            # Something went wrong - this shouldn't happen
            break

    return {
        'secret': secret,
        'guesses': guesses,
        'feedbacks': feedbacks,
        'won': won,
        'num_guesses': len(guesses)
    }


def generate_trajectories(word_length: int, num_games: int, data_dir: Path):
    """Generate optimal training trajectories for a specific word length."""

    print(f"\nLength {word_length}:")
    print("-" * 60)

    # Load word list
    answer_file = data_dir / 'words' / f'{word_length}-letters-answer.txt'
    all_words = load_word_list(answer_file)

    # Use subset for faster computation (still comprehensive coverage)
    if len(all_words) > 1000:
        print(f"  Loaded {len(all_words):,} words, sampling 1000 for performance")
        all_words = random.sample(all_words, 1000)
    else:
        print(f"  Loaded {len(all_words):,} valid words")

    # Sample target words
    if len(all_words) > num_games:
        target_words = random.sample(all_words, num_games)
    else:
        target_words = all_words
        print(f"  WARNING: Only {len(all_words)} words available, using all")

    # Play games
    trajectories = []
    wins = 0
    total_guesses = 0
    guess_distribution = Counter()

    print(f"  Playing {len(target_words)} games with entropy solver...")

    for i, secret in enumerate(target_words):
        if (i + 1) % 50 == 0:
            print(f"    Progress: {i+1}/{len(target_words)} games")

        result = play_optimal_game(secret, all_words)

        if result['won']:
            wins += 1
            total_guesses += result['num_guesses']
            guess_distribution[result['num_guesses']] += 1

        trajectories.append(result)

    # Save trajectories
    output_file = data_dir / 'trajectories' / f'optimal-{word_length}.jsonl'
    os.makedirs(output_file.parent, exist_ok=True)

    with open(output_file, 'w', encoding='utf-8') as f:
        for traj in trajectories:
            f.write(json.dumps(traj) + '\n')

    # Statistics
    win_rate = (wins / len(target_words)) * 100 if target_words else 0
    avg_guesses = total_guesses / wins if wins > 0 else 0

    print(f"  Results:")
    print(f"    Win rate: {win_rate:.1f}% ({wins}/{len(target_words)})")
    print(f"    Avg guesses: {avg_guesses:.2f}")
    print(f"    Distribution: {dict(sorted(guess_distribution.items()))}")
    print(f"  Saved to: {output_file.name}")

    return {
        'length': word_length,
        'games': len(target_words),
        'wins': wins,
        'win_rate': win_rate,
        'avg_guesses': avg_guesses,
        'distribution': dict(guess_distribution)
    }


def main():
    print("=" * 60)
    print("OPTIMAL TRAJECTORY GENERATOR")
    print("Using Entropy-Based Solver for Minimal Guess Count")
    print("=" * 60)

    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / 'data'

    # Configuration
    games_per_length = 50  # Optimized for faster generation with good coverage
    word_lengths = [3, 4, 5, 6, 7]  # All supported lengths

    print(f"\nConfiguration:")
    print(f"  Games per length: {games_per_length}")
    print(f"  Word lengths: {word_lengths}")
    print(f"  Strategy: Entropy maximization (information-theoretic optimal)")

    # Generate trajectories
    all_stats = []

    for length in word_lengths:
        stats = generate_trajectories(length, games_per_length, data_dir)
        all_stats.append(stats)

    # Summary
    print("\n" + "=" * 60)
    print("GENERATION COMPLETE!")
    print("=" * 60)

    print("\nFinal Statistics:")
    print("-" * 60)
    print(f"{'Length':<8} {'Games':<8} {'Win Rate':<12} {'Avg Guesses':<15}")
    print("-" * 60)

    total_games = 0
    total_wins = 0
    total_guesses = 0

    for stats in all_stats:
        total_games += stats['games']
        total_wins += stats['wins']
        if stats['wins'] > 0:
            total_guesses += stats['wins'] * stats['avg_guesses']

        print(f"{stats['length']:<8} {stats['games']:<8} {stats['win_rate']:>6.1f}%      {stats['avg_guesses']:>6.2f}")

    print("-" * 60)
    overall_win_rate = (total_wins / total_games * 100) if total_games > 0 else 0
    overall_avg_guesses = (total_guesses / total_wins) if total_wins > 0 else 0
    print(f"{'TOTAL':<8} {total_games:<8} {overall_win_rate:>6.1f}%      {overall_avg_guesses:>6.2f}")

    print("\nTrajectories optimized for:")
    print("  - Minimum guess count (not just wins)")
    print("  - Maximum information gain per guess")
    print("  - Entropy-based optimal play")

    print("\nNext steps:")
    print("  1. Train neural network on these optimal trajectories")
    print("  2. Use guess count as training weight (fewer = better)")
    print("  3. Test model performance vs entropy baseline")


if __name__ == '__main__':
    main()
