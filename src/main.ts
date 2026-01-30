import { Scene } from './rendering/Scene';
import { Game } from './game/Game';
import { PieceFactory } from './rendering/models/PieceFactory';
import { AIPlayer } from './ai/AIPlayer';
import { InputHandler } from './game/InputHandler';
import type { GameStatus, PlayerColor } from './types';

function init(): void {
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
  };

  game.onPieceCaptured = (pieceId) => {
    scene.removePieceMesh(pieceId);
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
      });
    }
  };

  // Create UI
  createUI(container);
  updateTurnIndicator('white', 'playing');

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
