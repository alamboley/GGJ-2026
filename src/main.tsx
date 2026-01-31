import { createRoot, Root } from 'react-dom/client';
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
import { SettingsManager } from './ui/SettingsManager';
import { MainMenu } from './ui/MainMenu';
import { GameSettings } from './ui/GameSettings';
import type { GameStatus, PlayerColor, PieceType, Move, GameConfig } from './types';

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
let settingsManagerRef: SettingsManager | null = null;

// Shared resources
let pieceFactoryRef: PieceFactory | null = null;
let containerRef: HTMLElement | null = null;

// Menu references
let menuRoot: Root | null = null;
let menuContainer: HTMLElement | null = null;

// Settings screen references
let settingsRoot: Root | null = null;
let settingsContainer: HTMLElement | null = null;

// Background scene reference (used for menu/settings)
let backgroundSceneRef: Scene | null = null;

// Current game config
let currentConfig: GameConfig = { boardSize: 12, pawnsPerPlayer: 8 };

async function initGame(config: GameConfig, existingScene?: Scene): Promise<void> {
  if (!containerRef) {
    console.error('Container not available');
    return;
  }

  // Reset capture tracking
  lastCapturedPiece = null;
  pendingCaptureId = null;
  pendingCaptureColor = null;

  // Use existing scene or create new one
  const scene = existingScene ?? new Scene(containerRef, config.boardSize);
  const game = new Game(config);
  const ai = new AIPlayer('black');
  const inputHandler = new InputHandler(scene, game);

  // Create animation manager
  const animationManager = new AnimationManager(scene);
  scene.setAnimationManager(animationManager);

  // Ensure models are loaded
  if (!pieceFactoryRef) {
    pieceFactoryRef = new PieceFactory();
    await pieceFactoryRef.loadModels();
  }

  // Set piece factory on scene for masking
  scene.setPieceFactory(pieceFactoryRef);

  // Setup initial position
  game.setupInitialPosition();

  // Create piece meshes for all pieces
  for (const piece of game.getBoard().getAllPieces()) {
    const mesh = pieceFactoryRef.createPieceMesh(piece.type, piece.color);
    scene.addPieceMesh(piece.id, mesh, piece.position);

    // Mask enemy pieces (black) so player can't see what they are
    if (piece.color === 'black') {
      scene.maskPiece(piece.id);
    }
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

    // Remove the fog mask when an enemy piece is captured (reveal what it was)
    scene.unmaskPiece(pieceId);

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
      // Small delay before AI moves for better game feel
      setTimeout(() => {
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
      }, 800);
    } else if (turn === 'white' && !game.isGameOver()) {
      // Safety: ensure input is enabled when it's the player's turn
      inputHandler.setEnabled(true);
    }
  };

  // Store references for callbacks
  gameRef = game;
  sceneRef = scene;

  // Create UI manager
  uiManagerRef = new UIManager(containerRef, config.boardSize);
  uiManagerRef.updateTurnIndicator('white', game.getGameStatus());

  // Create Minimap manager
  minimapManagerRef = new MinimapManager(containerRef, game, inputHandler);
  minimapManagerRef.update();

  // Set up mask toggle callback
  const enemyPieceIds = game.getBoard().getAllPieces()
    .filter(p => p.color === 'black')
    .map(p => p.id);

  uiManagerRef.setMaskToggleCallback((enabled: boolean) => {
    if (enabled) {
      // Re-mask all enemy pieces that still exist
      for (const pieceId of enemyPieceIds) {
        const piece = game.getBoard().getPiece(pieceId);
        if (piece && !scene.isPieceMasked(pieceId)) {
          scene.maskPiece(pieceId);
        }
      }
    } else {
      // Unmask all pieces
      scene.unmaskAllPieces();
    }
    // Update minimap
    minimapManagerRef?.setMasksEnabled(enabled);
  });

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

  // Create or update SettingsManager
  if (!settingsManagerRef) {
    settingsManagerRef = new SettingsManager(containerRef, config);
    settingsManagerRef.setRestartCallback(restartGame);
  }

  // Wire up settings button to toggle the settings panel
  uiManagerRef.setSettingsCallback(() => {
    settingsManagerRef?.togglePanel();
  });

  // Wire up exit button to return to menu
  uiManagerRef.setExitCallback(() => {
    returnToMenu();
  });

  // Update check indicator for initial state (king might start in check with random placement)
  updateCheckIndicator();

  // Start render loop only if we created a new scene
  if (!existingScene) {
    scene.startRenderLoop();
  }

  console.log(`Chess game initialized! Board: ${config.boardSize}x${config.boardSize}, Pawns: ${config.pawnsPerPlayer}`);
}

