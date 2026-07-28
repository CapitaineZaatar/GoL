import * as THREE from 'three';

/** Génère une texture de gradient à paliers pour un rendu toon/cel-shaded (style Naruto Storm). */
export function createToonGradientTexture(stops = ['#3a2a4a', '#8a5a6a', '#e8b678', '#fff4d6']) {
  const canvas = document.createElement('canvas');
  canvas.width = stops.length;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  stops.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i, 0, 1, 1);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function toonMaterial(color, gradientMap, extra = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap, ...extra });
}

/**
 * Contour à la "inverted hull" : duplique chaque mesh du groupe, l'agrandit
 * légèrement et l'affiche depuis l'intérieur (BackSide) en couleur unie
 * derrière le mesh d'origine, pour un effet d'encrage façon anime/toon.
 */
export function addOutline(root, { color = '#170d0f', thickness = 0.045 } = {}) {
  const material = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  const meshes = [];
  root.traverse((obj) => { if (obj.isMesh) meshes.push(obj); });
  meshes.forEach((obj) => {
    const hull = new THREE.Mesh(obj.geometry, material);
    hull.scale.setScalar(1 + thickness);
    hull.castShadow = false;
    hull.receiveShadow = false;
    obj.add(hull);
  });
}
