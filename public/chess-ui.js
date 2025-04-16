/**
 * @fileoverview Chess UI for testing the chess engine
 *
 * Provides a graphical interface for the chess engine with board,
 * move highlights, game status, and interactive controls
 */

import {
  createGame,
  loadGameFromFEN,
  Position,
  COLORS,
  GAME_STATUS,
  Pawn,
} from "./chess-engine.js";

// Piece Unicode symbols
const pieceSymbols = {
  P: "♙", // White Pawn
  R: "♖", // White Rook
  N: "♘", // White Knight
  B: "♗", // White Bishop
  Q: "♕", // White Queen
  K: "♔", // White King
  p: "♟", // Black Pawn
  r: "♜", // Black Rook
  n: "♞", // Black Knight
  b: "♝", // Black Bishop
  q: "♛", // Black Queen
  k: "♚", // Black King
};

// Game state
let game = createGame();
let selectedSquare = null;
let boardFlipped = false;
let showLegalMoves = false;
let legalMoves = [];
let pendingPromotion = null;

// // Exposed API for network integration
export let canPlayerMove = () => true; // Will be overridden by UI manager if online

export let isOnline = () => false; // Will be overridden by UI manager if online

let moveHandler = (from, to, promotion = null) => game.makeMove(from, to, promotion);

export function setMoveHandler(handler) {
  moveHandler = handler;
}

// Initialize the board
function initializeBoard() {
  const chessboard = document.getElementById("chessboard");
  console.log("Chessboard element:", chessboard); // Debug log
  if (!chessboard) {
    console.error("Chessboard element not found");
    return;
  }

  chessboard.innerHTML = "";

  // Create squares
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      // Create the square
      const square = document.createElement("div");
      square.className = "square " + ((row + col) % 2 === 0 ? "light" : "dark");
      square.dataset.row = row;
      square.dataset.col = col;

      // Position the square based on board orientation
      const visualRow = boardFlipped ? 7 - row : row;
      const visualCol = boardFlipped ? 7 - col : col;
      square.style.gridRow = visualRow + 1;
      square.style.gridColumn = visualCol + 1;

      // Bottom row - add file coordinates (a-h)
      const isBottomRow =
        (boardFlipped && row === 0) || (!boardFlipped && row === 7);
      if (isBottomRow) {
        const fileCoord = document.createElement("div");
        fileCoord.className = "file-coord";
        fileCoord.textContent = String.fromCharCode(97 + col); // 'a' to 'h'
        square.appendChild(fileCoord);
      }

      // Left column - add rank coordinates (8-1)
      const isLeftColumn =
        (boardFlipped && col === 7) || (!boardFlipped && col === 0);
      if (isLeftColumn) {
        const rankCoord = document.createElement("div");
        rankCoord.className = "rank-coord";
        rankCoord.textContent = 8 - row; // '8' to '1'
        square.appendChild(rankCoord);
      }

      // Add click handler
      square.addEventListener("click", () => handleSquareClick(row, col));

      // Add the square to the board
      chessboard.appendChild(square);
    }
  }

  updateBoard();

  console.log("Board initialized, checking for coordinate spans...");
  const fileCoords = document.querySelectorAll(".file-coord");
  const rankCoords = document.querySelectorAll(".rank-coord");
  console.log(
    `Found ${fileCoords.length} file coordinates and ${rankCoords.length} rank coordinates`
  );
}

