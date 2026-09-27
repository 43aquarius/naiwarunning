/* 世界块系统：24米一段的街道，含轨道、路缘、建筑、地标与站门。 */
import * as THREE from 'three';
import { ZONES, timeAt, hash } from './engine';
import { surface } from './art';
import { createCountryWorld, type BuildKit } from './countries';
import { createHelpers, bakeGroup, type Helper } from './obstacles';

export class World {
  private chunks = new Map<number, THREE.Group>();
  private chunkSeed = -1;
  private prefabs = new Map<string, THREE.Group>();
  helpers: Helper;
  private kit: BuildKit;
  private country: ReturnType<typeof createCountryWorld>;

  constructor(private scene: THREE.Scene) {
    this.helpers = createHelpers();
    const h = this.helpers;
    this.kit = {
      THREE,
      box: h.box, orb: h.orb, cyl: h.cyl, cone: h.cone, limb: h.limb, mesh: h.mesh,
      material: (c: number, r = 0.8) => h.material(c, r),
      surface: (c: number, kind) => surface(c, kind),
    };
    this.country = createCountryWorld(this.kit);
  }

  /* 预制体：按 key 缓存并烘焙 */
  private prefab(key: string, build: (g: THREE.Group) => void): THREE.Group {
    let p = this.prefabs.get(key);
    if (!p) {
      const raw = new THREE.Group();
      build(raw);
      p = bakeGroup(raw);
      this.prefabs.set(key, p);
    }
    return p;
  }

  /* 轨道段 */
  private buildTrack(g: THREE.Group, zi: number) {
    const zone = ZONES[zi];
    const h = this.helpers;
    h.box(g, 0, -0.4, -12, 90, 0.38, 24, surface(zone.ground, 'ground'));
    h.box(g, 0, -0.08, -12, 8.5, 0.08, 24, surface(zone.road, 'stone'));
    const curb = surface(zi === 0 ? 0xeacb99 : zi === 5 ? 0xc8d3ce : 0xe5d4b9, 'stone');
    for (const side of [-1, 1]) {
      h.box(g, side * 4.65, -0.04, -12, 1, 0.22, 24, curb);
      for (let k = 0; k < 12; k++) {
        h.box(g, side * 4.17, 0.025, -k * 2, 0.16, 0.19, 1.8, k % 2 ? curb : zone.road);
      }
    }
    for (let lane = -1; lane <= 1; lane++) {
      h.box(g, lane * 2.5, -0.03, -12, 2.26, 0.05, 24, zone.road);
      for (let j = 0; j < 13; j++) {
        h.box(g, lane * 2.5, 0.005, -j * 1.85, 2.08, 0.13, 0.34, surface(zi === 0 ? 0xb7895b : 0x9b7a63, 'wood'));
        for (const side of [-1, 1]) h.box(g, lane * 2.5 + side * 0.7, 0.13, -j * 1.85, 0.25, 0.07, 0.33, 0x737781);
      }
      for (const side of [-1, 1]) {
        h.box(g, lane * 2.5 + side * 0.7, 0.12, -12, 0.1, 0.15, 24, 0x617886);
        h.box(g, lane * 2.5 + side * 0.7, 0.24, -12, 0.16, 0.05, 24, 0xc9dbe0);
      }
    }
  }

