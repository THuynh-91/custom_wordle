/**
 * Multiplayer socket event handlers
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { z } from 'zod';
import { MultiplayerService } from '../services/multiplayer-service.js';
import {
  CreateMultiplayerRoomResponse,
  JoinMultiplayerRoomResponse,
} from '../../shared/types.js';

// --- Incoming socket payload validation -----------------------------------
// Socket payloads come from untrusted clients, so every handler validates its
// data with zod before use. Malformed messages are rejected with an `error`
// event and never reach the service layer (prevents crashes like calling
// `.toLowerCase()` on a non-string).

const wordLengthSchema = z.union([
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

const playerNameSchema = z.string().trim().min(1).max(40);

const createRoomSchema = z.object({
  playerName: playerNameSchema,
  length: wordLengthSchema,
  gameMode: z.union([z.literal('turn-based'), z.literal('simultaneous')]),
  hardMode: z.boolean().optional(),
  secret: z.string().min(1).max(7).optional(),
});

const joinRoomSchema = z.object({
  roomCode: z.string().trim().min(1).max(12),
  playerName: playerNameSchema,
});

const roomIdSchema = z.object({
  roomId: z.string().min(1),
});

const submitGuessSchema = z.object({
  roomId: z.string().min(1),
  word: z.string().min(1).max(7),
});

/**
 * Validate `data` against `schema`. On success returns the parsed value; on
 * failure emits an `error` event to the socket and returns null so the caller
 * can bail out without throwing.
 */
function validatePayload<T>(
  socket: Socket,
  schema: z.ZodType<T>,
  data: unknown
): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    socket.emit('error', { message: 'Invalid request payload' });
    return null;
  }
  return result.data;
}

