import * as THREE from 'three';
import type { Game } from './Game';
import type { Scene } from '../rendering/Scene';
import type { AnimationManager } from '../rendering/AnimationManager';
import type { UIManager } from '../ui/UIManager';
import type { MinimapManager } from '../ui/MinimapManager';
import type { InputHandler } from './InputHandler';
import type { MoveHistoryEntry } from '../types';

export interface RewindManagerDeps {
  game: Game;
  scene: Scene;
  animationManager: AnimationManager;
  uiManager: UIManager;
  minimapManager: MinimapManager;
  inputHandler: InputHandler;
  onCheckIndicatorUpdate: () => void;
}

export class RewindManager {
  private game: Game;
  private scene: Scene;
  private animationManager: AnimationManager;
  private uiManager: UIManager;
  private minimapManager: MinimapManager;
  private inputHandler: InputHandler;
  private onCheckIndicatorUpdate: () => void;
  private isRewinding: boolean = false;

  constructor(deps: RewindManagerDeps) {
    this.game = deps.game;
    this.scene = deps.scene;
    this.animationManager = deps.animationManager;
    this.uiManager = deps.uiManager;
    this.minimapManager = deps.minimapManager;
    this.inputHandler = deps.inputHandler;
    this.onCheckIndicatorUpdate = deps.onCheckIndicatorUpdate;

    // Set up the rewind callback
    this.uiManager.setRewindCallback(() => this.rewind());
  }

  /**
   * Check if rewind is currently possible
   */
  canRewind(): boolean {
    return (
      this.game.canUndo() &&
      this.game.getCurrentTurn() === 'white' &&
      !this.isRewinding &&
      !this.animationManager.isAnimating()
    );
  }

  /**
   * Update the rewind button state based on current conditions
   */
  updateButtonState(): void {
    this.uiManager.setRewindEnabled(this.canRewind());
  }

  /**
   * Execute rewind - undo both AI move and player move to get back to player's previous turn
   */
  async rewind(): Promise<void> {
    if (this.isRewinding || this.animationManager.isAnimating()) return;

    // We need to undo TWO moves: AI move + Player move (to get back to player's previous turn)
    // But only if there are at least 2 moves (or 1 if at game start)
    const historyLength = this.game.getMoveHistoryLength();
    if (historyLength === 0) return;

    this.isRewinding = true;
    this.inputHandler.setEnabled(false);
    this.uiManager.setRewindEnabled(false);

    // Remove game over overlay if present
    this.uiManager.removeGameOverOverlay();

    // Clear move log
    this.uiManager.clearMoveLog();

    // Undo AI move first (if we're at player's turn, last move was AI's)
    if (historyLength >= 1) {
      const aiEntry = this.game.undoLastMove();
      if (aiEntry) {
        await this.rewindSingleMove(aiEntry);
      }
    }

    // Undo player's move (if there was one)
    if (this.game.getMoveHistoryLength() >= 1) {
      const playerEntry = this.game.undoLastMove();
      if (playerEntry) {
        await this.rewindSingleMove(playerEntry);
      }
    }

    // Update UI state
    this.uiManager.updateTurnIndicator(this.game.getCurrentTurn(), this.game.getGameStatus());
    this.minimapManager.update();
    this.onCheckIndicatorUpdate();

    this.isRewinding = false;
    this.inputHandler.setEnabled(true);
    this.updateButtonState();
  }

  /**
   * Rewind a single move with animation
   */
  private async rewindSingleMove(entry: MoveHistoryEntry): Promise<void> {
    let restoredMesh: THREE.Object3D | undefined;

    // If there was a captured piece, restore it from the captured area
    if (entry.capturedPiece) {
      const mesh = this.scene.restoreCapturedPiece(
        entry.capturedPiece.id,
        entry.capturedPiece.color
      );
      if (mesh) {
        restoredMesh = mesh;
      }
    }

    // Play the rewind animation
    await this.animationManager.playRewindSequence(entry, restoredMesh);
  }
}
