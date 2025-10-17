/**
 * Express server for AI Wordle Duel
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { WordService } from './services/word-service.js';
import gameRoutes from './routes/game.js';
import wordRoutes from './routes/words.js';
import leaderboardRoutes from './routes/leaderboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const wordServiceReady = WordService.initialize();

// Ensure word data is loaded before handling requests
app.use(async (_req, _res, next) => {
  try {
    await wordServiceReady;
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: FRONTEND_URL.split(','),
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10kb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/game', gameRoutes);
app.use('/api/words', wordRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// In Vercel, static files and SPA routing are handled by vercel.json
// Only serve static files in local development
if (!process.env.VERCEL) {
  const frontendPath = path.join(__dirname, '..', 'frontend');
  app.use(express.static(frontendPath));

  // Serve index.html for all non-API routes (SPA fallback)
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    statusCode: err.statusCode || 500
  });
});

// Initialize and start server (only in non-Vercel environments)
if (!process.env.VERCEL) {
  async function start() {
    try {
      console.log('Initializing word service...');
      await wordServiceReady;

      app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`🎮 AI Wordle Duel Server`);
        console.log(`${'='.repeat(50)}`);
        console.log(`Server running on port ${PORT}`);
        console.log(`Access at: http://localhost:${PORT} or http://0.0.0.0:${PORT}`);
        console.log(`Frontend URL: ${FRONTEND_URL}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`\nWord lists loaded:`);

        const info = WordService.getWordListInfo();
        for (const [length, counts] of Object.entries(info)) {
          console.log(`  ${length} letters: ${counts.answers} answers, ${counts.guesses} valid guesses`);
        }

        console.log(`\nServer ready!\n`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  start();
}

export default app;
