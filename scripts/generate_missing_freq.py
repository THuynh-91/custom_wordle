#!/usr/bin/env python3
"""
Generate missing frequency files for 6 and 7 letter words
"""

import json
from collections import defaultdict
from pathlib import Path


def generate_frequency_data(word_file: Path, output_file: Path):
    """Generate letter frequency JSON from word list"""

    # Read words
    with open(word_file, 'r', encoding='utf-8') as f:
        words = [line.strip().lower() for line in f if line.strip()]

    if not words:
        print(f"No words found in {word_file}")
        return

    word_length = len(words[0])

    # Calculate frequencies
    frequencies = defaultdict(lambda: {'total': 0, 'positions': [0] * word_length})

    for word in words:
        if len(word) != word_length:
            continue

        for pos, letter in enumerate(word):
            frequencies[letter]['total'] += 1
            frequencies[letter]['positions'][pos] += 1

    # Convert to regular dict
    freq_dict = {letter: dict(data) for letter, data in frequencies.items()}

    # Save
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(freq_dict, f, indent=2)

    print(f"Generated {output_file.name} with {len(freq_dict)} letters from {len(words)} words")


def main():
    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / 'data'

    # Generate for 6 and 7 letter words
    for length in [6, 7]:
        word_file = data_dir / 'words' / f'{length}-letters-answer.txt'
        output_file = data_dir / 'frequencies' / f'{length}-letters-freq.json'

        if word_file.exists():
            generate_frequency_data(word_file, output_file)
        else:
            print(f"Word file not found: {word_file}")


if __name__ == '__main__':
    main()
