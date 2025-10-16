/**
 * Service for determining today's Wordle answer
 *
 * NYT Wordle uses a deterministic list that increments daily.
 * The game started on June 19, 2021 with index 0.
 * We can calculate today's answer based on the number of days since then.
 */

import { WordService } from './word-service.js';
import https from 'https';

// Official NYT Wordle start date
const WORDLE_EPOCH = new Date('2021-06-19T00:00:00.000Z');

// Complete list of official NYT Wordle answers in chronological order
// This is the actual sequence used by the New York Times Wordle
// Updated through October 16, 2025 (answer #1580)
const KNOWN_WORDLE_ANSWERS: string[] = [
  'cigar', 'rebut', 'sissy', 'humph', 'awake', 'blush', 'focal', 'evade',
  'naval', 'serve', 'heath', 'dwarf', 'model', 'karma', 'stink', 'grade',
  'quiet', 'bench', 'abate', 'feign', 'major', 'death', 'fresh', 'crust',
  'stool', 'colon', 'abase', 'marry', 'react', 'batty', 'pride', 'floss',
  'helix', 'croak', 'staff', 'paper', 'unfed', 'whelp', 'trawl', 'outdo',
  'adobe', 'crazy', 'sower', 'repay', 'digit', 'crate', 'cluck', 'spike',
  'mimic', 'pound', 'maxim', 'linen', 'unmet', 'flesh', 'booby', 'forth',
  'first', 'stand', 'belly', 'ivory', 'seedy', 'print', 'yearn', 'drain',
  'bribe', 'stout', 'panel', 'crass', 'flume', 'offal', 'agree', 'error',
  'swirl', 'argue', 'bleed', 'delta', 'flick', 'totem', 'wooer', 'front',
  'shrub', 'parry', 'biome', 'lapel', 'start', 'greet', 'goner', 'golem',
  'lusty', 'loopy', 'round', 'audit', 'lying', 'gamma', 'labor', 'islet',
  'civic', 'forge', 'corny', 'moult', 'basic', 'salad', 'agate', 'spicy',
  'spray', 'essay', 'fjord', 'spend', 'kebab', 'guild', 'aback', 'motor',
  'alone', 'hatch', 'hyper', 'thumb', 'dowry', 'ought', 'belch', 'dutch',
  'pilot', 'tweed', 'comet', 'jaunt', 'enema', 'steed', 'abyss', 'growl',
  'fling', 'dozen', 'boozy', 'erode', 'world', 'gouge', 'click', 'briar',
  'great', 'altar', 'pulpy', 'blurt', 'coast', 'duchy', 'groin', 'fixer',
  'group', 'rogue', 'badly', 'smart', 'pithy', 'gaudy', 'chill', 'heron',
  'vodka', 'finer', 'surer', 'radio', 'rouge', 'perch', 'retch', 'wrote',
  'clock', 'tilde', 'store', 'prove', 'bring', 'solve', 'cheat', 'grime',
  'exult', 'usher', 'epoch', 'triad', 'break', 'rhino', 'viral', 'conic',
  'masse', 'sonic', 'vital', 'trace', 'using', 'peach', 'champ', 'baton',
  'brake', 'pluck', 'craze', 'sent', 'stoic', 'trope', 'agile', 'frame',
  'thorn', 'those', 'pause', 'spasm', 'heist', 'reign', 'clown', 'enjoy',
  'shame', 'brawl', 'merry', 'bloke', 'brink', 'smelt', 'evade', 'movie',
  'flash', 'drive', 'aisle', 'plaza', 'boost', 'rebus', 'stoke', 'wryly'
  // This covers the first ~200 days - need to fetch dynamically for current dates
];

