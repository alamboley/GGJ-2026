import { useState, useMemo } from 'react';
import './GameSettings.css';
import type { GameConfig } from '../types';

interface GameSettingsProps {
  initialConfig: GameConfig;
  onLaunch: (config: GameConfig) => void;
  onBack: () => void;
  onBoardSizeChange?: (boardSize: number) => void;
}

export function GameSettings({ initialConfig, onLaunch, onBack, onBoardSizeChange }: GameSettingsProps) {
  const [boardSize, setBoardSize] = useState(initialConfig.boardSize);
  const [pawnsPerPlayer, setPawnsPerPlayer] = useState(initialConfig.pawnsPerPlayer);

  const handleBoardSizeChange = (newSize: number) => {
    setBoardSize(newSize);
    onBoardSizeChange?.(newSize);
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalSquares = boardSize * boardSize;
    // Standard pieces per player: 1 king, 1 queen, 2 rooks, 2 bishops, 2 knights = 8
    const standardPieces = 8;
    const piecesPerPlayer = standardPieces + pawnsPerPlayer;
    const totalPieces = piecesPerPlayer * 2;
    const density = ((totalPieces / totalSquares) * 100).toFixed(1);
    const isValid = totalPieces <= totalSquares;

    return {
      totalSquares,
      piecesPerPlayer,
      totalPieces,
      density,
      isValid,
    };
  }, [boardSize, pawnsPerPlayer]);

  const handleLaunch = () => {
    if (summary.isValid) {
      onLaunch({ boardSize, pawnsPerPlayer });
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-content">
        <h1 className="settings-title">Game Settings</h1>

        <div className="settings-section">
          <div className="setting-row">
            <label className="setting-label">
              Board Size: <span className="setting-value">{boardSize}x{boardSize}</span>
            </label>
            <input
              type="range"
              min="8"
              max="16"
              value={boardSize}
              onChange={(e) => handleBoardSizeChange(Number(e.target.value))}
              className="setting-slider"
            />
            <div className="slider-labels">
              <span>8</span>
              <span>16</span>
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-label">
              Pawns per Player: <span className="setting-value">{pawnsPerPlayer}</span>
            </label>
            <input
              type="range"
              min="0"
              max="12"
              value={pawnsPerPlayer}
              onChange={(e) => setPawnsPerPlayer(Number(e.target.value))}
              className="setting-slider"
            />
            <div className="slider-labels">
              <span>0</span>
              <span>12</span>
            </div>
          </div>
        </div>

        <div className="summary-section">
          <h3 className="summary-title">Game Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total Squares</span>
              <span className="summary-value">{summary.totalSquares}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Pieces per Player</span>
              <span className="summary-value">{summary.piecesPerPlayer}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Pieces</span>
              <span className="summary-value">{summary.totalPieces}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Board Density</span>
              <span className="summary-value">{summary.density}%</span>
            </div>
          </div>
          {!summary.isValid && (
            <div className="validation-error">
              Too many pieces for the board size!
            </div>
          )}
        </div>

        <div className="settings-buttons">
          <button className="back-button" onClick={onBack}>
            Back
          </button>
          <button
            className="launch-button"
            onClick={handleLaunch}
            disabled={!summary.isValid}
          >
            Launch Game
          </button>
        </div>
      </div>
    </div>
  );
}
