import type { GameStatus, PlayerColor, PieceType, Move } from '../types';

export interface MoveInfo {
  move: Move;
  pieceType: PieceType;
  captured: { type: PieceType; color: PlayerColor } | null;
}

export class UIManager {
  private container: HTMLElement;
  private rewindCallback: (() => void) | null = null;
  private rewindButton: HTMLButtonElement | null = null;
  private maskToggleCallback: ((enabled: boolean) => void) | null = null;
  private settingsCallback: (() => void) | null = null;
  private exitCallback: (() => void) | null = null;
  private masksEnabled: boolean = true;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createUI();
  }

  private createUI(): void {
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

    const rewindButton = document.createElement('button');
    rewindButton.id = 'rewind-button';
    rewindButton.textContent = 'Rewind';
    rewindButton.style.cssText = `
      margin-top: 10px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 5px;
      pointer-events: auto;
      opacity: 0.5;
      transition: opacity 0.2s, background 0.2s;
    `;
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
    uiContainer.appendChild(rewindButton);

    // Mask toggle button
    const maskToggleButton = document.createElement('button');
    maskToggleButton.id = 'mask-toggle-button';
    maskToggleButton.textContent = 'Mask: ON';
    maskToggleButton.style.cssText = `
      margin-top: 10px;
      margin-left: 10px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      background: rgba(75, 0, 130, 0.7);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 5px;
      pointer-events: auto;
      transition: background 0.2s;
    `;
    maskToggleButton.addEventListener('click', () => {
      this.masksEnabled = !this.masksEnabled;
      maskToggleButton.textContent = this.masksEnabled ? 'Mask: ON' : 'Mask: OFF';
      maskToggleButton.style.background = this.masksEnabled
        ? 'rgba(75, 0, 130, 0.7)'
        : 'rgba(50, 50, 50, 0.7)';
      if (this.maskToggleCallback) {
        this.maskToggleCallback(this.masksEnabled);
      }
    });
    maskToggleButton.addEventListener('mouseenter', () => {
      maskToggleButton.style.background = this.masksEnabled
        ? 'rgba(100, 0, 180, 0.9)'
        : 'rgba(70, 70, 70, 0.9)';
    });
    maskToggleButton.addEventListener('mouseleave', () => {
      maskToggleButton.style.background = this.masksEnabled
        ? 'rgba(75, 0, 130, 0.7)'
        : 'rgba(50, 50, 50, 0.7)';
    });
    uiContainer.appendChild(maskToggleButton);

    // Settings button
    const settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    settingsButton.innerHTML = '&#9881;';
    settingsButton.style.cssText = `
      margin-top: 10px;
      margin-left: 10px;
      padding: 8px 12px;
      font-size: 16px;
      cursor: pointer;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 5px;
      pointer-events: auto;
      transition: background 0.2s, transform 0.2s;
    `;
    settingsButton.addEventListener('click', () => {
      if (this.settingsCallback) {
        this.settingsCallback();
      }
    });
    settingsButton.addEventListener('mouseenter', () => {
      settingsButton.style.background = 'rgba(50, 50, 50, 0.9)';
      settingsButton.style.transform = 'rotate(30deg)';
    });
    settingsButton.addEventListener('mouseleave', () => {
      settingsButton.style.background = 'rgba(0, 0, 0, 0.7)';
      settingsButton.style.transform = 'rotate(0deg)';
    });
    uiContainer.appendChild(settingsButton);

    // Exit button (bottom center of screen)
    const exitButton = document.createElement('button');
    exitButton.id = 'exit-button';
    exitButton.textContent = 'Exit to Menu';
    exitButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 25px;
      font-size: 14px;
      cursor: pointer;
      background: rgba(120, 40, 40, 0.8);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 5px;
      pointer-events: auto;
      transition: background 0.2s, transform 0.1s;
      z-index: 100;
    `;
    exitButton.addEventListener('click', () => {
      if (this.exitCallback) {
        this.exitCallback();
      }
    });
    exitButton.addEventListener('mouseenter', () => {
      exitButton.style.background = 'rgba(150, 50, 50, 0.9)';
    });
    exitButton.addEventListener('mouseleave', () => {
      exitButton.style.background = 'rgba(120, 40, 40, 0.8)';
    });
    this.container.appendChild(exitButton);

    const moveLog = document.createElement('div');
    moveLog.id = 'move-log';
    moveLog.style.cssText = `
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
    `;
    this.container.appendChild(moveLog);

    this.container.appendChild(uiContainer);
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
    const moveLog = document.getElementById('move-log');
    if (!moveLog) return;

    const from = this.formatPosition(playerMove.move.from.x, playerMove.move.from.y);
    const to = this.formatPosition(playerMove.move.to.x, playerMove.move.to.y);
    const pieceName = this.formatPieceType(playerMove.pieceType);

    let logText = `<strong>You moved:</strong> ${pieceName} ${from} → ${to}`;

    if (playerMove.captured) {
      const capturedName = this.formatPieceType(playerMove.captured.type);
      logText += `<br><span style="color: #4CAF50;">Captured ${capturedName}!</span>`;
    }

    moveLog.innerHTML = logText;

    // Brief highlight animation
    moveLog.style.background = 'rgba(50, 100, 50, 0.8)';
    setTimeout(() => {
      moveLog.style.background = 'rgba(0, 0, 0, 0.6)';
    }, 500);
  }

  showAIMove(aiMove: MoveInfo): void {
    const moveLog = document.getElementById('move-log');
    if (!moveLog) return;

    // Get current content (player move) and add separator
    let logText = moveLog.innerHTML;
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

    moveLog.innerHTML = logText;

    // Brief highlight animation
    moveLog.style.background = 'rgba(100, 50, 50, 0.8)';
    setTimeout(() => {
      moveLog.style.background = 'rgba(0, 0, 0, 0.6)';
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

  private formatPosition(x: number, y: number): string {
    const col = String.fromCharCode(65 + x); // A, B, C, etc.
    const row = y + 1;
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
    const moveLog = document.getElementById('move-log');
    if (moveLog) {
      moveLog.innerHTML = '';
    }
  }
}
