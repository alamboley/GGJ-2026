import * as THREE from 'three';
import type { Position } from '../types';

export class HighlightSystem {
  private scene: THREE.Scene;
  private boardSize: number;
  private highlightMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, boardSize: number) {
    this.scene = scene;
    this.boardSize = boardSize;
  }

  highlightSquares(positions: Position[], _boardToWorld: (pos: Position) => THREE.Vector3, color: number = 0x00ff00): void {
    // Note: We don't clear here - caller is responsible for clearing first if needed
    const halfBoard = this.boardSize / 2;

    for (const pos of positions) {
      const geometry = new THREE.PlaneGeometry(0.9, 0.9);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const highlight = new THREE.Mesh(geometry, material);

      highlight.position.set(
        pos.x - halfBoard + 0.5,
        0.06,
        pos.y - halfBoard + 0.5
      );
      highlight.rotation.x = -Math.PI / 2;

      this.highlightMeshes.push(highlight);
      this.scene.add(highlight);
    }
  }

  highlightSelectedSquare(position: Position, _boardToWorld: (pos: Position) => THREE.Vector3): void {
    const halfBoard = this.boardSize / 2;
    const geometry = new THREE.PlaneGeometry(0.95, 0.95);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const highlight = new THREE.Mesh(geometry, material);

    highlight.position.set(
      position.x - halfBoard + 0.5,
      0.061,
      position.y - halfBoard + 0.5
    );
    highlight.rotation.x = -Math.PI / 2;

    this.highlightMeshes.push(highlight);
    this.scene.add(highlight);
  }

  clearHighlights(): void {
    for (const mesh of this.highlightMeshes) {
      this.scene.remove(mesh);
    }
    this.highlightMeshes = [];
  }
}
