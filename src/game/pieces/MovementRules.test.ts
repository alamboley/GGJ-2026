import { describe, it, expect } from 'vitest';
import { generatePseudoLegalMoves, getAttackedSquares } from './MovementRules';
import { createPiece, setupEmptyBoard, setupBoardWithPieces, containsPosition } from '../../test-utils';
import type { Position } from '../../types';

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

  describe('Pawn movement', () => {
    describe('white pawn', () => {
      it('can move one square forward', () => {
        const pawn = createPiece('pawn', 'white', { x: 4, y: 4 }, true);
        const board = setupBoardWithPieces([pawn]);

        const moves = generatePseudoLegalMoves(pawn, board);

        expect(containsPosition(moves, { x: 4, y: 3 })).toBe(true);
      });

      it('can move two squares from starting position', () => {
        const pawn = createPiece('pawn', 'white', { x: 4, y: 6 }); // row 6 is white pawn start
        const board = setupBoardWithPieces([pawn]);

        const moves = generatePseudoLegalMoves(pawn, board);

        expect(moves).toHaveLength(2);
        expect(containsPosition(moves, { x: 4, y: 5 })).toBe(true);
        expect(containsPosition(moves, { x: 4, y: 4 })).toBe(true);
      });

      it('cannot move two squares if blocked', () => {
        const pawn = createPiece('pawn', 'white', { x: 4, y: 6 });
        const blocker = createPiece('pawn', 'black', { x: 4, y: 5 });
        const board = setupBoardWithPieces([pawn, blocker]);

        const moves = generatePseudoLegalMoves(pawn, board);

        expect(moves).toHaveLength(0);
      });

      it('cannot move two if first square blocked', () => {
        const pawn = createPiece('pawn', 'white', { x: 4, y: 6 });
        const blocker = createPiece('pawn', 'black', { x: 4, y: 4 });
        const board = setupBoardWithPieces([pawn, blocker]);

        const moves = generatePseudoLegalMoves(pawn, board);

        expect(moves).toHaveLength(1);
        expect(containsPosition(moves, { x: 4, y: 5 })).toBe(true);
        expect(containsPosition(moves, { x: 4, y: 4 })).toBe(false);
      });

      it('can capture diagonally', () => {
        const pawn = createPiece('pawn', 'white', { x: 4, y: 4 }, true);
        const enemy1 = createPiece('pawn', 'black', { x: 3, y: 3 });
        const enemy2 = createPiece('pawn', 'black', { x: 5, y: 3 });
        const board = setupBoardWithPieces([pawn, enemy1, enemy2]);

        const moves = generatePseudoLegalMoves(pawn, board);

        expect(moves).toHaveLength(3); // forward + 2 captures
        expect(containsPosition(moves, { x: 3, y: 3 })).toBe(true);
        expect(containsPosition(moves, { x: 5, y: 3 })).toBe(true);
      });

      it('cannot capture own pieces diagonally', () => {
        const pawn = createPiece('pawn', 'white', { x: 4, y: 4 }, true);
        const own = createPiece('knight', 'white', { x: 3, y: 3 });
        const board = setupBoardWithPieces([pawn, own]);

        const moves = generatePseudoLegalMoves(pawn, board);

        expect(containsPosition(moves, { x: 3, y: 3 })).toBe(false);
      });

      it('cannot capture forward', () => {
        const pawn = createPiece('pawn', 'white', { x: 4, y: 4 }, true);
        const enemy = createPiece('pawn', 'black', { x: 4, y: 3 });
        const board = setupBoardWithPieces([pawn, enemy]);

        const moves = generatePseudoLegalMoves(pawn, board);

        expect(moves).toHaveLength(0);
      });
    });

    describe('black pawn', () => {
      it('moves in opposite direction', () => {
        const pawn = createPiece('pawn', 'black', { x: 4, y: 4 }, true);
        const board = setupBoardWithPieces([pawn]);

        const moves = generatePseudoLegalMoves(pawn, board);

        expect(containsPosition(moves, { x: 4, y: 5 })).toBe(true);
        expect(containsPosition(moves, { x: 4, y: 3 })).toBe(false);
      });

      it('can move two squares from starting position', () => {
        const pawn = createPiece('pawn', 'black', { x: 4, y: 1 }); // row 1 is black pawn start
        const board = setupBoardWithPieces([pawn]);

        const moves = generatePseudoLegalMoves(pawn, board);

        expect(moves).toHaveLength(2);
        expect(containsPosition(moves, { x: 4, y: 2 })).toBe(true);
        expect(containsPosition(moves, { x: 4, y: 3 })).toBe(true);
      });

      it('captures diagonally forward (down)', () => {
        const pawn = createPiece('pawn', 'black', { x: 4, y: 4 }, true);
        const enemy = createPiece('pawn', 'white', { x: 3, y: 5 });
        const board = setupBoardWithPieces([pawn, enemy]);

        const moves = generatePseudoLegalMoves(pawn, board);

        expect(containsPosition(moves, { x: 3, y: 5 })).toBe(true);
      });
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

    it('includes pawn attack squares (not forward moves)', () => {
      const pawn = createPiece('pawn', 'white', { x: 4, y: 4 });
      const board = setupBoardWithPieces([pawn]);

      const attacked = getAttackedSquares('white', board);

      // Pawn attacks diagonally
      expect(attacked.has('3,3')).toBe(true);
      expect(attacked.has('5,3')).toBe(true);
      // Pawn doesn't attack forward
      expect(attacked.has('4,3')).toBe(false);
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
