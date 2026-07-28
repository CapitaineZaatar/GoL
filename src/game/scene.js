import * as THREE from 'three';
import { createToonGradientTexture, toonMaterial } from './toon.js';

function createSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#241238');
  grad.addColorStop(0.45, '#5a2f52');
  grad.addColorStop(0.72, '#c96a4e');
  grad.addColorStop(1, '#f2b45f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFloorTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c9a876';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  ctx.strokeStyle = 'rgba(120, 84, 48, 0.35)';
  ctx.lineWidth = 3;
  for (let r = 40; r < size / 2; r += 40) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(120, 84, 48, 0.5)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 - 10, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildColumn(gradientMap) {
  const group = new THREE.Group();
  const shaftMat = toonMaterial('#e9e1cf', gradientMap);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 3.4, 12), shaftMat);
  shaft.position.y = 1.9;
  shaft.castShadow = true;
  group.add(shaft);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 12), shaftMat);
  base.position.y = 0.12;
  group.add(base);

  const capital = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 0.95), shaftMat);
  capital.position.y = 3.75;
  group.add(capital);

  return group;
}

function buildCrowdTier(count, radius, y, gradientMap) {
  const geo = new THREE.CapsuleGeometry(0.16, 0.32, 2, 4);
  const colors = ['#7a4b3a', '#9c5b3c', '#5f3a52', '#8a6b3f', '#4a5a6b'];
  const group = new THREE.Group();
  const dummies = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 0.85 - Math.PI * 0.425;
    const mat = toonMaterial(colors[i % colors.length], gradientMap);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(Math.sin(angle) * radius, y, -Math.cos(angle) * radius);
    mesh.userData.baseY = y;
    mesh.userData.phase = Math.random() * Math.PI * 2;
    group.add(mesh);
    dummies.push(mesh);
  }
  return { group, members: dummies };
}

function buildStepTread(radius, y, gradientMap) {
  const mat = toonMaterial('#a97e52', gradientMap, { side: THREE.DoubleSide });
  const geo = new THREE.RingGeometry(radius - 0.55, radius + 0.55, 40, 1, 0, Math.PI);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}


export function initScene(canvas) {
  const scene = new THREE.Scene();
  const skyTex = createSkyTexture();
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0x241238, 19, 38);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

  const cameraPresets = [
    { pos: [0.6, 3.1, 14.5], target: [0.6, 1.9, 0] },
    { pos: [-3.4, 2.1, 3], target: [-1.4, 1.9, -0.6] },
    { pos: [8.4, 2.6, 2.5], target: [0.2, 1.9, -0.8] },
    { pos: [2.6, 1.4, 6], target: [3.2, 2.9, -1] },
  ];
  const camBase = new THREE.Vector3(...cameraPresets[0].pos);
  const camTarget = new THREE.Vector3(...cameraPresets[0].target);
  camera.position.copy(camBase);
  camera.lookAt(camTarget);

  function setCameraPreset(index) {
    const preset = cameraPresets[((index % cameraPresets.length) + cameraPresets.length) % cameraPresets.length];
    camBase.set(...preset.pos);
    camTarget.set(...preset.target);
    camera.position.copy(camBase);
    camera.lookAt(camTarget);
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const gradientMap = createToonGradientTexture();

  const hemi = new THREE.HemisphereLight(0xffcf9e, 0x2a1830, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffb877, 1.6);
  sun.position.set(-4, 7, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x7ea8ff, 0.7);
  rim.position.set(5, 3, -6);
  scene.add(rim);

  const torchA = new THREE.PointLight(0xff8a3d, 1.2, 8);
  torchA.position.set(-3.6, 1.6, 1.5);
  scene.add(torchA);
  const torchB = new THREE.PointLight(0xff8a3d, 1.2, 8);
  torchB.position.set(3.6, 1.6, 1.5);
  scene.add(torchB);

  const floorTex = createFloorTexture();
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(6.5, 6.5, 0.3, 48),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }),
  );
  floor.position.y = -0.15;
  floor.receiveShadow = true;
  scene.add(floor);

  const columnPositions = [
    [-5.2, 0, -3], [5.2, 0, -3],
    [-6.4, 0, -6], [6.4, 0, -6],
    [-3.2, 0, -6.5], [3.2, 0, -6.5],
  ];
  columnPositions.forEach(([x, y, z]) => {
    const col = buildColumn(gradientMap);
    col.position.set(x, y, z);
    scene.add(col);
  });

  const treadRadii = [8.5, 9.8, 11.0];
  treadRadii.forEach((radius, i) => {
    const tread = buildStepTread(radius, 1.05 + i * 0.65, gradientMap);
    tread.position.z = -4;
    scene.add(tread);
  });

  const crowdTiers = [
    buildCrowdTier(18, 8.5, 1.4, gradientMap),
    buildCrowdTier(22, 9.8, 2.0, gradientMap),
    buildCrowdTier(26, 11.0, 2.7, gradientMap),
  ];
  crowdTiers.forEach(({ group }) => {
    group.position.z = -4;
    scene.add(group);
  });
  const crowdMembers = crowdTiers.flatMap((t) => t.members);

  const crowdReaction = { mood: 'idle', energy: 0 };

  function resize() {
    const { clientWidth, clientHeight } = canvas.parentElement;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  }

  function render() {
    renderer.render(scene, camera);
  }

  let torchClock = 0;
  let camShake = 0;

  function updateFrame(dtMs) {
    const dt = dtMs / 1000;
    torchClock += dt;
    const flicker = Math.sin(torchClock * 9) * 0.15 + Math.sin(torchClock * 23) * 0.08;
    torchA.intensity = 1.2 + flicker;
    torchB.intensity = 1.2 - flicker;

    crowdMembers.forEach((m) => {
      const energyBoost = crowdReaction.energy;
      const bob = Math.sin(torchClock * 3 + m.userData.phase) * (0.03 + energyBoost * 0.18);
      m.position.y = m.userData.baseY + bob + energyBoost * 0.12;
    });
    crowdReaction.energy = Math.max(0, crowdReaction.energy - dt * 1.4);

    if (camShake > 0) {
      camShake = Math.max(0, camShake - dt * 3);
      camera.position.set(
        camBase.x + (Math.random() - 0.5) * camShake * 0.25,
        camBase.y + (Math.random() - 0.5) * camShake * 0.15,
        camBase.z,
      );
      camera.lookAt(camTarget);
    } else if (!camera.position.equals(camBase)) {
      camera.position.lerp(camBase, 0.15);
      camera.lookAt(camTarget);
    }
  }

  function triggerCrowdReaction(mood) {
    crowdReaction.mood = mood;
    crowdReaction.energy = mood === 'cheer' ? 1 : mood === 'boo' ? 0.4 : 0;
  }

  function kickCamera(intensity = 1) {
    camShake = intensity;
  }

  return {
    scene, camera, renderer, gradientMap,
    resize, updateFrame, triggerCrowdReaction, kickCamera, render,
    setCameraPreset, cameraPresetCount: cameraPresets.length,
  };
}
