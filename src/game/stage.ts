/* 游戏主控：场景装配、渲染循环、视图切换、输入与对象同步。 */
import * as THREE from 'three';
import { Game, CONFIG, TYPES, ZONES, distanceAt } from './engine';
import { environment, sky, surface } from './art';
import { World } from './world';
import { buildTemplates, bakeGroup } from './obstacles';
import { buildRunner, buildBull, buildDog, applyOutfit, loadCharacterAssets, bindAssets, type Actor, type CharacterAssets } from './character';
import { OUTFITS, type OutfitDef } from './outfit-catalog';
import { animateRunner, animateQuadruped, type MotionMode } from './animator';
import { CameraRig } from './camera';
import { GameAudio } from './audio';
import { WardrobeStore, type Profile } from './wardrobe';
import { PET, loadPetAtlas, type PetMood } from './pet';

export type ViewName = 'menu' | 'starting' | 'running' | 'paused' | 'over' | 'shop' | 'workshop' | 'inspect' | 'catalog';

export interface HudState {
  view: ViewName;
  workshopPage: string;
  distance: string;
  coins: number;
  speed: string;
  speedLabel: string;
  speedFill: number;
  zoneName: string;
  zoneTag: string;
  zoneTime: string;
  zoneFill: number;
  combo: string;
  chase: string;
  chaseWarning: boolean;
  shield: number;
  magnet: number;
  toast: string;
  toastVisible: boolean;
  loading: number;
  loadStatus: string;
  assetsReady: boolean;
  profile: Profile;
  selectedMapIndex: number;
  shopSelected: string;
  shopOwnedCount: string;
  endDistance: string;
  endDetail: string;
  record: number;
  musicOn: boolean;
  quality: string;
  paused: boolean;
  leaderboard: { name: string; distance: number; date: string }[];
  /* 奶蛙桌宠情绪（游戏事件联动） */
  petMood: PetMood;
  petNonce: number;
}

const $ = (id: string) => document.getElementById(id);

export class GameApp {
  game = new Game();
  scene = new THREE.Scene();
  renderer: THREE.WebGLRenderer;
  camera = new THREE.PerspectiveCamera(48, 1, 0.1, 260);
  world: World;
  audio = new GameAudio();
  rig = new CameraRig();
  store = new WardrobeStore();

  view: ViewName = 'menu';
  workshopPage = 'maps';
  private clock = 0;
  private accumulator = 0;
  private last = 0;
  private hudTime = 0;
  private banked = false;
  private toastUntil = 0;
  private frameId = 0;
  private selectedMapIndex = 0;
  private shopSelected = 'classic';
  private introElapsed = 0;
  private footstepClock = 0;
  private cameraElevation = 0;
  private previewTurn = 0;
  private motionPreview: MotionMode = 'idle';
  private loadProgress = 0;
  private loadStatus = '';
  private endInfo = { distance: '', detail: '' };
  private qualityMode = 'auto';
  private qualityFrames = 0;
  private qualityElapsed = 0;
  private qualityHold = 0;
  /* 桌宠情绪 */
  private petMood: PetMood = 'idle';
  private petNonce = 0;
  private petUntil = 0;
  private lastMilestone = 0;
  private coinTimes: number[] = [];
  private petSmileReady = 0;
  warmCount = 0;
  warmError = "";
  private destroyed = false;

  private actors: Record<'runner' | 'bull' | 'dog', Actor> | null = null;
  assetsReady = false;
  private charAssets: CharacterAssets | null = null;
  private homeSet = new THREE.Group();
  private sun: THREE.DirectionalLight;

  private templates: ReturnType<typeof buildTemplates>;
  private visibleObjects = new Map<number, THREE.Object3D>();
  private coinInstances: THREE.InstancedMesh;
  private coinTransform = new THREE.Object3D();
  private coinBase: THREE.Group;

  private trailMesh: THREE.InstancedMesh;
  private trailPose = new THREE.Object3D();
  private trailParticles: { x: number; y: number; z: number; vx: number; vy: number; life: number; span: number; size: number; coin: boolean }[] = [];
  private trailClock = 0;

