import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Position } from '../types';

export class Scene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private boardSize: number;
  private pieceMeshes: Map<string, THREE.Object3D> = new Map();
  private highlightMeshes: THREE.Mesh[] = [];
  private boardGroup: THREE.Group;

  constructor(container: HTMLElement, boardSize: number = 8) {
    this.boardSize = boardSize;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x3a3020);
    this.scene.fog = new THREE.FogExp2(0x3a3020, 0.025); // Warm battlefield haze

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

    // Create ground plane
    this.createGround();

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

  private createSkyDome(): void {
    const skyGeometry = new THREE.SphereGeometry(80, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x2a1a4a) },    // Deep purple
        bottomColor: { value: new THREE.Color(0xd4a574) }, // Sunset amber
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float t = max(0.0, h);
          gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    this.scene.add(new THREE.Mesh(skyGeometry, skyMaterial));
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(60, 60);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d4a2d, // Dark grass/mud
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private setupLighting(): void {
    // Hemisphere light for natural sky/ground ambient
    const hemiLight = new THREE.HemisphereLight(0xd4a574, 0x3d4a2d, 0.4);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    // Main directional light (sun) - warm amber for sunset
    const directionalLight = new THREE.DirectionalLight(0xffd4a0, 1.2);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    this.scene.add(directionalLight);

    // Fill light from opposite side - cooler tone
    const fillLight = new THREE.DirectionalLight(0x8888cc, 0.4);
    fillLight.position.set(-10, 15, -10);
    this.scene.add(fillLight);

    // Front fill light to show face details - warm
    const frontLight = new THREE.DirectionalLight(0xffd4a0, 0.3);
    frontLight.position.set(0, 10, 15);
    this.scene.add(frontLight);
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

  getPieceMeshes(): Map<string, THREE.Object3D> {
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
