import type { Move, PlayerColor, PieceType } from '../types';
import { Game } from '../game/Game';
import { getAllLegalMoves, isKingInCheck } from '../game/pieces/MoveValidator';

const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
};

function getCenterSquares(boardSize: number): { x: number; y: number }[] {
  const center = Math.floor(boardSize / 2);
  return [
    { x: center - 1, y: center - 1 }, { x: center - 1, y: center },
    { x: center, y: center - 1 }, { x: center, y: center },
  ];
}

function getExtendedCenter(boardSize: number): { x: number; y: number }[] {
  const center = Math.floor(boardSize / 2);
  const squares: { x: number; y: number }[] = [];
  for (let x = center - 2; x <= center + 1; x++) {
    for (let y = center - 2; y <= center + 1; y++) {
      // Skip the inner center squares
      if (x >= center - 1 && x <= center && y >= center - 1 && y <= center) {
        continue;
      }
      squares.push({ x, y });
    }
  }
  return squares;
}

export class AIPlayer {
  private color: PlayerColor;
  private thinkingDelay: number;

  constructor(color: PlayerColor, thinkingDelay: number = 500) {
    this.color = color;
    this.thinkingDelay = thinkingDelay;
  }

  getColor(): PlayerColor {
    return this.color;
  }

  makeMove(game: Game): Promise<Move | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const move = this.calculateBestMove(game);
        if (move) {
          game.executeMove(move);
        }
        resolve(move);
      }, this.thinkingDelay + Math.random() * 500);
    });
  }

  private calculateBestMove(game: Game): Move | null {
    const board = game.getBoard();
    const legalMoves = getAllLegalMoves(this.color, board);

    if (legalMoves.length === 0) return null;

    const scoredMoves = legalMoves.map((move) => ({
      move,
      score: this.evaluateMove(move, game),
    }));

    // Sort by score descending
    scoredMoves.sort((a, b) => b.score - a.score);

    // Pick one of the top moves with some randomness
    const topScore = scoredMoves[0].score;
    const topMoves = scoredMoves.filter((m) => m.score >= topScore - 0.5);

    const randomIndex = Math.floor(Math.random() * Math.min(3, topMoves.length));
    return topMoves[randomIndex].move;
  }

  private evaluateMove(move: Move, game: Game): number {
    let score = 0;
    const board = game.getBoard();

    // Capture value
    if (move.capturedPieceId) {
      const capturedPiece = board.getPiece(move.capturedPieceId);
      if (capturedPiece) {
        score += PIECE_VALUES[capturedPiece.type] * 10;
      }
    }

    // Center control bonus (dynamic based on board size)
    const boardSize = board.getSize();
    const centerSquares = getCenterSquares(boardSize);
    const extendedCenter = getExtendedCenter(boardSize);
    if (centerSquares.some((sq) => sq.x === move.to.x && sq.y === move.to.y)) {
      score += 2;
    } else if (extendedCenter.some((sq) => sq.x === move.to.x && sq.y === move.to.y)) {
      score += 1;
    }

    // Check if this move puts enemy in check
    const clonedBoard = board.clone();
    const capturedPiece = clonedBoard.getPieceAt(move.to);
    if (capturedPiece) {
      clonedBoard.removePiece(capturedPiece.id);
    }
    clonedBoard.movePiece(move.pieceId, move.to);

    const enemyColor = this.color === 'white' ? 'black' : 'white';
    if (isKingInCheck(enemyColor, clonedBoard)) {
      score += 3;
    }

    // Develop pieces early (knights and bishops)
    const piece = board.getPiece(move.pieceId);
    if (piece && !piece.hasMoved) {
      if (piece.type === 'knight' || piece.type === 'bishop') {
        score += 1.5;
      }
    }

    // Small random factor for variety
    score += Math.random() * 0.5;

    return score;
  }
}
