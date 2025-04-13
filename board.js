/**
 * @fileoverview Chess board implementation
 * 
 * Manages the chess board state, piece positions, and move execution
 */

import { COLORS } from './constants.js';
import { Position } from './position.js';
import { Pawn, Knight, Bishop, Rook, Queen, King } from './pieces.js';

/**
 * Manages the chess board state
 */
export class Board {
  constructor() {
    this.pieces = [];
    this.enPassantTarget = null;
    this.capturedPieces = [];
    this.setupInitialPosition();
  }
  
  /**
   * Setup the initial chess position
   */
  setupInitialPosition() {
    this.pieces = [];
    
    // Add pawns
    for (let col = 0; col < 8; col++) {
      this.pieces.push(new Pawn(COLORS.BLACK, new Position(1, col)));
      this.pieces.push(new Pawn(COLORS.WHITE, new Position(6, col)));
    }
    
    // Add rooks
    this.pieces.push(new Rook(COLORS.BLACK, new Position(0, 0)));
    this.pieces.push(new Rook(COLORS.BLACK, new Position(0, 7)));
    this.pieces.push(new Rook(COLORS.WHITE, new Position(7, 0)));
    this.pieces.push(new Rook(COLORS.WHITE, new Position(7, 7)));
    
    // Add knights
    this.pieces.push(new Knight(COLORS.BLACK, new Position(0, 1)));
    this.pieces.push(new Knight(COLORS.BLACK, new Position(0, 6)));
    this.pieces.push(new Knight(COLORS.WHITE, new Position(7, 1)));
    this.pieces.push(new Knight(COLORS.WHITE, new Position(7, 6)));
    
    // Add bishops
    this.pieces.push(new Bishop(COLORS.BLACK, new Position(0, 2)));
    this.pieces.push(new Bishop(COLORS.BLACK, new Position(0, 5)));
    this.pieces.push(new Bishop(COLORS.WHITE, new Position(7, 2)));
    this.pieces.push(new Bishop(COLORS.WHITE, new Position(7, 5)));
    
    // Add queens
    this.pieces.push(new Queen(COLORS.BLACK, new Position(0, 3)));
    this.pieces.push(new Queen(COLORS.WHITE, new Position(7, 3)));
    
    // Add kings
    this.pieces.push(new King(COLORS.BLACK, new Position(0, 4)));
    this.pieces.push(new King(COLORS.WHITE, new Position(7, 4)));
    
    // Reset en passant target
    this.enPassantTarget = null;
    
    // Reset captured pieces
    this.capturedPieces = [];
  }
  
  /**
   * Get piece at a specific position
   * @param {Position} position - Board position
   * @returns {Piece|null} Piece at position or null if empty
   */
  getPieceAt(position) {
    return this.pieces.find(piece => 
      piece.position.row === position.row && piece.position.col === position.col
    ) || null;
  }
  
  /**
   * Get all pieces of a specific color
   * @param {string} color - Piece color
   * @returns {Piece[]} Array of pieces
   */
  getPiecesByColor(color) {
    return this.pieces.filter(piece => piece.color === color);
  }
  
  /**
   * Get the king of a specific color
   * @param {string} color - King color
   * @returns {King} King piece
   */
  getKing(color) {
    return this.pieces.find(piece => 
      piece instanceof King && piece.color === color
    );
  }
  
  /**
   * Get current en passant target
   * @returns {Position|null} En passant target position
   */
  getEnPassantTarget() {
    return this.enPassantTarget;
  }
  
