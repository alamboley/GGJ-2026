import { Scene } from './rendering/Scene';
import { Game } from './game/Game';
import { PieceFactory } from './rendering/models/PieceFactory';
import { AIPlayer } from './ai/AIPlayer';
import { InputHandler } from './game/InputHandler';
import type { GameStatus, PlayerColor, PieceType, Move } from './types';

// Store info about captures and moves for feedback
let lastCapturedPiece: { type: PieceType; color: PlayerColor } | null = null;
let lastPlayerMove: { move: Move; pieceType: PieceType; captured: { type: PieceType; color: PlayerColor } | null } | null = null;

// Minimap references
let minimapCanvas: HTMLCanvasElement | null = null;
let minimapCtx: CanvasRenderingContext2D | null = null;
let gameRef: Game | null = null;

// Piece symbols for minimap
const PIECE_SYMBOLS: Record<PieceType, string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: 'P',
};

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
    updateMinimap();

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
    updateMinimap();
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

  // Create and initialize minimap
  gameRef = game;
  createMinimap(container);
  updateMinimap();

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

function createMinimap(container: HTMLElement): void {
  const minimapContainer = document.createElement('div');
  minimapContainer.id = 'minimap-container';
  minimapContainer.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.7);
    padding: 10px;
    border-radius: 8px;
    pointer-events: none;
  `;

  const title = document.createElement('div');
  title.style.cssText = `
    color: white;
    font-family: Arial, sans-serif;
    font-size: 14px;
    text-align: center;
    margin-bottom: 8px;
    text-shadow: 1px 1px 2px black;
  `;
  title.textContent = 'Board Overview';
  minimapContainer.appendChild(title);

  // Legend
  const legend = document.createElement('div');
  legend.style.cssText = `
    color: white;
    font-family: Arial, sans-serif;
    font-size: 11px;
    margin-bottom: 6px;
    display: flex;
    justify-content: center;
    gap: 15px;
  `;
  legend.innerHTML = `
    <span><span style="color: #4fc3f7;">■</span> You</span>
    <span><span style="color: #ff6b6b;">■</span> Enemy</span>
  `;
  minimapContainer.appendChild(legend);

  minimapCanvas = document.createElement('canvas');
  const size = 240; // 12x12 grid, 20px per cell
  minimapCanvas.width = size;
  minimapCanvas.height = size;
  minimapCanvas.style.cssText = `
    border: 2px solid #444;
    border-radius: 4px;
  `;
  minimapContainer.appendChild(minimapCanvas);

  minimapCtx = minimapCanvas.getContext('2d');
  container.appendChild(minimapContainer);
}

function updateMinimap(): void {
  if (!minimapCtx || !minimapCanvas || !gameRef) return;

  const boardSize = 12;
  const cellSize = minimapCanvas.width / boardSize;
  const ctx = minimapCtx;

  // Clear canvas
  ctx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

  // Draw board squares
  for (let x = 0; x < boardSize; x++) {
    for (let y = 0; y < boardSize; y++) {
      const isLight = (x + y) % 2 === 0;
      ctx.fillStyle = isLight ? '#d4c4a8' : '#8b7355';
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  // Draw pieces
  const pieces = gameRef.getBoard().getAllPieces();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const piece of pieces) {
    const x = piece.position.x * cellSize + cellSize / 2;
    const y = piece.position.y * cellSize + cellSize / 2;

    // Draw piece background circle
    ctx.beginPath();
    ctx.arc(x, y, cellSize * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = piece.color === 'white' ? '#4fc3f7' : '#ff6b6b';
    ctx.fill();
    ctx.strokeStyle = piece.color === 'white' ? '#0288d1' : '#c62828';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw piece symbol
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${cellSize * 0.5}px Arial`;
    ctx.fillText(PIECE_SYMBOLS[piece.type], x, y + 1);
  }

  // Draw grid lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= boardSize; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, minimapCanvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(minimapCanvas.width, i * cellSize);
    ctx.stroke();
  }
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
