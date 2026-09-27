'use client';

/* 奶蛙桌宠组件：四形态帧动画播放器 + 桌宠交互（点击/连点/拖拽甩飞物理）。
 * 交互参数逐项对齐原版桌宠（43aquaris/naiwa · main.cpp）：
 *   - 单击 → smile（750ms 单次）
 *   - 1.5 秒内连点 5 次 → laugh（5667ms 单次，音效延迟 300ms 由音频层处理）
 *   - 拖拽松手 → 甩飞：重力 0.4px/f²、空气阻力 ×0.98/f、反弹保留 0.70、
 *     初速度取最近 100ms 轨迹；60fps 固定步长；物理量按显示高度比例缩放
 *   - 撞壁挤压：上下 0.40 / 左右 0.20，压缩 100ms + 复原 150ms
 *   - 身体碰撞盒取 idle 内容 bbox（占帧比例），避免透明留白先触壁
 */
import { useEffect, useRef, useState } from 'react';
import { PET, loadPetAtlas, petAtlas, type PetMood } from '@/game/pet';

export interface NaiwaPetProps {
  /** 当前情绪（父组件驱动，如游戏事件反应） */
  mood?: PetMood;
  /** 变化时重置播放（用于重复触发同一情绪） */
  nonce?: number;
  /** 显示高度 px */
  size?: number;
  /** 桌宠交互模式：渲染为覆盖父容器的自由层，可点击 / 拖拽甩飞 */
  interactive?: boolean;
  /** 交互层底边留白（px）——奶蛙会落在这条"地板"上，默认正好站在底部导航坞上 */
  floorOffset?: number;
  /** 初始落点横向比例（0~1，松手前会受重力落到地板） */
  initX?: number;
  /** 交互音效回调（由上层接入 GameAudio） */
  onEvent?: (e: 'smile' | 'laugh') => void;
  className?: string;
  /** 雪碧图未加载时的占位内容 */
  fallback?: React.ReactNode;
}

const FRAME_MS = 1000 / 60;
const CLICK_WINDOW = 1500;
const LAUGH_COUNT = 5;
const LAUGH_MS = 5667;
const SMILE_MS = 750;
const DRAG_THRESHOLD = 6;

/** 原版 laugh 显示尺寸：TARGET_W=180 → 高 718/518×180 ≈ 249.5px，物理常数基准 */
const REF_H = (718 / 518) * 180;

interface DragState {
  offX: number; offY: number;
  moved: number; t0: number; dragged: boolean;
  hist: { t: number; x: number; y: number }[];
}

