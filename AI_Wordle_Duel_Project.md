# AI Wordle Duel — Project Brief (No Code)

## 1) Vision
Build a **Wordle-style duel** where players can:
- Submit a **custom secret word** (validated) and watch an **AI solver** try to crack it.
- **Play as a human** with the same engine and standard rules.
- **Race the AI** on a randomly generated secret word.
- Support **variable word lengths** from **3 to 7 letters** (not just 5).

The project ships first with strong non-ML solvers, then layers on Machine Learning (supervised imitation) and optional RL fine-tuning.

---

## 2) Rules & Game Options
- **Word length (L):** any integer in **{3, 4, 5, 6, 7}**.
- **Guesses:** 6 attempts by default.
- **Feedback:** per-position tiles: **green** (correct letter, correct place), **yellow** (correct letter, wrong place), **gray** (letter absent). Handle **duplicate letters** correctly (greens first, then yellows up to remaining counts).
- **Hard mode (optional):** discovered letters/positions must be honored in subsequent guesses.
- **Challenge links:** allow sharing a seed or a specific custom secret (kept server-side).

Game modes:
1. **Custom Challenge:** challenger submits a valid secret (3–7) → AI plays.
2. **Human Play:** user guesses; engine returns feedback.
3. **Race Mode:** random secret → **Human vs AI** on synchronized boards.
4. **AI vs AI:** compare different AI agents/policies for benchmarking.

---

## 3) Core Objectives
- **Fair, length-agnostic game engine** that derives L from the secret/board.
- **Dictionary validation**: ensure custom words exist in the allowed list for that length.
- **Strong non-ML baseline** (frequency & information-gain/entropy) as a yardstick.
- **ML policy** that learns to guess efficiently from game histories.
- **Clean, fun UX** with an “Explain my move” panel for AI reasoning (top candidates, expected reduction).

---

## 4) Architecture (MVP → Production)
**Frontend (web)**
- Wordle grid that **auto-resizes** for L=3…7.
- On-screen keyboard, hard-mode toggle, duel boards (human vs AI).
- Panels for **AI rationale**, candidate counts, and top-k suggestions.
- Shareable results (unicode grid), challenge links, daily seed.

**Backend**
- Stateless **HTTP API** for create-game, submit-guess, request-AI-move, validate word, and leaderboards.
- **Game Engine** module: feedback, constraints, candidate filtering (length-aware).
- **Solvers**: frequency baseline, entropy/information-gain, plus ML policy and optional RL policy.
- **Storage**: Redis for ephemeral game state; Postgres for users/leaderboards; object storage (e.g., S3) for model artifacts.

---

## 5) Data & Word Lists
- Maintain **separate lists per length** (3–7):
  - **Answer list** (curated playable solutions) per length.
  - **Guess list** (broader, valid guesses) per length.
- Use open sources (e.g., wordfreq/ENABLE), cleaned and deduplicated by length.
- Track **letter and positional frequencies** for each length to power heuristics.
- Maintain a **word index** for ML that’s either per-length or global with offsets.

---

## 6) Feedback & Constraints (Length-Aware)
- Output feedback as an **L-length vector** of states {green, yellow, gray}.
- **Constraint state** accumulates over guesses:
  - Per-position requirements/forbidden letters.
  - Global **min/max letter counts** inferred from greens/yellows (respecting duplicates).
- All logic must be **length-agnostic**, using `L` dynamically.

---

## 7) Baseline Solvers (Non-ML)
- **Frequency Heuristic**: prioritize high-frequency letters and diverse coverage; use **per-length** letter/positional stats.
- **Entropy / Expected Partition Size**: pick guesses that most reduce the candidate set on average for that **length**.
- **Hybrid (Bi-level)**: optimize info gain early, then favor words more likely to be the answer (prior-weighted).

These baselines also generate **expert trajectories** for the ML training dataset.

---

## 8) Machine Learning Roadmap
**Phase 1: Supervised Imitation (Policy)**
- Create a dataset by letting the entropy solver play many games per L∈{3…7}; record (history → next best guess).
- Input features include guess history, feedback history, and the current candidate mask.
- Two approaches:
  - **One model per length** (simplest & stable).
  - **Single unified model** conditioned on **[LEN=k]** and masking logits to the per-length vocabulary.

**Phase 2: Reinforcement Learning (Optional)**
- Environment = Wordle for chosen length L.
- Reward shaping: +1 win, −(num_guesses), −1 loss; optional information-gain bonus.
- Algorithm: PPO/A2C with **masked action space** (only valid guesses for that length).
- Safety fallback: if policy proposes an invalid word, defer to entropy choice.

---

## 9) Evaluation & Leaderboards
- **Avg # of guesses** (lower is better), **win rate within 6**, **streaks**, **time per guess**.
- Per-length benchmarks and per-starting-word stats.
- Daily challenges and public leaderboards comparing **Baseline vs ML vs RL**.

---

## 10) API Sketch (No Implementation Yet)
- Create Game: `{ mode, length (3..7), hard?: bool, secret?: string, model?: "entropy|ml|rl" }`
- Submit Guess: `{ word }` → returns feedback, remaining-candidate count, top alternatives (if allowed).
- AI Move: returns AI’s guess and optional rationale.
- Validate Word: length-aware dictionary check + content filter.
- Leaderboard: public stats per mode/length.

---

## 11) Security & Fair Play
- **Server-side scoring** (never expose the secret).
- Rate limits and signed game tokens.
- Filter offensive terms from answer lists; allow in guess list only if not displayed.
- Ensure **custom secrets** must be in the **answer list** for that length.

---

## 12) Milestones
**M1 — Length-Agnostic Engine & Baselines**
- Word lists (3–7), validator, feedback, candidate filtering, frequency + entropy solver.
- Minimal web UI with duel board & race mode.

**M2 — “Explain My Move” & Race UX**
- Expected partition size, top‑k alternatives, rationale panel.
- Public seed/daily challenges.

**M3 — Supervised Policy**
- Generate expert trajectories per length; train a small policy; integrate via masked logits.

**M4 — RL Fine-Tune (Stretch)**
- PPO/A2C with masked action space; curriculum from short to longer words.

---

## 13) Stretch Ideas
- Multilingual word lists and per-language frequency priors.
- Variable guess caps by length; handicap modes for Human vs AI.
- Adversarial puzzle generator (heuristic or learned) for “hard seeds.”
- Visualize info gain per tile/letter; share animated replays.

---

## 14) Success Criteria
- Smooth play for **L = 3…7** with correct duplicate-letter handling.
- Entropy baseline achieves competitive average guesses across lengths.
- ML policy matches or surpasses baseline on held‑out seeds.
- Delightful UI with clear rationale and satisfying “share” output.

---

### Callouts
- No implementation here — this document captures **the product vision and technical plan** without code.
- Next steps: choose **M1** scope for a quick MVP, or jump to **M3** if you want to start on the ML dataset pipeline.
