/**
 * Leaderboard API routes (placeholder for now)
 */

import express from 'express';
import { z } from 'zod';
import { WordLength } from '../../shared/types.js';
import { ERROR_MESSAGES } from '../../shared/constants.js';

const router = express.Router();

// Validate the :length path param is a supported word length (3-7).
const lengthParamSchema = z.coerce.number().int().refine(
  (n) => [3, 4, 5, 6, 7].includes(n),
  { message: 'length must be one of 3, 4, 5, 6, 7' }
);

/**
 * Get leaderboard for a specific length
 */
router.get('/:length', async (req, res) => {
  try {
    const parsed = lengthParamSchema.safeParse(req.params.length);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid Length',
        message: ERROR_MESSAGES.INVALID_WORD_LENGTH(Number(req.params.length)),
      });
    }
    const length = parsed.data as WordLength;

    // Placeholder - implement with PostgreSQL in production
    res.json({
      length,
      entries: [],
      message: 'Leaderboard feature coming soon!'
    });
  } catch (error: any) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

export default router;
