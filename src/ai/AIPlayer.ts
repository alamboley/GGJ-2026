import type { Move, PlayerColor, GameState } from '../types';

export class AIPlayer {
  private color: PlayerColor;

  constructor(color: PlayerColor) {
    this.color = color;
  }

  getColor(): PlayerColor {
    return this.color;
  }

  calculateMove(_gameState: GameState): Move | null {
    // TODO: Implement AI logic
    return null;
  }
}
