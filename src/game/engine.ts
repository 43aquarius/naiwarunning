/* 确定性与渲染无关的跑酷模拟核心。距离单位为米。
   同一套规则驱动渲染层与判定层，保证手感一致。 */

export const CONFIG = Object.freeze({
  startSpeed: 28,
  maxSpeed: 48,
  acceleration: 20 / 38,
  zoneSeconds: 60,
  laneWidth: 2.5,
  invulnerability: 1.05,
  recovery: 7,
  jumpVelocity: 9.6,
  gravity: 25,
  slideSeconds: 0.7,
  maxShields: 3,
});

export type ObstacleAction = 'jump' | 'slide' | 'dodge' | 'climb';

export interface ObstacleSpec {
  name: string;
  action: ObstacleAction;
  height: number;
  depth: number;
  width: number;
  roof?: boolean;
  moving?: number;
}

export const TYPES: Record<string, ObstacleSpec> = {
  crate: { name: '捆绳木箱', action: 'jump', height: 0.78, depth: 1.05, width: 1.7 },
  hurdle: { name: '斑纹矮栏', action: 'jump', height: 0.68, depth: 0.45, width: 2 },
  barrel: { name: '横放木桶', action: 'jump', height: 0.83, depth: 0.9, width: 1.65 },
  bench: { name: '站台长凳', action: 'jump', height: 1, depth: 0.85, width: 1.9 },
  planter: { name: '花木箱子', action: 'jump', height: 0.86, depth: 1.2, width: 1.8 },
  gap: { name: '检修地沟', action: 'jump', height: 0.12, depth: 3.8, width: 2.2 },
  arch: { name: '警示牌坊', action: 'slide', height: 1.08, depth: 0.5, width: 2.15 },
  awning: { name: '条纹雨棚', action: 'slide', height: 1.1, depth: 2, width: 2.15 },
  pipe: { name: '架空管线', action: 'slide', height: 1.1, depth: 0.85, width: 2.1 },
  tram: { name: '彩绘客车', action: 'dodge', height: 3.2, depth: 16, width: 2.12, roof: true },
  stack: { name: '叠放货箱', action: 'dodge', height: 2.5, depth: 1.5, width: 1.95 },
  cart: { name: '水果摊车', action: 'dodge', height: 2.6, depth: 2.1, width: 2 },
  ramp: { name: '登车坡道', action: 'climb', height: 3.2, depth: 16, width: 2.16 },
  wagon: { name: '可跑货车顶', action: 'dodge', height: 3.2, depth: 24, width: 2.16, roof: true },
  express: { name: '迎面快车', action: 'dodge', height: 3.2, depth: 18, width: 2.12, roof: true, moving: 8 },
  signal: { name: '信号机柜', action: 'dodge', height: 2.8, depth: 1.8, width: 1.95 },
  cones: { name: '锥桶路障', action: 'jump', height: 0.62, depth: 1.8, width: 1.9 },
  gate: { name: '落杆闸机', action: 'slide', height: 1.08, depth: 1.2, width: 2.12 },
  spool: { name: '线缆滚轮', action: 'jump', height: 0.95, depth: 1.2, width: 1.85 },
  tunnel: { name: '低矮廊道', action: 'slide', height: 1.08, depth: 6, width: 2.16 },
};

export interface Zone {
  id: string;
  name: string;
  tag: string;
  subtitle: string;
  desc: string;
  sky: number;
  ground: number;
  road: number;
  colors: number[];
  roof: number;
  districts: string[];
}

