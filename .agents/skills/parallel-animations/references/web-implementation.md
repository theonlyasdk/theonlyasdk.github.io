# Web & Frontend Implementation Guide for Parallel Animations

This reference provides production-ready architecture and patterns for implementing ColorOS/OriginOS-style parallel animations on the modern web (DOM, Canvas, WebGL, React, Vue, Svelte, or Vanilla TypeScript).

---

## 1. Architectural Components of a Parallel Web Engine

A complete parallel animation engine comprises five decoupled modules:

```mermaid
flowchart TD
    Input[Pointer / Gesture Input Track] -->|Instantaneous (x, y, v_x, v_y)| StateMachine[Interruptible State Machine]
    Trigger[UI Triggers / Click Events] -->|Launch / Dismiss Targets| StateMachine
    StateMachine -->|Spawn / Retarget Track| Scheduler[Concurrent RAF Scheduler]
    Scheduler -->|Independent Sub-Tracks| Solver[Analytical Spring Solver]
    Solver -->|Continuous Phase States| Compositor[GPU Matrix & Layer Compositor]
    Compositor -->|translate3d / scale / blur| Screen[Display Output 60/120Hz]
```

### Key Rules for Web Fluidity:
1. **Never use CSS `transition: all ...` or predetermined `cubic-bezier` for interruptible gestures**. CSS transitions cannot dynamically inherit non-zero entry velocities upon mid-flight property changes without sudden visual hitches.
2. **Drive transforms via inline `transform: translate3d(x, y, 0) scale(s)` or `transform: matrix3d(...)`** updated inside a single `requestAnimationFrame` dispatcher.
3. **Always isolate animating elements onto GPU compositor layers** using `will-change: transform, opacity; backface-visibility: hidden;`.
4. **Decouple layout calculation (FLIP read) from the render loop**. Read all bounding client rects (`getBoundingClientRect()`) once before launching, never during the per-frame tick.

---

## 2. Pointer Velocity Tracker (Exponential Moving Average)

Accurate velocity estimation at the moment the user lifts their finger (`pointerup` or `touchend`) is essential for $C^1$ continuity.

```typescript
export interface PointerSample {
  x: number;
  y: number;
  time: number;
}

export class VelocityTracker {
  private history: PointerSample[] = [];
  private readonly maxWindowMs = 80; // Only consider the last 80ms for instant velocity

  public addSample(x: number, y: number, time: number = performance.now()): void {
    this.history.push({ x, y, time });
    this.prune(time);
  }

  private prune(currentTime: number): void {
    while (this.history.length > 0 && currentTime - this.history[0].time > this.maxWindowMs) {
      this.history.shift();
    }
  }

  /**
   * Returns current velocity in pixels per second: { vx, vy }
   */
  public getVelocity(currentTime: number = performance.now()): { vx: number; vy: number } {
    this.prune(currentTime);
    if (this.history.length < 2) return { vx: 0, vy: 0 };

    const first = this.history[0];
    const last = this.history[this.history.length - 1];
    const dt = (last.time - first.time) / 1000; // seconds

    if (dt <= 0.001) return { vx: 0, vy: 0 };

    return {
      vx: (last.x - first.x) / dt,
      vy: (last.y - first.y) / dt
    };
  }

  public reset(): void {
    this.history = [];
  }
}
```

---

## 3. Analytical Spring Solver (Continuous Closed-Form)

An analytical solver calculates position and velocity at any arbitrary timestamp $t$ directly without step accumulation errors, making it immune to frame drop instability:

