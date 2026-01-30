import { Board } from './game/Board';
import type { ChessPiece, PlayerColor, PieceType, Position } from './types';

export function createPiece(
  type: PieceType,
  color: PlayerColor,
  position: Position,
  hasMoved = false
): ChessPiece {
  return {
    id: `${color}-${type}-${position.x}-${position.y}`,
    type,
    color,
    position: { ...position },
    isRevealed: true,
    hasMoved,
  };
}

export function setupEmptyBoard(size = 8): Board {
  return new Board(size);
}

export function setupBoardWithPieces(pieces: ChessPiece[], size = 8): Board {
  const board = new Board(size);
  for (const piece of pieces) {
    board.addPiece(piece);
  }
  return board;
}

export function positionEquals(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function containsPosition(positions: Position[], target: Position): boolean {
  return positions.some(p => positionEquals(p, target));
}
