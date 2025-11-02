/**
 * Socket.io client service for multiplayer functionality
 */

import { io, Socket } from 'socket.io-client';
import {
  CreateMultiplayerRoomRequest,
  CreateMultiplayerRoomResponse,
  JoinMultiplayerRoomRequest,
  JoinMultiplayerRoomResponse,
  MultiplayerRoomState,
  MultiplayerPlayer,
  TileState,
} from '../../../shared/types';

type SocketEventCallback<T = any> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, SocketEventCallback[]> = new Map();

  /**
   * Initialize socket connection
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupDefaultListeners();

    console.log('[Socket] Connecting to', backendUrl);
  }

  /**
   * Disconnect from socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
      console.log('[Socket] Disconnected');
    }
  }

  /**
   * Setup default socket event listeners
   */
  private setupDefaultListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Socket] Connected with ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

    this.socket.on('error', (data: { message: string }) => {
      console.error('[Socket] Server error:', data.message);
      this.emit('socket-error', data.message);
    });
  }

  /**
   * Register an event handler
   */
  on<T = any>(event: string, callback: SocketEventCallback<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);

    // Register with socket
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Unregister an event handler
   */
  off(event: string, callback?: SocketEventCallback): void {
    if (callback) {
      const handlers = this.eventHandlers.get(event) || [];
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }

      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      // Remove all handlers for this event
      this.eventHandlers.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  /**
   * Emit an event (internal use for error handling)
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  /**
   * Create a new multiplayer room
   */
  createRoom(data: CreateMultiplayerRoomRequest): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('create-room', data);
  }

  /**
   * Join an existing room
   */
  joinRoom(data: JoinMultiplayerRoomRequest): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('join-room', data);
  }

  /**
   * Mark player as ready
   */
  playerReady(roomId: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('player-ready', { roomId });
  }

  /**
   * Mark player as unready
   */
  playerUnready(roomId: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('player-unready', { roomId });
  }

  /**
   * Submit a guess
   */
  submitGuess(roomId: string, word: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('submit-guess', { roomId, word });
  }

  /**
   * Leave room
   */
  leaveRoom(roomId: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('leave-room', { roomId });
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const socketService = new SocketService();

// Export types for event data
export type {
  CreateMultiplayerRoomResponse,
  JoinMultiplayerRoomResponse,
  MultiplayerRoomState,
  MultiplayerPlayer,
};

export interface GuessSubmittedData {
  playerId: string;
  guess: string;
  feedback: TileState[];
  playerStatus: 'in-progress' | 'won' | 'lost';
}

export interface GameOverData {
  winner?: string;
  reason: string;
  secret: string;
}

export interface PlayerJoinedData {
  player: MultiplayerPlayer;
}

export interface PlayerLeftData {
  playerId: string;
  reason: string;
}

export interface TurnChangedData {
  currentTurn: string;
}
