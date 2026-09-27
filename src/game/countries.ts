/* 十国街景生成器：每个国家独立的建筑、地标、站门与路边装饰。 */
import * as THREE from 'three';
import { ZONES } from './engine';
import { hash } from './engine';
import { surface, type TextureKind } from './art';

export interface BuildKit {
  THREE: typeof import('three');
  box(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, c: number | THREE.Material, rot?: [number, number, number]): THREE.Mesh;
  orb(g: THREE.Object3D, x: number, y: number, z: number, rx: number, ry: number, rz: number, c: number | THREE.Material): THREE.Mesh;
  cyl(g: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, c: number | THREE.Material, rot?: [number, number, number]): THREE.Mesh;
  cone(g: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, c: number | THREE.Material): THREE.Mesh;
  limb(g: THREE.Object3D, a: [number, number, number], b: [number, number, number], r: number, c: number): THREE.Mesh;
  mesh(g: THREE.Object3D, geometry: THREE.BufferGeometry, c: number | THREE.Material, p: [number, number, number], s: [number, number, number], rot?: [number, number, number]): THREE.Mesh;
  material(color: number, roughness?: number): THREE.MeshStandardMaterial;
  surface(color: number, kind?: TextureKind): THREE.MeshStandardMaterial;
}

const CREAM = 0xf7e8c9;