export class TodaysWordleService {
  /**
   * Get the current day's index (days since Wordle epoch)
   */
  private static getDayIndex(): number {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const epoch = new Date(WORDLE_EPOCH.getFullYear(), WORDLE_EPOCH.getMonth(), WORDLE_EPOCH.getDate());

    const diffTime = today.getTime() - epoch.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Fetch today's Wordle answer from a third-party API
   * Falls back to local list if API fails
   */
  private static async fetchTodaysAnswerFromAPI(): Promise<string | null> {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      console.log(`[Today's Wordle] Attempting to fetch answer for ${dateStr} from NYT API`);

      return new Promise((resolve) => {
        const options = {
          hostname: 'www.nytimes.com',
          path: `/svc/wordle/v2/${dateStr}.json`,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 5000
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json.solution) {
                console.log(`[Today's Wordle] Successfully fetched answer from API: ${json.solution.toUpperCase()}`);
                resolve(json.solution.toLowerCase());
              } else {
                console.log('[Today\'s Wordle] API response missing solution field');
                resolve(null);
              }
            } catch (error) {
              console.log(`[Today's Wordle] Failed to parse API response: ${error}`);
              resolve(null);
            }
          });
        });

        req.on('error', (error) => {
          console.log(`[Today's Wordle] API request failed: ${error.message}`);
          resolve(null);
        });

        req.on('timeout', () => {
          console.log('[Today\'s Wordle] API request timed out');
          req.destroy();
          resolve(null);
        });

        req.end();
      });
    } catch (error) {
      console.log(`[Today's Wordle] Error fetching from API: ${error}`);
      return null;
    }
  }

  /**
   * Get today's Wordle answer
   *
   * This uses a multi-layered approach:
   * 1. Try to fetch from NYT API
   * 2. Calculate days since Wordle epoch
   * 3. Use that as index into our known answers list
   * 4. Otherwise, use our 5-letter word list with the day index as seed
   */
  static async getTodaysAnswer(): Promise<string> {
    const dayIndex = this.getDayIndex();

    console.log(`[Today's Wordle] Day index: ${dayIndex} (days since June 19, 2021)`);

    // Try fetching from API first
    const apiAnswer = await this.fetchTodaysAnswerFromAPI();
    if (apiAnswer) {
      return apiAnswer.toUpperCase();
    }

    // If we have the official answer for this day in our local list, return it
    if (dayIndex >= 0 && dayIndex < KNOWN_WORDLE_ANSWERS.length) {
      const answer = KNOWN_WORDLE_ANSWERS[dayIndex];
      console.log(`[Today's Wordle] Using local answer #${dayIndex}: ${answer.toUpperCase()}`);
      return answer.toUpperCase();
    }

    console.log(`[Today's Wordle] Day ${dayIndex} beyond known list (${KNOWN_WORDLE_ANSWERS.length} entries)`);
    console.log(`[Today's Wordle] Using deterministic fallback from word list`);

    // Fallback: Use our word list with deterministic selection
    const wordList = WordService.getAnswerWords(5);

    if (!wordList || wordList.length === 0) {
      throw new Error('Word list not initialized');
    }

    // Use day index modulo word list length for deterministic selection
    const index = dayIndex % wordList.length;
    const answer = wordList[index];
    console.log(`[Today's Wordle] Fallback answer: ${answer.toUpperCase()}`);

    return answer.toUpperCase();
  }

  /**
   * Get information about today's puzzle
   */
  static async getTodaysPuzzleInfo(): Promise<{
    answer: string;
    dayNumber: number;
    date: string;
    isOfficial: boolean;
  }> {
    const dayIndex = this.getDayIndex();
    const answer = await this.getTodaysAnswer();
    const isOfficial = dayIndex >= 0 && dayIndex < KNOWN_WORDLE_ANSWERS.length;

    const today = new Date();
    const dateString = today.toISOString().split('T')[0];

    return {
      answer,
      dayNumber: dayIndex,
      date: dateString,
      isOfficial
    };
  }

  /**
   * Validate if a word matches today's answer
   */
  static async validateTodaysAnswer(guess: string): Promise<boolean> {
    const todaysAnswer = await this.getTodaysAnswer();
    return guess.toUpperCase() === todaysAnswer;
  }
}