  onState: (s: HudState) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene.environment = environment(this.renderer);

    try {
      const saved = localStorage.getItem('naiwa-selected-map');
      const found = ZONES.findIndex(z => z.id === saved);
      if (found >= 0) this.selectedMapIndex = found;
    } catch { /* 忽略 */ }
    this.game.zoneOffset = this.selectedMapIndex;

    this.scene.background = new THREE.Color(ZONES[0].sky);
    this.scene.fog = new THREE.Fog(ZONES[0].sky, 85, 205);
    this.scene.add(new THREE.HemisphereLight(0xfff4db, 0x8899b3, 1.25));
    this.sun = new THREE.DirectionalLight(0xffe6c2, 2.6);
    this.sun.position.set(-14, 24, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -19, right: 19, top: 26, bottom: -24, near: 1, far: 70 });
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.radius = 3;
    this.sun.target.position.set(0, 0, -13);
    this.scene.add(this.sun, this.sun.target);
    const fill = new THREE.DirectionalLight(0xbadcf5, 0.9);
    fill.position.set(3, 6, 8);
    fill.target.position.set(0, 1, -4);
    this.scene.add(fill, fill.target);
    sky(this.scene);

    this.world = new World(this.scene);
    this.templates = buildTemplates();

    /* 角色装配：异步加载原版蒙皮网格资产 */
    this.initCharacters();

    /* 奶蛙桌宠雪碧图预加载（不阻塞主流程） */
    void loadPetAtlas();

    /* 主菜单场景 */
    this.scene.add(this.homeSet);
    this.rebuildHomeSet();

    /* 金币实例化网格 */
    this.coinBase = bakeGroup(this.templates.coin.clone());
    this.coinInstances = new THREE.InstancedMesh(
      this.coinBase.children[0].geometry,
      this.coinBase.children[0].material as THREE.Material,
      600,
    );
    this.coinInstances.count = 0;
    this.coinInstances.frustumCulled = false;
    this.coinInstances.castShadow = true;
    this.scene.add(this.coinInstances);

    /* 尘土拖尾 */
    this.trailMesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, transparent: true, opacity: 0.65 }),
      80,
    );
    this.trailMesh.frustumCulled = false;
    this.trailMesh.count = 0;
    this.scene.add(this.trailMesh);

    this.bindInput(canvas);
    this.frameId = requestAnimationFrame(this.frame);
  }

  /* 异步加载原版角色资产并装配三个角色 */
  private async initCharacters() {
    try {
      const assets = await loadCharacterAssets((p, status) => {
        if (!this.assetsReady) {
          this.loadProgress = Math.max(this.loadProgress, p * 0.9);
          if (status) this.loadStatus = status;
          this.publish(false);
        }
      });
      if (this.destroyed) return;
      this.charAssets = assets;
      bindAssets(assets);
      const actors = {
        runner: buildRunner(assets),
        bull: buildBull(assets),
        dog: buildDog(assets),
      };
      this.actors = actors;
      for (const kind of ['runner', 'bull', 'dog'] as const) {
        this.scene.add(actors[kind].root);
      }
      await applyOutfit(actors.runner, this.store.state.equippedOutfit);
      this.assetsReady = true;
      this.loadProgress = 1;
      this.publish(true);
    } catch (err) {
      console.error('[characters] 资产加载失败', err);
      this.loadStatus = '角色下载失败，请刷新重试';
      this.publish(true);
    }
  }

  /* 给奶蛙换装（资产就绪后生效） */
  private equip(id: string) {
    if (!this.actors) return;
    void applyOutfit(this.actors.runner, id).then(() => this.publish(true));
  }

  /* ---------- 输入 ---------- */
  private bindInput(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    let touch: [number, number] | null = null;
    canvas.addEventListener('pointerdown', e => {
      touch = [e.clientX, e.clientY];
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', e => {
      if (!touch) return;
      const dx = e.clientX - touch[0], dy = e.clientY - touch[1];
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) {
        this.input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'slide' : 'jump');
      }
      touch = null;
    });
    canvas.addEventListener('pointercancel', () => { touch = null; });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
    const map: Record<string, 'left' | 'right' | 'jump' | 'slide'> = {
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
      ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump',
      ArrowDown: 'slide', s: 'slide', S: 'slide',
    };
    const a = map[e.key];
    if (a) {
      e.preventDefault();
      if (!e.repeat) this.input(a);
    }
    if (!e.repeat && (e.key.toLowerCase() === 'p' || e.key === 'Escape')) {
      if (['shop', 'workshop', 'inspect', 'catalog'].includes(this.view)) this.home();
      else this.togglePause();
    }
    if (e.key === 'Enter' && (this.view === 'menu' || this.view === 'over')) this.start();
  };

  input(action: 'left' | 'right' | 'jump' | 'slide') {
    this.audio.unlock();
    if (this.view !== 'running') return;
    this.game.action(action);
  }

  /* ---------- 视图切换 ---------- */
  private setView(v: ViewName) {
    this.view = v;
    this.publish(true);
  }

  home() {
    this.game.reset(41);
    this.game.status = 'menu';
    this.game.objects = [];
    this.game.zoneOffset = this.selectedMapIndex;
    this.world.clear();
    this.clearObjects();
    this.equip(this.store.state.equippedOutfit);
    this.setView('menu');
    this.rebuildHomeSet();
    this.audio.enterMenu();
  }

  start() {
    if (this.view === 'starting') return;
    this.audio.unlock();
    this.equip(this.store.state.equippedOutfit);
    this.rig.reset();
    this.footstepClock = 0;
    this.banked = false;
    this.petMood = 'idle';
    this.petUntil = 0;
    this.lastMilestone = 0;
    this.coinTimes = [];
    this.petSmileReady = 0;
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    this.game.reset(seed);
    this.game.zoneOffset = this.selectedMapIndex;
    this.world.clear();
    this.clearObjects();
    this.setView('starting');
    this.loadProgress = 0;
    this.loadStatus = '正在铺设出发路线…';
    this.audio.beginRun();
    this.toast('追兵来了！沿金币路线换道、跳跃和滑铲');
    /* 分帧预构建街区（按真实时间追赶，慢设备或后台标签也能完成） */
    let index = -1;
    this.warmCount = 0;
    const realStart = performance.now();
    const step = () => {
      if (this.destroyed || this.view !== 'starting') return;
      const tickStart = performance.now();
      /* 若帧率被限流，则在一帧内多建几段补上进度 */
      const expected = Math.min(8, Math.floor((performance.now() - realStart) / 120));
      do {
        try {
          this.warmCount++;
          this.world.update(index * 24 + 1, this.game.seed, this.selectedMapIndex);
        } catch (err) {
          this.warmError = String(err);
          console.error('[warm] chunk build failed', err);
        }
        index++;
        this.loadProgress = Math.min(1, (index + 1) / 9);
      } while (index <= 7 && index < expected && performance.now() - tickStart < 400);
      if (index <= 7) requestAnimationFrame(step);
      else {
        this.loadStatus = '';
        this.beginRunning();
      }
    };
    requestAnimationFrame(step);
  }

  private beginRunning() {
    this.introElapsed = 0;
    this.game.status = 'running';
    this.setView('running');
    this.accumulator = 0;
  }

  togglePause() {
    if (this.view === 'running') {
      this.game.status = 'paused';
      this.setView('paused');
      this.audio.pause();
      this.endInfo = {
        distance: `${Math.floor(this.game.distance)} 米`,
        detail: '按 P / Esc 或点击继续，回到刚才的位置。',
      };
    } else if (this.view === 'paused') {
      this.game.status = 'running';
      this.setView('running');
      this.audio.resume();
      this.accumulator = 0;
    }
  }

  private end() {
    this.audio.play('caught');
    this.audio.stopAll();
    const prevBest = this.store.state.best;
    const dist = Math.floor(this.game.distance);
    if (!this.banked && this.game.time >= 0.1) {
      this.banked = this.store.bankRun(this.game);
    }
    this.endInfo = {
      distance: `${dist} 米`,
      detail: `收集 ${this.game.coins} 金币 · 用时 ${Math.floor(this.game.time)} 秒\n最远纪录 ${this.store.state.best} 米`,
    };
    /* 破纪录开怀大笑，否则被抓了委屈巴巴（持续到下一局） */
    if (dist > prevBest && dist >= 100) this.pet('laugh', PET.duration.laugh, 'laugh');
    else this.pet('cry', Infinity);
    this.setView('over');
  }

  openShop() {
    this.shopSelected = this.store.state.equippedOutfit;
    this.previewTurn = 0;
    this.equip(this.shopSelected);
    this.setView('shop');
    this.audio.play('click');
  }

  openWorkshop(page: string) {
    this.workshopPage = page;
    this.setView('workshop');
    this.audio.play('click');
  }

  openCatalog() {
    this.setView('catalog');
    this.audio.play('click');
  }

  openInspect() {
    this.setView('inspect');
    this.audio.play('click');
  }

  setMotionPreview(m: MotionMode) { this.motionPreview = m; }

  setPreviewTurn(v: number) { this.previewTurn = v; }

  selectMap(index: number) {
    if (index === this.selectedMapIndex) return;
    this.selectedMapIndex = index;
    this.game.zoneOffset = index;
    try { localStorage.setItem('naiwa-selected-map', ZONES[index].id); } catch { /* 忽略 */ }
    this.rebuildHomeSet();
    this.publish(true);
  }

  shopTry(id: string) {
    this.shopSelected = id;
    this.equip(id);
    this.audio.play('click');
    this.publish(true);
  }

  shopBuy() {
    const result = this.store.purchase(this.shopSelected);
    if (!result.ok) {
      this.toast(`还差 ${result.missing ?? 0} 金币，去跑道收集吧！`);
    } else {
      this.equip(this.store.state.equippedOutfit);
      this.audio.play('buy');
      this.toast(result.charged ? '购买成功，新衣服已经穿上！' : '换装完成！');
      /* 买到新衣服开心大笑（音效延迟 300ms 对齐桌宠） */
      this.pet('laugh', PET.duration.laugh, 'laugh');
    }
    this.publish(true);
  }

  setMusic(on: boolean) {
    this.audio.setEnabled(on);
    if (on) {
      if (this.view === 'running') this.audio.beginRun();
      else this.audio.enterMenu();
    }
    this.publish(true);
  }

  setVolume(v: number) { this.audio.setVolume(v); }

  setQuality(mode: string) {
    this.qualityMode = mode;
    this.renderer.setPixelRatio(Math.min(mode === 'ultra' ? 2 : mode === 'smooth' ? 1 : 1.5, window.devicePixelRatio || 1));
    const size = mode === 'ultra' ? 4096 : mode === 'smooth' ? 1024 : 2048;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.publish(true);
  }

  toast(text: string) {
    this.toastUntil = this.clock + 2.8;
    this.pendingToast = text;
  }
  private pendingToast: string | null = null;

  /* ---------- 奶蛙桌宠情绪 ---------- */
  /** 触发桌宠情绪反应；seconds 传 Infinity 表示持续到下一局 */
  private pet(mood: PetMood, seconds: number, voice?: 'smile' | 'laugh') {
    this.petMood = mood;
    this.petNonce++;
    this.petUntil = seconds === Infinity ? Infinity : this.clock + seconds;
    if (voice) this.audio.petVoice(voice, voice === 'laugh' ? 300 : 0);
    this.publish(true);
  }
  private petReact(e: string) {
    switch (e) {
      case 'hit':
        /* 受击哭泣：39 帧循环动画展示约 3.25 秒后回落 */
        this.pet('cry', 3.25);
        break;
      case 'shieldHit':
      case 'magnet':
      case 'shield':
      case 'zone':
        this.pet('smile', PET.duration.smile);
        break;
      case 'coin': {
        /* 2.5 秒内吃够 8 枚金币 → 开心微笑（冷却 6 秒防刷屏） */
        const t = this.game.time;
        this.coinTimes.push(t);
        this.coinTimes = this.coinTimes.filter(x => t - x < 2.5);
        if (this.coinTimes.length >= 8 && this.clock > this.petSmileReady) {
          this.petSmileReady = this.clock + 6;
          this.pet('smile', PET.duration.smile);
        }
        break;
      }
    }
  }

  /* ---------- 对象同步 ---------- */
  private clearObjects() {
    for (const o of this.visibleObjects.values()) this.scene.remove(o);
    this.visibleObjects.clear();
    this.coinInstances.count = 0;
  }

  private createObject(type: string, depth?: number): THREE.Object3D {
    if (type === 'wagon' && depth) {
      const group = new THREE.Group();
      const count = Math.ceil(depth / 24);
      const length = depth / count;
      for (let i = 0; i < count; i++) {
        const car = this.templates.obstacles.wagon.clone();
        car.scale.z = (length - 0.25) / 24;
        car.position.z = -depth / 2 + length * (i + 0.5);
        group.add(car);
      }
      return group;
    }
    return this.templates.obstacles[type].clone();
  }

  private syncObjects(t: number) {
    const alive = new Set<number>();
    let coins = 0;
    for (const q of this.game.objects) {
      const z = this.game.distance - q.at;
      const extent = (q.depth || TYPES[q.type]?.depth || 0) / 2;
      if (q.hit || z > extent + 12 || z < -180 - extent) continue;
      if (q.type === 'coin') {
        if (coins >= 600) continue;
        this.coinTransform.position.set(q.lane * 2.5, q.y, z);
        this.coinTransform.rotation.y = t * 2.3;
        this.coinTransform.updateMatrix();
        this.coinInstances.setMatrixAt(coins++, this.coinTransform.matrix);
        continue;
      }
      if (q.type === 'magnet' || q.type === 'shield') {
        alive.add(q.id);
        let o = this.visibleObjects.get(q.id);
        if (!o) {
          o = this.templates.powerups[q.type].clone();
          this.scene.add(o);
          this.visibleObjects.set(q.id, o);
        }
        o.position.set(q.lane * 2.5, q.y + Math.sin(t * 4) * 0.12, z);
        o.rotation.y = t * 2.3;
        continue;
      }
      alive.add(q.id);
      let o = this.visibleObjects.get(q.id);
      if (!o) {
        o = this.createObject(q.type, q.depth);
        o.castShadow = true;
        this.scene.add(o);
        this.visibleObjects.set(q.id, o);
      }
      o.position.set(q.lane * 2.5, q.base || 0, z);
    }
    this.coinInstances.count = coins;
    this.coinInstances.instanceMatrix.needsUpdate = true;
    for (const [id, o] of this.visibleObjects) {
      if (!alive.has(id)) {
        this.scene.remove(o);
        this.visibleObjects.delete(id);
      }
    }
  }

  private rebuildHomeSet() {
    this.homeSet.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    this.homeSet.clear();
    const built = this.world.buildHomeSet(this.selectedMapIndex);
    for (const c of built.children) this.homeSet.add(c);
  }

  /* ---------- 粒子 ---------- */
  private puff(count: number, coin = false) {
    for (let i = 0; i < count; i++) {
      if (this.trailParticles.length >= 80) this.trailParticles.shift();
      this.trailParticles.push({
        x: this.game.x + (Math.random() - 0.5) * 0.48,
        y: coin ? 1.1 : 0.12,
        z: 0.45,
        vx: (Math.random() - 0.5) * (coin ? 3 : 1),
        vy: coin ? 1 + Math.random() * 1.5 : 0.25,
        life: 0, span: coin ? 0.5 : 0.4,
        size: coin ? 0.075 : 0.07 + Math.random() * 0.045, coin,
      });
    }
  }

  private updateTrail(dt: number) {
    const playing = this.view === 'running';
    this.trailMesh.visible = playing;
    if (!playing) { this.trailParticles.length = 0; this.trailMesh.count = 0; return; }
    this.trailClock += dt;
    if (this.game.grounded && this.trailClock > 0.17) {
      this.trailClock = 0;
      this.puff(2);
    }
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life += dt;
      if (p.life >= p.span) { this.trailParticles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += this.game.speed * dt * 0.75;
    }
    this.trailMesh.count = this.trailParticles.length;
    const col = new THREE.Color();
    for (let i = 0; i < this.trailParticles.length; i++) {
      const p = this.trailParticles[i];
      const fade = 1 - p.life / p.span;
      this.trailPose.position.set(p.x, p.y + this.game.floor, p.z);
      this.trailPose.scale.setScalar(p.size * (p.coin ? fade : 0.55 + p.life) * 2);
      this.trailPose.rotation.set(p.life * 2, p.life * 3, 0);
      this.trailPose.updateMatrix();
      this.trailMesh.setMatrixAt(i, this.trailPose.matrix);
      this.trailMesh.setColorAt(i, col.set(p.coin ? 0xffd879 : 0xe7d4b8));
    }
    this.trailMesh.instanceMatrix.needsUpdate = true;
    if (this.trailMesh.instanceColor) this.trailMesh.instanceColor.needsUpdate = true;
  }

  /* ---------- 主循环 ---------- */
  private frame = (ms: number) => {
    if (this.destroyed) return;
    const dt = Math.min((ms - this.last) / 1000 || 0.016, 0.2);
    this.last = ms;
    this.clock += dt;
    this.accumulator += dt;
    if (this.view === 'intro') this.introElapsed += dt;

    if (this.view === 'running') {
      while (this.accumulator >= 1 / 120) {
        this.game.step(1 / 120);
        this.accumulator -= 1 / 120;
        if (this.game.status === 'over') { this.end(); break; }
      }
    } else this.accumulator = 0;

    /* 事件处理 */
    for (const e of this.game.events) {
      this.audio.event(e);
      this.rig.event(e);
      this.petReact(e);
      if (e === 'coin') this.puff(5, true);
      if (e === 'jump') this.puff(5);
      if (e === 'hit') this.toast('撞到了！7 秒内再撞一次会被抓住');
      if (e === 'zone') this.toast('进入 ' + ZONES[this.game.zoneOffset].districts[this.game.lastZone % 3] + ' · ' + ZONES[this.game.zoneOffset].name);
      if (e === 'magnet') this.toast('磁铁到手！12 秒吸引附近金币');
      if (e === 'shield') this.toast(`护盾 +1！当前 ${this.game.shield} / ${CONFIG.maxShields} 层`);
      if (e === 'shieldFull') this.toast(`护盾已满：最多 ${CONFIG.maxShields} 层`);
      if (e === 'shieldHit') this.toast(`护盾挡住了碰撞，剩余 ${this.game.shield} 层`);
    }
    this.game.events = [];

    /* 桌宠：里程碑反应（每 500 米微笑，整 1000 米大笑）与情绪回落 */
    if (this.view === 'running') {
      const milestone = Math.floor(this.game.distance / 500);
      if (milestone > this.lastMilestone) {
        this.lastMilestone = milestone;
        if (milestone % 2 === 0) this.pet('laugh', PET.duration.laugh, 'laugh');
        else this.pet('smile', PET.duration.smile);
      }
    }
    if (this.petMood !== 'idle' && this.clock > this.petUntil) {
      this.petMood = 'idle';
      this.publish(false);
    }

    /* 相机与角色 */
    const preview = ['menu', 'workshop', 'inspect', 'shop', 'catalog'].includes(this.view);
    const t = preview ? this.clock : this.game.time;
    this.homeSet.visible = preview && !['inspect', 'shop', 'catalog'].includes(this.view);

    this.animateActors(preview, t, dt);

    if (preview) {
      this.cameraElevation = 0;
      if (this.view === 'shop') {
        this.camera.fov = 40;
        this.camera.position.set(0, 3.1, 12.5);
        this.camera.lookAt(0, -2.1, 0);
      } else if (this.view === 'inspect') {
        this.camera.fov = 42;
        this.camera.position.set(3.5, 2.9, 7);
        this.camera.lookAt(0, 1.12, 0);
      } else {
        this.camera.fov = 48;
        this.camera.position.set(1.2, 3.6, 10.4);
        this.camera.lookAt(0, 1.1, -1);
      }
      this.camera.updateProjectionMatrix();
    } else {
      this.rig.update(this.camera, this.game, dt, {
        intro: this.view === 'starting' ? Math.min(1, this.introElapsed / 1.45) : 1,
        over: this.view === 'over',
        freeze: this.view === 'paused' || this.view === 'over',
      });
    }

    /* 环境 */
    const zone = ZONES[this.game.zoneOffset];
    const target = new THREE.Color(zone.sky);
    this.scene.background = (this.scene.background as THREE.Color).lerp(target, 1 - Math.exp(-dt * 1.2));
    this.scene.fog!.color.copy(this.scene.background as THREE.Color);

    if (!preview && this.view !== 'starting') {
      this.world.update(this.game.distance, this.game.seed, this.game.zoneOffset);
    }
    this.world.setChunksVisible(!preview);
    this.syncObjects(t);
    this.updateTrail(dt);

    /* 脚步声 */
    if (this.view === 'running' && this.game.grounded && this.game.slide <= 0) {
      this.footstepClock += dt;
      const interval = 0.26 - (this.game.speed - 28) * 0.0018;
      if (this.footstepClock >= interval) {
        this.footstepClock %= interval;
        this.audio.play('step');
      }
    } else this.footstepClock = 0;

    /* 自适应画质 */
    this.adaptiveQuality(dt);

    this.renderer.render(this.scene, this.camera);

    if (this.clock - this.hudTime > 0.09) {
      this.publish(false);
      this.hudTime = this.clock;
    }
    this.frameId = requestAnimationFrame(this.frame);
  };

  private adaptiveQuality(dt: number) {
    if (this.qualityMode !== 'auto' || this.view !== 'running' || dt <= 0) return;
    if (this.qualityHold > 0) { this.qualityHold -= dt; return; }
    this.qualityElapsed += dt;
    this.qualityFrames++;
    if (this.qualityElapsed < 3) return;
    const fps = this.qualityFrames / this.qualityElapsed;
    this.qualityElapsed = this.qualityFrames = 0;
    const ratio = this.renderer.getPixelRatio();
    if (fps < 45 && ratio > 1) {
      this.renderer.setPixelRatio(Math.max(1, ratio - 0.25));
      this.qualityHold = 5;
    }
  }

  private animateActors(preview: boolean, t: number, dt: number) {
    const game = this.game;
    if (!this.actors) return;
    const runner = this.actors.runner;

    /* 奶蛙 */
    let mode: MotionMode = 'idle';
    if (!preview && this.view !== 'starting') {
      mode = game.slide > 0 ? 'slide' : !game.grounded ? 'jump' : 'run';
    } else if (this.view === 'shop' || this.view === 'inspect') {
      mode = this.motionPreview;
    }
    const speedNorm = Math.min(1, (game.speed - CONFIG.startSpeed) / 20);
    runner.root.visible = true;
    runner.root.scale.setScalar(preview ? (this.view === 'shop' ? 0.86 : this.view === 'inspect' ? 1.05 : 1.05) : 1);
    if (preview) {
      if (this.view === 'shop' || this.view === 'inspect') {
        runner.root.position.set(0, mode === 'jump' ? Math.max(0, Math.sin(runner.phase * Math.PI)) * (this.view === 'shop' ? 0.22 : 1.1) : 0, 0);
        runner.root.rotation.y = Math.PI + this.previewTurn;
      } else {
        runner.root.position.set(0, 0, 1.4);
        runner.root.rotation.y = Math.PI + 0.16 + Math.sin(t * 0.5) * 0.1;
      }
    } else {
      runner.root.position.set(game.x, game.y, 0);
      runner.root.rotation.y = 0;
    }
    animateRunner(runner, {
      mode,
      active: preview || game.status === 'running',
      speedNorm,
      turnLean: game.lane * 2.5 - game.x,
      preview,
      time: t,
      dt,
      jumps: game.jumps,
    });

    /* 追兵 */
    if (!preview) {
      const chase = game.status === 'over' ? 2.2 : game.hurt > 0 ? 2.5 + (7 - game.hurt) * 0.72 : 3 + Math.max(0, game.time - 1) * 2.5;
      for (const [kind, xOffset] of [['bull', -0.55], ['dog', 1.08]] as const) {
        const a = this.actors[kind];
        a.root.visible = chase < 12 || game.status === 'over';
        if (!a.root.visible) continue;
        const z = chase;
        const y = kind === 'bull' ? game.supportAt(game.distance - chase, game.x - 0.55, game.y) : game.supportAt(game.distance - chase, game.x + 1.08, game.y);
        a.root.position.set(game.x + xOffset, y, z);
        a.root.scale.setScalar(kind === 'bull' ? 0.92 : 0.78);
        animateQuadruped(a, { mode: 'run', active: true, speedNorm, turnLean: 0, preview: false, time: t, dt }, kind);
      }
    } else {
      this.actors.bull.root.visible = this.view === 'inspect';
      this.actors.dog.root.visible = this.view === 'inspect';
      if (this.view === 'inspect') {
        for (const [kind, x] of [['bull', -1.4], ['dog', 1.4]] as const) {
          const a = this.actors[kind];
          a.root.position.set(x, 0, -0.4);
          a.root.rotation.y = Math.PI + this.previewTurn;
          a.root.scale.setScalar(kind === 'bull' ? 0.92 : 0.78);
          animateQuadruped(a, { mode: 'idle', active: true, speedNorm: 0, turnLean: 0, preview: true, time: t, dt }, kind);
        }
      }
    }
  }

  /* ---------- 状态发布 ---------- */
  private publish(force: boolean) {
    if (!force && this.destroyed) return;
    const game = this.game;
    const zone = ZONES[this.game.zoneOffset];
    const section = Math.floor(game.time / 60);
    const ownedCount = this.store.state.ownedOutfits.length;
    this.onState({
      view: this.view,
      workshopPage: this.workshopPage,
      distance: String(Math.floor(game.distance)).padStart(6, '0'),
      coins: this.view === 'running' || this.view === 'paused' || this.view === 'over' ? game.coins : this.store.state.coins,
      speed: game.speed.toFixed(0),
      speedLabel: game.speed >= CONFIG.maxSpeed ? '极限巡航' : '正在加速',
      speedFill: (game.speed - CONFIG.startSpeed) / (CONFIG.maxSpeed - CONFIG.startSpeed) * 100,
      zoneName: zone.name,
      zoneTag: zone.districts[section % zone.districts.length],
      zoneTime: String(60 - Math.floor(game.time % 60)).padStart(2, '0') + 's',
      zoneFill: ((game.time % 60) / 60) * 100,
      combo: game.combo,
      chase: game.hurt > 0 ? `追兵逼近！再坚持 ${Math.ceil(game.hurt)} 秒` : game.floor > 2 ? '车顶路线 · 注意横梁与矮栏' : '',
      chaseWarning: game.hurt > 0,
      shield: game.shield,
      magnet: game.magnet > 0 ? Math.ceil(game.magnet) : 0,
      toast: this.pendingToast ?? '',
      toastVisible: this.clock < this.toastUntil,
      loading: this.loadProgress,
      loadStatus: this.loadStatus,
      assetsReady: this.assetsReady,
      profile: { ...this.store.state, ownedOutfits: [...this.store.state.ownedOutfits] },
      selectedMapIndex: this.selectedMapIndex,
      shopSelected: this.shopSelected,
      shopOwnedCount: `已收藏 ${ownedCount - 1} / ${OUTFITS.length - 1} 套`,
      endDistance: this.endInfo.distance,
      endDetail: this.endInfo.detail,
      record: this.store.state.best,
      musicOn: this.audio.enabled,
      quality: this.qualityMode,
      paused: this.view === 'paused',
      leaderboard: [],
      petMood: this.petMood,
      petNonce: this.petNonce,
    });
    if (this.pendingToast) this.pendingToast = null;
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('keydown', this.onKeyDown);
    this.audio.stopAll();
    this.renderer.dispose();
  }
}
