/**
 * @fileoverview Chess game server using Socket.io
 * 
 * This server facilitates P2P connections between chess players,
 * manages game rooms, and handles player moves.
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';

// Setup Express server
const app = express();
const server = createServer(app);
const io = new Server(server);

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files from current directory
app.use(express.static(__dirname));

// Add a route for the root path
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'chess-test.html'));
});

// Game rooms storage
const games = {};

// Handle socket connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send the socket ID to the client
  socket.emit('connected', socket.id);
  
  // Handle create game request
  socket.on('create-game', () => {
    const gameId = generateGameId();
    
    // Create a new game room
    games[gameId] = {
      id: gameId,
      players: [{ id: socket.id, color: 'white' }],
      currentTurn: 'white',
      moves: []
    };
    
    // Join the socket to the game room
    socket.join(gameId);
    
    // Inform client of successful game creation
    socket.emit('game-created', {
      gameId,
      playerColor: 'white'
    });
    
    console.log(`Game created: ${gameId} by player ${socket.id}`);
  });
  
  // Handle join game request
  socket.on('join-game', (gameId) => {
    const game = games[gameId];
    
    // Check if game exists
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    // Check if game is already full
    if (game.players.length >= 2) {
      socket.emit('error', { message: 'Game is full' });
      return;
    }
    
    // Add player to the game
    game.players.push({ id: socket.id, color: 'black' });
    
    // Join the socket to the game room
    socket.join(gameId);
    
    // Inform client of successful join
    socket.emit('game-joined', {
      gameId,
      playerColor: 'black'
    });
    
    // Inform the other player that someone joined
    socket.to(gameId).emit('opponent-joined', {
      opponentId: socket.id
    });
    
    console.log(`Player ${socket.id} joined game: ${gameId}`);
  });
  
  // Handle move
  socket.on('move', (data) => {
    const { gameId, from, to, promotion } = data;
    const game = games[gameId];
    
    // Check if game exists
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    // Find the player
    const player = game.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('error', { message: 'Player not found in this game' });
      return;
    }
    
    // Check if it's the player's turn
    if (player.color !== game.currentTurn) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    // Record the move
    game.moves.push({ from, to, promotion, player: player.color });
    
    // Switch turns
    game.currentTurn = game.currentTurn === 'white' ? 'black' : 'white';
    
    // Broadcast the move to the opponent
    socket.to(gameId).emit('opponent-move', {
      from,
      to,
      promotion
    });
    
    console.log(`Move in game ${gameId}: ${from} to ${to}`);
  });
  
  // Handle game restart request
  socket.on('restart-game', (gameId) => {
    const game = games[gameId];
    
    // Check if game exists
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    // Reset game state
    game.currentTurn = 'white';
    game.moves = [];
    
    // Broadcast restart to all players in the game
    io.to(gameId).emit('game-restart');
    
    console.log(`Game ${gameId} restarted by player ${socket.id}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find games where this socket is a player
    Object.entries(games).forEach(([gameId, game]) => {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        // Notify the other player
        socket.to(gameId).emit('opponent-disconnected');
        console.log(`Player ${socket.id} left game ${gameId}`);
        
        // If no players left, clean up the game
        if (game.players.length <= 1) {
          delete games[gameId];
          console.log(`Game ${gameId} removed`);
        }
      }
    });
  });
});

// Generate a unique game ID
function generateGameId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chess server running on http://localhost:${PORT}`);
});