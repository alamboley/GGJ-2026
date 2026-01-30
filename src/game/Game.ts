import { Board } from './Board';
import { getLegalMoves, getGameStatus, isLegalMove } from './pieces/MoveValidator';
import type { GameState, PlayerColor, Move, ChessPiece, PieceType, GameStatus, Position } from '../types';

type MoveCallback = (move: Move) => void;
type CaptureCallback = (pieceId: string) => void;
type GameOverCallback = (status: GameStatus, winner: PlayerColor | null) => void;
type TurnCallback = (turn: PlayerColor) => void;

export class Game {
  private board: Board;
  private currentTurn: PlayerColor = 'white';
  private turnNumber: number = 1;
  private lastMove: Move | null = null;
  private gameStatus: GameStatus = 'playing';

  // Event callbacks
  onPieceMoved: MoveCallback | null = null;
  onPieceCaptured: CaptureCallback | null = null;
  onGameOver: GameOverCallback | null = null;
  onTurnChanged: TurnCallback | null = null;

  constructor(boardSize: number = 8) {
    this.board = new Board(boardSize);
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

    // Define pieces for each player (standard chess pieces)
    const piecesPerPlayer: PieceType[] = [
      'king', 'queen',
      'rook', 'rook',
      'bishop', 'bishop',
      'knight', 'knight',
      'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn',
    ];

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

    // Handle capture
    const capturedPiece = this.board.getPieceAt(move.to);
    if (capturedPiece) {
      this.board.removePiece(capturedPiece.id);
      move.capturedPieceId = capturedPiece.id;
      this.onPieceCaptured?.(capturedPiece.id);
    }

    // Move the piece
    this.board.movePiece(move.pieceId, move.to);
    this.lastMove = move;

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
}
