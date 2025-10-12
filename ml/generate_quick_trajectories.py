"""
Quick Trajectory Generator
Generates synthetic trajectories using heuristics for immediate training
"""

import json
import random
from pathlib import Path
from collections import Counter
import sys

def generate_feedback(guess, secret):
    """Generate Wordle feedback"""
    feedback = ['absent'] * len(secret)
    secret_counts = Counter(secret)

    # First pass: correct positions
    for i in range(len(guess)):
        if guess[i] == secret[i]:
            feedback[i] = 'correct'
            secret_counts[guess[i]] -= 1

    # Second pass: present letters
    for i in range(len(guess)):
        if feedback[i] != 'correct':
            if guess[i] in secret_counts and secret_counts[guess[i]] > 0:
                feedback[i] = 'present'
                secret_counts[guess[i]] -= 1

    return feedback


def filter_candidates(candidates, guesses, feedbacks):
    """Filter candidates based on feedback"""
    valid = []

    for word in candidates:
        is_valid = True

        for guess, feedback in zip(guesses, feedbacks):
            test_feedback = generate_feedback(guess, word)
            if test_feedback != feedback:
                is_valid = False
                break

        if is_valid:
            valid.append(word)

    return valid


def score_word_frequency(word, freq_data):
    """Score word by letter frequency"""
    score = 0
    for i, letter in enumerate(word):
        if letter in freq_data:
            score += freq_data[letter].get(i, 0)
    return score


def get_optimal_first_guesses():
    """Return optimal starting words by length"""
    return {
        3: ['are', 'ate', 'ear', 'era', 'tea', 'eta', 'art', 'rat', 'tar', 'oar'],
        4: ['tear', 'rate', 'late', 'tale', 'real', 'earl', 'lean', 'lane', 'sane', 'sale'],
        5: ['arose', 'stare', 'slate', 'crane', 'crate', 'trace', 'lance', 'dance', 'glare', 'spare'],
        6: ['strain', 'trains', 'grants', 'plants', 'brains', 'drains', 'straps', 'strand', 'trails', 'grains'],
        7: ['strange', 'threads', 'streaks', 'strains', 'strange', 'streams', 'strands', 'spreads', 'strides', 'stripes']
    }


def play_smart_game(secret, all_words, max_guesses=6):
    """Play a game using smart heuristics"""
    length = len(secret)
    candidates = all_words.copy()
    guesses = []
    feedbacks = []

    optimal_starters = get_optimal_first_guesses()[length]

    for attempt in range(max_guesses):
        # First guess: use optimal starter
        if attempt == 0:
            guess = next((w for w in optimal_starters if w in candidates), candidates[0])
        else:
            # Subsequent guesses: choose from remaining candidates
            if len(candidates) <= 2:
                guess = candidates[0]
            else:
                # Pick word with diverse letters
                guess = max(candidates, key=lambda w: len(set(w)))

        feedback = generate_feedback(guess, secret)
        guesses.append(guess)
        feedbacks.append(feedback)

        if feedback == ['correct'] * length:
            return guesses, feedbacks, True

        # Filter candidates
        candidates = filter_candidates(candidates, guesses, feedbacks)

        if not candidates:
            # Should not happen, but fallback
            break

    return guesses, feedbacks, False


def main():
    # Setup paths
    data_dir = Path(__file__).parent.parent / 'data'
    words_dir = data_dir / 'words'
    traj_dir = data_dir / 'trajectories'
    traj_dir.mkdir(parents=True, exist_ok=True)

    print("Quick Trajectory Generator\n")

    total_generated = 0

    for length in [3, 4, 5, 6]:
        print(f"Generating for {length}-letter words...")

        # Load words
        answer_file = words_dir / f"{length}-letters-answer.txt"
        if not answer_file.exists():
            print(f"  WARNING: No answer file found for length {length}")
            continue

        with open(answer_file, 'r') as f:
            words = [line.strip().lower() for line in f if len(line.strip()) == length]

        if not words:
            print(f"  WARNING: No words loaded for length {length}")
            continue

        # Generate trajectories
        output_file = traj_dir / f"expert-{length}.jsonl"
        games_per_length = 200  # Quick generation

        won = 0
        with open(output_file, 'w') as f:
            for i in range(games_per_length):
                secret = random.choice(words)
                guesses, feedbacks, success = play_smart_game(secret, words)

                if success:
                    won += 1

                trajectory = {
                    'length': length,
                    'secret': secret,
                    'guesses': guesses,
                    'feedbacks': feedbacks,
                    'won': success,
                    'solverType': 'heuristic',
                    'timestamp': 0
                }

                f.write(json.dumps(trajectory) + '\n')

                if (i + 1) % 50 == 0:
                    print(f"  Progress: {i+1}/{games_per_length} ({won}/{i+1} won)")

        total_generated += games_per_length
        print(f"  DONE: Generated {games_per_length} games ({won}/{games_per_length} won = {100*won/games_per_length:.1f}%)")
        print(f"  Saved to: {output_file}\n")

    print(f"SUCCESS: Total {total_generated} trajectories generated!")
    print("\nNext steps:")
    print("  cd ml")
    print("  pip install -r requirements.txt")
    print("  python train_unified.py --epochs 20")


if __name__ == '__main__':
    main()
