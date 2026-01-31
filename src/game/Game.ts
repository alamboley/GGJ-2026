import { Board } from './Board';
import { getLegalMoves, getGameStatus, isLegalMove } from './pieces/MoveValidator';
import type { GameState, PlayerColor, Move, ChessPiece, PieceType, GameStatus, Position, MoveHistoryEntry, GameConfig } from '../types';

type MoveCallback = (move: Move) => void;
type CaptureCallback = (pieceId: string, pieceType: PieceType, pieceColor: PlayerColor) => void;
type GameOverCallback = (status: GameStatus, winner: PlayerColor | null) => void;
type TurnCallback = (turn: PlayerColor) => void;
type RewindCallback = (entry: MoveHistoryEntry) => void;

export class Game {
  private board: Board;
  private config: GameConfig;
  private currentTurn: PlayerColor = 'white';
  private turnNumber: number = 1;
  private lastMove: Move | null = null;
  private gameStatus: GameStatus = 'playing';
  private moveHistory: MoveHistoryEntry[] = [];

  // Event callbacks
  onPieceMoved: MoveCallback | null = null;
  onPieceCaptured: CaptureCallback | null = null;
  onGameOver: GameOverCallback | null = null;
  onTurnChanged: TurnCallback | null = null;
  onMoveRewound: RewindCallback | null = null;

  constructor(config: GameConfig = { boardSize: 12, pawnsPerPlayer: 8 }) {
    this.config = config;
    this.board = new Board(config.boardSize);
  }

  getConfig(): GameConfig {
    return this.config;
  }

  getBoard(): Board {
    return this.board;
  }

  getCurrentTurn(): PlayerColor {
    return this.currentTurn;
  }

  getTurnNumber(): number {
    return this.turnNumber;
  }

  getGameStatus(): GameStatus {
    return this.gameStatus;
  }

  getState(): GameState {
    return {
      pieces: this.board.getAllPieces(),
      currentTurn: this.currentTurn,
      turnNumber: this.turnNumber,
      lastMove: this.lastMove,
      gameStatus: this.gameStatus,
    };
  }

  setupInitialPosition(): void {
    this.setupRandomPosition();
    // Calculate initial game status (king might start in check with random placement)
    this.gameStatus = getGameStatus(this.currentTurn, this.board);
  }

  setupClassicPosition(): void {
    const backRankOrder: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

    // Black pieces (y=0 and y=1)
    for (let x = 0; x < 8; x++) {
      this.board.addPiece(this.createPiece(backRankOrder[x], 'black', { x, y: 0 }));
      this.board.addPiece(this.createPiece('pawn', 'black', { x, y: 1 }));
    }

    // White pieces (y=6 and y=7)
    for (let x = 0; x < 8; x++) {
      this.board.addPiece(this.createPiece('pawn', 'white', { x, y: 6 }));
      this.board.addPiece(this.createPiece(backRankOrder[x], 'white', { x, y: 7 }));
    }
  }

