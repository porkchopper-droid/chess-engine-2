/**
 * @fileoverview Chess game manager
 * 
 * Manages the state of a chess game, including turns, move history, and game status
 */

import { COLORS, GAME_STATUS } from './constants.js';
import { Position } from './position.js';
import { Board } from './board.js';
import { Pawn, Knight, Bishop, Rook, Queen, King } from './pieces.js';

/**
 * Chess game manager
 */
export class Game {
  constructor() {
    this.board = new Board();
    this.currentTurn = COLORS.WHITE;
    this.moveHistory = [];
    this.positionHistory = [this.board.getPositionSignature()];
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.gameStatus = GAME_STATUS.ACTIVE;
  }
  
  /**
   * Make a move in the game
   * @param {Position|string} from - Source position or algebraic notation (e.g., "e2")
   * @param {Position|string} to - Target position or algebraic notation (e.g., "e4")
   * @param {string} [promotionPiece='Q'] - Piece to promote to (if applicable)
   * @returns {Object} Move result including success flag and move details
   */
  makeMove(from, to, promotionPiece = 'Q') {
    // Convert algebraic notation to positions if needed
    const fromPos = typeof from === 'string' ? Position.fromAlgebraic(from) : from;
    const toPos = typeof to === 'string' ? Position.fromAlgebraic(to) : to;
    
    // Get the piece at the source position
    const piece = this.board.getPieceAt(fromPos);
    
    // Check if it's the correct player's turn
    if (!piece || piece.color !== this.currentTurn) {
      return { success: false, error: `Not ${this.currentTurn}'s turn` };
    }
    
    // Check if the move is valid and wouldn't leave the player in check
    const tempBoard = this.board.clone();
    const moveResult = tempBoard.movePiece(fromPos, toPos, promotionPiece);
    
    if (!moveResult.success) {
      return moveResult;
    }
    
    if (tempBoard.isKingInCheck(this.currentTurn)) {
      return { success: false, error: 'Move would leave king in check' };
    }
    
    // Execute the move on the actual board
    const result = this.board.movePiece(fromPos, toPos, promotionPiece);
    
    // Update half-move clock (reset on pawn move or capture)
    if (piece instanceof Pawn || result.capturedPiece) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }
    
    // Save current position for threefold repetition detection
    this.positionHistory.push(this.board.getPositionSignature());
    
    // Create a standardized move record
    const move = {
      piece: piece,
      from: fromPos.toAlgebraic(),
      to: toPos.toAlgebraic(),
      capturedPiece: result.capturedPiece,
      isPromotion: result.isPromotion,
      promotedTo: result.promotedTo,
      isCastling: result.isCastling,
      isEnPassant: result.isEnPassant,
      notation: this.generateMoveNotation(result)
    };
    
    // Add the move to history
    this.moveHistory.push(move);
    
    // Update full move number (increments after Black's move)
    if (this.currentTurn === COLORS.BLACK) {
      this.fullMoveNumber++;
    }
    
    // Switch turns
    this.currentTurn = this.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    
    // Update game status
    this.updateGameStatus();
    
