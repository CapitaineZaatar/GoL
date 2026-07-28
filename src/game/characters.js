import * as THREE from 'three';
import { toonMaterial } from './toon.js';

function limb(radius, length, material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), material);
  mesh.castShadow = true;
  mesh.position.y = -(length / 2 + radius);
  return mesh;
}

export function createHercules(gradientMap) {
  const skin = toonMaterial('#c9895a', gradientMap);
  const cloth = toonMaterial('#8f2b2b', gradientMap);
  const pelt = toonMaterial('#d3a83f', gradientMap);
  const hair = toonMaterial('#2a1c14', gradientMap);

  const group = new THREE.Group();

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  group.add(hips);

  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.12, 4, 8), cloth);
  pelvis.castShadow = true;
  hips.add(pelvis);

  const torsoPivot = new THREE.Group();
  hips.add(torsoPivot);

  const abs = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.22, 4, 8), skin);
  abs.scale.set(1, 1, 0.8);
  abs.position.y = 0.22;
  abs.castShadow = true;
  torsoPivot.add(abs);

  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.24, 4, 8), skin);
  chest.scale.set(1.15, 1, 0.86);
  chest.position.y = 0.66;
  chest.castShadow = true;
  torsoPivot.add(chest);

  [-1, 1].forEach((s) => {
    const lat = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), skin);
    lat.scale.set(0.7, 1.15, 0.62);
    lat.position.set(s * 0.42, 0.4, -0.04);
    lat.castShadow = true;
    torsoPivot.add(lat);
  });

  const traps = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  traps.scale.set(1.25, 0.5, 0.8);
  traps.position.y = 0.88;
  traps.castShadow = true;
  torsoPivot.add(traps);

  const peltCape = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.14), pelt);
  peltCape.position.set(0, 0.55, -0.36);
  peltCape.rotation.x = 0.18;
  peltCape.castShadow = true;
  torsoPivot.add(peltCape);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.2, 8), skin);
  neck.position.y = 1.02;
  torsoPivot.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), skin);
  head.scale.set(0.92, 1, 0.95);
  head.position.y = 1.28;
  head.castShadow = true;
  torsoPivot.add(head);

  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), skin);
  jaw.scale.set(0.85, 0.6, 0.8);
  jaw.position.set(0, 1.16, 0.06);
  torsoPivot.add(jaw);

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairCap.position.y = 1.32;
  torsoPivot.add(hairCap);

  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.3, 8), hair);
  beard.position.set(0, 1.12, 0.14);
  beard.rotation.x = Math.PI;
  torsoPivot.add(beard);

  function buildArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.62, 0.78, 0);
    torsoPivot.add(shoulder);

    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
    deltoid.scale.set(1, 1.05, 1);
    shoulder.add(deltoid);

    const upperArm = limb(0.2, 0.32, skin);
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.52;
    shoulder.add(elbow);

    const lowerArm = limb(0.16, 0.3, skin);
    elbow.add(lowerArm);

    const hand = new THREE.Group();
    hand.position.y = -0.46;
    elbow.add(hand);

    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.155, 8, 8), skin);
    fist.scale.set(1, 0.9, 1.1);
    hand.add(fist);

    return { shoulder, elbow, hand };
  }

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  function buildLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.24, -0.06, 0);
    hips.add(hip);
    const upperLeg = limb(0.21, 0.36, cloth);
    hip.add(upperLeg);
    const knee = new THREE.Group();
    knee.position.y = -0.58;
    hip.add(knee);
    const lowerLeg = limb(0.16, 0.36, skin);
    knee.add(lowerLeg);
    return { hip, knee };
  }

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  leftLeg.hip.rotation.x = 0.18;
  rightLeg.hip.rotation.x = -0.32;
  rightLeg.knee.rotation.x = 0.5;

  group.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });

  return {
    group, torsoPivot, hips,
    arms: { left: leftArm, right: rightArm },
    restPose() {
      [leftArm, rightArm].forEach((arm) => {
        arm.shoulder.rotation.x = 0.1;
        arm.elbow.rotation.x = 0.2;
      });
      torsoPivot.rotation.x = 0;
    },
    setPullPose(t) {
      const c = Math.min(1, Math.max(0, t));
      [leftArm, rightArm].forEach((arm) => {
        arm.shoulder.rotation.x = 0.1 - c * 2.1;
        arm.elbow.rotation.x = 0.2 + c * 1.3;
      });
      torsoPivot.rotation.x = -c * 0.22;
      hips.position.z = c * 0.12;
    },
    handWorldPosition(side, out = new THREE.Vector3()) {
      const arm = side === 'left' ? leftArm : rightArm;
      arm.hand.getWorldPosition(out);
      return out;
    },
  };
}

function head3Geometry() {
  const skull = new THREE.SphereGeometry(0.22, 10, 8);
  return skull;
}

