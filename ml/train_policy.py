"""
Train ML policy for Wordle solving
Supervised learning from expert trajectories
"""

import argparse
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from pathlib import Path
import numpy as np
from typing import List, Dict, Tuple
import sys

sys.path.append(str(Path(__file__).parent.parent))


class WordleDataset(Dataset):
    """Dataset of expert Wordle trajectories"""

    def __init__(self, trajectories_file: str, vocab_file: str, length: int):
        """
        Args:
            trajectories_file: Path to JSONL file with trajectories
            vocab_file: Path to vocabulary file (word list)
            length: Word length for this dataset
        """
        self.length = length
        self.trajectories = []

        # Load vocabulary
        with open(vocab_file, 'r') as f:
            self.vocab = [line.strip() for line in f if len(line.strip()) == length]

        self.word_to_idx = {word: idx for idx, word in enumerate(self.vocab)}
        self.vocab_size = len(self.vocab)

        # Load trajectories
        with open(trajectories_file, 'r') as f:
            for line in f:
                traj = json.loads(line)
                if traj['length'] == length:
                    self.trajectories.append(traj)

        print(f"Loaded {len(self.trajectories)} trajectories for length {length}")
        print(f"Vocabulary size: {self.vocab_size}")

    def __len__(self):
        return len(self.trajectories)

    def __getitem__(self, idx):
        traj = self.trajectories[idx]

        # For each step in the trajectory, create a training example
        # Input: guess history + feedback history
        # Output: next guess

        examples = []
        for i in range(len(traj['guesses'])):
            guess_history = traj['guesses'][:i]
            feedback_history = traj['feedbacks'][:i]
            next_guess = traj['guesses'][i]

            if next_guess not in self.word_to_idx:
                continue

            # Encode input features
            features = self.encode_state(guess_history, feedback_history)

            # Target is the index of the next guess
            target = self.word_to_idx[next_guess]

            examples.append((features, target))

        if not examples:
            # Fallback to first guess if no examples
            features = self.encode_state([], [])
            target = self.word_to_idx.get(traj['guesses'][0], 0)
            examples.append((features, target))

        # Return a random example from this trajectory
        return examples[np.random.randint(len(examples))]

    def encode_state(self, guess_history: List[str], feedback_history: List[List[str]]) -> torch.Tensor:
        """
        Encode game state into feature vector

        Features:
        - Guess count (normalized)
        - Letter presence/absence (26 dims)
        - Position constraints (length * 26 dims)
        - Previous guesses (encoded)
        """
        features = []

        # Guess count (0-6, normalized)
        features.append(len(guess_history) / 6.0)

        # Letter constraints (26 dimensions)
        letter_states = {}  # 0=unknown, 1=absent, 2=present, 3=correct
        for guess, feedback in zip(guess_history, feedback_history):
            for letter, state in zip(guess, feedback):
                if state == 'correct':
                    letter_states[letter] = 3
                elif state == 'present' and letter_states.get(letter, 0) < 2:
                    letter_states[letter] = 2
                elif state == 'absent' and letter not in letter_states:
                    letter_states[letter] = 1

        for i in range(26):
            letter = chr(ord('a') + i)
            features.append(letter_states.get(letter, 0) / 3.0)

        # Position constraints (length * 26)
        position_constraints = [[0] * 26 for _ in range(self.length)]
        for guess, feedback in zip(guess_history, feedback_history):
            for pos, (letter, state) in enumerate(zip(guess, feedback)):
                letter_idx = ord(letter) - ord('a')
                if state == 'correct':
                    position_constraints[pos][letter_idx] = 1.0
                elif state == 'absent':
                    position_constraints[pos][letter_idx] = -1.0

        for pos_constraints in position_constraints:
            features.extend(pos_constraints)

        return torch.tensor(features, dtype=torch.float32)


class WordlePolicyNet(nn.Module):
    """Neural network policy for Wordle"""

    def __init__(self, input_size: int, vocab_size: int, hidden_size: int = 256):
        super().__init__()

        self.network = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_size, vocab_size)
        )

    def forward(self, x):
        return self.network(x)


def train(args):
    """Train the policy network"""

    # Setup
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    # Load dataset
    vocab_file = Path(args.data_dir) / f"words/{args.length}-letters-answer.txt"
    trajectories_file = Path(args.data_dir) / f"trajectories/expert-{args.length}.jsonl"

    if not trajectories_file.exists():
        print(f"No trajectories found at {trajectories_file}")
        print("Please generate trajectories first using: npm run generate-trajectories")
        return

    dataset = WordleDataset(str(trajectories_file), str(vocab_file), args.length)
    dataloader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)

    # Calculate input size
    input_size = 1 + 26 + (args.length * 26)

    # Create model
    model = WordlePolicyNet(input_size, dataset.vocab_size, hidden_size=args.hidden_size).to(device)
    optimizer = optim.Adam(model.parameters(), lr=args.lr)
    criterion = nn.CrossEntropyLoss()

    print(f"\nModel architecture:")
    print(f"Input size: {input_size}")
    print(f"Hidden size: {args.hidden_size}")
    print(f"Output size: {dataset.vocab_size}")
    print(f"Total parameters: {sum(p.numel() for p in model.parameters())}")

    # Training loop
    print(f"\nStarting training for {args.epochs} epochs...")

    best_loss = float('inf')
    for epoch in range(args.epochs):
        model.train()
        total_loss = 0
        correct = 0
        total = 0

        for features, targets in dataloader:
            features, targets = features.to(device), targets.to(device)

            optimizer.zero_grad()
            outputs = model(features)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()

            # Calculate accuracy
            _, predicted = torch.max(outputs, 1)
            total += targets.size(0)
            correct += (predicted == targets).sum().item()

        avg_loss = total_loss / len(dataloader)
        accuracy = 100 * correct / total

        print(f"Epoch {epoch+1}/{args.epochs} - Loss: {avg_loss:.4f}, Accuracy: {accuracy:.2f}%")

        # Save best model
        if avg_loss < best_loss:
            best_loss = avg_loss
            save_path = Path(args.output_dir) / f"policy-{args.length}-best.pt"
            save_path.parent.mkdir(parents=True, exist_ok=True)
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'loss': avg_loss,
                'accuracy': accuracy,
                'length': args.length,
                'vocab_size': dataset.vocab_size,
                'input_size': input_size,
                'hidden_size': args.hidden_size
            }, save_path)
            print(f"Saved best model to {save_path}")

    # Save final model
    final_path = Path(args.output_dir) / f"policy-{args.length}-final.pt"
    torch.save({
        'model_state_dict': model.state_dict(),
        'length': args.length,
        'vocab_size': dataset.vocab_size,
        'input_size': input_size,
        'hidden_size': args.hidden_size
    }, final_path)
    print(f"\nTraining complete! Final model saved to {final_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train Wordle ML policy')
    parser.add_argument('--length', type=int, default=5, choices=[3, 4, 5, 6, 7],
                        help='Word length to train on')
    parser.add_argument('--data-dir', type=str, default='./data',
                        help='Directory containing word lists and trajectories')
    parser.add_argument('--output-dir', type=str, default='./ml/models',
                        help='Directory to save trained models')
    parser.add_argument('--epochs', type=int, default=50,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=64,
                        help='Batch size for training')
    parser.add_argument('--lr', type=float, default=0.001,
                        help='Learning rate')
    parser.add_argument('--hidden-size', type=int, default=256,
                        help='Hidden layer size')

    args = parser.parse_args()
    train(args)
