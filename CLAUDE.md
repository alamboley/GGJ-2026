# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GGJ-2026 is a Global Game Jam 2026 project - a chess-based battle royale board game where:
- Chess pieces are deployed on a 12x12 battlefield
- Enemy pieces are masked/hidden from the player
- Players must analyze piece movements and memorize positions to deduce enemy pieces

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
