import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from './Board';
import { createPiece, setupEmptyBoard } from '../test-utils';

describe('Board', () => {
  let board: Board;

  beforeEach(() => {
    board = setupEmptyBoard();
  });

  describe('constructor', () => {
    it('creates board with default size 8', () => {
      const b = new Board();
      expect(b.getSize()).toBe(8);
    });

    it('creates board with custom size', () => {
      const b = new Board(12);
      expect(b.getSize()).toBe(12);
    });

    it('starts with no pieces', () => {
      expect(board.getAllPieces()).toHaveLength(0);
    });
  });

  describe('addPiece', () => {
    it('adds a piece to the board', () => {
      const piece = createPiece('king', 'white', { x: 4, y: 7 });
      board.addPiece(piece);
      expect(board.getAllPieces()).toHaveLength(1);
    });

    it('can add multiple pieces', () => {
      board.addPiece(createPiece('king', 'white', { x: 4, y: 7 }));
      board.addPiece(createPiece('queen', 'white', { x: 3, y: 7 }));
      board.addPiece(createPiece('king', 'black', { x: 4, y: 0 }));
      expect(board.getAllPieces()).toHaveLength(3);
    });
  });

  describe('removePiece', () => {
    it('removes a piece from the board', () => {
      const piece = createPiece('king', 'white', { x: 4, y: 7 });
      board.addPiece(piece);
      board.removePiece(piece.id);
      expect(board.getAllPieces()).toHaveLength(0);
    });

    it('does nothing when removing non-existent piece', () => {
      board.addPiece(createPiece('king', 'white', { x: 4, y: 7 }));
      board.removePiece('non-existent-id');
      expect(board.getAllPieces()).toHaveLength(1);
    });
  });

  describe('getPiece', () => {
    it('returns piece by id', () => {
      const piece = createPiece('king', 'white', { x: 4, y: 7 });
      board.addPiece(piece);
      expect(board.getPiece(piece.id)).toEqual(piece);
    });

    it('returns undefined for non-existent id', () => {
      expect(board.getPiece('non-existent')).toBeUndefined();
    });
  });

  describe('getPieceAt', () => {
    it('returns piece at position', () => {
      const piece = createPiece('king', 'white', { x: 4, y: 7 });
      board.addPiece(piece);
      expect(board.getPieceAt({ x: 4, y: 7 })).toEqual(piece);
    });

    it('returns undefined for empty position', () => {
      expect(board.getPieceAt({ x: 0, y: 0 })).toBeUndefined();
    });

    it('finds piece among multiple pieces', () => {
      board.addPiece(createPiece('king', 'white', { x: 4, y: 7 }));
      board.addPiece(createPiece('queen', 'white', { x: 3, y: 7 }));
      const knight = createPiece('knight', 'white', { x: 1, y: 7 });
      board.addPiece(knight);

      expect(board.getPieceAt({ x: 1, y: 7 })).toEqual(knight);
    });
  });

  describe('getPiecesByColor', () => {
    it('returns all pieces of specified color', () => {
      board.addPiece(createPiece('king', 'white', { x: 4, y: 7 }));
      board.addPiece(createPiece('queen', 'white', { x: 3, y: 7 }));
      board.addPiece(createPiece('king', 'black', { x: 4, y: 0 }));

      const whitePieces = board.getPiecesByColor('white');
      expect(whitePieces).toHaveLength(2);
      expect(whitePieces.every(p => p.color === 'white')).toBe(true);
    });

    it('returns empty array when no pieces of color', () => {
      board.addPiece(createPiece('king', 'white', { x: 4, y: 7 }));
      expect(board.getPiecesByColor('black')).toHaveLength(0);
    });
  });

  describe('findPiece', () => {
    it('finds piece by type and color', () => {
      const whiteKing = createPiece('king', 'white', { x: 4, y: 7 });
      board.addPiece(whiteKing);
      board.addPiece(createPiece('king', 'black', { x: 4, y: 0 }));

      expect(board.findPiece('king', 'white')).toEqual(whiteKing);
    });

    it('returns undefined if not found', () => {
      board.addPiece(createPiece('king', 'white', { x: 4, y: 7 }));
      expect(board.findPiece('queen', 'white')).toBeUndefined();
    });
  });

  describe('movePiece', () => {
    it('updates piece position', () => {
      const piece = createPiece('king', 'white', { x: 4, y: 7 });
      board.addPiece(piece);

      const result = board.movePiece(piece.id, { x: 4, y: 6 });

      expect(result).toBe(true);
      const movedPiece = board.getPiece(piece.id);
      expect(movedPiece?.position).toEqual({ x: 4, y: 6 });
    });

    it('sets hasMoved to true', () => {
      const piece = createPiece('king', 'white', { x: 4, y: 7 }, false);
      board.addPiece(piece);
      board.movePiece(piece.id, { x: 4, y: 6 });

      expect(board.getPiece(piece.id)?.hasMoved).toBe(true);
    });

    it('returns false for non-existent piece', () => {
      const result = board.movePiece('non-existent', { x: 4, y: 6 });
      expect(result).toBe(false);
    });

    it('can be found at new position after move', () => {
      const piece = createPiece('king', 'white', { x: 4, y: 7 });
      board.addPiece(piece);
      board.movePiece(piece.id, { x: 4, y: 6 });

      expect(board.getPieceAt({ x: 4, y: 6 })).toEqual(board.getPiece(piece.id));
      expect(board.getPieceAt({ x: 4, y: 7 })).toBeUndefined();
    });
  });

  describe('isValidPosition', () => {
    it('returns true for valid positions', () => {
      expect(board.isValidPosition({ x: 0, y: 0 })).toBe(true);
      expect(board.isValidPosition({ x: 7, y: 7 })).toBe(true);
      expect(board.isValidPosition({ x: 4, y: 4 })).toBe(true);
    });

    it('returns false for negative x', () => {
      expect(board.isValidPosition({ x: -1, y: 0 })).toBe(false);
    });

    it('returns false for negative y', () => {
      expect(board.isValidPosition({ x: 0, y: -1 })).toBe(false);
    });

    it('returns false for x >= size', () => {
      expect(board.isValidPosition({ x: 8, y: 0 })).toBe(false);
    });

    it('returns false for y >= size', () => {
      expect(board.isValidPosition({ x: 0, y: 8 })).toBe(false);
    });

    it('respects custom board size', () => {
      const largeBoard = new Board(12);
      expect(largeBoard.isValidPosition({ x: 11, y: 11 })).toBe(true);
      expect(largeBoard.isValidPosition({ x: 12, y: 0 })).toBe(false);
    });
  });

  describe('clone', () => {
    it('creates a copy with same pieces', () => {
      board.addPiece(createPiece('king', 'white', { x: 4, y: 7 }));
      board.addPiece(createPiece('queen', 'white', { x: 3, y: 7 }));

      const cloned = board.clone();

      expect(cloned.getAllPieces()).toHaveLength(2);
    });

    it('cloned board is independent', () => {
      const piece = createPiece('king', 'white', { x: 4, y: 7 });
      board.addPiece(piece);

      const cloned = board.clone();
      cloned.movePiece(piece.id, { x: 4, y: 6 });

      // Original should be unchanged
      expect(board.getPiece(piece.id)?.position).toEqual({ x: 4, y: 7 });
      // Clone should be updated
      expect(cloned.getPiece(piece.id)?.position).toEqual({ x: 4, y: 6 });
    });

    it('cloned pieces have independent positions', () => {
      const piece = createPiece('king', 'white', { x: 4, y: 7 });
      board.addPiece(piece);

      const cloned = board.clone();
      const clonedPiece = cloned.getPiece(piece.id);

      // Modify cloned piece position
      if (clonedPiece) clonedPiece.position.x = 0;

      // Original should be unchanged
      expect(board.getPiece(piece.id)?.position.x).toBe(4);
    });

    it('preserves board size', () => {
      const largeBoard = new Board(12);
      const cloned = largeBoard.clone();
      expect(cloned.getSize()).toBe(12);
    });
  });
});
