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
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { WordService } from './services/word-service.js';
import gameRoutes from './routes/game.js';
import wordRoutes from './routes/words.js';
import leaderboardRoutes from './routes/leaderboard.js';
import feedbackRoutes from './routes/feedback.js';
import { setupMultiplayerHandlers } from './routes/multiplayer.js';
import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  ERROR_MESSAGES,
} from '../shared/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Comma-separated list of Vercel project slugs whose preview deployments are
// trusted (e.g. "custom-wordle,custom-wordle-thuynh"). Vercel preview URLs look
// like `https://<project>-<hash>-<scope>.vercel.app`, so we match on the slug
// prefix. If unset, we fall back to a safe default derived from this project.
const VERCEL_PROJECT_SLUGS = (process.env.VERCEL_PROJECT_SLUGS || 'custom-wordle')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

console.log('🔧 Server Configuration:');
console.log('  PORT:', PORT);
console.log('  FRONTEND_URL:', FRONTEND_URL);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  VERCEL_PROJECT_SLUGS:', VERCEL_PROJECT_SLUGS.join(', '));

/**
 * Decide whether an Origin header is allowed by CORS.
 *
 * CORS decision (see audit M5): previously ANY `*.vercel.app` origin was
 * allowed WITH credentials, meaning any attacker-controlled Vercel preview
 * passed. We keep the explicit FRONTEND_URL allowlist and still support Vercel
 * previews, but restrict the wildcard to this project's own preview slugs
 * (VERCEL_PROJECT_SLUGS). Hostnames like `evil.vercel.app` or
 * `someoneelse-abc123.vercel.app` no longer match.
 */
function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = FRONTEND_URL.split(',').map((o) => o.trim());

  // Exact allowlist match (configured production/dev frontends)
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Restricted Vercel preview support: only this project's preview domains.
  try {
    const url = new URL(origin);
    if (url.protocol === 'https:' && url.hostname.endsWith('.vercel.app')) {
      const host = url.hostname.toLowerCase();
      return VERCEL_PROJECT_SLUGS.some(
        (slug) => host === `${slug}.vercel.app` || host.startsWith(`${slug}-`)
      );
    }
  } catch {
    // Malformed origin -> reject
    return false;
  }

  return false;
}

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
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    console.warn('CORS check - rejected Origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10kb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/**
 * Global rate limiter (in-memory): 100 requests / minute / IP.
 * Stricter per-endpoint limiters live in the route modules (AI move, feedback).
 */
const globalRateLimiter = new RateLimiterMemory({
  points: RATE_LIMIT_MAX_REQUESTS, // 100 requests
  duration: RATE_LIMIT_WINDOW_MS / 1000, // per 60 seconds
});

app.use((req, res, next) => {
  // Health checks should never be throttled (used by Render self-ping)
  if (req.path === '/health' || req.path === '/api/health') {
    next();
    return;
  }

  const key = req.ip || req.socket.remoteAddress || 'unknown';
  globalRateLimiter
    .consume(key)
    .then(() => next())
    .catch(() => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
        statusCode: 429,
      });
    });
});

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/game', gameRoutes);
app.use('/api/words', wordRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/feedback', feedbackRoutes);

// Frontend is hosted separately on Vercel
// No need to serve static files from backend

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    statusCode: err.statusCode || 500
  });
});

/**
 * Self-ping mechanism to keep Render backend alive
 * Pings its own health endpoint every 10 minutes
 */
function startSelfPing() {
  const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL; // Render sets this automatically

  // Only enable self-ping in production (on Render)
  if (!RENDER_URL) {
    console.log('⏭️  Self-ping disabled (not running on Render)');
    return;
  }

  const healthUrl = `${RENDER_URL}/health`;
  console.log(`🔄 Self-ping enabled: ${healthUrl} every 10 minutes`);

  // Ping immediately on startup
  setTimeout(() => {
    fetch(healthUrl)
      .then(res => {
        if (res.ok) {
          console.log(`[Self-Ping] ✓ Initial ping successful at ${new Date().toISOString()}`);
        }
      })
      .catch(err => {
        console.debug('[Self-Ping] Initial ping failed:', err.message);
      });
  }, 5000); // Wait 5 seconds after startup

  // Set up recurring pings
  setInterval(async () => {
    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        console.log(`[Self-Ping] ✓ Ping successful at ${new Date().toISOString()}`);
      } else {
        console.warn(`[Self-Ping] ⚠️  Ping returned status ${response.status}`);
      }
    } catch (error: any) {
      console.debug(`[Self-Ping] ✗ Ping failed: ${error.message}`);
    }
  }, PING_INTERVAL);
}

// Initialize and start server
async function start() {
  try {
    console.log('Initializing word service...');
    await wordServiceReady;

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.io
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) {
            callback(null, true);
            return;
          }

          if (isAllowedOrigin(origin)) {
            callback(null, true);
            return;
          }

          callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
      },
    });

    // Set up multiplayer socket handlers
    setupMultiplayerHandlers(io);

    httpServer.listen(PORT, '0.0.0.0', () => {
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

      console.log(`\n🔌 Socket.io enabled for multiplayer`);
      console.log(`\nServer ready!\n`);

      // Start self-ping to prevent Render from sleeping
      startSelfPing();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
