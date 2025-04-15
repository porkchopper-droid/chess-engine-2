/**
 * @fileoverview Network adapter for chess P2P gameplay using Socket.io
 *
 * Manages the Socket.io connection and game state synchronization
 */

// Socket.io client instance
let socket;
let gameId = null;
let playerColor = null;
let isConnected = false;
let callbacks = {};

/**
 * Initialize the Socket.io connection
 * @returns {Promise} Promise that resolves when connection is established
 */
export function initializeConnection() {
  return new Promise((resolve, reject) => {
    try {
      // Create Socket.io connection (make sure the Socket.io client is properly loaded)
      if (typeof io === 'undefined') {
        console.error('Socket.io not loaded');
        reject(new Error('Socket.io not loaded'));
        return;
      }
      
      socket = io("https://chess-engine-2-ad2b.onrender.com");
      console.log('Attempting to connect...');
      
      // Handle connection
      socket.on('connected', (socketId) => {
        console.log('Connected to server with ID:', socketId);
        isConnected = true;
        
        if (callbacks.onConnectionStatusChange) {
          callbacks.onConnectionStatusChange(true);
        }
        
        resolve(socketId);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        isConnected = false;
        
        if (callbacks.onConnectionStatusChange) {
          callbacks.onConnectionStatusChange(false);
        }
      });
      
      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket error:', error);
        if (callbacks.onError) {
          callbacks.onError(error);
        }
      });
      
      // Game created event
      socket.on('game-created', (data) => {
        console.log('Game created:', data);
        gameId = data.gameId;
        playerColor = data.playerColor;
        
        if (callbacks.onGameCreated) {
          callbacks.onGameCreated(data);
        }
      });
      
      // Game joined event
      socket.on('game-joined', (data) => {
        console.log('Game joined:', data);
        gameId = data.gameId;
        playerColor = data.playerColor;
        
        if (callbacks.onGameJoined) {
          callbacks.onGameJoined(data);
        }
      });
      
      // Opponent joined event
      socket.on('opponent-joined', (data) => {
        console.log('Opponent joined:', data);
        
        if (callbacks.onOpponentJoined) {
          callbacks.onOpponentJoined(data);
        }
      });
      
      // Opponent move event - this is the key part that needs to be fixed
      socket.on('opponent-move', (data) => {
        console.log('Opponent move received:', data);
        
        // Make sure the data is properly formatted
        if (!data.from || !data.to) {
          console.error('Invalid move data received:', data);
          return;
        }
        
        if (callbacks.onOpponentMove) {
          callbacks.onOpponentMove(data);
        }
      });
      
      // Opponent disconnected event
      socket.on('opponent-disconnected', () => {
        console.log('Opponent disconnected');
        
        if (callbacks.onOpponentDisconnected) {
          callbacks.onOpponentDisconnected();
        }
      });
      
      // Game restart event
      socket.on('game-restart', () => {
        console.log('Game restarted');
        
        if (callbacks.onGameRestart) {
          callbacks.onGameRestart();
        }
      });
      
    } catch (error) {
      console.error('Failed to initialize connection:', error);
      reject(error);
    }
  });
}

/**
 * Create a new game
 */
export function createGame() {
  if (!isConnected) {
    console.error('Not connected to server');
    return;
  }
  
  socket.emit('create-game');
}

/**
 * Join an existing game
 * @param {string} id - Game ID to join
 */
export function joinGame(id) {
  if (!isConnected) {
    console.error('Not connected to server');
    return;
  }
  
  socket.emit('join-game', id);
}

/**
 * Send a move to the opponent
 * @param {Object} from - Source position
 * @param {Object} to - Target position
 * @param {string} [promotion] - Piece to promote to (if applicable)
 */
export function sendMove(from, to, promotion = null) {
  if (!isConnected || !gameId) {
    console.error('Not connected to a game');
    return;
  }
  
  // Ensure we're sending string positions (algebraic notation)
  const fromStr = from.toAlgebraic ? from.toAlgebraic() : from;
  const toStr = to.toAlgebraic ? to.toAlgebraic() : to;
  
  console.log(`Sending move: ${fromStr} to ${toStr}`);
  
  socket.emit('move', {
    gameId,
    from: fromStr,
    to: toStr,
    promotion
  });
}

/**
 * Request game restart
 */
export function restartGame() {
  if (!isConnected || !gameId) {
    console.error('Not connected to a game');
    return;
  }
  
  socket.emit('restart-game', gameId);
}

/**
 * Get the current game ID
 * @returns {string|null} Current game ID or null
 */
export function getGameId() {
  return gameId;
}

/**
 * Get the player's color
 * @returns {string|null} Player color ('white' or 'black') or null
 */
export function getPlayerColor() {
  return playerColor;
}

/**
 * Check if connected to server
 * @returns {boolean} True if connected
 */
export function isSocketConnected() {
  return isConnected;
}

/**
 * Register event callbacks
 * @param {Object} newCallbacks - Object with callback functions
 */
export function registerCallbacks(newCallbacks) {
  callbacks = { ...callbacks, ...newCallbacks };
}

/**
 * Disconnect from the server
 */
export function disconnect() {
  if (socket) {
    socket.disconnect();
  }
}