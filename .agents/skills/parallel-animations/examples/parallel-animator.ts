/**
 * High-Performance Parallel Animation Engine
 * Inspired by ColorOS (Aurora Engine) & OriginOS (Ultra-Fluid Engine)
 *
 * Implements continuous phase-space dynamical systems, C1 velocity continuity,
 * interruptible gesture handoffs, and multi-track concurrency.
 */

export interface SpringParameters {
  stiffness: number; // k (N/m)
  damping: number;   // c (N*s/m)
  mass: number;      // m (kg)
}

export interface AnimationPreset extends SpringParameters {
  name: string;
  dampingRatio: number;
  settlingThreshold: number;
  velocityThreshold: number;
  description: string;
}

/**
 * Standard Presets calibrated to flagship mobile OS engines
 */
export const PRESETS: Record<string, AnimationPreset> = {
  ColorOS_Aurora: {
    name: 'ColorOS Aurora',
    stiffness: 380.0,
    damping: 38.5, // zeta ~= 0.988 (near critical, crisp, zero overshoot)
    mass: 1.0,
    dampingRatio: 0.988,
    settlingThreshold: 0.25,
    velocityThreshold: 0.5,
    description: 'Crisp, immediate, zero-overshoot velocity tracking'
  },
  OriginOS_Fluid: {
    name: 'OriginOS Ultra-Fluid',
    stiffness: 240.0,
    damping: 27.5, // zeta ~= 0.828 (controlled elastic tactile bounce)
    mass: 1.15,
    dampingRatio: 0.828,
    settlingThreshold: 0.35,
    velocityThreshold: 0.8,
    description: 'Tactile, organic, gentle elastic rebound'
  },
  iOS_Snappy: {
    name: 'iOS Snappy',
    stiffness: 320.0,
    damping: 31.0, // zeta ~= 0.866
    mass: 1.0,
    dampingRatio: 0.866,
    settlingThreshold: 0.3,
    velocityThreshold: 0.6,
    description: 'Balanced fluid response with subtle cushioning'
  }
};

/**
 * High-precision pointer velocity estimator with exponential moving average
 */
export class VelocityTracker {
  private samples: Array<{ x: number; y: number; t: number }> = [];
  private readonly maxAgeMs: number = 75;

  public addPoint(x: number, y: number, time: number = performance.now()): void {
    this.samples.push({ x, y, t: time });
    this.trim(time);
  }

  private trim(now: number): void {
    while (this.samples.length > 0 && now - this.samples[0].t > this.maxAgeMs) {
      this.samples.shift();
    }
  }

  public getVelocity(now: number = performance.now()): { vx: number; vy: number } {
    this.trim(now);
    if (this.samples.length < 2) return { vx: 0, vy: 0 };
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0.001) return { vx: 0, vy: 0 };
    return {
      vx: (last.x - first.x) / dt,
      vy: (last.y - first.y) / dt
    };
  }

  public clear(): void {
    this.samples = [];
  }
}

export interface SpringSample {
  value: number;
  velocity: number;
  isSettled: boolean;
}

/**
 * Closed-form analytical spring solver supporting seamless mid-flight retargeting
 */
export class AnalyticalSpring1D {
  private target: number = 0;
  private x0: number = 0; // displacement offset: (initial_pos - target)
  private v0: number = 0; // initial velocity
  private startTime: number = 0;

  private omegaN: number = 0;
  private zeta: number = 0;
  private gamma: number = 0;
  private omegaD: number = 0;

  constructor(
    private params: SpringParameters,
    private settlingEpsilon: number = 0.25,
    private velocityEpsilon: number = 0.5
  ) {
    this.recompute();
  }

  public updateParameters(params: SpringParameters): void {
    this.params = params;
    this.recompute();
  }

  private recompute(): void {
    const { stiffness, damping, mass } = this.params;
    this.omegaN = Math.sqrt(stiffness / mass);
    this.zeta = damping / (2 * Math.sqrt(stiffness * mass));
    this.gamma = this.zeta * this.omegaN;
    this.omegaD = this.zeta < 1.0 ? this.omegaN * Math.sqrt(1 - this.zeta * this.zeta) : 0;
  }

