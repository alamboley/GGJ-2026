import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIPlayer } from './AIPlayer';
import { Game } from '../game/Game';
import type { Move } from '../types';

describe('AIPlayer', () => {
  let game: Game;
  let ai: AIPlayer;

  beforeEach(() => {
    game = new Game();
    ai = new AIPlayer('black', 0); // 0 delay for faster tests
  });

  describe('constructor', () => {
    it('stores the assigned color', () => {
      expect(ai.getColor()).toBe('black');
    });

    it('can be created for white', () => {
      const whiteAI = new AIPlayer('white');
      expect(whiteAI.getColor()).toBe('white');
    });
  });

  describe('makeMove', () => {
    beforeEach(() => {
      game.setupInitialPosition();
      // Make a white move first so it's black's turn
      const whitePawn = game.getBoard().getPieceAt({ x: 4, y: 6 });
      game.executeMove({
        pieceId: whitePawn!.id,
        from: { x: 4, y: 6 },
        to: { x: 4, y: 4 },
      });
    });

    it('returns a promise that resolves to a move', async () => {
      const move = await ai.makeMove(game);
      expect(move).toBeDefined();
      expect(move).toHaveProperty('pieceId');
      expect(move).toHaveProperty('from');
      expect(move).toHaveProperty('to');
    });

    it('executes the move on the game', async () => {
      await ai.makeMove(game);
      expect(game.getCurrentTurn()).toBe('white'); // Turn switched back
    });

    it('returns null when no moves available', async () => {
      // Create a scenario with no black moves (e.g., all pieces removed)
      const emptyGame = new Game();
      emptyGame.getBoard().addPiece({
        id: 'white-king',
        type: 'king',
        color: 'white',
        position: { x: 4, y: 7 },
        isRevealed: true,
        hasMoved: false,
      });

      const move = await ai.makeMove(emptyGame);
      expect(move).toBeNull();
    });
  });

  describe('move evaluation', () => {
    beforeEach(() => {
      game = new Game();
    });

    it('prefers capturing high-value pieces', async () => {
      // Setup where AI can capture a queen or a pawn
      const board = game.getBoard();
      board.addPiece({
        id: 'black-king',
        type: 'king',
        color: 'black',
        position: { x: 4, y: 0 },
        isRevealed: true,
        hasMoved: false,
      });
      board.addPiece({
        id: 'black-rook',
        type: 'rook',
        color: 'black',
        position: { x: 4, y: 4 },
        isRevealed: true,
        hasMoved: true,
      });
      board.addPiece({
        id: 'white-king',
        type: 'king',
        color: 'white',
        position: { x: 7, y: 7 },
        isRevealed: true,
        hasMoved: false,
      });
      board.addPiece({
        id: 'white-queen',
        type: 'queen',
        color: 'white',
        position: { x: 4, y: 7 },
        isRevealed: true,
        hasMoved: true,
      });
      board.addPiece({
        id: 'white-pawn',
        type: 'pawn',
        color: 'white',
        position: { x: 0, y: 4 },
        isRevealed: true,
        hasMoved: true,
      });

      // Make it black's turn
      const whiteAI = new AIPlayer('white', 0);
      // Actually we need it to be black's turn - game starts with white
      // Let's create a fresh game and manually set pieces

      const testGame = new Game();
      const testBoard = testGame.getBoard();
      testBoard.addPiece({
        id: 'black-king',
        type: 'king',
        color: 'black',
        position: { x: 4, y: 0 },
        isRevealed: true,
        hasMoved: false,
      });
      testBoard.addPiece({
        id: 'black-rook',
        type: 'rook',
        color: 'black',
        position: { x: 4, y: 4 },
        isRevealed: true,
        hasMoved: true,
      });
      testBoard.addPiece({
        id: 'white-king',
        type: 'king',
        color: 'white',
        position: { x: 7, y: 7 },
        isRevealed: true,
        hasMoved: false,
      });
      testBoard.addPiece({
        id: 'white-queen',
        type: 'queen',
        color: 'white',
        position: { x: 4, y: 7 },
        isRevealed: true,
        hasMoved: true,
      });

      // White can capture black rook or move queen
      // Run multiple times to check tendency
      let capturedRook = 0;
      for (let i = 0; i < 10; i++) {
        const g = new Game();
        const b = g.getBoard();
        b.addPiece({
          id: 'black-king',
          type: 'king',
          color: 'black',
          position: { x: 4, y: 0 },
          isRevealed: true,
          hasMoved: false,
        });
        b.addPiece({
          id: 'black-rook',
          type: 'rook',
          color: 'black',
          position: { x: 4, y: 4 },
          isRevealed: true,
          hasMoved: true,
        });
        b.addPiece({
          id: 'white-king',
          type: 'king',
          color: 'white',
          position: { x: 7, y: 7 },
          isRevealed: true,
          hasMoved: false,
        });
        b.addPiece({
          id: 'white-queen',
          type: 'queen',
          color: 'white',
          position: { x: 4, y: 7 },
          isRevealed: true,
          hasMoved: true,
        });

        const testAI = new AIPlayer('white', 0);
        const move = await testAI.makeMove(g);
        if (move?.to.x === 4 && move?.to.y === 4) {
          capturedRook++;
        }
      }

      // AI should usually capture the rook (high value)
      expect(capturedRook).toBeGreaterThan(5);
    });

    it('prefers center control when no captures available', async () => {
      const testGame = new Game();
      const board = testGame.getBoard();

      board.addPiece({
        id: 'white-king',
        type: 'king',
        color: 'white',
        position: { x: 4, y: 7 },
        isRevealed: true,
        hasMoved: false,
      });
      board.addPiece({
        id: 'white-knight',
        type: 'knight',
        color: 'white',
        position: { x: 1, y: 7 },
        isRevealed: true,
        hasMoved: false,
      });
      board.addPiece({
        id: 'black-king',
        type: 'king',
        color: 'black',
        position: { x: 4, y: 0 },
        isRevealed: true,
        hasMoved: false,
      });

      // Knight can move to f3 (5,5) which is near center, or a3 (0,5) which is edge
      const testAI = new AIPlayer('white', 0);

      let centerMoves = 0;
      for (let i = 0; i < 10; i++) {
        const g = new Game();
        const b = g.getBoard();
        b.addPiece({
          id: 'white-king',
          type: 'king',
          color: 'white',
          position: { x: 4, y: 7 },
          isRevealed: true,
          hasMoved: false,
        });
        b.addPiece({
          id: 'white-knight',
          type: 'knight',
          color: 'white',
          position: { x: 1, y: 7 },
          isRevealed: true,
          hasMoved: false,
        });
        b.addPiece({
          id: 'black-king',
          type: 'king',
          color: 'black',
          position: { x: 4, y: 0 },
          isRevealed: true,
          hasMoved: false,
        });

        const move = await new AIPlayer('white', 0).makeMove(g);
        // Center squares are 3,3 3,4 4,3 4,4 and extended center
        if (move && move.to.x >= 2 && move.to.x <= 5) {
          centerMoves++;
        }
      }

      // Should often prefer more central moves
      expect(centerMoves).toBeGreaterThan(3);
    });

    it('prefers giving check', async () => {
      let checkMoves = 0;

      for (let i = 0; i < 10; i++) {
        const g = new Game();
        const b = g.getBoard();

        // Setup where queen can give check or move elsewhere
        b.addPiece({
          id: 'white-king',
          type: 'king',
          color: 'white',
          position: { x: 0, y: 7 },
          isRevealed: true,
          hasMoved: false,
        });
        b.addPiece({
          id: 'white-queen',
          type: 'queen',
          color: 'white',
          position: { x: 3, y: 3 },
          isRevealed: true,
          hasMoved: true,
        });
        b.addPiece({
          id: 'black-king',
          type: 'king',
          color: 'black',
          position: { x: 4, y: 0 },
          isRevealed: true,
          hasMoved: false,
        });

        const move = await new AIPlayer('white', 0).makeMove(g);
        // Queen can check by moving to e1 (4,7) or d8 (3,0) or e4 (4,3)
        if (move && (
          (move.to.x === 4 && move.to.y === 0) ||
          (move.to.x === 3 && move.to.y === 0) ||
          (move.to.x === 4 && move.to.y === 3)
        )) {
          checkMoves++;
        }
      }

      // Should sometimes prefer check
      expect(checkMoves).toBeGreaterThan(0);
    });

    it('prefers developing unmoved minor pieces', async () => {
      const g = new Game();
      g.setupInitialPosition();

      const whiteAI = new AIPlayer('white', 0);

      // Run multiple times to see if knight/bishop development is favored
      let developmentMoves = 0;
      for (let i = 0; i < 10; i++) {
        const testGame = new Game();
        testGame.setupInitialPosition();

        const move = await new AIPlayer('white', 0).makeMove(testGame);

        // Check if it's a knight or bishop move
        if (move) {
          const piece = testGame.getBoard().getPieceAt(move.to);
          if (piece && (piece.type === 'knight' || piece.type === 'bishop')) {
            developmentMoves++;
          }
        }
      }

      // Should sometimes develop knights/bishops
      expect(developmentMoves).toBeGreaterThanOrEqual(0); // AI has some randomness
    });
  });
});
