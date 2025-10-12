/**
 * Word API routes
 */

import express from 'express';
import { WordService } from '../services/word-service.js';
import { WordLength } from '../../shared/types.js';
import { ERROR_MESSAGES } from '../../shared/constants.js';

const router = express.Router();

/**
 * Get random word for a specific length
 */
router.get('/random/:length', async (req, res) => {
  try {
    const length = parseInt(req.params.length) as WordLength;

    if (![3, 4, 5, 6, 7].includes(length)) {
      return res.status(400).json({
        error: 'Invalid Length',
        message: ERROR_MESSAGES.INVALID_WORD_LENGTH(length)
      });
    }

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
    const length = parseInt(req.params.length) as WordLength;

    if (![3, 4, 5, 6, 7].includes(length)) {
      return res.status(400).json({
        error: 'Invalid Length',
        message: ERROR_MESSAGES.INVALID_WORD_LENGTH(length)
      });
    }

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
    const length = parseInt(req.params.length) as WordLength;

    if (![3, 4, 5, 6, 7].includes(length)) {
      return res.status(400).json({
        error: 'Invalid Length',
        message: ERROR_MESSAGES.INVALID_WORD_LENGTH(length)
      });
    }

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
