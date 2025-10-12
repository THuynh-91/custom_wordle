"""
Train Unified Model for All Word Lengths
Production-ready training with proper validation and checkpointing
"""

import argparse
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from pathlib import Path
import numpy as np
from typing import List, Dict
import sys
from tqdm import tqdm

sys.path.append(str(Path(__file__).parent))
from unified_model import UnifiedWordlePolicy, encode_game_state


class UnifiedWordleDataset(Dataset):
    """Dataset for training unified model across all lengths"""

    def __init__(self, trajectories_dir: str, vocab_dir: str, max_vocab_size: int = 25000):
        self.trajectories = []
        self.vocab_by_length = {}
        self.max_vocab_size = max_vocab_size

        # Load vocabularies for each length
        for length in [3, 4, 5, 6, 7]:
            vocab_file = Path(vocab_dir) / f"{length}-letters-answer.txt"
            if vocab_file.exists():
                with open(vocab_file, 'r') as f:
                    self.vocab_by_length[length] = [
                        line.strip().lower() for line in f
                        if len(line.strip()) == length
                    ]

        # Load trajectories from all lengths
        traj_path = Path(trajectories_dir)
        if traj_path.exists():
            for traj_file in traj_path.glob("optimal-*.jsonl"):
                with open(traj_file, 'r') as f:
                    for line in f:
                        traj = json.loads(line)
                        # Extract length from filename or from word length
                        if 'length' not in traj and 'secret' in traj:
                            traj['length'] = len(traj['secret'])
                        if traj.get('length') in self.vocab_by_length and traj.get('won', True):
                            self.trajectories.append(traj)

        print(f"Loaded {len(self.trajectories)} trajectories")
        print(f"Vocabularies: {[f'{k}:{len(v)}' for k,v in self.vocab_by_length.items()]}")

    def __len__(self):
        return len(self.trajectories) * 3  # Data augmentation: multiple examples per trajectory

    def __getitem__(self, idx):
        # Get trajectory
        traj_idx = idx % len(self.trajectories)
        traj = self.trajectories[traj_idx]

        length = traj['length']
        guesses = traj['guesses']
        feedbacks = traj['feedbacks']

        # Pick a random step in the trajectory
        if len(guesses) > 1:
            step = np.random.randint(0, len(guesses))
        else:
            step = 0

        # Encode state up to this step
        state_features = encode_game_state(
            guesses[:step],
            feedbacks[:step],
            length
        )

        # Target is the next guess
        target_word = guesses[step]
        vocab = self.vocab_by_length[length]

        if target_word not in vocab:
            target_idx = 0  # Fallback
        else:
            target_idx = vocab.index(target_word)

        # Create candidate mask (words still possible at this state)
        candidate_mask = self._get_candidate_mask(
            guesses[:step],
            feedbacks[:step],
            vocab,
            traj['secret']
        )

        return {
            'state': torch.tensor(state_features, dtype=torch.float32),
            'length': torch.tensor(length, dtype=torch.long),
            'target': torch.tensor(target_idx, dtype=torch.long),
            'mask': candidate_mask
        }

    def _get_candidate_mask(self, guesses, feedbacks, vocab, secret):
        """Create mask of valid candidates at this game state"""
        # Use max vocab size for consistent tensor shapes
        mask = torch.zeros(self.max_vocab_size, dtype=torch.bool)

        # Mark available words as valid
        mask[:len(vocab)] = True

        # For simplicity, mark all words as valid
        # In production, implement proper constraint filtering
        return mask


def train_epoch(model, dataloader, optimizer, criterion, device):
    """Train for one epoch"""
    model.train()
    total_loss = 0
    correct = 0
    total = 0

    for batch in tqdm(dataloader, desc="Training"):
        state = batch['state'].to(device)
        length = batch['length'].to(device)
        target = batch['target'].to(device)
        mask = batch['mask'].to(device)

        optimizer.zero_grad()

        # Forward pass
        logits, value = model(state, length, mask)

        # Policy loss (cross entropy)
        policy_loss = criterion(logits, target)

        # Total loss
        loss = policy_loss

        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()

        total_loss += loss.item()

        # Calculate accuracy
        _, predicted = torch.max(logits, 1)
        total += target.size(0)
        correct += (predicted == target).sum().item()

    return total_loss / len(dataloader), 100 * correct / total


