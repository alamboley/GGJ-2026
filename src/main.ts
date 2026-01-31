import { Scene } from './rendering/Scene';
import { Game } from './game/Game';
import { PieceFactory } from './rendering/models/PieceFactory';
import { AIPlayer } from './ai/AIPlayer';
import { InputHandler } from './game/InputHandler';
import { AnimationManager } from './rendering/AnimationManager';
import { RewindManager } from './game/RewindManager';
import { isKingInCheck } from './game/pieces/MoveValidator';
import { UIManager } from './ui/UIManager';
import { MinimapManager } from './ui/MinimapManager';
import type { GameStatus, PlayerColor, PieceType, Move } from './types';

// Store info about captures for feedback
let lastCapturedPiece: { type: PieceType; color: PlayerColor } | null = null;

// Track pending capture for animation
let pendingCaptureId: string | null = null;
let pendingCaptureColor: PlayerColor | null = null;

// Manager references for callbacks
let gameRef: Game | null = null;
let sceneRef: Scene | null = null;
let uiManagerRef: UIManager | null = null;
let minimapManagerRef: MinimapManager | null = null;
let rewindManagerRef: RewindManager | null = null;

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

  // Create animation manager
  const animationManager = new AnimationManager(scene);
  scene.setAnimationManager(animationManager);

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
  game.onPieceMoved = async (move: Move) => {
    const piece = game.getBoard().getPiece(move.pieceId);

    // Capture values BEFORE async operations to avoid race conditions
    // (AI move could overwrite these during player's animation)
    const capturedPieceForUI = lastCapturedPiece;
    lastCapturedPiece = null;

    const captureId = pendingCaptureId;
    const captureColor = pendingCaptureColor;
    pendingCaptureId = null;
    pendingCaptureColor = null;

    // Update UI immediately (before animation) for realtime feedback
    if (piece) {
      const moveInfo = {
        move,
        pieceType: piece.type,
        captured: capturedPieceForUI,
      };

      if (piece.color === 'white') {
        uiManagerRef?.showPlayerMove(moveInfo);
      } else {
        uiManagerRef?.showAIMove(moveInfo);
      }
    }

    // Animate all moves (both player and AI)
    if (captureId && captureColor) {
      // This is a capture move - play full cinematic sequence
      await animationManager.playCaptureSequence(move, captureId, captureColor);
    } else {
      // Simple move - just animate the movement
      await animationManager.playMoveSequence(move);
    }

    minimapManagerRef?.update();

    // Update rewind button after animation completes
    rewindManagerRef?.updateButtonState();
  };

  game.onPieceCaptured = (pieceId: string, pieceType: PieceType, pieceColor: PlayerColor) => {
    // Defer removal for animation (both player and AI captures)
    pendingCaptureId = pieceId;
    pendingCaptureColor = pieceColor;
    lastCapturedPiece = { type: pieceType, color: pieceColor };
    minimapManagerRef?.update();
  };

  game.onGameOver = (status: GameStatus, winner: PlayerColor | null) => {
    inputHandler.setEnabled(false);

    let message: string;
    if (status === 'checkmate') {
      message = winner === 'white' ? 'Checkmate! You win!' : 'Checkmate! AI wins!';
    } else {
      message = 'Stalemate! The game is a draw.';
    }

    uiManagerRef?.showGameOverMessage(message);
  };

  game.onTurnChanged = (turn: PlayerColor) => {
    uiManagerRef?.updateTurnIndicator(turn, game.getGameStatus());
    // Clear minimap selection on turn change
    minimapManagerRef?.clearSelection();
    // Update check indicator
    updateCheckIndicator();
    // Update rewind button state
    rewindManagerRef?.updateButtonState();

    if (turn === 'black' && !game.isGameOver()) {
      inputHandler.setEnabled(false);
      // Disable rewind during AI turn
      uiManagerRef?.setRewindEnabled(false);
      ai.makeMove(game).then(() => {
        if (!game.isGameOver()) {
          inputHandler.setEnabled(true);
          rewindManagerRef?.updateButtonState();
        }
      }).catch((err) => {
        console.error('AI move error:', err);
        inputHandler.setEnabled(true);
        rewindManagerRef?.updateButtonState();
      });
    } else if (turn === 'white' && !game.isGameOver()) {
      // Safety: ensure input is enabled when it's the player's turn
      inputHandler.setEnabled(true);
    }
  };

  // Store references for callbacks
  gameRef = game;
  sceneRef = scene;

  // Create UI and Minimap managers
  uiManagerRef = new UIManager(container);
  uiManagerRef.updateTurnIndicator('white', game.getGameStatus());

  minimapManagerRef = new MinimapManager(container, game, inputHandler);
  minimapManagerRef.update();

  // Create RewindManager (handles all rewind orchestration)
  rewindManagerRef = new RewindManager({
    game,
    scene,
    animationManager,
    uiManager: uiManagerRef,
    minimapManager: minimapManagerRef,
    inputHandler,
    onCheckIndicatorUpdate: updateCheckIndicator,
  });
  rewindManagerRef.updateButtonState();

  // Update check indicator for initial state (king might start in check with random placement)
  updateCheckIndicator();

  // Start render loop
  scene.startRenderLoop();

  console.log('Chess game initialized!');
}

function updateCheckIndicator(): void {
  if (!gameRef || !sceneRef) return;

  const currentTurn = gameRef.getCurrentTurn();
  const board = gameRef.getBoard();

  // Check if the current player's king is in check
  if (isKingInCheck(currentTurn, board)) {
    const king = board.findPiece('king', currentTurn);
    if (king) {
      sceneRef.showCheckIndicator(king.position);
    }
  } else {
    sceneRef.hideCheckIndicator();
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