export function createCerberus(gradientMap) {
  const furDark = toonMaterial('#3b2a2f', gradientMap);
  const furLight = toonMaterial('#5c4038', gradientMap);
  const fang = toonMaterial('#efe8d6', gradientMap);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff5b33 });

  const group = new THREE.Group();
  group.rotation.y = Math.PI / 2;

  const body = new THREE.Group();
  body.scale.setScalar(2);
  group.add(body);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.85, 4, 8), furDark);
  torso.rotation.z = Math.PI / 2;
  torso.position.y = 0.72;
  torso.castShadow = true;
  body.add(torso);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.6, 8), furDark);
  tail.position.set(0, 0.95, -0.7);
  tail.rotation.x = Math.PI / 2.6;
  body.add(tail);

  for (let i = 0; i < 5; i += 1) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22 - i * 0.02, 6), furDark);
    spike.position.set(0, 1.06, 0.3 - i * 0.24);
    spike.rotation.x = -0.35;
    body.add(spike);
  }

  function buildLeg(x, z) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.72, 8), furDark);
    leg.position.set(x, 0.36, z);
    leg.rotation.z = x > 0 ? -0.12 : 0.12;
    leg.castShadow = true;
    body.add(leg);
    return leg;
  }
  buildLeg(0.3, 0.36);
  buildLeg(-0.3, 0.36);
  buildLeg(0.26, -0.36);
  buildLeg(-0.26, -0.36);

  const neckBase = new THREE.Group();
  neckBase.position.set(0, 1.05, 0.42);
  body.add(neckBase);

  function buildHead(offsetAngle, scale) {
    const neckPivot = new THREE.Group();
    neckPivot.rotation.y = offsetAngle;
    neckBase.add(neckPivot);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.16 * scale, 0.32 * scale, 8), furLight);
    neck.position.set(0, 0.1 * scale, 0.16 * scale);
    neck.rotation.x = Math.PI / 2.3;
    neckPivot.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.22 * scale, 0.34 * scale);
    neckPivot.add(headGroup);

    const skull = new THREE.Mesh(head3Geometry(), furDark);
    skull.scale.setScalar(scale);
    skull.castShadow = true;
    headGroup.add(skull);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.14 * scale, 0.26 * scale), furLight);
    snout.position.set(0, -0.04 * scale, 0.24 * scale);
    headGroup.add(snout);

    [-1, 1].forEach((s) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08 * scale, 0.22 * scale, 6), furDark);
      ear.position.set(s * 0.15 * scale, 0.22 * scale, -0.02 * scale);
      ear.rotation.z = s * 0.4;
      headGroup.add(ear);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03 * scale, 6, 6), eyeMat);
      eye.position.set(s * 0.09 * scale, 0.02 * scale, 0.33 * scale);
      headGroup.add(eye);

      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.025 * scale, 0.09 * scale, 6), fang);
      tooth.position.set(s * 0.06 * scale, -0.1 * scale, 0.34 * scale);
      tooth.rotation.x = Math.PI;
      headGroup.add(tooth);
    });

    return { neckPivot, headGroup };
  }

  const centerHead = buildHead(0, 1.08);
  const leftHead = buildHead(-0.72, 0.85);
  const rightHead = buildHead(0.72, 0.85);

  const collarAnchor = new THREE.Object3D();
  collarAnchor.position.set(0, 1.05, 0.55);
  body.add(collarAnchor);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 6, 12), toonMaterial('#4a4a4a', gradientMap));
  collar.rotation.x = Math.PI / 2;
  collarAnchor.add(collar);

  group.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });

  return {
    group, collarAnchor,
    heads: [centerHead, leftHead, rightHead],
    restPose() {
      group.position.z = 0;
      this.heads.forEach((h) => { h.neckPivot.rotation.x = 0; });
    },
    strain(t) {
      const c = Math.min(1, Math.max(0, t));
      this.heads.forEach((h, i) => {
        h.neckPivot.rotation.x = -0.15 - c * 0.3 + Math.sin(Date.now() * 0.004 + i) * 0.03;
      });
    },
    lurch(intensity) {
      group.position.z = intensity * 0.35;
    },
    collarWorldPosition(out = new THREE.Vector3()) {
      collarAnchor.getWorldPosition(out);
      return out;
    },
  };
}

export function buildChain(gradientMap, linkCount = 7) {
  const mat = toonMaterial('#6a6a6a', gradientMap);
  const group = new THREE.Group();
  const links = [];
  for (let i = 0; i < linkCount; i += 1) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.045, 8, 12), mat);
    link.castShadow = true;
    group.add(link);
    links.push(link);
  }

  function update(pointA, pointB) {
    const dir = new THREE.Vector3().subVectors(pointB, pointA);
    const dist = dir.length();
    dir.normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    const sagAmount = Math.min(0.4, dist * 0.1);
    for (let i = 0; i < links.length; i += 1) {
      const t = i / (links.length - 1);
      const sag = Math.sin(t * Math.PI) * sagAmount;
      const p = new THREE.Vector3().lerpVectors(pointA, pointB, t);
      p.y -= sag;
      links[i].position.copy(p);
      links[i].rotation.set(i % 2 === 0 ? 0 : Math.PI / 2, yaw, 0);
    }
  }

  return { group, update };
}
