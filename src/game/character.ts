/* 角色系统：直接加载原版 v6.4.0 的蒙皮网格资产（奶蛙/公牛/小狗）与 72 套服装。
   数据结构与运行时解码流程与原版 characters.js 完全同构。 */
import * as THREE from 'three';
import { texture, type TextureKind } from './art';

/* ---------- 原版 manifest 类型 ---------- */

interface FieldDef { offset: number; length: number; type: 'Float32Array' | 'Uint16Array'; }

export interface MeshDef {
  name: string;
  positions?: FieldDef;
  normals?: FieldDef;
  colors?: FieldDef;
  uvs?: FieldDef;
  skinWeights?: FieldDef;
  skinIndices?: FieldDef;
  indices?: FieldDef;
  bodyCoverage?: FieldDef;
  materials?: string[];
  groups?: [number, number, number][];
  rig?: { name: string; parent: number; matrix: number[] }[];
  children?: MeshDef[];
  matrix?: number[];
}

interface MaterialDef {
  color: [number, number, number];
  roughness: number;
  metalness?: number;
  pattern: string;
  imported?: boolean;
  map?: string;
  normalMap?: string;
  metallicRoughnessMap?: string;
}

interface CharManifest {
  materials: Record<string, MaterialDef>;
  characters: Record<'runner' | 'bull' | 'dog', { name: string; children: MeshDef[] }>;
  wardrobe: Record<string, MeshDef & { file: string; fit?: string }>;
}

/* ---------- 解码后的网格 ---------- */

export interface DecodedMesh {
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  colors?: Float32Array;
  uvs?: Float32Array;
  skinWeights?: Float32Array;
  skinIndices?: Uint16Array;
  indices?: Uint16Array;
  bodyCoverage?: Float32Array;
  materials: string[];
  groups: [number, number, number][];
  rig?: { name: string; parent: number; matrix: number[] }[];
}

/* ---------- Actor ---------- */

export interface Bone { object: THREE.Object3D; restQ: THREE.Quaternion; restP: THREE.Vector3; }

export interface Actor {
  root: THREE.Group;
  model: THREE.Group;
  bones: Record<string, Bone>;
  phase: number;
  jumpMix: number;
  slideMix: number;
  land: number;
  wasAir: boolean;
  /* 服装状态 */
  outfit: THREE.SkinnedMesh | null;
  outfitId: string;
  outfitLoading: boolean;
  outfitRequest: number;
  /* 顶点采样缓存（贴地用） */
  surfaceSamples?: number[];
  footSamples?: number[];
}

/* 服装遮罩开关：0 裸装 / 1 有服装（材质着色器丢弃被覆盖片元） */
export const outfitSurface = { value: 0 };

/* ---------- 资产加载 ---------- */

const ASSET_BASE = '/assets';
const FIELD_KEYS: (keyof MeshDef)[] = ['positions', 'normals', 'colors', 'uvs', 'skinWeights', 'skinIndices', 'indices', 'bodyCoverage'];

function decodeMesh(mesh: MeshDef, buffer: ArrayBuffer): DecodedMesh {
  const out: Record<string, unknown> = { name: mesh.name, materials: mesh.materials ?? [], groups: mesh.groups ?? [], rig: mesh.rig };
  const bytes = new Uint8Array(buffer);
  for (const key of FIELD_KEYS) {
    const d = mesh[key] as FieldDef | undefined;
    if (!d) continue;
    const Type = d.type === 'Uint16Array' ? Uint16Array : Float32Array;
    out[key] = new Type(buffer, bytes.byteOffset + d.offset, d.length);
  }
  return out as unknown as DecodedMesh;
}

