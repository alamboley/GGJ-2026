import type { GameStatus, PlayerColor, PieceType, Move } from '../types';
import { isMobile, onViewportChange } from '../utils/mobileDetection';

export interface MoveInfo {
  move: Move;
  pieceType: PieceType;
  captured: { type: PieceType; color: PlayerColor } | null;
}

export class UIManager {
  private container: HTMLElement;
  private boardSize: number;
  private rewindCallback: (() => void) | null = null;
  private rewindButton: HTMLButtonElement | null = null;
  private maskToggleCallback: ((enabled: boolean) => void) | null = null;
  private settingsCallback: (() => void) | null = null;
  private exitCallback: (() => void) | null = null;
  private masksEnabled: boolean = true;

  // Mobile state
  private isMobileView: boolean = false;
  private unsubscribeViewport: (() => void) | null = null;

  // UI element references for responsive updates
  private uiContainer: HTMLDivElement | null = null;
  private moveLog: HTMLDivElement | null = null;
  private exitButton: HTMLButtonElement | null = null;
  private maskToggleButton: HTMLButtonElement | null = null;
  private settingsButton: HTMLButtonElement | null = null;

  constructor(container: HTMLElement, boardSize: number = 12) {
    this.container = container;
    this.boardSize = boardSize;
    this.isMobileView = isMobile();
    this.createUI();

    // Listen for viewport changes
    this.unsubscribeViewport = onViewportChange((nowMobile) => {
      this.isMobileView = nowMobile;
      this.updateLayoutForViewport();
    });
  }

  private createUI(): void {
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'game-ui';
    this.updateUIContainerStyles();

    const turnIndicator = document.createElement('div');
    turnIndicator.id = 'turn-indicator';
    this.uiContainer.appendChild(turnIndicator);

    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'status-indicator';
    statusIndicator.style.marginTop = '10px';
    this.uiContainer.appendChild(statusIndicator);

    // Button container for layout control
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'button-container';
    this.updateButtonContainerStyles(buttonContainer);

    const rewindButton = document.createElement('button');
    rewindButton.id = 'rewind-button';
    rewindButton.textContent = 'Rewind';
    this.applyButtonStyles(rewindButton, 'default');
    rewindButton.style.opacity = '0.5';
    rewindButton.disabled = true;
    rewindButton.addEventListener('click', () => {
      if (this.rewindCallback && !rewindButton.disabled) {
        this.rewindCallback();
      }
    });
    rewindButton.addEventListener('mouseenter', () => {
      if (!rewindButton.disabled) {
        rewindButton.style.background = 'rgba(50, 50, 50, 0.9)';
      }
    });
    rewindButton.addEventListener('mouseleave', () => {
      rewindButton.style.background = 'rgba(0, 0, 0, 0.7)';
    });
    this.rewindButton = rewindButton;
    buttonContainer.appendChild(rewindButton);

    // Mask toggle button
    this.maskToggleButton = document.createElement('button');
    this.maskToggleButton.id = 'mask-toggle-button';
    this.maskToggleButton.textContent = 'Mask: ON';
    this.applyButtonStyles(this.maskToggleButton, 'mask');
    this.maskToggleButton.addEventListener('click', () => {
      this.masksEnabled = !this.masksEnabled;
      this.maskToggleButton!.textContent = this.masksEnabled ? 'Mask: ON' : 'Mask: OFF';
      this.maskToggleButton!.style.background = this.masksEnabled
        ? 'rgba(75, 0, 130, 0.7)'
        : 'rgba(50, 50, 50, 0.7)';
      if (this.maskToggleCallback) {
        this.maskToggleCallback(this.masksEnabled);
      }
    });
    this.maskToggleButton.addEventListener('mouseenter', () => {
      this.maskToggleButton!.style.background = this.masksEnabled
        ? 'rgba(100, 0, 180, 0.9)'
        : 'rgba(70, 70, 70, 0.9)';
    });
    this.maskToggleButton.addEventListener('mouseleave', () => {
      this.maskToggleButton!.style.background = this.masksEnabled
        ? 'rgba(75, 0, 130, 0.7)'
        : 'rgba(50, 50, 50, 0.7)';
    });
    buttonContainer.appendChild(this.maskToggleButton);

    // Settings button
    this.settingsButton = document.createElement('button');
    this.settingsButton.id = 'settings-button';
    this.settingsButton.innerHTML = '&#9881;';
    this.applyButtonStyles(this.settingsButton, 'settings');
    this.settingsButton.addEventListener('click', () => {
      if (this.settingsCallback) {
        this.settingsCallback();
      }
    });
    this.settingsButton.addEventListener('mouseenter', () => {
      this.settingsButton!.style.background = 'rgba(50, 50, 50, 0.9)';
      this.settingsButton!.style.transform = 'rotate(30deg)';
    });
    this.settingsButton.addEventListener('mouseleave', () => {
      this.settingsButton!.style.background = 'rgba(0, 0, 0, 0.7)';
      this.settingsButton!.style.transform = 'rotate(0deg)';
    });
    buttonContainer.appendChild(this.settingsButton);

    this.uiContainer.appendChild(buttonContainer);

    // Exit button (bottom center of screen)
    this.exitButton = document.createElement('button');
    this.exitButton.id = 'exit-button';
    this.exitButton.textContent = 'Exit to Menu';
    this.applyExitButtonStyles();
    this.exitButton.addEventListener('click', () => {
      if (this.exitCallback) {
        this.exitCallback();
      }
    });
    this.exitButton.addEventListener('mouseenter', () => {
      this.exitButton!.style.background = 'rgba(150, 50, 50, 0.9)';
    });
    this.exitButton.addEventListener('mouseleave', () => {
      this.exitButton!.style.background = 'rgba(120, 40, 40, 0.8)';
    });
    this.container.appendChild(this.exitButton);

    this.moveLog = document.createElement('div');
    this.moveLog.id = 'move-log';
    this.updateMoveLogStyles();
    this.container.appendChild(this.moveLog);

    this.container.appendChild(this.uiContainer);
  }

