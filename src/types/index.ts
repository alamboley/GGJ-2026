// Chess piece types
export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export type PlayerColor = 'white' | 'black';

export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate';

export interface Position {
  x: number; // 0-7 for standard 8x8 board
  y: number;
}

export interface ChessPiece {
  id: string;
  type: PieceType;
  color: PlayerColor;
  position: Position;
  isRevealed: boolean; // For fog of war mechanic
  hasMoved: boolean;
}

export interface Move {
  pieceId: string;
  from: Position;
  to: Position;
  capturedPieceId?: string;
}

export interface GameState {
  pieces: ChessPiece[];
  currentTurn: PlayerColor;
  turnNumber: number;
  lastMove: Move | null;
  gameStatus: GameStatus;
}

export interface MoveHistoryEntry {
  move: Move;
  capturedPiece: ChessPiece | null;  // Full piece data for restoration
  previousHasMoved: boolean;          // Moving piece's hasMoved before move
  previousTurn: PlayerColor;
  previousTurnNumber: number;
  previousGameStatus: GameStatus;
}

export interface GameConfig {
  boardSize: number;      // 8-16
  pawnsPerPlayer: number; // 0-12
}
