"""
Unified ML Model for All Word Lengths
Handles 3-7 letter words with a single architecture
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Tuple, Optional
import numpy as np


class UnifiedWordlePolicy(nn.Module):
    """
    Unified neural network policy that handles all word lengths (3-7)
    Uses length embedding and attention mechanisms
    """

    def __init__(
        self,
        max_vocab_size: int = 2000,
        max_length: int = 7,
        embedding_dim: int = 128,
        hidden_dim: int = 256,
        num_layers: int = 3,
        dropout: float = 0.2
    ):
        super().__init__()

        self.max_vocab_size = max_vocab_size
        self.max_length = max_length
        self.embedding_dim = embedding_dim

        # Length embedding (3-7)
        self.length_embedding = nn.Embedding(5, embedding_dim)  # 5 possible lengths

        # Letter embeddings (26 letters + special tokens)
        self.letter_embedding = nn.Embedding(28, embedding_dim)

        # State embeddings for each tile (empty, correct, present, absent)
        self.state_embedding = nn.Embedding(4, embedding_dim)

        # Input feature dimension calculation
        # Length (1) + guess count (1) + letter states (26*4) + position info (7*27)
        feature_dim = embedding_dim + 1 + (26 * 4) + (max_length * 27)

        # Encoder for game state
        self.encoder = nn.Sequential(
            nn.Linear(feature_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
        )

        # Attention mechanism for focusing on important features
        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_dim,
            num_heads=8,
            dropout=dropout,
            batch_first=True
        )

        # Policy head (outputs logits for each possible word)
        self.policy_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, max_vocab_size)
        )

        # Value head (estimates win probability)
        self.value_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid()
        )

    def forward(
        self,
        state_features: torch.Tensor,
        length: torch.Tensor,
        candidate_mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass

        Args:
            state_features: Game state features [batch, feature_dim]
            length: Word length [batch] (values 3-7)
            candidate_mask: Boolean mask for valid candidates [batch, vocab_size]

        Returns:
            policy_logits: Logits for each word [batch, vocab_size]
            value: Win probability [batch, 1]
        """
        batch_size = state_features.shape[0]

        # Embed length (subtract 3 to get 0-4 index)
        length_emb = self.length_embedding(length - 3)  # [batch, embedding_dim]

        # Concatenate length embedding with state features
        combined_features = torch.cat([length_emb, state_features], dim=1)

        # Encode state
        encoded = self.encoder(combined_features)  # [batch, hidden_dim]

        # Apply self-attention
        encoded = encoded.unsqueeze(1)  # [batch, 1, hidden_dim]
        attended, _ = self.attention(encoded, encoded, encoded)
        attended = attended.squeeze(1)  # [batch, hidden_dim]

        # Residual connection
        encoded = encoded.squeeze(1) + attended

        # Get policy logits
        policy_logits = self.policy_head(encoded)  # [batch, vocab_size]

        # Apply candidate mask if provided
        if candidate_mask is not None:
            policy_logits = policy_logits.masked_fill(~candidate_mask, float('-inf'))

        # Get value estimate
        value = self.value_head(encoded)  # [batch, 1]

        return policy_logits, value

    def get_action(
        self,
        state_features: torch.Tensor,
        length: int,
        candidate_mask: Optional[torch.Tensor] = None,
        temperature: float = 1.0
    ) -> Tuple[int, float]:
        """
        Sample an action from the policy

        Args:
            state_features: Game state features [feature_dim]
            length: Word length (3-7)
            candidate_mask: Boolean mask for valid candidates [vocab_size]
            temperature: Sampling temperature (higher = more random)

        Returns:
            action: Word index
            log_prob: Log probability of action
        """
        self.eval()
        with torch.no_grad():
            # Add batch dimension
            state_features = state_features.unsqueeze(0)
            length_tensor = torch.tensor([length], dtype=torch.long)

            if candidate_mask is not None:
                candidate_mask = candidate_mask.unsqueeze(0)

            # Forward pass
            policy_logits, _ = self.forward(state_features, length_tensor, candidate_mask)

            # Apply temperature
            policy_logits = policy_logits / temperature

            # Sample action
            probs = F.softmax(policy_logits, dim=-1)
            action = torch.multinomial(probs, 1).item()
            log_prob = torch.log(probs[0, action]).item()

            return action, log_prob


