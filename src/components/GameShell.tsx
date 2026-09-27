'use client';

/* 游戏界面外壳：主菜单、HUD、商城、地图、任务、战绩、设置与结算面板。 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { GameApp, type HudState } from '@/game/stage';
import { ZONES, TYPES } from '@/game/engine';
import { OUTFITS } from '@/game/outfit-catalog';
import { MISSIONS, loadBoard, pushBoard, type BoardEntry } from '@/game/wardrobe';
import { icon } from '@/game/icons';
import NaiwaPet from '@/components/NaiwaPet';

const Icon = ({ name, className }: { name: string; className?: string }) => (
  <span className={`inline-block ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: icon(name) }} />
);

/* 各国地图小插画（自绘 SVG 风景） */
function MapArt({ id }: { id: string }) {
  const arts: Record<string, React.ReactNode> = {
    egypt: (<><rect width="240" height="140" fill="#a8d8ea" /><path d="M0 100q60-24 110 0t130-10v50H0z" fill="#e4ba7d" /><path d="m50 102 40-62 40 62z" fill="#f1d296" /><path d="m150 104 34-46 34 46z" fill="#edc88a" /><rect x="196" y="52" width="4" height="52" fill="#986a44" /><circle cx="198" cy="48" r="10" fill="#559b7e" /></>),
    china: (<><rect width="240" height="140" fill="#a8d8ea" /><path d="M0 104q60-20 120-8t120-4v48H0z" fill="#bcbdab" /><path d="M100 104V56h40v48z" fill="#bb5748" /><path d="m88 58 32-22 32 22-8 8H96z" fill="#44717a" /><g fill="#f4dbad"><rect x="30" y="76" width="14" height="24" /><rect x="196" y="76" width="14" height="24" /></g><ellipse cx="24" cy="62" rx="7" ry="10" fill="#d66451" /><ellipse cx="216" cy="62" rx="7" ry="10" fill="#d66451" /></>),
    india: (<><rect width="240" height="140" fill="#bfe8ea" /><path d="M0 108q80-18 140-6t100-4v42H0z" fill="#e7a297" /><path d="M92 108V62h56v46z" fill="#f5cfaf" /><path d="M88 64q-6-16 16-24l16-14 16 14q22 10 16 24z" fill="#f7ddb1" /><path d="M104 108V88q16-22 32 0v20z" fill="#8c9fa1" /></>),
    brazil: (<><rect width="240" height="140" fill="#9be0f0" /><path d="M110 124q14-70 42-42 8-22 26 4 10 2 22 28v26H0v-10" fill="#82ae83" /><path d="M0 122q100-8 240 6v12H0z" fill="#62bcce" /><rect x="24" y="66" width="30" height="46" fill="#ebc366" /><rect x="58" y="52" width="30" height="60" fill="#e89faf" /><rect x="92" y="70" width="30" height="42" fill="#70bbae" /></>),
    japan: (<><rect width="240" height="140" fill="#c8e8f0" /><path d="m90 88 44-54 48 54z" fill="#89b3c2" /><path d="m112 62 22-26 24 28-14-6-9 5-9-5z" fill="#faf0e9" /><rect x="20" y="80" width="60" height="8" fill="#be6557" /><rect x="20" y="92" width="60" height="8" fill="#be6557" /><g fill="#ecc0d2"><circle cx="196" cy="66" r="18" /><circle cx="182" cy="78" r="14" /><circle cx="210" cy="78" r="15" /></g></>),
    usa: (<><rect width="240" height="140" fill="#b8e0f8" /><path d="M0 112q60-10 120-4t120-6v38H0z" fill="#9db8c9" /><rect x="28" y="40" width="24" height="72" fill="#74aabc" /><rect x="60" y="20" width="30" height="92" fill="#85b6c8" /><rect x="98" y="52" width="22" height="60" fill="#74aabc" /><rect x="128" y="28" width="28" height="84" fill="#85b6c8" /><path d="M40 40l14-12 16 12m34-32 14-10 14 10" fill="#adcfd6" /></>),
    morocco: (<><rect width="240" height="140" fill="#d8ecc8" /><path d="M0 104q60-16 120-4t120-6v46H0z" fill="#d4a06a" /><path d="M86 104V60h64v44z" fill="#e8b078" /><path d="M86 60q0-18 32-18t32 18z" fill="#c9683a" /><rect x="22" y="70" width="16" height="34" fill="#e8b078" /><path d="M22 70q0-10 8-10t8 10z" fill="#c9683a" /></>),
    greece: (<><rect width="240" height="140" fill="#9adcf0" /><path d="M0 106q100-12 240-4v38H0z" fill="#62bcce" /><rect x="40" y="52" width="48" height="50" fill="#fdfbf5" /><path d="M56 52q8-18 24 0z" fill="#3d84c9" /><rect x="150" y="46" width="44" height="56" fill="#fdfbf5" /><path d="M164 46q8-20 26 0z" fill="#3d84c9" /><rect x="176" y="30" width="3" height="18" fill="#fdfbf5" /></>),
    mexico: (<><rect width="240" height="140" fill="#bfe4f8" /><path d="M0 106q60-14 120-4t120-6v44H0z" fill="#cbab7a" /><path d="m80 106 30-48 30 48z" fill="#e4b657" /><path d="m140 106 24-38 24 38z" fill="#e4b657" /><g stroke="#e0592a" strokeWidth="3"><path d="M20 52v20m8-24v20m8-24v20" /><path d="M204 52v20m8-24v20m8-24v20" /></g><rect x="34" y="72" width="24" height="34" fill="#4aa8c9" /><rect x="188" y="72" width="24" height="34" fill="#e0592a" /></>),
    norway: (<><rect width="240" height="140" fill="#c8dce8" /><path d="m60 84 36-44 38 44z" fill="#8aa8b8" /><path d="m88 62 16-18 16 20-12-4-8 4-8-4z" fill="#f4f8fa" /><path d="M0 104q100-10 240-4v40H0z" fill="#7ab8d4" /><rect x="150" y="64" width="36" height="40" fill="#c9443a" /><path d="M146 64l22-18 22 18z" fill="#6338da" /></>),
  };
  return (
    <svg viewBox="0 0 240 140" className="w-full h-full" aria-hidden="true">
      {arts[id] ?? arts.egypt}
    </svg>
  );
}

