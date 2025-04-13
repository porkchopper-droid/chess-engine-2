/**
 * @fileoverview Chess piece classes
 * 
 * Defines the base Piece class and all specific piece types (Pawn, Knight, etc.)
 */

import { COLORS } from './constants.js';
import { Position } from './position.js';

/**
 * Base class for all chess pieces
 */
export class Piece {
  /**
   * Create a piece
   * @param {string} color - Piece color ('white' or 'black')
   * @param {Position} position - Current position
   */
  constructor(color, position) {
    this.color = color;
    this.position = position;
    this.hasMoved = false;
  }
  
  /**
   * Get FEN symbol for this piece
   * @returns {string} FEN symbol
   */
  get symbol() {
    throw new Error('Subclasses must implement the symbol getter');
  }
  
  /**
   * Get abbreviation for this piece (for notation)
   * @returns {string} Piece abbreviation (e.g., "N" for knight)
   */
  get abbreviation() {
    throw new Error('Subclasses must implement the abbreviation getter');
  }
  
  /**
   * Check if a move is valid for this piece
   * @param {Board} board - Current board state
   * @param {Position} target - Target position
   * @returns {boolean} True if move is valid
   */
  isValidMove(board, target) {
    // Ensure target is on the board
    if (!target.isValid()) {
      return false;
    }
    
    // Can't move to current position
    if (this.position.equals(target)) {
      return false;
    }
    
    // Check if target is occupied by a piece of the same color
    const targetPiece = board.getPieceAt(target);
    if (targetPiece && targetPiece.color === this.color) {
      return false;
    }
    
    // Subclasses will implement specific movement rules
    return this.canMoveTo(board, target);
  }
  
  /**
   * Check if this piece can move to the target position
   * @param {Board} board - Current board state
   * @param {Position} target - Target position
   * @returns {boolean} True if move is valid
   */
  canMoveTo(board, target) {
    throw new Error('Subclasses must implement canMoveTo method');
  }
  
  /**
   * Check if path to target is clear (for linear moving pieces)
   * @param {Board} board - Current board state
   * @param {Position} target - Target position
   * @returns {boolean} True if path is clear
   */
  isPathClear(board, target) {
    const rowStep = Math.sign(target.row - this.position.row);
    const colStep = Math.sign(target.col - this.position.col);
    
    let currentRow = this.position.row + rowStep;
    let currentCol = this.position.col + colStep;
    
    while (currentRow !== target.row || currentCol !== target.col) {
      if (board.getPieceAt(new Position(currentRow, currentCol))) {
        return false;
      }
      
      currentRow += rowStep;
      currentCol += colStep;
    }
    
    return true;
  }
  
  /**
   * Move the piece to a new position
   * @param {Position} newPosition - New position
   */
  moveTo(newPosition) {
    this.position = newPosition;
    this.hasMoved = true;
  }
  
  /**
   * Create a copy of this piece
   * @returns {Piece} New piece with same properties
   */
  clone() {
    throw new Error('Subclasses must implement clone method');
  }
}

/**
 * Pawn piece
 */
export class Pawn extends Piece {
  get symbol() {
    return this.color === COLORS.WHITE ? 'P' : 'p';
  }
  
  get abbreviation() {
    return ''; // Pawns have no abbreviation in notation except for captures
  }
  
  canMoveTo(board, target) {
    const rowDirection = this.color === COLORS.WHITE ? -1 : 1;
    const startingRank = this.color === COLORS.WHITE ? 6 : 1;
    
    // Calculate allowed move distances
    const rowDiff = target.row - this.position.row;
    const colDiff = target.col - this.position.col;
    
    // Forward move (1 square)
    if (colDiff === 0 && rowDiff === rowDirection) {
      return !board.getPieceAt(target);
    }
    
    // Forward move (2 squares from starting position)
    if (colDiff === 0 && rowDiff === 2 * rowDirection && this.position.row === startingRank) {
      const intermediatePos = new Position(this.position.row + rowDirection, this.position.col);
      return !board.getPieceAt(intermediatePos) && !board.getPieceAt(target);
    }
    
    // Capture (diagonally)
    if (Math.abs(colDiff) === 1 && rowDiff === rowDirection) {
      // Regular capture
      const targetPiece = board.getPieceAt(target);
      if (targetPiece && targetPiece.color !== this.color) {
        return true;
      }
      
      // En passant capture
      const enPassantTarget = board.getEnPassantTarget();
      if (enPassantTarget && target.equals(enPassantTarget)) {
        return true;
      }
    }
    
    return false;
  }
  