export function setupMultiplayerHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    /**
     * Create a new multiplayer room
     */
    socket.on('create-room', (data: unknown) => {
      try {
        const parsed = validatePayload(socket, createRoomSchema, data);
        if (!parsed) return;
        const { playerName, length, gameMode, hardMode = false, secret } = parsed;

        const { roomId, roomCode, secret: roomSecret } = MultiplayerService.createRoom(
          playerName,
          socket.id,
          length,
          gameMode,
          hardMode,
          secret
        );

        // Join the socket room
        socket.join(roomId);

        const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
        const shareableLink = `${frontendUrl}?mode=multiplayer&code=${roomCode}`;

        const response: CreateMultiplayerRoomResponse = {
          roomId,
          roomCode,
          shareableLink,
          playerId: socket.id,
        };

        socket.emit('room-created', response);

        console.log(`[Socket] Room created by ${playerName}: ${roomCode}`);
      } catch (error: any) {
        console.error('[Socket] Error creating room:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Join an existing room
     */
    socket.on('join-room', (data: unknown) => {
      try {
        const parsed = validatePayload(socket, joinRoomSchema, data);
        if (!parsed) return;
        const { roomCode, playerName } = parsed;

        const room = MultiplayerService.joinRoom(roomCode, playerName, socket.id);

        // Join the socket room
        socket.join(room.roomId);

        const response: JoinMultiplayerRoomResponse = {
          roomId: room.roomId,
          roomState: MultiplayerService.getSanitizedRoomState(room, socket.id),
          playerId: socket.id,
        };

        // Notify the joining player
        socket.emit('room-joined', response);

        // Notify the other player
        const joiningPlayer = room.players.find(p => p?.id === socket.id);
        if (joiningPlayer) {
          socket.to(room.roomId).emit('player-joined', {
            player: joiningPlayer,
          });
        }

        console.log(`[Socket] ${playerName} joined room ${roomCode}`);
      } catch (error: any) {
        console.error('[Socket] Error joining room:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Player ready
     */
    socket.on('player-ready', (data: unknown) => {
      try {
        const parsed = validatePayload(socket, roomIdSchema, data);
        if (!parsed) return;
        const { roomId } = parsed;

        const room = MultiplayerService.setPlayerReady(socket.id);

        if (room) {
          const player = room.players.find(p => p?.id === socket.id);

          if (player) {
            // Notify all players about ready status change
            io.to(roomId).emit('player-ready-updated', {
              playerId: socket.id,
              playerName: player.name,
              isReady: true,
            });
          }

          // Start countdown if both players are ready
          if (room.status === 'in-progress') {
            // Emit countdown-started event
            io.to(roomId).emit('countdown-started', {
              countdown: 3,
            });

            console.log(`[Socket] Countdown started in room ${room.roomCode}`);

            // Start game after 3 seconds
            setTimeout(() => {
              const updatedRoom = MultiplayerService.getRoom(roomId);
              if (updatedRoom && updatedRoom.status === 'in-progress') {
                // Emit sanitized state to each player
                updatedRoom.players.forEach((player) => {
                  if (player && player.isConnected) {
                    const sanitizedState = MultiplayerService.getSanitizedRoomState(updatedRoom, player.id);
                    io.to(player.id).emit('game-started', {
                      roomState: sanitizedState,
                    });
                  }
                });
                console.log(`[Socket] Game started in room ${room.roomCode}`);
              }
            }, 3000);
          }

          console.log(`[Socket] Player ${socket.id} ready in room ${room.roomCode}`);
        }
      } catch (error: any) {
        console.error('[Socket] Error setting player ready:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Player unready
     */
    socket.on('player-unready', (data: unknown) => {
      try {
        const parsed = validatePayload(socket, roomIdSchema, data);
        if (!parsed) return;
        const { roomId } = parsed;

        const room = MultiplayerService.setPlayerUnready(socket.id);

        if (room) {
          const player = room.players.find(p => p?.id === socket.id);

          if (player) {
            // Notify all players about ready status change
            io.to(roomId).emit('player-ready-updated', {
              playerId: socket.id,
              playerName: player.name,
              isReady: false,
            });
          }

          console.log(`[Socket] Player ${socket.id} unreadied in room ${room.roomCode}`);
        }
      } catch (error: any) {
        console.error('[Socket] Error setting player unready:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Submit a guess
     */
    socket.on('submit-guess', (data: unknown) => {
      try {
        const parsed = validatePayload(socket, submitGuessSchema, data);
        if (!parsed) return;
        const { roomId, word } = parsed;
        const normalizedWord = word.toLowerCase();

        const result = MultiplayerService.submitGuess(socket.id, normalizedWord);

        if (result) {
          const { room, feedback, playerStatus } = result;
          const isCompleted = room.status === 'completed';

          // Notify players about the guess, but do not leak the guesser's
          // letters/feedback to the opponent while the game is still running.
          // The guesser (and everyone once the game is over) gets the full
          // word + feedback; the opponent only gets a non-revealing summary.
          room.players.forEach((p) => {
            if (!p) return;
            const isGuesser = p.id === socket.id;
            const reveal = isGuesser || isCompleted;
            io.to(p.id).emit('guess-submitted', {
              playerId: socket.id,
              guess: reveal ? normalizedWord : '',
              feedback: reveal
                ? feedback
                : MultiplayerService.summarizeFeedbackForClient(feedback),
              playerStatus,
            });
          });

          // If turn-based, notify about turn change
          if (room.gameMode === 'turn-based' && room.status === 'in-progress') {
            io.to(roomId).emit('turn-changed', {
              currentTurn: room.currentTurn!,
            });
          }

          // If game ended, notify all players
          if (room.status === 'completed') {
            io.to(roomId).emit('game-over', {
              winner: room.winner,
              reason: room.winner ? 'Player won' : 'Both players failed',
              secret: room.secret,
            });

            console.log(`[Socket] Game ended in room ${room.roomCode}`);
          }
        }
      } catch (error: any) {
        console.error('[Socket] Error submitting guess:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Leave room
     */
    socket.on('leave-room', (data: unknown) => {
      try {
        const parsed = validatePayload(socket, roomIdSchema, data);
        if (!parsed) return;
        const { roomId } = parsed;

        // Capture the room before the player is removed so we can react to a
        // turn handoff / game completion triggered by the departure.
        const roomBefore = MultiplayerService.getRoomForPlayer(socket.id);

        MultiplayerService.leaveRoom(socket.id);
        socket.leave(roomId);

        // Notify other player
        socket.to(roomId).emit('player-left', {
          playerId: socket.id,
          reason: 'Player left the game',
        });

        // If the departure ended the game or handed off the turn, inform the
        // remaining player so they are not stuck on "Not your turn".
        if (roomBefore) {
          const roomAfter = MultiplayerService.getRoom(roomBefore.roomId);
          if (roomAfter) {
            if (roomAfter.status === 'completed') {
              io.to(roomAfter.roomId).emit('game-over', {
                winner: roomAfter.winner,
                reason: 'Opponent left the game',
                secret: roomAfter.secret,
              });
            } else if (
              roomAfter.gameMode === 'turn-based' &&
              roomAfter.currentTurn
            ) {
              io.to(roomAfter.roomId).emit('turn-changed', {
                currentTurn: roomAfter.currentTurn,
              });
            }
          }
        }

        console.log(`[Socket] Player ${socket.id} left room`);
      } catch (error: any) {
        console.error('[Socket] Error leaving room:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);

      const room = MultiplayerService.getRoomForPlayer(socket.id);

      if (room) {
        MultiplayerService.handleDisconnect(socket.id);

        // Notify other player about disconnection
        socket.to(room.roomId).emit('player-disconnected', {
          playerId: socket.id,
        });

        // Check if game should end due to timeout
        setTimeout(() => {
          const updatedRoom = MultiplayerService.getRoomForPlayer(socket.id);
          if (updatedRoom && updatedRoom.status === 'completed') {
            io.to(updatedRoom.roomId).emit('game-over', {
              winner: updatedRoom.winner,
              reason: 'Opponent disconnected',
              secret: updatedRoom.secret,
            });
          }
        }, 90000); // Check after disconnect timeout
      }
    });
  });

  console.log('[Socket] Multiplayer handlers initialized');
}