/* 服装卡片小头像：奶蛙剪影 + 服装主色 */
function OutfitThumb({ outfit }: { outfit: (typeof OUTFITS)[number] }) {
  return (
    <div className="relative w-full aspect-square rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(160deg,${outfit.color}33,${outfit.color}66)` }}>
      <div className="w-14 h-16 rounded-[45%] rounded-b-[42%] relative" style={{ background: outfit.color, boxShadow: 'inset 0 -8px 12px rgba(0,0,0,.14)' }}>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-8 h-9 rounded-[45%] bg-[#f7ecd0]" />
        <div className="absolute top-2.5 left-2 w-2.5 h-3 rounded-full bg-[#2a241f]" />
        <div className="absolute top-2.5 right-2 w-2.5 h-3 rounded-full bg-[#2a241f]" />
      </div>
    </div>
  );
}

export default function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<GameApp | null>(null);
  const [state, setState] = useState<HudState | null>(null);
  const [board, setBoard] = useState<BoardEntry[]>(() => loadBoard());
  const [joinOpen, setJoinOpen] = useState(false);
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem('naiwa-nickname') || ''; } catch { return ''; }
  });
  const [shopFilter, setShopFilter] = useState('all');
  const [shopQuery, setShopQuery] = useState('');
  const [petHint, setPetHint] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setPetHint(false), 9000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const app = new GameApp(canvasRef.current);
    appRef.current = app;
    app.onState = s => setState(s);
    (window as unknown as { __app: GameApp }).__app = app;
    const ro = new ResizeObserver(() => {
      const el = document.getElementById('app-column');
      if (el) app.resize(el.clientWidth, el.clientHeight);
    });
    const el = document.getElementById('app-column');
    if (el) {
      ro.observe(el);
      app.resize(el.clientWidth, el.clientHeight);
    }
    return () => { app.destroy(); ro.disconnect(); };
  }, []);

  const g = appRef.current;
  const view = state?.view ?? 'menu';
  const inGame = view === 'running' || view === 'paused';

  /* 桌宠交互音效：单击微笑、连点大笑（laugh 延迟 300ms 对齐原桌宠） */
  const petSound = useCallback((e: 'smile' | 'laugh') => {
    appRef.current?.audio.petVoice(e, e === 'laugh' ? 300 : 0);
  }, []);

  const saveScore = useCallback(() => {
    if (!g) return;
    const dist = Math.floor(g.game.distance);
    if (dist <= 0) return;
    const name = nickname.trim() || '无名旅人';
    try { localStorage.setItem('naiwa-nickname', name); } catch { /* 忽略 */ }
    pushBoard({ name, distance: dist, date: new Date().toLocaleDateString('zh-CN') });
    setBoard(loadBoard());
  }, [g, nickname]);

  const s = state;
  const ready = !!s;
  const zone = ZONES[s?.selectedMapIndex ?? 0];
  const wearing = OUTFITS.find(o => o.id === (s?.profile.equippedOutfit ?? 'classic')) ?? OUTFITS[0];
  const shopOutfit = OUTFITS.find(o => o.id === (s?.shopSelected ?? 'classic')) ?? OUTFITS[0];
  const ownsShop = (s?.profile.ownedOutfits ?? ['classic']).includes(shopOutfit.id);
  const profile = s?.profile ?? { coins: 0, best: 0, totalCoins: 0, runs: 0, jumps: 0, slides: 0, roof: 0, ownedOutfits: ['classic'], equippedOutfit: 'classic' };
  const shopList = OUTFITS.filter(o =>
    (shopFilter === 'all' || (shopFilter === 'owned' && profile.ownedOutfits.includes(o.id)))
    && (!shopQuery || (o.name + o.category).includes(shopQuery)),
  );
  const doneMissions = MISSIONS.filter(m => (profile[m[2]] as number) >= m[3]).length;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at 50% 28%,#328fbc 0,#143c64 42%,#101c36 85%)' }}>

      {/* 桌面端侧边装饰 */}
      <div className="hidden lg:flex flex-col justify-between py-10 pl-8 absolute left-0 top-0 h-full pointer-events-none">
        <div>
          <div className="text-5xl font-black text-white/95 tracking-widest" style={{ textShadow: '0 4px 14px rgba(0,0,0,.35)' }}>奶蛙快跑</div>
          <div className="mt-3 text-sm tracking-[0.3em] text-white/70">阳光漫游 / SUNNY WORLD TOUR</div>
        </div>
        <div className="text-xs text-white/55 leading-6">方向键 · 空格跳跃 · P 暂停<br />十国地图 · 四十余套换装</div>
      </div>
      <div className="hidden lg:flex flex-col items-end justify-center gap-4 absolute right-0 top-0 h-full pr-8 pointer-events-none">
        <div className="w-40 text-right text-[11px] leading-5 text-white/55">← → 换道 ↑ 跳跃 ↓ 滑铲<br />收集金币去商城换新装<br />护盾可抵挡一次碰撞<br />七秒内连撞两次会被抓住</div>
      </div>

      {/* 游戏立式框架 */}
      <div id="app-column" className="relative w-full h-[100dvh] lg:w-[min(100vw,58dvh)] lg:h-[100dvh] lg:rounded-2xl overflow-hidden shadow-[0_0_90px_rgba(0,0,0,.5)] bg-[#298bc2]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" />

        {/* 首次加载遮罩（含角色资产下载） */}
        {(!ready || !s?.assetsReady) && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-[#3b6ea5] to-[#2a4a7a]">
            <NaiwaPet mood="idle" size={78}
              fallback={<div className="w-20 h-20 rounded-2xl bg-[#3f9bd8] shadow-lg flex items-center justify-center text-4xl animate-bounce">🐸</div>} />
            <div className="mt-4 text-2xl font-black text-[#ffd444]" style={{ textShadow: '0 2px 0 #a86e00, 0 4px 10px rgba(0,0,0,.3)' }}>奶蛙快跑</div>
            <div className="mt-3 text-sm text-white/85 animate-pulse">{s?.loadStatus || '正在下载角色…'}</div>
            <div className="mt-4 w-56 h-3 rounded-full bg-white/25 border border-white/40 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#ffd444] to-[#ff9d3c] transition-all duration-200" style={{ width: `${Math.round((s?.loading ?? 0.05) * 100)}%` }} />
            </div>
            <div className="mt-2 text-xs text-white/60">第一次打开需要下载角色和场景</div>
          </div>
        )}

        {/* ===== 加载遮罩 ===== */}
        {ready && view === 'starting' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-[#3b6ea5cc] to-[#2a4a7acc] backdrop-blur-sm">
            <NaiwaPet mood="idle" size={78}
              fallback={<div className="w-20 h-20 rounded-2xl bg-[#3f9bd8] shadow-lg flex items-center justify-center text-4xl">🐸</div>} />
            <div className="mt-4 text-2xl font-black text-[#ffd444]" style={{ textShadow: '0 2px 0 #a86e00, 0 4px 10px rgba(0,0,0,.3)' }}>奶蛙快跑</div>
            <div className="mt-3 text-sm text-white/85">{s.loadStatus || '准备出发…'}</div>
            <div className="mt-4 w-56 h-3 rounded-full bg-white/25 border border-white/40 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#ffd444] to-[#ff9d3c] transition-all duration-200" style={{ width: `${s.loading * 100}%` }} />
            </div>
            <div className="mt-2 text-xs text-white/60">第一次打开需要构建角色和场景</div>
          </div>
        )}

        {/* ===== 游戏 HUD ===== */}
        {ready && (inGame || view === 'over') && view !== 'starting' && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* 顶部左：暂停 + 区段 */}
            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-auto">
              <button aria-label="暂停" onClick={() => g?.togglePause()}
                className="w-11 h-11 rounded-full bg-white/85 shadow-md flex items-center justify-center active:scale-95 transition-transform">
                <Icon name={view === 'paused' ? 'play' : 'pause'} className="w-6 h-6" />
              </button>
              <div className="px-3 py-1.5 rounded-full bg-black/30 text-white text-sm font-bold backdrop-blur-sm flex items-center gap-1.5">
                <Icon name="flag" className="w-4 h-4" />
                {s.zoneName} {s.zoneTime}
              </div>
            </div>
            {/* 顶部右：距离 + 金币 */}
            <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
              <div className="px-3 py-1 rounded-full bg-black/30 text-white backdrop-blur-sm text-sm font-mono font-bold tabular-nums">
                {s.distance} <span className="text-white/70 text-xs">米</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-black/30 text-white backdrop-blur-sm text-sm font-bold flex items-center gap-1.5 tabular-nums">
                <Icon name="coin" className="w-4 h-4" />{s.coins}
              </div>
            </div>
            {/* 追兵警告 */}
            {s.chase && (
              <div className={`absolute top-20 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap ${s.chaseWarning ? 'bg-[#e84545ee] text-white animate-pulse' : 'bg-black/35 text-white/90 backdrop-blur-sm'}`}>
                {s.chase}
              </div>
            )}
            {/* 段落进度 */}
            <div className="absolute top-16 left-3 w-36">
              <div className="text-[10px] text-white/80 font-bold px-1">{s.zoneTag}</div>
              <div className="mt-1 h-1.5 rounded-full bg-white/25 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#7de8f5] to-[#4aa8e8]" style={{ width: `${s.zoneFill}%` }} />
              </div>
            </div>
            {/* 奶蛙桌宠情绪陪伴：吃金币微笑 / 里程碑大笑 / 受击哭泣 */}
            <div key={'hud-pet-' + s.petNonce}
              className="absolute left-2.5 bottom-[152px] md:bottom-[92px] pet-pop">
              <NaiwaPet mood={s.petMood} nonce={s.petNonce} size={96} className="drop-shadow-[0_4px_10px_rgba(0,0,0,.35)]" />
            </div>

            {/* 底部：速度 + 道具 */}
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
              <div className="pointer-events-auto flex flex-col gap-2">
                {/* 触屏方向键 */}
                <div className="grid grid-cols-3 grid-rows-2 gap-1.5 opacity-80 md:hidden">
                  <div />
                  <button aria-label="跳跃" onPointerDown={e => { e.preventDefault(); g?.input('jump'); }} className="w-14 h-12 rounded-xl bg-white/80 shadow flex items-center justify-center text-[#2a6a9a] text-xl font-black active:scale-90 transition-transform">↑</button>
                  <div />
                  <button aria-label="左移" onPointerDown={e => { e.preventDefault(); g?.input('left'); }} className="w-14 h-12 rounded-xl bg-white/80 shadow flex items-center justify-center text-[#2a6a9a] text-xl font-black active:scale-90 transition-transform">←</button>
                  <button aria-label="下滑" onPointerDown={e => { e.preventDefault(); g?.input('slide'); }} className="w-14 h-12 rounded-xl bg-white/80 shadow flex items-center justify-center text-[#2a6a9a] text-xl font-black active:scale-90 transition-transform">↓</button>
                  <button aria-label="右移" onPointerDown={e => { e.preventDefault(); g?.input('right'); }} className="w-14 h-12 rounded-xl bg-white/80 shadow flex items-center justify-center text-[#2a6a9a] text-xl font-black active:scale-90 transition-transform">→</button>
                </div>
                <div className="hidden md:flex gap-1.5 text-[11px] text-white/70">← → 换道　↑ 跳跃　↓ 滑铲</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {(s.shield > 0 || s.magnet > 0) && (
                  <div className="flex gap-1.5">
                    {s.shield > 0 && (
                      <div className="px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-sm text-white text-xs font-bold flex items-center gap-1">
                        <Icon name="shield" className="w-4 h-4" />{s.shield}
                      </div>
                    )}
                    {s.magnet > 0 && (
                      <div className="px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-sm text-white text-xs font-bold flex items-center gap-1">
                        <Icon name="magnet" className="w-4 h-4" />{s.magnet}s
                      </div>
                    )}
                  </div>
                )}
                <div className="px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-lg font-black tabular-nums">{s.speed}</span>
                    <span className="text-[10px] text-white/70">m/s</span>
                    <span className="text-[10px] text-[#ffd444] ml-1">{s.speedLabel}</span>
                  </div>
                  <div className="mt-1 w-24 h-1.5 rounded-full bg-white/25 overflow-hidden ml-auto">
                    <div className="h-full bg-gradient-to-r from-[#ffd444] to-[#ff7043]" style={{ width: `${Math.min(100, s.speedFill)}%` }} />
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-black/25 backdrop-blur-sm text-white/85 text-xs">🎯 {s.combo}</div>
              </div>
            </div>
          </div>
        )}

        {/* ===== 暂停 / 结算面板 ===== */}
        {ready && (view === 'paused' || view === 'over') && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-6">
            <div className="w-full max-w-xs bg-white rounded-3xl shadow-2xl p-6 text-center">
              <NaiwaPet mood={view === 'over' ? s.petMood : 'idle'} nonce={s.petNonce} size={92} className="mx-auto"
                fallback={<div className="text-4xl">{view === 'over' ? '🏃💨' : '☕'}</div>} />
              <h2 className="mt-2 text-2xl font-black text-[#2a4a6a]">{view === 'over' ? (s.petMood === 'laugh' ? '新纪录诞生！' : '被抓住啦！') : '休息一下'}</h2>
              <p className="mt-1 text-sm text-[#6a85a0]">{view === 'over' ? (s.petMood === 'laugh' ? '奶蛙笑得直不起腰' : '差一点就甩掉他们了') : '列车与追兵也暂停了'}</p>
              <div className="mt-4 py-3 rounded-2xl bg-gradient-to-b from-[#eaf6ff] to-[#d8ecff]">
                <div className="text-3xl font-black text-[#2a6a9a] tabular-nums">{s.endDistance}</div>
                {view === 'over' && <div className="mt-1 text-xs text-[#6a85a0] whitespace-pre-line">{s.endDetail}</div>}
              </div>
              {view === 'over' && (
                <div className="mt-3 flex gap-2">
                  <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="留下昵称上榜"
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-[#c5dff0] text-sm focus:outline-none focus:ring-2 focus:ring-[#7cc4ec]" />
                  <button onClick={saveScore} className="px-3 py-2 rounded-xl bg-[#4aa8e8] text-white text-sm font-bold active:scale-95 transition-transform">上榜</button>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {view === 'paused' ? (
                  <>
                    <button onClick={() => g?.togglePause()} className="col-span-2 py-3 rounded-2xl bg-gradient-to-b from-[#5cbded] to-[#3f9bd8] text-white font-black text-lg shadow-md border-2 border-white/70 active:scale-95 transition-transform">▶ 继续奔跑</button>
                    <button onClick={() => g?.home()} className="py-2.5 rounded-2xl bg-[#eaf2f8] text-[#4a6a8a] font-bold active:scale-95 transition-transform">回到主页</button>
                    <button onClick={() => g?.start()} className="py-2.5 rounded-2xl bg-[#eaf2f8] text-[#4a6a8a] font-bold active:scale-95 transition-transform">重新开跑</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => g?.start()} className="col-span-2 py-3 rounded-2xl bg-gradient-to-b from-[#5cbded] to-[#3f9bd8] text-white font-black text-lg shadow-md border-2 border-white/70 active:scale-95 transition-transform">↻ 再跑一次</button>
                    <button onClick={() => g?.openShop()} className="py-2.5 rounded-2xl bg-[#fff3d0] text-[#a8740a] font-bold active:scale-95 transition-transform flex items-center justify-center gap-1"><Icon name="shirt" className="w-4 h-4" />去换装</button>
                    <button onClick={() => g?.home()} className="py-2.5 rounded-2xl bg-[#eaf2f8] text-[#4a6a8a] font-bold active:scale-95 transition-transform flex items-center justify-center gap-1"><Icon name="home" className="w-4 h-4" />回主页</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== 主菜单 ===== */}
        {ready && view === 'menu' && (
          <div className="absolute inset-0 z-10 flex flex-col">
            {/* 奶蛙桌宠（可拖拽甩飞/点击互动，与桌面版行为一致） */}
            <NaiwaPet interactive size={162} floorOffset={138} initX={0.13} onEvent={petSound} />
            <div className={`absolute left-3 bottom-[318px] px-3 py-1.5 rounded-full bg-black/45 text-white/90 text-[11px] font-bold backdrop-blur-sm pointer-events-none transition-opacity duration-700 ${petHint ? 'opacity-100' : 'opacity-0'}`}>
              拖我甩飞 · 点我微笑 · 连点五次大笑
            </div>

            {/* 顶部钱包 */}
            <div className="mt-3 mx-3 px-4 py-2 rounded-2xl bg-white/85 backdrop-blur shadow-md flex items-center gap-3">
              <Icon name="trophy" className="w-7 h-7" />
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-[#d4880a] tabular-nums">{s.profile.coins}</span>
                <button onClick={() => g?.start()} className="ml-1 w-5 h-5 rounded-full bg-[#7dd8b5] text-white text-sm font-black leading-none active:scale-90 transition-transform" aria-label="去赚金币">＋</button>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <Icon name="crown" className="w-6 h-6" />
                <span className="text-sm font-black text-[#2a6a9a] tabular-nums">{s.profile.best} 米</span>
              </div>
              <button onClick={() => g?.setMusic(!s.musicOn)} aria-label="音乐开关" className="w-9 h-9 rounded-full bg-[#eaf4fb] flex items-center justify-center active:scale-90 transition-transform">
                <span className={`text-lg ${s.musicOn ? '' : 'opacity-30' }`}>🎵</span>
              </button>
            </div>

            {/* 标题 */}
            <div className="mt-4 text-center px-4">
              <div className="text-[11px] tracking-[0.25em] text-white/85 font-bold">阳光漫游 · 十大地图 · 复刻版</div>
              <h1 className="mt-1 text-5xl font-black text-[#ffd444]" style={{ textShadow: '0 3px 0 #c07f08, 0 6px 16px rgba(0,0,0,.35)' }}>奶蛙快跑</h1>
              <div className="mt-2 inline-block px-4 py-1 rounded-full bg-[#2a6a9a]/85 text-white text-sm font-bold tracking-[0.4em] pl-[calc(1rem+0.4em)]">阳光漫游</div>
            </div>

            {/* 左右圆形导航 */}
            <div className="flex-1 relative">
              <div className="absolute left-2.5 top-6 flex flex-col gap-4">
                <NavBall icon="map" label="世界地图" badge={10} onClick={() => g?.openWorkshop('maps')} />
                <NavBall icon="board" label="障碍图鉴" badge={20} onClick={() => g?.openCatalog()} />
                <NavBall icon="trophy" label="挑战之路" badge={doneMissions} onClick={() => g?.openWorkshop('missions')} />
              </div>
              <div className="absolute right-2.5 top-6 flex flex-col gap-4">
                <NavBall icon="shirt" label="服装商城" badge={OUTFITS.length - 1} onClick={() => g?.openShop()} />
                <NavBall icon="crown" label="排行榜" onClick={() => setLeaderOpen(true)} />
                <NavBall icon="gear" label="游戏设置" onClick={() => g?.openWorkshop('settings')} />
              </div>
              {/* 角色名片（3D 角色在画布中间） */}
              <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 px-6 pointer-events-none">
                <div className="pointer-events-auto px-4 py-2 rounded-full bg-white/90 shadow-md flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: wearing.color }} />
                  <span className="text-sm font-bold text-[#2a4a6a]">{wearing.name}</span>
                  <button onClick={() => g?.openShop()} className="text-xs font-black text-[#3f9bd8] active:scale-90 transition-transform">去换装 ›</button>
                </div>
                <div className="pointer-events-auto w-full flex flex-col items-center gap-1.5">
                  <div className="px-4 py-1.5 rounded-full bg-[#2a6a9a]/90 text-white text-xs font-bold flex items-center gap-1.5">
                    <Icon name="map" className="w-3.5 h-3.5" />{zone.name} · {zone.subtitle}
                    <button onClick={() => g?.openWorkshop('maps')} className="text-[#ffd444] font-black ml-1 active:scale-90 transition-transform">切换 ›</button>
                  </div>
                  <button onClick={() => g?.start()}
                    className="w-full max-w-[300px] py-4 rounded-full bg-gradient-to-b from-[#5cbded] to-[#2f8ac8] text-white text-2xl font-black shadow-xl border-[3px] border-white/75 active:scale-[0.97] transition-transform flex items-center justify-center gap-2">
                    点击开跑 <span className="text-3xl leading-none">▶</span>
                  </button>
                  <div className="text-[11px] text-white/75">自由选图 · 单地图无尽奔跑</div>
                </div>
              </div>
            </div>

            {/* 底部导航坞 */}
            <div className="mb-3 mx-3 px-2 py-1.5 rounded-2xl bg-white/90 backdrop-blur shadow-md flex justify-around">
              <DockItem icon="chest" label="商城" onClick={() => g?.openShop()} />
              <DockItem icon="shirt" label="形象" onClick={() => g?.openInspect()} />
              <button onClick={() => g?.start()} className="flex flex-col items-center gap-0.5 px-3 -mt-4" aria-label="开跑">
                <span className="w-14 h-14 rounded-full bg-gradient-to-b from-[#ffd444] to-[#ff9d3c] shadow-lg border-[3px] border-white flex items-center justify-center text-2xl active:scale-90 transition-transform">🏃</span>
                <span className="text-[10px] font-bold text-[#c07f08]">开跑</span>
              </button>
              <DockItem icon="board" label="任务" onClick={() => g?.openWorkshop('missions')} />
              <DockItem icon="gear" label="设置" onClick={() => g?.openWorkshop('settings')} />
              <DockItem icon="heart" label="加入我们" onClick={() => setJoinOpen(true)} />
            </div>
          </div>
        )}

        {/* ===== 工坊（地图/任务/战绩/设置/指南） ===== */}
        {ready && view === 'workshop' && (
          <div className="absolute inset-0 z-20 bg-gradient-to-b from-[#2f6ea5] to-[#1d4569] flex flex-col">
            <div className="mt-3 mx-3 flex items-center gap-2">
              <button onClick={() => g?.home()} className="w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center active:scale-90 transition-transform" aria-label="返回">
                <span className="text-[#2a6a9a] text-lg font-black">‹</span>
              </button>
              <h2 className="text-lg font-black text-white">
                {{ maps: '选择旅行的地图', missions: '挑战之路', records: '我的战绩', settings: '游戏设置', guide: '玩法指南' }[s.workshopPage]}
              </h2>
              <div className="ml-auto flex items-baseline gap-1 text-white">
                <Icon name="coin" className="w-5 h-5" /><span className="font-black tabular-nums">{s.profile.coins}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mx-3 mt-3 mb-3 rounded-2xl bg-white/95 shadow-inner p-3">
              {s.workshopPage === 'maps' && (
                <div className="grid grid-cols-2 gap-2.5">
                  {ZONES.map((z, i) => (
                    <button key={z.id} onClick={() => g?.selectMap(i)}
                      className={`rounded-2xl overflow-hidden text-left shadow transition-all border-[3px] ${i === s.selectedMapIndex ? 'border-[#ffd444] scale-[0.98]' : 'border-white'}`}>
                      <div className="h-20 bg-[#d8ecf5]"><MapArt id={z.id} /></div>
                      <div className="p-2 bg-white">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-[#2a4a6a]">{z.name}</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${i === s.selectedMapIndex ? 'bg-[#ffd444] text-[#7a5200]' : 'bg-[#eaf2f8] text-[#4a6a8a]'}`}>
                            {i === s.selectedMapIndex ? '✓ 已选择' : '选择'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#3f9bd8]">{z.subtitle}</div>
                        <div className="text-[10px] text-[#8aa4bc] mt-0.5 leading-4">{z.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {s.workshopPage === 'missions' && (
                <div className="flex flex-col gap-2.5">
                  <div className="px-3 py-2.5 rounded-2xl bg-gradient-to-r from-[#eaf6ff] to-[#d8ecff]">
                    <div className="text-sm font-black text-[#2a6a9a]">挑战进度 {doneMissions} / {MISSIONS.length}</div>
                    <div className="mt-1.5 h-2 rounded-full bg-white overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#7dd8b5] to-[#4aa8e8]" style={{ width: `${(doneMissions / MISSIONS.length) * 100}%` }} />
                    </div>
                  </div>
                  {MISSIONS.map(([title, desc, key, max]) => {
                    const cur = Math.min(s.profile[key] as number, max);
                    const done = cur >= max;
                    return (
                      <div key={title} className={`px-3 py-2.5 rounded-2xl border-2 ${done ? 'bg-[#f0fbf4] border-[#7dd8b5]' : 'bg-white border-[#e4eef5]'}`}>
                        <div className="flex items-center justify-between">
                          <b className={`text-sm ${done ? 'text-[#2a9a6a]' : 'text-[#2a4a6a]'}`}>{title} {done && '✓'}</b>
                          <small className="text-xs text-[#8aa4bc] tabular-nums">{cur} / {max}</small>
                        </div>
                        <p className="text-xs text-[#8aa4bc] mt-0.5">{desc}</p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-[#eef4f8] overflow-hidden">
                          <div className={`h-full rounded-full ${done ? 'bg-[#7dd8b5]' : 'bg-[#7cc4ec]'}`} style={{ width: `${(cur / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {s.workshopPage === 'records' && (
                <div className="grid grid-cols-2 gap-2.5">
                  {[['最远距离', `${s.profile.best} m`], ['累计金币', s.profile.totalCoins], ['完成奔跑', `${s.profile.runs} 次`], ['车顶距离', `${s.profile.roof} m`], ['完成跳跃', `${s.profile.jumps} 次`], ['完成滑铲', `${s.profile.slides} 次`]].map(([a, b]) => (
                    <div key={a as string} className="px-3 py-3 rounded-2xl bg-gradient-to-b from-[#f5faff] to-[#e8f2fa] border border-[#d8e8f4]">
                      <div className="text-xs text-[#8aa4bc]">{a}</div>
                      <div className="text-lg font-black text-[#2a6a9a] tabular-nums">{b}</div>
                    </div>
                  ))}
                </div>
              )}

              {s.workshopPage === 'settings' && (
                <div className="flex flex-col gap-3">
                  <div className="px-3 py-3 rounded-2xl bg-white border-2 border-[#e4eef5] flex items-center justify-between">
                    <span className="text-sm font-bold text-[#2a4a6a]">背景音乐与音效</span>
                    <button onClick={() => g?.setMusic(!s.musicOn)}
                      className={`px-4 py-1.5 rounded-full text-sm font-black text-white transition-colors ${s.musicOn ? 'bg-[#4aa8e8]' : 'bg-[#b0c4d4]'}`}>
                      {s.musicOn ? '已开启' : '已关闭'}
                    </button>
                  </div>
                  <div className="px-3 py-3 rounded-2xl bg-white border-2 border-[#e4eef5]">
                    <div className="text-sm font-bold text-[#2a4a6a]">音量</div>
                    <input type="range" min={0} max={100} defaultValue={55} onChange={e => g?.setVolume(+e.target.value / 100)} className="mt-2 w-full accent-[#4aa8e8]" aria-label="音量" />
                  </div>
                  <div className="px-3 py-3 rounded-2xl bg-white border-2 border-[#e4eef5]">
                    <div className="text-sm font-bold text-[#2a4a6a]">画质</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {['auto', 'ultra', 'smooth'].map(q => (
                        <button key={q} onClick={() => g?.setQuality(q)}
                          className={`py-2 rounded-xl text-xs font-black transition-colors ${s.quality === q ? 'bg-[#4aa8e8] text-white' : 'bg-[#eaf2f8] text-[#4a6a8a]'}`}>
                          {{ auto: '自动', ultra: '极致', smooth: '流畅' }[q]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-3 py-3 rounded-2xl bg-white border-2 border-[#e4eef5]">
                    <div className="text-sm font-bold text-[#2a4a6a]">出发国家</div>
                    <select value={s.selectedMapIndex} onChange={e => g?.selectMap(+e.target.value)}
                      className="mt-2 w-full px-3 py-2 rounded-xl border border-[#c5dff0] text-sm text-[#2a6a9a] focus:outline-none">
                      {ZONES.map((z, i) => <option key={z.id} value={i}>{z.name} · {z.subtitle}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {s.workshopPage === 'guide' && (
                <div className="flex flex-col gap-2 text-sm text-[#4a6a8a] leading-6">
                  <div className="px-3 py-2 rounded-xl bg-[#f0f7fc] font-bold text-[#2a6a9a]">操作</div>
                  <p>← → 或 A/D 换道；↑ / W / 空格 跳跃；↓ / S 滑铲；P 或 Esc 暂停。手机上可以滑动屏幕或使用方向按钮。</p>
                  <div className="px-3 py-2 rounded-xl bg-[#f0f7fc] font-bold text-[#2a6a9a]">规则</div>
                  <p>金币沿安全路线排布，跟着金币走就不会撞车。护盾最多叠三层，磁铁持续 12 秒。撞击后 7 秒内再撞一次就会被追兵抓住——中弹后优先找空道！</p>
                  <div className="px-3 py-2 rounded-xl bg-[#f0f7fc] font-bold text-[#2a6a9a]">车顶路线</div>
                  <p>遇到黄色坡道可以冲上货车顶，车顶上有额外金币与道具，但注意横梁和矮栏需要跳跃或滑铲通过。</p>
                </div>
              )}
            </div>
            {s.workshopPage === 'maps' && (
              <div className="mb-3 mx-3">
                <button onClick={() => { g?.home(); g?.start(); }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#ffd444] to-[#ff9d3c] text-white text-lg font-black shadow-lg border-2 border-white/70 active:scale-[0.98] transition-transform">
                  出发去 {zone.name} ›
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== 障碍图鉴 ===== */}
        {ready && view === 'catalog' && (
          <div className="absolute inset-0 z-20 bg-gradient-to-b from-[#2f6ea5] to-[#1d4569] flex flex-col">
            <div className="mt-3 mx-3 flex items-center gap-2">
              <button onClick={() => g?.home()} className="w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center active:scale-90 transition-transform" aria-label="返回">
                <span className="text-[#2a6a9a] text-lg font-black">‹</span>
              </button>
              <h2 className="text-lg font-black text-white">障碍图鉴 · {Object.keys(TYPES).length} 种</h2>
            </div>
            <div className="flex-1 overflow-y-auto mx-3 mt-3 mb-3 rounded-2xl bg-white/95 p-3">
              <div className="grid grid-cols-3 gap-2">
                {Object.values(TYPES).map((t, i) => (
                  <div key={t.name} className="rounded-xl bg-gradient-to-b from-[#f5faff] to-[#e8f2fa] border border-[#d8e8f4] p-2 flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ background: t.action === 'jump' ? '#e8f8e0' : t.action === 'slide' ? '#fff0d8' : t.action === 'climb' ? '#f0e8ff' : '#ffe8e8' }}>
                      {{ jump: '⤒', slide: '⤓', dodge: '⇄', climb: '⤒⇗' }[t.action]}
                    </div>
                    <span className="mt-1 text-[10px] text-[#8aa4bc]">{String(i + 1).padStart(2, '0')}</span>
                    <strong className="text-xs text-[#2a4a6a] leading-4">{t.name}</strong>
                    <small className="text-[10px] text-[#3f9bd8] font-bold mt-0.5">
                      {{ jump: '↑ 跳跃', slide: '↓ 滑铲', dodge: '← → 换道', climb: '沿坡自动登车' }[t.action]}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== 服装商城 ===== */}
        {ready && view === 'shop' && (
          <div className="absolute inset-0 z-20 flex flex-col">
            {/* 顶部工具栏 */}
            <div className="mt-3 mx-3 flex items-center gap-2">
              <button onClick={() => g?.home()} className="w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center active:scale-90 transition-transform" aria-label="返回">
                <span className="text-[#2a6a9a] text-lg font-black">‹</span>
              </button>
              <div className="px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white text-sm font-bold flex items-center gap-1.5">
                <Icon name="coin" className="w-4 h-4" /><span className="tabular-nums">{s.profile.coins}</span>
              </div>
              <NaiwaPet mood={s.petMood} nonce={s.petNonce} size={46} className="ml-0.5" />
              <span className="text-xs text-white/80">{s.shopOwnedCount}</span>
              <div className="ml-auto flex gap-1">
                {['idle', 'run', 'jump', 'slide'].map(m => (
                  <button key={m} onClick={() => g?.setMotionPreview(m)}
                    className="px-2.5 py-1.5 rounded-full bg-white/85 text-[#2a6a9a] text-xs font-black active:scale-90 transition-transform">
                    {{ idle: '站立', run: '跑步', jump: '跳跃', slide: '滑铲' }[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* 3D 试穿展示区（画布透出，角色站这里） */}
            <div className="flex-1 min-h-[170px] flex items-end justify-center pb-1 pointer-events-none">
              <div className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white/85 text-[11px]">点击下方卡片即可试穿</div>
            </div>

            {/* 选中详情 + 搜索 */}
            <div className="mx-3 flex items-center gap-2">
              <input value={shopQuery} onChange={e => setShopQuery(e.target.value)} placeholder="搜索服装…"
                className="flex-1 min-w-0 px-3 py-1.5 rounded-full bg-white/85 text-sm focus:outline-none" />
              {['all', 'owned'].map(f => (
                <button key={f} onClick={() => setShopFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black transition-colors ${shopFilter === f ? 'bg-[#ffd444] text-[#7a5200]' : 'bg-white/85 text-[#4a6a8a]'}`}>
                  {{ all: '全部', owned: '已拥有' }[f]}
                </button>
              ))}
            </div>
            <div className="mt-2 mx-3 px-3 py-2 rounded-2xl bg-black/35 backdrop-blur-sm text-white flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: shopOutfit.color }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black truncate">{shopOutfit.name} <span className="text-[10px] text-white/60 font-normal">{shopOutfit.category}</span></div>
                <div className="text-[11px] text-white/65 truncate">{shopOutfit.description}</div>
              </div>
              <button onClick={() => g?.shopBuy()} disabled={!ownsShop && s.profile.coins < shopOutfit.price}
                className={`px-3.5 py-2 rounded-xl text-sm font-black whitespace-nowrap active:scale-95 transition-transform ${ownsShop ? (s.profile.equippedOutfit === shopOutfit.id ? 'bg-white/25 text-white/70' : 'bg-[#7dd8b5] text-white') : s.profile.coins >= shopOutfit.price ? 'bg-[#ffd444] text-[#7a5200]' : 'bg-white/20 text-white/50'}`}>
                {ownsShop ? (s.profile.equippedOutfit === shopOutfit.id ? '已穿戴' : '穿戴这套') : s.profile.coins >= shopOutfit.price ? `购买 · ${shopOutfit.price}` : `还差 ${shopOutfit.price - s.profile.coins}`}
              </button>
            </div>

            {/* 服装网格 */}
            <div className="h-[46%] overflow-y-auto mx-3 mt-2 mb-3 rounded-2xl bg-white/12 backdrop-blur-sm p-2">
              <div className="grid grid-cols-3 gap-2">
                {shopList.map(o => {
                  const owned = s.profile.ownedOutfits.includes(o.id);
                  const equipped = s.profile.equippedOutfit === o.id;
                  return (
                    <button key={o.id} onClick={() => g?.shopTry(o.id)}
                      className={`rounded-2xl p-1.5 bg-white/90 shadow transition-all border-2 ${s.shopSelected === o.id ? 'border-[#ffd444] scale-[0.97]' : 'border-transparent'}`}>
                      <OutfitThumb outfit={o} />
                      <div className="mt-1 text-[11px] font-black text-[#2a4a6a] truncate">{o.name}</div>
                      <div className="text-[10px] font-bold">
                        {equipped ? <span className="text-[#2a9a6a]">穿戴中</span>
                          : owned ? <span className="text-[#3f9bd8]">点击试穿</span>
                            : <span className="text-[#d4880a]">◉ {o.price}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 text-center text-[11px] text-white/70">{shopList.length} / {OUTFITS.length} 款</div>
              {!ownsShop && s.profile.coins < shopOutfit.price && (
                <button onClick={() => g?.start()} className="mt-1 w-full py-2.5 rounded-xl bg-[#ffd444] text-[#7a5200] font-black active:scale-95 transition-transform">
                  还差 {shopOutfit.price - s.profile.coins} 金币 · 去跑道收集！
                </button>
              )}
            </div>
          </div>
        )}

        {/* ===== 角色工作坊（检视） ===== */}
        {ready && view === 'inspect' && (
          <div className="absolute inset-0 z-20 flex flex-col">
            <div className="mt-3 mx-3 flex items-center gap-2">
              <button onClick={() => g?.openWorkshop('maps')} className="w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center active:scale-90 transition-transform" aria-label="返回">
                <span className="text-[#2a6a9a] text-lg font-black">‹</span>
              </button>
              <h2 className="text-lg font-black text-white drop-shadow">角色工作坊</h2>
            </div>
            <div className="mx-3 mt-2 px-3 py-2 rounded-2xl bg-black/30 backdrop-blur-sm text-white text-xs flex items-center gap-2">
              <span>旋转</span>
              <input type="range" min={0} max={628} defaultValue={0} onChange={e => g?.setPreviewTurn(+e.target.value / 100)} className="flex-1 accent-[#ffd444]" aria-label="旋转角色" />
            </div>
            <div className="flex-1" />
            <div className="mx-3 mb-3 rounded-2xl bg-black/30 backdrop-blur-sm px-3 py-2 text-white text-[11px] leading-5">
              中间是奶蛙本蛙，两侧是追兵公牛和小狗。它们平时远远跟着，被撞到后 7 秒内会冲上来——别给他们机会！
            </div>
          </div>
        )}

        {/* ===== 提示浮层 ===== */}
        {ready && (
          <div className={`absolute left-1/2 top-24 -translate-x-1/2 z-30 px-5 py-2 rounded-full bg-black/60 text-white text-sm font-bold backdrop-blur-sm transition-opacity duration-300 pointer-events-none ${s.toastVisible ? 'opacity-100' : 'opacity-0'}`}>
            {s.toast}
          </div>
        )}

        {/* ===== 排行榜弹窗 ===== */}
        {leaderOpen && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-6" onClick={() => setLeaderOpen(false)}>
            <div className="w-full max-w-xs bg-white rounded-3xl shadow-2xl p-5 max-h-[70%] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <Icon name="crown" className="w-7 h-7" />
                <h3 className="text-lg font-black text-[#2a4a6a]">本地排行榜</h3>
                <button onClick={() => setLeaderOpen(false)} className="ml-auto w-8 h-8 rounded-full bg-[#eaf2f8] text-[#4a6a8a] font-black">✕</button>
              </div>
              <div className="mt-3 flex-1 overflow-y-auto flex flex-col gap-1.5">
                {board.length === 0 && <div className="text-center text-sm text-[#8aa4bc] py-8">还没有记录，跑一把上榜！</div>}
                {board.map((e, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${i === 0 ? 'bg-gradient-to-r from-[#fff3d0] to-[#ffe8b0]' : 'bg-[#f2f7fb]'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${i < 3 ? 'bg-[#ffd444] text-white' : 'bg-[#d8e5ef] text-[#6a85a0]'}`}>{i + 1}</span>
                    <span className="text-sm font-bold text-[#2a4a6a] flex-1 truncate">{e.name}</span>
                    <span className="text-sm font-black text-[#2a6a9a] tabular-nums">{e.distance} 米</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== 加入我们弹窗 ===== */}
        {joinOpen && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-6" onClick={() => setJoinOpen(false)}>
            <div className="w-full max-w-xs bg-white rounded-3xl shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
              <div className="text-4xl">🐸💛</div>
              <h3 className="mt-2 text-xl font-black text-[#2a4a6a]">奶蛙观光团</h3>
              <p className="mt-2 text-sm text-[#6a85a0] leading-6">
                这是一台致敬原作、全部代码重写的复刻版跑酷。<br />
                带上奶蛙，一起跑遍十个国家吧！<br />
                阳光漫游 · SUNNY WORLD TOUR
              </p>
              <button onClick={() => setJoinOpen(false)} className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-b from-[#5cbded] to-[#3f9bd8] text-white font-black shadow-md active:scale-95 transition-transform">一起出发</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* 圆形导航按钮 */
function NavBall({ icon, label, badge, onClick }: { icon: string; label: string; badge?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90 transition-transform w-16">
      <span className="relative w-13 h-13 w-[52px] h-[52px] rounded-full bg-white/92 shadow-md flex items-center justify-center">
        <Icon name={icon} className="w-8 h-8" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#f2555a] text-white text-[10px] font-black flex items-center justify-center border-2 border-white/80">{badge}</span>
        )}
      </span>
      <span className="text-[10px] font-bold text-white drop-shadow">{label}</span>
    </button>
  );
}

/* 底部导航项 */
function DockItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 px-2.5 py-1 active:scale-90 transition-transform">
      <Icon name={icon} className="w-7 h-7" />
      <span className="text-[10px] font-bold text-[#4a6a8a]">{label}</span>
    </button>
  );
}