/* 十个国家的配色与街区主题 */
export const ZONES: Zone[] = [
  { id: 'egypt', name: '埃及', tag: 'EGYPT · GOLDEN MIRAGE', subtitle: '金沙长廊', desc: '金字塔、绿洲棕榈与砂岩神庙', sky: 0x8e9fd7, ground: 0xeabd94, road: 0xc7ccb9, colors: [0xe9e0cc, 0xf5ebc0, 0xdcc6bf, 0xf5e0b8], roof: 0x5cb5b3, districts: ['砂岩集市', '绿洲长廊', '金字塔大道'] },
  { id: 'china', name: '中国古城', tag: 'CHINA · LANTERN STREETS', subtitle: '灯火老街', desc: '灰瓦重檐、红灯笼与古城门', sky: 0x8fcfc6, ground: 0xa7c29c, road: 0xb8bbc7, colors: [0xe9f0d8, 0xe3dcab, 0xcdb5eb, 0xedd6e0], roof: 0x4371e9, districts: ['灯笼老街', '竹影书院', '城楼大道'] },
  { id: 'india', name: '印度', tag: 'INDIA · PINK PALACES', subtitle: '粉城巡游', desc: '粉色拱廊、镂空阳台与穹顶宫殿', sky: 0x97d9db, ground: 0xd6c6d2, road: 0xcbcc36, colors: [0xf105a2, 0xf5e3c4, 0xe48e30, 0xf5ebf8], roof: 0xebcb78, districts: ['粉城花市', '宫苑大道', '穹顶长廊'] },
  { id: 'brazil', name: '巴西', tag: 'BRAZIL · COASTAL RHYTHM', subtitle: '海风狂想', desc: '海岸彩屋、热带山丘与嘉年华彩旗', sky: 0x77e1f8, ground: 0xafd5ec, road: 0xcbcd72, colors: [0xf3a2d2, 0x8671f4, 0xe9d5b5, 0x9dc796], roof: 0xc9b929, districts: ['彩屋街区', '海岸长廊', '山丘嘉年华'] },
  { id: 'japan', name: '日本', tag: 'JAPAN · SAKURA EXPRESS', subtitle: '樱色列车', desc: '木格町屋、樱花树、鸟居与远山', sky: 0xa2cfeb, ground: 0xafc7d5, road: 0xc0a4c0, colors: [0xf1e2c9, 0xe5ed54, 0xf2e3f5, 0xe11e30], roof: 0x5cc3ea, districts: ['樱花町屋', '庭园参道', '远山车站'] },
  { id: 'usa', name: '摩天大楼', tag: 'SKYLINE · CLOUD CITY', subtitle: '云端都会', desc: '玻璃高楼、阶梯尖塔与双子塔天际线', sky: 0x83c1f8, ground: 0xb4a8b6, road: 0xb8cbd0, colors: [0x71b2dd, 0x94d2f1, 0x8fecd9, 0xa39bb6], roof: 0xaec3f2, districts: ['玻璃金融街', '高塔广场', '云端天际线'] },
  { id: 'morocco', name: '摩洛哥', tag: 'MOROCCO · WORLD TOUR', subtitle: '琉彩市集', desc: '赭红城墙、马蹄拱门、彩砖与宣礼塔', sky: 0x89dcb7, ground: 0xe8d3ed, road: 0xd1ba4a, colors: [0xd47805, 0xe4bc11, 0xc75b75, 0xd7e4d9], roof: 0x56b5f8, districts: ['彩砖集市', '棕榈庭院', '城墙大道'] },
  { id: 'greece', name: '希腊', tag: 'GREECE · WORLD TOUR', subtitle: '爱琴蓝湾', desc: '蓝顶白屋、海岸阶梯与风车', sky: 0x79d748, ground: 0xe5f2ef, road: 0xccbb37, colors: [0xf9e848, 0xf0ccb0, 0xffe703, 0xe9c407], roof: 0x42b0e0, districts: ['蓝顶小镇', '爱琴海岸', '风车山丘'] },
  { id: 'mexico', name: '墨西哥', tag: 'MEXICO · WORLD TOUR', subtitle: '缤纷庆典', desc: '彩色拱廊、剪纸彩旗、仙人掌与阶梯金字塔', sky: 0x8ac4fa, ground: 0xcbc5f1, road: 0xc8a7a4, colors: [0xe4b657, 0xcbf3cc, 0xe5d8f6, 0x79c763], roof: 0xc3e8d8, districts: ['彩旗街市', '仙人掌花园', '古塔大道'] },
  { id: 'norway', name: '挪威', tag: 'NORWAY · WORLD TOUR', subtitle: '峡湾晨光', desc: '尖顶木屋、水岸栈桥、云杉与雪山', sky: 0x9d9858, ground: 0x9cb9b1, road: 0xa992a0, colors: [0xb6c1c9, 0xd42d05, 0x742bba, 0x96cbf8], roof: 0x6338da, districts: ['木屋码头', '云杉山谷', '雪山峡湾'] },
];

