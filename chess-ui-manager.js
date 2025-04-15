/**
 * @fileoverview Chess UI Manager - integrates the chess UI with network functionality
 *
 * Bridges between the chess-ui.js and chess-network.js, handling the integration
 * of online gameplay with the existing chess UI
 */

import * as ChessUI from './chess-ui.js';
import * as Network from './chess-network.js';
import { Position } from './position.js';
import { setMoveHandler, updateBoard } from './chess-ui.js';

// Online game state
let isOnlineGame = false;
let canMakeMove = false;

/**
 * Initialize the UI manager
 */
export function init() {
  setupNetworkCallbacks();
  setMoveHandler(wrappedMakeMove);
  setupNetworkControls();
  updateNetworkStatus();
  
  function wrappedMakeMove(from, to, promotion = null) {
    const result = ChessUI.makeMove(from, to, promotion);
    if (result.success && isOnlineGame) {
      Network.sendMove(from, to, promotion);
      canMakeMove = false;
      updateNetworkStatus();
    }
    return result;
  }
  
  // Export additional functions to be called from chess-ui
  ChessUI.canPlayerMove = () => {
    if (!isOnlineGame) return true;
    return canMakeMove;
  };
  
  ChessUI.isOnline = () => isOnlineGame;
}

/**
 * Set up network callbacks
 */
function setupNetworkCallbacks() {
  Network.registerCallbacks({
    onConnectionStatusChange: (connected) => {
      updateNetworkStatus();
    },
    
    onGameCreated: (data) => {
      isOnlineGame = true;
      canMakeMove = true; // White goes first
      ChessUI.resetGame();
      updateNetworkStatus();
    },
    
    onGameJoined: (data) => {
      isOnlineGame = true;
      canMakeMove = false; // Black waits for white to move first
      ChessUI.resetGame();
      
      // Auto-flip board for black player
      if (data.playerColor === 'black') {
        ChessUI.flipBoard(true);
      }
      
      updateNetworkStatus();
    },
    
    onOpponentJoined: (data) => {
      updateNetworkStatus();
    },
    
    onOpponentMove: (data) => {
      handleOpponentMove(data);
    },
    
    onOpponentDisconnected: () => {
      alert("Your opponent has disconnected.");
      updateNetworkStatus();
    },
    
    onGameRestart: () => {
      ChessUI.resetGame();
      const playerColor = Network.getPlayerColor();
      canMakeMove = playerColor === 'white';
      updateNetworkStatus();
    },
    
    onError: (error) => {
      alert("Error: " + error.message);
    }
  });
}

/**
 * Handle opponent's move
 */
function handleOpponentMove(data) {
  const from = typeof data.from === 'string' ? Position.fromAlgebraic(data.from) : data.from;
  const to = typeof data.to === 'string' ? Position.fromAlgebraic(data.to) : data.to;
  
  // Make the move in the local game
  const result = ChessUI.makeOpponentMove(from, to, data.promotion);
  
  if (result.success) {
    console.log("Opponent's move:", result.move.notation);
    canMakeMove = true;
    updateNetworkStatus();
    updateBoard();
  } else {
    console.error("Failed to apply opponent's move:", result.error);
  }
}

/**
 * Set up network control buttons
 */
function setupNetworkControls() {
  // Connect button
  const connectBtn = document.getElementById("connect-btn");
  if (connectBtn) {
    connectBtn.addEventListener("click", async () => {
      try {
        await Network.initializeConnection();
        updateNetworkStatus();
      } catch (error) {
        console.error("Connection error:", error);
        alert("Failed to connect to server: " + error.message);
      }
    });
  }

  // Create game button
  const createGameBtn = document.getElementById("create-game-btn");
  if (createGameBtn) {
    createGameBtn.addEventListener("click", () => {
      if (!Network.isSocketConnected()) {
        alert("Please connect to the server first.");
        return;
      }
      
      Network.createGame();
    });
  }

  // Join game button
  const joinGameBtn = document.getElementById("join-game-btn");
  const gameIdInput = document.getElementById("game-id-input");
  if (joinGameBtn && gameIdInput) {
    joinGameBtn.addEventListener("click", () => {
      if (!Network.isSocketConnected()) {
        alert("Please connect to the server first.");
        return;
      }
      
      const gameId = gameIdInput.value.trim();
      if (!gameId) {
        alert("Please enter a Game ID.");
        return;
      }
      
      Network.joinGame(gameId);
    });
  }

  // Override the New Game button to handle online games
  const newGameBtn = document.getElementById("new-game-btn");
  if (newGameBtn) {
    newGameBtn.addEventListener("click", () => {
      if (isOnlineGame) {
        // For online games, request a restart
        Network.restartGame();
      } else {
        // For local games, just reset through the UI
        ChessUI.resetGame();
      }
    });
  }
}

/**
 * Update network status display
 */
export function updateNetworkStatus() {
  const connectionStatus = document.getElementById("connection-status");
  const gameIdElement = document.getElementById("game-id");
  const playerColorElement = document.getElementById("player-color");
  const gameStatusElement = document.getElementById("game-status");
  const statusElement = document.getElementById("status");

  if (connectionStatus) {
    connectionStatus.textContent = Network.isSocketConnected() ? "Connected" : "Disconnected";
  }

  if (gameIdElement) {
    gameIdElement.textContent = Network.getGameId() || "-";
  }

  if (playerColorElement) {
    playerColorElement.textContent = Network.getPlayerColor() || "-";
  }

  if (gameStatusElement) {
    if (!isOnlineGame) {
      gameStatusElement.textContent = "Not connected";
    } else if (!Network.isSocketConnected()) {
      gameStatusElement.textContent = "Connection lost";
    } else {
      gameStatusElement.textContent = canMakeMove ? "Your turn" : "Waiting for opponent";
    }
  }
  
  // Update the main status as well
  if (statusElement && isOnlineGame) {
    const currentStatus = statusElement.textContent;
    const turnIndicator = canMakeMove ? "Your turn" : "Opponent's turn";
    
    // Only add turn indicator if it's not already there
    if (!currentStatus.includes(turnIndicator)) {
      statusElement.textContent = `${currentStatus} (${turnIndicator})`;
    }
  }
}

// Initialize the manager when the module is loaded
document.addEventListener('DOMContentLoaded', init);