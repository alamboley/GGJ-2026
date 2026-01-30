import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PieceType, PlayerColor } from '../../types';

type ModelCache = {
  [key in PieceType]?: THREE.Group;
};

export class PieceFactory {
  private whiteMaterial: THREE.MeshStandardMaterial;
  private blackMaterial: THREE.MeshStandardMaterial;
  private loader: GLTFLoader;
  private modelCache: ModelCache = {};
  private modelsLoaded: boolean = false;

  constructor() {
    this.whiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.0,
    });
    this.blackMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.5,
      metalness: 0.0,
    });
    this.loader = new GLTFLoader();
  }

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    const pieceTypes: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];

    await Promise.all(
      pieceTypes.map(async (type) => {
        const gltf = await this.loader.loadAsync(`/assets/${type}.glb`);
        this.modelCache[type] = gltf.scene;
      })
    );

    this.modelsLoaded = true;
  }

  createPieceMesh(type: PieceType, color: PlayerColor): THREE.Object3D {
    const cachedModel = this.modelCache[type];

    if (!cachedModel) {
      console.warn(`Model for ${type} not loaded, using fallback`);
      return this.createFallbackMesh(type, color);
    }

    // Clone the model
    const clone = cachedModel.clone(true);

    // Create a fresh material for this piece
    const materialColor = color === 'white' ? 0xffffff : 0x222222;

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Create new material for each mesh
        child.material = new THREE.MeshStandardMaterial({
          color: materialColor,
          roughness: 0.5,
          metalness: 0.0,
          side: THREE.DoubleSide,
        });

        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;

        // Ensure geometry has computed normals
        if (child.geometry) {
          child.geometry.computeVertexNormals();
        }
      }
    });

    // Scale the model appropriately for the board
    clone.scale.set(1.5, 1.5, 1.5);

    return clone;
  }

  private createFallbackMesh(type: PieceType, color: PlayerColor): THREE.Object3D {
    const material = color === 'white' ? this.whiteMaterial : this.blackMaterial;

    // Simple fallback shapes
    let geometry: THREE.BufferGeometry;
    switch (type) {
      case 'king':
        geometry = new THREE.CylinderGeometry(0.2, 0.25, 0.8, 16);
        break;
      case 'queen':
        geometry = new THREE.CylinderGeometry(0.18, 0.25, 0.75, 16);
        break;
      case 'rook':
        geometry = new THREE.BoxGeometry(0.4, 0.6, 0.4);
        break;
      case 'bishop':
        geometry = new THREE.ConeGeometry(0.2, 0.7, 16);
        break;
      case 'knight':
        geometry = new THREE.BoxGeometry(0.35, 0.6, 0.35);
        break;
      case 'pawn':
        geometry = new THREE.SphereGeometry(0.2, 16, 16);
        break;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.3;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
