# Physics & Mathematical Foundation of Parallel Animations

In modern mobile user interfaces (exemplified by OPPO ColorOS Aurora Engine and vivo OriginOS Ultra-Fluid Engine), fluid animations are fundamentally governed by **continuous physical dynamical systems** rather than predetermined parametric curve timers (such as cubic bezier easings).

When an animation is triggered while another is active—or when a user touch interrupts a running transition—a parametric curve either abruptly snaps to the new destination (discontinuous position $C^0$) or resets its velocity to zero (discontinuous velocity $C^1$), creating an unpleasant visual "jerk" or stutter.

Parallel animation solves this by modeling all animated properties as continuous state vectors governed by second-order differential equations.

---

## 1. The Damped Harmonic Oscillator Model

Any animated scalar property $x(t)$ (position, scale, opacity, corner radius, blur radius) moving toward an equilibrium target $x^*$ is modeled as a damped spring-mass-damper system:

$$m \frac{d^2 x}{dt^2} + c \frac{dx}{dt} + k(x - x^*) = 0$$

Where:
- $m$: Mass of the virtual object ($kg$ or virtual units, typically normalized to $m = 1.0$)
- $c$: Viscous damping coefficient ($N \cdot s / m$)
- $k$: Spring stiffness / constant ($N / m$)
- $x^*$: Target resting position

### Standard Form Representation

Dividing through by $m$:

$$\ddot{x}(t) + 2\zeta\omega_n \dot{x}(t) + \omega_n^2 (x(t) - x^*) = 0$$

Where:
- **Natural Angular Frequency**:
  $$\omega_n = \sqrt{\frac{k}{m}}$$
  Controls how quickly the system reacts and the frequency of oscillation.
- **Damping Ratio**:
  $$\zeta = \frac{c}{2\sqrt{km}} = \frac{c}{2m\omega_n}$$
  Controls the qualitative nature of the motion (overshoot vs. sluggishness).

---

## 2. Classification by Damping Ratio ($\zeta$)

The roots of the characteristic equation $r^2 + 2\zeta\omega_n r + \omega_n^2 = 0$ determine three distinct motion regimes:

### A. Underdamped ($\zeta < 1$) — Typical of OriginOS "Q-Elastic" Feel
The roots are complex conjugates: $r_{1,2} = -\gamma \pm i \omega_d$, where:
- Damping factor: $\gamma = \zeta \omega_n$
- Damped angular frequency: $\omega_d = \omega_n \sqrt{1 - \zeta^2}$

Given initial displacement $x_0 = x(0) - x^*$ and initial velocity $v_0 = \dot{x}(0)$:

$$x(t) = x^* + e^{-\gamma t} \left[ x_0 \cos(\omega_d t) + \frac{v_0 + \gamma x_0}{\omega_d} \sin(\omega_d t) \right]$$

The instantaneous velocity is the exact time derivative:

$$\dot{x}(t) = e^{-\gamma t} \left[ v_0 \cos(\omega_d t) - \left( \frac{\gamma v_0 + \omega_n^2 x_0}{\omega_d} \right) \sin(\omega_d t) \right]$$

*Characteristics*: Delivers an organic, tactile "settling bounce". OriginOS tunes $\zeta \approx 0.78 - 0.86$ to give widgets and app windows physical elasticity without feeling cartoonish.

### B. Critically Damped ($\zeta = 1$) — Typical of ColorOS Aurora Engine
The roots are real and repeated: $r = -\omega_n$.

$$x(t) = x^* + e^{-\omega_n t} \left[ x_0 + (v_0 + \omega_n x_0) t \right]$$

Instantaneous velocity:

$$\dot{x}(t) = e^{-\omega_n t} \left[ v_0 - \omega_n (v_0 + \omega_n x_0) t \right]$$

*Characteristics*: The fastest possible return to equilibrium with strictly **zero overshoot**. ColorOS tunes $\zeta \approx 0.98 - 1.02$ for assertive, instant, crisp responsiveness.

### C. Overdamped ($\zeta > 1$) — Used for Heavy Background Elements / Dismissals
The roots are real and distinct: $r_{1,2} = -\zeta\omega_n \pm \omega_n\sqrt{\zeta^2 - 1}$.

$$x(t) = x^* + c_1 e^{r_1 t} + c_2 e^{r_2 t}$$