async function fetchBinary(file: string): Promise<ArrayBuffer> {
  const tryPack = async () => {
    const res = await fetch(`${ASSET_BASE}/${file}.pack?v=6.4.0`);
    if (!res.ok) throw new Error('资源下载失败');
    if ('DecompressionStream' in window) {
      return await new Response(res.body!.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    throw new Error('no DecompressionStream');
  };
  try { return await tryPack(); } catch { /* 回退到未压缩 */ }
  const res = await fetch(`${ASSET_BASE}/${file}.bin?v=6.4.0`);
  if (!res.ok) throw new Error('资源下载失败');
  return res.arrayBuffer();
}

function loadTexture(path: string, srgb: boolean, onDone: () => void): THREE.Texture {
  const tex = new THREE.Texture();
  tex.flipY = false;              // 原版 UV 为 glTF 习惯，不翻转
  tex.anisotropy = 4;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => { tex.image = img; tex.needsUpdate = true; onDone(); };
  img.onerror = () => onDone();
  img.src = `${ASSET_BASE}/${path}?v=6.4.0`;
  return tex;
}

export interface CharacterAssets {
  manifest: CharManifest;
  characters: Record<'runner' | 'bull' | 'dog', DecodedMesh>;
  materials: Record<string, THREE.MeshStandardMaterial>;
}

let assetsPromise: Promise<CharacterAssets> | null = null;

export function loadCharacterAssets(onProgress?: (p: number, status: string) => void): Promise<CharacterAssets> {
  if (assetsPromise) return assetsPromise;
  assetsPromise = (async () => {
    let done = 0;
    const total = 11; // manifest + 3×网格 + 9 贴图…（合并计步）
    const step = (status: string) => { done++; onProgress?.(Math.min(0.99, done / total), status); };

    onProgress?.(0.02, '正在下载角色档案…');
    const mres = await fetch(`${ASSET_BASE}/character-manifest.json?v=6.4.0`);
    if (!mres.ok) throw new Error('角色档案下载失败');
    const manifest = await mres.json() as CharManifest;

    onProgress?.(0.1, '正在下载奶蛙模型…');
    const buffer = await fetchBinary('characters');
    step('正在解码角色模型…');
    const characters = {
      runner: decodeMesh(manifest.characters.runner.children[0], buffer),
      bull: decodeMesh(manifest.characters.bull.children[0], buffer),
      dog: decodeMesh(manifest.characters.dog.children[0], buffer),
    };

    /* 贴图（奶蛙三张 + 公牛三张 + 小狗三张） */
    const materials: Record<string, THREE.MeshStandardMaterial> = {};
    const texCache: Record<string, THREE.Texture> = {};
    const makeTex = (path: string, srgb: boolean) => new Promise<void>(resolve => {
      texCache[path] = loadTexture(path.replace('.png', '.webp'), srgb, () => resolve());
    });
    for (const [name, m] of Object.entries(manifest.materials)) {
      if (!m.imported) continue;
      const jobs: Promise<void>[] = [];
      if (m.map) jobs.push(makeTex(m.map, true));
      if (m.normalMap) jobs.push(makeTex(m.normalMap, false));
      if (m.metallicRoughnessMap) jobs.push(makeTex(m.metallicRoughnessMap, false));
      onProgress?.(0.12, '正在下载角色贴图…');
      await Promise.all(jobs);
      step('正在烘焙角色材质…');
      materials[name] = new THREE.MeshStandardMaterial({
        color: new THREE.Color(...m.color),
        roughness: m.roughness,
        metalness: m.metalness ?? 0,
        vertexColors: true,
        envMapIntensity: 0.6,
        map: m.map ? texCache[m.map] : null,
        normalMap: m.normalMap ? texCache[m.normalMap] : null,
        roughnessMap: m.metallicRoughnessMap ? texCache[m.metallicRoughnessMap] : null,
        metalnessMap: m.metallicRoughnessMap ? texCache[m.metallicRoughnessMap] : null,
        side: THREE.DoubleSide,
      });
    }

    /* 服装材质（程序纹样，与原版 charMaterials 同构） */
    for (const [name, m] of Object.entries(manifest.materials)) {
      if (m.imported || materials[name]) continue;
      const pattern = m.pattern && m.pattern !== 'skin' ? texture(m.pattern as TextureKind) : null;
      materials[name] = new THREE.MeshStandardMaterial({
        color: new THREE.Color(...m.color),
        roughness: m.roughness,
        metalness: m.metalness ?? 0,
        vertexColors: true,
        envMapIntensity: 0.6,
        map: pattern,
        side: THREE.DoubleSide,
      });
    }

    /* 奶蛙材质注入服装遮罩丢弃逻辑（正片 + 阴影深度材质） */
    const runnerMat = materials['import_runner'];
    if (runnerMat) {
      runnerMat.onBeforeCompile = outfitCoverageShader;
      runnerMat.customProgramCacheKey = () => 'source-fitted-clothing-v6.4';
    }
    step('角色就绪');
    onProgress?.(1, '');
    return { manifest, characters, materials };
  })();
  return assetsPromise;
}

/* 服装覆盖片元丢弃：与原版 outfitCoverageShader 逐行一致 */
function outfitCoverageShader(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.outfitSurface = outfitSurface;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float outfitCoverage;varying float vOutfitCoverage;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOutfitCoverage=outfitCoverage;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float outfitSurface;varying float vOutfitCoverage;')
    .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif(outfitSurface>.5 && vOutfitCoverage>=-.012)discard;');
}

/* 奶蛙阴影也走遮罩（穿裙装时身体被覆盖区域不投影） */
export function makeCoveredDepthMaterial(): THREE.MeshDepthMaterial {
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = outfitCoverageShader;
  depth.customProgramCacheKey = () => 'source-fitted-depth-v6.4';
  return depth;
}

/* ---------- 角色构建（原版 loadNode 移植） ---------- */

function buildNode(d: DecodedMesh, assets: CharacterAssets, isRunner: boolean): THREE.SkinnedMesh {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(d.positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(d.normals, 3));
  geo.setIndex(new THREE.BufferAttribute(d.indices!, 1));
  if (d.colors) geo.setAttribute('color', new THREE.BufferAttribute(d.colors, 3));
  if (d.uvs) geo.setAttribute('uv', new THREE.BufferAttribute(d.uvs, 2));
  for (const group of d.groups) geo.addGroup(group[0], group[1], group[2]);
  const mats = d.materials.map(n => assets.materials[n]).filter(Boolean);

  const o = new THREE.SkinnedMesh(geo, mats);
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(d.skinIndices!, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(d.skinWeights!, 4));
  const bones = d.rig!.map(b => {
    const bone = new THREE.Bone();
    bone.name = b.name;
    bone.applyMatrix4(new THREE.Matrix4().fromArray(b.matrix));
    return bone;
  });
  d.rig!.forEach((b, i) => { if (b.parent < 0) o.add(bones[i]); else bones[b.parent].add(bones[i]); });
  o.updateMatrixWorld(true);
  o.bind(new THREE.Skeleton(bones));
  o.frustumCulled = false;
  if (isRunner) {
    geo.setAttribute('outfitCoverage', new THREE.Float32BufferAttribute(new Float32Array(d.positions.length / 3).fill(-1), 1));
    o.customDepthMaterial = makeCoveredDepthMaterial();
  }
  o.castShadow = true;
  o.receiveShadow = true;
  o.name = d.name;
  return o;
}

function assembleActor(mesh: DecodedMesh, assets: CharacterAssets, isRunner: boolean): Actor {
  const root = new THREE.Group();
  const model = new THREE.Group();
  const node = buildNode(mesh, assets, isRunner);
  model.add(node);
  root.add(model);

  const bones: Record<string, Bone> = {};
  model.traverse(o => {
    if ((o as THREE.Bone).isBone) {
      bones[o.name] = { object: o, restQ: o.quaternion.clone(), restP: o.position.clone() };
    }
  });
  return { root, model, bones, phase: 0, jumpMix: 0, slideMix: 0, land: 0, wasAir: false, outfit: null, outfitId: 'classic', outfitLoading: false, outfitRequest: 0 };
}

export function buildRunner(assets: CharacterAssets): Actor {
  return assembleActor(assets.characters.runner, assets, true);
}
export function buildBull(assets: CharacterAssets): Actor {
  return assembleActor(assets.characters.bull, assets, false);
}
export function buildDog(assets: CharacterAssets): Actor {
  return assembleActor(assets.characters.dog, assets, false);
}

/* 找到奶蛙的皮肤蒙皮网格 */
export function runnerSkin(a: Actor): THREE.SkinnedMesh | null {
  return a.model.children.find(o => (o as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh | null;
}

/* ---------- 服装系统 ---------- */

const outfitMeshCache = new Map<string, THREE.SkinnedMesh>();
const outfitDataCache = new Map<string, Promise<DecodedMesh>>();

async function loadOutfitData(id: string): Promise<DecodedMesh> {
  const hit = outfitDataCache.get(id);
  if (hit) return hit;
  const req = (async () => {
    const def = assetsRef?.manifest.wardrobe[id];
    if (!def) throw new Error('找不到这套服装');
    const buffer = await fetchBinary(def.file);
    return decodeMesh(def, buffer);
  })();
  outfitDataCache.set(id, req);
  req.catch(() => outfitDataCache.delete(id));
  return req;
}

let assetsRef: CharacterAssets | null = null;
export function bindAssets(assets: CharacterAssets) { assetsRef = assets; }

/* 换装（含 classic 脱衣）。返回是否成功。 */
export async function applyOutfit(a: Actor, id: string): Promise<boolean> {
  const skin = runnerSkin(a);
  if (!skin) return false;
  const request = ++a.outfitRequest;

  let data: DecodedMesh | null = null;
  if (id !== 'classic') {
    if (!assetsRef?.manifest.wardrobe[id]) return false;
    a.outfitLoading = true;
    try {
      data = await loadOutfitData(id);
    } catch {
      if (request === a.outfitRequest) a.outfitLoading = false;
      return false;
    }
    if (request !== a.outfitRequest) return false;
  }
  a.outfitLoading = false;

  let mesh: THREE.SkinnedMesh | null = null;
  if (data) {
    mesh = outfitMeshCache.get(id) ?? null;
    if (!mesh) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
      if (data.uvs) g.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
      if (data.colors) g.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(data.skinIndices!, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(data.skinWeights!, 4));
      g.setIndex(new THREE.BufferAttribute(data.indices!, 1));
      for (const group of data.groups) g.addGroup(group[0], group[1], group[2]);
      mesh = new THREE.SkinnedMesh(g, data.materials.map(n => assetsRef!.materials[n]).filter(Boolean));
      mesh.name = 'outfit-' + id;
      mesh.frustumCulled = false;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.bind(skin.skeleton, skin.bindMatrix.clone());
      outfitMeshCache.set(id, mesh);
    }
  }

  /* 皮肤遮罩：穿上后丢弃被服装覆盖的片元 */
  skin.geometry.setAttribute('outfitCoverage', new THREE.Float32BufferAttribute(
    data?.bodyCoverage ?? new Float32Array(skin.geometry.attributes.position.count).fill(-1), 1,
  ));
  outfitSurface.value = id === 'classic' ? 0 : 1;

  if (a.outfit) a.model.remove(a.outfit);
  a.outfit = mesh;
  a.outfitId = id;
  if (mesh) a.model.add(mesh);
  return true;
}