// Update the board with the current game state
function updateBoard() {
  // Update all squares
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.querySelector(
        `.square[data-row="${row}"][data-col="${col}"]`
      );
      if (!square) continue;

      Array.from(square.childNodes).forEach((node) => {
        if (
          !node.classList ||
          (!node.classList.contains("file-coord") &&
            !node.classList.contains("rank-coord"))
        ) {
          square.removeChild(node);
        }
      });

      // Preserve any coordinate spans
      const fileCoord = square.querySelector(".file-coord");
      const rankCoord = square.querySelector(".rank-coord");

      // Remove any special classes
      square.classList.remove(
        "selected",
        "move-highlight",
        "capture-highlight",
        "check"
      );

      // Get the piece at this position
      const piece = game.board.getPieceAt(new Position(row, col));
      if (piece) {
        // Create a text node for the piece
        const pieceNode = document.createTextNode(pieceSymbols[piece.symbol]);

        // Insert piece text at the beginning of the square
        if (square.firstChild) {
          square.insertBefore(pieceNode, square.firstChild);
        } else {
          square.appendChild(pieceNode);
        }
      }

      // Re-add coordinate spans if they were removed
      if (fileCoord && !square.contains(fileCoord)) {
        square.appendChild(fileCoord);
      }
      if (rankCoord && !square.contains(rankCoord)) {
        square.appendChild(rankCoord);
      }
    }
  }

  // Highlight the selected square
  if (selectedSquare) {
    const square = document.querySelector(
      `.square[data-row="${selectedSquare.row}"][data-col="${selectedSquare.col}"]`
    );

    if (square) {
      square.classList.add("selected");

      // Highlight legal moves if enabled
      if (showLegalMoves) {
        for (const move of legalMoves) {
          const moveSquare = document.querySelector(
            `.square[data-row="${move.row}"][data-col="${move.col}"]`
          );

          if (moveSquare) {
            // Check if this would be a capture
            const targetPiece = game.board.getPieceAt(move);
            if (targetPiece) {
              moveSquare.classList.add("capture-highlight");
            } else {
              moveSquare.classList.add("move-highlight");
            }
          }
        }
      }
    }
  }

  // Highlight king in check
  if (
    game.gameStatus === GAME_STATUS.CHECK ||
    game.gameStatus === GAME_STATUS.CHECKMATE_WHITE ||
    game.gameStatus === GAME_STATUS.CHECKMATE_BLACK
  ) {
    const colorInCheck = game.currentTurn;
    const king = game.board.getKing(colorInCheck);

    if (king) {
      const square = document.querySelector(
        `.square[data-row="${king.position.row}"][data-col="${king.position.col}"]`
      );

      if (square) {
        square.classList.add("check");
      }
    }
  }

  // Update game status
  updateStatus();

  // Update move log
  updateMoveLog();

  // Update FEN display
  const fenInput = document.getElementById("fen-input");
  if (fenInput) {
    fenInput.value = game.getFEN();
  }
}

// Handle square clicks
function handleSquareClick(row, col) {
  const position = new Position(row, col);

  // In online games, only allow moves if it's your turn
  if (!canPlayerMove()) {
    console.log("Not your turn");
    return;
  }

  // If there's a pending promotion, ignore clicks
  if (pendingPromotion) return;

  // If no square is selected yet
  if (!selectedSquare) {
    const piece = game.board.getPieceAt(position);

    // Can only select a piece of the current player's color
    if (piece && piece.color === game.currentTurn) {
      selectedSquare = position;
      legalMoves = game.board.getLegalMovesForPiece(piece);
      updateBoard();
    }
  }
  // If a square is already selected
  else {
    // Clicking the same square deselects it
    if (selectedSquare.row === row && selectedSquare.col === col) {
      selectedSquare = null;
      legalMoves = [];
      updateBoard();
      return;
    }

    // Check if the target square is a legal move
    const isLegalMove = legalMoves.some(
      (move) => move.row === row && move.col === col
    );

    if (isLegalMove) {
      // Check if this is a pawn promotion
      const piece = game.board.getPieceAt(selectedSquare);
      if (
        piece instanceof Pawn &&
        ((piece.color === COLORS.WHITE && row === 0) ||
          (piece.color === COLORS.BLACK && row === 7))
      ) {
        // Show promotion dialog
        showPromotionDialog(selectedSquare, position);
        return;
      }

      // Make the move
      moveHandler(selectedSquare, position);
    }

    // Reset selection
    selectedSquare = null;
    legalMoves = [];
    updateBoard();
  }
}

// Show promotion dialog
function showPromotionDialog(from, to) {
  pendingPromotion = { from, to };

  const promotionPopup = document.getElementById("promotion-popup");
  promotionPopup.style.display = "block";

  // Position the popup near the promotion square
  const square = document.querySelector(
    `.square[data-row="${to.row}"][data-col="${to.col}"]`
  );
  const rect = square.getBoundingClientRect();

  promotionPopup.style.top = `${rect.top}px`;
  promotionPopup.style.left = `${rect.left}px`;

  // Set up event listeners for promotion buttons
  const buttons = promotionPopup.querySelectorAll("button");
  buttons.forEach((button) => {
    const piece = button.getAttribute("data-piece");
    button.onclick = () => handlePromotion(piece);
  });
}

// Handle promotion choice
function handlePromotion(piece) {
  if (!pendingPromotion) return;

  // Hide the popup
  document.getElementById("promotion-popup").style.display = "none";

  // Make the move with the chosen promotion piece
  moveHandler(pendingPromotion.from, pendingPromotion.to, piece.toUpperCase());


  pendingPromotion = null;
  updateBoard();
}