Where:
$$c_1 = \frac{v_0 - r_2 x_0}{r_1 - r_2}, \quad c_2 = \frac{r_1 x_0 - v_0}{r_1 - r_2}$$

---

## 3. The Interruption Theorem & $C^1$ Continuity

Why do traditional animations fail upon user interruption?
Consider an animation running along a cubic bezier $B(t)$ interrupted at time $t_{int}$:
1. **$C^0$ Discontinuity (Positional Jump)**: If the system restarts the animation from initial layout coordinates, the visual element jumps instantaneously across screen space ($x(t_{int}^-) \neq x(t_{int}^+)$).
2. **$C^1$ Discontinuity (Velocity Shock)**: If the system adopts the current position $x(t_{int})$ but resets velocity $\dot{x}(t_{int}^+) = 0$, the momentum of the user's gesture or the preceding transition is instantly destroyed. To the human eye (which detects velocity derivative changes / acceleration shocks), this registers as a stutter or frame drop.

### The Parallel Animation Continuity Condition

To achieve seamless parallel interruption, the state vector at the handoff instant $t_{int}$ must satisfy:

$$\lim_{t \to t_{int}^-} \mathbf{S}(t) = \lim_{t \to t_{int}^+} \mathbf{S}(t)$$

Where $\mathbf{S}(t) = \begin{bmatrix} x(t) \\ \dot{x}(t) \end{bmatrix}$ is the phase space state vector.

When an interrupt occurs:
1. Sample current position: $x_{new\_0} = x(t_{int})$
2. Sample current velocity: $v_{new\_0} = \dot{x}(t_{int})$ (or blend with incoming touch velocity $v_{gesture}$)
3. Set new target: $x_{new}^*$
4. Initialize the new closed-form spring equation using $(x_{new\_0}, v_{new\_0})$ with $t'=0$.

Because the spring equation natively accepts non-zero initial velocity $v_0$, the acceleration is bounded and velocity is strictly continuous ($C^1$ smoothness).

---

## 4. Phase-Space Vector Blending (Gesture Handoff)

When an animation is interrupted by a physical finger gesture (e.g., catching an opening app mid-flight and flinging it back):

$$\mathbf{v}_{initial} = \alpha \mathbf{v}_{animation}(t_{int}) + (1 - \alpha) \mathbf{v}_{touch}$$

- If the user simply touches and holds: $\mathbf{v}_{initial} = 0$, and the system locks to finger translation.
- If the user swipes in mid-air (flick interruption): $\mathbf{v}_{touch}$ is calculated via a weighted exponential moving average (EMA) of pointer positions over the last $60-100\text{ ms}$:

$$\bar{v}_k = \beta v_k + (1 - \beta) \bar{v}_{k-1}, \quad \text{where } \beta = 1 - e^{-\Delta t / \tau}$$

---

## 5. Non-Linear Boundary Physics (Rubber-Banding)

When an element is dragged beyond its valid bounds (e.g., pulling down a page past its top boundary), linear springs cause excessive displacement. OriginOS and ColorOS implement asymptotic boundary resistance:

$$d(x) = \frac{x}{1 + \mu \frac{|x|}{L}}$$

Where:
- $x$: Pointer drag distance beyond boundary
- $L$: Screen dimension (height or width)
- $\mu$: Resistance factor ($\approx 0.55$)
- $d(x)$: Actual element displacement (asymptotic limit $d \to L/\mu$)

When released, the release velocity $v_{release}$ and displacement $d(x)$ feed into an underdamped return spring.

---

## 6. Settling Time and Energy Thresholds

In digital rendering, a spring theoretically oscillates indefinitely towards $t \to \infty$. To avoid continuous GPU/CPU wakeups, an animation is declared **settled** when both displacement error and velocity fall beneath perceptual thresholds:

$$|x(t) - x^*| < \epsilon_x \quad \text{AND} \quad |\dot{x}(t)| < \epsilon_v$$

Recommended perceptual thresholds for display hardware:
- Screen translation: $\epsilon_x = 0.25\text{ px}$, $\epsilon_v = 0.5\text{ px/s}$
- Scale ($1.0 = 100\%$): $\epsilon_s = 0.001$, $\epsilon_{vs} = 0.002\text{ /s}$
- Opacity ($0.0 - 1.0$): $\epsilon_\alpha = 0.005$, $\epsilon_{v\alpha} = 0.01\text{ /s}$