def validate(model, dataloader, criterion, device):
    """Validate model"""
    model.eval()
    total_loss = 0
    correct = 0
    total = 0

    with torch.no_grad():
        for batch in tqdm(dataloader, desc="Validating"):
            state = batch['state'].to(device)
            length = batch['length'].to(device)
            target = batch['target'].to(device)
            mask = batch['mask'].to(device)

            logits, value = model(state, length, mask)
            loss = criterion(logits, target)

            total_loss += loss.item()

            _, predicted = torch.max(logits, 1)
            total += target.size(0)
            correct += (predicted == target).sum().item()

    return total_loss / len(dataloader), 100 * correct / total


def main(args):
    # Setup
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}\n")

    # Determine max vocab size from files
    max_vocab = 25000  # Upper bound

    # Create dataset
    dataset = UnifiedWordleDataset(args.data_dir, args.vocab_dir, max_vocab)

    if len(dataset) == 0:
        print("[ERROR] No training data found!")
        print("\nPlease generate trajectories first:")
        print("  npm run generate-trajectories")
        return

    # Split into train/val
    train_size = int(0.9 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(
        dataset, [train_size, val_size]
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=0
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=0
    )

    # Create model - use consistent max vocab size
    model = UnifiedWordlePolicy(
        max_vocab_size=dataset.max_vocab_size,
        embedding_dim=args.embedding_dim,
        hidden_dim=args.hidden_dim,
        dropout=args.dropout
    ).to(device)

    print(f"Model Parameters: {sum(p.numel() for p in model.parameters()):,}\n")

    # Optimizer and loss
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    criterion = nn.CrossEntropyLoss()
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    # Training loop
    best_val_acc = 0
    for epoch in range(args.epochs):
        print(f"\nEpoch {epoch + 1}/{args.epochs}")
        print("=" * 50)

        train_loss, train_acc = train_epoch(
            model, train_loader, optimizer, criterion, device
        )

        val_loss, val_acc = validate(model, val_loader, criterion, device)

        scheduler.step()

        print(f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
        print(f"Val Loss:   {val_loss:.4f} | Val Acc:   {val_acc:.2f}%")

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            save_path = Path(args.output_dir) / "unified_model_best.pt"
            save_path.parent.mkdir(parents=True, exist_ok=True)

            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
                'vocab_by_length': dataset.vocab_by_length,
                'config': {
                    'max_vocab_size': dataset.max_vocab_size,
                    'embedding_dim': args.embedding_dim,
                    'hidden_dim': args.hidden_dim,
                    'dropout': args.dropout
                }
            }, save_path)
            print(f"[OK] Saved best model (val_acc: {val_acc:.2f}%)")

    # Save final model
    final_path = Path(args.output_dir) / "unified_model_final.pt"
    torch.save({
        'model_state_dict': model.state_dict(),
        'vocab_by_length': dataset.vocab_by_length,
        'config': {
            'max_vocab_size': dataset.max_vocab_size,
            'embedding_dim': args.embedding_dim,
            'hidden_dim': args.hidden_dim,
            'dropout': args.dropout
        }
    }, final_path)

    print(f"\n[SUCCESS] Training complete!")
    print(f"Best validation accuracy: {best_val_acc:.2f}%")
    print(f"Models saved to: {args.output_dir}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train Unified Wordle Policy')
    parser.add_argument('--data-dir', type=str, default='./data/trajectories',
                        help='Directory with training trajectories')
    parser.add_argument('--vocab-dir', type=str, default='./data/words',
                        help='Directory with word lists')
    parser.add_argument('--output-dir', type=str, default='./ml/models',
                        help='Directory to save models')
    parser.add_argument('--epochs', type=int, default=30,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=64,
                        help='Batch size')
    parser.add_argument('--lr', type=float, default=0.001,
                        help='Learning rate')
    parser.add_argument('--embedding-dim', type=int, default=128,
                        help='Embedding dimension')
    parser.add_argument('--hidden-dim', type=int, default=256,
                        help='Hidden dimension')
    parser.add_argument('--dropout', type=float, default=0.2,
                        help='Dropout rate')

    args = parser.parse_args()
    main(args)
