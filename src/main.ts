import { Scene } from './rendering/Scene';

function init(): void {
  const container = document.getElementById('app');

  if (!container) {
    console.error('Could not find #app container');
    return;
  }

  const scene = new Scene(container);
  scene.startRenderLoop();

  console.log('GGJ-2026 Chess Battle Royale initialized!');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
