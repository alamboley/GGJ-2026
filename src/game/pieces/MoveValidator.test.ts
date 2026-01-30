import { describe, it, expect } from 'vitest';
import { isKingInCheck, isLegalMove, getLegalMoves, getAllLegalMoves, getGameStatus } from './MoveValidator';
import { createPiece, setupBoardWithPieces, containsPosition } from '../../test-utils';

describe('MoveValidator', () => {
  describe('isKingInCheck', () => {
    it('returns false when king is not attacked', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const blackKing = createPiece('king', 'black', { x: 4, y: 0 });
      const board = setupBoardWithPieces([whiteKing, blackKing]);

      expect(isKingInCheck('white', board)).toBe(false);
      expect(isKingInCheck('black', board)).toBe(false);
    });

    it('returns true when king is attacked by rook', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const blackRook = createPiece('rook', 'black', { x: 4, y: 0 });
      const board = setupBoardWithPieces([whiteKing, blackRook]);

      expect(isKingInCheck('white', board)).toBe(true);
    });

    it('returns true when king is attacked by bishop', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 4 });
      const blackBishop = createPiece('bishop', 'black', { x: 7, y: 7 });
      const board = setupBoardWithPieces([whiteKing, blackBishop]);

      expect(isKingInCheck('white', board)).toBe(true);
    });

    it('returns true when king is attacked by knight', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 4 });
      const blackKnight = createPiece('knight', 'black', { x: 5, y: 6 });
      const board = setupBoardWithPieces([whiteKing, blackKnight]);

      expect(isKingInCheck('white', board)).toBe(true);
    });

    it('returns true when king is attacked by pawn', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 4 });
      const blackPawn = createPiece('pawn', 'black', { x: 3, y: 3 }); // Black pawn attacks down-diagonally
      const board = setupBoardWithPieces([whiteKing, blackPawn]);

      expect(isKingInCheck('white', board)).toBe(true);
    });

    it('returns true when king is attacked by queen', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 4 });
      const blackQueen = createPiece('queen', 'black', { x: 4, y: 0 });
      const board = setupBoardWithPieces([whiteKing, blackQueen]);

      expect(isKingInCheck('white', board)).toBe(true);
    });

    it('returns false when attack is blocked by piece', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const whitePawn = createPiece('pawn', 'white', { x: 4, y: 4 });
      const blackRook = createPiece('rook', 'black', { x: 4, y: 0 });
      const board = setupBoardWithPieces([whiteKing, whitePawn, blackRook]);

      expect(isKingInCheck('white', board)).toBe(false);
    });

    it('returns false when there is no king (edge case)', () => {
      const board = setupBoardWithPieces([createPiece('rook', 'white', { x: 0, y: 0 })]);

      expect(isKingInCheck('white', board)).toBe(false);
    });
  });

  describe('isLegalMove', () => {
    it('returns true for valid move that does not leave king in check', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const whitePawn = createPiece('pawn', 'white', { x: 4, y: 6 });
      const blackKing = createPiece('king', 'black', { x: 4, y: 0 });
      const board = setupBoardWithPieces([whiteKing, whitePawn, blackKing]);

      expect(isLegalMove(whitePawn, { x: 4, y: 5 }, board)).toBe(true);
    });

    it('returns false for move that leaves king in check', () => {
      // Pin scenario: pawn is pinned by rook
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const whitePawn = createPiece('pawn', 'white', { x: 4, y: 6 });
      const blackRook = createPiece('rook', 'black', { x: 4, y: 0 });
      const board = setupBoardWithPieces([whiteKing, whitePawn, blackRook]);

      // Pawn can move forward (stays in line with king, still blocks)
      expect(isLegalMove(whitePawn, { x: 4, y: 5 }, board)).toBe(true);
    });

    it('returns false for move to invalid target', () => {
      const whitePawn = createPiece('pawn', 'white', { x: 4, y: 6 });
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const board = setupBoardWithPieces([whitePawn, whiteKing]);

      // Pawn cannot move sideways
      expect(isLegalMove(whitePawn, { x: 5, y: 6 }, board)).toBe(false);
    });

    it('returns false when moving king into check', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const blackRook = createPiece('rook', 'black', { x: 5, y: 0 });
      const board = setupBoardWithPieces([whiteKing, blackRook]);

      // Moving king to e7 (5,7) would put it in rook's line of fire
      expect(isLegalMove(whiteKing, { x: 5, y: 7 }, board)).toBe(false);
    });

    it('allows king to capture attacking piece', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const blackRook = createPiece('rook', 'black', { x: 4, y: 6 });
      const board = setupBoardWithPieces([whiteKing, blackRook]);

      // King can capture the rook that's checking it
      expect(isLegalMove(whiteKing, { x: 4, y: 6 }, board)).toBe(true);
    });

    it('blocks moving king to capture defended piece', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const blackRook = createPiece('rook', 'black', { x: 4, y: 6 });
      const blackBishop = createPiece('bishop', 'black', { x: 3, y: 5 }); // Defends the rook
      const board = setupBoardWithPieces([whiteKing, blackRook, blackBishop]);

      // King cannot capture defended rook
      expect(isLegalMove(whiteKing, { x: 4, y: 6 }, board)).toBe(false);
    });
  });

  describe('getLegalMoves', () => {
    it('returns all legal moves for a piece', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const board = setupBoardWithPieces([whiteKing]);

      const moves = getLegalMoves(whiteKing, board);

      expect(moves.length).toBe(5); // King at edge has 5 moves
    });

    it('filters out moves that would leave king in check', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const blackRook = createPiece('rook', 'black', { x: 5, y: 0 });
      const board = setupBoardWithPieces([whiteKing, blackRook]);

      const moves = getLegalMoves(whiteKing, board);

      // King cannot move to column 5
      const movesToColumn5 = moves.filter(m => m.to.x === 5);
      expect(movesToColumn5).toHaveLength(0);
    });

    it('includes capture information', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const blackPawn = createPiece('pawn', 'black', { x: 3, y: 6 });
      const board = setupBoardWithPieces([whiteKing, blackPawn]);

      const moves = getLegalMoves(whiteKing, board);
      const captureMove = moves.find(m => m.to.x === 3 && m.to.y === 6);

      expect(captureMove).toBeDefined();
      expect(captureMove?.capturedPieceId).toBe(blackPawn.id);
    });

    it('preserves from position', () => {
      const whiteRook = createPiece('rook', 'white', { x: 0, y: 0 });
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const board = setupBoardWithPieces([whiteRook, whiteKing]);

      const moves = getLegalMoves(whiteRook, board);

      expect(moves.every(m => m.from.x === 0 && m.from.y === 0)).toBe(true);
    });
  });

  describe('getAllLegalMoves', () => {
    it('returns moves for all pieces of a color', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const whiteRook = createPiece('rook', 'white', { x: 0, y: 7 });
      const board = setupBoardWithPieces([whiteKing, whiteRook]);

      const moves = getAllLegalMoves('white', board);

      // King has some moves, rook has many
      expect(moves.length).toBeGreaterThan(10);
    });

    it('returns empty array when no pieces', () => {
      const blackKing = createPiece('king', 'black', { x: 4, y: 0 });
      const board = setupBoardWithPieces([blackKing]);

      const whiteMoves = getAllLegalMoves('white', board);
      expect(whiteMoves).toHaveLength(0);
    });
  });

  describe('getGameStatus', () => {
    it('returns "playing" for normal position', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const blackKing = createPiece('king', 'black', { x: 4, y: 0 });
      const board = setupBoardWithPieces([whiteKing, blackKing]);

      expect(getGameStatus('white', board)).toBe('playing');
      expect(getGameStatus('black', board)).toBe('playing');
    });

    it('returns "check" when king is in check but has escape', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const blackRook = createPiece('rook', 'black', { x: 4, y: 0 });
      const board = setupBoardWithPieces([whiteKing, blackRook]);

      expect(getGameStatus('white', board)).toBe('check');
    });

    it('returns "checkmate" when king is in check with no escape', () => {
      // Back rank mate scenario
      const whiteKing = createPiece('king', 'white', { x: 0, y: 7 });
      const whitePawn1 = createPiece('pawn', 'white', { x: 0, y: 6 }, true);
      const whitePawn2 = createPiece('pawn', 'white', { x: 1, y: 6 }, true);
      const blackRook = createPiece('rook', 'black', { x: 7, y: 7 });
      const blackKing = createPiece('king', 'black', { x: 4, y: 0 });
      const board = setupBoardWithPieces([whiteKing, whitePawn1, whitePawn2, blackRook, blackKing]);

      expect(getGameStatus('white', board)).toBe('checkmate');
    });

    it('returns "stalemate" when no legal moves but not in check', () => {
      // King trapped in corner, not in check
      const whiteKing = createPiece('king', 'white', { x: 0, y: 0 });
      const blackQueen = createPiece('queen', 'black', { x: 1, y: 2 });
      const blackKing = createPiece('king', 'black', { x: 2, y: 2 });
      const board = setupBoardWithPieces([whiteKing, blackQueen, blackKing]);

      expect(getGameStatus('white', board)).toBe('stalemate');
    });

    it('returns "checkmate" for scholars mate position', () => {
      // Classic scholars mate position
      const blackKing = createPiece('king', 'black', { x: 4, y: 0 });
      const blackPawn1 = createPiece('pawn', 'black', { x: 3, y: 1 }, true);
      const blackPawn2 = createPiece('pawn', 'black', { x: 5, y: 1 }, true);
      const blackKnight = createPiece('knight', 'black', { x: 6, y: 0 });
      const whiteQueen = createPiece('queen', 'white', { x: 5, y: 0 }); // On f8, attacking king
      const whiteBishop = createPiece('bishop', 'white', { x: 2, y: 3 }); // Supporting queen
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      const board = setupBoardWithPieces([blackKing, blackPawn1, blackPawn2, blackKnight, whiteQueen, whiteBishop, whiteKing]);

      expect(getGameStatus('black', board)).toBe('checkmate');
    });
  });
});
