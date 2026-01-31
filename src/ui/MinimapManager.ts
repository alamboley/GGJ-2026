import type { Game } from '../game/Game';
import type { InputHandler } from '../game/InputHandler';
import type { PieceType, Move } from '../types';
import { isKingInCheck } from '../game/pieces/MoveValidator';

const PIECE_SYMBOLS: Record<PieceType, string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: 'P',
};

export class MinimapManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: Game;
  private inputHandler: InputHandler;

  // Selection state
  private selectedPieceId: string | null = null;
  private validMoves: Move[] = [];

  constructor(container: HTMLElement, game: Game, inputHandler: InputHandler) {
    this.game = game;
    this.inputHandler = inputHandler;

    // Create minimap container
    const minimapContainer = document.createElement('div');
    minimapContainer.id = 'minimap-container';
    minimapContainer.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      padding: 10px;
      border-radius: 8px;
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
    title.textContent = 'Board Overview (Click to move)';
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

    this.canvas = document.createElement('canvas');
    const boardSize = this.game.getBoard().getSize();
    const cellSize = 20; // 20px per cell
    const size = boardSize * cellSize;
    this.canvas.width = size;
    this.canvas.height = size;
    this.canvas.style.cssText = `
      border: 2px solid #444;
      border-radius: 4px;
      cursor: pointer;
    `;
    minimapContainer.appendChild(this.canvas);

    // Add click handler
    this.canvas.addEventListener('click', (event) => this.onMinimapClick(event));

    this.ctx = this.canvas.getContext('2d')!;
    container.appendChild(minimapContainer);

    // Sync 3D selection to minimap
    inputHandler.onSelectionChanged = (pieceId, validMoves) => {
      this.selectedPieceId = pieceId;
      this.validMoves = validMoves;
      this.update();
    };
  }

  update(): void {
    const boardSize = this.game.getBoard().getSize();
    const cellSize = this.canvas.width / boardSize;
    const ctx = this.ctx;

    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw board squares
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? '#d4c4a8' : '#8b7355';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Draw check indicator (red square under king in check)
    const currentTurn = this.game.getCurrentTurn();
    if (isKingInCheck(currentTurn, this.game.getBoard())) {
      const king = this.game.getBoard().findPiece('king', currentTurn);
      if (king) {
        const x = king.position.x * cellSize;
        const y = king.position.y * cellSize;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    // Draw valid move highlights
    for (const move of this.validMoves) {
      const x = move.to.x * cellSize;
      const y = move.to.y * cellSize;
      ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
      ctx.fillRect(x, y, cellSize, cellSize);
    }

    // Draw selected piece highlight
    if (this.selectedPieceId) {
      const selectedPiece = this.game.getBoard().getPiece(this.selectedPieceId);
      if (selectedPiece) {
        const x = selectedPiece.position.x * cellSize;
        const y = selectedPiece.position.y * cellSize;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    // Draw pieces
    const pieces = this.game.getBoard().getAllPieces();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const piece of pieces) {
      const x = piece.position.x * cellSize + cellSize / 2;
      const y = piece.position.y * cellSize + cellSize / 2;

      // Highlight selected piece with glow
      const isSelected = piece.id === this.selectedPieceId;

      // Draw piece background circle
      ctx.beginPath();
      ctx.arc(x, y, cellSize * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = piece.color === 'white' ? '#4fc3f7' : '#ff6b6b';
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = piece.color === 'white' ? '#0288d1' : '#c62828';
        ctx.lineWidth = 1.5;
      }
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
      ctx.lineTo(i * cellSize, this.canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(this.canvas.width, i * cellSize);
      ctx.stroke();
    }
  }

  selectPiece(pieceId: string): void {
    const piece = this.game.getBoard().getPiece(pieceId);
    if (!piece) return;

    this.selectedPieceId = pieceId;
    this.validMoves = this.game.getValidMoves(piece);

    // Also update 3D view
    this.inputHandler.selectPieceById(pieceId);

    this.update();
  }

  clearSelection(): void {
    this.selectedPieceId = null;
    this.validMoves = [];

    // Also clear 3D view
    this.inputHandler.clearSelectionExternal();

    this.update();
  }

  private onMinimapClick(event: MouseEvent): void {
    if (!this.inputHandler.isEnabled()) return; // Don't allow input during AI turn

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const boardSize = this.game.getBoard().getSize();
    const cellSize = this.canvas.width / boardSize;

    const boardX = Math.floor(x / cellSize);
    const boardY = Math.floor(y / cellSize);

    if (boardX < 0 || boardX >= boardSize || boardY < 0 || boardY >= boardSize) return;

    const position = { x: boardX, y: boardY };
    const clickedPiece = this.game.getBoard().getPieceAt(position);

    if (this.selectedPieceId) {
      // Check if clicking on a valid move target
      const validMove = this.validMoves.find(
        (m) => m.to.x === position.x && m.to.y === position.y
      );

      if (validMove) {
        // Execute the move
        this.game.executeMove(validMove);
        this.clearSelection();
        return;
      }

      // Check if clicking on own piece to reselect
      if (clickedPiece && clickedPiece.color === this.game.getCurrentTurn()) {
        this.selectPiece(clickedPiece.id);
        return;
      }

      // Clicking elsewhere - deselect
      this.clearSelection();
      return;
    }

    // No piece selected - try to select one
    if (clickedPiece && clickedPiece.color === this.game.getCurrentTurn()) {
      this.selectPiece(clickedPiece.id);
    }
  }
}
