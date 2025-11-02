/**
 * Multiplayer room management service
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MultiplayerRoomState,
  MultiplayerPlayer,
  MultiplayerGameMode,
  WordLength,
  GuessFeedback,
  TileState,
} from '../../shared/types.js';
import { WordService } from './word-service.js';
import { GameEngine } from './game-engine.js';

export class MultiplayerService {
  private static rooms = new Map<string, MultiplayerRoomState>();
  private static roomCodeToId = new Map<string, string>();
  private static playerToRoom = new Map<string, string>(); // Socket ID -> Room ID
  private static disconnectTimers = new Map<string, NodeJS.Timeout>(); // Player ID -> Timeout

  private static readonly DISCONNECT_TIMEOUT = 90000; // 90 seconds

  /**
   * Generate a unique 6-character room code
   */
  private static generateRoomCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars
    let code: string;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
    } while (this.roomCodeToId.has(code));
    return code;
  }

  /**
   * Create a new multiplayer room
   */
  static createRoom(
    playerName: string,
    playerId: string,
    length: WordLength,
    gameMode: MultiplayerGameMode,
    hardMode: boolean = false,
    secret?: string
  ): { roomId: string; roomCode: string; secret: string } {
    const roomId = uuidv4();
    const roomCode = this.generateRoomCode();

    // If no secret provided, choose a random word
    const roomSecret = secret || WordService.getRandomAnswer(length);

    // Validate secret if provided
    if (secret && !WordService.isValidAnswer(secret, length)) {
      throw new Error('Invalid secret word');
    }

    const player: MultiplayerPlayer = {
      id: playerId,
      name: playerName,
      isReady: false,
      guesses: [],
      status: 'in-progress',
      isConnected: true,
    };

    const room: MultiplayerRoomState = {
      roomId,
      roomCode,
      length,
      secret: roomSecret,
      gameMode,
      maxGuesses: 6,
      hardMode,
      players: [player],
      status: 'waiting',
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.roomCodeToId.set(roomCode, roomId);
    this.playerToRoom.set(playerId, roomId);

    console.log(`[Multiplayer] Room created: ${roomCode} (${roomId})`);

    return { roomId, roomCode, secret: roomSecret };
  }

  /**
   * Join an existing room
   */
  static joinRoom(
    roomCode: string,
    playerName: string,
    playerId: string
  ): MultiplayerRoomState {
    const roomId = this.roomCodeToId.get(roomCode);

    if (!roomId) {
      throw new Error('Room not found');
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'waiting') {
      throw new Error('Room is not accepting new players');
    }

    if (room.players.length >= 2) {
      throw new Error('Room is full');
    }

    const player: MultiplayerPlayer = {
      id: playerId,
      name: playerName,
      isReady: false,
      guesses: [],
      status: 'in-progress',
      isConnected: true,
    };

    room.players.push(player);
    this.playerToRoom.set(playerId, roomId);

    console.log(`[Multiplayer] Player ${playerName} joined room ${roomCode}`);

    return room;
  }

  /**
   * Mark player as ready
   */
  static setPlayerReady(playerId: string): MultiplayerRoomState | null {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p?.id === playerId);
    if (!player) return null;

    player.isReady = true;

    // Start game if both players are ready
    if (room.players.length === 2 && room.players.every(p => p?.isReady)) {
      room.status = 'in-progress';
      room.startedAt = Date.now();

      // Set first turn for turn-based mode
      if (room.gameMode === 'turn-based') {
        room.currentTurn = room.players[0].id;
      }

      console.log(`[Multiplayer] Game started in room ${room.roomCode}`);
    }

    return room;
  }

  /**
   * Mark player as unready
   */
  static setPlayerUnready(playerId: string): MultiplayerRoomState | null {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p?.id === playerId);
    if (!player) return null;

    player.isReady = false;

    console.log(`[Multiplayer] Player ${player.name} unreadied in room ${room.roomCode}`);

    return room;
  }

  /**
   * Submit a guess for a player
   */
  static submitGuess(
    playerId: string,
    word: string
  ): {
    room: MultiplayerRoomState;
    feedback: TileState[];
    playerStatus: 'in-progress' | 'won' | 'lost';
  } | null {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p?.id === playerId);
    if (!player) return null;

    // Validate game state
    if (room.status !== 'in-progress') {
      throw new Error('Game is not in progress');
    }

    // Check turn-based mode
    if (room.gameMode === 'turn-based' && room.currentTurn !== playerId) {
      throw new Error('Not your turn');
    }

    // Validate word
    if (!WordService.isValidGuess(word, room.length)) {
      throw new Error('Invalid word');
    }

    // Generate feedback
    const feedback = GameEngine.generateFeedback(word, room.secret);

    // Add guess to player
    const guessFeedback: GuessFeedback = {
      guess: word,
      feedback,
      timestamp: Date.now(),
    };
    player.guesses.push(guessFeedback);

    // Check if player won
    const isCorrect = feedback.every(f => f === 'correct');
    if (isCorrect) {
      player.status = 'won';
      room.status = 'completed';
      room.winner = playerId;
      room.completedAt = Date.now();
      console.log(`[Multiplayer] Player ${player.name} won in room ${room.roomCode}`);
    } else if (player.guesses.length >= room.maxGuesses) {
      player.status = 'lost';

      // Check if both players lost (simultaneous mode) or game should end
      const allPlayersFinished = room.players.every(
        p => p?.status !== 'in-progress'
      );
      if (allPlayersFinished) {
        room.status = 'completed';
        room.completedAt = Date.now();
        console.log(`[Multiplayer] Game ended in room ${room.roomCode} - no winner`);
      }
    }

    // Switch turn for turn-based mode
    if (room.gameMode === 'turn-based' && room.status === 'in-progress') {
      const otherPlayer = room.players.find(p => p?.id !== playerId);
      if (otherPlayer) {
        room.currentTurn = otherPlayer.id;
      }
    }

    return { room, feedback, playerStatus: player.status };
  }

  /**
   * Handle player disconnect
   */
  static handleDisconnect(playerId: string): void {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p?.id === playerId);
    if (!player) return;

    player.isConnected = false;
    player.disconnectedAt = Date.now();

    console.log(`[Multiplayer] Player ${player.name} disconnected from room ${room.roomCode}`);

    // Set disconnect timer
    const timer = setTimeout(() => {
      this.handleDisconnectTimeout(playerId);
    }, this.DISCONNECT_TIMEOUT);

    this.disconnectTimers.set(playerId, timer);
  }

  /**
   * Handle disconnect timeout (90 seconds)
   */
  private static handleDisconnectTimeout(playerId: string): void {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p?.id === playerId);
    if (!player) return;

    // If still disconnected, end the game
    if (!player.isConnected) {
      const otherPlayer = room.players.find(p => p?.id !== playerId);

      if (otherPlayer && room.status === 'in-progress') {
        room.status = 'completed';
        room.winner = otherPlayer.id;
        room.completedAt = Date.now();
        console.log(`[Multiplayer] Game ended in room ${room.roomCode} - ${player.name} timed out`);
      } else if (room.status === 'waiting') {
        // Remove room if game hasn't started
        this.removeRoom(roomId);
      }
    }

    this.disconnectTimers.delete(playerId);
  }

  /**
   * Handle player reconnect
   */
  static handleReconnect(playerId: string): MultiplayerRoomState | null {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p?.id === playerId);
    if (!player) return null;

    // Clear disconnect timer
    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    player.isConnected = true;
    delete player.disconnectedAt;

    console.log(`[Multiplayer] Player ${player.name} reconnected to room ${room.roomCode}`);

    return room;
  }

  /**
   * Leave a room
   */
  static leaveRoom(playerId: string): void {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Remove player from room
    const playerIndex = room.players.findIndex(p => p?.id === playerId);
    if (playerIndex !== -1) {
      const player = room.players[playerIndex];
      if (player) {
        console.log(`[Multiplayer] Player ${player.name} left room ${room.roomCode}`);
      }
      room.players.splice(playerIndex, 1);
    }

    this.playerToRoom.delete(playerId);

    // Clear disconnect timer if exists
    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    // Remove room if empty or game hasn't started
    // Filter out undefined values to get actual player count
    const activePlayers = room.players.filter(p => p !== undefined);
    if (activePlayers.length === 0 || (room.status === 'waiting' && activePlayers.length < 2)) {
      this.removeRoom(roomId);
    }
  }

  /**
   * Remove a room
   */
  private static removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.roomCodeToId.delete(room.roomCode);
    this.rooms.delete(roomId);

    console.log(`[Multiplayer] Room ${room.roomCode} removed`);
  }

  /**
   * Get room by ID
   */
  static getRoom(roomId: string): MultiplayerRoomState | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get room by code
   */
  static getRoomByCode(roomCode: string): MultiplayerRoomState | undefined {
    const roomId = this.roomCodeToId.get(roomCode);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /**
   * Get room for a player
   */
  static getRoomForPlayer(playerId: string): MultiplayerRoomState | undefined {
    const roomId = this.playerToRoom.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /**
   * Get sanitized room state (hide secret from clients during game)
   */
  static getSanitizedRoomState(room: MultiplayerRoomState, playerId: string): any {
    const sanitized = { ...room };

    // Only reveal secret if game is completed
    if (room.status !== 'completed') {
      sanitized.secret = '';
    }

    return sanitized;
  }
}