    // Return the move result with additional information
    return {
      success: true,
      move: move,
      gameStatus: this.gameStatus
    };
  }
  
  /**
   * Generate algebraic notation for a move
   * @param {Object} moveResult - Result from board.movePiece
   * @returns {string} Move in algebraic notation (e.g., "e4", "Nxf3", "O-O")
   */
  generateMoveNotation(moveResult) {
    const { piece, from, to, capturedPiece, isPromotion, promotedTo, isCastling, isEnPassant } = moveResult;
    
    // Handle castling
    if (isCastling) {
      // Kingside or queenside
      return to.col > from.col ? 'O-O' : 'O-O-O';
    }
    
    let notation = '';
    
    // Add piece symbol (except for pawns)
    if (!(piece instanceof Pawn)) {
      notation += piece.abbreviation;
      
      // Disambiguation if needed (if another piece of same type can move to the same square)
      const otherPieces = this.board.pieces.filter(p => 
        p !== piece && 
        p.constructor === piece.constructor && 
        p.color === piece.color &&
        p.isValidMove(this.board, to)
      );
      
      if (otherPieces.length > 0) {
        // Try to disambiguate by file
        const sameFile = otherPieces.some(p => p.position.col === from.col);
        const sameRank = otherPieces.some(p => p.position.row === from.row);
        
        if (!sameFile) {
          // Add file letter
          notation += from.toAlgebraic()[0];
        } else if (!sameRank) {
          // Add rank number
          notation += from.toAlgebraic()[1];
        } else {
          // Add both
          notation += from.toAlgebraic();
        }
      }
    } else if (capturedPiece || isEnPassant) {
      // For pawn captures, add the file
      notation += from.toAlgebraic()[0];
    }
    
    // Add capture symbol
    if (capturedPiece || isEnPassant) {
      notation += 'x';
    }
    
    // Add destination square
    notation += to.toAlgebraic();
    
    // Add promotion piece
    if (isPromotion && promotedTo) {
      notation += '=' + promotedTo.abbreviation;
    }
    
    // Add check/checkmate symbol
    // This requires knowing the state after the move
    const opponentColor = this.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    if (this.board.isCheckmate(opponentColor)) {
      notation += '#';
    } else if (this.board.isKingInCheck(opponentColor)) {
      notation += '+';
    }
    
    return notation;
  }
  
  /**
   * Update the game status
   */
  updateGameStatus() {
    const opponentColor = this.currentTurn;
    
    // Check for checkmate
    if (this.board.isCheckmate(opponentColor)) {
      this.gameStatus = opponentColor === COLORS.WHITE ? 
        GAME_STATUS.CHECKMATE_BLACK : GAME_STATUS.CHECKMATE_WHITE;
      return;
    }
    
    // Check for stalemate
    if (this.board.isStalemate(opponentColor)) {
      this.gameStatus = GAME_STATUS.DRAW_STALEMATE;
      return;
    }
    
    // Check for insufficient material
    if (this.board.isInsufficientMaterial()) {
      this.gameStatus = GAME_STATUS.DRAW_INSUFFICIENT;
      return;
    }
    
    // Check for threefold repetition
    // A position is repeated 3 times if it appears 3 times in the history
    const currentPosition = this.board.getPositionSignature();
    let repeatCount = 0;
    for (const position of this.positionHistory) {
      if (position === currentPosition) {
        repeatCount++;
      }
    }
    if (repeatCount >= 3) {
      this.gameStatus = GAME_STATUS.DRAW_REPETITION;
      return;
    }
    
    // Check for fifty-move rule
    if (this.halfMoveClock >= 100) { // 50 full moves = 100 half-moves
      this.gameStatus = GAME_STATUS.DRAW_FIFTY_MOVE;
      return;
    }
    
    // Check for check
    if (this.board.isKingInCheck(opponentColor)) {
      this.gameStatus = GAME_STATUS.CHECK;
      return;
    }
    
    this.gameStatus = GAME_STATUS.ACTIVE;
  }
  
  /**
   * Get the game state in FEN (Forsyth-Edwards Notation)
   * @returns {string} FEN string
   */
  getFEN() {
    // 1. Piece placement
    let fen = this.board.toFEN();
    
    // 2. Active color
    fen += ' ' + (this.currentTurn === COLORS.WHITE ? 'w' : 'b');
    
    // 3. Castling availability
    let castling = '';
    
    // Check if kings and rooks have moved
    const whiteKing = this.board.getKing(COLORS.WHITE);
    const blackKing = this.board.getKing(COLORS.BLACK);
    
    // Helper to find rooks
    const findRook = (color, col) => {
      const row = color === COLORS.WHITE ? 7 : 0;
      const position = new Position(row, col);
      const piece = this.board.getPieceAt(position);
      return piece instanceof Rook && piece.color === color ? piece : null;
    };
    
    // White kingside
    const whiteKingsideRook = findRook(COLORS.WHITE, 7);
    if (whiteKing && !whiteKing.hasMoved && whiteKingsideRook && !whiteKingsideRook.hasMoved) {
      castling += 'K';
    }
    
    // White queenside
    const whiteQueensideRook = findRook(COLORS.WHITE, 0);
    if (whiteKing && !whiteKing.hasMoved && whiteQueensideRook && !whiteQueensideRook.hasMoved) {
      castling += 'Q';
    }
    
    // Black kingside
    const blackKingsideRook = findRook(COLORS.BLACK, 7);
    if (blackKing && !blackKing.hasMoved && blackKingsideRook && !blackKingsideRook.hasMoved) {
      castling += 'k';
    }
    
    // Black queenside
    const blackQueensideRook = findRook(COLORS.BLACK, 0);
    if (blackKing && !blackKing.hasMoved && blackQueensideRook && !blackQueensideRook.hasMoved) {
      castling += 'q';
    }
    
    // If no castling rights
    if (castling === '') {
      castling = '-';
    }
    
    fen += ' ' + castling;
    
    // 4. En passant target square
    const enPassantTarget = this.board.getEnPassantTarget();
    fen += ' ' + (enPassantTarget ? enPassantTarget.toAlgebraic() : '-');
    
    // 5. Halfmove clock
    fen += ' ' + this.halfMoveClock;
    
    // 6. Fullmove number
    fen += ' ' + this.fullMoveNumber;
    
    return fen;
  }
  
  /**
   * Load a game state from FEN
   * @param {string} fen - FEN string
   * @returns {boolean} True if the FEN was loaded successfully
   */
  loadFEN(fen) {
    const parts = fen.trim().split(' ');
    
    if (parts.length !== 6) {
      return false;
    }
    
    // 1. Piece placement
    if (!this.board.loadFEN(parts[0])) {
      return false;
    }
    
    // 2. Active color
    this.currentTurn = parts[1] === 'w' ? COLORS.WHITE : COLORS.BLACK;
    
    // 3. Castling availability (set the hasMoved flags on kings and rooks)
    const castling = parts[2];
    
    // Reset hasMoved flags for all kings and rooks
    this.board.pieces.forEach(piece => {
      if (piece instanceof King || piece instanceof Rook) {
        piece.hasMoved = true; // Initially mark all as moved
      }
    });
    
    // Then clear hasMoved flags based on castling rights
    if (castling !== '-') {
      // White king
      if (castling.includes('K') || castling.includes('Q')) {
        const whiteKing = this.board.getKing(COLORS.WHITE);
        if (whiteKing) {
          whiteKing.hasMoved = false;
        }
      }
      
      // Black king
      if (castling.includes('k') || castling.includes('q')) {
        const blackKing = this.board.getKing(COLORS.BLACK);
        if (blackKing) {
          blackKing.hasMoved = false;
        }
      }
      
      // Helper to find rooks
      const findRook = (color, col) => {
        const row = color === COLORS.WHITE ? 7 : 0;
        const position = new Position(row, col);
        const piece = this.board.getPieceAt(position);
        return piece instanceof Rook && piece.color === color ? piece : null;
      };
      
      // White kingside rook
      if (castling.includes('K')) {
        const rook = findRook(COLORS.WHITE, 7);
        if (rook) rook.hasMoved = false;
      }
      
      // White queenside rook
      if (castling.includes('Q')) {
        const rook = findRook(COLORS.WHITE, 0);
        if (rook) rook.hasMoved = false;
      }
      
      // Black kingside rook
      if (castling.includes('k')) {
        const rook = findRook(COLORS.BLACK, 7);
        if (rook) rook.hasMoved = false;
      }
      
      // Black queenside rook
      if (castling.includes('q')) {
        const rook = findRook(COLORS.BLACK, 0);
        if (rook) rook.hasMoved = false;
      }
    }
    
    // 4. En passant target square
    if (parts[3] !== '-') {
      try {
        this.board.enPassantTarget = Position.fromAlgebraic(parts[3]);
      } catch (error) {
        return false; // Invalid en passant target
      }
    } else {
      this.board.enPassantTarget = null;
    }
    
    // 5. Halfmove clock
    this.halfMoveClock = parseInt(parts[4], 10);
    if (isNaN(this.halfMoveClock)) {
      return false;
    }
    
    // 6. Fullmove number
    this.fullMoveNumber = parseInt(parts[5], 10);
    if (isNaN(this.fullMoveNumber)) {
      return false;
    }
    
    // Reset move history
    this.moveHistory = [];
    this.positionHistory = [this.board.getPositionSignature()];
    
    // Update game status
    this.updateGameStatus();
    
    return true;
  }
  
  /**
   * Get move history in algebraic notation
   * @returns {string[]} Array of move notations
   */
  getMoveNotations() {
    return this.moveHistory.map(move => move.notation);
  }
  
  /**
   * Get move history in PGN format (pairs of white and black moves)
   * @returns {string} PGN move text
   */
  getPGNMoveText() {
    let pgn = '';
    
    for (let i = 0; i < this.moveHistory.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = this.moveHistory[i].notation;
      pgn += `${moveNumber}. ${whiteMove} `;
      
      if (i + 1 < this.moveHistory.length) {
        const blackMove = this.moveHistory[i + 1].notation;
        pgn += `${blackMove} `;
      }
    }
    
    // Add game result
    if (this.gameStatus === GAME_STATUS.CHECKMATE_WHITE) {
      pgn += '1-0';
    } else if (this.gameStatus === GAME_STATUS.CHECKMATE_BLACK) {
      pgn += '0-1';
    } else if (this.gameStatus.startsWith('draw')) {
      pgn += '1/2-1/2';
    }
    
    return pgn.trim();
  }
  
  /**
   * Reset the game to the initial position
   */
  reset() {
    this.board = new Board();
    this.currentTurn = COLORS.WHITE;
    this.moveHistory = [];
    this.positionHistory = [this.board.getPositionSignature()];
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.gameStatus = GAME_STATUS.ACTIVE;
  }
  
  /**
   * Undo the last move
   * @returns {boolean} True if a move was undone
   */
  undoLastMove() {
    if (this.moveHistory.length === 0) {
      return false;
    }
    
    // Remove the last move from history
    this.moveHistory.pop();
    this.positionHistory.pop();
    
    // Reset to the starting position and replay all moves
    const tempBoard = new Board();
    this.currentTurn = COLORS.WHITE;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    
    // Replay all remaining moves
    for (const move of this.moveHistory) {
      const fromPos = Position.fromAlgebraic(move.from);
      const toPos = Position.fromAlgebraic(move.to);
      
      // Handle promotion
      let promotionPiece = null;
      if (move.isPromotion && move.promotedTo) {
        promotionPiece = move.promotedTo.abbreviation;
      }
      
      // Execute the move
      tempBoard.movePiece(fromPos, toPos, promotionPiece);
      
      // Update turn
      this.currentTurn = this.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
      
      // Update move counters
      if (move.piece instanceof Pawn || move.capturedPiece) {
        this.halfMoveClock = 0;
      } else {
        this.halfMoveClock++;
      }
      
      if (this.currentTurn === COLORS.WHITE) {
        this.fullMoveNumber++;
      }
    }
    
    // Update the board to the restored state
    this.board = tempBoard;
    
    // Update game status
    this.updateGameStatus();
    
    return true;
  }
}