  /**
   * Seamlessly retargets the spring. If an animation is already in motion,
   * its exact instantaneous position and velocity become the new starting conditions (C1 continuity).
   */
  public retarget(newTarget: number, now: number = performance.now(), overrideVelocity?: number): void {
    if (this.startTime > 0) {
      const current = this.sample(now);
      this.x0 = current.value - newTarget;
      this.v0 = overrideVelocity !== undefined ? overrideVelocity : current.velocity;
    } else {
      this.x0 = this.target - newTarget;
      this.v0 = overrideVelocity !== undefined ? overrideVelocity : 0;
    }
    this.target = newTarget;
    this.startTime = now;
  }

  /**
   * Direct position teleport without velocity
   */
  public snapTo(pos: number): void {
    this.target = pos;
    this.x0 = 0;
    this.v0 = 0;
    this.startTime = 0;
  }

  public sample(now: number): SpringSample {
    if (this.startTime === 0) {
      return { value: this.target, velocity: 0, isSettled: true };
    }

    const t = (now - this.startTime) / 1000; // in seconds
    if (t < 0) return { value: this.target + this.x0, velocity: this.v0, isSettled: false };

    let posOffset: number;
    let vel: number;

    if (this.zeta < 0.999) {
      // Underdamped (OriginOS)
      const exp = Math.exp(-this.gamma * t);
      const cos = Math.cos(this.omegaD * t);
      const sin = Math.sin(this.omegaD * t);
      const c2 = (this.v0 + this.gamma * this.x0) / this.omegaD;

      posOffset = exp * (this.x0 * cos + c2 * sin);
      vel = exp * (this.v0 * cos - ((this.gamma * this.v0 + this.omegaN * this.omegaN * this.x0) / this.omegaD) * sin);
    } else if (this.zeta > 1.001) {
      // Overdamped
      const s = Math.sqrt(this.zeta * this.zeta - 1);
      const r1 = -this.omegaN * (this.zeta - s);
      const r2 = -this.omegaN * (this.zeta + s);
      const c2 = (this.v0 - r1 * this.x0) / (r2 - r1);
      const c1 = this.x0 - c2;

      posOffset = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
      vel = c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t);
    } else {
      // Critically Damped (ColorOS)
      const exp = Math.exp(-this.omegaN * t);
      posOffset = exp * (this.x0 + (this.v0 + this.omegaN * this.x0) * t);
      vel = exp * (this.v0 - this.omegaN * (this.v0 + this.omegaN * this.x0) * t);
    }

    const value = this.target + posOffset;
    const isSettled = Math.abs(posOffset) < this.settlingEpsilon && Math.abs(vel) < this.velocityEpsilon;

    if (isSettled) {
      this.startTime = 0;
      return { value: this.target, velocity: 0, isSettled: true };
    }

    return { value, velocity: vel, isSettled: false };
  }

  public getTarget(): number {
    return this.target;
  }
}

export interface ParallelTransformState {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  cornerRadius: number;
  opacity: number;
  blur: number;
}

/**
 * 2D Spatial Spring Animator representing a physical UI surface (Window / Card)
 */
export class ParallelSurfaceAnimator {
  public readonly springX: AnalyticalSpring1D;
  public readonly springY: AnalyticalSpring1D;
  public readonly springSx: AnalyticalSpring1D;
  public readonly springSy: AnalyticalSpring1D;
  public readonly springRadius: AnalyticalSpring1D;
  public readonly springAlpha: AnalyticalSpring1D;

  constructor(preset: AnimationPreset) {
    this.springX = new AnalyticalSpring1D(preset, preset.settlingThreshold, preset.velocityThreshold);
    this.springY = new AnalyticalSpring1D(preset, preset.settlingThreshold, preset.velocityThreshold);
    this.springSx = new AnalyticalSpring1D(preset, 0.001, 0.005);
    this.springSy = new AnalyticalSpring1D(preset, 0.001, 0.005);
    this.springRadius = new AnalyticalSpring1D(preset, 0.5, 1.0);
    this.springAlpha = new AnalyticalSpring1D(preset, 0.005, 0.01);
  }

  public applyPreset(preset: AnimationPreset): void {
    this.springX.updateParameters(preset);
    this.springY.updateParameters(preset);
    this.springSx.updateParameters(preset);
    this.springSy.updateParameters(preset);
    this.springRadius.updateParameters(preset);
    this.springAlpha.updateParameters(preset);
  }