const pools: Record<string, string[]> = {
  jump: ['crate', 'hurdle', 'barrel', 'bench', 'planter', 'gap', 'cones', 'spool'],
  slide: ['arch', 'awning', 'pipe', 'gate', 'tunnel'],
  dodge: ['tram', 'stack', 'cart', 'signal', 'express'],
};

/* 关卡段模式：路线点为 [车道(-1/0/1), 动作] */
export const PATTERNS: { name: string; min: number; route: [number, string][]; elevated?: boolean }[] = [
  { name: '货车穿梭', min: 0, route: [[-1, 'free'], [0, 'jump'], [1, 'free'], [0, 'slide'], [-1, 'free']] },
  { name: '三线跨栏', min: 0, route: [[0, 'allJump'], [1, 'free'], [1, 'jump'], [0, 'free'], [0, 'allJump']] },
  { name: '信号灯回旋', min: 0, route: [[1, 'free'], [0, 'slide'], [-1, 'free'], [0, 'jump'], [1, 'free']] },
  { name: '低空快切', min: 5, route: [[0, 'slide'], [-1, 'free'], [-1, 'allSlide'], [0, 'jump'], [1, 'slide']] },
  { name: '花市连奏', min: 8, route: [[-1, 'jump'], [0, 'slide'], [1, 'jump'], [0, 'free'], [-1, 'slide'], [0, 'jump']] },
  { name: '双重横栏', min: 12, route: [[0, 'allJump'], [0, 'slide'], [1, 'allJump'], [0, 'allSlide'], [-1, 'free']] },
  { name: '迎车折返', min: 10, route: [[-1, 'free'], [0, 'free'], [1, 'slide'], [0, 'jump'], [-1, 'free'], [0, 'slide']] },
  { name: '货场闪转', min: 15, route: [[1, 'jump'], [0, 'allSlide'], [-1, 'jump'], [0, 'slide'], [1, 'free'], [0, 'jump']] },
  { name: '极限之字线', min: 24, route: [[-1, 'jump'], [0, 'slide'], [1, 'jump'], [0, 'slide'], [-1, 'jump'], [0, 'free'], [1, 'allSlide']] },
  { name: '跨沟穿棚', min: 5, route: [[0, 'jump'], [1, 'slide'], [0, 'jump'], [-1, 'slide'], [0, 'allJump']] },
  { name: '坡道登车', min: 0, elevated: true },
  { name: '车顶接力', min: 12, elevated: true },
  { name: '双层站台', min: 20, elevated: true },
  { name: '屋顶冲刺', min: 30, elevated: true },
];

export function speedAt(t: number) {
  return Math.min(CONFIG.maxSpeed, CONFIG.startSpeed + CONFIG.acceleration * t);
}
const capTime = (CONFIG.maxSpeed - CONFIG.startSpeed) / CONFIG.acceleration;
const capDistance = CONFIG.startSpeed * capTime + 0.5 * CONFIG.acceleration * capTime * capTime;
export function distanceAt(t: number) {
  return t <= capTime
    ? CONFIG.startSpeed * t + 0.5 * CONFIG.acceleration * t * t
    : capDistance + (t - capTime) * CONFIG.maxSpeed;
}
export function timeAt(d: number) {
  return d <= capDistance
    ? (-CONFIG.startSpeed + Math.sqrt(CONFIG.startSpeed ** 2 + 2 * CONFIG.acceleration * Math.max(0, d))) / CONFIG.acceleration
    : capTime + (d - capDistance) / CONFIG.maxSpeed;
}
/* 整数散列 → [0,1)，用于确定性装饰摆位 */
export function hash(n: number) {
  let a = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35);
  return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
}

export interface GameObject {
  id: number;
  type: string;
  lane: number;
  at: number;
  base: number;
  y: number;
  hit: boolean;
  row?: number;
  moving?: number;
  depth?: number;
}

export interface GameRow {
  id: number;
  t: number;
  at: number;
  lane: number;
  action: string;
  pattern: string;
  base: number;
}

export type GameEvent =
  | 'lane' | 'jump' | 'slide' | 'land' | 'coin' | 'hit' | 'caught'
  | 'shieldHit' | 'magnet' | 'shield' | 'shieldFull' | 'zone';

