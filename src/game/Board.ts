import type { Position, ChessPiece } from '../types';

export class Board {
  private size: number;
  private pieces: Map<string, ChessPiece> = new Map();

  constructor(size: number = 12) {
    this.size = size;
  }

  getSize(): number {
    return this.size;
  }

  addPiece(piece: ChessPiece): void {
    this.pieces.set(piece.id, piece);
  }

  removePiece(pieceId: string): void {
    this.pieces.delete(pieceId);
  }

  getPieceAt(position: Position): ChessPiece | undefined {
    for (const piece of this.pieces.values()) {
      if (piece.position.x === position.x && piece.position.y === position.y) {
        return piece;
      }
    }
    return undefined;
  }

  getAllPieces(): ChessPiece[] {
    return Array.from(this.pieces.values());
  }

  isValidPosition(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.x < this.size &&
      position.y >= 0 &&
      position.y < this.size
    );
  }
}
