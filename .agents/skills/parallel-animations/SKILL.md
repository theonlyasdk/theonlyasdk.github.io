---
name: parallel-animations
description: >-
  Design, architect, and implement high-performance, non-blocking parallel animations
  inspired by OPPO ColorOS (Aurora Engine) and vivo OriginOS (Ultra-Fluid Engine).
  Covers interruptible gesture state machines, momentum conservation (C1 continuity),
  spring-damper dynamics, concurrent multi-track animation loops, and shared-element
  transitions for Web, Android Compose, and cross-platform UI engines.
  Optimized for GLM 5.3 and agentic code generation.
---

# Parallel Animations Skill (ColorOS & OriginOS Architecture)

This skill provides comprehensive instructions, physical models, and implementation patterns for generating **Parallel Animations**—the fluid, interruptible, multi-tasking UI animation architecture pioneered by OPPO ColorOS (Aurora & Luminous Engines) and vivo OriginOS (Origin Smooth & Atomic Engines).

```
Traditional Serial Animation:
[ Event A ] ---> [ Animation A (Blocking Queue) ] ---> [ Finish ] ---> [ Event B ]
                               ^
                  Interruption | (Stutter / Hard Halt / Frame Drop)

Parallel Animation (ColorOS / OriginOS):
[ Event A ] ---> [ Animation Track A (Non-blocking) ] ==========> [ Natural Settle ]
                         |
  Mid-Flight Interrupt   | (C1 Velocity Vector Handoff)
                         v
[ Event B ] ---> [ Animation Track B (Concurrent)   ] ==========> [ Natural Settle ]
```

---

## 1. When to Use This Skill

Activate this skill when:
- Designing or implementing **interruptible mobile/web gestures** (swiping away an app or modal while it is still expanding).
- Building **high-performance UI transitions** that must maintain a locked 60/120 FPS under rapid user input.
- Creating **multi-app or multi-window concurrent transitions** where opening a new element does not freeze or abruptly cancel existing elements.
- Simulating or implementing physical motion models inspired by **ColorOS Aurora**, **OriginOS Smooth**, or **iOS fluid springs**.
- Directing **GLM 5.3** (or any LLM) to generate interactive UI artifacts, prototypes, or production-grade gesture components.

---

## 2. Core Architectural Pillars

### Pillar 1: Decoupled Input & Render Dispatch
Never block pointer or gesture events on the rendering timeline. In traditional UI, if a transition takes 300ms, incoming touches during that window either queue up or abort the running transition. In parallel architecture:
- Pointer input runs in an unconstrained event loop, capturing instantaneous coordinate history $(x, y, t)$.
- Active visual surfaces run on independent, concurrent animation tracks managed by a central scheduler.

### Pillar 2: $C^1$ Continuity (Momentum Conservation)
When an animation is interrupted mid-flight:
1. **Sample Phase State**: Retrieve current position $x(t_{int})$ and instantaneous velocity $\dot{x}(t_{int})$.
2. **Phase-Space Handoff**: Feed $(x(t_{int}), \dot{x}(t_{int}))$ directly as the initial condition $(x_0, v_0)$ of the new destination trajectory.
3. **Zero Acceleration Shock**: Because the velocity derivative is preserved, the human eye perceives zero visual hitch or sudden jump.

### Pillar 3: Multi-Element Concurrency
Each animated surface (app window, floating sheet, folder expansion, background blur layer) executes as an independent differential equation. If a user taps App B while App A is collapsing, both tracks run simultaneously on separate GPU composite layers.

---

## 3. Physical Profiles: ColorOS vs. OriginOS

| Profile | Stiffness ($k$) | Damping ($c$) | Damping Ratio ($\zeta$) | Behavior & Tactile Feel |
| :--- | :--- | :--- | :--- | :--- |
| **ColorOS Aurora** | $380\text{ N/m}$ | $38.5\text{ N}\cdot\text{s/m}$ | $\approx 0.988$ (Near-Critical) | **Crisp, immediate, zero-overshoot**. Immediate direction reversal with 100% velocity vector handoff. |
| **OriginOS Ultra-Fluid** | $240\text{ N/m}$ | $27.5\text{ N}\cdot\text{s/m}$ | $\approx 0.828$ (Underdamped) | **Tactile "Q-elastic" bounce**. Controlled $4-8\%$ elastic settle, organic curvilinear cushioning. |
| **iOS Classic** | $320\text{ N/m}$ | $31.0\text{ N}\cdot\text{s/m}$ | $\approx 0.866$ (Sub-Critical) | Balanced fluid response with subtle deceleration curve. |

