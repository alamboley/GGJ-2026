import * as THREE from 'three';
import type { PieceType, PlayerColor } from '../../types';

const COLORS = {
  white: 0xffffff, // Pure white
  black: 0x1a1a1a, // Near black
};

export class PieceFactory {
  private whiteMaterial: THREE.MeshStandardMaterial;
  private blackMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.whiteMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.white,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0x333333,
      emissiveIntensity: 0.3,
    });
    this.blackMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.black,
      roughness: 0.3,
      metalness: 0.3,
      emissive: 0x222222,
      emissiveIntensity: 0.2,
    });
  }

  createPieceMesh(type: PieceType, color: PlayerColor): THREE.Mesh {
    const material = color === 'white' ? this.whiteMaterial : this.blackMaterial;

    switch (type) {
      case 'king':
        return this.createKing(material);
      case 'queen':
        return this.createQueen(material);
      case 'rook':
        return this.createRook(material);
      case 'bishop':
        return this.createBishop(material);
      case 'knight':
        return this.createKnight(material);
      case 'pawn':
        return this.createPawn(material);
    }
  }

  private createKing(material: THREE.MeshStandardMaterial): THREE.Mesh {
    const group = new THREE.Group();

    // Base cylinder
    const baseGeom = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 16);
    const base = new THREE.Mesh(baseGeom, material);
    base.position.y = 0.075;
    group.add(base);

    // Main body
    const bodyGeom = new THREE.CylinderGeometry(0.2, 0.25, 0.8, 16);
    const body = new THREE.Mesh(bodyGeom, material);
    body.position.y = 0.55;
    group.add(body);

    // Top sphere
    const headGeom = new THREE.SphereGeometry(0.15, 16, 16);
    const head = new THREE.Mesh(headGeom, material);
    head.position.y = 1.05;
    group.add(head);

    // Cross vertical
    const crossVGeom = new THREE.BoxGeometry(0.06, 0.25, 0.06);
    const crossV = new THREE.Mesh(crossVGeom, material);
    crossV.position.y = 1.3;
    group.add(crossV);

    // Cross horizontal
    const crossHGeom = new THREE.BoxGeometry(0.18, 0.06, 0.06);
    const crossH = new THREE.Mesh(crossHGeom, material);
    crossH.position.y = 1.35;
    group.add(crossH);

    // Merge into single mesh
    return this.mergeGroup(group, material);
  }

  private createQueen(material: THREE.MeshStandardMaterial): THREE.Mesh {
    const group = new THREE.Group();

    // Base
    const baseGeom = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 16);
    const base = new THREE.Mesh(baseGeom, material);
    base.position.y = 0.075;
    group.add(base);

    // Body
    const bodyGeom = new THREE.CylinderGeometry(0.18, 0.25, 0.7, 16);
    const body = new THREE.Mesh(bodyGeom, material);
    body.position.y = 0.5;
    group.add(body);

    // Crown ring
    const ringGeom = new THREE.TorusGeometry(0.15, 0.04, 8, 16);
    const ring = new THREE.Mesh(ringGeom, material);
    ring.position.y = 0.9;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Top sphere
    const topGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const top = new THREE.Mesh(topGeom, material);
    top.position.y = 1.05;
    group.add(top);

    return this.mergeGroup(group, material);
  }

  private createRook(material: THREE.MeshStandardMaterial): THREE.Mesh {
    const group = new THREE.Group();

    // Base
    const baseGeom = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 16);
    const base = new THREE.Mesh(baseGeom, material);
    base.position.y = 0.075;
    group.add(base);

    // Body
    const bodyGeom = new THREE.CylinderGeometry(0.2, 0.25, 0.5, 16);
    const body = new THREE.Mesh(bodyGeom, material);
    body.position.y = 0.4;
    group.add(body);

    // Top platform
    const topGeom = new THREE.CylinderGeometry(0.22, 0.2, 0.1, 16);
    const top = new THREE.Mesh(topGeom, material);
    top.position.y = 0.7;
    group.add(top);

    // Battlements
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const battGeom = new THREE.BoxGeometry(0.1, 0.15, 0.1);
      const batt = new THREE.Mesh(battGeom, material);
      batt.position.x = Math.cos(angle) * 0.15;
      batt.position.z = Math.sin(angle) * 0.15;
      batt.position.y = 0.825;
      group.add(batt);
    }

    return this.mergeGroup(group, material);
  }

  private createBishop(material: THREE.MeshStandardMaterial): THREE.Mesh {
    const group = new THREE.Group();

    // Base
    const baseGeom = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 16);
    const base = new THREE.Mesh(baseGeom, material);
    base.position.y = 0.075;
    group.add(base);

    // Body
    const bodyGeom = new THREE.CylinderGeometry(0.15, 0.25, 0.5, 16);
    const body = new THREE.Mesh(bodyGeom, material);
    body.position.y = 0.4;
    group.add(body);

    // Mitre (bishop's hat) - cone
    const mitreGeom = new THREE.ConeGeometry(0.15, 0.4, 16);
    const mitre = new THREE.Mesh(mitreGeom, material);
    mitre.position.y = 0.85;
    group.add(mitre);

    // Top ball
    const topGeom = new THREE.SphereGeometry(0.06, 16, 16);
    const top = new THREE.Mesh(topGeom, material);
    top.position.y = 1.1;
    group.add(top);

    return this.mergeGroup(group, material);
  }

  private createKnight(material: THREE.MeshStandardMaterial): THREE.Mesh {
    const group = new THREE.Group();

    // Base
    const baseGeom = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 16);
    const base = new THREE.Mesh(baseGeom, material);
    base.position.y = 0.075;
    group.add(base);

    // Body
    const bodyGeom = new THREE.CylinderGeometry(0.18, 0.25, 0.35, 16);
    const body = new THREE.Mesh(bodyGeom, material);
    body.position.y = 0.325;
    group.add(body);

    // Horse head - using boxes to approximate
    const headGeom = new THREE.BoxGeometry(0.15, 0.35, 0.25);
    const head = new THREE.Mesh(headGeom, material);
    head.position.y = 0.7;
    head.position.z = 0.05;
    head.rotation.x = -0.3;
    group.add(head);

    // Snout
    const snoutGeom = new THREE.BoxGeometry(0.1, 0.15, 0.2);
    const snout = new THREE.Mesh(snoutGeom, material);
    snout.position.y = 0.65;
    snout.position.z = 0.2;
    snout.rotation.x = -0.5;
    group.add(snout);

    // Ears
    const earGeom = new THREE.ConeGeometry(0.05, 0.12, 4);
    const ear1 = new THREE.Mesh(earGeom, material);
    ear1.position.set(-0.05, 0.92, -0.02);
    group.add(ear1);

    const ear2 = new THREE.Mesh(earGeom, material);
    ear2.position.set(0.05, 0.92, -0.02);
    group.add(ear2);

    return this.mergeGroup(group, material);
  }

  private createPawn(material: THREE.MeshStandardMaterial): THREE.Mesh {
    const group = new THREE.Group();

    // Base
    const baseGeom = new THREE.CylinderGeometry(0.2, 0.25, 0.1, 16);
    const base = new THREE.Mesh(baseGeom, material);
    base.position.y = 0.05;
    group.add(base);

    // Body
    const bodyGeom = new THREE.CylinderGeometry(0.12, 0.2, 0.3, 16);
    const body = new THREE.Mesh(bodyGeom, material);
    body.position.y = 0.25;
    group.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const head = new THREE.Mesh(headGeom, material);
    head.position.y = 0.52;
    group.add(head);

    return this.mergeGroup(group, material);
  }

  private mergeGroup(group: THREE.Group, material: THREE.MeshStandardMaterial): THREE.Mesh {
    const geometries: THREE.BufferGeometry[] = [];

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geom = child.geometry.clone();
        child.updateMatrix();
        geom.applyMatrix4(child.matrix);
        geometries.push(geom);
      }
    });

    const mergedGeometry = this.mergeGeometries(geometries);
    return new THREE.Mesh(mergedGeometry, material);
  }

  private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];

    for (const geom of geometries) {
      const posAttr = geom.getAttribute('position');
      const normAttr = geom.getAttribute('normal');

      for (let i = 0; i < posAttr.count; i++) {
        positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        if (normAttr) {
          normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
        }
      }
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (normals.length > 0) {
      merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }
    merged.computeVertexNormals();

    return merged;
  }
}
