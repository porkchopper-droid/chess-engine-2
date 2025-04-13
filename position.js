/**
 * @fileoverview Position class for chess squares
 * 
 * Represents a position on the chess board with conversion to/from algebraic notation
 */

import { FILES, RANKS } from './constants.js';

/**
 * Represents a position on the chess board
 */
export class Position {
  /**
   * Create a position
   * @param {number} row - Row index (0-7, 0 = top row)
   * @param {number} col - Column index (0-7, 0 = leftmost column)
   */
  constructor(row, col) {
    this.row = row;
    this.col = col;
  }
  
  /**
   * Create a position from algebraic notation (e.g., "e4")
   * @param {string} algebraic - Algebraic position notation
   * @returns {Position} Position object
   */
  static fromAlgebraic(algebraic) {
    if (algebraic.length !== 2) {
      throw new Error(`Invalid algebraic position: ${algebraic}`);
    }
    
    const file = algebraic[0].toLowerCase();
    const rank = algebraic[1];
    
    if (!FILES.includes(file) || !RANKS.includes(rank)) {
      throw new Error(`Invalid algebraic position: ${algebraic}`);
    }
    
    const col = FILES.indexOf(file);
    const row = 8 - parseInt(rank, 10);
    
    return new Position(row, col);
  }
  
  /**
   * Convert position to algebraic notation
   * @returns {string} Algebraic notation (e.g., "e4")
   */
  toAlgebraic() {
    return FILES[this.col] + RANKS[7 - this.row];
  }
  
  /**
   * Check if position is valid (within board boundaries)
   * @returns {boolean} True if position is valid
   */
  isValid() {
    return this.row >= 0 && this.row < 8 && this.col >= 0 && this.col < 8;
  }
  
  /**
   * Check if two positions are equal
   * @param {Position} other - Position to compare with
   * @returns {boolean} True if positions are equal
   */
  equals(other) {
    return this.row === other.row && this.col === other.col;
  }
  
  /**
   * Create a copy of this position
   * @returns {Position} New position object with same coordinates
   */
  clone() {
    return new Position(this.row, this.col);
  }
  
  /**
   * Get string representation of the position
   * @returns {string} String representation
   */
  toString() {
    return this.toAlgebraic();
  }
}