> Detailed formulas and comparisons are documented in:
> - [Physics Engine Reference](./references/physics-engine.md)
> - [ColorOS vs. OriginOS Architecture Reference](./references/coloros-vs-originos.md)

---

## 4. Analytical Spring Equation (Closed-Form)

For real-time code generation, implement the closed-form analytical solution rather than numerical Euler integration. This ensures absolute mathematical stability regardless of frame drops or variable refresh rates ($60\text{Hz} \leftrightarrow 120\text{Hz}$).

Given displacement $x_0 = x(t_{int}) - x^*$, velocity $v_0 = \dot{x}(t_{int})$, $\omega_n = \sqrt{k/m}$, $\gamma = \zeta\omega_n$, and $\omega_d = \omega_n\sqrt{1-\zeta^2}$:

### Underdamped ($\zeta < 1$, OriginOS):
$$x(t) = x^* + e^{-\gamma t} \left[ x_0 \cos(\omega_d t) + \frac{v_0 + \gamma x_0}{\omega_d} \sin(\omega_d t) \right]$$
$$\dot{x}(t) = e^{-\gamma t} \left[ v_0 \cos(\omega_d t) - \left( \frac{\gamma v_0 + \omega_n^2 x_0}{\omega_d} \right) \sin(\omega_d t) \right]$$

### Critically Damped ($\zeta = 1$, ColorOS):
$$x(t) = x^* + e^{-\omega_n t} \left[ x_0 + (v_0 + \omega_n x_0) t \right]$$
$$\dot{x}(t) = e^{-\omega_n t} \left[ v_0 - \omega_n (v_0 + \omega_n x_0) t \right]$$

---

## 5. GLM 5.3 Code Generation Instructions

When asking **GLM 5.3** or generating code for parallel animation tasks, follow these strict directives:

### 1. Avoid Parametric Bezier Transitions
Do NOT generate `transition: all 0.3s cubic-bezier(...)` for gesture-driven components. CSS transitions cannot dynamically inherit non-zero entry velocity vectors mid-flight without snapping.

### 2. Isolate to GPU Compositing
Drive all visual movements strictly via `transform: translate3d(...) scale(...)` and `opacity`. Never animate `top`, `left`, `width`, or `height` inside the per-frame tick (which triggers expensive browser reflow). Always add:
```css
will-change: transform, opacity;
backface-visibility: hidden;
contain: layout style paint;
```

### 3. Implement the High-Precision Velocity Tracker
Always calculate release velocity using an exponential moving average (EMA) over the last $60-80\text{ ms}$ of pointer points. A single $\Delta y / \Delta t$ step is noisy and prone to jitter.

### 4. Structure as Multi-Track Concurrent Scheduler
Maintain a `Map<string, AnimationTrack>` managed by a single `requestAnimationFrame` loop. Each track must independently report when its energy falls below perceptual thresholds:
$$|x(t) - x^*| < 0.25\text{ px} \quad \text{AND} \quad |\dot{x}(t)| < 0.5\text{ px/s}$$

---

## 6. Implementation References & Ready-to-Use Assets

The following files provide complete, verified implementations:

- **Interactive Sandbox**:
  [interactive-demo.html](./examples/interactive-demo.html) — Single-file simulation of mobile OS launcher, live mid-flight interruption, multi-app parallel stress tests, and real-time physics oscilloscope.
- **Production TypeScript Engine**:
  [parallel-animator.ts](./examples/parallel-animator.ts) — Zero-dependency TypeScript library featuring `AnalyticalSpring1D`, `VelocityTracker`, and `ParallelAnimationEngine`.
- **Mathematical Verification Script**:
  [verify_spring.py](./scripts/verify_spring.py) — Python test script validating $C^0$ and $C^1$ continuity, overshoot, and settling thresholds.
- **Platform Guides**:
  - [Web & Frontend Guide](./references/web-implementation.md)
  - [Android Jetpack Compose Guide](./references/android-compose.md)

---

## 7. Verification Checklist for Parallel Animations

When reviewing or testing any parallel animation implementation:
- [ ] **Mid-Flight Interruption**: Can an element opening animation be reversed halfway through without a position jump or velocity halt?
- [ ] **$C^1$ Smoothness**: Does the velocity curve transition smoothly without infinite acceleration ($\Delta v = 0$ at interruption point)?
- [ ] **Multi-App Concurrency**: Can the user trigger two animations in rapid succession without one freezing or abruptly disappearing?
- [ ] **GPU Acceleration**: Are transforms restricted to `translate3d` and `scale`? (Check Chrome DevTools Performance panel for layout thrashing).
- [ ] **Settling Clamping**: Does the animation loop cleanly terminate (`cancelAnimationFrame`) when displacement and velocity fall below epsilon?