  /* 单个街道块 */
  private makeChunk(index: number, seed: number, zoneIndex: number): THREE.Group {
    const g = new THREE.Group();
    const zone = ZONES[zoneIndex];
    const absolute = index * 24;
    const district = Math.floor(timeAt(Math.max(0, absolute)) / 60) % 3;

    /* 轨道 */
    const track = this.prefab('track/' + zoneIndex, t => this.buildTrack(t, zoneIndex)).clone();
    g.add(track);

    const landmarkHere = ((index % 7) + 7) % 7 === 3;
    const open = district === 2 || index % 5 === 0;

    for (const side of [-1, 1]) {
      /* 水岸侧景 */
      const water = (zoneIndex === 3 && side === 1 && district === 1)
        || (zoneIndex === 0 && side === 1 && district === 1)
        || ((zoneIndex === 7 || zoneIndex === 9) && side === 1 && district === 1);
      if (water) {
        const h = this.helpers;
        h.box(g, side * 13, -0.09, -12, 15, 0.12, 24, 0x50b8ca);
        h.box(g, side * 5.65, 0.01, -12, 0.35, 0.5, 24, surface(0xe5d4b9, 'stone'));
        for (let k = 0; k < 7; k++) h.box(g, side * (8 + (k % 3) * 2), 0.038, -k * 3.4, 2, 0.025, 0.1, 0xc7e8d9);
      }
      for (let j = 0; j < 3; j++) {
        const z = -j * 8 - 3;
        const id = index * 17 + j + (side + 1) * 10;
        const variant = (Math.floor(hash(id + seed) * 6) + district * 2) % 6;
        const reserved = landmarkHere && side === (index % 2 ? 1 : -1);
        if (!water && !reserved && !(open && j === 1)) {
          const house = this.prefab('house/' + zoneIndex + '/' + variant, t => this.country.building(t, zoneIndex, variant)).clone();
          house.position.set(side * (8.5 + hash(id) * 1.5 + (open ? 1.2 : 0)), 0, z);
          house.rotation.y = -side * Math.PI / 2;
          g.add(house);
        }
        if (j === 0 || j === 2) {
          const type = (index + j + district) & 1;
          const road = this.prefab('roadside/' + zoneIndex + '/' + type, t => this.country.roadside(t, zoneIndex, type)).clone();
          road.position.set(side * 5.65, 0, z + 1.8);
          g.add(road);
        }
      }
      if (landmarkHere && side === (index % 2 ? 1 : -1)) {
        const v = district === 2 ? 0 : Math.abs(Math.floor(index / 7)) % 2;
        const x = side * ((zoneIndex === 0 || zoneIndex === 4) ? 20 : 14);
        const lm = this.prefab('landmark/' + zoneIndex + '/' + v, t => this.country.landmark(t, zoneIndex, v)).clone();
        lm.position.set(x, 0, -12);
        lm.rotation.y = -side * 0.2;
        g.add(lm);
      }
      /* 高楼城市加排楼 */
      if (zoneIndex === 5 && index % 2 === 0) {
        const variant = (Math.abs(index) + district * 2) % 6;
        const tower = this.prefab('house/5/' + variant, t => this.country.building(t, 5, variant)).clone();
        tower.position.set(side * 17.5, 0, -15);
        tower.scale.y = 1.15 + district * 0.1;
        g.add(tower);
      }
      /* 埃及沙丘 */
      if (zoneIndex === 0 && open) {
        const h = this.helpers;
        for (let k = 0; k < 2; k++) h.orb(g, side * (18 + k * 12), 0.7, -k * 12 - 5, 10, 1.8, 8, 0xe5b779);
      }
    }
    /* 站门 */
    if (index % 6 === 0) {
      const gate = this.prefab('gate/' + zoneIndex, t => this.country.gate(t, zoneIndex)).clone();
      gate.position.set(0, 0, -17);
      g.add(gate);
    }
    g.position.z = -absolute;
    this.scene.add(g);
    return g;
  }

  /* 主菜单的家场景 */
  buildHomeSet(zoneIndex: number): THREE.Group {
    const g = new THREE.Group();
    const zone = ZONES[zoneIndex];
    const h = this.helpers;
    h.box(g, 0, -0.36, -20, 90, 0.3, 100, surface(zone.ground, 'ground'));
    h.box(g, 0, -0.09, 0, 9, 0.07, 16, surface(zone.road, 'stone'));
    h.cyl(g, 0, -0.12, 1.4, 3.1, 0.22, 0xd2c3aa);
    h.cyl(g, 0, 0.005, 1.4, 2.8, 0.04, surface(0xf5e6c9, 'stone'));
    for (const side of [-1, 1]) {
      const house = this.prefab('house/' + zoneIndex + '/' + (side + 2), t => this.country.building(t, zoneIndex, side + 2)).clone();
      house.position.set(side * 6.0, 0, -4.8);
      house.rotation.y = -side * Math.PI / 2;
      g.add(house);
      const road = this.prefab('roadside/' + zoneIndex + '/1', t => this.country.roadside(t, zoneIndex, 1)).clone();
      road.position.set(side * 4.3, 0, 1.3);
      g.add(road);
    }
    const lm = this.prefab('landmark/' + zoneIndex + '/0', t => this.country.landmark(t, zoneIndex, 0)).clone();
    lm.position.set(0, 0, -19);
    g.add(lm);
    return g;
  }

  update(distance: number, seed: number, zoneIndex: number) {
    if (this.chunkSeed !== seed) {
      for (const g of this.chunks.values()) this.dispose(g);
      this.chunks.clear();
      this.chunkSeed = seed;
    }
    const center = Math.floor(distance / 24);
    for (let i = center - 1; i <= center + 8; i++) {
      if (!this.chunks.has(i)) this.chunks.set(i, this.makeChunk(i, seed, zoneIndex));
      this.chunks.get(i)!.position.z = distance - i * 24;
    }
    for (const [i, g] of this.chunks) {
      if (i < center - 1 || i > center + 8) {
        this.dispose(g);
        this.chunks.delete(i);
      }
    }
  }

  setChunksVisible(v: boolean) {
    for (const g of this.chunks.values()) g.visible = v;
  }

  clear() {
    for (const g of this.chunks.values()) this.dispose(g);
    this.chunks.clear();
    this.chunkSeed = -1;
  }

  count() { return this.chunks.size; }

  private dispose(g: THREE.Group) {
    g.traverse(o => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.scene.remove(g);
  }
}
