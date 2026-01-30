import { Scene } from './rendering/Scene';
import { Game } from './game/Game';
import { PieceFactory } from './rendering/models/PieceFactory';
import { AIPlayer } from './ai/AIPlayer';
import { InputHandler } from './game/InputHandler';
import type { GameStatus, PlayerColor, PieceType, Move } from './types';

// Store info about captures and moves for feedback
let lastCapturedPiece: { type: PieceType; color: PlayerColor } | null = null;
let lastPlayerMove: { move: Move; pieceType: PieceType; captured: { type: PieceType; color: PlayerColor } | null } | null = null;

async function init(): Promise<void> {
  const container = document.getElementById('app');

  if (!container) {
    console.error('Could not find #app container');
    return;
  }

  // Initialize components
  const scene = new Scene(container, 12);
  const game = new Game(12);
  const pieceFactory = new PieceFactory();
  const ai = new AIPlayer('black');
  const inputHandler = new InputHandler(scene, game);

  // Load 3D models before setting up the game
  await pieceFactory.loadModels();

  // Setup initial position
  game.setupInitialPosition();

  // Create piece meshes for all pieces
  for (const piece of game.getBoard().getAllPieces()) {
    const mesh = pieceFactory.createPieceMesh(piece.type, piece.color);
    scene.addPieceMesh(piece.id, mesh, piece.position);
  }

  // Wire game events to scene
  game.onPieceMoved = (move) => {
    scene.updatePiecePosition(move.pieceId, move.to);

    const piece = game.getBoard().getPiece(move.pieceId);
    if (piece) {
      if (piece.color === 'white') {
        // Store player move for display alongside AI move
        lastPlayerMove = {
          move,
          pieceType: piece.type,
          captured: lastCapturedPiece,
        };
        lastCapturedPiece = null;
      } else {
        // Show both player and AI moves together
        showMoveLog(lastPlayerMove, { move, pieceType: piece.type, captured: lastCapturedPiece });
        lastCapturedPiece = null;
        lastPlayerMove = null;
      }
    }
  };

  game.onPieceCaptured = (pieceId, pieceType, pieceColor) => {
    scene.removePieceMesh(pieceId);
    lastCapturedPiece = { type: pieceType, color: pieceColor };
  };

  game.onGameOver = (status: GameStatus, winner: PlayerColor | null) => {
    inputHandler.setEnabled(false);

    let message: string;
    if (status === 'checkmate') {
      message = winner === 'white' ? 'Checkmate! You win!' : 'Checkmate! AI wins!';
    } else {
      message = 'Stalemate! The game is a draw.';
    }

    showGameOverMessage(message);
  };

  game.onTurnChanged = (turn) => {
    updateTurnIndicator(turn, game.getGameStatus());

    if (turn === 'black' && !game.isGameOver()) {
      inputHandler.setEnabled(false);
      ai.makeMove(game).then(() => {
        if (!game.isGameOver()) {
          inputHandler.setEnabled(true);
        }
      }).catch((err) => {
        console.error('AI move error:', err);
        inputHandler.setEnabled(true);
      });
    } else if (turn === 'white' && !game.isGameOver()) {
      // Safety: ensure input is enabled when it's the player's turn
      inputHandler.setEnabled(true);
    }
  };

  // Create UI
  createUI(container);
  updateTurnIndicator('white', game.getGameStatus());

  // Start render loop
  scene.startRenderLoop();

  console.log('Chess game initialized!');
}

function createUI(container: HTMLElement): void {
  const uiContainer = document.createElement('div');
  uiContainer.id = 'game-ui';
  uiContainer.style.cssText = `
    position: absolute;
    top: 20px;
    left: 20px;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 18px;
    text-shadow: 1px 1px 2px black;
    pointer-events: none;
  `;

  const turnIndicator = document.createElement('div');
  turnIndicator.id = 'turn-indicator';
  uiContainer.appendChild(turnIndicator);

  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'status-indicator';
  statusIndicator.style.marginTop = '10px';
  uiContainer.appendChild(statusIndicator);

  const moveLog = document.createElement('div');
  moveLog.id = 'move-log';
  moveLog.style.cssText = `
    margin-top: 15px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 5px;
    font-size: 14px;
    max-width: 250px;
  `;
  uiContainer.appendChild(moveLog);

  container.appendChild(uiContainer);
}

function updateTurnIndicator(turn: PlayerColor, status: GameStatus): void {
  const turnIndicator = document.getElementById('turn-indicator');
  const statusIndicator = document.getElementById('status-indicator');

  if (turnIndicator) {
    turnIndicator.textContent = turn === 'white' ? 'Your turn (White)' : 'AI thinking...';
  }

  if (statusIndicator) {
    if (status === 'check') {
      statusIndicator.textContent = 'Check!';
      statusIndicator.style.color = '#ff6b6b';
    } else {
      statusIndicator.textContent = '';
    }
  }
}

function formatPosition(x: number, y: number): string {
  const col = String.fromCharCode(65 + x); // A, B, C, etc.
  const row = y + 1;
  return `${col}${row}`;
}

function formatPieceType(type: PieceType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

interface MoveInfo {
  move: Move;
  pieceType: PieceType;
  captured: { type: PieceType; color: PlayerColor } | null;
}

function showMoveLog(playerMove: MoveInfo | null, aiMove: MoveInfo): void {
  const moveLog = document.getElementById('move-log');
  if (!moveLog) return;

  let logText = '';

  // Show player move
  if (playerMove) {
    const from = formatPosition(playerMove.move.from.x, playerMove.move.from.y);
    const to = formatPosition(playerMove.move.to.x, playerMove.move.to.y);
    const pieceName = formatPieceType(playerMove.pieceType);

    logText += `<strong>You moved:</strong> ${pieceName} ${from} → ${to}`;

    if (playerMove.captured) {
      const capturedName = formatPieceType(playerMove.captured.type);
      logText += `<br><span style="color: #4CAF50;">Captured ${capturedName}!</span>`;
    }

    logText += '<hr style="border-color: rgba(255,255,255,0.3); margin: 8px 0;">';
  }

  // Show AI move
  const from = formatPosition(aiMove.move.from.x, aiMove.move.from.y);
  const to = formatPosition(aiMove.move.to.x, aiMove.move.to.y);
  const pieceName = formatPieceType(aiMove.pieceType);

  logText += `<strong>AI moved:</strong> ${pieceName} ${from} → ${to}`;

  if (aiMove.captured) {
    const capturedName = formatPieceType(aiMove.captured.type);
    logText += `<br><span style="color: #ff6b6b;">Captured your ${capturedName}!</span>`;
  }

  moveLog.innerHTML = logText;

  // Brief highlight animation
  moveLog.style.background = 'rgba(100, 50, 50, 0.8)';
  setTimeout(() => {
    moveLog.style.background = 'rgba(0, 0, 0, 0.6)';
  }, 500);
}

function showGameOverMessage(message: string): void {
  const existingOverlay = document.getElementById('game-over-overlay');
  if (existingOverlay) return;

  const overlay = document.createElement('div');
  overlay.id = 'game-over-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 40px 60px;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    font-size: 24px;
    text-align: center;
    z-index: 1000;
  `;

  overlay.innerHTML = `
    <div>${message}</div>
    <button onclick="location.reload()" style="
      margin-top: 20px;
      padding: 10px 30px;
      font-size: 18px;
      cursor: pointer;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
    ">Play Again</button>
  `;

  document.body.appendChild(overlay);
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
