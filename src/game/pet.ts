/* 奶蛙桌宠素材：四形态帧动画清单与加载器。
 * 素材来自开源桌宠项目 43aquaris/naiwa（idle 58 / smile 9 / laugh 68 / cry 39 帧，
 * 12fps，与原桌宠逐参数对齐：smile 单次 750ms、laugh 单次 5667ms、cry 循环）。
 * 雪碧图生成脚本：scripts/build_pet_sprites.py
 */

export type PetMood = 'idle' | 'smile' | 'laugh' | 'cry';

export interface PetFormDef {
  /** 雪碧图中的全局起始帧索引（row-major，8 列） */
  start: number;
  /** 帧数 */
  frames: number;
  /** true = 循环播放；false = 单次播完（停在末帧，由上层决定回落） */
  loop: boolean;
}

export const PET = {
  atlas: '/assets/pet/naiwa-pet-atlas.webp',
  /** 单元格尺寸（雪碧图已半分辨率化） */
  frameW: 259,
  frameH: 359,
  /** 原桌宠 Animation::fps = 12 */
  fps: 12,
  cols: 8,
  forms: {
    idle: { start: 0, frames: 58, loop: true },
    smile: { start: 58, frames: 9, loop: false },
    laugh: { start: 67, frames: 68, loop: false },
    cry: { start: 135, frames: 39, loop: true },
  } as Record<PetMood, PetFormDef>,
  /** 形态时长（秒）：smile 9/12=0.75s、laugh 68/12≈5.667s（原版 stateEnd 精确对齐） */
  duration: { idle: Infinity, smile: 0.75, laugh: 5667 / 1000, cry: Infinity } as Record<PetMood, number>,
  /** 身体内容碰撞盒（占帧比例，来自原版 idle_01 bbox 94,30,329,657 / 518×718），
   *  拖拽甩飞的边缘反弹以此为准，避免窗口留白先行触壁 */
  body: { l: 94 / 518, t: 30 / 718, r: (518 - 423) / 518, b: (718 - 687) / 718 },
  sounds: { smile: '/assets/pet/smile.mp3', laugh: '/assets/pet/laugh.mp3' },
} as const;

/* ---------- 雪碧图加载（模块级单例缓存） ---------- */

let atlasImage: HTMLImageElement | null = null;
let loadPromise: Promise<HTMLImageElement | null> | null = null;

export function petAtlas() {
  return atlasImage;
}

export function loadPetAtlas(): Promise<HTMLImageElement | null> {
  if (atlasImage) return Promise.resolve(atlasImage);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { atlasImage = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = PET.atlas;
  });
  return loadPromise;
}

/* ---------- 音效（WebAudio 缓冲，走 GameAudio 的 sfxGain 通道） ---------- */

export function fetchPetBuffer(ctx: AudioContext, mood: 'smile' | 'laugh'): Promise<AudioBuffer | null> {
  const cache = bufferCache.get(mood);
  if (cache) return cache;
  const p = fetch(PET.sounds[mood])
    .then(r => (r.ok ? r.arrayBuffer() : null))
    .then(buf => (buf ? ctx.decodeAudioData(buf) : null))
    .catch(() => null);
  bufferCache.set(mood, p);
  return p;
}

const bufferCache = new Map<'smile' | 'laugh', Promise<AudioBuffer | null>>();
