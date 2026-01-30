import type { Position, ChessPiece, PlayerColor, PieceType } from '../types';

export class Board {
  private size: number;
  private pieces: Map<string, ChessPiece> = new Map();

  constructor(size: number = 8) {
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

  getPiece(pieceId: string): ChessPiece | undefined {
    return this.pieces.get(pieceId);
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

  getPiecesByColor(color: PlayerColor): ChessPiece[] {
    return Array.from(this.pieces.values()).filter((p) => p.color === color);
  }

  findPiece(type: PieceType, color: PlayerColor): ChessPiece | undefined {
    for (const piece of this.pieces.values()) {
      if (piece.type === type && piece.color === color) {
        return piece;
      }
    }
    return undefined;
  }

  movePiece(pieceId: string, newPosition: Position): boolean {
    const piece = this.pieces.get(pieceId);
    if (!piece) return false;

    piece.position = { ...newPosition };
    piece.hasMoved = true;
    return true;
  }

  isValidPosition(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.x < this.size &&
      position.y >= 0 &&
      position.y < this.size
    );
  }

  clone(): Board {
    const cloned = new Board(this.size);
    for (const piece of this.pieces.values()) {
      cloned.addPiece({
        ...piece,
        position: { ...piece.position },
      });
    }
    return cloned;
  }
}
