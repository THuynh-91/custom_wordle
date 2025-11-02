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
import { WordService } from './services/word-service.js';
import gameRoutes from './routes/game.js';
import wordRoutes from './routes/words.js';
import leaderboardRoutes from './routes/leaderboard.js';
import feedbackRoutes from './routes/feedback.js';
import { setupMultiplayerHandlers } from './routes/multiplayer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

console.log('🔧 Server Configuration:');
console.log('  PORT:', PORT);
console.log('  FRONTEND_URL:', FRONTEND_URL);
console.log('  NODE_ENV:', process.env.NODE_ENV);

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
    const allowedOrigins = FRONTEND_URL.split(',');
    console.log('CORS check - Origin:', origin, 'Allowed:', allowedOrigins);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if origin matches allowed origins exactly
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Allow Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
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
          const allowedOrigins = FRONTEND_URL.split(',');

          if (!origin) {
            callback(null, true);
            return;
          }

          if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
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
