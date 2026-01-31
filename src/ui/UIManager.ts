import type { GameStatus, PlayerColor, PieceType, Move } from '../types';

export interface MoveInfo {
  move: Move;
  pieceType: PieceType;
  captured: { type: PieceType; color: PlayerColor } | null;
}

export class UIManager {
  private container: HTMLElement;

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

    // Show AI move
    const from = this.formatPosition(aiMove.move.from.x, aiMove.move.from.y);
    const to = this.formatPosition(aiMove.move.to.x, aiMove.move.to.y);
    const pieceName = this.formatPieceType(aiMove.pieceType);

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
}
