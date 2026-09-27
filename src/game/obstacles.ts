/* 障碍物、金币与道具造型。静态模型按材质合并烘焙，降低绘制调用。 */
import * as THREE from 'three';
import { surface, paint } from './art';
import { TYPES } from './engine';

export type Helper = ReturnType<typeof createHelpers>;

export function createHelpers() {
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  const sphereGeo = new THREE.SphereGeometry(1, 18, 12);
  const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 18);
  const coneGeo = new THREE.ConeGeometry(1, 1, 18);

  const matCache = new Map<string, THREE.MeshStandardMaterial>();
  function material(color: number, roughness = 0.8, emissive = 0, emissiveIntensity = 0.5) {
    const key = color + '/' + roughness + '/' + emissive;
    let m = matCache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04, envMapIntensity: 0.4 });
      if (emissive) {
        m.emissive = new THREE.Color(emissive);
        m.emissiveIntensity = emissiveIntensity;
      }
      matCache.set(key, m);
    }
    return m;
  }

  function mesh(g: THREE.Object3D, geometry: THREE.BufferGeometry, c: number | THREE.Material, p: [number, number, number], s: [number, number, number], rot?: [number, number, number]) {
    const o = new THREE.Mesh(geometry, typeof c === 'number' ? material(c) : c);
    o.position.set(p[0], p[1], p[2]);
    o.scale.set(s[0], s[1], s[2]);
    if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    o.castShadow = true;
    o.receiveShadow = true;
    g.add(o);
    return o;
  }
  const box = (g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, c: number | THREE.Material, rot?: [number, number, number]) =>
    mesh(g, cubeGeo, c, [x, y + h / 2, z], [w, h, d], rot);
  const orb = (g: THREE.Object3D, x: number, y: number, z: number, rx: number, ry: number, rz: number, c: number | THREE.Material) =>
    mesh(g, sphereGeo, c, [x, y, z], [rx, ry, rz]);
  const cyl = (g: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, c: number | THREE.Material, rot?: [number, number, number]) =>
    mesh(g, cylinderGeo, c, [x, y, z], [r, h, r], rot);
  const cone = (g: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, c: number | THREE.Material) =>
    mesh(g, coneGeo, c, [x, y + h / 2, z], [r, h, r]);
  const limb = (g: THREE.Object3D, a: [number, number, number], b: [number, number, number], r: number, c: number) => {
    const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b);
    const d = q.clone().sub(p);
    const m = cyl(g, (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2, r, d.length(), c);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  };
  return { cubeGeo, sphereGeo, cylinderGeo, coneGeo, material, mesh, box, orb, cyl, cone, limb };
}

/* 警示条纹贴图 */
export function warningMaterial() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff2ce';
  x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#c82f1c';
  for (let y = -160; y < 200; y += 65) {
    x.beginPath();
    x.moveTo(0, y); x.lineTo(128, y + 95); x.lineTo(256, y);
    x.lineTo(256, y + 30); x.lineTo(128, y + 125); x.lineTo(0, y + 30);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
}

/* 将组的网格按材质合并成尽量少的绘制调用 */
export function bakeGroup(group: THREE.Object3D) {
  group.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, { pos: number[]; normal: number[]; uv: number[]; index: number[] }>();
  group.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    const mat = o.material as THREE.Material;
    let b = batches.get(mat);
    if (!b) { b = { pos: [], normal: [], uv: [], index: [] }; batches.set(mat, b); }
    const geo = o.geometry;
    const ps = geo.attributes.position;
    const ns = geo.attributes.normal;
    const uv = geo.attributes.uv;
    const idx = geo.index;
    const base = b.pos.length / 3;
    const nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
    const v = new THREE.Vector3();
    for (let i = 0; i < ps.count; i++) {
      v.fromBufferAttribute(ps, i).applyMatrix4(o.matrixWorld);
      b.pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(ns, i).applyMatrix3(nm).normalize();
      b.normal.push(v.x, v.y, v.z);
      b.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    for (let i = 0; i < (idx ? idx.count : ps.count); i++) {
      b.index.push(base + (idx ? idx.getX(i) : i));
    }
  });
  const out = new THREE.Group();
  for (const [mat, b] of batches) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.normal, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    geo.setIndex(b.index);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    out.add(m);
  }
  return out;
}