  public animateTo(
    target: Partial<ParallelTransformState>,
    now: number = performance.now(),
    initialVelocities?: Partial<{ vx: number; vy: number; vsx: number; vsy: number }>
  ): void {
    if (target.x !== undefined) this.springX.retarget(target.x, now, initialVelocities?.vx);
    if (target.y !== undefined) this.springY.retarget(target.y, now, initialVelocities?.vy);
    if (target.scaleX !== undefined) this.springSx.retarget(target.scaleX, now, initialVelocities?.vsx);
    if (target.scaleY !== undefined) this.springSy.retarget(target.scaleY, now, initialVelocities?.vsy);
    if (target.cornerRadius !== undefined) this.springRadius.retarget(target.cornerRadius, now);
    if (target.opacity !== undefined) this.springAlpha.retarget(target.opacity, now);
  }

  public sample(now: number): { state: ParallelTransformState; isSettled: boolean; velocities: { vx: number; vy: number } } {
    const sx = this.springX.sample(now);
    const sy = this.springY.sample(now);
    const ssx = this.springSx.sample(now);
    const ssy = this.springSy.sample(now);
    const sr = this.springRadius.sample(now);
    const sa = this.springAlpha.sample(now);

    const isSettled = sx.isSettled && sy.isSettled && ssx.isSettled && ssy.isSettled && sr.isSettled && sa.isSettled;

    return {
      state: {
        x: sx.value,
        y: sy.value,
        scaleX: ssx.value,
        scaleY: ssy.value,
        cornerRadius: Math.max(0, sr.value),
        opacity: Math.min(1, Math.max(0, sa.value)),
        blur: Math.max(0, (1 - sa.value) * 16)
      },
      isSettled,
      velocities: {
        vx: sx.velocity,
        vy: sy.velocity
      }
    };
  }
}

/**
 * Concurrent Multi-Track Parallel Animation Engine
 */
export class ParallelAnimationEngine {
  private surfaces: Map<string, { animator: ParallelSurfaceAnimator; onUpdate: (s: ParallelTransformState) => void; onSettle?: () => void }> = new Map();
  private rafId: number | null = null;
  private currentPreset: AnimationPreset = PRESETS.ColorOS_Aurora;

  public setPreset(preset: AnimationPreset): void {
    this.currentPreset = preset;
    for (const surface of this.surfaces.values()) {
      surface.animator.applyPreset(preset);
    }
  }

  public getPreset(): AnimationPreset {
    return this.currentPreset;
  }

  public registerSurface(
    id: string,
    initialState: ParallelTransformState,
    onUpdate: (state: ParallelTransformState) => void,
    onSettle?: () => void
  ): ParallelSurfaceAnimator {
    const animator = new ParallelSurfaceAnimator(this.currentPreset);
    animator.springX.snapTo(initialState.x);
    animator.springY.snapTo(initialState.y);
    animator.springSx.snapTo(initialState.scaleX);
    animator.springSy.snapTo(initialState.scaleY);
    animator.springRadius.snapTo(initialState.cornerRadius);
    animator.springAlpha.snapTo(initialState.opacity);

    this.surfaces.set(id, { animator, onUpdate, onSettle });
    onUpdate(initialState);
    return animator;
  }

  public getSurface(id: string): ParallelSurfaceAnimator | undefined {
    return this.surfaces.get(id)?.animator;
  }

  public animateSurface(
    id: string,
    target: Partial<ParallelTransformState>,
    initialVelocities?: Partial<{ vx: number; vy: number }>
  ): void {
    const entry = this.surfaces.get(id);
    if (!entry) return;

    entry.animator.animateTo(target, performance.now(), initialVelocities);
    this.startLoop();
  }

  private startLoop(): void {
    if (this.rafId !== null) return;

    const tick = (now: number) => {
      let anyActive = false;

      for (const [id, entry] of this.surfaces.entries()) {
        const { state, isSettled } = entry.animator.sample(now);
        entry.onUpdate(state);

        if (!isSettled) {
          anyActive = true;
        } else if (entry.onSettle) {
          entry.onSettle();
        }
      }

      if (anyActive) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }

  public stopAll(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public getActiveTrackCount(): number {
    let count = 0;
    const now = performance.now();
    for (const entry of this.surfaces.values()) {
      const sample = entry.animator.sample(now);
      if (!sample.isSettled) count++;
    }
    return count;
  }
}
