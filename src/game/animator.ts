/* 程序化角色动画：与原版 animateActor 逐行对齐的跑步循环 + 跳跃/滑铲混合 + 贴地采样。 */
import * as THREE from 'three';
import type { Actor } from './character';
import { runnerSkin } from './character';

/* 跑步循环关键帧（一个完整步态周期的关节角度，与原版一致） */
const hipKeys = [0.78, 0.3, -0.2, -0.6, -0.7, -0.12, 0.72, 1.03];
const kneeKeys = [-0.16, -0.35, -0.72, -0.7, -0.4, -1.3, -1.65, -0.82];
const ankleKeys = [-0.08, -0.05, 0.12, 0.3, 0.34, 0.5, 0.18, -0.22];

function cycle(keys: number[], p: number) {
  const u = (((p % 1) + 1) % 1) * keys.length;
  const i = Math.floor(u);
  const f = u - i;
  const N = keys.length;
  const p0 = keys[(i + N - 1) % N], p1 = keys[i], p2 = keys[(i + 1) % N], p3 = keys[(i + 2) % N];
  return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}

const rotQ = new THREE.Quaternion();
const rotE = new THREE.Euler();
const footV = new THREE.Vector3();

export type MotionMode = 'idle' | 'run' | 'jump' | 'slide';

export interface AnimateOptions {
  mode: MotionMode;
  active: boolean;
  speedNorm: number;   // 0~1 相对速度
  turnLean: number;    // 换道倾斜
  preview: boolean;
  time: number;
  dt: number;
  jumps?: number;      // 本次奔跑累计跳跃数（决定跳跃姿势风格）
}

/* 奶蛙主角动画 */
export function animateRunner(a: Actor, o: AnimateOptions) {
  const { model, bones } = a;
  if (o.active) {
    a.phase += o.dt * (1.85 + o.speedNorm * 0.48);
  }
  const p = a.phase;
  const angle = p * Math.PI * 2;
  const running = o.mode !== 'idle';

  const desiredJump = o.mode === 'jump' ? 1 : 0;
  const desiredSlide = o.mode === 'slide' ? 1 : 0;
  if (o.active) {
    a.jumpMix = THREE.MathUtils.damp(a.jumpMix, desiredJump, 20, o.dt);
    a.slideMix = THREE.MathUtils.damp(a.slideMix, desiredSlide, 28, o.dt);
    if (a.wasAir && !desiredJump) a.land = 0.11;
    a.land = Math.max(0, a.land - o.dt * 0.6);
    a.wasAir = !!desiredJump;
  }
  const jm = a.jumpMix, sm = a.slideMix;

  /* 恢复到静止姿态 */
  for (const b of Object.values(bones)) {
    b.object.quaternion.copy(b.restQ);
    b.object.position.copy(b.restP);
  }
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);

  /* 呼吸压缩与步态弹性 */
  const squash = running ? 0.018 * Math.cos(angle * 2) - a.land * 0.55 : 0.012 * Math.sin(o.time * 2);
  model.scale.set(1 - squash * 0.4, 1 + squash, 1 - squash * 0.3);

  /* 四肢：跑步循环 → 跳跃姿势 / 滑铲姿势混合 */
  const jumpStyle = (o.jumps ?? 0) % 3;
  for (const side of ['L', 'R'] as const) {
    const q = p + (side === 'L' ? 0 : 0.5);
    let hip = running ? cycle(hipKeys, q) : 0;
    let knee = running ? cycle(kneeKeys, q) : 0;
    const ankle = running ? cycle(ankleKeys, q) : 0;
    let arm = running ? -0.68 * Math.sin(q * Math.PI * 2 + 0.15) : 0.035 * Math.sin(o.time * 1.7);
    let elbow = running ? 0.94 + 0.21 * Math.sin(q * Math.PI * 2 - 0.25) : 0.08;

    /* 跳跃姿势（左右不对称增加活力，按跳跃次数轮换风格） */
    hip = THREE.MathUtils.lerp(hip, side === 'L' ? (jumpStyle === 1 ? 0.95 : 0.7) : (jumpStyle === 2 ? 0.8 : 0.32), jm);
    knee = THREE.MathUtils.lerp(knee, jumpStyle === 1 ? -1.45 : -1.18, jm);
    arm = THREE.MathUtils.lerp(arm, side === 'L' ? -0.85 : -0.55, jm);
    elbow = THREE.MathUtils.lerp(elbow, 0.95, jm);

    /* 滑铲姿势：收腿前扑 */
    hip = THREE.MathUtils.lerp(hip, 0.35, sm);
    knee = THREE.MathUtils.lerp(knee, -0.8, sm);
    arm = THREE.MathUtils.lerp(arm, 0.45, sm);
    elbow = THREE.MathUtils.lerp(elbow, 0.3, sm);
    knee -= a.land * 2;

    pose(bones, 'hip_' + side, hip);
    pose(bones, 'knee_' + side, knee);
    pose(bones, 'ankle_' + side, ankle * (1 - jm) * (1 - sm));
    pose(bones, 'arm_' + side, arm, 0, (side === 'L' ? -1 : 1) * (0.12 + 0.08 * sm + 0.16 * jm));
    pose(bones, 'elbow_' + side, elbow);
    pose(bones, 'hand_' + side, 0.04 * Math.sin(angle));
  }

  /* 躯干与头部（原版：head 的摆动在 Y 轴） */
  pose(bones, 'pelvis', 0, running ? Math.sin(angle) * 0.075 : 0, running ? Math.sin(angle) * 0.045 : 0);
  pose(bones, 'spine', -0.08 + 0.08 * sm, running ? -Math.sin(angle - 0.15) * 0.115 : 0, 0);
  pose(bones, 'head', 0.05 + 0.2 * sm, Math.sin(angle - 0.5) * 0.035, 0);
  pose(bones, 'tail', 0.03, Math.sin(angle - 0.7) * 0.16, 0);

  /* 滑铲：整体前倾 + 后移 */
  model.rotation.x = -0.1 - 1.47 * sm;
  model.rotation.z = o.preview ? 0 : -o.turnLean * 0.085;
  model.position.y = 0;
  model.position.z = 0.8 * sm;

  /* 待机小动作：呼吸 + 挥手 */
  if (!running) {
    model.rotation.x = 0;
    pose(bones, 'spine', 0.016 * Math.sin(o.time * 2), 0, 0);
    pose(bones, 'head', 0.025 * Math.sin(o.time * 1.2), 0.11 * Math.sin(o.time * 0.6), 0);
    const wave = Math.max(0, Math.sin(o.time * 0.6 - 1));
    pose(bones, 'arm_R', -0.15 * wave, 0, -0.55 * wave);
    pose(bones, 'elbow_R', 0.12 + 0.7 * wave, 0, 0);
    pose(bones, 'hand_R', 0.3 * wave * Math.sin(o.time * 7), 0, 0);
  }

  /* 贴地采样：取蒙皮后最低顶点，保证脚底贴住地面（原版一致） */
  a.root.updateMatrixWorld(true);
  const skin = a.outfit || runnerSkin(a);
  if (skin) {
    skin.skeleton.update();
    const count = skin.geometry.attributes.position.count;
    let ids: number[];
    if (sm > 0.05) {
      ids = a.surfaceSamples ?? (a.surfaceSamples = Array.from({ length: Math.ceil(count / 22) }, (_, i) => i * 22));
    } else {
      ids = a.footSamples ?? (a.footSamples = (() => {
        const ps = skin.geometry.attributes.position;
        const arr: number[] = [];
        for (let i = 0; i < count; i += 3) if (ps.getY(i) < 0.24) arr.push(i);
        return arr;
      })());
    }
    let lowest = Infinity;
    for (const i of ids) {
      skin.getVertexPosition(i, footV).applyMatrix4(skin.matrixWorld);
      lowest = Math.min(lowest, footV.y);
    }
    model.position.y += (a.root.position.y - lowest + 0.06) / a.root.scale.y;
  }
}