export class Game {
  seed = 41;
  rng = 41;
  time = 0;
  distance = 0;
  speed = CONFIG.startSpeed;
  lane = 0;
  x = 0;
  y = 0;
  vy = 0;
  slide = 0;
  hurt = 0;
  invincible = 0;
  coins = 0;
  objects: GameObject[] = [];
  rows: GameRow[] = [];
  nextTime = 3;
  serial = 0;
  history: string[] = [];
  combo = '世界始发站';
  status: 'menu' | 'running' | 'paused' | 'over' = 'menu';
  lastZone = 0;
  events: GameEvent[] = [];
  floor = 0;
  grounded = true;
  magnet = 0;
  shield = 0;
  jumps = 0;
  slides = 0;
  roofDistance = 0;
  segmentCount = 0;
  zoneOffset = 0;

  constructor() {
    this.reset(41);
    this.status = 'menu';
  }

  reset(seed: number) {
    Object.assign(this, {
      seed: seed >>> 0, rng: seed >>> 0, time: 0, distance: 0, speed: CONFIG.startSpeed,
      lane: 0, x: 0, y: 0, vy: 0, slide: 0, hurt: 0, invincible: 0, coins: 0,
      objects: [], rows: [], nextTime: 3, serial: 0, history: [], combo: '世界始发站',
      status: 'running' as const, lastZone: 0, events: [], floor: 0, grounded: true,
      magnet: 0, shield: 0, jumps: 0, slides: 0, roofDistance: 0, segmentCount: 0,
    });
    this.generate();
  }

  random() {
    this.rng = (Math.imul(this.rng, 1664525) + 1013904223) >>> 0;
    return this.rng / 4294967296;
  }

  pick<T>(a: T[]): T {
    return a[Math.floor(this.random() * a.length)];
  }

  add(type: string, lane: number, at: number, extra: Partial<GameObject> = {}) {
    const o: GameObject = { id: ++this.serial, type, lane, at, base: 0, y: 0, hit: false, ...extra };
    this.objects.push(o);
    return o;
  }

  row(t: number, lane: number, action: string, pattern: string, base = 0) {
    const r: GameRow = { id: ++this.serial, t, at: distanceAt(t), lane, action, pattern, base };
    this.rows.push(r);
    return r;
  }

  coinsAt(lane: number, at: number, action: string, base = 0, count = 5) {
    for (let k = 0; k < count; k++) {
      this.add('coin', lane, at + (k - (count - 1) / 2) * 2, {
        y: base + (action === 'jump' ? 1.85 : action === 'slide' ? 0.5 : 1),
      });
    }
  }

  action(a: 'left' | 'right' | 'jump' | 'slide') {
    if (this.status !== 'running') return;
    if (a === 'left' && this.lane > -1) { this.lane--; this.events.push('lane'); }
    if (a === 'right' && this.lane < 1) { this.lane++; this.events.push('lane'); }
    if (a === 'jump' && this.grounded) {
      this.slide = 0;
      this.vy = CONFIG.jumpVelocity;
      this.grounded = false;
      this.jumps++;
      this.events.push('jump');
    }
    if (a === 'slide') {
      if (this.slide <= 0) this.events.push('slide');
      this.slide = CONFIG.slideSeconds;
      this.slides++;
      if (!this.grounded) this.vy = Math.min(this.vy, -18);
    }
  }