// Execute a move in the game
export function makeMove(from, to, promotion = null) {
  // Make the move in the game
  return game.makeMove(from, to, promotion);
}

// Execute an opponent's move
export function makeOpponentMove(from, to, promotion = null) {
  return game.makeMove(from, to, promotion);
}

// Update the status message
function updateStatus() {
  const statusElement = document.getElementById("game-status");
  if (!statusElement) return;

  let status = `${game.currentTurn === 'white' ? 'White' : 'Black'} to move`;

  switch (game.gameStatus) {
    case GAME_STATUS.CHECK:
      status += " — CHECK!";
      break;
    case GAME_STATUS.CHECKMATE_WHITE:
      status = "Checkmate! White wins.";
      break;
    case GAME_STATUS.CHECKMATE_BLACK:
      status = "Checkmate! Black wins.";
      break;
    case GAME_STATUS.DRAW_STALEMATE:
      status = "Draw — stalemate.";
      break;
    case GAME_STATUS.DRAW_INSUFFICIENT:
      status = "Draw — insufficient material.";
      break;
    case GAME_STATUS.DRAW_REPETITION:
      status = "Draw — threefold repetition.";
      break;
    case GAME_STATUS.DRAW_FIFTY_MOVE:
      status = "Draw — fifty-move rule.";
      break;
  }

  statusElement.textContent = status;
}


// Update the move log
function updateMoveLog() {
  const moveLog = document.getElementById("move-log");
  if (!moveLog) return;

  moveLog.innerHTML = "";

  // Get the PGN move text
  const pgn = game.getPGNMoveText();
  const moves = pgn.split(/\d+\./).filter((s) => s.trim().length > 0);

  moves.forEach((moveText, index) => {
    const moveNumber = index + 1;
    const div = document.createElement("div");
    div.textContent = `${moveNumber}. ${moveText.trim()}`;
    moveLog.appendChild(div);
  });

  // Scroll to bottom
  moveLog.scrollTop = moveLog.scrollHeight;
}

// Set up event listeners for buttons
function setupEventListeners() {
  // New game button
  const newGameBtn = document.getElementById("new-game-btn");
  if (newGameBtn) {
    newGameBtn.addEventListener("click", () => {
      // This will be overridden by the UI manager for online games
      if (!isOnline()) {
        resetGame();
      }
    });
  }

  // Undo button
  const undoBtn = document.getElementById("undo-btn");
  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      // Only allow undo in local games
      if (isOnline()) {
        alert("Cannot undo moves in online games.");
        return;
      }
      
      const success = game.undoLastMove();
      if (success) {
        selectedSquare = null;
        legalMoves = [];
        updateBoard();
      }
    });
  }

  // Flip board button
  const flipBoardBtn = document.getElementById("flip-board-btn");
  if (flipBoardBtn) {
    flipBoardBtn.addEventListener("click", () => {
      flipBoard(!boardFlipped);
    });
  }

  // Toggle highlights button
  const toggleHighlightsBtn = document.getElementById("toggle-highlights-btn");
  if (toggleHighlightsBtn) {
    toggleHighlightsBtn.addEventListener("click", () => {
      showLegalMoves = !showLegalMoves;
      toggleHighlightsBtn.textContent = showLegalMoves
        ? "Hide Legal Moves"
        : "Show Legal Moves";
      updateBoard();
    });
  }

  // Load FEN button
  const loadFenBtn = document.getElementById("load-fen-btn");
  const fenInput = document.getElementById("fen-input");

  if (loadFenBtn && fenInput) {
    loadFenBtn.addEventListener("click", () => {
      // Only allow loading FEN in local games
      if (isOnline()) {
        alert("Cannot load positions in online games.");
        return;
      }
      
      const fen = fenInput.value;
      try {
        game = loadGameFromFEN(fen);
        selectedSquare = null;
        legalMoves = [];
        updateBoard();
      } catch (error) {
        alert("Invalid FEN: " + error.message);
      }
    });
  }
}

// Reset the game to initial state
export function resetGame() {
  game.reset();
  selectedSquare = null;
  legalMoves = [];
  updateBoard();
}

// Flip the chess board
export function flipBoard(flip) {
  boardFlipped = flip;
  initializeBoard();
}

// Initialize the UI
export function initChessUI() {
  initializeBoard();
  setupEventListeners();
}

export { updateBoard };

// Automatically initialize when imported
document.addEventListener("DOMContentLoaded", () => {
  // Initialize the UI
  initChessUI();

  console.log("Chess UI initialization complete");
});