class HybridSolver:
    """
    Hybrid solver that combines ML policy with heuristics
    Falls back to entropy solver when confidence is low
    """

    def __init__(
        self,
        model: UnifiedWordlePolicy,
        vocab_by_length: Dict[int, list],
        confidence_threshold: float = 0.3
    ):
        self.model = model
        self.vocab_by_length = vocab_by_length
        self.confidence_threshold = confidence_threshold

    def get_move(
        self,
        state_features: np.ndarray,
        length: int,
        candidates: list,
        entropy_fallback_fn: callable
    ) -> Tuple[str, str, float]:
        """
        Get next move using hybrid approach

        Returns:
            word: Chosen word
            strategy: 'ml' or 'entropy'
            confidence: Model confidence
        """
        vocab = self.vocab_by_length[length]

        # Create candidate mask
        candidate_mask = torch.zeros(len(vocab), dtype=torch.bool)
        candidate_indices = [i for i, w in enumerate(vocab) if w in candidates]
        if candidate_indices:
            candidate_mask[candidate_indices] = True

        # Get ML prediction
        state_tensor = torch.tensor(state_features, dtype=torch.float32)

        with torch.no_grad():
            logits, value = self.model(
                state_tensor.unsqueeze(0),
                torch.tensor([length]),
                candidate_mask.unsqueeze(0)
            )

            probs = F.softmax(logits, dim=-1)[0]
            top_prob = probs.max().item()
            top_idx = probs.argmax().item()

        # Use ML if confident, otherwise fall back to entropy
        if top_prob >= self.confidence_threshold and vocab[top_idx] in candidates:
            return vocab[top_idx], 'ml', top_prob
        else:
            entropy_word = entropy_fallback_fn(candidates)
            return entropy_word, 'entropy', 0.0


def encode_game_state(
    guesses: list,
    feedbacks: list,
    length: int,
    max_length: int = 7
) -> np.ndarray:
    """
    Encode current game state into feature vector

    Args:
        guesses: List of previous guesses
        feedbacks: List of feedback arrays
        length: Current word length
        max_length: Maximum supported length

    Returns:
        Feature vector
    """
    features = []

    # Guess count (normalized)
    features.append(len(guesses) / 6.0)

    # Letter states (26 letters * 4 states: unknown, absent, present, correct)
    letter_states = np.zeros((26, 4))
    letter_states[:, 0] = 1  # Initially all unknown

    for guess, feedback in zip(guesses, feedbacks):
        for letter, state in zip(guess, feedback):
            letter_idx = ord(letter) - ord('a')

            # Update state (higher priority overwrites)
            state_map = {'absent': 1, 'present': 2, 'correct': 3}
            if state in state_map:
                state_idx = state_map[state]
                letter_states[letter_idx, :] = 0
                letter_states[letter_idx, state_idx] = 1

    features.extend(letter_states.flatten())

    # Position constraints (max_length positions * 27 features)
    # For each position: 26 letters + 1 for "any"
    position_info = np.zeros((max_length, 27))
    position_info[:, 26] = 1  # Initially all "any"

    for guess, feedback in zip(guesses, feedbacks):
        for pos, (letter, state) in enumerate(zip(guess, feedback)):
            if pos < max_length:
                letter_idx = ord(letter) - ord('a')

                if state == 'correct':
                    position_info[pos, :] = 0
                    position_info[pos, letter_idx] = 1
                elif state == 'absent':
                    position_info[pos, letter_idx] = -1

    features.extend(position_info.flatten())

    return np.array(features, dtype=np.float32)


# Pre-computed optimal starting words by length (based on frequency analysis)
OPTIMAL_STARTERS = {
    3: ['are', 'ate', 'one', 'our', 'out'],
    4: ['tale', 'late', 'rate', 'sane', 'lean'],
    5: ['arose', 'slate', 'least', 'stale', 'steal'],
    6: ['strain', 'trails', 'learns', 'master', 'realist'],
    7: ['stainer', 'eastern', 'angriest', 'strange', 'learnt']
}


def get_smart_starter(length: int, available_words: list) -> str:
    """Get a smart starting word for the given length"""
    optimal = OPTIMAL_STARTERS.get(length, [])

    # Return first available optimal starter
    for word in optimal:
        if word in available_words:
            return word

    # Fallback to first available word
    return available_words[0] if available_words else None