  /**
   * Move a piece on the board
   * @param {Position} from - Source position
   * @param {Position} to - Target position
   * @param {string} [promotionPiece='Q'] - Piece to promote to (if applicable)
   * @returns {Object} Move result (success, captured piece, etc.)
   */
  movePiece(from, to, promotionPiece = 'Q') {
    const piece = this.getPieceAt(from);
    
    if (!piece) {
      return { success: false, error: 'No piece at source position' };
    }
    
    if (!piece.isValidMove(this, to)) {
      return { success: false, error: 'Invalid move' };
    }
    
    // Create a result object to return
    const result = {
      success: true,
      piece: piece,
      from: from.clone(),
      to: to.clone(),
      capturedPiece: null,
      isPromotion: false,
      isCastling: false,
      isEnPassant: false,
      newEnPassantTarget: null
    };
    
    // Check for capture
    const capturedPiece = this.getPieceAt(to);
    if (capturedPiece) {
      result.capturedPiece = capturedPiece;
      // Remove captured piece from the board
      this.pieces = this.pieces.filter(p => p !== capturedPiece);
      // Add to captured pieces list
      this.capturedPieces.push(capturedPiece);
    }
    
    // Handle en passant capture
    if (piece instanceof Pawn && 
        this.enPassantTarget && 
        to.equals(this.enPassantTarget)) {
      // Determine the position of the captured pawn
      const captureRow = piece.color === COLORS.WHITE ? to.row + 1 : to.row - 1;
      const capturePosition = new Position(captureRow, to.col);
      const capturedPawn = this.getPieceAt(capturePosition);
      
      if (capturedPawn) {
        result.capturedPiece = capturedPawn;
        result.isEnPassant = true;
        // Remove captured pawn from the board
        this.pieces = this.pieces.filter(p => p !== capturedPawn);
        // Add to captured pieces list
        this.capturedPieces.push(capturedPawn);
      }
    }
    
    // Handle pawn promotion
    if (piece instanceof Pawn &&
        ((piece.color === COLORS.WHITE && to.row === 0) ||
         (piece.color === COLORS.BLACK && to.row === 7))) {
      result.isPromotion = true;
      
      // Create the new piece based on the promotion choice
      let newPiece;
      const pieceConstructors = {
        'Q': Queen,
        'R': Rook,
        'B': Bishop,
        'N': Knight
      };
      
      const PieceConstructor = pieceConstructors[promotionPiece] || Queen;
      newPiece = new PieceConstructor(piece.color, to.clone());
      newPiece.hasMoved = true;
      
      // Remove the pawn from the board
      this.pieces = this.pieces.filter(p => p !== piece);
      
      // Add the new piece
      this.pieces.push(newPiece);
      
      result.promotedTo = newPiece;
    } else {
      // Regular move - update piece position
      piece.moveTo(to.clone());
    }
    
    // Handle castling
    if (piece instanceof King && Math.abs(to.col - from.col) === 2) {
      result.isCastling = true;
      const isKingside = to.col > from.col;
      
      // Determine rook position
      const rookCol = isKingside ? 7 : 0;
      const rookPosition = new Position(from.row, rookCol);
      const rook = this.getPieceAt(rookPosition);
      
      if (rook) {
        // Calculate new rook position
        const newRookCol = isKingside ? to.col - 1 : to.col + 1;
        const newRookPosition = new Position(from.row, newRookCol);
        
        // Move the rook
        rook.moveTo(newRookPosition);
        
        result.rookMove = {
          piece: rook,
          from: rookPosition,
          to: newRookPosition
        };
      }
    }
    
    // Handle pawn double move and set en passant target
    if (piece instanceof Pawn && Math.abs(to.row - from.row) === 2) {
      const enPassantRow = piece.color === COLORS.WHITE ? from.row - 1 : from.row + 1;
      result.newEnPassantTarget = new Position(enPassantRow, from.col);
      this.enPassantTarget = result.newEnPassantTarget;
    } else {
      // Reset en passant target
      this.enPassantTarget = null;
    }
    
    return result;
  }
  
