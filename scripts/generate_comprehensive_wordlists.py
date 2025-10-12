#!/usr/bin/env python3
"""
Generate comprehensive word lists from ENABLE dictionary database.
This creates valid, complete word lists for all lengths 3-7.
"""

import os
from collections import Counter
from pathlib import Path

def load_enable_words(filepath):
    """Load all words from ENABLE dictionary."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return [word.strip().lower() for word in f if word.strip()]

def filter_words_by_length(words, length):
    """Filter words to only those of specified length."""
    return [w for w in words if len(w) == length and w.isalpha()]

def calculate_letter_frequencies(words):
    """Calculate letter frequency statistics for optimization."""
    all_letters = ''.join(words)
    total = len(all_letters)
    freq = Counter(all_letters)
    return {letter: count/total for letter, count in freq.items()}

def save_word_list(words, filepath):
    """Save words to file, one per line."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        for word in sorted(words):
            f.write(f"{word}\n")
    print(f"  Saved {len(words)} words to {os.path.basename(filepath)}")

def save_frequency_data(frequencies, filepath):
    """Save letter frequency data for solver optimization."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write("# Letter frequency data for word optimization\n")
        for letter, freq in sorted(frequencies.items(), key=lambda x: x[1], reverse=True):
            f.write(f"{letter},{freq:.6f}\n")

def main():
    print("=" * 60)
    print("COMPREHENSIVE WORD LIST GENERATOR")
    print("Using ENABLE Dictionary Database")
    print("=" * 60)

    # Paths
    base_dir = Path(__file__).parent.parent
    enable_file = base_dir / 'data' / 'enable1.txt'
    output_dir = base_dir / 'data' / 'words'

    # Load all valid English words
    print("\nLoading ENABLE dictionary...")
    all_words = load_enable_words(enable_file)
    print(f"  Loaded {len(all_words):,} total words")

    # Process each length
    print("\nGenerating word lists by length:")
    print("-" * 60)

    for length in range(3, 8):  # 3-7 letters
        print(f"\nLength {length}:")

        # Filter words
        words = filter_words_by_length(all_words, length)

        if not words:
            print(f"  WARNING: No {length}-letter words found!")
            continue

        print(f"  Found {len(words):,} valid words")

        # For answer lists, use all valid words
        # For guess lists, we can use the same (comprehensive approach)
        answer_words = words
        guess_words = words  # Could add more obscure words here if desired

        # Save answer list
        answer_file = output_dir / f'{length}-letters-answer.txt'
        save_word_list(answer_words, answer_file)

        # Save guess list
        guess_file = output_dir / f'{length}-letters-guess.txt'
        save_word_list(guess_words, guess_file)

        # Calculate and save frequency data
        frequencies = calculate_letter_frequencies(words)
        freq_file = output_dir / f'{length}-letters-frequencies.txt'
        save_frequency_data(frequencies, freq_file)

        # Show top starting words based on letter diversity
        print(f"  Top letters by frequency: {', '.join(list(sorted(frequencies.keys(), key=lambda x: frequencies[x], reverse=True))[:10])}")

    print("\n" + "=" * 60)
    print("GENERATION COMPLETE!")
    print("=" * 60)

    # Summary statistics
    print("\nSummary:")
    print("-" * 60)
    for length in range(3, 8):
        answer_file = output_dir / f'{length}-letters-answer.txt'
        if answer_file.exists():
            with open(answer_file, 'r') as f:
                count = sum(1 for _ in f)
            print(f"  {length}-letter words: {count:,}")

    print("\nAll word lists saved to: data/words/")
    print("These are comprehensive, validated English words from ENABLE database.")
    print("\nNext steps:")
    print("  1. Test word loading in backend")
    print("  2. Regenerate training trajectories with entropy solver")
    print("  3. Optimize ML model for low guess count")

if __name__ == '__main__':
    main()
