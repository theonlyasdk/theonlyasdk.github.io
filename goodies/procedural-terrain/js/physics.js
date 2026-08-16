/**
 * Physics & Projectile Interaction Manager
 * Handles continuous swept collision detection, rock throwing, slope normal reflection,
 * dynamic bouncing, terrain dust particles, and water ripple splashes.
 */

class PhysicsManager {
  constructor(scene, camera, terrainGenerator, waterManager) {
    this.scene = scene;
    this.camera = camera;
    this.generator = terrainGenerator;
    this.water = waterManager;

    this.stones = [];
    this.splashes = [];
    this.dustPuffs = [];

    this.stoneGeo = new THREE.SphereGeometry(0.35, 10, 10);
    this.stoneMat = new THREE.MeshStandardMaterial({
      color: 0x4a453f,
      roughness: 0.95,
      metalness: 0.05
    });

    // Reusable splash droplet geometry & material
    this.splashGeo = new THREE.SphereGeometry(0.12, 4, 4);
    this.splashMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.85
    });

    // Reusable ground dust / debris particle geometry & material
    this.dustGeo = new THREE.SphereGeometry(0.14, 4, 4);
    this.dustMat = new THREE.MeshBasicMaterial({
      color: 0xa89f91,
      transparent: true,
      opacity: 0.75
    });
  }

  createWaterSplash(x, y, z) {
    const particleCount = 18;
    const group = new THREE.Group();
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const drop = new THREE.Mesh(this.splashGeo, this.splashMat);
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 6.5;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed * 0.6,
        4.0 + Math.random() * 7.0,
        Math.sin(angle) * speed * 0.6
      );
      drop.position.set(x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5);
      group.add(drop);
      particles.push({ mesh: drop, velocity: vel });
    }

    this.scene.add(group);
    this.splashes.push({
      group,
      particles,
      life: 0.85,
      maxLife: 0.85
    });
  }

  createGroundDust(x, y, z, normal) {
    const particleCount = 12;
    const group = new THREE.Group();
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(this.dustGeo, this.dustMat);
      const randDir = new THREE.Vector3(
        (Math.random() - 0.5) * 2.0,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 2.0
      ).normalize();

      if (normal) {
        randDir.addScaledVector(normal, 1.2).normalize();
      }

      const speed = 2.0 + Math.random() * 4.5;
      const vel = randDir.multiplyScalar(speed);

      p.position.set(x + (Math.random() - 0.5) * 0.4, y + 0.1, z + (Math.random() - 0.5) * 0.4);
      p.scale.setScalar(0.7 + Math.random() * 0.6);
      group.add(p);
      particles.push({ mesh: p, velocity: vel });
    }

    this.scene.add(group);
    this.dustPuffs.push({
      group,
      particles,
      life: 0.65,
      maxLife: 0.65
    });
  }

  throwStone() {
    const stone = new THREE.Mesh(this.stoneGeo, this.stoneMat.clone());
    stone.castShadow = true;
    stone.receiveShadow = true;
    stone.position.copy(this.camera.position);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y += 0.16;
    forward.normalize();

    const velocity = forward.multiplyScalar(36.0);

    this.stones.push({
      mesh: stone,
      velocity: velocity,
      active: true,
      bounces: 0,
      restTimer: 0
    });
    this.scene.add(stone);
  }

  getSurfaceNormal(x, z) {
    const eps = 0.35;
    const hL = this.generator.getHeight(x - eps, z);
    const hR = this.generator.getHeight(x + eps, z);
    const hD = this.generator.getHeight(x, z - eps);
    const hU = this.generator.getHeight(x, z + eps);
    return new THREE.Vector3(-(hR - hL), eps * 2.0, -(hU - hD)).normalize();
  }

  update(delta, elapsedTime) {
    const dt = Math.min(delta, 0.05);

    // 1. Continuous Swept Collision Update for Thrown Stones
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const s = this.stones[i];
      if (!s.active) continue;

      if (s.isAtRest) {
        s.restTimer += dt;
        if (s.restTimer > 3.0) {
          const fade = Math.max(0, 1.0 - (s.restTimer - 3.0) / 1.0);
          s.mesh.scale.setScalar(fade);
          if (s.restTimer > 4.0) {
            this.scene.remove(s.mesh);
            this.stones.splice(i, 1);
          }
        }
        continue;
      }

      // Gravity acceleration
      s.velocity.y -= 9.8 * 2.4 * dt;

      // 4-Step Continuous Swept Sub-stepping
      const subSteps = 4;
      const subDt = dt / subSteps;
      let collided = false;

      for (let step = 0; step < subSteps; step++) {
        s.mesh.position.addScaledVector(s.velocity, subDt);

        const px = s.mesh.position.x;
        const py = s.mesh.position.y;
        const pz = s.mesh.position.z;

        const groundH = this.generator.getHeight(px, pz);
        const waterH = this.water ? this.water.waterLevel : -9999;

        // Water impact check (reliably triggers ripples and droplet splash across all water bodies)
        if (py <= waterH && (waterH >= groundH - 0.4 || py >= groundH)) {
          if (this.water && this.water.addRipple) {
            this.water.addRipple(px, pz, elapsedTime);
          }
          this.createWaterSplash(px, waterH, pz);
          this.scene.remove(s.mesh);
          this.stones.splice(i, 1);
          collided = true;
          break;
        }

        // Terrain collision check with exact normal reflection
        if (py <= groundH + 0.35) {
          const normal = this.getSurfaceNormal(px, pz);
          s.mesh.position.set(px, groundH + 0.35, pz);

          // Physical slope bounce reflection
          const dot = s.velocity.dot(normal);
          if (dot < 0) {
            s.velocity.sub(normal.clone().multiplyScalar(1.5 * dot));
            s.velocity.multiplyScalar(0.46); // Restitution damping
          }

          this.createGroundDust(px, groundH, pz, normal);
          s.bounces++;

          // Settle if kinetic energy is low or after several bounces
          if (s.velocity.length() < 2.2 || s.bounces >= 4) {
            s.isAtRest = true;
            s.velocity.set(0, 0, 0);
          }

          collided = true;
          break;
        }
      }
    }

    // 2. Update Water Splash Particles
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const sp = this.splashes[i];
      sp.life -= dt;
      if (sp.life <= 0) {
        this.scene.remove(sp.group);
        this.splashes.splice(i, 1);
      } else {
        const factor = sp.life / sp.maxLife;
        for (const p of sp.particles) {
          p.velocity.y -= 9.8 * 2.5 * dt;
          p.mesh.position.addScaledVector(p.velocity, dt);
          p.mesh.scale.setScalar(factor);
        }
      }
    }

    // 3. Update Ground Dust Particles
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const dp = this.dustPuffs[i];
      dp.life -= dt;
      if (dp.life <= 0) {
        this.scene.remove(dp.group);
        this.dustPuffs.splice(i, 1);
      } else {
        const factor = dp.life / dp.maxLife;
        for (const p of dp.particles) {
          p.velocity.y -= 9.8 * 1.2 * dt;
          p.mesh.position.addScaledVector(p.velocity, dt);
          p.mesh.scale.setScalar(factor * 1.2);
        }
      }
    }
  }
}