export function createCountryWorld(kit: BuildKit) {
  const { box, orb, cyl, cone, limb, mesh, material, surface, THREE } = kit;

  /* 通用件：山墙顶 */
  function gableRoof(g: THREE.Object3D, x: number, y: number, z: number, w: number, d: number, c: number) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, 0); shape.lineTo(0.5, 0); shape.lineTo(0, 0.55); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.025, bevelSegments: 2 });
    geo.translate(0, 0, -0.5);
    mesh(g, geo, surface(c, 'roof'), [x, y, z], [w + 0.5, 1.6, d + 0.4]);
  }

  /* 通用件：拱形窗 */
  function archWindow(g: THREE.Object3D, x: number, y: number, z: number, w = 0.8, h = 1.2, rotY = 0) {
    const grp = new THREE.Group();
    const shape = new THREE.Shape();
    const r = w / 2;
    shape.moveTo(-r, 0); shape.lineTo(r, 0); shape.lineTo(r, h - r);
    shape.absarc(0, h - r, r, 0, Math.PI, false);
    shape.lineTo(-r, 0);
    const frame = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
    mesh(grp, frame, 0xffedc9, [0, 0, 0], [1, 1, 1]);
    const glass = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
    glass.translate(0, 0.06, 0.09);
    mesh(grp, glass, surface(0x5fb6cd, 'window'), [0, 0, 0], [0.82, 0.82, 1]);
    grp.position.set(x, y, z);
    grp.rotation.y = rotY;
    g.add(grp);
  }

  /* 通用件：格子窗 */
  function latticeWindow(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, frame: number, glass: number) {
    box(g, x, y + h / 2, z, w, h, 0.08, frame);
    box(g, x, y + h / 2, z + 0.05, w - 0.12, h - 0.12, 0.03, surface(glass, 'window'));
    box(g, x, y + h / 2, z + 0.07, 0.05, h - 0.1, 0.02, frame);
    box(g, x, y + h / 2, z + 0.07, w - 0.1, 0.05, 0.02, frame);
  }

  /* 通用件：红灯笼 */
  function lantern(g: THREE.Object3D, x: number, y: number, z: number) {
    cyl(g, x, y + 0.32, z, 0.012, 0.5, 0x774838);
    const body = orb(g, x, y, z, 0.2, 0.26, 0.2, 0xe65345);
    (body.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x882211);
    (body.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.25;
    cyl(g, x, y + 0.24, z, 0.12, 0.05, 0xffd968);
    cyl(g, x, y - 0.26, z, 0.1, 0.05, 0xf6c747);
    limb(g, [x, y - 0.28, z], [x, y - 0.5, z], 0.02, 0xffc443);
  }

  /* 通用件：招牌雨棚 */
  function awningStripes(g: THREE.Object3D, x: number, y: number, z: number, w: number, c1: number, c2: number) {
    const n = Math.floor(w / 0.3);
    for (let i = 0; i < n; i++) {
      box(g, x - w / 2 + 0.15 + i * (w / n), y, z, w / n + 0.01, 0.1, 0.8, i % 2 ? c1 : c2, [0.2, 0, 0]);
    }
  }

  /* 通用件：花箱 */
  function flowerBox(g: THREE.Object3D, x: number, y: number, z: number, w = 1.4, c = 0xb98162) {
    box(g, x, y, z, w, 0.28, 0.42, c);
    for (let i = 0; i < 5; i++) {
      const xx = x - w * 0.37 + i * w * 0.185;
      orb(g, xx, y + 0.28, z, 0.16, 0.12, 0.15, surface(0x559777, 'foliage'));
      orb(g, xx, y + 0.38, z, 0.07, 0.07, 0.07, [0xf6bdc8, 0xf3d68a, 0xbf93d4][i % 3]);
    }
  }

  /* 通用件：条纹遮阳布 */
  function bunting(g: THREE.Object3D, x: number, y: number, z: number, w: number, colors: number[]) {
    for (let i = 0; i < w / 0.4; i++) {
      const xx = x - w / 2 + i * 0.4;
      const dip = Math.sin((i / (w / 0.4)) * Math.PI) * 0.22;
      for (const s of [-1, 1]) {
        box(g, xx, y - dip, z + s * 0.06, 0.3, 0.3, 0.012, colors[i % colors.length], [0, 0, 0.18]);
      }
    }
  }

  /* ============ 建筑 ============ */
  function building(g: THREE.Object3D, zi: number, variant: number) {
    const zone = ZONES[zi];
    const r = (n: number) => hash(variant * 47 + n + zi * 131);
    const w = 3.5 + r(1) * 1.2;
    const h = 3.6 + r(2) * (zi === 5 ? 8 : 3.2);
    const d = 5.2;
    const c = zone.colors[Math.floor(r(3) * 4)];
    const front = d / 2;

    switch (zi) {
      case 0: { /* 埃及：砂岩平顶、棕榈、象形装饰 */
        box(g, 0, 0.16, 0, w + 0.2, 0.32, d + 0.2, 0xd8b98a);
        box(g, 0, 0.34, 0, w, h, d, surface(c, 'stone'));
        box(g, 0, h + 0.06, 0, w + 0.3, 0.2, d + 0.3, 0xe8cf9e);
        /* 玉米檐口 */
        for (let i = 0; i < Math.floor(w / 0.35); i++) {
          box(g, -w / 2 + 0.17 + i * 0.35, h + 0.24, front, 0.18, 0.14, 0.12, 0xe8cf9e);
        }
        for (let y = 1.8; y < h - 0.6; y += 1.6) {
          for (const a of [-0.26, 0.26]) {
            archWindow(g, a * w, y, front + 0.02, 0.72, 1.1);
          }
        }
        box(g, 0, 0.5, front + 0.08, 1.05, 1.5, 0.14, 0x8a6a48);
        box(g, 0, 0.58, front + 0.16, 0.8, 1.28, 0.06, 0x5a4028);
        if (r(7) > 0.5) {
          /* 棕榈树 */
          const px = w * 0.55;
          cyl(g, px, 1.4, front - 0.5, 0.09, 2.8, 0x8a6a48);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            limb(g, [px, 2.75, front - 0.5], [px + Math.cos(a) * 1.1, 2.3 + (i % 2) * 0.25, front - 0.5 + Math.sin(a) * 0.9], 0.05, surface(0x5a9e5f, 'foliage'));
          }
        }
        break;
      }
      case 1: { /* 中国：灰瓦重檐、灯笼、木格窗 */
        box(g, 0, 0.1, 0, w + 0.2, 0.2, d + 0.2, 0x9a8878);
        box(g, 0, 0.22, 0, w, h, d, c);
        for (let y = 1.9; y < h - 0.5; y += 1.55) {
          box(g, 0, y - 0.18, 0, w + 0.18, 0.12, d + 0.18, 0xe8d5a8);
          for (const a of [-0.26, 0.26]) {
            latticeWindow(g, a * w, y, front + 0.03, 0.95, 1.15, 0x8a4038, 0x78ced5);
          }
          for (const s of [-1, 1]) {
            for (const zz of [-1.5, 0.5]) {
              latticeWindow(g, s * w * 0.5, y, zz, 0.8, 1.05, 0x8a4038, 0x78ced5);
            }
          }
        }
        box(g, 0, 0.3, front + 0.06, 1.1, 1.5, 0.12, 0x8a4038);
        box(g, 0, 0.38, front + 0.14, 0.85, 1.28, 0.05, 0x6aabc0);
        /* 双层弯瓦顶 */
        gableRoof(g, 0, h + 0.16, 0, w, d + 0.4, zone.roof);
        if (h > 5) gableRoof(g, 0, 3.4, front - 0.4, w, 1.4, zone.roof);
        /* 翘角 */
        for (const s of [-1, 1]) {
          limb(g, [s * w * 0.52, h + 0.3, front - 0.1], [s * (w * 0.52 + 0.5), h + 0.62, front - 0.1], 0.05, zone.roof);
        }
        for (const s of [-1, 1]) lantern(g, s * w * 0.44, 1.75, front + 0.35);
        if (r(7) > 0.45) {
          for (let i = 0; i < 5; i++) {
            box(g, -w * 0.42 + i * w * 0.21, 1.45, front + 0.6, w * 0.21, 0.1, 1.1, i % 2 ? 0xfff0cb : zone.roof, [0.16, 0, 0]);
          }
        }
        break;
      }
      case 2: { /* 印度：粉城拱廊、穹顶、镂空阳台 */
        box(g, 0, 0.12, 0, w + 0.2, 0.24, d + 0.2, 0xd8a890);
        box(g, 0, 0.26, 0, w, h, d, c);
        for (let y = 1.9; y < h - 0.5; y += 1.6) {
          for (const a of [-0.27, 0.27]) {
            archWindow(g, a * w, y, front + 0.02, 0.8, 1.25);
            /* 镂空栏杆阳台 */
            box(g, a * w, y - 0.06, front + 0.3, 1.05, 0.07, 0.5, 0xf5e3c4);
            for (let i = 0; i < 4; i++) {
              box(g, a * w - 0.36 + i * 0.24, y + 0.12, front + 0.5, 0.05, 0.34, 0.05, 0xf5e3c4);
            }
          }
        }
        /* 大门拱 */
        archWindow(g, 0, 0.4, front + 0.02, 1.1, 1.8);
        /* 洋葱顶塔 */
        if (r(8) > 0.4) {
          cyl(g, w * 0.42, h + 0.5, 0, 0.4, 0.9, c);
          const dome = new THREE.SphereGeometry(0.45, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.8);
          mesh(g, dome, zone.roof, [w * 0.42, h + 0.95, 0], [1, 1.35, 1]);
          cone(g, w * 0.42, h + 1.7, 0, 0.05, 0.28, 0xf2c94c);
        } else {
          const dome = new THREE.SphereGeometry(0.55, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
          mesh(g, dome, zone.roof, [0, h + 0.2, 0], [1, 0.9, 1]);
        }
        if (r(7) > 0.5) flowerBox(g, 0, 0.45, front + 0.62, 1.6, 0xd98a6a);
        break;
      }
      case 3: { /* 巴西：海岸彩屋、彩旗、山丘 */
        const palette = [0xf2a2d2, 0x86d4f4, 0xf4d58d, 0x9dc796, 0xf49e8a, 0xc9b9e9];
        box(g, 0, 0.1, 0, w + 0.2, 0.2, d + 0.2, 0xd8c8a8);
        box(g, 0, 0.22, 0, w, h, d, palette[variant % palette.length]);
        box(g, 0, h + 0.08, 0, w + 0.35, 0.16, d + 0.3, 0xe0592a);
        for (let y = 1.85; y < h - 0.4; y += 1.55) {
          for (const a of [-0.26, 0.26]) {
            box(g, a * w, y + 0.55, front + 0.02, 0.85, 1.05, 0.08, 0xfdf6e8);
            box(g, a * w, y + 0.6, front + 0.06, 0.68, 0.88, 0.03, surface(0x6ec6e8, 'window'));
            /* 遮阳棚 */
            awningStripes(g, a * w, y - 0.08, front + 0.35, 1.0, 0xfff6e0, 0xe0592a);
          }
        }
        box(g, 0, 0.4, front + 0.08, 0.95, 1.4, 0.12, 0x4a6a5a);
        if (r(7) > 0.5) bunting(g, 0, h - 0.35, front + 0.3, w + 0.6, [0xe0592a, 0xf2c94c, 0x4fc3d9, 0x7dd8b5]);
        break;
      }
      case 4: { /* 日本：木格町屋、樱花、暖帘 */
        box(g, 0, 0.1, 0, w + 0.15, 0.2, d + 0.15, 0x8a7a6a);
        box(g, 0, 0.22, 0, w, h, d, c);
        /* 格子立面 */
        for (let y = 1.9; y < h - 0.4; y += 1.5) {
          for (let i = 0; i < Math.floor(w / 0.28); i++) {
            box(g, -w / 2 + 0.14 + i * 0.28, y + 0.55, front + 0.02, 0.06, 1.1, 0.06, 0x5a4636);
          }
          box(g, 0, y + 0.55, front + 0.03, w, 0.06, 0.07, 0x5a4636);
          box(g, 0, y + 0.55, front + 0.01, w - 0.3, 1.0, 0.02, surface(0xf5ecd8, 'window'));
        }
        box(g, 0, 0.38, front + 0.06, 1.15, 1.45, 0.1, 0x5a4636);
        box(g, 0, 0.5, front + 0.13, 0.9, 1.2, 0.04, 0x8a4038);
        /* 暖帘 */
        for (let i = 0; i < 4; i++) {
          box(g, -0.44 + i * 0.3, 0.42, front + 0.19, 0.28, 0.62, 0.015, i % 2 ? 0x3a5a4a : 0x6a9a8a);
        }
        /* 寄栋顶 */
        gableRoof(g, 0, h + 0.1, 0, w, d + 0.5, 0x4a5568);
        if (r(7) > 0.5) {
          /* 樱花枝 */
          const px = w * 0.62;
          cyl(g, px, 1.1, front - 0.8, 0.07, 2.2, 0x6a4a3a);
          for (let i = 0; i < 5; i++) {
            orb(g, px + (hash(i + variant) - 0.5) * 1.1, 2.2 + hash(i * 3 + variant) * 0.7, front - 0.8 + (hash(i * 7 + variant) - 0.5) * 0.8, 0.42, 0.36, 0.42, surface([0xf4bfd0, 0xf09db4][i % 2], 'foliage'));
          }
        }
        break;
      }
      case 5: { /* 美国：玻璃高楼 */
        const towerMat = surface(c, 'glass');
        box(g, 0, 0.2, 0, w, h, d, towerMat);
        box(g, 0, 0.08, 0, w + 0.5, 0.3, d + 0.5, 0xb8b2a8);
        /* 窗带 */
        for (let y = 1.6; y < h - 0.3; y += 0.95) {
          box(g, 0, y, front + 0.02, w - 0.3, 0.55, 0.05, surface(0x9fd8f0, 'window'));
          for (const s of [-1, 1]) {
            box(g, s * (w / 2 + 0.01), y, 0, 0.04, 0.55, d - 0.6, surface(0x9fd8f0, 'window'));
          }
        }
        if (r(6) > 0.5) {
          /* 阶梯尖塔 */
          box(g, 0, h + 0.25, 0, w * 0.72, 0.5, d * 0.72, towerMat);
          box(g, 0, h + 0.75, 0, w * 0.45, 0.5, d * 0.45, towerMat);
          cone(g, 0, h + 1.4, 0, w * 0.2, 0.9, 0xc9d4d8);
          /* 天线 */
          cyl(g, 0, h + 2.1, 0, 0.02, 1.2, 0x8a929a);
          const light = orb(g, 0, h + 2.7, 0, 0.05, 0.05, 0.05, 0xff4a3a);
          (light.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xff2200);
          (light.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4;
        } else {
          box(g, 0, h + 0.1, 0, w + 0.2, 0.2, d + 0.2, 0xc9d4d8);
        }
        break;
      }
      case 6: { /* 摩洛哥：赭红城墙、马蹄拱、彩砖 */
        box(g, 0, 0.14, 0, w + 0.2, 0.28, d + 0.2, 0xb86a48);
        box(g, 0, 0.3, 0, w, h, d, surface(c, 'plaster'));
        /* 锯齿垛口 */
        for (let i = 0; i < Math.floor(w / 0.42); i++) {
          box(g, -w / 2 + 0.21 + i * 0.42, h + 0.18, front, 0.24, 0.3, 0.3, 0xb86a48);
        }
        box(g, 0, h + 0.05, 0, w + 0.24, 0.12, d + 0.24, 0xb86a48);
        /* 马蹄拱窗 */
        for (let y = 1.9; y < h - 0.5; y += 1.6) {
          for (const a of [-0.27, 0.27]) {
            archWindow(g, a * w, y, front + 0.02, 0.7, 1.2);
            /* 彩砖框 */
            for (let i = 0; i < 4; i++) {
              box(g, a * w - 0.42 + i * 0.28, y - 0.1, front + 0.04, 0.14, 0.14, 0.02, [0x2f7fae, 0xf2eec9, 0xc95a3a, 0x4a9a6a][i % 4]);
            }
          }
        }
        /* 马蹄拱门 */
        archWindow(g, 0, 0.4, front + 0.02, 1.15, 1.9);
        box(g, 0, 0.42, front + 0.12, 0.85, 1.55, 0.05, surface(0x6a4028, 'wood'));
        if (r(8) > 0.45) {
          /* 小宣礼塔 */
          const px = w * 0.46;
          box(g, px, h * 0.6, 0, 0.7, h * 0.75, 0.7, surface(0xd47845, 'plaster'));
          box(g, px, h * 0.98, 0, 0.85, 0.16, 0.85, 0xf2e2c0);
          for (let i = 0; i < 3; i++) {
            box(g, px, h * 1.02 + i * 0.22, 0, 0.5 - i * 0.12, 0.2, 0.5 - i * 0.12, 0xd47845);
          }
          cone(g, px, h * 1.25, 0, 0.16, 0.4, 0x4a8a5a);
        }
        break;
      }
      case 7: { /* 希腊：蓝顶白屋 */
        box(g, 0, 0.1, 0, w + 0.2, 0.2, d + 0.2, 0xd8d0c0);
        box(g, 0, 0.22, 0, w, h, d, 0xf8f5ee);
        for (let y = 1.9; y < h - 0.4; y += 1.55) {
          for (const a of [-0.26, 0.26]) {
            box(g, a * w, y + 0.55, front + 0.02, 0.8, 1.0, 0.08, 0xfdfbf5);
            box(g, a * w, y + 0.6, front + 0.06, 0.62, 0.84, 0.03, surface(0x3d84c9, 'window'));
            box(g, a * w, y + 0.6, front + 0.07, 0.62, 0.05, 0.035, 0xfdfbf5);
            box(g, a * w, y + 0.6, front + 0.07, 0.05, 0.84, 0.035, 0xfdfbf5);
          }
        }
        box(g, 0, 0.4, front + 0.08, 0.95, 1.45, 0.12, 0x3d6a9a);
        if (r(8) > 0.5) {
          /* 蓝穹顶 */
          const dome = new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
          mesh(g, dome, 0x3d84c9, [0, h + 0.15, 0], [1, 0.95, 1]);
          cyl(g, 0, h + 0.72, 0, 0.03, 0.3, 0xfdfbf5);
          box(g, 0, h + 0.85, 0, 0.1, 0.1, 0.02, 0x3d84c9);
        } else {
          for (let i = 0; i < Math.floor(w / 0.4); i++) {
            box(g, -w / 2 + 0.2 + i * 0.4, h + 0.16, front, 0.22, 0.26, 0.22, 0xfdfbf5);
          }
          box(g, 0, h + 0.05, 0, w + 0.2, 0.12, d + 0.2, 0xfdfbf5);
        }
        if (r(7) > 0.6) flowerBox(g, w * 0.3, 0.5, front + 0.5, 1.2, 0x3d84c9);
        break;
      }
      case 8: { /* 墨西哥：彩色拱廊、彩旗、仙人掌 */
        const palette = [0xe8a53c, 0x4aa8c9, 0xe0592a, 0x8a5ac9, 0x4a9a5a, 0xf2c94c];
        const body = palette[variant % palette.length];
        box(g, 0, 0.12, 0, w + 0.2, 0.24, d + 0.2, 0xc9a06a);
        box(g, 0, 0.26, 0, w, h, d, surface(body, 'plaster'));
        /* 拱廊 */
        for (let i = 0; i < 3; i++) {
          const xx = -w / 3 + (i * w) / 3;
          archWindow(g, xx, 0.42, front + 0.02, w / 3.4, 1.6);
        }
        for (let y = 2.3; y < h - 0.3; y += 1.5) {
          box(g, 0, y + 0.5, front + 0.02, w - 0.2, 0.8, 0.06, surface(0xf5e8cc, 'window'));
          box(g, 0, y + 0.5, front + 0.03, w - 0.5, 0.5, 0.07, 0xf5e8cc);
        }
        box(g, 0, h + 0.1, 0, w + 0.3, 0.2, d + 0.3, 0xc95a3a);
        bunting(g, 0, h - 0.3, front + 0.4, w + 0.6, [0xe0592a, 0xf2c94c, 0x4aa8c9, 0xe8a53c]);
        if (r(7) > 0.5) {
          /* 仙人掌 */
          const px = w * 0.6;
          cyl(g, px, 0.9, front - 0.6, 0.14, 1.8, surface(0x4a9a5a, 'foliage'));
          for (const s of [-1, 1]) {
            limb(g, [px, 1.15, front - 0.6], [px + s * 0.5, 1.45, front - 0.6], 0.1, 0x4a9a5a);
            cyl(g, px + s * 0.5, 1.6, front - 0.6, 0.09, 0.5, 0x4a9a5a);
          }
        }
        break;
      }
      case 9: default: { /* 挪威：尖顶木屋 */
        const palette = [0xc9443a, 0x4a7a9a, 0xe8a53c, 0x6a9a5a, 0x8a5a3a, 0xd8d0c0];
        const body = palette[variant % palette.length];
        box(g, 0, 0.12, 0, w + 0.2, 0.24, d + 0.2, 0x8a7a6a);
        box(g, 0, 0.26, 0, w, h, d, surface(body, 'wood'));
        /* 交叉木纹 */
        box(g, 0, h * 0.55, front + 0.02, w, 0.14, 0.05, 0xf5ead2);
        box(g, 0, h * 0.8, front + 0.02, w, 0.14, 0.05, 0xf5ead2);
        for (let y = 1.9; y < h - 0.3; y += 1.5) {
          for (const a of [-0.26, 0.26]) {
            latticeWindow(g, a * w, y, front + 0.03, 0.78, 0.95, 0xf5ead2, 0xf5d8a8);
            box(g, a * w, y + 1.02, front + 0.05, 0.95, 0.08, 0.14, 0xf5ead2);
          }
        }
        box(g, 0, 0.4, front + 0.07, 0.95, 1.5, 0.12, 0x5a4636);
        /* 尖顶 */
        const roofH = 1.5 + r(9) * 0.8;
        mesh(g, new THREE.CylinderGeometry(0.02, Math.SQRT1_2 * (w + 0.7), roofH, 4), surface(zone.roof, 'roof'), [0, h + roofH / 2, 0], [w + 0.7, 1, d + 0.7], [0, Math.PI / 4, 0]);
        /* 烟囱 */
        if (r(5) > 0.5) box(g, w * 0.28, h + roofH * 0.55, 0, 0.3, 0.8, 0.3, 0x8a7a72);
        break;
      }
    }
    /* 底层通用细节 */
    if (zi !== 4 && zi !== 6 && r(10) > 0.55) {
      /* 门口台阶 */
      box(g, 0, 0.08, front + 0.35, 1.3, 0.16, 0.5, 0xd8ccb8);
    }
  }

  /* ============ 地标 ============ */
  function landmark(g: THREE.Object3D, zi: number, v: number) {
    const zone = ZONES[zi];
    switch (zi) {
      case 0: { /* 金字塔 + 方尖碑 */
        const size = 7 + v * 1.5;
        mesh(g, new THREE.ConeGeometry(1, 1, 4), surface(0xe8cf9e, 'stone'), [0, size / 2, 0], [size, size, size], [0, Math.PI / 4, 0]);
        for (let i = 1; i < 4; i++) {
          const s = size * (1 - i / 4);
          box(g, 0, (size * i) / 4, 0, s * 1.42, 0.08, s * 1.42, 0xd8b98a);
        }
        if (v === 0) {
          cyl(g, size + 1.2, 1.6, 1, 0.18, 3.2, surface(0xf0dcb8, 'stone'));
          cone(g, size + 1.2, 3.5, 1, 0.18, 0.4, 0xf2c94c);
        }
        break;
      }
      case 1: { /* 城楼 */
        box(g, 0, 0.2, 0, 9, 2.2, 2.6, surface(0x9a8878, 'stone'));
        box(g, -2.8, 1.2, 0, 3.4, 4.2, 2.8, 0xa8b8b0);
        box(g, 2.8, 1.2, 0, 3.4, 4.2, 2.8, 0xa8b8b0);
        archWindow(g, 0, 0.5, 1.35, 2.2, 1.7);
        box(g, 0, 3.3, 0, 9.6, 0.7, 3.2, 0x8a4038);
        gableRoof(g, 0, 3.95, 0, 9.2, 3.2, zone.roof);
        for (const s of [-1, 1]) {
          for (const xx of [-4.2, 4.2]) {
            lantern(g, xx, s * 1.7 + 1.9, 1.7);
          }
        }
        break;
      }
      case 2: { /* 穹顶宫殿 */
        box(g, 0, 0.3, 0, 8, 3.4, 4, surface(0xf0a8c0, 'plaster'));
        for (let i = 0; i < 4; i++) {
          archWindow(g, -3 + i * 2, 0.7, 2.05, 1.1, 1.8);
        }
        box(g, 0, 3.6, 0, 8.5, 0.4, 4.5, 0xe8b87a);
        for (const s of [-1, 0, 1]) {
          const dome = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.9);
          mesh(g, dome, zone.roof, [s * 2.4, 3.8, 0], [1, 1.2, 1]);
          cone(g, s * 2.4, 5.3, 0, 0.06, 0.35, 0xf2c94c);
        }
        break;
      }
      case 3: { /* 面包山 + 救世基督像风格剪影 */
        orb(g, 0, 1.2, 0, 4.2, 3.4, 3.2, surface(0x6a9a6a, 'foliage'));
        orb(g, 1.8, 3.8, 0.4, 2.6, 2.4, 2.2, surface(0x7aaa7a, 'foliage'));
        if (v === 0) {
          box(g, 1.8, 5.6, 0.4, 0.5, 1.6, 0.5, 0xe8e0d0);
          box(g, 1.8, 6.5, 0.4, 1.7, 0.28, 0.4, 0xe8e0d0);
          cyl(g, 1.8, 5.2, 0.4, 0.3, 0.6, 0xe8e0d0);
        }
        break;
      }
      case 4: { /* 鸟居 + 远山 */
        if (v === 0) {
          for (const s of [-1, 1]) {
            cyl(g, s * 2.2, 1.9, 0, 0.19, 3.8, 0xd94f3d);
            cyl(g, s * 2.2, 0.15, 0, 0.26, 0.3, 0x3a3a3a);
          }
          box(g, 0, 3.95, 0, 5.6, 0.32, 0.42, 0xd94f3d);
          box(g, 0, 3.35, 0, 4.8, 0.2, 0.32, 0xd94f3d);
          box(g, 0, 4.18, 0, 6.1, 0.16, 0.55, 0x3a3a3a);
        } else {
          mesh(g, new THREE.ConeGeometry(5, 5.5, 4), surface(0x7a9ab0, 'stone'), [0, 2.75, 0], [1, 1, 1], [0, Math.PI / 4, 0]);
          orb(g, 0, 5.6, 0, 2.2, 0.7, 2.2, 0xfdfdfa);
        }
        break;
      }
      case 5: { /* 双子塔 */
        for (const s of [-1, 1]) {
          box(g, s * 1.6, 0.2, 0, 2.4, 10 + v * 2, 2.4, surface(0x9fc8e8, 'glass'));
          box(g, s * 1.6, 10.4 + v * 2, 0, 2.5, 0.2, 2.5, 0xc9d4d8);
          for (let y = 1.5; y < 9 + v * 2; y += 0.95) {
            box(g, s * 1.6, y, 1.22, 2.0, 0.5, 0.04, surface(0xb8e0f5, 'window'));
          }
        }
        box(g, 0, 5, 0, 1.4, 0.24, 1.6, 0xc9d4d8);
        break;
      }
      case 6: { /* 宣礼塔与拱门城墙 */
        box(g, 0, 0.2, 0, 8, 2.4, 1.2, surface(0xd47845, 'plaster'));
        archWindow(g, 0, 0.3, 0.65, 2.4, 1.8);
        for (const s of [-1, 1]) {
          box(g, s * 3.6, 2.6, 0, 1.1, 7.5, 1.1, surface(0xd47845, 'plaster'));
          box(g, s * 3.6, 6.5, 0, 1.4, 0.25, 1.4, 0xf2e2c0);
          for (let i = 0; i < 3; i++) {
            box(g, s * 3.6, 6.7 + i * 0.24, 0, 0.72 - i * 0.18, 0.2, 0.72 - i * 0.18, 0xd47845);
          }
          cone(g, s * 3.6, 7.6, 0, 0.2, 0.5, 0x4a8a5a);
          orb(g, s * 3.6, 7.95, 0, 0.07, 0.09, 0.07, 0xf2c94c);
        }
        break;
      }
      case 7: { /* 风车 */
        box(g, 0, 0.2, 0, 2.6, 4.6, 2.6, 0xfdfbf5);
        const dome = new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        mesh(g, dome, 0x3d84c9, [0, 4.8, 0], [1.4, 1.2, 1.4]);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const blade = box(g, 0, 4.2, 1.5, 0.16, 2.4, 0.04, 0xfdfbf5);
          blade.rotation.z = a;
          blade.position.set(Math.sin(a) * 1.2, 4.2 + Math.cos(a) * 1.2 * 0, 1.55);
        }
        cyl(g, 0, 4.2, 1.3, 0.08, 0.5, 0x8a7a6a, [Math.PI / 2, 0, 0]);
        break;
      }
      case 8: { /* 阶梯金字塔 */
        for (let i = 0; i < 5; i++) {
          const s = 7 - i * 1.3;
          box(g, 0, 0.15 + i * 0.95, 0, s, 0.95, s, surface([0xc9a06a, 0xd8b98a][i % 2], 'stone'));
        }
        box(g, 0, 5.1, 0, 1.2, 1.3, 1.2, 0xc95a3a);
        /* 两侧彩旗柱 */
        for (const s of [-1, 1]) {
          cyl(g, s * 5.2, 1.4, 2.5, 0.06, 2.8, 0x8a6a48);
          bunting(g, s * 5.2, 2.9, 2.5, 3.4, [0xe0592a, 0xf2c94c, 0x4aa8c9]);
        }
        break;
      }
      case 9: default: { /* 雪山峡湾 */
        orb(g, 0, 2.5, 0, 7, 4.5, 5, surface(0x8aa8b8, 'stone'));
        orb(g, 0, 6.4, 0, 3.4, 2.6, 2.8, 0xf4f8fa);
        orb(g, -4.2, 3.4, 0.5, 2.6, 2.2, 2.2, 0xf4f8fa);
        for (let i = 0; i < 4; i++) {
          cyl(g, 3 + i * 0.8, 0.9, -2 + hash(i) * 3, 0.14, 1.8, surface(0x2f6a4a, 'foliage'));
          cone(g, 3 + i * 0.8, 2.5, -2 + hash(i) * 3, 0.5, 1.6, surface(0x3a7a5a, 'foliage'));
        }
        break;
      }
    }
  }

  /* ============ 路边装饰 ============ */
  function roadside(g: THREE.Object3D, zi: number, type: number) {
    const zone = ZONES[zi];
    switch (zi) {
      case 0: { /* 棕榈 + 砂岩墩 */
        if (type === 0) {
          cyl(g, 0, 1.5, 0, 0.1, 3, 0x9a7a58);
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            limb(g, [0, 3, 0], [Math.cos(a) * 1.3, 2.5 + (i % 2) * 0.3, Math.sin(a) * 1.3], 0.055, surface(0x5a9e5f, 'foliage'));
          }
          orb(g, 0, 2.95, 0, 0.12, 0.1, 0.12, 0xc9a04a);
        } else {
          box(g, 0, 0.35, 0, 0.8, 0.7, 0.8, surface(0xe0c8a0, 'stone'));
          orb(g, 0, 0.85, 0, 0.18, 0.14, 0.18, 0xe8d0a8);
        }
        break;
      }
      case 1: { /* 石灯笼 + 盆栽 */
        if (type === 0) {
          cyl(g, 0, 0.14, 0, 0.22, 0.28, 0x8a888a);
          cyl(g, 0, 0.55, 0, 0.07, 0.6, 0x8a888a);
          box(g, 0, 0.95, 0, 0.5, 0.34, 0.5, 0x9a989a);
          cone(g, 0, 1.32, 0, 0.4, 0.32, 0x8a888a);
          orb(g, 0, 1.1, 0, 0.1, 0.08, 0.1, 0xfff2c8);
        } else {
          /* 竹丛 */
          for (let i = 0; i < 3; i++) {
            const xx = (i - 1) * 0.3;
            cyl(g, xx, 1.6, 0, 0.05, 3.2, 0x62bd6a);
            for (let k = 0; k < 3; k++) {
              const yy = 2.4 - k * 0.6, s = k % 2 ? 1 : -1;
              limb(g, [xx, yy, 0], [xx + s * 0.6, yy + 0.3, 0.08], 0.024, 0x4da76a);
            }
          }
        }
        break;
      }
      case 2: { /* 花摊 + 大象雕像柱 */
        if (type === 0) {
          box(g, 0, 0.4, 0, 1.4, 0.8, 0.9, 0xd98a6a);
          for (let i = 0; i < 6; i++) {
            orb(g, -0.5 + i * 0.2, 0.95, 0.15, 0.1, 0.12, 0.1, [0xf6bdc8, 0xf3d68a, 0xbf93d4][i % 3]);
          }
          awningStripes(g, 0, 1.15, 0, 1.5, 0xf5e3c4, 0xe07a8a);
        } else {
          cyl(g, 0, 1.2, 0, 0.28, 2.4, surface(0xf0d8b8, 'stone'));
          box(g, 0, 2.55, 0, 0.85, 0.24, 0.85, 0xe8b87a);
          cone(g, 0, 2.85, 0, 0.24, 0.4, zone.roof);
        }
        break;
      }
      case 3: { /* 沙滩伞 + 卡波耶拉鼓 */
        if (type === 0) {
          cyl(g, 0, 0.85, 0, 0.035, 1.7, 0xe8e0d0);
          const canopy = new THREE.ConeGeometry(1.05, 0.5, 10);
          mesh(g, canopy, 0xe0592a, [0, 1.85, 0], [1, 1, 1]);
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + 0.3;
            box(g, Math.cos(a) * 0.5, 1.85, Math.sin(a) * 0.5, 0.5, 0.5, 0.03, i % 2 ? 0xf2c94c : 0x4fc3d9, [0, -a, 0.3]);
          }
        } else {
          cyl(g, 0, 0.35, 0, 0.32, 0.7, 0xc98f3d, [Math.PI / 2, 0, 0]);
          for (const s of [-1, 1]) {
            cyl(g, 0, 0.35, s * 0.38, 0.35, 0.03, 0xf5e8cc, [Math.PI / 2, 0, 0]);
          }
        }
        break;
      }
      case 4: { /* 樱花树 + 邮筒 */
        if (type === 0) {
          cyl(g, 0, 0.9, 0, 0.14, 1.8, 0x6a4a3a);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            orb(g, Math.cos(a) * 0.55, 2.1 + (i % 3) * 0.25, Math.sin(a) * 0.45, 0.6, 0.52, 0.6, surface([0xf4bfd0, 0xf09db4, 0xfad8e4][i % 3], 'foliage'));
          }
        } else {
          box(g, 0, 0.55, 0, 0.42, 1.1, 0.42, 0xd94f3d);
          box(g, 0, 1.16, 0, 0.5, 0.14, 0.5, 0xd94f3d);
          box(g, 0.22, 0.85, 0, 0.02, 0.16, 0.3, 0xf5e8cc);
        }
        break;
      }
      case 5: { /* 路灯 + 消防水栓 */
        if (type === 0) {
          cyl(g, 0, 1.7, 0, 0.05, 3.4, 0x4a5a68);
          box(g, 0, 3.3, 0, 0.34, 0.36, 0.34, 0xf6e2ac);
          box(g, 0, 3.64, 0, 0.44, 0.1, 0.44, 0x4a5a68);
        } else {
          cyl(g, 0, 0.3, 0, 0.11, 0.6, 0xd94f3d);
          orb(g, 0, 0.68, 0, 0.13, 0.12, 0.13, 0xd94f3d);
          box(g, 0, 0.45, 0, 0.4, 0.09, 0.09, 0xd94f3d);
        }
        break;
      }
      case 6: { /* 陶罐 + 彩砖矮墙 */
        if (type === 0) {
          const pot = new THREE.SphereGeometry(0.42, 12, 10);
          mesh(g, pot, surface(0xc9743a, 'plaster'), [0, 0.45, 0], [1, 1.15, 1]);
          cyl(g, 0, 0.95, 0, 0.26, 0.12, 0xc9743a);
        } else {
          box(g, 0, 0.3, 0, 1.6, 0.6, 0.35, surface(0xd47845, 'plaster'));
          for (let i = 0; i < 4; i++) {
            box(g, -0.57 + i * 0.38, 0.68, 0, 0.3, 0.14, 0.02, [0x2f7fae, 0xf2eec9, 0xc95a3a, 0x4a9a6a][i % 4]);
          }
        }
        break;
      }
      case 7: { /* 蓝白邮筒 + 柠檬树 */
        if (type === 0) {
          box(g, 0, 0.5, 0, 0.4, 1, 0.4, 0x3d84c9);
          box(g, 0, 1.08, 0, 0.48, 0.16, 0.48, 0x3d84c9);
          box(g, 0, 0.72, 0.21, 0.02, 0.14, 0.26, 0xfdfbf5);
        } else {
          cyl(g, 0, 0.95, 0, 0.09, 1.9, 0x6a5a3a);
          orb(g, 0, 2, 0, 0.75, 0.65, 0.75, surface(0x5a9a5a, 'foliage'));
          for (let i = 0; i < 5; i++) {
            const a = hash(i) * Math.PI * 2;
            orb(g, Math.cos(a) * 0.6, 1.85 + hash(i * 3) * 0.4, Math.sin(a) * 0.6, 0.08, 0.08, 0.08, 0xf2c94c);
          }
        }
        break;
      }
      case 8: { /* 仙人掌 + 彩绘骷髅柱 */
        if (type === 0) {
          cyl(g, 0, 0.85, 0, 0.16, 1.7, surface(0x4a9a5a, 'foliage'));
          for (const s of [-1, 1]) {
            limb(g, [0, 1, 0], [s * 0.55, 1.35, 0], 0.11, 0x4a9a5a);
            cyl(g, s * 0.55, 1.55, 0, 0.1, 0.55, 0x4a9a5a);
          }
          orb(g, 0, 1.78, 0, 0.09, 0.09, 0.09, 0xe86a8a);
        } else {
          cyl(g, 0, 0.9, 0, 0.18, 1.8, surface(0xf5e8cc, 'plaster'));
          for (let i = 0; i < 4; i++) {
            const yy = 0.4 + i * 0.42;
            box(g, 0, yy, 0.19, 0.32, 0.16, 0.02, [0xe0592a, 0x4aa8c9, 0xf2c94c, 0x8a5ac9][i % 4]);
          }
          orb(g, 0, 1.85, 0, 0.14, 0.12, 0.14, 0xf5e8cc);
        }
        break;
      }
      case 9: default: { /* 云杉 + 木桩灯 */
        if (type === 0) {
          cyl(g, 0, 0.5, 0, 0.1, 1, 0x6a4a2a);
          for (let i = 0; i < 3; i++) {
            cone(g, 0, 1.3 + i * 0.62, 0, 0.72 - i * 0.16, 1.1, surface(i % 2 ? 0x2f6a4a : 0x3a7a5a, 'foliage'));
          }
          if (type === 0) cone(g, 0, 3.2, 0, 0.28, 0.6, 0xf4f8fa);
        } else {
          cyl(g, 0, 0.65, 0, 0.07, 1.3, 0x5a4636);
          box(g, 0, 1.4, 0, 0.26, 0.28, 0.26, 0xf6e2ac);
          cone(g, 0, 1.66, 0, 0.24, 0.24, 0x8a5a3a);
        }
        break;
      }
    }
  }

  /* ============ 站门 ============ */
  function gate(g: THREE.Object3D, zi: number) {
    const zone = ZONES[zi];
    switch (zi) {
      case 0: { /* 埃及塔门 */
        for (const s of [-1, 1]) {
          box(g, s * 4, 0.2, 0, 1.15, 7.2, 1.15, surface(0xe0c8a0, 'stone'));
          box(g, s * 4, 4, 0, 1.3, 1.2, 1.3, surface(0xd8b088, 'stone'));
          cone(g, s * 4, 4.85, 0, 0.65, 0.7, 0xc9a04a);
        }
        box(g, 0, 6.9, 0, 9.4, 0.7, 0.9, surface(0xe0c8a0, 'stone'));
        box(g, 0, 6.15, 0.42, 3.2, 0.9, 0.2, 0x8a6a48);
        for (let i = 0; i < 4; i++) {
          box(g, -1.1 + i * 0.75, 6.25, 0.55, 0.4, 0.5, 0.06, 0xf2d494);
        }
        break;
      }
      case 1: { /* 中式牌楼 */
        for (const s of [-1, 1]) {
          box(g, s * 4.2, 0.2, 0, 0.6, 6.6, 0.6, 0xa8403a);
          box(g, s * 4.2, 0.5, 0, 0.85, 0.5, 0.85, 0xd8c8a8);
        }
        box(g, 0, 6.4, 0, 9.6, 0.5, 0.7, 0x8a4038);
        gableRoof(g, 0, 6.85, 0, 9.2, 1.8, zone.roof);
        box(g, 0, 5.6, 0.3, 2.9, 0.8, 0.2, 0x193e5f);
        for (let i = 0; i < 3; i++) {
          box(g, -0.85 + i * 0.85, 5.75, 0.42, 0.5, 0.5, 0.03, 0xffd877);
        }
        for (const s of [-1, 1]) lantern(g, s * 3.4, 5.5, 0.5);
        break;
      }
      case 4: { /* 鸟居站门 */
        for (const s of [-1, 1]) {
          cyl(g, s * 3.8, 2.1, 0, 0.2, 4.2, 0xd94f3d);
          cyl(g, s * 3.8, 0.2, 0, 0.3, 0.4, 0x3a3a3a);
        }
        box(g, 0, 4.35, 0, 8.8, 0.35, 0.45, 0xd94f3d);
        box(g, 0, 3.75, 0, 7.6, 0.22, 0.34, 0xd94f3d);
        box(g, 0, 4.6, 0, 9.5, 0.18, 0.6, 0x2a2a2a);
        break;
      }
      case 5: { /* 玻璃拱门 */
        for (const s of [-1, 1]) {
          box(g, s * 4.3, 0.2, 0, 0.9, 7.4, 0.9, surface(0x9fc8e8, 'glass'));
          box(g, s * 4.3, 0.7, 0, 1.1, 0.5, 1.1, 0xc9d4d8);
        }
        box(g, 0, 7.5, 0, 9.6, 0.5, 1, surface(0x9fc8e8, 'glass'));
        box(g, 0, 6.7, 0.45, 3.4, 0.8, 0.16, 0x2a3a4a);
        for (let i = 0; i < 4; i++) {
          box(g, -1.2 + i * 0.8, 6.8, 0.56, 0.5, 0.5, 0.03, 0x7de8f5);
        }
        break;
      }
      default: { /* 通用拱形站门（按国家配色） */
        for (const s of [-1, 1]) {
          box(g, s * 4.2, 0.2, 0, 0.75, 6.4, 0.85, surface(zone.colors[0], 'plaster'));
          box(g, s * 4.2, 0.5, 0, 1.05, 0.45, 1.05, zone.roof);
          cone(g, s * 4.2, 6.9, 0, 0.42, 0.9, zone.roof);
          orb(g, s * 4.2, 7.5, 0, 0.09, 0.11, 0.09, 0xf2c94c);
        }
        box(g, 0, 6.35, 0, 9, 0.55, 0.75, surface(zone.colors[1], 'plaster'));
        gableRoof(g, 0, 6.75, 0, 8.6, 1.5, zone.roof);
        box(g, 0, 5.6, 0.32, 2.8, 0.7, 0.18, 0x24455f);
        for (let i = 0; i < 3; i++) {
          box(g, -0.8 + i * 0.8, 5.72, 0.44, 0.45, 0.42, 0.03, 0xffd877);
        }
        if (zi === 1) for (const s of [-1, 1]) lantern(g, s * 3.4, 5.3, 0.5);
        break;
      }
    }
  }

  return { building, landmark, roadside, gate, lantern, flowerBox, archWindow, gableRoof, bunting };
}
