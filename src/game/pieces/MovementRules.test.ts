import { describe, it, expect } from 'vitest';
import { generatePseudoLegalMoves, getAttackedSquares } from './MovementRules';
import { createPiece, setupBoardWithPieces, containsPosition } from '../../test-utils';

describe('MovementRules', () => {
  describe('King movement', () => {
    it('can move one square in all 8 directions from center', () => {
      const king = createPiece('king', 'white', { x: 4, y: 4 });
      const board = setupBoardWithPieces([king]);

      const moves = generatePseudoLegalMoves(king, board);

      expect(moves).toHaveLength(8);
      expect(containsPosition(moves, { x: 3, y: 3 })).toBe(true);
      expect(containsPosition(moves, { x: 3, y: 4 })).toBe(true);
      expect(containsPosition(moves, { x: 3, y: 5 })).toBe(true);
      expect(containsPosition(moves, { x: 4, y: 3 })).toBe(true);
      expect(containsPosition(moves, { x: 4, y: 5 })).toBe(true);
      expect(containsPosition(moves, { x: 5, y: 3 })).toBe(true);
      expect(containsPosition(moves, { x: 5, y: 4 })).toBe(true);
      expect(containsPosition(moves, { x: 5, y: 5 })).toBe(true);
    });

    it('has limited moves in corner', () => {
      const king = createPiece('king', 'white', { x: 0, y: 0 });
      const board = setupBoardWithPieces([king]);

      const moves = generatePseudoLegalMoves(king, board);

      expect(moves).toHaveLength(3);
      expect(containsPosition(moves, { x: 1, y: 0 })).toBe(true);
      expect(containsPosition(moves, { x: 0, y: 1 })).toBe(true);
      expect(containsPosition(moves, { x: 1, y: 1 })).toBe(true);
    });

    it('cannot move onto own pieces', () => {
      const king = createPiece('king', 'white', { x: 4, y: 4 });
      const pawn = createPiece('pawn', 'white', { x: 4, y: 3 });
      const board = setupBoardWithPieces([king, pawn]);

      const moves = generatePseudoLegalMoves(king, board);

      expect(moves).toHaveLength(7);
      expect(containsPosition(moves, { x: 4, y: 3 })).toBe(false);
    });

    it('can capture enemy pieces', () => {
      const king = createPiece('king', 'white', { x: 4, y: 4 });
      const enemyPawn = createPiece('pawn', 'black', { x: 4, y: 3 });
      const board = setupBoardWithPieces([king, enemyPawn]);

      const moves = generatePseudoLegalMoves(king, board);

      expect(moves).toHaveLength(8);
      expect(containsPosition(moves, { x: 4, y: 3 })).toBe(true);
    });
  });

  describe('Queen movement', () => {
    it('can move in all 8 directions', () => {
      const queen = createPiece('queen', 'white', { x: 4, y: 4 });
      const board = setupBoardWithPieces([queen]);

      const moves = generatePseudoLegalMoves(queen, board);

      // Queen at d4 can reach many squares
      expect(moves.length).toBeGreaterThan(20);
      // Horizontal
      expect(containsPosition(moves, { x: 0, y: 4 })).toBe(true);
      expect(containsPosition(moves, { x: 7, y: 4 })).toBe(true);
      // Vertical
      expect(containsPosition(moves, { x: 4, y: 0 })).toBe(true);
      expect(containsPosition(moves, { x: 4, y: 7 })).toBe(true);
      // Diagonal
      expect(containsPosition(moves, { x: 0, y: 0 })).toBe(true);
      expect(containsPosition(moves, { x: 7, y: 7 })).toBe(true);
    });

    it('is blocked by own pieces', () => {
      const queen = createPiece('queen', 'white', { x: 4, y: 4 });
      const pawn = createPiece('pawn', 'white', { x: 4, y: 2 });
      const board = setupBoardWithPieces([queen, pawn]);

      const moves = generatePseudoLegalMoves(queen, board);

      expect(containsPosition(moves, { x: 4, y: 3 })).toBe(true);
      expect(containsPosition(moves, { x: 4, y: 2 })).toBe(false);
      expect(containsPosition(moves, { x: 4, y: 1 })).toBe(false);
      expect(containsPosition(moves, { x: 4, y: 0 })).toBe(false);
    });

    it('can capture but not go through enemy pieces', () => {
      const queen = createPiece('queen', 'white', { x: 4, y: 4 });
      const enemy = createPiece('pawn', 'black', { x: 4, y: 2 });
      const board = setupBoardWithPieces([queen, enemy]);

      const moves = generatePseudoLegalMoves(queen, board);

      expect(containsPosition(moves, { x: 4, y: 3 })).toBe(true);
      expect(containsPosition(moves, { x: 4, y: 2 })).toBe(true); // Can capture
      expect(containsPosition(moves, { x: 4, y: 1 })).toBe(false); // Blocked
    });
  });

  describe('Rook movement', () => {
    it('can move horizontally and vertically', () => {
      const rook = createPiece('rook', 'white', { x: 4, y: 4 });
      const board = setupBoardWithPieces([rook]);

      const moves = generatePseudoLegalMoves(rook, board);

      // 7 squares horizontally + 7 squares vertically = 14
      expect(moves).toHaveLength(14);
      // Horizontal
      expect(containsPosition(moves, { x: 0, y: 4 })).toBe(true);
      expect(containsPosition(moves, { x: 7, y: 4 })).toBe(true);
      // Vertical
      expect(containsPosition(moves, { x: 4, y: 0 })).toBe(true);
      expect(containsPosition(moves, { x: 4, y: 7 })).toBe(true);
      // Not diagonal
      expect(containsPosition(moves, { x: 5, y: 5 })).toBe(false);
    });

    it('is blocked by pieces in its path', () => {
      const rook = createPiece('rook', 'white', { x: 0, y: 0 });
      const blocker = createPiece('pawn', 'white', { x: 0, y: 3 });
      const board = setupBoardWithPieces([rook, blocker]);

      const moves = generatePseudoLegalMoves(rook, board);

      expect(containsPosition(moves, { x: 0, y: 1 })).toBe(true);
      expect(containsPosition(moves, { x: 0, y: 2 })).toBe(true);
      expect(containsPosition(moves, { x: 0, y: 3 })).toBe(false);
      expect(containsPosition(moves, { x: 0, y: 4 })).toBe(false);
    });
  });

  describe('Bishop movement', () => {
    it('can move diagonally', () => {
      const bishop = createPiece('bishop', 'white', { x: 4, y: 4 });
      const board = setupBoardWithPieces([bishop]);

      const moves = generatePseudoLegalMoves(bishop, board);

      expect(moves.length).toBeGreaterThan(10);
      // Diagonals
      expect(containsPosition(moves, { x: 0, y: 0 })).toBe(true);
      expect(containsPosition(moves, { x: 7, y: 7 })).toBe(true);
      expect(containsPosition(moves, { x: 7, y: 1 })).toBe(true);
      expect(containsPosition(moves, { x: 1, y: 7 })).toBe(true);
      // Not horizontal/vertical
      expect(containsPosition(moves, { x: 4, y: 5 })).toBe(false);
      expect(containsPosition(moves, { x: 5, y: 4 })).toBe(false);
    });

    it('is blocked by pieces diagonally', () => {
      const bishop = createPiece('bishop', 'white', { x: 0, y: 0 });
      const blocker = createPiece('pawn', 'white', { x: 2, y: 2 });
      const board = setupBoardWithPieces([bishop, blocker]);

      const moves = generatePseudoLegalMoves(bishop, board);

      expect(containsPosition(moves, { x: 1, y: 1 })).toBe(true);
      expect(containsPosition(moves, { x: 2, y: 2 })).toBe(false);
      expect(containsPosition(moves, { x: 3, y: 3 })).toBe(false);
    });
  });

  describe('Knight movement', () => {
    it('moves in L-shape', () => {
      const knight = createPiece('knight', 'white', { x: 4, y: 4 });
      const board = setupBoardWithPieces([knight]);

      const moves = generatePseudoLegalMoves(knight, board);

      expect(moves).toHaveLength(8);
      expect(containsPosition(moves, { x: 2, y: 3 })).toBe(true);
      expect(containsPosition(moves, { x: 2, y: 5 })).toBe(true);
      expect(containsPosition(moves, { x: 3, y: 2 })).toBe(true);
      expect(containsPosition(moves, { x: 3, y: 6 })).toBe(true);
      expect(containsPosition(moves, { x: 5, y: 2 })).toBe(true);
      expect(containsPosition(moves, { x: 5, y: 6 })).toBe(true);
      expect(containsPosition(moves, { x: 6, y: 3 })).toBe(true);
      expect(containsPosition(moves, { x: 6, y: 5 })).toBe(true);
    });

    it('can jump over pieces', () => {
      const knight = createPiece('knight', 'white', { x: 1, y: 0 });
      // Surround with pawns
      const pawn1 = createPiece('pawn', 'white', { x: 0, y: 1 });
      const pawn2 = createPiece('pawn', 'white', { x: 1, y: 1 });
      const pawn3 = createPiece('pawn', 'white', { x: 2, y: 1 });
      const board = setupBoardWithPieces([knight, pawn1, pawn2, pawn3]);

      const moves = generatePseudoLegalMoves(knight, board);

      // Knight can still jump out
      expect(containsPosition(moves, { x: 0, y: 2 })).toBe(true);
      expect(containsPosition(moves, { x: 2, y: 2 })).toBe(true);
      expect(containsPosition(moves, { x: 3, y: 1 })).toBe(true);
    });

    it('has limited moves in corner', () => {
      const knight = createPiece('knight', 'white', { x: 0, y: 0 });
      const board = setupBoardWithPieces([knight]);

      const moves = generatePseudoLegalMoves(knight, board);

      expect(moves).toHaveLength(2);
      expect(containsPosition(moves, { x: 1, y: 2 })).toBe(true);
      expect(containsPosition(moves, { x: 2, y: 1 })).toBe(true);
    });

    it('cannot land on own pieces', () => {
      const knight = createPiece('knight', 'white', { x: 4, y: 4 });
      const ownPiece = createPiece('pawn', 'white', { x: 2, y: 3 });
      const board = setupBoardWithPieces([knight, ownPiece]);

      const moves = generatePseudoLegalMoves(knight, board);

      expect(moves).toHaveLength(7);
      expect(containsPosition(moves, { x: 2, y: 3 })).toBe(false);
    });

    it('can capture enemy pieces', () => {
      const knight = createPiece('knight', 'white', { x: 4, y: 4 });
      const enemy = createPiece('pawn', 'black', { x: 2, y: 3 });
      const board = setupBoardWithPieces([knight, enemy]);

      const moves = generatePseudoLegalMoves(knight, board);

      expect(moves).toHaveLength(8);
      expect(containsPosition(moves, { x: 2, y: 3 })).toBe(true);
    });
  });

  describe('Pawn movement (Battlefield Chess)', () => {
    it('can move one square in all 4 orthogonal directions', () => {
      const pawn = createPiece('pawn', 'white', { x: 4, y: 4 });
      const board = setupBoardWithPieces([pawn]);

      const moves = generatePseudoLegalMoves(pawn, board);

      expect(moves).toHaveLength(4);
      expect(containsPosition(moves, { x: 4, y: 3 })).toBe(true); // up
      expect(containsPosition(moves, { x: 4, y: 5 })).toBe(true); // down
      expect(containsPosition(moves, { x: 3, y: 4 })).toBe(true); // left
      expect(containsPosition(moves, { x: 5, y: 4 })).toBe(true); // right
    });

    it('both colors move the same way (no direction preference)', () => {
      const whitePawn = createPiece('pawn', 'white', { x: 4, y: 4 });
      const blackPawn = createPiece('pawn', 'black', { x: 6, y: 6 });
      const board = setupBoardWithPieces([whitePawn, blackPawn]);

      const whiteMoves = generatePseudoLegalMoves(whitePawn, board);
      const blackMoves = generatePseudoLegalMoves(blackPawn, board);

      // Both should have 4 orthogonal moves
      expect(whiteMoves).toHaveLength(4);
      expect(blackMoves).toHaveLength(4);

      // White pawn can move in all 4 directions
      expect(containsPosition(whiteMoves, { x: 4, y: 3 })).toBe(true);
      expect(containsPosition(whiteMoves, { x: 4, y: 5 })).toBe(true);

      // Black pawn can also move in all 4 directions (same as white)
      expect(containsPosition(blackMoves, { x: 6, y: 5 })).toBe(true);
      expect(containsPosition(blackMoves, { x: 6, y: 7 })).toBe(true);
    });

    it('can capture in all 4 diagonal directions', () => {
      const pawn = createPiece('pawn', 'white', { x: 4, y: 4 });
      const enemy1 = createPiece('pawn', 'black', { x: 3, y: 3 });
      const enemy2 = createPiece('pawn', 'black', { x: 5, y: 3 });
      const enemy3 = createPiece('pawn', 'black', { x: 3, y: 5 });
      const enemy4 = createPiece('pawn', 'black', { x: 5, y: 5 });
      const board = setupBoardWithPieces([pawn, enemy1, enemy2, enemy3, enemy4]);

      const moves = generatePseudoLegalMoves(pawn, board);

      // 4 orthogonal moves + 4 diagonal captures
      expect(moves).toHaveLength(8);
      expect(containsPosition(moves, { x: 3, y: 3 })).toBe(true);
      expect(containsPosition(moves, { x: 5, y: 3 })).toBe(true);
      expect(containsPosition(moves, { x: 3, y: 5 })).toBe(true);
      expect(containsPosition(moves, { x: 5, y: 5 })).toBe(true);
    });

    it('cannot capture own pieces diagonally', () => {
      const pawn = createPiece('pawn', 'white', { x: 4, y: 4 });
      const own = createPiece('knight', 'white', { x: 3, y: 3 });
      const board = setupBoardWithPieces([pawn, own]);

      const moves = generatePseudoLegalMoves(pawn, board);

      expect(containsPosition(moves, { x: 3, y: 3 })).toBe(false);
    });

    it('cannot move through pieces orthogonally', () => {
      const pawn = createPiece('pawn', 'white', { x: 4, y: 4 });
      const blocker = createPiece('pawn', 'black', { x: 4, y: 3 });
      const board = setupBoardWithPieces([pawn, blocker]);

      const moves = generatePseudoLegalMoves(pawn, board);

      // Can move in 3 orthogonal directions (blocked above)
      // Can capture the blocker diagonally? No - it's orthogonal
      expect(containsPosition(moves, { x: 4, y: 3 })).toBe(false);
      expect(containsPosition(moves, { x: 4, y: 5 })).toBe(true);
      expect(containsPosition(moves, { x: 3, y: 4 })).toBe(true);
      expect(containsPosition(moves, { x: 5, y: 4 })).toBe(true);
    });

    it('has limited moves in corner', () => {
      const pawn = createPiece('pawn', 'white', { x: 0, y: 0 });
      const board = setupBoardWithPieces([pawn]);

      const moves = generatePseudoLegalMoves(pawn, board);

      expect(moves).toHaveLength(2);
      expect(containsPosition(moves, { x: 1, y: 0 })).toBe(true);
      expect(containsPosition(moves, { x: 0, y: 1 })).toBe(true);
    });

    it('cannot capture diagonally if square is empty', () => {
      const pawn = createPiece('pawn', 'white', { x: 4, y: 4 });
      const board = setupBoardWithPieces([pawn]);

      const moves = generatePseudoLegalMoves(pawn, board);

      // Only orthogonal moves, no diagonal (empty squares)
      expect(moves).toHaveLength(4);
      expect(containsPosition(moves, { x: 3, y: 3 })).toBe(false);
      expect(containsPosition(moves, { x: 5, y: 5 })).toBe(false);
    });
  });

  describe('getAttackedSquares', () => {
    it('returns all squares attacked by a color', () => {
      const rook = createPiece('rook', 'white', { x: 0, y: 0 });
      const board = setupBoardWithPieces([rook]);

      const attacked = getAttackedSquares('white', board);

      expect(attacked.has('0,1')).toBe(true);
      expect(attacked.has('1,0')).toBe(true);
      expect(attacked.has('7,0')).toBe(true);
      expect(attacked.has('0,7')).toBe(true);
    });

    it('includes pawn attack squares (all 4 diagonals in battlefield chess)', () => {
      const pawn = createPiece('pawn', 'white', { x: 4, y: 4 });
      const board = setupBoardWithPieces([pawn]);

      const attacked = getAttackedSquares('white', board);

      // Battlefield chess: Pawn attacks in all 4 diagonals
      expect(attacked.has('3,3')).toBe(true);
      expect(attacked.has('5,3')).toBe(true);
      expect(attacked.has('3,5')).toBe(true);
      expect(attacked.has('5,5')).toBe(true);
      // Pawn doesn't attack orthogonally
      expect(attacked.has('4,3')).toBe(false);
      expect(attacked.has('4,5')).toBe(false);
    });

    it('combines attacks from multiple pieces', () => {
      const knight = createPiece('knight', 'white', { x: 1, y: 0 });
      const bishop = createPiece('bishop', 'white', { x: 2, y: 0 });
      const board = setupBoardWithPieces([knight, bishop]);

      const attacked = getAttackedSquares('white', board);

      // Knight attacks
      expect(attacked.has('0,2')).toBe(true);
      expect(attacked.has('2,2')).toBe(true);
      // Bishop attacks
      expect(attacked.has('3,1')).toBe(true);
      expect(attacked.has('1,1')).toBe(true);
    });
  });
});
