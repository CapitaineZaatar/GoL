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

  const abs = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.22, 4, 8), skin);
  abs.scale.set(1.05, 1, 0.82);
  abs.position.y = 0.24;
  abs.castShadow = true;
  torsoPivot.add(abs);

  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 0.26, 4, 8), skin);
  chest.scale.set(1.28, 1, 0.88);
  chest.position.y = 0.68;
  chest.castShadow = true;
  torsoPivot.add(chest);

  const peltCape = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.14), pelt);
  peltCape.position.set(0, 0.55, -0.32);
  peltCape.rotation.x = 0.18;
  peltCape.castShadow = true;
  torsoPivot.add(peltCape);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.18, 8), skin);
  neck.position.y = 1.0;
  torsoPivot.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), skin);
  head.position.y = 1.24;
  head.castShadow = true;
  torsoPivot.add(head);

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairCap.position.y = 1.28;
  torsoPivot.add(hairCap);

  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.28, 8), hair);
  beard.position.set(0, 1.1, 0.13);
  beard.rotation.x = Math.PI;
  torsoPivot.add(beard);

  function buildArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.54, 0.74, 0);
    torsoPivot.add(shoulder);

    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), skin);
    shoulder.add(deltoid);

    const upperArm = limb(0.17, 0.32, skin);
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.5;
    shoulder.add(elbow);

    const lowerArm = limb(0.14, 0.3, skin);
    elbow.add(lowerArm);

    const hand = new THREE.Group();
    hand.position.y = -0.44;
    elbow.add(hand);

    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), skin);
    hand.add(fist);

    return { shoulder, elbow, hand };
  }

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  function buildLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.22, -0.06, 0);
    hips.add(hip);
    const upperLeg = limb(0.19, 0.36, cloth);
    hip.add(upperLeg);
    const knee = new THREE.Group();
    knee.position.y = -0.56;
    hip.add(knee);
    const lowerLeg = limb(0.15, 0.36, skin);
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

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.85, 4, 8), furDark);
  torso.rotation.z = Math.PI / 2;
  torso.position.y = 0.72;
  torso.castShadow = true;
  group.add(torso);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 8), furDark);
  tail.position.set(0, 0.95, -0.68);
  tail.rotation.x = Math.PI / 2.6;
  group.add(tail);

  function buildLeg(x, z) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.7, 8), furDark);
    leg.position.set(x, 0.35, z);
    leg.rotation.z = x > 0 ? -0.12 : 0.12;
    leg.castShadow = true;
    group.add(leg);
    return leg;
  }
  buildLeg(0.28, 0.35);
  buildLeg(-0.28, 0.35);
  buildLeg(0.24, -0.35);
  buildLeg(-0.24, -0.35);

  const neckBase = new THREE.Group();
  neckBase.position.set(0, 1.05, 0.42);
  group.add(neckBase);

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

  const centerHead = buildHead(0, 1);
  const leftHead = buildHead(-0.55, 0.8);
  const rightHead = buildHead(0.55, 0.8);

  const collarAnchor = new THREE.Object3D();
  collarAnchor.position.set(0, 1.05, 0.55);
  group.add(collarAnchor);

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

export function buildChain(gradientMap, linkCount = 9) {
  const mat = toonMaterial('#5a5a5a', gradientMap);
  const group = new THREE.Group();
  const links = [];
  for (let i = 0; i < linkCount; i += 1) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.017, 6, 10), mat);
    link.castShadow = true;
    group.add(link);
    links.push(link);
  }

  function update(pointA, pointB) {
    const dir = new THREE.Vector3().subVectors(pointB, pointA);
    const dist = dir.length();
    dir.normalize();
    const sagAmount = Math.min(0.35, dist * 0.12);
    for (let i = 0; i < links.length; i += 1) {
      const t = i / (links.length - 1);
      const sag = Math.sin(t * Math.PI) * sagAmount;
      const p = new THREE.Vector3().lerpVectors(pointA, pointB, t);
      p.y -= sag;
      links[i].position.copy(p);
      links[i].rotation.set(t * Math.PI * 0.5, Math.atan2(dir.x, dir.z), 0);
    }
  }

  return { group, update };
}
