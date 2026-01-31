import * as THREE from 'three';
import type { Position, Move, PlayerColor, MoveHistoryEntry } from '../types';
import type { Scene } from './Scene';

interface ActiveAnimation {
  update: (deltaTime: number) => boolean; // Returns true when complete
}

export interface MoveAnimationOptions {
  duration?: number;
  arcHeightMultiplier?: number;
  easing?: 'inOutCubic' | 'outQuad';
}

export class AnimationManager {
  private scene: Scene;
  private activeAnimations: ActiveAnimation[] = [];
  private particles: THREE.Points[] = [];
  private cameraShakeOffset = new THREE.Vector3();
  private originalCameraPosition = new THREE.Vector3();
  private isShaking = false;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  update(deltaTime: number): void {
    // Update all active animations
    this.activeAnimations = this.activeAnimations.filter(
      (anim) => !anim.update(deltaTime)
    );

    // Update particles
    this.updateParticles(deltaTime);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  /**
   * Animate a piece moving from one position to another with an arc
   */
  animatePieceMove(
    pieceId: string,
    from: Position,
    to: Position,
    options: MoveAnimationOptions = {}
  ): Promise<void> {
    const {
      duration = 600,
      arcHeightMultiplier = 1.0,
      easing = 'inOutCubic',
    } = options;

    return new Promise((resolve) => {
      const mesh = this.scene.getPieceMeshes().get(pieceId);
      if (!mesh) {
        resolve();
        return;
      }

      const startPos = this.scene.boardToWorld(from);
      const endPos = this.scene.boardToWorld(to);

      // Calculate arc height based on distance, scaled by multiplier
      const distance = startPos.distanceTo(endPos);
      const baseArcHeight = Math.min(2, 0.5 + distance * 0.3);
      const arcHeight = baseArcHeight * arcHeightMultiplier;

      const easingFn =
        easing === 'outQuad' ? this.easeOutQuad.bind(this) : this.easeInOutCubic.bind(this);

      let elapsed = 0;

      const animation: ActiveAnimation = {
        update: (deltaTime: number) => {
          elapsed += deltaTime * 1000; // Convert to ms
          const t = Math.min(1, elapsed / duration);
          const easedT = easingFn(t);

          // Interpolate position
          mesh.position.x = startPos.x + (endPos.x - startPos.x) * easedT;
          mesh.position.z = startPos.z + (endPos.z - startPos.z) * easedT;

          // Arc on Y axis (parabola)
          const arcT = Math.sin(easedT * Math.PI);
          mesh.position.y = startPos.y + arcHeight * arcT;

          if (t >= 1) {
            // Ensure final position is exact
            mesh.position.copy(endPos);
            resolve();
            return true;
          }
          return false;
        },
      };

      this.activeAnimations.push(animation);
    });
  }

  /**
   * Animate a piece dying (falling backwards, fading out) - legacy method
   */
  animateDeath(pieceId: string, duration: number = 600): Promise<void> {
    return new Promise((resolve) => {
      const mesh = this.scene.getPieceMeshes().get(pieceId);
      if (!mesh) {
        resolve();
        return;
      }

      const startPos = mesh.position.clone();
      const startRotation = mesh.rotation.clone();
      let elapsed = 0;

      // Store original material opacity values
      const materials: { material: THREE.Material; originalOpacity: number }[] = [];
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          materials.push({ material: mat, originalOpacity: mat.opacity });
        }
      });

      const animation: ActiveAnimation = {
        update: (deltaTime: number) => {
          elapsed += deltaTime * 1000;
          const t = Math.min(1, elapsed / duration);
          const easedT = this.easeOutQuad(t);

          // Fall backwards (rotate around X axis)
          mesh.rotation.x = startRotation.x - easedT * (Math.PI / 2);

          // Sink into the ground
          mesh.position.y = startPos.y - easedT * 0.8;

          // Scale down slightly
          const scale = 1 - easedT * 0.3;
          mesh.scale.setScalar(scale);

          // Fade out
          const opacity = 1 - easedT;
          for (const { material } of materials) {
            (material as THREE.MeshStandardMaterial).opacity = opacity;
          }

          if (t >= 1) {
            // Remove the mesh from scene
            this.scene.removePieceMesh(pieceId);
            resolve();
            return true;
          }
          return false;
        },
      };

      this.activeAnimations.push(animation);
    });
  }

  /**
   * Animate a captured piece moving to the edge of the board
   */
  animateToCapture(pieceId: string, pieceColor: PlayerColor, duration: number = 800): Promise<void> {
    return new Promise((resolve) => {
      const mesh = this.scene.getPieceMeshes().get(pieceId);
      if (!mesh) {
        resolve();
        return;
      }

      const startPos = mesh.position.clone();
      const startScale = mesh.scale.clone();

      // Get target position on the edge
      const targetPos = this.scene.getCapturedPiecePosition(pieceColor);

      // Target scale (81% of current = 0.9 * 0.9) - all scaling done in animation
      const targetScale = startScale.clone().multiplyScalar(0.81);

      let elapsed = 0;

      const animation: ActiveAnimation = {
        update: (deltaTime: number) => {
          elapsed += deltaTime * 1000;
          const t = Math.min(1, elapsed / duration);
          const easedT = this.easeInOutCubic(t);

          // Interpolate position with arc
          const arcHeight = 2;
          const arcT = Math.sin(easedT * Math.PI);

          mesh.position.x = startPos.x + (targetPos.x - startPos.x) * easedT;
          mesh.position.z = startPos.z + (targetPos.z - startPos.z) * easedT;
          mesh.position.y = startPos.y + (targetPos.y - startPos.y) * easedT + arcHeight * arcT;

          // Interpolate scale smoothly
          mesh.scale.lerpVectors(startScale, targetScale, easedT);

          if (elapsed >= duration) {
            // Finalize position
            mesh.position.copy(targetPos);
            mesh.scale.copy(targetScale);

            // Remove from piece meshes tracking (no longer on board)
            this.scene.getPieceMeshes().delete(pieceId);

            // Add to captured pieces display
            this.scene.addCapturedPiece(mesh, pieceColor);

            resolve();
            return true;
          }
          return false;
        },
      };

      this.activeAnimations.push(animation);
    });
  }

  /**
   * Shake the camera briefly
   */
  shakeCamera(duration: number = 200, intensity: number = 0.15): Promise<void> {
    return new Promise((resolve) => {
      if (this.isShaking) {
        resolve();
        return;
      }

      const camera = this.scene.getCamera();
      this.originalCameraPosition.copy(camera.position);
      this.isShaking = true;

      let elapsed = 0;

      const animation: ActiveAnimation = {
        update: (deltaTime: number) => {
          elapsed += deltaTime * 1000;
          const t = Math.min(1, elapsed / duration);

          // Linear decay
          const currentIntensity = intensity * (1 - t);

          // Random shake offset
          this.cameraShakeOffset.set(
            (Math.random() - 0.5) * 2 * currentIntensity,
            (Math.random() - 0.5) * 2 * currentIntensity,
            (Math.random() - 0.5) * 2 * currentIntensity
          );

          camera.position.copy(this.originalCameraPosition).add(this.cameraShakeOffset);

          if (t >= 1) {
            camera.position.copy(this.originalCameraPosition);
            this.isShaking = false;
            resolve();
            return true;
          }
          return false;
        },
      };

      this.activeAnimations.push(animation);
    });
  }

  /**
   * Create particle burst at a position
   */
  createImpactParticles(position: Position, duration: number = 800): void {
    const worldPos = this.scene.boardToWorld(position);
    const particleCount = 20;

    // Create geometry with random positions
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = worldPos.x;
      positions[i * 3 + 1] = worldPos.y;
      positions[i * 3 + 2] = worldPos.z;

      // Random velocity outward with upward bias
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      velocities.push(
        new THREE.Vector3(
          Math.cos(angle) * speed,
          2 + Math.random() * 3, // Upward
          Math.sin(angle) * speed
        )
      );

      sizes[i] = 0.1 + Math.random() * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Create material with blood red color
    const material = new THREE.PointsMaterial({
      color: 0x8b0000,
      size: 0.15,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.getScene().add(particles);
    this.particles.push(particles);

    // Animate particles
    let elapsed = 0;
    const gravity = -9.8;

    const animation: ActiveAnimation = {
      update: (deltaTime: number) => {
        elapsed += deltaTime * 1000;
        const t = Math.min(1, elapsed / duration);

        const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;

        for (let i = 0; i < particleCount; i++) {
          const velocity = velocities[i];

          // Update position with velocity and gravity
          positionAttribute.setX(
            i,
            positionAttribute.getX(i) + velocity.x * deltaTime
          );
          positionAttribute.setY(
            i,
            positionAttribute.getY(i) + velocity.y * deltaTime
          );
          positionAttribute.setZ(
            i,
            positionAttribute.getZ(i) + velocity.z * deltaTime
          );

          // Apply gravity to velocity
          velocity.y += gravity * deltaTime;
        }

        positionAttribute.needsUpdate = true;

        // Fade out
        material.opacity = 1 - t;

        if (t >= 1) {
          // Remove particles
          this.scene.getScene().remove(particles);
          const index = this.particles.indexOf(particles);
          if (index > -1) {
            this.particles.splice(index, 1);
          }
          geometry.dispose();
          material.dispose();
          return true;
        }
        return false;
      },
    };

    this.activeAnimations.push(animation);
  }

  private updateParticles(_deltaTime: number): void {
    // Particles are updated via their animations
  }

  /**
   * Play the full cinematic capture sequence
   */
  async playCaptureSequence(
    move: Move,
    capturedPieceId: string,
    capturedPieceColor?: PlayerColor
  ): Promise<void> {
    // 1. Animate AI piece moving
    await this.animatePieceMove(move.pieceId, move.from, move.to, { duration: 600 });

    // 2. Impact effects (shake + particles happen together)
    this.createImpactParticles(move.to, 800);
    this.shakeCamera(200, 0.15);

    // 3. Animate captured piece to edge (if color provided) or use legacy death animation
    if (capturedPieceColor) {
      await this.animateToCapture(capturedPieceId, capturedPieceColor, 800);
    } else {
      await this.animateDeath(capturedPieceId, 600);
    }
  }

  /**
   * Play simple move animation (no capture)
   */
  async playMoveSequence(move: Move): Promise<void> {
    await this.animatePieceMove(move.pieceId, move.from, move.to, { duration: 600 });
  }

  /**
   * Check if any animations are currently running
   */
  isAnimating(): boolean {
    return this.activeAnimations.length > 0;
  }

  /**
   * Animate a restored piece appearing on the board (from captured area)
   */
  animateRestorePiece(
    mesh: THREE.Object3D,
    targetPosition: Position,
    duration: number = 500
  ): Promise<void> {
    return new Promise((resolve) => {
      const startPos = mesh.position.clone();
      const endPos = this.scene.boardToWorld(targetPosition);

      // Restore scale to original (1.5) - pieces are created at scale 1.5
      // Captured pieces were scaled down: 1.5 * 0.9 * 0.9 = 1.215
      const startScale = mesh.scale.clone();
      const originalScale = new THREE.Vector3(1.5, 1.5, 1.5);

      let elapsed = 0;

      const animation: ActiveAnimation = {
        update: (deltaTime: number) => {
          elapsed += deltaTime * 1000;
          const t = Math.min(1, elapsed / duration);
          const easedT = this.easeInOutCubic(t);

          // Interpolate position with arc
          const arcHeight = 2;
          const arcT = Math.sin(easedT * Math.PI);

          mesh.position.x = startPos.x + (endPos.x - startPos.x) * easedT;
          mesh.position.z = startPos.z + (endPos.z - startPos.z) * easedT;
          mesh.position.y = startPos.y + (endPos.y - startPos.y) * easedT + arcHeight * arcT;

          // Interpolate scale back to original size
          mesh.scale.lerpVectors(startScale, originalScale, easedT);

          if (t >= 1) {
            mesh.position.copy(endPos);
            mesh.scale.copy(originalScale);
            resolve();
            return true;
          }
          return false;
        },
      };

      this.activeAnimations.push(animation);
    });
  }

  /**
   * Play the full rewind sequence for a move
   */
  async playRewindSequence(
    entry: MoveHistoryEntry,
    restoredMesh?: THREE.Object3D
  ): Promise<void> {
    // If there was a captured piece, restore it first
    if (restoredMesh && entry.capturedPiece) {
      await this.animateRestorePiece(restoredMesh, entry.capturedPiece.position, 400);
    }

    // Then animate the piece moving back with rewind options (faster, lower arc, ease-out)
    await this.animatePieceMove(entry.move.pieceId, entry.move.to, entry.move.from, {
      duration: 400,
      arcHeightMultiplier: 0.6,
      easing: 'outQuad',
    });
  }
}
