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

    // Player must still be playing (cannot submit after won/lost)
    if (player.status !== 'in-progress') {
      throw new Error('You have already finished');
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

    // Advance the turn for turn-based mode, skipping finished/disconnected
    // players so the game cannot deadlock on the player who just moved.
    if (room.gameMode === 'turn-based' && room.status === 'in-progress') {
      this.advanceTurn(room, playerId);
    }

    return { room, feedback, playerStatus: player.status };
  }

  /**
   * Pick the next player who is still active (in-progress and connected) and
   * assign them the turn. Falls back to in-progress-but-disconnected players if
   * no connected player is available, so a temporary disconnect does not stall
   * the game. If no player can take a turn, the room is completed.
   *
   * @param afterPlayerId - the player who just acted (or is leaving); the search
   *   for the next turn starts after this player so turns rotate fairly.
   */
  private static advanceTurn(
    room: MultiplayerRoomState,
    afterPlayerId?: string
  ): void {
    if (room.gameMode !== 'turn-based') return;

    const players = room.players.filter(
      (p): p is MultiplayerPlayer => p !== undefined
    );

    const isActive = (p: MultiplayerPlayer) =>
      p.status === 'in-progress' && p.isConnected;
    const isPlayable = (p: MultiplayerPlayer) => p.status === 'in-progress';

    // Rotate the search order so it begins after the player who just acted.
    let ordered = players;
    if (afterPlayerId) {
      const idx = players.findIndex(p => p.id === afterPlayerId);
      if (idx !== -1) {
        ordered = [...players.slice(idx + 1), ...players.slice(0, idx + 1)];
      }
    }

    // Prefer a connected, in-progress player; otherwise allow a disconnected
    // one (they may reconnect within the timeout window).
    const next = ordered.find(isActive) || ordered.find(isPlayable);

    if (next) {
      room.currentTurn = next.id;
      return;
    }

    // No player can move -> the game is over.
    room.status = 'completed';
    room.completedAt = room.completedAt ?? Date.now();
    // Winner, if any, is the lone player who already won; otherwise leave unset.
    const winner = players.find(p => p.status === 'won');
    if (winner) room.winner = winner.id;
    console.log(`[Multiplayer] Game completed in room ${room.roomCode} - no active players to take a turn`);
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
      } else if (room.status === 'in-progress') {
        // No other player remains; make sure the turn does not stay pinned to
        // the timed-out player.
        this.advanceTurn(room, playerId);
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
      return;
    }

    // The leaver may have held the turn (turn-based). Reassign it to a remaining
    // player or complete the game so the survivor is never stuck on "Not your
    // turn". If a single player remains in an in-progress game, award them the win.
    if (room.status === 'in-progress') {
      const remaining = room.players.filter(
        (p): p is MultiplayerPlayer => p !== undefined
      );
      if (remaining.length === 1 && remaining[0].status === 'in-progress') {
        room.status = 'completed';
        room.winner = remaining[0].id;
        room.completedAt = Date.now();
        console.log(`[Multiplayer] Game ended in room ${room.roomCode} - opponent left`);
      } else if (room.gameMode === 'turn-based' && room.currentTurn === playerId) {
        this.advanceTurn(room, playerId);
      }
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
   * Build a per-player sanitized view of the room state.
   *
   * Sanitization scheme:
   *  - The secret is only included once the room is `completed`; otherwise blank.
   *  - The requesting player (`playerId`) receives their OWN full guess history
   *    (guesses + per-tile feedback).
   *  - Opponent players are reduced to non-revealing progress only: the number
   *    of guesses made plus a per-row colour-count summary (how many correct /
   *    present / absent tiles each row had). This conveys "how well they're
   *    doing" for UI/progress purposes WITHOUT leaking the guessed letters or
   *    which positions are correct, so the answer cannot be deduced.
   *  - Once the room is `completed`, full histories are revealed for everyone so
   *    the end-game recap shows both boards.
   *
   * The whole structure is deep-copied so the stored room is never mutated and
   * no nested arrays/objects are shared by reference with the client payload.
   */
  static getSanitizedRoomState(
    room: MultiplayerRoomState,
    playerId: string
  ): MultiplayerRoomState {
    const isCompleted = room.status === 'completed';

    const sanitizePlayer = (
      player: MultiplayerPlayer
    ): MultiplayerPlayer => {
      const isSelf = player.id === playerId;
      const revealFull = isSelf || isCompleted;

      const guesses: GuessFeedback[] = revealFull
        ? player.guesses.map(g => ({
            guess: g.guess,
            feedback: [...g.feedback],
            timestamp: g.timestamp,
          }))
        : // Opponent in an active game: hide letters & exact feedback, keep
          // only a non-revealing per-row colour-count summary.
          player.guesses.map(g => ({
            guess: '',
            feedback: this.summarizeFeedback(g.feedback),
            timestamp: g.timestamp,
          }));

      return {
        id: player.id,
        name: player.name,
        isReady: player.isReady,
        guesses,
        status: player.status,
        isConnected: player.isConnected,
        ...(player.disconnectedAt !== undefined
          ? { disconnectedAt: player.disconnectedAt }
          : {}),
      };
    };

    const players = room.players.map(p =>
      p ? sanitizePlayer(p) : undefined
    ) as [MultiplayerPlayer, MultiplayerPlayer?];

    const sanitized: MultiplayerRoomState = {
      roomId: room.roomId,
      roomCode: room.roomCode,
      length: room.length,
      secret: isCompleted ? room.secret : '',
      gameMode: room.gameMode,
      maxGuesses: room.maxGuesses,
      hardMode: room.hardMode,
      players,
      status: room.status,
      createdAt: room.createdAt,
      ...(room.currentTurn !== undefined ? { currentTurn: room.currentTurn } : {}),
      ...(room.winner !== undefined ? { winner: room.winner } : {}),
      ...(room.startedAt !== undefined ? { startedAt: room.startedAt } : {}),
      ...(room.completedAt !== undefined ? { completedAt: room.completedAt } : {}),
    };

    return sanitized;
  }

  /**
   * Reduce a row of tile feedback to a non-revealing colour-count summary.
   * Produces an array of the same length, but with all positional information
   * stripped: it is filled with `correct` tiles, then `present`, then `absent`,
   * so the opponent only learns HOW MANY of each colour the row scored — never
   * which letters or positions. (`empty` tiles, if any, are preserved at the end.)
   */
  static summarizeFeedbackForClient(feedback: TileState[]): TileState[] {
    return this.summarizeFeedback(feedback);
  }

  private static summarizeFeedback(feedback: TileState[]): TileState[] {
    let correct = 0;
    let present = 0;
    let absent = 0;
    let empty = 0;
    for (const f of feedback) {
      if (f === 'correct') correct++;
      else if (f === 'present') present++;
      else if (f === 'absent') absent++;
      else empty++;
    }
    return [
      ...Array<TileState>(correct).fill('correct'),
      ...Array<TileState>(present).fill('present'),
      ...Array<TileState>(absent).fill('absent'),
      ...Array<TileState>(empty).fill('empty'),
    ];
  }
}