  private applyButtonStyles(button: HTMLButtonElement, type: 'default' | 'mask' | 'settings'): void {
    const baseStyles = `
      min-width: 44px;
      min-height: 44px;
      padding: 12px 20px;
      font-size: 14px;
      cursor: pointer;
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 5px;
      pointer-events: auto;
      transition: opacity 0.2s, background 0.2s, transform 0.2s;
      font-family: Arial, sans-serif;
      touch-action: manipulation;
      -webkit-user-select: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    `;

    if (type === 'mask') {
      button.style.cssText = baseStyles + `
        background: rgba(75, 0, 130, 0.7);
      `;
    } else if (type === 'settings') {
      button.style.cssText = baseStyles + `
        background: rgba(0, 0, 0, 0.7);
        padding: 12px 16px;
        font-size: 16px;
      `;
    } else {
      button.style.cssText = baseStyles + `
        background: rgba(0, 0, 0, 0.7);
      `;
    }
  }

  private applyExitButtonStyles(): void {
    if (!this.exitButton) return;
    const bottomOffset = this.isMobileView ? '15px' : '20px';
    const padding = this.isMobileView ? '10px 20px' : '12px 25px';
    const fontSize = this.isMobileView ? '13px' : '14px';
    this.exitButton.style.cssText = `
      position: fixed;
      bottom: ${bottomOffset};
      left: 50%;
      transform: translateX(-50%);
      min-width: 44px;
      min-height: 44px;
      padding: ${padding};
      font-size: ${fontSize};
      cursor: pointer;
      background: rgba(120, 40, 40, 0.8);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 5px;
      pointer-events: auto;
      transition: background 0.2s, transform 0.1s;
      z-index: 100;
      font-family: Arial, sans-serif;
      touch-action: manipulation;
      -webkit-user-select: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    `;
  }