  generate() {
    while (this.nextTime < this.time + 12) {
      const candidates = PATTERNS.filter(p => p.min <= this.nextTime && !this.history.slice(-4).includes(p.name));
      const p = this.segmentCount === 0 ? PATTERNS[0]
        : this.segmentCount === 1 ? PATTERNS[10]
          : this.pick(candidates);
      this.history.push(p.name);
      if (this.history.length > 16) this.history.shift();
      this.segmentCount++;
      const mirror = this.random() < 0.5 ? -1 : 1;

      if (p.elevated) { this.generateRoof(p.name, mirror); continue; }

      const gap = Math.max(0.84, 1.25 - (this.nextTime / 38) * 0.41);
      let ri = 0;
      for (const [l, action] of p.route) {
        const t = this.nextTime;
        const lane = l * mirror;
        const r = this.row(t, lane, action, p.name);
        const all = action.startsWith('all');
        const mode = all ? action.slice(3).toLowerCase() : action;
        for (let ln = -1; ln <= 1; ln++) {
          if (ln === lane && mode === 'free') continue;
          const category = all || ln === lane ? mode : 'dodge';
          let type = this.pick(pools[category]);
          if (type === 'tunnel' && gap < 1) type = this.pick(['arch', 'pipe', 'gate']);
          const spec = TYPES[type];
          this.add(type, ln, r.at, {
            row: r.id,
            moving: spec.moving || 0,
            ...(spec.moving ? { at: r.at + spec.moving * (t - this.time) } : {}),
          });
        }
        this.coinsAt(lane, r.at, mode);
        if (this.segmentCount % 3 === 0 && ri === 0) {
          this.add(this.segmentCount % 2 ? 'magnet' : 'shield', lane, r.at - 8, { y: 1.2 });
        }
        this.nextTime += gap;
        ri++;
      }
      this.nextTime += 0.95;
    }
  }

  generateRoof(name: string, mirror: number) {
    const t = this.nextTime;
    const lane = mirror;
    const start = distanceAt(t);
    const topEnd = distanceAt(t + 4.8);
    const roofStart = start + 16;
    const roofDepth = topEnd - roofStart;
    const relay = name === '车顶接力' || name === '双层站台';
    const triple = name === '双层站台';
    this.row(t + 0.08, lane, 'climb', name);
    this.add('ramp', lane, start + 8);
    this.add('wagon', lane, (roofStart + topEnd) / 2, { depth: roofDepth });
    for (let d = 3; d < 16; d += 3) this.add('coin', lane, start + d, { y: (3.2 * d) / 16 + 0.85 });
    if (relay) {
      this.add('wagon', 0, (roofStart + topEnd) / 2, { depth: roofDepth });
      if (triple) this.add('wagon', -lane, (roofStart + topEnd) / 2, { depth: roofDepth });
    }
    const poses: [number, string][] = name === '屋顶冲刺'
      ? [[1.2, 'slide'], [2.05, 'jump'], [2.9, 'slide'], [3.75, 'jump']]
      : [[1.35, 'jump'], [2.5, 'slide'], [3.65, 'jump']];
    let i = 0;
    for (const [offset, action] of poses) {
      const routeLane = relay && i === 1 ? 0 : triple && i === 2 ? -lane : lane;
      const r = this.row(t + offset, routeLane, action, name, 3.2);
      this.add(
        action === 'jump' ? this.pick(['hurdle', 'crate', 'cones']) : this.pick(['arch', 'gate']),
        routeLane, r.at, { base: 3.2, row: r.id },
      );
      this.coinsAt(routeLane, r.at, action, 3.2);
      i++;
    }
    const other = -lane;
    if (!triple) {
      for (let k = 0; k < 3; k++) {
        const at = distanceAt(t + 0.65 + k * 1.5);
        this.add('tram', other, at);
        if (!relay) {
          this.add(k % 2 ? 'arch' : 'hurdle', 0, at);
          this.coinsAt(0, at, k % 2 ? 'slide' : 'jump');
        }
      }
    }
    this.add(this.segmentCount % 2 ? 'magnet' : 'shield', relay ? 0 : lane, distanceAt(t + 3.0), { y: 4.3 });
    this.row(t + 5.6, 0, 'free', name);
    this.coinsAt(0, distanceAt(t + 5.6), 'free');
    this.nextTime = t + 7.1;
  }

  /* 支撑面高度：坡道斜面与车顶平台 */
  supportAt(distance: number, x: number, y: number) {
    let h = 0;
    for (const o of this.objects) {
      const s = TYPES[o.type];
      if (!s || Math.abs(x - o.lane * 2.5) > s.width * 0.5 + 0.04) continue;
      const d = o.depth || s.depth;
      const q = distance - (o.at - d / 2);
      if (q < 0 || q > d) continue;
      if (s.action === 'climb') h = Math.max(h, (s.height * q) / d);
      else if (s.roof && y >= s.height - 0.3) h = Math.max(h, s.height);
    }
    return h;
  }