/* 各障碍造型 */
export function buildObstacle(h: Helper, type: string): THREE.Group {
  const { box, orb, cyl, cone, limb, mesh } = h;
  const g = new THREE.Group();
  const wood = 0xb96a2e, cream = 0xfff4d7, coral = 0xd73524, dark = 0x26445d;
  const warn = warningMaterial();

  if (type === 'crate') {
    box(g, 0, 0, 0, 1.7, 0.78, 1.05, wood);
    for (const a of [-0.65, 0.65]) box(g, a, 0.04, 0.54, 0.15, 0.69, 0.045, cream);
    for (const y of [0.08, 0.58]) box(g, 0, y, 0.54, 1.7, 0.12, 0.045, 0xe2b477);
  }
  if (type === 'hurdle' || type === 'arch') {
    const low = type === 'hurdle';
    const bottom = low ? 0.3 : 1.08, bh = low ? 0.38 : 0.67;
    for (const a of [-0.95, 0.95]) {
      box(g, a, 0, 0, 0.13, bottom + bh, 0.2, dark);
      box(g, a, 0, 0, 0.36, 0.08, 0.6, dark);
    }
    box(g, 0, bottom, 0, 2, bh, 0.24, coral);
    box(g, 0, bottom + 0.015, 0.13, 1.98, bh - 0.03, 0.026, warn);
  }
  if (type === 'barrel') {
    cyl(g, 0, 0.41, 0, 0.415, 1.65, wood, [0, 0, Math.PI / 2]);
    for (const x of [-0.63, 0.63]) cyl(g, x, 0.41, 0, 0.426, 0.09, 0x58686a, [0, 0, Math.PI / 2]);
    cyl(g, 0.83, 0.41, 0, 0.34, 0.025, 0xe5ba7c, [0, 0, Math.PI / 2]);
  }
  if (type === 'bench') {
    for (let k = 0; k < 3; k++) box(g, 0, 0.49, k * 0.17 - 0.17, 1.8, 0.09, 0.13, 0xb88355);
    box(g, 0, 0.68, 0.27, 1.8, 0.32, 0.08, 0xc59561);
    for (const a of [-0.65, 0.65]) {
      box(g, a, 0, 0, 0.085, 0.55, 0.5, 0x526361);
      box(g, a, 0.5, 0.3, 0.08, 0.5, 0.08, 0x526361);
    }
  }
  if (type === 'planter') {
    box(g, 0, 0, 0, 1.8, 0.65, 1.2, 0xda977a);
    box(g, 0, 0.6, 0, 1.93, 0.11, 1.31, 0xf4c399);
    for (const a of [-0.6, -0.2, 0.2, 0.6]) {
      orb(g, a, 0.7, 0, 0.22, 0.15, 0.35, 0x78a371);
      orb(g, a, 0.82, 0.06, 0.12, 0.09, 0.14, 0xe9aeaf);
    }
  }
  if (type === 'gap') {
    box(g, 0, 0.001, 0, 2.2, 0.012, 3.8, 0x384b50);
    for (const a of [-1.02, 1.02]) box(g, a, 0.02, 0, 0.12, 0.1, 3.8, 0xd9ab48);
    for (const z of [-1.85, 1.85]) {
      for (let i = 0; i < 7; i++) box(g, -0.92 + i * 0.3, 0.02, z, 0.28, 0.08, 0.12, i % 2 ? 0x415257 : 0xf0c14d);
    }
  }
  if (type === 'awning') {
    for (const a of [-1, 1]) for (const z of [-0.8, 0.8]) cyl(g, a, 0.85, z, 0.055, 1.7, dark);
    for (let i = 0; i < 7; i++) box(g, -0.96 + i * 0.32, 1.45, 0, 0.32, 0.22, 2, i % 2 ? cream : 0xe08b91);
    box(g, 0, 1.08, 1, 2.15, 0.38, 0.08, 0xe08b91);
  }
  if (type === 'pipe') {
    for (const a of [-0.97, 0.97]) box(g, a, 0, 0, 0.14, 1.5, 0.5, dark);
    cyl(g, 0, 1.39, 0, 0.34, 2.1, 0x75a8ad, [0, 0, Math.PI / 2]);
    for (const a of [-0.8, 0.8]) cyl(g, a, 1.39, 0, 0.39, 0.12, 0xd7dfcb, [0, 0, Math.PI / 2]);
  }
  if (type === 'tram' || type === 'express') {
    const body = type === 'express' ? 0xf06443 : 0xf0eee1;
    const roofC = type === 'express' ? 0xf5e29c : 0x35b985;
    /* 车头形状（挤出） */
    const shape = new THREE.Shape();
    shape.moveTo(-0.94, -1.38); shape.lineTo(0.94, -1.38);
    shape.quadraticCurveTo(1.06, -1.38, 1.06, -1.2);
    shape.lineTo(1.06, 1.05);
    shape.quadraticCurveTo(1.06, 1.45, 0.65, 1.45);
    shape.lineTo(-0.65, 1.45);
    shape.quadraticCurveTo(-1.06, 1.45, -1.06, 1.05);
    shape.lineTo(-1.06, -1.2);
    shape.quadraticCurveTo(-1.06, -1.38, -0.94, -1.38);
    const trainGeo = new THREE.ExtrudeGeometry(shape, { depth: 15.9, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.025, bevelThickness: 0.05 });
    trainGeo.translate(0, 0, -7.95);
    mesh(g, trainGeo, body, [0, 1.67, 0], [1, 1, 1]);
    box(g, 0, 0.25, 0, 2.13, 0.3, 16, 0x225b91);
    box(g, 0, 2.95, 0, 1.6, 0.25, 15.8, roofC);
    box(g, 0, 1.13, 8.085, 1.8, 1.45, 0.03, 0x182e53);
    for (const x of [-0.46, 0.46]) box(g, x, 1.38, 8.11, 0.7, 0.97, 0.024, 0x24a7ec);
    box(g, 0, 0.49, 8.105, 1.7, 0.52, 0.026, warn);
    for (const x of [-0.77, 0.77]) {
      orb(g, x, 0.99, 8.125, 0.16, 0.16, 0.045, 0xffed81);
      for (const z of [-6.7, 6.7]) cyl(g, x, 0.28, z, 0.28, 0.25, 0x1c2b3b, [0, 0, Math.PI / 2]);
    }
    for (const side of [-1, 1]) {
      for (const z of [-6.4, -4.3, -2.2, 0, 2.2, 4.3, 6.4]) {
        box(g, side * 1.072, 1.23, z, 0.026, 1.35, 1.35, 0x243c57);
        box(g, side * 1.089, 1.35, z, 0.014, 1.11, 1.09, 0x38b8ef);
      }
      box(g, side * 1.08, 0.85, 0, 0.022, 0.15, 15.5, 0xc44428);
    }
  }
  if (type === 'stack') {
    for (const [x, y, z, w, bh, d] of [[0, 0, 0, 1.95, 1.1, 1.5], [-0.2, 1.1, 0, 1.5, 0.8, 1.4], [0.16, 1.9, 0, 1.2, 0.6, 1.1]] as const) {
      box(g, x, y, z, w, bh, d, wood);
      box(g, x, y + 0.03, z + d / 2 + 0.02, 0.14, bh - 0.06, 0.03, cream);
      box(g, x, y + bh / 2, z + d / 2 + 0.03, w, 0.08, 0.03, 0xe1b376);
    }
  }
  if (type === 'cart') {
    box(g, 0, 0.38, 0, 1.8, 0.68, 1.8, 0x8eb393);
    for (const a of [-0.83, 0.83]) for (const z of [-0.65, 0.65]) cyl(g, a, 0.28, z, 0.28, 0.14, dark, [0, 0, Math.PI / 2]);
    for (const a of [-0.88, 0.88]) cyl(g, a, 1.75, 0, 0.055, 1.8, dark);
    for (let i = 0; i < 7; i++) box(g, -0.9 + i * 0.3, 2.4, 0, 0.3, 0.2, 2.1, i % 2 ? cream : 0xe9b45d);
    for (const a of [-0.6, -0.2, 0.2, 0.6]) for (const z of [-0.5, 0, 0.5]) {
      orb(g, a, 1.13, z, 0.17, 0.18, 0.17, z === 0 ? 0xe89b64 : 0xecc857);
    }
  }
  if (type === 'ramp') {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([
      -1.08, 0, 8, 1.08, 0, 8, -1.08, 3.2, -8, 1.08, 3.2, -8, -1.08, 0, -8, 1.08, 0, -8,
    ], 3));
    geo.setIndex([0, 1, 2, 1, 3, 2, 0, 2, 4, 1, 5, 3, 2, 3, 4, 3, 5, 4]);
    geo.computeVertexNormals();
    const m = h.material(0xa6b7be);
    m.side = THREE.DoubleSide;
    mesh(g, geo, m, [0, 0, 0], [1, 1, 1]);
    for (let k = 0; k < 16; k++) {
      const z = 7.8 - k, y = ((8 - z) / 16) * 3.2;
      box(g, 0, y, z, 2.1, 0.06, 0.14, 0xd7e1df);
    }
    for (const s of [-1, 1]) limb(g, [s * 1.05, 0.05, 8], [s * 1.05, 3.25, -8], 0.07, 0xffd352);
    for (let k = 0; k < 3; k++) {
      const y = 0.8 + k * 0.8, z = 4 - k * 4;
      box(g, 0, y + 0.09, z, 0.65, 0.07, 0.5, 0xffd444);
    }
  }
  if (type === 'wagon') {
    const teal = 0x237b8c, darkC = 0x264057, yellow = 0xffd444;
    box(g, 0, 0.3, 0, 2.16, 2.82, 24, teal);
    box(g, 0, 3.12, 0, 2.16, 0.08, 24, 0xc8d5ba);
    for (const side of [-1, 1]) {
      box(g, side * 1.06, 2.87, 0, 0.075, 0.27, 24, yellow);
      for (let z = -11.6; z < 12; z += 0.7) box(g, side * 1.086, 0.55, z, 0.055, 2.23, 0.15, 0x399ea8);
      for (const z of [-9, 9]) cyl(g, side * 0.91, 0.3, z, 0.3, 0.24, darkC, [0, 0, Math.PI / 2]);
    }
    for (const z of [-11.95, 11.95]) {
      box(g, 0, 0.45, z, 2.05, 2.52, 0.05, 0x367482);
      box(g, 0, 0.6, z + 0.035, 1.8, 0.55, 0.02, warn);
    }
    for (let z = -10; z <= 10; z += 2) box(g, 0, 3.2, z, 0.035, 0.012, 0.8, 0xf2e29c);
  }
  if (type === 'signal') {
    box(g, 0, 0, 0, 1.8, 0.26, 1.8, 0x264057);
    box(g, 0, 0.25, 0, 1.5, 2.45, 1.45, 0x318496);
    box(g, 0, 1.85, 0.75, 1.12, 0.65, 0.08, 0x264057);
    for (let i = 0; i < 3; i++) {
      orb(g, -0.35 + i * 0.35, 2.18, 0.81, 0.105, 0.105, 0.04, i === 0 ? 0xff5b3e : 0x756050);
    }
    for (let i = 0; i < 6; i++) box(g, 0, 0.65 + i * 0.14, 0.74, 1.05, 0.045, 0.035, 0x174557);
    box(g, 0, 1.5, 0.75, 1.13, 0.22, 0.04, warn);
  }
  if (type === 'cones') {
    for (const x of [-0.62, 0, 0.62]) {
      const z = x === 0 ? -0.4 : 0.25;
      box(g, x, 0, z, 0.53, 0.07, 0.53, 0x264057);
      cone(g, x, 0.06, z, 0.23, 0.59, 0xf56d26);
      cyl(g, x, 0.32, z, 0.13, 0.12, 0xffeabb);
    }
  }
  if (type === 'gate') {
    for (const s of [-1, 1]) {
      box(g, s * 0.98, 0, 0, 0.18, 1.62, 0.3, 0x264057);
      orb(g, s * 0.98, 1.68, 0, 0.12, 0.12, 0.12, 0xff813d);
    }
    box(g, 0, 1.08, 0, 2.1, 0.38, 0.17, warn);
    for (const x of [-0.65, 0.65]) box(g, x, 1.48, 0, 0.2, 0.18, 0.2, 0xffd444);
  }
  if (type === 'spool') {
    cyl(g, 0, 0.475, 0, 0.36, 1.2, 0x374c69, [Math.PI / 2, 0, 0]);
    for (const z of [-0.53, 0.53]) {
      cyl(g, 0, 0.475, z, 0.475, 0.11, 0xdcb56c, [Math.PI / 2, 0, 0]);
      cyl(g, 0, 0.475, z + (z > 0 ? 0.07 : -0.07), 0.11, 0.03, 0x796342, [Math.PI / 2, 0, 0]);
    }
  }
  if (type === 'tunnel') {
    const teal = 0x237b8c;
    for (const z of [-2.9, 0, 2.9]) {
      for (const s of [-1, 1]) box(g, s * 1.01, 0, z, 0.14, 1.5, 0.25, teal);
      box(g, 0, 1.08, z, 2.15, 0.42, 0.26, warn);
    }
    for (const s of [-1, 1]) box(g, s * 0.99, 1.39, 0, 0.15, 0.18, 6, teal);
    box(g, 0, 1.45, 0, 2.12, 0.13, 6, 0x379aac);
  }
  return g;
}

