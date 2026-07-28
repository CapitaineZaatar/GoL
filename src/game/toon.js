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