  hit() {
    if (this.invincible > 0) return;
    if (this.shield > 0) {
      this.shield--;
      this.invincible = 1.2;
      this.events.push('shieldHit');
      return;
    }
    if (this.hurt > 0) {
      this.status = 'over';
      this.events.push('caught');
    } else {
      this.hurt = CONFIG.recovery;
      this.invincible = CONFIG.invulnerability;
      this.events.push('hit');
    }
  }

  step(dt: number) {
    if (this.status !== 'running') return;
    const previous = this.distance;
    this.time += dt;
    this.distance = distanceAt(this.time);
    this.speed = speedAt(this.time);
    this.x += (this.lane * 2.5 - this.x) * (1 - Math.exp(-22 * dt));
    for (const o of this.objects) if (o.moving) o.at -= o.moving * dt;

    const floor = this.supportAt(this.distance, this.x, this.y);
    if (this.grounded && floor >= this.floor - 0.18 && floor <= this.floor + 0.25) {
      this.y = floor;
      this.vy = 0;
    } else {
      this.grounded = false;
      this.y += this.vy * dt - 0.5 * CONFIG.gravity * dt * dt;
      this.vy -= CONFIG.gravity * dt;
      if (this.y <= floor) {
        if (this.vy < -2) this.events.push('land');
        this.y = floor;
        this.vy = 0;
        this.grounded = true;
      }
    }
    this.floor = floor;
    if (this.y > 3 && this.grounded) this.roofDistance += this.distance - previous;
    for (const key of ['slide', 'hurt', 'invincible', 'magnet'] as const) {
      this[key] = Math.max(0, this[key] - dt);
    }
    this.generate();

    for (const o of this.objects) {
      if (o.hit) continue;
      const z = this.distance - o.at;
      const prev = previous - o.at;
      const dx = Math.abs(this.x - o.lane * 2.5);
      if (o.type === 'coin' || o.type === 'magnet' || o.type === 'shield') {
        const pull = o.type === 'coin' && this.magnet > 0;
        if (dx < (pull ? 7 : 0.78) && z >= -(pull ? 5 : 0.65) && prev <= (pull ? 5 : 0.65) && Math.abs(this.y + 0.85 - o.y) < (pull ? 5 : 1.1)) {
          o.hit = true;
          if (o.type === 'coin') { this.coins++; this.events.push('coin'); }
          else if (o.type === 'magnet') { this.magnet = 12; this.events.push('magnet'); }
          else if (this.shield < CONFIG.maxShields) { this.shield++; this.events.push('shield'); }
          else this.events.push('shieldFull');
        }
        continue;
      }
      const s = TYPES[o.type];
      if (!s) continue;
      const extent = (o.depth || s.depth) / 2 + 0.22;
      if (s.action === 'climb') continue;
      if (dx < s.width / 2 + 0.23 && z >= -extent && prev <= extent) {
        const bottom = o.base || 0;
        const feet = this.y;
        const head = this.y + (this.slide > 0 ? 0.95 : 2.2);
        const safe = head < bottom + 0.01 || (
          s.action === 'jump' ? feet > bottom + s.height + 0.08
            : s.action === 'slide' ? head < bottom + s.height || feet > bottom + s.height + 0.85
              : s.roof && feet >= bottom + s.height - 0.12
        );
        if (!safe && this.invincible <= 0) {
          o.hit = true;
          this.hit();
          if (this.status === 'over') break;
        }
      }
    }

    this.objects = this.objects.filter(o => this.distance - o.at < (TYPES[o.type] ? (o.depth || TYPES[o.type].depth) / 2 + 12 : 12));
    this.rows = this.rows.filter(r => r.at > this.distance - 12);
    const upcoming = this.rows.find(r => r.at >= this.distance);
    if (upcoming) this.combo = upcoming.pattern;
    const zone = Math.floor(this.time / 60);
    if (zone !== this.lastZone) { this.lastZone = zone; this.events.push('zone'); }
  }

  snapshot() {
    return {
      status: this.status, time: this.time, distance: this.distance, speed: this.speed,
      lane: this.lane, x: this.x, y: this.y, slide: this.slide, hurt: this.hurt,
      coins: this.coins, zone: Math.floor(this.time / 60), objects: this.objects.length,
      combo: this.combo, grounded: this.grounded, floor: this.floor, shield: this.shield,
      magnet: this.magnet, roofDistance: this.roofDistance,
    };
  }
}
