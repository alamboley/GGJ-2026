import type { ChessPiece, Position, PlayerColor } from '../../types';
import { Board } from '../Board';

// Direction offsets for different piece types
const KING_OFFSETS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],          [0, 1],
  [1, -1], [1, 0], [1, 1],
];

const KNIGHT_OFFSETS: [number, number][] = [
  [-2, -1], [-2, 1],
  [-1, -2], [-1, 2],
  [1, -2], [1, 2],
  [2, -1], [2, 1],
];

const ROOK_DIRECTIONS: [number, number][] = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
];

const BISHOP_DIRECTIONS: [number, number][] = [
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const QUEEN_DIRECTIONS: [number, number][] = [
  ...ROOK_DIRECTIONS,
  ...BISHOP_DIRECTIONS,
];

export function generatePseudoLegalMoves(piece: ChessPiece, board: Board): Position[] {
  switch (piece.type) {
    case 'king':
      return getOffsetMoves(piece, board, KING_OFFSETS);
    case 'queen':
      return getSlidingMoves(piece, board, QUEEN_DIRECTIONS);
    case 'rook':
      return getSlidingMoves(piece, board, ROOK_DIRECTIONS);
    case 'bishop':
      return getSlidingMoves(piece, board, BISHOP_DIRECTIONS);
    case 'knight':
      return getOffsetMoves(piece, board, KNIGHT_OFFSETS);
    case 'pawn':
      return getPawnMoves(piece, board);
    default:
      return [];
  }
}

function getOffsetMoves(piece: ChessPiece, board: Board, offsets: [number, number][]): Position[] {
  const moves: Position[] = [];
  const { x, y } = piece.position;

  for (const [dx, dy] of offsets) {
    const newPos: Position = { x: x + dx, y: y + dy };

    if (!board.isValidPosition(newPos)) continue;

    const targetPiece = board.getPieceAt(newPos);
    if (!targetPiece || targetPiece.color !== piece.color) {
      moves.push(newPos);
    }
  }

  return moves;
}

function getSlidingMoves(piece: ChessPiece, board: Board, directions: [number, number][]): Position[] {
  const moves: Position[] = [];
  const { x, y } = piece.position;

  for (const [dx, dy] of directions) {
    let newX = x + dx;
    let newY = y + dy;

    while (board.isValidPosition({ x: newX, y: newY })) {
      const targetPiece = board.getPieceAt({ x: newX, y: newY });

      if (!targetPiece) {
        moves.push({ x: newX, y: newY });
      } else {
        if (targetPiece.color !== piece.color) {
          moves.push({ x: newX, y: newY });
        }
        break;
      }

      newX += dx;
      newY += dy;
    }
  }

  return moves;
}

function getPawnMoves(piece: ChessPiece, board: Board): Position[] {
  const moves: Position[] = [];
  const { x, y } = piece.position;
  const direction = piece.color === 'white' ? -1 : 1;
  const startRow = piece.color === 'white' ? 6 : 1;

  // Forward one square
  const oneForward: Position = { x, y: y + direction };
  if (board.isValidPosition(oneForward) && !board.getPieceAt(oneForward)) {
    moves.push(oneForward);

    // Forward two squares from starting position
    if (y === startRow) {
      const twoForward: Position = { x, y: y + 2 * direction };
      if (!board.getPieceAt(twoForward)) {
        moves.push(twoForward);
      }
    }
  }

  // Diagonal captures
  const captureOffsets = [
    { x: x - 1, y: y + direction },
    { x: x + 1, y: y + direction },
  ];

  for (const capturePos of captureOffsets) {
    if (!board.isValidPosition(capturePos)) continue;

    const targetPiece = board.getPieceAt(capturePos);
    if (targetPiece && targetPiece.color !== piece.color) {
      moves.push(capturePos);
    }
  }

  return moves;
}

export function getAttackedSquares(color: PlayerColor, board: Board): Set<string> {
  const attacked = new Set<string>();
  const pieces = board.getPiecesByColor(color);

  for (const piece of pieces) {
    const targets = getAttackSquaresForPiece(piece, board);
    for (const pos of targets) {
      attacked.add(`${pos.x},${pos.y}`);
    }
  }

  return attacked;
}

function getAttackSquaresForPiece(piece: ChessPiece, board: Board): Position[] {
  if (piece.type === 'pawn') {
    return getPawnAttackSquares(piece);
  }
  return generatePseudoLegalMoves(piece, board);
}

function getPawnAttackSquares(piece: ChessPiece): Position[] {
  const { x, y } = piece.position;
  const direction = piece.color === 'white' ? -1 : 1;

  return [
    { x: x - 1, y: y + direction },
    { x: x + 1, y: y + direction },
  ];
}