/* 四足追兵（公牛/小狗）动画 */
export function animateQuadruped(a: Actor, o: AnimateOptions, kind: 'bull' | 'dog') {
  const { model, bones } = a;
  if (o.active) a.phase += o.dt * (kind === 'dog' ? 2.4 : 1.85 + o.speedNorm * 0.48);
  const p = a.phase;
  const angle = p * Math.PI * 2;
  const running = o.mode !== 'idle';

  for (const b of Object.values(bones)) {
    b.object.quaternion.copy(b.restQ);
    b.object.position.copy(b.restP);
  }
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);

  const squash = running ? 0.014 * Math.cos(angle * 2) : 0.01 * Math.sin(o.time * 2);
  model.scale.set(1 - squash * 0.4, 1 + squash, 1 - squash * 0.3);

  for (const leg of ['front', 'back'] as const) {
    for (const side of ['L', 'R'] as const) {
      const q = p + (side === 'L' ? 0 : 0.5) + (leg === 'back' ? 0.42 : 0);
      pose(bones, `hip_${leg}_${side}`, running ? 0.68 * Math.sin(q * Math.PI * 2) : 0);
      pose(bones, `knee_${leg}_${side}`, running ? -0.25 - 0.7 * Math.max(0, Math.sin(q * Math.PI * 2 + 0.4)) : 0);
    }
  }
  pose(bones, 'head', running ? Math.sin(angle) * 0.04 : 0, 0, 0);
  if (kind === 'dog') {
    for (const side of ['L', 'R'] as const) {
      pose(bones, 'ear_' + side, Math.sin(angle - 0.7) * 0.23, 0, 0);
    }
    pose(bones, 'tail', Math.sin(angle * 0.6) * 0.12, 0, 0);
  }
  model.position.y = running ? 0.09 * (1 + Math.sin(angle * 2)) : 0;
  model.rotation.x = running ? -0.06 : 0;
}

function pose(bones: Record<string, { object: THREE.Object3D; restQ: THREE.Quaternion } | undefined>, name: string, x = 0, y = 0, z = 0) {
  const b = bones[name];
  if (!b) return;
  b.object.quaternion.copy(b.restQ).multiply(rotQ.setFromEuler(rotE.set(x, y, z)));
}
