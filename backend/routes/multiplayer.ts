/**
 * Multiplayer socket event handlers
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { MultiplayerService } from '../services/multiplayer-service.js';
import {
  CreateMultiplayerRoomRequest,
  JoinMultiplayerRoomRequest,
  CreateMultiplayerRoomResponse,
  JoinMultiplayerRoomResponse,
} from '../../shared/types.js';

export function setupMultiplayerHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    /**
     * Create a new multiplayer room
     */
    socket.on('create-room', (data: CreateMultiplayerRoomRequest) => {
      try {
        const { playerName, length, gameMode, hardMode = false, secret } = data;

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
    socket.on('join-room', (data: JoinMultiplayerRoomRequest) => {
      try {
        const { roomCode, playerName } = data;

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
    socket.on('player-ready', (data: { roomId: string }) => {
      try {
        const { roomId } = data;

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
    socket.on('player-unready', (data: { roomId: string }) => {
      try {
        const { roomId } = data;

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
    socket.on('submit-guess', (data: { roomId: string; word: string }) => {
      try {
        const { roomId, word } = data;

        const result = MultiplayerService.submitGuess(socket.id, word.toLowerCase());

        if (result) {
          const { room, feedback, playerStatus } = result;

          // Notify all players about the guess
          io.to(roomId).emit('guess-submitted', {
            playerId: socket.id,
            guess: word.toLowerCase(),
            feedback,
            playerStatus,
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
    socket.on('leave-room', (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        MultiplayerService.leaveRoom(socket.id);
        socket.leave(roomId);

        // Notify other player
        socket.to(roomId).emit('player-left', {
          playerId: socket.id,
          reason: 'Player left the game',
        });

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