  clone() {
    const copy = new Pawn(this.color, this.position.clone());
    copy.hasMoved = this.hasMoved;
    return copy;
  }
}

/**
 * Knight piece
 */
export class Knight extends Piece {
  get symbol() {
    return this.color === COLORS.WHITE ? 'N' : 'n';
  }
  
  get abbreviation() {
    return 'N';
  }
  
  canMoveTo(board, target) {
    const rowDiff = Math.abs(target.row - this.position.row);
    const colDiff = Math.abs(target.col - this.position.col);
    
    // Knights move in an L-shape: 2 squares in one direction and 1 square perpendicular
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }
  
  clone() {
    const copy = new Knight(this.color, this.position.clone());
    copy.hasMoved = this.hasMoved;
    return copy;
  }
}

/**
 * Bishop piece
 */
export class Bishop extends Piece {
  get symbol() {
    return this.color === COLORS.WHITE ? 'B' : 'b';
  }
  
  get abbreviation() {
    return 'B';
  }
  
  canMoveTo(board, target) {
    const rowDiff = Math.abs(target.row - this.position.row);
    const colDiff = Math.abs(target.col - this.position.col);
    
    // Bishops move diagonally (equal row and column change)
    if (rowDiff === colDiff) {
      return this.isPathClear(board, target);
    }
    
    return false;
  }
  
  clone() {
    const copy = new Bishop(this.color, this.position.clone());
    copy.hasMoved = this.hasMoved;
    return copy;
  }
}

/**
 * Rook piece
 */
export class Rook extends Piece {
  get symbol() {
    return this.color === COLORS.WHITE ? 'R' : 'r';
  }
  
  get abbreviation() {
    return 'R';
  }
  
  canMoveTo(board, target) {
    // Rooks move horizontally or vertically
    if (this.position.row === target.row || this.position.col === target.col) {
      return this.isPathClear(board, target);
    }
    
    return false;
  }
  
  clone() {
    const copy = new Rook(this.color, this.position.clone());
    copy.hasMoved = this.hasMoved;
    return copy;
  }
}

/**
 * Queen piece
 */
export class Queen extends Piece {
  get symbol() {
    return this.color === COLORS.WHITE ? 'Q' : 'q';
  }
  
  get abbreviation() {
    return 'Q';
  }
  
  canMoveTo(board, target) {
    const rowDiff = Math.abs(target.row - this.position.row);
    const colDiff = Math.abs(target.col - this.position.col);
    
    // Queens can move like bishops (diagonally)
    if (rowDiff === colDiff) {
      return this.isPathClear(board, target);
    }
    
    // Queens can move like rooks (horizontally/vertically)
    if (this.position.row === target.row || this.position.col === target.col) {
      return this.isPathClear(board, target);
    }
    
    return false;
  }
  
  clone() {
    const copy = new Queen(this.color, this.position.clone());
    copy.hasMoved = this.hasMoved;
    return copy;
  }
}

/**
 * King piece
 */
export class King extends Piece {
  get symbol() {
    return this.color === COLORS.WHITE ? 'K' : 'k';
  }
  
  get abbreviation() {
    return 'K';
  }
  
  canMoveTo(board, target) {
    const rowDiff = Math.abs(target.row - this.position.row);
    const colDiff = Math.abs(target.col - this.position.col);
    
    // Normal king move (one square in any direction)
    if (rowDiff <= 1 && colDiff <= 1) {
      return true;
    }
    
    // Castling (king moves two squares horizontally)
    if (!this.hasMoved && rowDiff === 0 && colDiff === 2) {
      // Determine if it's kingside or queenside castling
      const isKingside = target.col > this.position.col;
      
      // Check if rook is in place and hasn't moved
      const rookCol = isKingside ? 7 : 0;
      const rookPosition = new Position(this.position.row, rookCol);
      const rook = board.getPieceAt(rookPosition);
      
      if (!rook || rook.symbol.toLowerCase() !== 'r' || rook.color !== this.color || rook.hasMoved) {
        return false;
      }
      
      // Check if squares between king and rook are empty
      const colStart = Math.min(this.position.col, rookCol);
      const colEnd = Math.max(this.position.col, rookCol);
      
      for (let col = colStart + 1; col < colEnd; col++) {
        if (board.getPieceAt(new Position(this.position.row, col))) {
          return false;
        }
      }
      
      // Check if king passes through or ends up in check
      // (This will be handled in the Board class since it requires knowledge of the entire board)
      return true;
    }
    
    return false;
  }
  
  clone() {
    const copy = new King(this.color, this.position.clone());
    copy.hasMoved = this.hasMoved;
    return copy;
  }
}