  /**
   * Check if a specific square is attacked by any piece of a given color
   * @param {Position} position - Position to check
   * @param {string} attackerColor - Color of attacking pieces
   * @returns {boolean} True if the square is attacked
   */
  isSquareAttacked(position, attackerColor) {
    // Get all pieces of the attacker's color
    const attackers = this.getPiecesByColor(attackerColor);
    
    // Check if any piece can move to the position
    for (const attacker of attackers) {
      // For kings, we need to avoid infinite recursion by only checking normal moves
      if (attacker instanceof King) {
        const rowDiff = Math.abs(position.row - attacker.position.row);
        const colDiff = Math.abs(position.col - attacker.position.col);
        
        if (rowDiff <= 1 && colDiff <= 1) {
          return true;
        }
        continue;
      }
      
      // For pawns, check capture moves specifically rather than normal moves
      if (attacker instanceof Pawn) {
        const rowDirection = attackerColor === COLORS.WHITE ? -1 : 1;
        const attackRow = attacker.position.row + rowDirection;
        const leftCol = attacker.position.col - 1;
        const rightCol = attacker.position.col + 1;
        
        if (attackRow === position.row && 
            (leftCol === position.col || rightCol === position.col)) {
          return true;
        }
        continue;
      }
      
      // For all other pieces, use their normal move validation
      if (attacker.isValidMove(this, position)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Find all pieces that can attack a specific position
   * @param {Position} position - Position to check
   * @param {string} attackerColor - Color of attacking pieces
   * @returns {Piece[]} Array of pieces that can attack the position
   */
  findAttackers(position, attackerColor) {
    const attackers = [];
    const pieces = this.getPiecesByColor(attackerColor);
    
    for (const piece of pieces) {
      // Special case for pawns (can only attack diagonally)
      if (piece instanceof Pawn) {
        const rowDirection = piece.color === COLORS.WHITE ? -1 : 1;
        if (piece.position.row + rowDirection === position.row && 
            Math.abs(piece.position.col - position.col) === 1) {
          attackers.push(piece);
        }
        continue;
      }
      
      // For kings, check only one square moves to avoid recursion
      if (piece instanceof King) {
        const rowDiff = Math.abs(position.row - piece.position.row);
        const colDiff = Math.abs(position.col - piece.position.col);
        if (rowDiff <= 1 && colDiff <= 1) {
          attackers.push(piece);
        }
        continue;
      }
      
      // For all other pieces, use their move validation
      if (piece.isValidMove(this, position)) {
        attackers.push(piece);
      }
    }
    
    return attackers;
  }
  
  /**
   * Check if a king is in check
   * @param {string} kingColor - Color of the king
   * @returns {boolean} True if the king is in check
   */
  isKingInCheck(kingColor) {
    const king = this.getKing(kingColor);
    if (!king) return false;
    
    const opponentColor = kingColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    return this.isSquareAttacked(king.position, opponentColor);
  }
  
  /**
   * Find all legal moves for a piece
   * @param {Piece} piece - The piece to find moves for
   * @returns {Position[]} Array of legal destination positions
   */
  getLegalMovesForPiece(piece) {
    if (!piece) return [];
    
    const legalMoves = [];
    
    // Check all potential destination squares
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const targetPos = new Position(row, col);
        
        // Skip the current position
        if (piece.position.equals(targetPos)) continue;
        
        // Check if the move is valid according to piece rules
        if (piece.isValidMove(this, targetPos)) {
          // Create a temporary board to test if the move would result in check
          const tempBoard = this.clone();
          const tempPiece = tempBoard.getPieceAt(piece.position);
          
          // Execute the move on the temporary board
          tempBoard.movePiece(piece.position, targetPos);
          
          // If the move doesn't leave or put the king in check, it's legal
          if (!tempBoard.isKingInCheck(piece.color)) {
            legalMoves.push(targetPos);
          }
        }
      }
    }
    
    return legalMoves;
  }
  
  /**
   * Get all legal moves for a color
   * @param {string} color - Color to get moves for
   * @returns {Object} Map of pieces to their legal moves
   */
  getAllLegalMoves(color) {
    const result = {};
    const pieces = this.getPiecesByColor(color);
    
    for (const piece of pieces) {
      const moves = this.getLegalMovesForPiece(piece);
      if (moves.length > 0) {
        result[piece.position.toAlgebraic()] = moves;
      }
    }
    
    return result;
  }
  
  /**
   * Check if a player has any legal moves
   * @param {string} color - Color of the player
   * @returns {boolean} True if the player has at least one legal move
   */
  hasLegalMoves(color) {
    const pieces = this.getPiecesByColor(color);
    
    for (const piece of pieces) {
      if (this.getLegalMovesForPiece(piece).length > 0) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a player is in checkmate
   * @param {string} color - Color of the player
   * @returns {boolean} True if the player is in checkmate
   */
  isCheckmate(color) {
    // Must be in check
    if (!this.isKingInCheck(color)) {
      return false;
    }
    
    // Check if any piece has a legal move
    return !this.hasLegalMoves(color);
  }
  
  /**
   * Check if a player is in stalemate
   * @param {string} color - Color of the player
   * @returns {boolean} True if the player is in stalemate
   */
  isStalemate(color) {
    // Must not be in check
    if (this.isKingInCheck(color)) {
      return false;
    }
    
    // Check if any piece has a legal move
    return !this.hasLegalMoves(color);
  }
  
  /**
   * Check if the game is a draw due to insufficient material
   * @returns {boolean} True if there's insufficient material for checkmate
   */
  isInsufficientMaterial() {
    // Count the pieces on the board
    const pieces = this.pieces;
    
    // If there are only kings left
    if (pieces.length === 2) {
      return true;
    }
    
    // If there's king and bishop vs king or king and knight vs king
    if (pieces.length === 3) {
      // Count bishops and knights
      const bishops = pieces.filter(p => p instanceof Bishop).length;
      const knights = pieces.filter(p => p instanceof Knight).length;
      
      // If there's exactly one bishop or one knight, it's a draw
      return bishops === 1 || knights === 1;
    }
    
    // King and bishop vs king and bishop of the same color square
    if (pieces.length === 4) {
      const bishops = pieces.filter(p => p instanceof Bishop);
      if (bishops.length === 2) {
        // Check if bishops are on same color squares
        const bishop1 = bishops[0];
        const bishop2 = bishops[1];
        
        // Check if bishops belong to different players
        if (bishop1.color !== bishop2.color) {
          // Bishops are on same color squares if the sum of row and column is odd for both or even for both
          const isOdd1 = (bishop1.position.row + bishop1.position.col) % 2 === 1;
          const isOdd2 = (bishop2.position.row + bishop2.position.col) % 2 === 1;
          
          return isOdd1 === isOdd2;
        }
      }
    }
    
    // Otherwise, assume sufficient material
    return false;
  }
  
  /**
   * Check if the position has repeated three times
   * @param {string[]} positionHistory - History of position signatures
   * @returns {boolean} True if the current position has appeared three times
   */
  isThreefoldRepetition(positionHistory) {
    const currentSignature = this.getPositionSignature();
    let count = 0;
    
    for (const signature of positionHistory) {
      if (signature === currentSignature) {
        count++;
        if (count >= 3) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Generate a FEN (Forsyth-Edwards Notation) string for the current board position
   * @returns {string} FEN string for the board position
   */
  toFEN() {
    let fen = '';
    
    // Process each row
    for (let row = 0; row < 8; row++) {
      let emptyCount = 0;
      
      // Process each column in the row
      for (let col = 0; col < 8; col++) {
        const piece = this.getPieceAt(new Position(row, col));
        
        if (piece) {
          // If we had empty squares before this piece, add the count
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          // Add the piece symbol
          fen += piece.symbol;
        } else {
          // Increment empty square count
          emptyCount++;
        }
      }
      
      // If we have empty squares at the end of the row, add the count
      if (emptyCount > 0) {
        fen += emptyCount;
      }
      
      // Add a slash between rows (except after the last row)
      if (row < 7) {
        fen += '/';
      }
    }
    
    return fen;
  }
  
  /**
   * Load a board position from a FEN string
   * @param {string} fen - The FEN string (only the piece placement part)
   * @returns {boolean} True if loading was successful
   */
  loadFEN(fen) {
    // Clear the current board
    this.pieces = [];
    this.capturedPieces = [];
    this.enPassantTarget = null;
    
    // Split the FEN string into rows
    const rows = fen.split('/');
    if (rows.length !== 8) {
      return false; // Invalid FEN
    }
    
    // Process each row
    for (let row = 0; row < 8; row++) {
      let col = 0;
      
      // Process each character in the row
      for (let i = 0; i < rows[row].length; i++) {
        const char = rows[row][i];
        
        if (/[1-8]/.test(char)) {
          // Skip empty squares
          col += parseInt(char, 10);
        } else if (/[prnbqkPRNBQK]/.test(char)) {
          // Create a new piece
          const position = new Position(row, col);
          const color = char === char.toUpperCase() ? COLORS.WHITE : COLORS.BLACK;
          let piece;
          
          switch (char.toLowerCase()) {
            case 'p':
              piece = new Pawn(color, position);
              break;
            case 'r':
              piece = new Rook(color, position);
              break;
            case 'n':
              piece = new Knight(color, position);
              break;
            case 'b':
              piece = new Bishop(color, position);
              break;
            case 'q':
              piece = new Queen(color, position);
              break;
            case 'k':
              piece = new King(color, position);
              break;
            default:
              return false; // Invalid piece
          }
          
          this.pieces.push(piece);
          col++;
        } else {
          return false; // Invalid character
        }
      }
      
      if (col !== 8) {
        return false; // Row has wrong length
      }
    }
    
    return true;
  }
  
  /**
   * Get a unique signature of the board position
   * (used for threefold repetition detection)
   * @returns {string} A unique string representing the board state
   */
  getPositionSignature() {
    // Sort pieces to ensure consistent representation
    const sortedPieces = [...this.pieces].sort((a, b) => {
      // Sort by piece type
      if (a.symbol !== b.symbol) {
        return a.symbol.localeCompare(b.symbol);
      }
      // Then by row
      if (a.position.row !== b.position.row) {
        return a.position.row - b.position.row;
      }
      // Then by column
      return a.position.col - b.position.col;
    });
    
    // Create a string representation of the position
    let signature = '';
    for (const piece of sortedPieces) {
      signature += piece.symbol + piece.position.toAlgebraic();
    }
    
    // Add en passant target if any
    signature += ';ep:' + (this.enPassantTarget ? this.enPassantTarget.toAlgebraic() : '-');
    
    return signature;
  }
  
  /**
   * Create a deep copy of the board
   * @returns {Board} A new Board instance with the same state
   */
  clone() {
    const newBoard = new Board();
    
    // Clear the initial pieces
    newBoard.pieces = [];
    
    // Clone all pieces
    for (const piece of this.pieces) {
      newBoard.pieces.push(piece.clone());
    }
    
    // Clone captured pieces
    newBoard.capturedPieces = [...this.capturedPieces];
    
    // Clone en passant target
    if (this.enPassantTarget) {
      newBoard.enPassantTarget = this.enPassantTarget.clone();
    } else {
      newBoard.enPassantTarget = null;
    }
    
    return newBoard;
  }
}