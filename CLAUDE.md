# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GGJ-2026 is a Global Game Jam 2026 project - a chess-based battle royale board game where:
- Chess pieces are deployed on a **12x12 battlefield** (144 squares)
- Pieces are **randomly placed** at game start (no traditional starting positions)
- Enemy pieces are masked/hidden from the player
- Players must analyze piece movements and memorize positions to deduce enemy pieces

## Battlefield Chess Rules

This is not standard chess. Key rule differences:

### Board
- **12x12 grid** instead of 8x8

### Piece Placement
- All 32 pieces (16 per player) are **randomly scattered** across the board at game start
- No traditional starting rows

### Movement Rules
| Piece | Movement |
|-------|----------|
| **King** | 1 square in any direction (unchanged) |
| **Queen** | Any number of squares in any direction (unchanged) |
| **Rook** | Any number of squares orthogonally (unchanged) |
| **Bishop** | Any number of squares diagonally (unchanged) |
| **Knight** | L-shape jump (unchanged) |
| **Pawn** | **1 square in ANY orthogonal direction** (up/down/left/right). Captures diagonally in **all 4 directions**. No 2-square initial move. |

### Game Setup Methods
- `game.setupInitialPosition()` - Random battlefield placement (default)
- `game.setupClassicPosition()` - Traditional chess layout (for testing)

## Technology Stack

- **Language**: TypeScript
- **Build Tool**: Vite
- **3D Rendering**: Three.js
- **Game Mode**: Single Player vs AI

## Build Commands

```bash
npm install      # Install dependencies
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build
```

## Testing

Uses Vitest for unit and integration testing.

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode during development
npm run test:coverage # Run tests with coverage report
```

### Test Structure

```
src/
├── test-utils.ts                    # Shared test helpers
├── game/
│   ├── Board.test.ts                # Board CRUD and position tests
│   ├── Game.test.ts                 # Game flow and callbacks
│   └── pieces/
│       ├── MovementRules.test.ts    # Piece movement generation
│       └── MoveValidator.test.ts    # Check/checkmate/stalemate
├── ai/
│   └── AIPlayer.test.ts             # AI evaluation tests
tests/
└── integration/
    └── GameFlow.test.ts             # Full game scenarios
```

## Architecture

```
src/
├── main.ts              # Entry point
├── game/
│   ├── Game.ts          # Main game controller
│   ├── Board.ts         # Chess board logic
│   └── pieces/          # Chess piece classes
├── ai/
│   └── AIPlayer.ts      # AI opponent logic
├── rendering/
│   ├── Scene.ts         # Three.js scene setup
│   └── models/          # 3D models/meshes
└── types/
    └── index.ts         # TypeScript interfaces
```

When implementing new feature, update the test and run them.
