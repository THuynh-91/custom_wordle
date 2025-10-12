/**
 * Word service - manages word lists and frequencies for different lengths
 */

import * as fs from 'fs';
import * as path from 'path';
import { WordLength, WordFrequencyData, LetterFrequency } from '../../shared/types.js';
import { WORD_LIST_FILES } from '../../shared/constants.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..');

export class WordService {
  private static answerLists: Map<WordLength, Set<string>> = new Map();
  private static guessLists: Map<WordLength, Set<string>> = new Map();
  private static frequencies: Map<WordLength, Record<string, { total: number; positions: number[] }>> = new Map();
  private static initialized = false;

  /**
   * Initialize word lists and frequencies
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const lengths: WordLength[] = [3, 4, 5, 6, 7];

    for (const length of lengths) {
      // Load answer list
      const answerPath = path.join(ROOT_DIR, WORD_LIST_FILES.ANSWER(length));
      const answerWords = fs.readFileSync(answerPath, 'utf-8')
        .split('\n')
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length === length);
      this.answerLists.set(length, new Set(answerWords));

      // Load guess list
      const guessPath = path.join(ROOT_DIR, WORD_LIST_FILES.GUESS(length));
      const guessWords = fs.readFileSync(guessPath, 'utf-8')
        .split('\n')
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length === length);
      this.guessLists.set(length, new Set(guessWords));

      // Load frequencies
      const freqPath = path.join(ROOT_DIR, WORD_LIST_FILES.FREQUENCY(length));
      const freqData = JSON.parse(fs.readFileSync(freqPath, 'utf-8'));
      this.frequencies.set(length, freqData);

      console.log(`Loaded ${length}-letter words: ${answerWords.length} answers, ${guessWords.length} guesses`);
    }

    this.initialized = true;
    console.log('Word service initialized');
  }

  /**
   * Get answer words for a specific length
   */
  static getAnswerWords(length: WordLength): string[] {
    if (!this.answerLists.has(length)) {
      throw new Error(`No answer list for length ${length}`);
    }
    return Array.from(this.answerLists.get(length)!);
  }

  /**
   * Get all valid guess words for a specific length
   */
  static getGuessWords(length: WordLength): string[] {
    if (!this.guessLists.has(length)) {
      throw new Error(`No guess list for length ${length}`);
    }
    return Array.from(this.guessLists.get(length)!);
  }

  /**
   * Check if a word is a valid answer
   */
  static isValidAnswer(word: string, length: WordLength): boolean {
    const normalized = word.toLowerCase().trim();
    if (normalized.length !== length) {
      return false;
    }
    return this.answerLists.get(length)?.has(normalized) || false;
  }

  /**
   * Check if a word is a valid guess (broader than answer list)
   */
  static isValidGuess(word: string, length: WordLength): boolean {
    const normalized = word.toLowerCase().trim();
    if (normalized.length !== length) {
      return false;
    }
    return this.guessLists.get(length)?.has(normalized) || false;
  }

  /**
   * Get a random answer word
   */
  static getRandomAnswer(length: WordLength): string {
    const words = this.getAnswerWords(length);
    return words[Math.floor(Math.random() * words.length)];
  }

  /**
   * Get a deterministic random answer based on seed
   */
  static getSeededAnswer(length: WordLength, seed: string): string {
    const words = this.getAnswerWords(length);

    // Simple hash function for seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    const index = Math.abs(hash) % words.length;
    return words[index];
  }

  /**
   * Get daily word for a specific date and length
   */
  static getDailyWord(length: WordLength, date: Date = new Date()): string {
    const seed = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${length}`;
    return this.getSeededAnswer(length, seed);
  }

  /**
   * Get letter frequencies for a specific length
   */
  static getFrequencies(length: WordLength): Record<string, { total: number; positions: number[] }> {
    if (!this.frequencies.has(length)) {
      throw new Error(`No frequency data for length ${length}`);
    }
    return this.frequencies.get(length)!;
  }

  /**
   * Get letter frequencies as array
   */
  static getLetterFrequenciesArray(length: WordLength): LetterFrequency[] {
    const freqData = this.getFrequencies(length);
    return Object.entries(freqData).map(([letter, data]) => ({
      letter,
      totalFrequency: data.total,
      positionalFrequency: data.positions
    })).sort((a, b) => b.totalFrequency - a.totalFrequency);
  }

  /**
   * Score a word based on letter frequency
   */
  static scoreWordByFrequency(word: string, length: WordLength): number {
    const freqData = this.getFrequencies(length);
    let score = 0;
    const counted = new Set<string>();

    for (let i = 0; i < word.length; i++) {
      const letter = word[i];

      // Positional score
      if (freqData[letter]) {
        score += freqData[letter].positions[i];
      }

      // Uniqueness bonus (favor words with diverse letters)
      if (!counted.has(letter)) {
        if (freqData[letter]) {
          score += freqData[letter].total * 0.5;
        }
        counted.add(letter);
      }
    }

    return score;
  }

  /**
   * Get top N words by frequency score
   */
  static getTopWordsByFrequency(length: WordLength, n: number = 10): WordFrequencyData[] {
    const words = this.getAnswerWords(length);
    const scored = words.map((word, index) => ({
      word,
      frequency: this.scoreWordByFrequency(word, length),
      rank: index
    }));

    return scored
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, n);
  }

  /**
   * Filter words by pattern (for testing/debugging)
   * Pattern uses: ? for any letter, specific letters for exact match
   * Example: "?a?e?" matches "cared", "safer", etc.
   */
  static filterByPattern(length: WordLength, pattern: string): string[] {
    if (pattern.length !== length) {
      throw new Error(`Pattern length ${pattern.length} doesn't match word length ${length}`);
    }

    const words = this.getGuessWords(length);
    return words.filter(word => {
      for (let i = 0; i < length; i++) {
        if (pattern[i] !== '?' && pattern[i] !== word[i]) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Get statistics about word lists
   */
  static getStatistics(length: WordLength): {
    answerCount: number;
    guessCount: number;
    uniqueLetters: number;
    avgWordScore: number;
  } {
    const answers = this.getAnswerWords(length);
    const guesses = this.getGuessWords(length);
    const freqData = this.getFrequencies(length);

    const uniqueLetters = Object.keys(freqData).filter(
      letter => freqData[letter].total > 0
    ).length;

    const totalScore = answers.reduce(
      (sum, word) => sum + this.scoreWordByFrequency(word, length),
      0
    );
    const avgWordScore = totalScore / answers.length;

    return {
      answerCount: answers.length,
      guessCount: guesses.length,
      uniqueLetters,
      avgWordScore
    };
  }

  /**
   * Validate and normalize a word
   */
  static normalizeWord(word: string): string {
    return word.toLowerCase().trim();
  }

  /**
   * Check if word contains only valid characters
   */
  static isAlphabetic(word: string): boolean {
    return /^[a-z]+$/i.test(word);
  }

  /**
   * Get word list information
   */
  static getWordListInfo(): Record<WordLength, { answers: number; guesses: number }> {
    const info: Partial<Record<WordLength, { answers: number; guesses: number }>> = {};

    for (const length of [3, 4, 5, 6, 7] as WordLength[]) {
      info[length] = {
        answers: this.answerLists.get(length)?.size || 0,
        guesses: this.guessLists.get(length)?.size || 0
      };
    }

    return info as Record<WordLength, { answers: number; guesses: number }>;
  }
}
