/* 追逐相机：开局摇臂、车道跟随、受击震动、落地缓冲、车顶升降。 */
import * as THREE from 'three';
import type { Game } from './engine';

export class CameraRig {
  x = 0;
  elevation = 0;
  impact = 0;
  land = 0;
  time = 0;
  fov = 69;

  reset() {
    this.x = 0; this.elevation = 0; this.impact = 0; this.land = 0; this.time = 0; this.fov = 69;
  }

  event(name: string) {
    if (name === 'hit' || name === 'shieldHit') this.impact = 0.2;
    if (name === 'land') this.land = 0.035;
  }

  update(camera: THREE.PerspectiveCamera, game: Game, dt: number, opts: { intro?: number; over?: boolean; freeze?: boolean } = {}) {
    const { intro = 1, over = false, freeze = false } = opts;
    const damp = (a: number, b: number, k: number) => a + (b - a) * (1 - Math.exp(-k * dt));
    if (!freeze) {
      this.time += dt;
      this.x = damp(this.x, game.x * 0.21, 9);
      this.elevation = damp(this.elevation, game.floor * 0.82, 5);
      this.impact = Math.max(0, this.impact - dt);
      this.land = Math.max(0, this.land - dt * 0.12);
    }
    const eased = intro * intro * (3 - 2 * intro);
    const swing = 1 - eased;
    const speed = Math.max(0, Math.min(1, (game.speed - 28) / 20));
    const fov = 69 + speed * 4;
    this.fov = damp(this.fov, fov, 2.5);
    const shake = Math.sin(this.time * 68) * this.impact * 0.22;
    camera.fov = this.fov;
    camera.position.set(
      this.x + swing * 2.1 + shake,
      5.65 + this.elevation - swing * 0.65 - this.land + (over ? 0.6 : 0),
      8.7 + swing * 0.8 + (over ? 1.6 : 0),
    );
    camera.lookAt(this.x * (0.17 / 0.21), 1.05 + this.elevation + (over ? 0.8 : 0), -10);
    camera.updateProjectionMatrix();
  }
}
