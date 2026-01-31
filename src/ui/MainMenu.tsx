import './MainMenu.css';

interface MainMenuProps {
  onStart: () => void;
}

export function MainMenu({ onStart }: MainMenuProps) {
  return (
    <div className="menu-overlay">
      <div className="menu-content">
        <img src="/assets/logo.png" alt="Battlefield Chess" className="menu-logo" />
        <h1 className="menu-title">Battlefield Chess</h1>
        <p className="menu-subtitle">A Chess Battle Royale</p>

        <div className="rules-section">
          <h3 className="rules-title">How to Play</h3>
          <ul className="rules-list">
            <li><strong>12x12 Board</strong> — Larger battlefield than standard chess</li>
            <li><strong>Random Start</strong> — All pieces are scattered randomly</li>
            <li><strong>Hidden Enemy</strong> — Enemy pieces are masked - deduce them by observing movements</li>
            <li><strong>Modified Pawns</strong> — Move 1 square in ANY direction (up/down/left/right)</li>
            <li><strong>Pawn Captures</strong> — Capture diagonally in all 4 directions</li>
            <li><strong>Goal</strong> — Checkmate the enemy King!</li>
          </ul>
        </div>

        <button className="start-button" onClick={onStart}>
          Start Game
        </button>
      </div>
    </div>
  );
}
