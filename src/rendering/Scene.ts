import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Position } from '../types';

export class Scene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private boardSize: number;
  private pieceMeshes: Map<string, THREE.Mesh> = new Map();
  private highlightMeshes: THREE.Mesh[] = [];
  private boardGroup: THREE.Group;

  constructor(container: HTMLElement, boardSize: number = 8) {
    this.boardSize = boardSize;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 10, 10);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Set up orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    this.controls.maxPolarAngle = Math.PI / 2.1;

    // Add lighting
    this.setupLighting();

    // Create board group for raycasting
    this.boardGroup = new THREE.Group();
    this.boardGroup.name = 'board';
    this.scene.add(this.boardGroup);

    // Create the chess board
    this.createBoard();

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize(container));
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-5, 10, -5);
    this.scene.add(directionalLight2);
  }

  private createBoard(): void {
    const tileSize = 1;
    const halfBoard = (this.boardSize * tileSize) / 2;

    for (let x = 0; x < this.boardSize; x++) {
      for (let z = 0; z < this.boardSize; z++) {
        const isLight = (x + z) % 2 === 0;
        const color = isLight ? 0xe8d4b8 : 0x8b4513;

        const geometry = new THREE.BoxGeometry(tileSize, 0.1, tileSize);
        const material = new THREE.MeshStandardMaterial({ color });
        const tile = new THREE.Mesh(geometry, material);

        tile.position.set(
          x * tileSize - halfBoard + tileSize / 2,
          0,
          z * tileSize - halfBoard + tileSize / 2
        );

        tile.userData = { boardX: x, boardY: z };
        this.boardGroup.add(tile);
      }
    }
  }

  boardToWorld(position: Position): THREE.Vector3 {
    const halfBoard = this.boardSize / 2;
    return new THREE.Vector3(
      position.x - halfBoard + 0.5,
      0.05,
      position.y - halfBoard + 0.5
    );
  }

  worldToBoard(worldPos: THREE.Vector3): Position | null {
    const halfBoard = this.boardSize / 2;
    const x = Math.floor(worldPos.x + halfBoard);
    const y = Math.floor(worldPos.z + halfBoard);

    if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
      return { x, y };
    }
    return null;
  }

  addPieceMesh(pieceId: string, mesh: THREE.Mesh, position: Position): void {
    const worldPos = this.boardToWorld(position);
    mesh.position.copy(worldPos);
    mesh.userData.pieceId = pieceId;
    this.pieceMeshes.set(pieceId, mesh);
    this.scene.add(mesh);
  }

  updatePiecePosition(pieceId: string, position: Position): void {
    const mesh = this.pieceMeshes.get(pieceId);
    if (mesh) {
      const worldPos = this.boardToWorld(position);
      mesh.position.copy(worldPos);
    }
  }

  removePieceMesh(pieceId: string): void {
    const mesh = this.pieceMeshes.get(pieceId);
    if (mesh) {
      this.scene.remove(mesh);
      this.pieceMeshes.delete(pieceId);
    }
  }

  highlightSquares(positions: Position[], color: number = 0x00ff00): void {
    this.clearHighlights();

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

  highlightSelectedSquare(position: Position): void {
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

  private onWindowResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  getBoardGroup(): THREE.Group {
    return this.boardGroup;
  }

  getPieceMeshes(): Map<string, THREE.Mesh> {
    return this.pieceMeshes;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  startRenderLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      this.controls.update();
      this.render();
    };
    animate();
  }
}