async function restartGame(config: GameConfig): Promise<void> {
  currentConfig = config;

  // Dispose old resources
  if (sceneRef) {
    sceneRef.dispose();
    sceneRef = null;
  }

  // Remove old UI elements
  const gameUI = document.getElementById('game-ui');
  if (gameUI) gameUI.remove();

  const moveLog = document.getElementById('move-log');
  if (moveLog) moveLog.remove();

  const minimapContainer = document.getElementById('minimap-container');
  if (minimapContainer) minimapContainer.remove();

  const gameOverOverlay = document.getElementById('game-over-overlay');
  if (gameOverOverlay) gameOverOverlay.remove();

  const exitButton = document.getElementById('exit-button');
  if (exitButton) exitButton.remove();

  // Clear references
  gameRef = null;
  uiManagerRef = null;
  minimapManagerRef = null;
  rewindManagerRef = null;

  // Re-initialize game with new config
  await initGame(config);
}

function updateBackgroundScene(boardSize: number): void {
  if (!containerRef) return;

  // Dispose old background scene
  if (backgroundSceneRef) {
    backgroundSceneRef.dispose();
  }

  // Create new scene with updated board size
  backgroundSceneRef = new Scene(containerRef, boardSize);
  backgroundSceneRef.startRenderLoop();
}

function showSettings(): void {
  if (!containerRef) return;

  // Create settings container
  settingsContainer = document.createElement('div');
  settingsContainer.id = 'settings-root';
  containerRef.appendChild(settingsContainer);

  settingsRoot = createRoot(settingsContainer);
  settingsRoot.render(
    <GameSettings
      initialConfig={currentConfig}
      onBoardSizeChange={(boardSize: number) => {
        // Update 3D scene in real-time when board size changes
        updateBackgroundScene(boardSize);
      }}
      onLaunch={(config: GameConfig) => {
        currentConfig = config;

        // Hide settings with fade effect
        if (settingsContainer) {
          settingsContainer.style.transition = 'opacity 0.3s ease-out';
          settingsContainer.style.opacity = '0';
        }

        // After fade, unmount settings and start game
        setTimeout(async () => {
          if (settingsRoot) {
            settingsRoot.unmount();
            settingsRoot = null;
          }
          if (settingsContainer) {
            settingsContainer.remove();
            settingsContainer = null;
          }

          // Use the current background scene (already has correct board size)
          await initGame(currentConfig, backgroundSceneRef!);
        }, 300);
      }}
      onBack={() => {
        // Hide settings with fade effect
        if (settingsContainer) {
          settingsContainer.style.transition = 'opacity 0.3s ease-out';
          settingsContainer.style.opacity = '0';
        }

        // After fade, unmount settings and show main menu
        setTimeout(() => {
          if (settingsRoot) {
            settingsRoot.unmount();
            settingsRoot = null;
          }
          if (settingsContainer) {
            settingsContainer.remove();
            settingsContainer = null;
          }

          // Show main menu again
          showMainMenu();
        }, 300);
      }}
    />
  );
}

function showMainMenu(): void {
  if (!containerRef) return;

  menuContainer = document.createElement('div');
  menuContainer.id = 'menu-root';
  containerRef.appendChild(menuContainer);

  menuRoot = createRoot(menuContainer);
  menuRoot.render(
    <MainMenu
      onStart={() => {
        // Hide menu with fade effect
        if (menuContainer) {
          menuContainer.style.transition = 'opacity 0.3s ease-out';
          menuContainer.style.opacity = '0';
        }

        // After fade, unmount menu and show settings
        setTimeout(() => {
          if (menuRoot) {
            menuRoot.unmount();
            menuRoot = null;
          }
          if (menuContainer) {
            menuContainer.remove();
            menuContainer = null;
          }

          // Show game settings screen
          showSettings();
        }, 300);
      }}
    />
  );
}

async function returnToMenu(): Promise<void> {
  // Dispose game scene (but not the background scene)
  if (sceneRef) {
    sceneRef.dispose();
    sceneRef = null;
  }

  // Remove all game UI elements
  const gameUI = document.getElementById('game-ui');
  if (gameUI) gameUI.remove();

  const moveLog = document.getElementById('move-log');
  if (moveLog) moveLog.remove();

  const minimapContainer = document.getElementById('minimap-container');
  if (minimapContainer) minimapContainer.remove();

  const gameOverOverlay = document.getElementById('game-over-overlay');
  if (gameOverOverlay) gameOverOverlay.remove();

  const exitButton = document.getElementById('exit-button');
  if (exitButton) exitButton.remove();

  // Remove settings panel if open
  const settingsPanel = document.getElementById('settings-panel');
  if (settingsPanel) settingsPanel.remove();

  // Clear game references
  gameRef = null;
  uiManagerRef = null;
  minimapManagerRef = null;
  rewindManagerRef = null;
  settingsManagerRef = null;

  // Create a fresh background scene
  if (!containerRef) return;
  backgroundSceneRef = new Scene(containerRef, currentConfig.boardSize);
  backgroundSceneRef.startRenderLoop();

  // Show the main menu
  showMainMenu();
}

async function init(): Promise<void> {
  const container = document.getElementById('app');

  if (!container) {
    console.error('Could not find #app container');
    return;
  }

  containerRef = container;

  // Create a background scene (visible behind the menu)
  backgroundSceneRef = new Scene(container, currentConfig.boardSize);
  backgroundSceneRef.startRenderLoop();

  // Show the main menu
  showMainMenu();
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
