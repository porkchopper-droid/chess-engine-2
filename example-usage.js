/**
 * Example usage of the chess engine
 */
import { createGame, loadGameFromFEN, Position, VERSION } from './chess-engine.js';

// Display the chess engine version
console.log(`Chess Engine v${VERSION}`);

// Create a new chess game
const game = createGame();

// Make some moves
console.log('\n--- Making moves ---');
const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6'];

for (const moveStr of moves) {
  const result = game.makeMove(...parseAlgebraic(moveStr, game));
  if (result.success) {
    console.log(`${moveStr} - ${result.move.notation}`);
  } else {
    console.error(`Failed to make move ${moveStr}: ${result.error}`);
  }
}

// Display the current board position
console.log('\n--- Current position ---');
displayBoard(game.board);

// Display FEN
console.log('\n--- FEN notation ---');
console.log(game.getFEN());

// Display PGN
console.log('\n--- PGN move text ---');
console.log(game.getPGNMoveText());

// Load a position from FEN (Sicilian Defense)
try {
  console.log('\n--- Loading position from FEN ---');
  const sicilian = loadGameFromFEN('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2');
  console.log('Position loaded successfully');
  
  console.log('\n--- Sicilian Defense position ---');
  displayBoard(sicilian.board);
  
  console.log('\n--- Legal moves for White ---');
  const whitePieces = sicilian.board.getPiecesByColor('white');
  
  let legalMoveCount = 0;
  for (const piece of whitePieces) {
    const moves = sicilian.board.getLegalMovesForPiece(piece);
    if (moves.length > 0) {
      console.log(`${piece.symbol} at ${piece.position.toAlgebraic()}: ${moves.map(m => m.toAlgebraic()).join(', ')}`);
      legalMoveCount += moves.length;
    }
  }
  console.log(`Total legal moves: ${legalMoveCount}`);
  
} catch (error) {
  console.error(`Error loading FEN: ${error.message}`);
}

/**
 * Helper function to parse algebraic notation (simplified version)
 * @param {string} moveStr - Move in algebraic notation
 * @param {Game} game - Current game
 * @returns {Array} Array with [from, to] positions
 */
function parseAlgebraic(moveStr, game) {
  // This is a very simplified parser for the examples
  // A full parser would be more complex
  
  // Special case for castling
  if (moveStr === 'O-O' || moveStr === '0-0') {
    const king = game.board.getKing(game.currentTurn);
    return [king.position, new Position(king.position.row, king.position.col + 2)];
  }
  
  if (moveStr === 'O-O-O' || moveStr === '0-0-0') {
    const king = game.board.getKing(game.currentTurn);
    return [king.position, new Position(king.position.row, king.position.col - 2)];
  }
  
  // For pawn moves like "e4" or captures like "exd5"
  if (/^[a-h]/.test(moveStr)) {
    // Extract target square
    const targetSquare = moveStr.match(/[a-h][1-8]/)[0];
    const to = Position.fromAlgebraic(targetSquare);
    
    // Determine source
    const file = moveStr[0];
    let pawns;
    
    if (game.currentTurn === 'white') {
      pawns = game.board.pieces.filter(p => 
        p.symbol === 'P' && p.position.col === file.charCodeAt(0) - 97
      );
    } else {
      pawns = game.board.pieces.filter(p => 
        p.symbol === 'p' && p.position.col === file.charCodeAt(0) - 97
      );
    }
    
    // Find the pawn that can legally move to the target
    for (const pawn of pawns) {
      if (pawn.isValidMove(game.board, to)) {
        return [pawn.position, to];
      }
    }
  }
  
  // Knight move like "Nf3"
  if (/^N[a-h][1-8]/.test(moveStr)) {
    const targetSquare = moveStr.substring(1);
    const to = Position.fromAlgebraic(targetSquare);
    
    // Find knights that can move to the target
    const knights = game.board.pieces.filter(p => 
      (p.symbol === 'N' || p.symbol === 'n') && 
      p.color === game.currentTurn &&
      p.isValidMove(game.board, to)
    );
    
    if (knights.length > 0) {
      return [knights[0].position, to];
    }
  }
  
  // Bishop move like "Bd3"
  if (/^B[a-h][1-8]/.test(moveStr)) {
    const targetSquare = moveStr.substring(1);
    const to = Position.fromAlgebraic(targetSquare);
    
    // Find bishops that can move to the target
    const bishops = game.board.pieces.filter(p => 
      (p.symbol === 'B' || p.symbol === 'b') && 
      p.color === game.currentTurn &&
      p.isValidMove(game.board, to)
    );
    
    if (bishops.length > 0) {
      return [bishops[0].position, to];
    }
  }
  
  // Fallback for other pieces - simplified
  return [
    Position.fromAlgebraic(moveStr.substring(0, 2)),
    Position.fromAlgebraic(moveStr.substring(2, 4))
  ];
}

/**
 * Display the chess board in the console
 * @param {Board} board - Chess board to display
 */
function displayBoard(board) {
  const symbols = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };
  
  console.log('  a b c d e f g h');
  console.log(' ┌─┬─┬─┬─┬─┬─┬─┬─┐');
  
  for (let row = 0; row < 8; row++) {
    let rowStr = `${8 - row}│`;
    
    for (let col = 0; col < 8; col++) {
      const piece = board.getPieceAt(new Position(row, col));
      if (piece) {
        rowStr += symbols[piece.symbol] + '│';
      } else {
        rowStr += ' │';
      }
    }
    
    console.log(rowStr + ` ${8 - row}`);
    
    if (row < 7) {
      console.log(' ├─┼─┼─┼─┼─┼─┼─┼─┤');
    }
  }
  
  console.log(' └─┴─┴─┴─┴─┴─┴─┴─┘');
  console.log('  a b c d e f g h');
}