/* 金币模板 */
export function buildCoin(h: Helper) {
  const { mesh } = h;
  const g = new THREE.Group();
  const coinGeometry = new THREE.CylinderGeometry(0.31, 0.31, 0.11, 24);
  coinGeometry.rotateX(Math.PI / 2);
  const coinMaterial = h.material(0xffbb0b, 0.3);
  g.add(new THREE.Mesh(coinGeometry, coinMaterial));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.023, 8, 24), h.material(0xffed6b, 0.25));
  rim.position.z = 0.067;
  g.add(rim);
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 + Math.PI / 2, r = i % 2 ? 0.078 : 0.17;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i) starShape.lineTo(x, y); else starShape.moveTo(x, y);
  }
  starShape.closePath();
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: 0.015, bevelEnabled: false }), h.material(0xffee6a, 0.3));
  star.position.z = 0.07;
  g.add(star);
  return g;
}

/* 道具：护盾与磁铁 */
export function buildPowerup(h: Helper, kind: 'shield' | 'magnet') {
  const { mesh, box, cyl, orb } = h;
  const g = new THREE.Group();
  if (kind === 'shield') {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.65); sh.lineTo(0.46, 0.38); sh.lineTo(0.35, -0.28);
    sh.lineTo(0, -0.58); sh.lineTo(-0.35, -0.28); sh.lineTo(-0.46, 0.38);
    sh.closePath();
    mesh(g, new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 2 }), 0x38c7fa, [0, 0, 0], [1, 1, 1]);
    box(g, 0, -0.28, 0.2, 0.09, 0.62, 0.035, 0xf9ecac);
    box(g, 0, -0.025, 0.2, 0.4, 0.09, 0.035, 0xf9ecac);
  } else {
    const tor = new THREE.TorusGeometry(0.33, 0.14, 12, 24, Math.PI);
    mesh(g, tor, 0xf85350, [0, -0.12, 0], [1, 1, 1], [0, 0, Math.PI]);
    for (const s of [-1, 1]) {
      box(g, s * 0.33, -0.13, 0, 0.28, 0.48, 0.28, 0xf85350);
      box(g, s * 0.33, 0.35, 0, 0.28, 0.19, 0.28, 0xf4f2db);
    }
  }
  return g;
}

/* 建立全部模板（烘焙合并） */
export function buildTemplates() {
  const h = createHelpers();
  const obstacles: Record<string, THREE.Group> = {};
  for (const type of Object.keys(TYPES)) {
    const raw = buildObstacle(h, type);
    obstacles[type] = bakeGroup(raw);
  }
  const coin = buildCoin(h);
  const powerups: Record<string, THREE.Group> = {
    shield: buildPowerup(h, 'shield'),
    magnet: buildPowerup(h, 'magnet'),
  };
  return { obstacles, coin, powerups, helpers: h };
}
