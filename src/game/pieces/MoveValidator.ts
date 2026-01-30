import type { ChessPiece, Position, PlayerColor, Move, GameStatus } from '../../types';
import { Board } from '../Board';
import { generatePseudoLegalMoves, getAttackedSquares } from './MovementRules';

export function isKingInCheck(color: PlayerColor, board: Board): boolean {
  const king = board.findPiece('king', color);
  if (!king) return false;

  const enemyColor = color === 'white' ? 'black' : 'white';
  const attackedSquares = getAttackedSquares(enemyColor, board);

  return attackedSquares.has(`${king.position.x},${king.position.y}`);
}

export function isLegalMove(piece: ChessPiece, to: Position, board: Board): boolean {
  const pseudoLegalMoves = generatePseudoLegalMoves(piece, board);
  const isValidTarget = pseudoLegalMoves.some(
    (pos) => pos.x === to.x && pos.y === to.y
  );

  if (!isValidTarget) return false;

  // Simulate the move and check if our king is in check
  const clonedBoard = board.clone();
  const clonedPiece = clonedBoard.getPiece(piece.id);
  if (!clonedPiece) return false;

  // Handle capture
  const targetPiece = clonedBoard.getPieceAt(to);
  if (targetPiece) {
    clonedBoard.removePiece(targetPiece.id);
  }

  // Move the piece
  clonedBoard.movePiece(piece.id, to);

  // Check if our king is in check after the move
  return !isKingInCheck(piece.color, clonedBoard);
}

export function getLegalMoves(piece: ChessPiece, board: Board): Move[] {
  const pseudoLegalMoves = generatePseudoLegalMoves(piece, board);
  const legalMoves: Move[] = [];

  for (const to of pseudoLegalMoves) {
    if (isLegalMove(piece, to, board)) {
      const targetPiece = board.getPieceAt(to);
      legalMoves.push({
        pieceId: piece.id,
        from: { ...piece.position },
        to: { ...to },
        capturedPieceId: targetPiece?.id,
      });
    }
  }

  return legalMoves;
}

export function getAllLegalMoves(color: PlayerColor, board: Board): Move[] {
  const pieces = board.getPiecesByColor(color);
  const allMoves: Move[] = [];

  for (const piece of pieces) {
    const moves = getLegalMoves(piece, board);
    allMoves.push(...moves);
  }

  return allMoves;
}

export function getGameStatus(color: PlayerColor, board: Board): GameStatus {
  const hasLegalMoves = getAllLegalMoves(color, board).length > 0;
  const inCheck = isKingInCheck(color, board);

  if (!hasLegalMoves) {
    return inCheck ? 'checkmate' : 'stalemate';
  }

  return inCheck ? 'check' : 'playing';
}
