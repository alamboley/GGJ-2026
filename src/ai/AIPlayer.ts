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

const CENTER_SQUARES = [
  { x: 3, y: 3 }, { x: 3, y: 4 },
  { x: 4, y: 3 }, { x: 4, y: 4 },
];

const EXTENDED_CENTER = [
  { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 },
  { x: 3, y: 2 }, { x: 3, y: 5 },
  { x: 4, y: 2 }, { x: 4, y: 5 },
  { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 },
];

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

    // Center control bonus
    if (CENTER_SQUARES.some((sq) => sq.x === move.to.x && sq.y === move.to.y)) {
      score += 2;
    } else if (EXTENDED_CENTER.some((sq) => sq.x === move.to.x && sq.y === move.to.y)) {
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