  private updateUIContainerStyles(): void {
    if (!this.uiContainer) return;
    this.uiContainer.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      color: white;
      font-family: Arial, sans-serif;
      font-size: ${this.isMobileView ? '14px' : '18px'};
      text-shadow: 1px 1px 2px black;
      pointer-events: none;
    `;
  }

  private updateButtonContainerStyles(container: HTMLDivElement): void {
    container.style.cssText = `
      display: flex;
      flex-direction: ${this.isMobileView ? 'column' : 'row'};
      gap: 10px;
      margin-top: 10px;
    `;
  }

  private updateMoveLogStyles(): void {
    if (!this.moveLog) return;
    if (this.isMobileView) {
      this.moveLog.style.cssText = `
        position: fixed;
        bottom: 60px;
        left: 10px;
        right: 10px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 8px;
        font-size: 12px;
        color: white;
        font-family: Arial, sans-serif;
        z-index: 50;
      `;
    } else {
      this.moveLog.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 20px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 8px;
        font-size: 18px;
        min-width: 350px;
        min-height: 120px;
        color: white;
        font-family: Arial, sans-serif;
      `;
    }
  }

  private updateLayoutForViewport(): void {
    this.updateUIContainerStyles();
    this.updateMoveLogStyles();
    this.applyExitButtonStyles();

    // Update button container
    const buttonContainer = document.getElementById('button-container');
    if (buttonContainer) {
      this.updateButtonContainerStyles(buttonContainer as HTMLDivElement);
    }
  }

  updateTurnIndicator(turn: PlayerColor, status: GameStatus): void {
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

  showPlayerMove(playerMove: MoveInfo): void {
    if (!this.moveLog) return;

    const from = this.formatPosition(playerMove.move.from.x, playerMove.move.from.y);
    const to = this.formatPosition(playerMove.move.to.x, playerMove.move.to.y);
    const pieceName = this.formatPieceType(playerMove.pieceType);

    let logText = `<strong>You moved:</strong> ${pieceName} ${from} → ${to}`;

    if (playerMove.captured) {
      const capturedName = this.formatPieceType(playerMove.captured.type);
      logText += `<br><span style="color: #4CAF50;">Captured ${capturedName}!</span>`;
    }

    this.moveLog.innerHTML = logText;

    // Brief highlight animation
    this.moveLog.style.background = 'rgba(50, 100, 50, 0.8)';
    setTimeout(() => {
      if (this.moveLog) {
        this.moveLog.style.background = 'rgba(0, 0, 0, 0.6)';
      }
    }, 500);
  }

  showAIMove(aiMove: MoveInfo): void {
    if (!this.moveLog) return;

    // Get current content (player move) and add separator
    let logText = this.moveLog.innerHTML;
    if (logText) {
      logText += '<hr style="border-color: rgba(255,255,255,0.3); margin: 8px 0;">';
    }

    // Show AI move - hide piece type if masks are enabled
    const from = this.formatPosition(aiMove.move.from.x, aiMove.move.from.y);
    const to = this.formatPosition(aiMove.move.to.x, aiMove.move.to.y);
    const pieceName = this.masksEnabled ? '???' : this.formatPieceType(aiMove.pieceType);

    logText += `<strong>AI moved:</strong> ${pieceName} ${from} → ${to}`;

    if (aiMove.captured) {
      const capturedName = this.formatPieceType(aiMove.captured.type);
      logText += `<br><span style="color: #ff6b6b;">Captured your ${capturedName}!</span>`;
    }

    this.moveLog.innerHTML = logText;

    // Brief highlight animation
    this.moveLog.style.background = 'rgba(100, 50, 50, 0.8)';
    setTimeout(() => {
      if (this.moveLog) {
        this.moveLog.style.background = 'rgba(0, 0, 0, 0.6)';
      }
    }, 500);
  }

  showGameOverMessage(message: string): void {
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
        min-width: 44px;
        min-height: 44px;
        padding: 12px 30px;
        font-size: 18px;
        cursor: pointer;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        touch-action: manipulation;
        -webkit-user-select: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      ">Play Again</button>
    `;

    document.body.appendChild(overlay);
  }

  private formatPosition(x: number, y: number): string {
    const col = String.fromCharCode(65 + x); // A, B, C, etc.
    const row = this.boardSize - y; // Row 1 at front (high y), row boardSize at back (y=0)
    return `${col}${row}`;
  }

  private formatPieceType(type: PieceType): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Set the callback for the rewind button
   */
  setRewindCallback(callback: () => void): void {
    this.rewindCallback = callback;
  }

  /**
   * Set the callback for the mask toggle button
   */
  setMaskToggleCallback(callback: (enabled: boolean) => void): void {
    this.maskToggleCallback = callback;
  }

  /**
   * Set the callback for the settings button
   */
  setSettingsCallback(callback: () => void): void {
    this.settingsCallback = callback;
  }

  /**
   * Set the callback for the exit button
   */
  setExitCallback(callback: () => void): void {
    this.exitCallback = callback;
  }

  /**
   * Get current mask state
   */
  isMasksEnabled(): boolean {
    return this.masksEnabled;
  }

  /**
   * Enable or disable the rewind button
   */
  setRewindEnabled(enabled: boolean): void {
    if (this.rewindButton) {
      this.rewindButton.disabled = !enabled;
      this.rewindButton.style.opacity = enabled ? '1' : '0.5';
      this.rewindButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }
  }

  /**
   * Remove the game over overlay (used when rewinding after checkmate)
   */
  removeGameOverOverlay(): void {
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Clear the move log (used when rewinding)
   */
  clearMoveLog(): void {
    if (this.moveLog) {
      this.moveLog.innerHTML = '';
    }
  }

  /**
   * Cleanup event listeners
   */
  dispose(): void {
    if (this.unsubscribeViewport) {
      this.unsubscribeViewport();
      this.unsubscribeViewport = null;
    }
  }
}
