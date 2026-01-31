import type { GameConfig } from '../types';

export type RestartCallback = (config: GameConfig) => void;

export class SettingsManager {
  private container: HTMLElement;
  private panelVisible: boolean = false;
  private settingsPanel: HTMLElement | null = null;
  private gearButton: HTMLElement | null = null;
  private restartCallback: RestartCallback | null = null;

  // Current settings values
  private boardSize: number;
  private pawnsPerPlayer: number;

  constructor(container: HTMLElement, initialConfig: GameConfig) {
    this.container = container;
    this.boardSize = initialConfig.boardSize;
    this.pawnsPerPlayer = initialConfig.pawnsPerPlayer;
    this.createUI();
  }

  private createUI(): void {
    // Create gear button
    this.gearButton = document.createElement('button');
    this.gearButton.id = 'settings-button';
    this.gearButton.innerHTML = '&#9881;'; // Gear icon
    this.gearButton.style.cssText = `
      position: absolute;
      top: 200px;
      left: 20px;
      width: 40px;
      height: 40px;
      font-size: 24px;
      cursor: pointer;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      transition: background 0.2s, transform 0.2s;
      z-index: 100;
    `;
    this.gearButton.addEventListener('click', () => this.togglePanel());
    this.gearButton.addEventListener('mouseenter', () => {
      if (this.gearButton) {
        this.gearButton.style.background = 'rgba(50, 50, 50, 0.9)';
        this.gearButton.style.transform = 'rotate(30deg)';
      }
    });
    this.gearButton.addEventListener('mouseleave', () => {
      if (this.gearButton) {
        this.gearButton.style.background = 'rgba(0, 0, 0, 0.7)';
        this.gearButton.style.transform = 'rotate(0deg)';
      }
    });
    this.container.appendChild(this.gearButton);

    // Create settings panel (hidden by default)
    this.settingsPanel = document.createElement('div');
    this.settingsPanel.id = 'settings-panel';
    this.settingsPanel.style.cssText = `
      position: absolute;
      top: 200px;
      left: 70px;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 100;
      display: none;
      min-width: 280px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    `;

    // Panel header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    `;
    header.innerHTML = `<span style="font-size: 16px; font-weight: bold;">Game Settings</span>`;

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0 5px;
    `;
    closeButton.addEventListener('click', () => this.hidePanel());
    header.appendChild(closeButton);
    this.settingsPanel.appendChild(header);

    // Board size slider
    const boardSizeControl = this.createSliderControl(
      'Board Size',
      'board-size',
      8,
      16,
      this.boardSize,
      (value) => {
        this.boardSize = value;
        this.updateSummary();
      },
      (value) => `${value}x${value}`
    );
    this.settingsPanel.appendChild(boardSizeControl);

    // Pawns per player slider
    const pawnsControl = this.createSliderControl(
      'Pawns per Player',
      'pawns',
      0,
      12,
      this.pawnsPerPlayer,
      (value) => {
        this.pawnsPerPlayer = value;
        this.updateSummary();
      },
      (value) => `${value}`
    );
    this.settingsPanel.appendChild(pawnsControl);

    // Summary text
    const summary = document.createElement('div');
    summary.id = 'settings-summary';
    summary.style.cssText = `
      margin: 15px 0;
      padding: 10px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 5px;
      text-align: center;
      font-size: 13px;
    `;
    this.settingsPanel.appendChild(summary);
    this.updateSummary();

    // Start New Game button
    const startButton = document.createElement('button');
    startButton.textContent = 'Start New Game';
    startButton.style.cssText = `
      width: 100%;
      padding: 12px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
      transition: background 0.2s;
    `;
    startButton.addEventListener('click', () => this.startNewGame());
    startButton.addEventListener('mouseenter', () => {
      startButton.style.background = '#45a049';
    });
    startButton.addEventListener('mouseleave', () => {
      startButton.style.background = '#4CAF50';
    });
    this.settingsPanel.appendChild(startButton);

    this.container.appendChild(this.settingsPanel);
  }

  private createSliderControl(
    label: string,
    id: string,
    min: number,
    max: number,
    initialValue: number,
    onChange: (value: number) => void,
    formatValue: (value: number) => string
  ): HTMLElement {
    const control = document.createElement('div');
    control.style.cssText = `margin-bottom: 15px;`;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    `;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;

    const valueSpan = document.createElement('span');
    valueSpan.id = `${id}-value`;
    valueSpan.textContent = formatValue(initialValue);
    valueSpan.style.fontWeight = 'bold';

    labelRow.appendChild(labelSpan);
    labelRow.appendChild(valueSpan);
    control.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(initialValue);
    slider.style.cssText = `
      width: 100%;
      cursor: pointer;
      accent-color: #4CAF50;
    `;
    slider.addEventListener('input', () => {
      const value = parseInt(slider.value);
      valueSpan.textContent = formatValue(value);
      onChange(value);
    });
    control.appendChild(slider);

    return control;
  }

  private updateSummary(): void {
    const summary = document.getElementById('settings-summary');
    if (!summary) return;

    const piecesPerPlayer = 8 + this.pawnsPerPlayer; // 8 major pieces + pawns
    const totalPieces = piecesPerPlayer * 2;
    const totalSquares = this.boardSize * this.boardSize;
    const density = ((totalPieces / totalSquares) * 100).toFixed(1);

    // Validation
    const isValid = totalPieces <= totalSquares;

    if (isValid) {
      summary.innerHTML = `
        <div>Total: <strong>${totalPieces}</strong> pieces on <strong>${totalSquares}</strong> squares</div>
        <div style="margin-top: 5px; color: #aaa;">Density: ${density}%</div>
      `;
      summary.style.borderColor = 'transparent';
    } else {
      summary.innerHTML = `
        <div style="color: #ff6b6b;">Too many pieces!</div>
        <div style="margin-top: 5px;">${totalPieces} pieces won't fit on ${totalSquares} squares</div>
      `;
      summary.style.border = '1px solid #ff6b6b';
    }
  }

  private togglePanel(): void {
    if (this.panelVisible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  private showPanel(): void {
    if (this.settingsPanel) {
      this.settingsPanel.style.display = 'block';
      this.panelVisible = true;
    }
  }

  private hidePanel(): void {
    if (this.settingsPanel) {
      this.settingsPanel.style.display = 'none';
      this.panelVisible = false;
    }
  }

  private startNewGame(): void {
    // Validate
    const piecesPerPlayer = 8 + this.pawnsPerPlayer;
    const totalPieces = piecesPerPlayer * 2;
    const totalSquares = this.boardSize * this.boardSize;

    if (totalPieces > totalSquares) {
      alert(`Cannot start game: ${totalPieces} pieces don't fit on ${totalSquares} squares. Reduce pawns or increase board size.`);
      return;
    }

    const config: GameConfig = {
      boardSize: this.boardSize,
      pawnsPerPlayer: this.pawnsPerPlayer,
    };

    this.hidePanel();

    if (this.restartCallback) {
      this.restartCallback(config);
    }
  }

  setRestartCallback(callback: RestartCallback): void {
    this.restartCallback = callback;
  }

  dispose(): void {
    if (this.gearButton && this.gearButton.parentElement) {
      this.gearButton.parentElement.removeChild(this.gearButton);
    }
    if (this.settingsPanel && this.settingsPanel.parentElement) {
      this.settingsPanel.parentElement.removeChild(this.settingsPanel);
    }
  }
}
