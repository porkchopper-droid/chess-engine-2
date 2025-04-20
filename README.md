# ♟️ Chess Engine 2.0 (P2P with Socket.IO)

A lightweight multiplayer chess game built with vanilla JavaScript, Socket.IO, and SCSS.  
Play locally or online with a friend — no backend database.

## 🚀 Features

- Full chess rules (castling, en passant, promotion, check/checkmate)
- Peer-to-peer multiplayer via Socket.IO
- Local play option
- Simple, responsive UI
- FEN & PGN support

## 📦 Tech Stack

- Vanilla JavaScript (ES Modules)
- Socket.IO (v4)
- Express (Node.js)
- SCSS (compiled to CSS)
- Hosted on: Render — full-stack deployment (Express backend + static frontend)


## 🧱 Project Structure

### UI / Frontend
- `chess-ui.js` — Main UI controller: handles DOM rendering, click events, board highlights, promotion UI
- `chess-styles.css` / `scss` — SCSS/CSS styling for board, highlights, coordinate markers, and controls
- `index.html` — Standalone test runner for in-browser debugging and UI development
- `chess-ui-manager.js` — Manages socket synchronization, online/offline modes, player roles, and move relaying

### Core Engine
- `chess-engine.js` — Barrel file: exports public API for all engine modules
- `game.js` — Manages game state, turn control, move history, FEN/PGN notation, and game status
- `board.js` — Manages the board grid, applies and validates moves, detects checks/checkmates
- `pieces.js` — Defines piece classes (`Pawn`, `Rook`, `Knight`, etc.), with individual move logic
- `position.js` — Converts between algebraic notation (`e4`) and row/column indexes
- `constants.js` — Defines shared constants: piece symbols, colors, board labels, game status enums

### Multiplayer / API
- `chess-api.js` — Bridge for future multiplayer functionality, synchronizing state across sockets
- `chess-network.js` — Socket.IO connection layer: emits/receives events, manages server-client handshake and message routing
