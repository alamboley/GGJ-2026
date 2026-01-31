import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Position, PlayerColor } from '../types';
import type { AnimationManager } from './AnimationManager';
import type { PieceFactory } from './models/PieceFactory';
import { LightingSystem } from './LightingSystem';
import { HighlightSystem } from './HighlightSystem';

export class Scene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private boardSize: number;
  private pieceMeshes: Map<string, THREE.Object3D> = new Map();
  private boardGroup: THREE.Group;
  private animationManager: AnimationManager | null = null;
  private clock: THREE.Clock = new THREE.Clock();

  // Extracted systems
  private lightingSystem: LightingSystem;
  private highlightSystem: HighlightSystem;

  // Enemy piece masking
  private pieceMasks: Map<string, THREE.Group> = new Map(); // pieceId -> mask group
  private pieceFactory: PieceFactory | null = null;

  // Captured pieces display
  private capturedWhitePieces: THREE.Object3D[] = []; // White pieces captured by black
  private capturedBlackPieces: THREE.Object3D[] = []; // Black pieces captured by white

  constructor(container: HTMLElement, boardSize: number = 8) {
    this.boardSize = boardSize;

    // Create scene
    this.scene = new THREE.Scene();
    // No background color - sky dome will provide the background
    this.scene.fog = new THREE.FogExp2(0x5a6080, 0.02); // Atmospheric haze matching HDR

    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 15, 15);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Set up orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 45;
    this.controls.maxPolarAngle = Math.PI / 2.1;

    // Create sky dome (background)
    this.createSkyDome();

    // Initialize extracted systems
    this.lightingSystem = new LightingSystem(this.scene, boardSize);
    this.highlightSystem = new HighlightSystem(this.scene, boardSize);

    // Create board group for raycasting
    this.boardGroup = new THREE.Group();
    this.boardGroup.name = 'board';
    this.scene.add(this.boardGroup);

    // Create the chess board
    this.createBoard();

    // Handle window resize
    this.resizeHandler = () => this.onWindowResize(container);
    window.addEventListener('resize', this.resizeHandler);
  }

  private createSkyDome(): void {
    const textureLoader = new THREE.TextureLoader();

    // Load HDR and depth textures
    const hdrTexture = textureLoader.load('/assets/hdr_high.png');
    const depthTexture = textureLoader.load('/assets/depth.png');

    // Configure textures for spherical mapping
    hdrTexture.colorSpace = THREE.SRGBColorSpace;

    const skyGeometry = new THREE.SphereGeometry(80, 64, 64);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        hdrMap: { value: hdrTexture },
        depthMap: { value: depthTexture },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D hdrMap;
        uniform sampler2D depthMap;
        uniform float time;
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main() {
          // Sample depth for parallax effect
          float depth = texture2D(depthMap, vUv).r;

          // Add subtle parallax offset based on depth
          vec2 parallaxOffset = vec2(sin(time * 0.1) * 0.01, cos(time * 0.15) * 0.005) * depth;
          vec2 finalUv = vUv + parallaxOffset;

          // Sample HDR texture
          vec4 hdrColor = texture2D(hdrMap, finalUv);

          // Apply tone mapping for HDR-like effect
          vec3 color = hdrColor.rgb;
          color = color / (color + vec3(1.0)); // Reinhard tone mapping
          color = pow(color, vec3(1.0 / 2.2)); // Gamma correction

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
    });

    const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    skyMesh.name = 'skyDome';
    this.scene.add(skyMesh);
  }

  private createTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ffffff';
    context.font = 'bold 80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.8, 0.8, 1);

    return sprite;
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
        tile.receiveShadow = true;

        tile.position.set(
          x * tileSize - halfBoard + tileSize / 2,
          0,
          z * tileSize - halfBoard + tileSize / 2
        );

        tile.userData = { boardX: x, boardY: z };
        this.boardGroup.add(tile);
      }
    }

    // Add coordinate labels
    this.addCoordinateLabels(halfBoard);
  }

  private addCoordinateLabels(halfBoard: number): void {
    // Column labels (A-L) along the front edge (positive Z)
    const columnLabels = 'ABCDEFGHIJKL';
    for (let x = 0; x < this.boardSize; x++) {
      const label = columnLabels[x];
      if (label) {
        const sprite = this.createTextSprite(label);
        sprite.position.set(
          x - halfBoard + 0.5,
          0.1,
          halfBoard + 0.7
        );
        this.scene.add(sprite);
      }
    }

    // Row labels (1-12) along the left edge (negative X)
    for (let z = 0; z < this.boardSize; z++) {
      const label = String(z + 1);
      const sprite = this.createTextSprite(label);
      sprite.position.set(
        -halfBoard - 0.7,
        0.1,
        z - halfBoard + 0.5
      );
      this.scene.add(sprite);
    }
  }

  boardToWorld(position: Position): THREE.Vector3 {
    const halfBoard = this.boardSize / 2;
    return new THREE.Vector3(
      position.x - halfBoard + 0.5,
      0.8,
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

  addPieceMesh(pieceId: string, mesh: THREE.Object3D, position: Position): void {
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
    // Remove mask if present
    this.unmaskPiece(pieceId);

    const mesh = this.pieceMeshes.get(pieceId);
    if (mesh) {
      this.scene.remove(mesh);
      this.pieceMeshes.delete(pieceId);
    }
  }

  /**
   * Get the world position for a captured piece on the edge
   */
  getCapturedPiecePosition(color: 'white' | 'black'): THREE.Vector3 {
    const halfBoard = this.boardSize / 2;
    const capturedList = color === 'white' ? this.capturedWhitePieces : this.capturedBlackPieces;
    const index = capturedList.length;

    // Place pieces in rows of 8 along the edge
    const row = Math.floor(index / 8);
    const col = index % 8;

    // White captured pieces go on left edge (negative X), Black on right edge (positive X)
    const xOffset = color === 'white' ? -halfBoard - 1.5 - row * 0.8 : halfBoard + 1.5 + row * 0.8;
    const zPos = -halfBoard + col * 1.2 + 0.6;

    return new THREE.Vector3(xOffset, 0.6, zPos);
  }

  /**
   * Add a piece to the captured display area
   */
  addCapturedPiece(mesh: THREE.Object3D, color: 'white' | 'black'): void {
    const capturedList = color === 'white' ? this.capturedWhitePieces : this.capturedBlackPieces;

    // Scale is already animated in animateToCapture - no instant scaling needed
    // Rotation is handled by render loop (face camera) - no reset needed

    // Get position and update mesh
    const pos = this.getCapturedPiecePosition(color);
    mesh.position.copy(pos);

    // Reset opacity
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.transparent = false;
        mat.opacity = 1;
      }
    });

    capturedList.push(mesh);
  }

  /**
   * Remove a captured piece from the captured area and return it for restoration
   * @param pieceId The ID of the piece to restore
   * @param color The color of the piece (determines which captured list to search)
   * @returns The mesh if found, or null
   */
  restoreCapturedPiece(pieceId: string, color: PlayerColor): THREE.Object3D | null {
    const capturedList = color === 'white' ? this.capturedWhitePieces : this.capturedBlackPieces;

    // Find the mesh by pieceId
    const index = capturedList.findIndex((mesh) => mesh.userData.pieceId === pieceId);
    if (index === -1) return null;

    // Remove from captured list
    const mesh = capturedList.splice(index, 1)[0];

    // Reposition remaining captured pieces to fill the gap
    this.repositionCapturedPieces(color);

    // Add back to piece meshes tracking
    this.pieceMeshes.set(pieceId, mesh);

    return mesh;
  }

  /**
   * Reposition remaining captured pieces after one is restored
   */
  repositionCapturedPieces(color: PlayerColor): void {
    const capturedList = color === 'white' ? this.capturedWhitePieces : this.capturedBlackPieces;
    const halfBoard = this.boardSize / 2;

    capturedList.forEach((mesh, index) => {
      const row = Math.floor(index / 8);
      const col = index % 8;

      const xOffset = color === 'white' ? -halfBoard - 1.5 - row * 0.8 : halfBoard + 1.5 + row * 0.8;
      const zPos = -halfBoard + col * 1.2 + 0.6;

      mesh.position.set(xOffset, 0.6, zPos);
    });
  }

  // Delegate to HighlightSystem
  highlightSquares(positions: Position[], color: number = 0x00ff00): void {
    this.highlightSystem.highlightSquares(positions, (pos) => this.boardToWorld(pos), color);
  }

  highlightSelectedSquare(position: Position): void {
    this.highlightSystem.highlightSelectedSquare(position, (pos) => this.boardToWorld(pos));
  }

  clearHighlights(): void {
    this.highlightSystem.clearHighlights();
  }

  // Delegate to LightingSystem
  showCheckIndicator(position: Position): void {
    this.lightingSystem.showCheckIndicator(position, (pos) => this.boardToWorld(pos));
  }

  hideCheckIndicator(): void {
    this.lightingSystem.hideCheckIndicator();
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

  getPieceMeshes(): Map<string, THREE.Object3D> {
    return this.pieceMeshes;
  }

  getBoardSize(): number {
    return this.boardSize;
  }

  setAnimationManager(manager: AnimationManager): void {
    this.animationManager = manager;
  }

  setPieceFactory(factory: PieceFactory): void {
    this.pieceFactory = factory;
  }

  /**
   * Add a shadowy mask to hide an enemy piece's identity
   */
  maskPiece(pieceId: string): void {
    if (!this.pieceFactory) {
      console.warn('PieceFactory not set, cannot create mask');
      return;
    }

    const pieceMesh = this.pieceMeshes.get(pieceId);
    if (!pieceMesh) return;

    // Don't mask if already masked
    if (this.pieceMasks.has(pieceId)) return;

    // Hide the actual 3D piece model
    pieceMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name !== 'pieceMask' && child.name !== 'maskCore') {
        child.visible = false;
      }
    });

    const mask = this.pieceFactory.createMaskMesh();
    pieceMesh.add(mask);
    this.pieceMasks.set(pieceId, mask);
  }

  /**
   * Remove the mask from a piece (reveal its identity)
   */
  unmaskPiece(pieceId: string): void {
    const mask = this.pieceMasks.get(pieceId);
    if (!mask) return;

    const pieceMesh = this.pieceMeshes.get(pieceId);
    if (pieceMesh) {
      pieceMesh.remove(mask);

      // Show the actual 3D piece model again
      pieceMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.visible = true;
        }
      });
    }

    // Dispose mask resources (it's a group with particles and core)
    mask.traverse((child) => {
      if (child instanceof THREE.Points || child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    this.pieceMasks.delete(pieceId);
  }

  /**
   * Check if a piece is currently masked
   */
  isPieceMasked(pieceId: string): boolean {
    return this.pieceMasks.has(pieceId);
  }

  /**
   * Get all currently masked piece IDs
   */
  getMaskedPieceIds(): string[] {
    return Array.from(this.pieceMasks.keys());
  }

  /**
   * Unmask all pieces
   */
  unmaskAllPieces(): void {
    const pieceIds = this.getMaskedPieceIds();
    for (const pieceId of pieceIds) {
      this.unmaskPiece(pieceId);
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private animationFrameId: number | null = null;
  private resizeHandler: (() => void) | null = null;

  startRenderLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      const deltaTime = this.clock.getDelta();
      const elapsedTime = this.clock.getElapsedTime();

      // Update sky dome shader time
      const skyDome = this.scene.getObjectByName('skyDome') as THREE.Mesh;
      if (skyDome && skyDome.material instanceof THREE.ShaderMaterial) {
        skyDome.material.uniforms.time.value = elapsedTime;
      }

      // Update mask particle shader time uniforms for animated fire effect
      this.pieceMasks.forEach((maskGroup) => {
        maskGroup.traverse((child) => {
          if (child instanceof THREE.Points) {
            const material = child.material as THREE.ShaderMaterial;
            if (material.uniforms?.time) {
              material.uniforms.time.value = elapsedTime;
            }
          }
        });
      });

      // Make pieces face the camera (Y-axis rotation only)
      const cameraPos = this.camera.position;
      const rotateToCam = (mesh: THREE.Object3D) => {
        const dx = cameraPos.x - mesh.position.x;
        const dz = cameraPos.z - mesh.position.z;
        mesh.rotation.y = Math.atan2(dx, dz);
      };
      this.pieceMeshes.forEach(rotateToCam);
      this.capturedWhitePieces.forEach(rotateToCam);
      this.capturedBlackPieces.forEach(rotateToCam);

      // Update animation manager if present
      if (this.animationManager) {
        this.animationManager.update(deltaTime);
      }

      this.controls.update();
      this.render();
    };
    animate();
  }

  dispose(): void {
    // Stop animation loop
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    // Dispose all piece masks
    this.pieceMasks.forEach((_, pieceId) => {
      this.unmaskPiece(pieceId);
    });
    this.pieceMasks.clear();

    // Dispose all piece meshes
    this.pieceMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    this.pieceMeshes.clear();

    // Dispose captured pieces
    [...this.capturedWhitePieces, ...this.capturedBlackPieces].forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    this.capturedWhitePieces = [];
    this.capturedBlackPieces = [];

    // Dispose board and scene objects
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

    // Dispose highlight and lighting systems
    this.highlightSystem.clearHighlights();
    this.lightingSystem.hideCheckIndicator();

    // Dispose controls and renderer
    this.controls.dispose();
    this.renderer.dispose();

    // Remove canvas from DOM
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
