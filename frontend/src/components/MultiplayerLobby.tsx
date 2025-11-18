import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WordLength, MultiplayerGameMode } from '@shared/types';
import {
  socketService,
  CreateMultiplayerRoomResponse,
  JoinMultiplayerRoomResponse,
  PlayerJoinedData,
} from '../services/socketService';
import './MultiplayerLobby.css';

interface MultiplayerLobbyProps {
  onGameStart: (
    roomId: string,
    playerId: string,
    isHost: boolean,
    roomState: any
  ) => void;
  onBack: () => void;
}

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  onGameStart,
  onBack,
}) => {
  const [view, setView] = useState<'choice' | 'create' | 'join' | 'waiting'>('choice');
  const [playerName, setPlayerName] = useState('');
  const [length, setLength] = useState<WordLength>(5);
  const [gameMode, setGameMode] = useState<MultiplayerGameMode>('simultaneous');
  const [roomCode, setRoomCode] = useState('');
  const [shareableLink, setShareableLink] = useState('');
  const [currentRoomCode, setCurrentRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [opponentReady, setOpponentReady] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isProcessingReady, setIsProcessingReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Use refs to access latest values in callbacks
  const roomIdRef = useRef(roomId);
  const playerIdRef = useRef(playerId);
  const isHostRef = useRef(isHost);

  useEffect(() => {
    roomIdRef.current = roomId;
    playerIdRef.current = playerId;
    isHostRef.current = isHost;
  }, [roomId, playerId, isHost]);

  useEffect(() => {
    // Connect to socket when component mounts
    socketService.connect();

    // Setup event listeners
    socketService.on<CreateMultiplayerRoomResponse>('room-created', handleRoomCreated);
    socketService.on<JoinMultiplayerRoomResponse>('room-joined', handleRoomJoined);
    socketService.on<PlayerJoinedData>('player-joined', handlePlayerJoined);
    socketService.on<{ playerId: string; playerName: string; isReady: boolean }>('player-ready-updated', handlePlayerReadyUpdated);
    socketService.on<{ countdown: number }>('countdown-started', handleCountdownStarted);
    socketService.on<{ roomState: any }>('game-started', handleGameStarted);
    socketService.on<{ message: string }>('socket-error', handleSocketError);

    return () => {
      // Cleanup listeners
      socketService.off('room-created');
      socketService.off('room-joined');
      socketService.off('player-joined');
      socketService.off('player-ready-updated');
      socketService.off('countdown-started');
      socketService.off('game-started');
      socketService.off('socket-error');
    };
  }, []);

  // Check URL parameters for room code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && view === 'choice') {
      setRoomCode(code.toUpperCase());
      setView('join');
    }
  }, []);

  // Handle countdown timer
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleRoomCreated = useCallback((data: CreateMultiplayerRoomResponse) => {
    console.log('Room created:', data);
    setShareableLink(data.shareableLink);
    setCurrentRoomCode(data.roomCode);
    setRoomId(data.roomId);
    setPlayerId(data.playerId);
    setIsHost(true);
    setView('waiting');
  }, []);

  const handleRoomJoined = useCallback((data: JoinMultiplayerRoomResponse) => {
    console.log('Room joined:', data);
    setRoomId(data.roomId);
    setPlayerId(data.playerId);
    setIsHost(false);
    setCurrentRoomCode(data.roomState.roomCode);

    // Get the host player (first player in the array)
    const hostPlayer = data.roomState.players[0];
    if (hostPlayer) {
      setOpponentJoined(true);
      setOpponentName(hostPlayer.name);
      setOpponentReady(hostPlayer.isReady || false);
    }

    setView('waiting');
  }, []);

  const handlePlayerJoined = useCallback((data: PlayerJoinedData) => {
    console.log('Player joined:', data);
    setOpponentJoined(true);
    setOpponentName(data.player.name);
    setOpponentReady(false);
  }, []);

  const handlePlayerReadyUpdated = useCallback((data: { playerId: string; playerName: string; isReady: boolean }) => {
    console.log('Player ready updated:', data);

    setPlayerId((currentPlayerId) => {
      // Update own ready status or opponent ready status
      if (data.playerId === currentPlayerId) {
        setIsReady(data.isReady);
        setIsProcessingReady(false); // Re-enable button
      } else {
        setOpponentReady(data.isReady);
        if (data.playerName) {
          setOpponentName(data.playerName);
        }
      }
      return currentPlayerId;
    });
  }, []);

  const handleCountdownStarted = useCallback((data: { countdown: number }) => {
    console.log('Countdown started:', data);
    setCountdown(data.countdown);
  }, []);

  const handleGameStarted = useCallback((data: { roomState: any }) => {
    console.log('=== GAME STARTED EVENT ===');
    console.log('Received data:', data);
    console.log('Room ID from ref:', roomIdRef.current);
    console.log('Player ID from ref:', playerIdRef.current);
    console.log('Is Host from ref:', isHostRef.current);
    console.log('Room State:', data.roomState);

    if (!data.roomState) {
      console.error('ERROR: roomState is null or undefined!');
      return;
    }

    if (!roomIdRef.current || !playerIdRef.current) {
      console.error('ERROR: Missing roomId or playerId!');
      return;
    }

    console.log('Calling onGameStart...');
    onGameStart(roomIdRef.current, playerIdRef.current, isHostRef.current, data.roomState);
    console.log('onGameStart called successfully');
  }, [onGameStart]);

  const handleSocketError = useCallback((data: { message: string }) => {
    setError(data.message || 'An error occurred');
  }, []);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setError('');

    try {
      socketService.createRoom({
        playerName: playerName.trim(),
        length,
        gameMode,
        hardMode: false,
        // Always use random word - no custom word input
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setError('');

    try {
      socketService.joinRoom({
        roomCode: roomCode.toUpperCase(),
        playerName: playerName.trim(),
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReady = () => {
    if (isProcessingReady) return; // Prevent double-clicks
    setIsProcessingReady(true);
    socketService.playerReady(roomId);
  };

  const handleUnready = () => {
    if (isProcessingReady) return; // Prevent double-clicks
    setIsProcessingReady(true);
    socketService.playerUnready(roomId);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableLink);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(currentRoomCode);
  };

  if (view === 'choice') {
    return (
      <div className="multiplayer-lobby">
        <div className="lobby-header">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
          <h2>Challenge Human</h2>
        </div>

        <div className="choice-buttons">
          <button className="choice-button" onClick={() => setView('create')}>
            <div className="choice-icon">+</div>
            <h3>Create Room</h3>
            <p>Set up a game and invite a friend</p>
          </button>

          <button className="choice-button" onClick={() => setView('join')}>
            <div className="choice-icon">→</div>
            <h3>Join Room</h3>
            <p>Enter a room code to join</p>
          </button>
        </div>

        <div className="game-modes-info">
          <h3>How It Works</h3>
          <ul>
            <li><strong>Create a room</strong> and share the code with your opponent</li>
            <li><strong>Join a room</strong> using the code your opponent shared</li>
            <li><strong>Choose game mode:</strong> Turn-based or Simultaneous</li>
            <li><strong>First to guess wins!</strong></li>
          </ul>
        </div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="multiplayer-lobby">
        <div className="lobby-header">
          <button className="back-button" onClick={() => setView('choice')}>
            ← Back
          </button>
          <h2>Create Room</h2>
        </div>

        <div className="setup-section">
          <label>Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>

        <div className="setup-section">
          <label>Word Length</label>
          <div className="length-buttons">
            {[3, 4, 5, 6, 7].map((len) => (
              <button
                key={len}
                className={length === len ? 'active' : ''}
                onClick={() => setLength(len as WordLength)}
              >
                {len}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-section">
          <label>Game Mode</label>
          <div className="mode-buttons">
            <button
              className={gameMode === 'simultaneous' ? 'active' : ''}
              onClick={() => setGameMode('simultaneous')}
            >
              Simultaneous
            </button>
            <button
              className={gameMode === 'turn-based' ? 'active' : ''}
              onClick={() => setGameMode('turn-based')}
            >
              Turn-based
            </button>
          </div>
          <p className="mode-description">
            {gameMode === 'simultaneous'
              ? 'Both players guess at the same time. First to solve wins!'
              : 'Players take turns guessing. First to solve wins!'}
          </p>
        </div>

        <div className="setup-section info-box">
          <p className="info-text">
            A random {length}-letter word will be chosen for the game
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          className="start-button"
          onClick={handleCreateRoom}
          disabled={!playerName.trim()}
        >
          Create Room
        </button>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="multiplayer-lobby">
        <div className="lobby-header">
          <button className="back-button" onClick={() => setView('choice')}>
            ← Back
          </button>
          <h2>Join Room</h2>
        </div>

        <div className="setup-section">
          <label>Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>

        <div className="setup-section">
          <label>Room Code</label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-character code"
            maxLength={6}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          className="start-button"
          onClick={handleJoinRoom}
          disabled={!playerName.trim() || roomCode.length !== 6}
        >
          Join Room
        </button>
      </div>
    );
  }

  if (view === 'waiting') {
    return (
      <div className="multiplayer-lobby">
        <div className="lobby-header">
          <button
            className="back-button"
            onClick={() => {
              socketService.leaveRoom(roomId);
              setView('choice');
            }}
          >
            ← Leave
          </button>
          <h2>Waiting Room</h2>
        </div>

        <div className="waiting-room">
          <div className="room-code-display">
            <h3>Room Code</h3>
            <div className="code-box">
              <span className="code">{currentRoomCode}</span>
              <button className="copy-button" onClick={copyRoomCode}>
                Copy
              </button>
            </div>
          </div>

          {isHost && shareableLink && (
            <div className="share-link">
              <h3>Share Link</h3>
              <div className="link-box">
                <input
                  type="text"
                  value={shareableLink}
                  readOnly
                  onClick={(e) => e.currentTarget.select()}
                />
                <button className="copy-button" onClick={copyToClipboard}>
                  Copy Link
                </button>
              </div>
            </div>
          )}

          <div className="player-status">
            <h3>Players</h3>
            <div className="players-list">
              <div className="player-item">
                <span className="player-name">{playerName} (You)</span>
                <span className={`status ${isReady ? 'ready' : 'not-ready'}`}>
                  {isReady ? '✓ Ready' : 'Not ready'}
                </span>
              </div>
              {opponentJoined ? (
                <div className="player-item">
                  <span className="player-name">{opponentName}</span>
                  <span className={`status ${opponentReady ? 'ready' : 'not-ready'}`}>
                    {opponentReady ? '✓ Ready' : 'Not ready'}
                  </span>
                </div>
              ) : (
                <div className="player-item">
                  <span className="player-name">Waiting for opponent...</span>
                </div>
              )}
            </div>
          </div>

          {opponentJoined && (
            <>
              {!isReady ? (
                <button
                  className="start-button"
                  onClick={handleReady}
                  disabled={isProcessingReady}
                >
                  {isProcessingReady ? 'Processing...' : 'Ready to Start'}
                </button>
              ) : (
                <button
                  className="start-button"
                  onClick={handleUnready}
                  disabled={isProcessingReady}
                >
                  {isProcessingReady ? 'Processing...' : 'Unready'}
                </button>
              )}
            </>
          )}

          {isReady && !opponentReady && opponentJoined && !countdown && (
            <div className="waiting-message">
              Waiting for {opponentName} to be ready...
            </div>
          )}

          {countdown !== null && countdown > 0 && (
            <div className="countdown-overlay">
              <div className="countdown-number">{countdown}</div>
              <div className="countdown-text">Get ready!</div>
            </div>
          )}

          {isReady && opponentReady && countdown === null && (
            <div className="waiting-message">
              Both players ready! Starting game...
            </div>
          )}

          {!opponentJoined && isHost && (
            <div className="waiting-message">
              Share the room code or link with your opponent to start!
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default MultiplayerLobby;
