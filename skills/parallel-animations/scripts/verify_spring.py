#!/usr/bin/env python3
"""
Parallel Animations Physics Verifier
Validates C0 and C1 continuity during mid-flight interruption,
overshoot percentage, and settling times for ColorOS & OriginOS presets.
"""

import math

class SpringSolver:
    def __init__(self, stiffness: float, damping: float, mass: float = 1.0):
        self.k = stiffness
        self.c = damping
        self.m = mass
        self.omega_n = math.sqrt(stiffness / mass)
        self.zeta = damping / (2 * math.sqrt(stiffness * mass))
        self.gamma = self.zeta * self.omega_n
        self.omega_d = self.omega_n * math.sqrt(1 - self.zeta ** 2) if self.zeta < 1.0 else 0.0

        self.target = 0.0
        self.x0 = 0.0
        self.v0 = 0.0
        self.start_t = 0.0
        self.is_active = False

    def retarget(self, new_target: float, t: float):
        if self.is_active:
            pos, vel = self.sample(t)
            self.x0 = pos - new_target
            self.v0 = vel
        else:
            self.x0 = self.target - new_target
            self.v0 = 0.0
        self.target = new_target
        self.start_t = t
        self.is_active = True

    def sample(self, t: float):
        tau = t - self.start_t
        if tau < 0:
            return self.target + self.x0, self.v0

        if self.zeta < 0.999:
            # Underdamped (OriginOS)
            exp_term = math.exp(-self.gamma * tau)
            cos_term = math.cos(self.omega_d * tau)
            sin_term = math.sin(self.omega_d * tau)
            c2 = (self.v0 + self.gamma * self.x0) / self.omega_d

            pos_offset = exp_term * (self.x0 * cos_term + c2 * sin_term)
            vel = exp_term * (self.v0 * cos_term - ((self.gamma * self.v0 + self.omega_n**2 * self.x0) / self.omega_d) * sin_term)
        elif self.zeta > 1.001:
            # Overdamped
            s = math.sqrt(self.zeta**2 - 1)
            r1 = -self.omega_n * (self.zeta - s)
            r2 = -self.omega_n * (self.zeta + s)
            c2 = (self.v0 - r1 * self.x0) / (r2 - r1)
            c1 = self.x0 - c2
            pos_offset = c1 * math.exp(r1 * tau) + c2 * math.exp(r2 * tau)
            vel = c1 * r1 * math.exp(r1 * tau) + c2 * r2 * math.exp(r2 * tau)
        else:
            # Critically Damped (ColorOS)
            exp_term = math.exp(-self.omega_n * tau)
            pos_offset = exp_term * (self.x0 + (self.v0 + self.omega_n * self.x0) * tau)
            vel = exp_term * (self.v0 - self.omega_n * (self.v0 + self.omega_n * self.x0) * tau)

        return self.target + pos_offset, vel


def run_test(name: str, stiffness: float, damping: float, mass: float = 1.0):
    print(f"\n{'='*60}")
    print(f"PROFILE TEST: {name}")
    print(f"{'='*60}")
    solver = SpringSolver(stiffness, damping, mass)
    print(f"Physics Parameters: k={stiffness}, c={damping}, m={mass}")
    print(f"Derived: Natural Frequency omega_n={solver.omega_n:.2f} rad/s, Damping Ratio zeta={solver.zeta:.4f}")

    # Step 1: Normal Launch from 0 to 1
    solver.retarget(1.0, 0.0)
    
    max_val = 0.0
    settle_t = None
    
    dt = 0.001 # 1ms resolution
    for i in range(1000):
        t = i * dt
        pos, vel = solver.sample(t)
        if pos > max_val:
            max_val = pos
        if settle_t is None and abs(pos - 1.0) < 0.005 and abs(vel) < 0.01 and t > 0.1:
            settle_t = t

    overshoot_pct = max(0.0, (max_val - 1.0) * 100)
    print(f"Launch to 1.0: Peak = {max_val:.4f} (Overshoot: {overshoot_pct:.2f}%)")
    print(f"Settling Time (within 0.5%): {settle_t*1000:.1f} ms" if settle_t else "Settling Time: > 1000 ms")

    # Step 2: Interruption Test at t = 120ms (Mid-flight retarget back to 0.0)
    solver2 = SpringSolver(stiffness, damping, mass)
    solver2.retarget(1.0, 0.0)
    t_int = 0.120 # 120 ms
    pos_before, vel_before = solver2.sample(t_int)

    # Retarget at t_int
    solver2.retarget(0.0, t_int)
    pos_after, vel_after = solver2.sample(t_int + 1e-9)

    c0_error = abs(pos_after - pos_before)
    c1_error = abs(vel_after - vel_before)

    print(f"\n--- Mid-Flight Interruption at t={t_int*1000:.0f} ms ---")
    print(f"Pre-interrupt:  x = {pos_before:.5f}, v = {vel_before:.5f} units/s")
    print(f"Post-interrupt: x = {pos_after:.5f}, v = {vel_after:.5f} units/s")
    print(f"C0 Positional Discontinuity: {c0_error:.2e} (Passed: {c0_error < 1e-4})")
    print(f"C1 Velocity Discontinuity:   {c1_error:.2e} (Passed: {c1_error < 1e-4})")

    assert c0_error < 1e-4, f"C0 continuity failed: {c0_error}"
    assert c1_error < 1e-4, f"C1 continuity failed: {c1_error}"
    print("STATUS: Seamless C1 phase-space continuity confirmed!")


if __name__ == '__main__':
    # 1. ColorOS Aurora Preset (Near Critical)
    run_test("ColorOS Aurora Engine", stiffness=380.0, damping=38.5, mass=1.0)

    # 2. OriginOS Ultra-Fluid Preset (Underdamped Elastic)
    run_test("OriginOS Ultra-Fluid Engine", stiffness=240.0, damping=27.5, mass=1.15)
