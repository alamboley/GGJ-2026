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
