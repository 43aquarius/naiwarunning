/* 玩家档案：金币、服装收藏、战绩与任务进度，持久化到 localStorage。 */
import { OUTFITS, type OutfitDef } from './outfit-catalog';
import type { Game } from './engine';

export interface Profile {
  coins: number;
  best: number;
  totalCoins: number;
  runs: number;
  jumps: number;
  slides: number;
  roof: number;
  ownedOutfits: string[];
  equippedOutfit: string;
}

const KEY = 'naiwa-replica-profile-v1';

export const DEFAULT_PROFILE: Profile = {
  coins: 0, best: 0, totalCoins: 0, runs: 0, jumps: 0, slides: 0, roof: 0,
  ownedOutfits: ['classic'], equippedOutfit: 'classic',
};

export class WardrobeStore {
  state: Profile;
  private storage: Storage | null;

  constructor() {
    try {
      this.storage = localStorage;
      const raw = localStorage.getItem(KEY);
      this.state = raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
    } catch {
      this.storage = null;
      this.state = { ...DEFAULT_PROFILE };
    }
    if (!this.state.ownedOutfits.includes('classic')) this.state.ownedOutfits.push('classic');
  }

  private save() {
    try { this.storage?.setItem(KEY, JSON.stringify(this.state)); } catch { /* 存储不可用 */ }
  }

  owns(id: string) { return this.state.ownedOutfits.includes(id); }

  findOutfit(id: string): OutfitDef {
    return OUTFITS.find(o => o.id === id) ?? OUTFITS[0];
  }

  purchase(id: string): { ok: boolean; charged?: boolean; missing?: number } {
    const outfit = this.findOutfit(id);
    if (this.owns(id)) {
      this.state.equippedOutfit = id;
      this.save();
      return { ok: true, charged: false };
    }
    if (this.state.coins < outfit.price) return { ok: false, missing: outfit.price - this.state.coins };
    this.state.coins -= outfit.price;
    this.state.ownedOutfits.push(id);
    this.state.equippedOutfit = id;
    this.save();
    return { ok: true, charged: true };
  }

  equip(id: string) {
    if (this.owns(id)) {
      this.state.equippedOutfit = id;
      this.save();
    }
  }

  /* 结算一次奔跑：入账金币与统计数据 */
  bankRun(game: Game): boolean {
    this.state.coins += game.coins;
    this.state.totalCoins += game.coins;
    this.state.runs += 1;
    this.state.jumps += game.jumps;
    this.state.slides += game.slides;
    this.state.roof += Math.floor(game.roofDistance);
    this.state.best = Math.max(this.state.best, Math.floor(game.distance));
    this.save();
    return true;
  }
}

/* 任务列表：[标题, 描述, 统计键, 目标值] */
export const MISSIONS: [string, string, keyof Profile, number][] = [
  ['初露锋芒', '一次跑过 1,000 米', 'best', 1000],
  ['金币收藏家', '累计收集 300 枚金币', 'totalCoins', 300],
  ['跳跃达人', '累计完成 50 次跳跃', 'jumps', 50],
  ['贴地飞行', '累计完成 30 次滑铲', 'slides', 30],
  ['车顶快客', '累计在车顶跑过 1,000 米', 'roof', 1000],
  ['极速传说', '单次跑过 5,000 米', 'best', 5000],
];

/* 本地排行榜 */
const BOARD_KEY = 'naiwa-replica-leaderboard-v1';
export interface BoardEntry { name: string; distance: number; date: string; }
export function loadBoard(): BoardEntry[] {
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    return raw ? (JSON.parse(raw) as BoardEntry[]) : [];
  } catch { return []; }
}
export function pushBoard(entry: BoardEntry) {
  const board = loadBoard();
  board.push(entry);
  board.sort((a, b) => b.distance - a.distance);
  try { localStorage.setItem(BOARD_KEY, JSON.stringify(board.slice(0, 20))); } catch { /* 忽略 */ }
}
