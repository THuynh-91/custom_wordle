/**
 * Word API routes
 */

import express from 'express';
import { z } from 'zod';
import { WordService } from '../services/word-service.js';
import { WordLength } from '../../shared/types.js';
import { ERROR_MESSAGES } from '../../shared/constants.js';

const router = express.Router();

// Validate the :length path param is a supported word length (3-7).
const lengthParamSchema = z.coerce.number().int().refine(
  (n) => [3, 4, 5, 6, 7].includes(n),
  { message: 'length must be one of 3, 4, 5, 6, 7' }
);

/**
 * Parse and validate the :length param. Returns the WordLength or null
 * (and sends a 400 response) when invalid.
 */
function parseLength(req: express.Request, res: express.Response): WordLength | null {
  const parsed = lengthParamSchema.safeParse(req.params.length);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid Length',
      message: ERROR_MESSAGES.INVALID_WORD_LENGTH(Number(req.params.length)),
    });
    return null;
  }
  return parsed.data as WordLength;
}

/**
 * Get random word for a specific length
 */
router.get('/random/:length', async (req, res) => {
  try {
    const length = parseLength(req, res);
    if (length === null) return;

    const word = WordService.getRandomAnswer(length);
    res.json({ word, length });
  } catch (error: any) {
    console.error('Error getting random word:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * Get daily word
 */
router.get('/daily/:length', async (req, res) => {
  try {
    const length = parseLength(req, res);
    if (length === null) return;

    const word = WordService.getDailyWord(length);
    const date = new Date().toISOString().split('T')[0];

    res.json({ word, length, date });
  } catch (error: any) {
    console.error('Error getting daily word:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * Get word list statistics
 */
router.get('/stats/:length', async (req, res) => {
  try {
    const length = parseLength(req, res);
    if (length === null) return;

    const stats = WordService.getStatistics(length);
    res.json(stats);
  } catch (error: any) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * Get all word list info
 */
router.get('/info', async (req, res) => {
  try {
    const info = WordService.getWordListInfo();
    res.json(info);
  } catch (error: any) {
    console.error('Error getting word list info:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

export default router;
