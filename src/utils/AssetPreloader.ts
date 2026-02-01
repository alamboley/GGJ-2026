import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PieceType } from '../types';

export interface PreloadedAssets {
  models: Map<PieceType, THREE.Group>;
  textures: {
    hdr: THREE.Texture;
    depth: THREE.Texture;
    logo: HTMLImageElement;
  };
}

type ProgressCallback = (loaded: number, total: number) => void;

export class AssetPreloader {
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;

  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
  }

  async preloadAll(onProgress?: ProgressCallback): Promise<PreloadedAssets> {
    const pieceTypes: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];

    // Total items: 6 models + 3 textures
    const totalItems = pieceTypes.length + 3;
    let loadedItems = 0;

    const reportProgress = () => {
      loadedItems++;
      onProgress?.(loadedItems, totalItems);
    };

    // Load all assets in parallel
    const [models, hdrTexture, depthTexture, logoImage] = await Promise.all([
      // Load all 3D models
      this.loadModels(pieceTypes, reportProgress),
      // Load HDR texture
      this.loadTexture('./assets/hdr_high.png').then((tex) => {
        reportProgress();
        return tex;
      }),
      // Load depth texture
      this.loadTexture('./assets/depth.png').then((tex) => {
        reportProgress();
        return tex;
      }),
      // Load logo image
      this.loadImage('./assets/logo.png').then((img) => {
        reportProgress();
        return img;
      }),
    ]);

    // Configure HDR texture
    hdrTexture.colorSpace = THREE.SRGBColorSpace;

    return {
      models,
      textures: {
        hdr: hdrTexture,
        depth: depthTexture,
        logo: logoImage,
      },
    };
  }

  private async loadModels(
    pieceTypes: PieceType[],
    onEachLoaded: () => void
  ): Promise<Map<PieceType, THREE.Group>> {
    const models = new Map<PieceType, THREE.Group>();

    await Promise.all(
      pieceTypes.map(async (type) => {
        const gltf = await this.gltfLoader.loadAsync(`./assets/${type}.glb`);
        models.set(type, gltf.scene);
        onEachLoaded();
      })
    );

    return models;
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    return this.textureLoader.loadAsync(url);
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
}