export default function NaiwaPet({
  mood = 'idle',
  nonce = 0,
  size = 200,
  interactive = false,
  floorOffset = 76,
  initX = 0.16,
  onEvent,
  className,
  fallback,
}: NaiwaPetProps) {
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && !!petAtlas());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);

  const anim = useRef({ mood: 'idle' as PetMood, frame: 0, elapsed: 0 });
  const local = useRef<{ mood: PetMood; until: number } | null>(null);
  const moodRef = useRef(mood);
  const onEventRef = useRef(onEvent);
  const clicks = useRef<number[]>([]);
  const phys = useRef({
    x: 160, y: 200, vx: 0, vy: 0,
    drag: null as DragState | null,
    squish: null as null | { t: number; vertical: boolean },
  });
  const didInit = useRef(false);
  const nonceSeen = useRef<number | null>(null);

  useEffect(() => {
    if (ready) return;
    let alive = true;
    loadPetAtlas().then(img => { if (alive && img) setReady(true); });
    return () => { alive = false; };
  }, [ready]);

  /* props 同步到 ref（避免渲染期写入） */
  useEffect(() => { moodRef.current = mood; }, [mood]);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  /* nonce 变化：让位给游戏事件情绪并重置动画 */
  useEffect(() => {
    if (nonceSeen.current !== null && nonceSeen.current !== nonce) {
      local.current = null;
      anim.current = { mood: 'idle', frame: 0, elapsed: 0 };
    }
    nonceSeen.current = nonce;
  }, [nonce]);

  /* ---------- 渲染 + 物理主循环 ---------- */
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const img = petAtlas();
    const layer = layerRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const dispH = size;
    const dispW = size * (PET.frameW / PET.frameH);
    canvas.width = Math.round(dispW * dpr);
    canvas.height = Math.round(dispH * dpr);
    canvas.style.width = `${dispW}px`;
    canvas.style.height = `${dispH}px`;

    const k = dispH / REF_H;
    const GRAV = 0.4 * k, DRAG = 0.98, BOUNCE = 0.70, STOP = 0.5 * k, SIDE_STOP = 3 * k;

    /* 缓存容器尺寸（ResizeObserver + 拖拽开始时刷新） */
    let bounds = { w: 0, h: 0 };
    const refreshBounds = () => {
      if (!layer) return;
      const r = layer.getBoundingClientRect();
      bounds = { w: r.width, h: r.height };
    };
    refreshBounds();
    const ro = new ResizeObserver(refreshBounds);
    if (layer) ro.observe(layer);

    /* 交互模式：初始落点（左上方入场，受重力落到地板） */
    if (interactive && !didInit.current && bounds.w > 0) {
      didInit.current = true;
      phys.current.x = Math.max(dispW / 2 + 10, bounds.w * initX);
      phys.current.y = bounds.h * 0.3;
    }

    const effectiveMood = (): PetMood => {
      const l = local.current;
      if (l && performance.now() < l.until) return l.mood;
      local.current = null;
      return moodRef.current;
    };

    const squishScale = (now: number): [number, number] => {
      const s = phys.current.squish;
      if (!s) return [1, 1];
      const e = now - s.t;
      const amt = s.vertical ? 0.4 : 0.2;
      let sq: number, ex: number;
      if (e < 100) { const t = e / 100; sq = 1 - amt * t; ex = 1 + amt * t; }
      else if (e < 250) { const t = (e - 100) / 150; sq = (1 - amt) + amt * t; ex = (1 + amt) - amt * t; }
      else { phys.current.squish = null; return [1, 1]; }
      return s.vertical ? [ex, sq] : [sq, ex];   // [scaleX, scaleY]
    };

    const step = (now: number) => {
      const p = phys.current;

      /* 物理步进（固定 60Hz；拖拽中不做力累积，位置由指针直接驱动） */
      if (interactive && bounds.w > 0) {
        if (p.drag) {
          p.vx = 0; p.vy = 0;
        } else {
          p.vy += GRAV;
          p.vx *= DRAG; p.vy *= DRAG;
          p.x += p.vx; p.y += p.vy;
          const bl = p.x - dispW / 2 + PET.body.l * dispW;
          const br = p.x + dispW / 2 - PET.body.r * dispW;
          const bt = p.y - dispH / 2 + PET.body.t * dispH;
          const bb = p.y + dispH / 2 - PET.body.b * dispH;
          if (bl < 0) {
            p.x -= bl;
            p.vx = Math.abs(p.vx) < SIDE_STOP ? 0 : Math.abs(p.vx) * BOUNCE;
            p.squish = { t: now, vertical: false };
          } else if (br > bounds.w) {
            p.x -= br - bounds.w;
            p.vx = Math.abs(p.vx) < SIDE_STOP ? 0 : -Math.abs(p.vx) * BOUNCE;
            p.squish = { t: now, vertical: false };
          }
          if (bt < 0) {
            p.y -= bt;
            p.vy = Math.abs(p.vy) * BOUNCE;
            p.squish = { t: now, vertical: true };
          } else if (bb > bounds.h) {
            p.y -= bb - bounds.h;
            p.vy = Math.abs(p.vy) < STOP ? 0 : -Math.abs(p.vy) * BOUNCE;
            p.squish = { t: now, vertical: true };
          }
        }
      }

      /* 帧推进（12fps；情绪切换时从头播） */
      const m = effectiveMood();
      if (m !== anim.current.mood) anim.current = { mood: m, frame: 0, elapsed: 0 };
      anim.current.elapsed += FRAME_MS;
      if (anim.current.elapsed >= 1000 / PET.fps) {
        anim.current.elapsed -= 1000 / PET.fps;
        const def = PET.forms[anim.current.mood];
        if (anim.current.frame + 1 < def.frames) anim.current.frame++;
        else if (def.loop) anim.current.frame = 0;
        /* 单次形态停在末帧，由 local/props 到期回落 */
      }
    };

    const draw = (now: number) => {
      const def = PET.forms[anim.current.mood];
      const gi = def.start + Math.min(anim.current.frame, def.frames - 1);
      const col = gi % PET.cols, row = Math.floor(gi / PET.cols);
      const [sx, sy] = squishScale(now);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      const cx = canvas.width / 2, cy = canvas.height / 2;
      ctx.translate(cx, cy);
      ctx.scale(sx, sy);
      ctx.translate(-cx, -cy);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img,
        col * PET.frameW, row * PET.frameH, PET.frameW, PET.frameH,
        0, 0, canvas.width, canvas.height);
      ctx.restore();
    };

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      let dt = now - last;
      last = now;
      if (dt > 200) dt = 200;   // 页签切回时防止追帧爆发
      acc += dt;
      let n = 0;
      while (acc >= FRAME_MS && n++ < 12) { step(now); acc -= FRAME_MS; }
      if (interactive) {
        const p = phys.current;
        canvas.style.transform = `translate(${p.x - dispW / 2}px, ${p.y - dispH / 2}px)`;
        canvas.style.cursor = p.drag ? 'grabbing' : 'grab';
      }
      draw(now);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [ready, size, interactive, initX]);

  /* ---------- 交互绑定（仅 interactive） ---------- */
  const bindCanvas = (el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    if (!el || !interactive) return;
    const key = '__naiwaPetBound';
    if ((el as unknown as Record<string, unknown>)[key]) return;
    (el as unknown as Record<string, unknown>)[key] = true;

    const p = phys.current;
    const layerOf = () => layerRef.current;

    el.addEventListener('pointerdown', (ev: PointerEvent) => {
      ev.preventDefault();
      try { el.setPointerCapture(ev.pointerId); } catch { /* 合成事件 / 特殊输入设备 */ }
      const layer = layerOf();
      if (!layer) return;
      const lr = layer.getBoundingClientRect();
      /* offX/offY = 指针相对奶蛙中心的偏移（层坐标系） */
      p.drag = {
        offX: (ev.clientX - lr.left) - p.x,
        offY: (ev.clientY - lr.top) - p.y,
        moved: 0, t0: performance.now(), dragged: false,
        hist: [{ t: performance.now(), x: p.x, y: p.y }],
      };
      p.vx = 0; p.vy = 0;
    });

    el.addEventListener('pointermove', (ev: PointerEvent) => {
      const d = p.drag;
      const layer = layerOf();
      if (!d || !layer) return;
      const lr = layer.getBoundingClientRect();
      const nx = (ev.clientX - lr.left) - d.offX;
      const ny = (ev.clientY - lr.top) - d.offY;
      d.moved += Math.hypot(nx - p.x, ny - p.y);
      if (d.moved > DRAG_THRESHOLD) d.dragged = true;
      p.x = nx; p.y = ny;
      const now = performance.now();
      d.hist.push({ t: now, x: nx, y: ny });
      while (d.hist.length > 2 && now - d.hist[0].t > 100) d.hist.shift();
    });

    const finish = () => {
      const d = p.drag;
      if (!d) return;
      p.drag = null;
      const now = performance.now();

      if (!d.dragged && now - d.t0 < 500) {
        /* 点击：大笑期间忽略；连点 5 次大笑，否则微笑（与原版一致） */
        const busy = local.current?.mood === 'laugh' && now < local.current.until;
        if (!busy) {
          clicks.current = clicks.current.filter(t => now - t < CLICK_WINDOW);
          clicks.current.push(now);
          if (clicks.current.length >= LAUGH_COUNT) {
            clicks.current = [];
            local.current = { mood: 'laugh', until: now + LAUGH_MS };
            onEventRef.current?.('laugh');
          } else {
            local.current = { mood: 'smile', until: now + SMILE_MS };
            onEventRef.current?.('smile');
          }
        }
        return;
      }
      /* 甩飞：初速度 = 最近 100ms 位移 / 帧数（px/frame） */
      const h = d.hist;
      if (h.length >= 2) {
        const first = h[0];
        const dt = now - first.t;
        if (dt > 12) {
          const frames = dt / FRAME_MS;
          p.vx = (p.x - first.x) / frames;
          p.vy = (p.y - first.y) / frames;
        }
      }
    };
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
  };

  if (!ready) return <>{fallback ?? null}</>;

  if (interactive) {
    return (
      <div ref={layerRef} className={`absolute left-0 right-0 top-0 pointer-events-none overflow-hidden ${className ?? ''}`}
        style={{ bottom: floorOffset, zIndex: 15 }}>
        <canvas ref={bindCanvas} className="absolute left-0 top-0 pointer-events-auto touch-none select-none" style={{ willChange: 'transform' }} />
      </div>
    );
  }

  return (
    <div className={`inline-block leading-none ${className ?? ''}`} style={{ width: size * (PET.frameW / PET.frameH), height: size }}>
      <canvas ref={bindCanvas} className="block" />
    </div>
  );
}
