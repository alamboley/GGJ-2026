// Chess piece types
export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export type PlayerColor = 'white' | 'black';

export interface Position {
  x: number; // 0-11 for 12x12 battle royale grid
  y: number;
}

export interface ChessPiece {
  id: string;
  type: PieceType;
  color: PlayerColor;
  position: Position;
  isRevealed: boolean; // For fog of war mechanic
}

export interface GameState {
  pieces: ChessPiece[];
  currentTurn: PlayerColor;
  turnNumber: number;
}

export interface Move {
  pieceId: string;
  from: Position;
  to: Position;
}
