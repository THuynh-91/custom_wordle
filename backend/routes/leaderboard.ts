/**
 * Leaderboard API routes (placeholder for now)
 */

import express from 'express';
import { WordLength } from '../../shared/types.js';

const router = express.Router();

/**
 * Get leaderboard for a specific length
 */
router.get('/:length', async (req, res) => {
  try {
    const length = parseInt(req.params.length) as WordLength;

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