```typescript
export interface SpringConfig {
  stiffness: number; // k
  damping: number;   // c
  mass: number;      // m
}

export class Spring1D {
  private target: number = 0;
  private x0: number = 0;
  private v0: number = 0;
  private startTime: number = 0;

  private omegaN: number = 0;
  private zeta: number = 0;
  private gamma: number = 0;
  private omegaD: number = 0;

  constructor(private config: SpringConfig) {
    this.recomputeParameters();
  }

  public setConfig(config: SpringConfig): void {
    this.config = config;
    this.recomputeParameters();
  }

  private recomputeParameters(): void {
    const { stiffness, damping, mass } = this.config;
    this.omegaN = Math.sqrt(stiffness / mass);
    this.zeta = damping / (2 * Math.sqrt(stiffness * mass));
    this.gamma = this.zeta * this.omegaN;
    this.omegaD = this.zeta < 1.0 ? this.omegaN * Math.sqrt(1 - this.zeta * this.zeta) : 0;
  }

  /**
   * Retargets the spring with seamless continuity.
   * If already running, extracts instantaneous (x, v) as the new initial state.
   */
  public retarget(newTarget: number, now: number = performance.now()): void {
    if (this.startTime > 0) {
      const state = this.sample(now);
      this.x0 = state.position - newTarget;
      this.v0 = state.velocity;
    } else {
      this.x0 = this.x0 - newTarget;
    }
    this.target = newTarget;
    this.startTime = now;
  }

  /**
   * Samples state at timestamp `now`. Returns { position, velocity, isSettled }
   */
  public sample(now: number): { position: number; velocity: number; isSettled: boolean } {
    if (this.startTime === 0) {
      return { position: this.target, velocity: 0, isSettled: true };
    }

    const t = (now - this.startTime) / 1000; // to seconds
    if (t < 0) return { position: this.target + this.x0, velocity: this.v0, isSettled: false };

    let posOffset: number;
    let vel: number;

    if (this.zeta < 0.999) {
      // Underdamped (OriginOS profile)
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
      // Critically Damped (ColorOS Aurora profile)
      const exp = Math.exp(-this.omegaN * t);
      posOffset = exp * (this.x0 + (this.v0 + this.omegaN * this.x0) * t);
      vel = exp * (this.v0 - this.omegaN * (this.v0 + this.omegaN * this.x0) * t);
    }

    const currentPos = this.target + posOffset;
    const isSettled = Math.abs(posOffset) < 0.25 && Math.abs(vel) < 0.5;

    if (isSettled) {
      this.startTime = 0;
      return { position: this.target, velocity: 0, isSettled: true };
    }

    return { position: currentPos, velocity: vel, isSettled: false };
  }
}
```

---

## 4. Concurrent Multi-Track Parallel Animation Scheduler

To support opening or closing multiple windows concurrently without cross-blocking:

```typescript
export interface AnimationTrack {
  id: string;
  update: (now: number) => boolean; // returns true if still running, false if settled
}

export class ParallelScheduler {
  private tracks: Map<string, AnimationTrack> = new Map();
  private rafId: number | null = null;

  public registerTrack(id: string, update: (now: number) => boolean): void {
    this.tracks.set(id, { id, update });
    this.startLoop();
  }

  public cancelTrack(id: string): void {
    this.tracks.delete(id);
    if (this.tracks.size === 0) this.stopLoop();
  }

  private startLoop(): void {
    if (this.rafId !== null) return;
    const tick = (now: number) => {
      for (const [id, track] of this.tracks.entries()) {
        const active = track.update(now);
        if (!active) {
          this.tracks.delete(id);
        }
      }
      if (this.tracks.size > 0) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public getActiveCount(): number {
    return this.tracks.size;
  }
}
```

---

## 5. CSS & Hardware Acceleration Rules

To maintain a locked 120 FPS on high-refresh displays:

```css
/* Container layer isolation */
.parallel-surface {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
  will-change: transform, opacity, border-radius;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  contain: layout style paint;
}

/* Glassmorphism blur layer matching ColorOS / OriginOS */
.parallel-blur-backdrop {
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  background: rgba(25, 25, 30, 0.65);
}
```

### Matrix3D Transform Application
Instead of modulating `top`, `left`, `width`, and `height` (which forces expensive browser layout recalcs), apply FLIP geometry via 3D scale and translation:

$$\Delta x = x_{source} - x_{target}, \quad \Delta y = y_{source} - y_{target}$$
$$s_x = \frac{\text{width}_{source}}{\text{width}_{target}}, \quad s_y = \frac{\text{height}_{source}}{\text{height}_{target}}$$

Apply to the target window:
```typescript
element.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(${currentSx}, ${currentSy})`;
```
This restricts all per-frame calculation strictly to the GPU Compositor thread.