  setupRandomPosition(): void {
    const boardSize = this.board.getSize();

    // Generate all board positions
    const allPositions: Position[] = [];
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        allPositions.push({ x, y });
      }
    }

    // Fisher-Yates shuffle
    for (let i = allPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
    }

    // Build pieces list dynamically based on config
    const piecesPerPlayer: PieceType[] = [
      'king', 'queen',
      'rook', 'rook',
      'bishop', 'bishop',
      'knight', 'knight',
    ];

    // Add pawns based on config
    for (let i = 0; i < this.config.pawnsPerPlayer; i++) {
      piecesPerPlayer.push('pawn');
    }

    let positionIndex = 0;

    // Place white pieces
    for (const pieceType of piecesPerPlayer) {
      const pos = allPositions[positionIndex++];
      this.board.addPiece(this.createPiece(pieceType, 'white', pos));
    }

    // Place black pieces
    for (const pieceType of piecesPerPlayer) {
      const pos = allPositions[positionIndex++];
      this.board.addPiece(this.createPiece(pieceType, 'black', pos));
    }
  }

  private createPiece(type: PieceType, color: PlayerColor, position: Position): ChessPiece {
    return {
      id: `${color}-${type}-${position.x}-${position.y}`,
      type,
      color,
      position: { ...position },
      isRevealed: true,
      hasMoved: false,
    };
  }

  getValidMoves(piece: ChessPiece): Move[] {
    if (piece.color !== this.currentTurn) return [];
    if (this.gameStatus === 'checkmate' || this.gameStatus === 'stalemate') return [];
    return getLegalMoves(piece, this.board);
  }

  getValidMovesForPosition(position: Position): Move[] {
    const piece = this.board.getPieceAt(position);
    if (!piece) return [];
    return this.getValidMoves(piece);
  }

  executeMove(move: Move): boolean {
    if (this.gameStatus === 'checkmate' || this.gameStatus === 'stalemate') {
      return false;
    }

    const piece = this.board.getPiece(move.pieceId);
    if (!piece || piece.color !== this.currentTurn) {
      return false;
    }

    if (!isLegalMove(piece, move.to, this.board)) {
      return false;
    }

    // Capture state BEFORE making changes (for history)
    const previousHasMoved = piece.hasMoved;
    const previousTurn = this.currentTurn;
    const previousTurnNumber = this.turnNumber;
    const previousGameStatus = this.gameStatus;

    // Handle capture
    const capturedPiece = this.board.getPieceAt(move.to);
    let capturedPieceCopy: ChessPiece | null = null;
    if (capturedPiece) {
      // Store full copy of captured piece for restoration
      capturedPieceCopy = {
        ...capturedPiece,
        position: { ...capturedPiece.position },
      };
      const capturedType = capturedPiece.type;
      const capturedColor = capturedPiece.color;
      this.board.removePiece(capturedPiece.id);
      move.capturedPieceId = capturedPiece.id;
      this.onPieceCaptured?.(capturedPiece.id, capturedType, capturedColor);
    }

    // Move the piece
    this.board.movePiece(move.pieceId, move.to);
    this.lastMove = move;

    // Store history entry
    const historyEntry: MoveHistoryEntry = {
      move: { ...move, from: { ...move.from }, to: { ...move.to } },
      capturedPiece: capturedPieceCopy,
      previousHasMoved,
      previousTurn,
      previousTurnNumber,
      previousGameStatus,
    };
    this.moveHistory.push(historyEntry);

    // Fire move callback
    this.onPieceMoved?.(move);

    // Switch turns
    this.nextTurn();

    // Update game status
    this.gameStatus = getGameStatus(this.currentTurn, this.board);

    if (this.gameStatus === 'checkmate') {
      const winner = this.currentTurn === 'white' ? 'black' : 'white';
      this.onGameOver?.(this.gameStatus, winner);
    } else if (this.gameStatus === 'stalemate') {
      this.onGameOver?.(this.gameStatus, null);
    }

    // Fire turn changed callback
    this.onTurnChanged?.(this.currentTurn);

    return true;
  }

  private nextTurn(): void {
    this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
    if (this.currentTurn === 'white') {
      this.turnNumber++;
    }
  }

  isGameOver(): boolean {
    return this.gameStatus === 'checkmate' || this.gameStatus === 'stalemate';
  }

  /**
   * Undo the last move, restoring the previous game state
   * @returns The history entry that was undone, or null if no moves to undo
   */
  undoLastMove(): MoveHistoryEntry | null {
    const entry = this.moveHistory.pop();
    if (!entry) return null;

    const { move, capturedPiece, previousHasMoved, previousTurn, previousTurnNumber, previousGameStatus } = entry;

    // Move the piece back to its original position (without setting hasMoved)
    this.board.movePieceRaw(move.pieceId, move.from);

    // Restore the hasMoved flag
    const piece = this.board.getPiece(move.pieceId);
    if (piece) {
      piece.hasMoved = previousHasMoved;
    }

    // Restore captured piece if any
    if (capturedPiece) {
      this.board.addPiece({
        ...capturedPiece,
        position: { ...capturedPiece.position },
      });
    }

    // Restore game state
    this.currentTurn = previousTurn;
    this.turnNumber = previousTurnNumber;
    this.gameStatus = previousGameStatus;

    // Update lastMove to previous move (if any)
    if (this.moveHistory.length > 0) {
      this.lastMove = this.moveHistory[this.moveHistory.length - 1].move;
    } else {
      this.lastMove = null;
    }

    // Fire rewind callback
    this.onMoveRewound?.(entry);

    return entry;
  }

  /**
   * Check if there are moves that can be undone
   */
  canUndo(): boolean {
    return this.moveHistory.length > 0;
  }

  /**
   * Get the number of moves in history
   */
  getMoveHistoryLength(): number {
    return this.moveHistory.length;
  }

  /**
   * Clear move history (used on game reset)
   */
  clearHistory(): void {
    this.moveHistory = [];
  }
}
