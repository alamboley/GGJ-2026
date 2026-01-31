import * as THREE from 'three';
import type { Position } from '../types';

export class LightingSystem {
  private scene: THREE.Scene;

  // Check indicator light
  private checkSpotlight: THREE.SpotLight;
  private checkSpotlightTarget: THREE.Object3D;
  private checkGlowMesh: THREE.Mesh;

  constructor(scene: THREE.Scene, _boardSize: number) {
    this.scene = scene;

    // Setup all lighting
    this.setupAmbientLighting();
    this.checkSpotlight = this.createCheckSpotlight();
    this.checkSpotlightTarget = this.createSpotlightTarget();
    this.checkGlowMesh = this.createCheckGlowMesh();
  }

  private setupAmbientLighting(): void {
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

  private createSpotlightTarget(): THREE.Object3D {
    const target = new THREE.Object3D();
    this.scene.add(target);
    return target;
  }

  private createCheckSpotlight(): THREE.SpotLight {
    const spotlight = new THREE.SpotLight(0xff0000, 0, 15, Math.PI / 12, 0.4, 1.5);
    spotlight.position.set(0, 8, 0);
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 512;
    spotlight.shadow.mapSize.height = 512;
    this.scene.add(spotlight);
    return spotlight;
  }

  private createCheckGlowMesh(): THREE.Mesh {
    const ringGeometry = new THREE.RingGeometry(0.3, 0.5, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(ringGeometry, ringMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.07;
    this.scene.add(mesh);
    return mesh;
  }

  showCheckIndicator(position: Position, boardToWorld: (pos: Position) => THREE.Vector3): void {
    const worldPos = boardToWorld(position);

    // Position spotlight above the king
    this.checkSpotlight.position.set(worldPos.x, 8, worldPos.z);

    // Point target at the king's position
    this.checkSpotlightTarget.position.set(worldPos.x, 0.8, worldPos.z);
    this.checkSpotlight.target = this.checkSpotlightTarget;

    // Enable the light with red intensity
    this.checkSpotlight.intensity = 5;

    // Position and show the glowing red ring
    this.checkGlowMesh.position.set(worldPos.x, 0.07, worldPos.z);
    (this.checkGlowMesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
  }

  hideCheckIndicator(): void {
    this.checkSpotlight.intensity = 0;
    (this.checkGlowMesh.material as THREE.MeshBasicMaterial).opacity = 0;
  }
}
