/**
 * @fileoverview Main entry point for the chess engine
 * 
 * This file exports all chess components for use in applications
 */

// Re-export all modules to provide a clean public API
export { COLORS, GAME_STATUS, FILES, RANKS, PIECE_SYMBOLS } from './constants.js';
export { Position } from './position.js';
export { Piece, Pawn, Knight, Bishop, Rook, Queen, King } from './pieces.js';
export { Board } from './board.js';
export { Game } from './game.js';

// Import the Game class to use in utility functions
import { Game } from './game.js';

/**
 * Create a new chess game
 * @returns {Game} A new game instance
 */
export function createGame() {
  return new Game();
}

/**
 * Load a game from FEN notation
 * @param {string} fen - FEN string
 * @returns {Game} Game instance with the loaded position
 */
export function loadGameFromFEN(fen) {
  const game = new Game();
  const success = game.loadFEN(fen);
  if (!success) {
    throw new Error('Invalid FEN notation: ' + fen);
  }
  return game;
}

/**
 * Parse an algebraic notation move
 * @param {string} moveStr - Move in algebraic notation (e.g., "e4", "Nxf3")
 * @param {Game} game - Game instance
 * @returns {Object} Move information with from and to positions
 */
export function parseMove(moveStr, game) {
  // Handle castling
  if (moveStr === 'O-O' || moveStr === '0-0') {
    // Kingside castling
    const king = game.board.getKing(game.currentTurn);
    if (!king) throw new Error('King not found');
    
    const from = king.position;
    const to = new Position(from.row, from.col + 2);
    return { from, to };
  }
  
  if (moveStr === 'O-O-O' || moveStr === '0-0-0') {
    // Queenside castling
    const king = game.board.getKing(game.currentTurn);
    if (!king) throw new Error('King not found');
    
    const from = king.position;
    const to = new Position(from.row, from.col - 2);
    return { from, to };
  }
  
  // Extract information from the move string
  // Remove check/checkmate symbols and capture symbol
  const cleanMove = moveStr.replace(/[+#x]/g, '');
  
  // Get promotion information if any
  let promotionPiece = null;
  let moveWithoutPromotion = cleanMove;
  
  if (cleanMove.includes('=')) {
    const parts = cleanMove.split('=');
    moveWithoutPromotion = parts[0];
    promotionPiece = parts[1];
  }
  
  // Determine the target square (always the last 2 characters)
  const targetSquare = moveWithoutPromotion.slice(-2);
  const to = Position.fromAlgebraic(targetSquare);
  
  // Handle pawn moves (no piece letter)
  if (!/[NBRQK]/.test(moveWithoutPromotion[0])) {
    // Find the pawn that can move to this square
    const pawns = game.board.getPiecesByColor(game.currentTurn)
      .filter(p => p instanceof Pawn);
    
    // Determine the file if specified (for captures)
    let sourceFile = null;
    if (/^[a-h]/.test(moveWithoutPromotion) && moveWithoutPromotion.length > 2) {
      sourceFile = moveWithoutPromotion[0].charCodeAt(0) - 'a'.charCodeAt(0);
    }
    
    // Find the pawn that can legally move to the target
    for (const pawn of pawns) {
      // Skip if the source file doesn't match
      if (sourceFile !== null && pawn.position.col !== sourceFile) {
        continue;
      }
      
      // Check if this pawn can legally move to the target
      const moves = game.board.getLegalMovesForPiece(pawn);
      const canMove = moves.some(m => m.equals(to));
      
      if (canMove) {
        return { 
          from: pawn.position,
          to,
          promotion: promotionPiece
        };
      }
    }
    
    throw new Error(`No pawn can move to ${targetSquare}`);
  }
  
  // Handle piece moves (starts with piece letter)
  const pieceType = moveWithoutPromotion[0];
  let candidates;
  
  // Find all pieces of the specified type
  switch (pieceType) {
    case 'N':
      candidates = game.board.getPiecesByColor(game.currentTurn)
        .filter(p => p instanceof Knight);
      break;
    case 'B':
      candidates = game.board.getPiecesByColor(game.currentTurn)
        .filter(p => p instanceof Bishop);
      break;
    case 'R':
      candidates = game.board.getPiecesByColor(game.currentTurn)
        .filter(p => p instanceof Rook);
      break;
    case 'Q':
      candidates = game.board.getPiecesByColor(game.currentTurn)
        .filter(p => p instanceof Queen);
      break;
    case 'K':
      candidates = game.board.getPiecesByColor(game.currentTurn)
        .filter(p => p instanceof King);
      break;
    default:
      throw new Error(`Unknown piece type: ${pieceType}`);
  }
  
  // Handle disambiguation (e.g., "Nbd7")
  if (moveWithoutPromotion.length > 3) {
    const disambiguator = moveWithoutPromotion.substring(1, moveWithoutPromotion.length - 2);
    
    if (disambiguator.length > 0) {
      // Filter by file if specified
      if (/[a-h]/.test(disambiguator)) {
        const file = disambiguator.indexOf(/[a-h]/) >= 0 ? 
          disambiguator.match(/[a-h]/)[0].charCodeAt(0) - 'a'.charCodeAt(0) : null;
        if (file !== null) {
          candidates = candidates.filter(p => p.position.col === file);
        }
      }
      
      // Filter by rank if specified
      if (/[1-8]/.test(disambiguator)) {
        const rank = disambiguator.indexOf(/[1-8]/) >= 0 ?
          8 - disambiguator.match(/[1-8]/)[0] : null;
        if (rank !== null) {
          candidates = candidates.filter(p => p.position.row === rank);
        }
      }
    }
  }
  
  // Find the piece that can legally move to the target
  for (const piece of candidates) {
    const moves = game.board.getLegalMovesForPiece(piece);
    const canMove = moves.some(m => m.equals(to));
    
    if (canMove) {
      return { 
        from: piece.position,
        to 
      };
    }
  }
  
  throw new Error(`No ${pieceType} can move to ${targetSquare}`);
}

/**
 * Chess engine version information
 */
export const VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  toString() {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
};