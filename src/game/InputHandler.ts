import * as THREE from 'three';
import type { Scene } from '../rendering/Scene';
import type { Game } from './Game';
import type { ChessPiece, Position, Move } from '../types';

export class InputHandler {
  private scene: Scene;
  private game: Game;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedPiece: ChessPiece | null = null;
  private validMoves: Move[] = [];
  private enabled: boolean = true;

  constructor(scene: Scene, game: Game) {
    this.scene = scene;
    this.game = game;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.scene.getDomElement();
    canvas.addEventListener('click', (event) => this.onMouseClick(event));
  }

  private onMouseClick(event: MouseEvent): void {
    if (!this.enabled) return;

    const canvas = this.scene.getDomElement();
    const rect = canvas.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const boardPosition = this.getBoardPositionFromMouse();
    if (!boardPosition) return;

    this.handleBoardClick(boardPosition);
  }

  private getBoardPositionFromMouse(): Position | null {
    this.raycaster.setFromCamera(this.mouse, this.scene.getCamera());

    const boardGroup = this.scene.getBoardGroup();
    const intersects = this.raycaster.intersectObjects(boardGroup.children, false);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const userData = intersect.object.userData;

      if (userData.boardX !== undefined && userData.boardY !== undefined) {
        return { x: userData.boardX, y: userData.boardY };
      }

      // Fallback: calculate from world position
      return this.scene.worldToBoard(intersect.point);
    }

    return null;
  }

  private handleBoardClick(position: Position): void {
    const clickedPiece = this.game.getBoard().getPieceAt(position);

    if (this.selectedPiece) {
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
        this.selectPiece(clickedPiece);
        return;
      }

      // Clicking elsewhere - deselect
      this.clearSelection();
      return;
    }

    // No piece selected - try to select one
    if (clickedPiece && clickedPiece.color === this.game.getCurrentTurn()) {
      this.selectPiece(clickedPiece);
    }
  }

  private selectPiece(piece: ChessPiece): void {
    this.selectedPiece = piece;
    this.validMoves = this.game.getValidMoves(piece);

    // Highlight the selected square and valid moves
    this.scene.clearHighlights();
    this.scene.highlightSelectedSquare(piece.position);

    const validPositions = this.validMoves.map((m) => m.to);
    this.scene.highlightSquares(validPositions);
  }

  private clearSelection(): void {
    this.selectedPiece = null;
    this.validMoves = [];
    this.scene.clearHighlights();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearSelection();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
