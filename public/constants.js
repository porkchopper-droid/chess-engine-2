/**
 * @fileoverview Chess constants and shared values
 * 
 * Defines constants used throughout the chess engine
 */

// Player colors
export const COLORS = {
    WHITE: 'white',
    BLACK: 'black'
  };
  
  // Board files (columns A-H)
  export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  
  // Board ranks (rows 1-8)
  export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];
  
  // Piece unicode symbols for display
  export const PIECE_SYMBOLS = {
    'P': '♙', // White Pawn
    'R': '♖', // White Rook
    'N': '♘', // White Knight
    'B': '♗', // White Bishop
    'Q': '♕', // White Queen
    'K': '♔', // White King
    'p': '♟', // Black Pawn
    'r': '♜', // Black Rook
    'n': '♞', // Black Knight
    'b': '♝', // Black Bishop
    'q': '♛', // Black Queen
    'k': '♚', // Black King
  };
  
  // Game status values
  export const GAME_STATUS = {
    ACTIVE: 'active',
    CHECK: 'check',
    CHECKMATE_WHITE: 'checkmate-white',
    CHECKMATE_BLACK: 'checkmate-black',
    DRAW_STALEMATE: 'draw-stalemate',
    DRAW_INSUFFICIENT: 'draw-insufficient-material',
    DRAW_REPETITION: 'draw-repetition',
    DRAW_FIFTY_MOVE: 'draw-fifty-move'
  };