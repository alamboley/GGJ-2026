# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GGJ-2026 is a Global Game Jam 2026 project - a chess-based battle royale board game where:
- Chess pieces are deployed on a **12x12 battlefield** (144 squares)
- Pieces are **randomly placed** at game start (no traditional starting positions)
- Enemy pieces are masked/hidden from the player
- Players must analyze piece movements and memorize positions to deduce enemy pieces

## Chess Battlefield Rules

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

## Game Features

### Enemy Masking
- Enemy pieces appear as masked/obscured models
- Player must deduce piece types by observing movement patterns
- Captured enemy pieces are revealed
- Toggle button to show/hide masks (for debugging/testing)

### Rewind System
- Players can undo their last move (reverts both player and AI moves)
- Animated piece movement reversal
- Limited to one rewind per turn

### Interactive Minimap
- 2D board overview in top-right corner
- Shows all friendly pieces and masked enemies
- Click to select pieces or make moves
- Highlights valid moves and check status

### Configurable Game Settings
- Board size: 8x8 to 16x16 (default: 12x12)
- Pawns per player: 0 to 12 (default: 8)
- Live density calculation prevents invalid configurations

## Technology Stack

- **Language**: TypeScript
- **Build Tool**: Vite
- **3D Rendering**: Three.js
- **UI Framework**: React 19
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
├── main.tsx                 # React entry point & game orchestrator
├── game/
│   ├── Game.ts              # Main game controller (turn logic, win conditions)
│   ├── Board.ts             # Chess board state and piece management
│   ├── InputHandler.ts      # Mouse input, raycasting, piece selection
│   ├── RewindManager.ts     # Undo/rewind last move functionality
│   └── pieces/
│       ├── index.ts         # Piece class definitions
│       ├── MovementRules.ts # Legal move generation per piece type
│       └── MoveValidator.ts # Check/checkmate/stalemate validation
├── ai/
│   └── AIPlayer.ts          # AI opponent (minimax with evaluation)
├── rendering/
│   ├── Scene.ts             # Three.js scene, camera, render loop
│   ├── AnimationManager.ts  # Piece movement & capture animations
│   ├── HighlightSystem.ts   # Valid move & selection highlights
│   ├── LightingSystem.ts    # Scene lighting & check indicator
│   └── models/
│       ├── index.ts         # Model exports
│       └── PieceFactory.ts  # 3D model loading & mask effects
├── ui/
│   ├── MainMenu.tsx         # Start screen with game rules
│   ├── GameSettings.tsx     # Board size & pawn count config
│   ├── UIManager.ts         # In-game HUD (turn, moves, buttons)
│   ├── MinimapManager.ts    # 2D board overview with interaction
│   └── SettingsManager.ts   # Settings panel controller
└── types/
    └── index.ts             # TypeScript interfaces
```

When implementing new feature, update the test and run them.
