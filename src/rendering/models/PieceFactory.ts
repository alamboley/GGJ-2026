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

  constructor(preloadedModels?: Map<PieceType, THREE.Group>) {
    this.whiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.0,
    });
    this.blackMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.5,
      metalness: 0.0,
    });

    this.loader = new GLTFLoader();

    // Use preloaded models if provided
    if (preloadedModels) {
      preloadedModels.forEach((model, type) => {
        this.modelCache[type] = model;
      });
      this.modelsLoaded = true;
    }
  }

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    const pieceTypes: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];

    await Promise.all(
      pieceTypes.map(async (type) => {
        const gltf = await this.loader.loadAsync(`./assets/${type}.glb`);
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
    const materialColor = color === 'white' ? 0xffffff : 0x999999;

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

  /**
   * Creates a particle-based fire/fog mask to hide enemy piece identity
   */
  createMaskMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'pieceMask';

    const particleCount = 150;

    // Create geometry with particle positions and attributes
    const positions = new Float32Array(particleCount * 3);
    const randomOffsets = new Float32Array(particleCount); // For varied animation
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Distribute particles in a cylinder around the piece
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.4;
      const height = Math.random() * 1.2 - 0.4; // Shift down by 0.4

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      randomOffsets[i] = Math.random() * Math.PI * 2;
      sizes[i] = 0.15 + Math.random() * 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('randomOffset', new THREE.BufferAttribute(randomOffsets, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Particle shader material for fire/fog effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: window.devicePixelRatio || 1.0 },
        baseColor: { value: new THREE.Color(0x1a0a2e) },   // Deep purple-black
        midColor: { value: new THREE.Color(0x4a1a6e) },    // Purple
        tipColor: { value: new THREE.Color(0x8b2a9e) },    // Bright purple tip
      },
      vertexShader: `
        precision highp float;

        attribute float randomOffset;
        attribute float size;

        uniform float time;
        uniform float pixelRatio;

        varying float vLife;
        varying float vRandom;

        void main() {
          vRandom = randomOffset;

          // Animate particles rising and swirling
          vec3 pos = position;

          // Rising motion with loop
          float speed = 0.8 + randomOffset * 0.4;
          float cycleTime = mod(time * speed + randomOffset * 2.0, 2.0);
          pos.y = cycleTime * 0.6;

          // Swirling motion
          float swirl = sin(time * 2.0 + randomOffset * 6.28) * 0.15;
          float angle = atan(position.z, position.x) + swirl;
          float radius = length(position.xz) * (1.0 + sin(time + randomOffset) * 0.2);

          pos.x = cos(angle) * radius;
          pos.z = sin(angle) * radius;

          // Expand as particles rise
          pos.x *= 1.0 + cycleTime * 0.3;
          pos.z *= 1.0 + cycleTime * 0.3;

          // Life for color/opacity gradient (0 at bottom, 1 at top)
          vLife = cycleTime / 2.0;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

          // Size attenuation and variation, scaled by pixel ratio for mobile
          float finalSize = size * (1.0 - vLife * 0.5);
          gl_PointSize = finalSize * (300.0 / -mvPosition.z) * pixelRatio;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        precision mediump float;

        uniform vec3 baseColor;
        uniform vec3 midColor;
        uniform vec3 tipColor;

        varying float vLife;
        varying float vRandom;

        void main() {
          // Soft circular particle
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          // Soft edge falloff
          float alpha = 1.0 - smoothstep(0.2, 0.5, dist);

          // Color gradient based on height (life)
          vec3 color;
          if (vLife < 0.4) {
            color = mix(baseColor, midColor, vLife / 0.4);
          } else {
            color = mix(midColor, tipColor, (vLife - 0.4) / 0.6);
          }

          // Fade out at top
          alpha *= 1.0 - smoothstep(0.6, 1.0, vLife);

          // Add some variation
          alpha *= 0.7 + sin(vRandom * 10.0) * 0.3;

          gl_FragColor = vec4(color, alpha * 0.85);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    particles.name = 'fireParticles';
    group.add(particles);

    // Add a dark core sphere to fully obscure the piece
    const coreGeometry = new THREE.SphereGeometry(0.42, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a0510,
      transparent: true,
      opacity: 0.95,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.name = 'maskCore';
    core.position.y = -0.1; // Lowered to cover the piece base
    group.add(core);

    return group;
  }
}
