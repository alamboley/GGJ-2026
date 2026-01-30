import * as THREE from 'three';

export class Scene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  constructor(container: HTMLElement) {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 14, 14);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Add lighting
    this.setupLighting();

    // Add a placeholder chess board
    this.createPlaceholderBoard();

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize(container));
  }

  private setupLighting(): void {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Directional light for shadows and depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);
  }

  private createPlaceholderBoard(): void {
    const boardSize = 12;
    const tileSize = 1;

    for (let x = 0; x < boardSize; x++) {
      for (let z = 0; z < boardSize; z++) {
        const isLight = (x + z) % 2 === 0;
        const color = isLight ? 0xe8d4b8 : 0x8b4513;

        const geometry = new THREE.BoxGeometry(tileSize, 0.1, tileSize);
        const material = new THREE.MeshStandardMaterial({ color });
        const tile = new THREE.Mesh(geometry, material);

        tile.position.set(
          x * tileSize - (boardSize * tileSize) / 2 + tileSize / 2,
          0,
          z * tileSize - (boardSize * tileSize) / 2 + tileSize / 2
        );

        this.scene.add(tile);
      }
    }
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

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  startRenderLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      this.render();
    };
    animate();
  }
}
