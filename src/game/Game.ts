import { Board } from './Board';
import type { GameState, PlayerColor, Move } from '../types';

export class Game {
  private board: Board;
  private currentTurn: PlayerColor = 'white';
  private turnNumber: number = 1;

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

  getState(): GameState {
    return {
      pieces: this.board.getAllPieces(),
      currentTurn: this.currentTurn,
      turnNumber: this.turnNumber,
    };
  }

  executeMove(_move: Move): boolean {
    // TODO: Implement move validation and execution
    return false;
  }

  nextTurn(): void {
    this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
    if (this.currentTurn === 'white') {
      this.turnNumber++;
    }
  }
}
