/**
 * Camera & Flight Controllers (Cinematic Drone, Free Flight, Explorer)
 * with Pointer Lock, Collision and Smooth Mode Transitions
 */

class CameraController {
  constructor(camera, domElement, terrainGenerator) {
    this.camera = camera;
    this.domElement = domElement;
    this.generator = terrainGenerator;

    this.mode = 'cinematic'; // 'cinematic', 'free', 'walk'
    this.speed = 35.0; // units per second (Default 35m/s)

    // Orientation State
    this.yaw = 0;
    this.pitch = -0.08;
    this.roll = 0;

    // Transition State
    this.isTransitioning = false;
    this.transitionTime = 0;
    this.transitionDuration = 0.65;
    this.startPos = new THREE.Vector3();
    this.targetPos = new THREE.Vector3();
    this.startRot = { yaw: 0, pitch: 0, roll: 0 };
    this.targetRot = { yaw: 0, pitch: 0, roll: 0 };

    // Movement Key States
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      sprint: false
    };

    // Cinematic State
    this.cinematicTime = 0;

    // Walk State
    this.walkHeight = 3.2;
    this.verticalVelocity = 0;
    this.isGrounded = true;

    // Pointer Lock & Drag State
    this.isPointerLocked = false;
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };

    this.initEventListeners();
  }

  initEventListeners() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    const handlePointerLockError = (err) => {
      console.warn('Pointer lock request was blocked or threw security exception:', err);
      this.showPointerLockWarning('Pointer lock blocked by browser permissions. Click canvas to allow.');
    };

    document.addEventListener('pointerlockerror', handlePointerLockError);
    document.addEventListener('mozpointerlockerror', handlePointerLockError);

    // Pointer Lock setup on canvas
    this.domElement.addEventListener('click', (e) => {
      if (['BUTTON', 'INPUT', 'SELECT', 'ASIDE'].includes(e.target.tagName) || e.target.closest('.glass-panel') || e.target.closest('.icon-btn')) {
        return;
      }
      if (!this.isPointerLocked && document.pointerLockElement !== this.domElement) {
        try {
          const req = this.domElement.requestPointerLock || this.domElement.mozRequestPointerLock;
          if (req) {
            const res = req.call(this.domElement);
            if (res && typeof res.catch === 'function') {
              res.catch(handlePointerLockError);
            }
          }
        } catch (err) {
          handlePointerLockError(err);
        }
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.domElement);
      if (this.isPointerLocked) {
        window.dispatchEvent(new Event('pointerLockActive'));
      }
    });
    document.addEventListener('mozpointerlockchange', () => {
      this.isPointerLocked = (document.mozPointerLockElement === this.domElement);
      if (this.isPointerLocked) {
        window.dispatchEvent(new Event('pointerLockActive'));
      }
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (this.isPointerLocked && e.button === 0) {
        window.dispatchEvent(new Event('throwStone'));
      } else if (e.button === 0) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      const sensitivity = 0.0028;

      if (this.isPointerLocked) {
        const movementX = e.movementX || e.mozMovementX || 0;
        const movementY = e.movementY || e.mozMovementY || 0;

        this.yaw -= movementX * sensitivity;
        this.pitch -= movementY * sensitivity;
        this.pitch = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.pitch));
      } else if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.yaw -= deltaX * sensitivity;
        this.pitch -= deltaY * sensitivity;
        this.pitch = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.pitch));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    // Touch events for mobile
    this.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    this.domElement.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

      const sensitivity = 0.0035;
      this.yaw -= deltaX * sensitivity;
      this.pitch -= deltaY * sensitivity;
      this.pitch = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.pitch));

      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    this.domElement.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Mouse Wheel Velocity Control (Scroll up to accelerate, scroll down to decelerate)
    window.addEventListener('wheel', (e) => {
      const hud = document.getElementById('left-hud');
      // If hovering over active scrollable sidebar, don't hijack sidebar scroll
      if (hud && hud.contains(e.target) && !hud.classList.contains('collapsed')) {
        return;
      }

      const delta = -Math.sign(e.deltaY) * 5.0;
      const newSpeed = THREE.MathUtils.clamp(this.speed + delta, 15, 120);
      this.setSpeed(newSpeed);

      if (this.onSpeedChange) {
        this.onSpeedChange(newSpeed);
      }
    }, { passive: true });
  }

  onKeyDown(e) {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (e.code === 'Escape') {
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
    }

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'Space':
        this.keys.up = true;
        if (this.mode === 'walk' && this.isGrounded) {
          this.verticalVelocity = 18;
          this.isGrounded = false;
        }
        e.preventDefault();
        break;
      case 'KeyC':
      case 'KeyQ':
        this.keys.down = true;
        break;
      case 'KeyE':
        this.keys.up = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
    }
  }

  onKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.up = false;
        break;
      case 'KeyC':
      case 'KeyQ':
        this.keys.down = false;
        break;
      case 'KeyE':
        this.keys.up = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
    }
  }

  setMode(mode) {
    if (this.mode === mode) return;

    this.mode = mode;

    this.isTransitioning = true;
    this.transitionTime = 0;
    this.transitionDuration = 0.65;

    this.startPos.copy(this.camera.position);
    this.startRot = { yaw: this.yaw, pitch: this.pitch, roll: this.roll };

    this.targetPos.copy(this.startPos);
    this.targetRot = { yaw: this.yaw, pitch: this.pitch, roll: 0 };

    const groundH = this.generator.getHeight(this.camera.position.x, this.camera.position.z);
    const floorH = Math.max(groundH, this.generator.waterLevel || 0);

    if (mode === 'walk') {
      this.targetPos.y = floorH + this.walkHeight;
      this.targetRot.pitch = 0;
      this.targetRot.roll = 0;
      this.isGrounded = true;
      this.verticalVelocity = 0;
    } else if (mode === 'cinematic') {
      this.targetPos.y = Math.max(floorH + 25.0, 30.0);
      this.targetRot.pitch = -0.06;
      this.targetRot.roll = 0;
    } else if (mode === 'free') {
      this.targetRot.roll = 0;
    }
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  update(delta) {
    const dt = Math.min(delta, 0.1);

    if (this.isTransitioning) {
      this.transitionTime += dt;
      const t = Math.min(1.0, this.transitionTime / this.transitionDuration);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(this.startPos, this.targetPos, ease);
      this.yaw = THREE.MathUtils.lerp(this.startRot.yaw, this.targetRot.yaw, ease);
      this.pitch = THREE.MathUtils.lerp(this.startRot.pitch, this.targetRot.pitch, ease);
      this.roll = THREE.MathUtils.lerp(this.startRot.roll, this.targetRot.roll, ease);

      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
      this.camera.rotation.z = this.roll;

      if (t >= 1.0) {
        this.isTransitioning = false;
      }
      return;
    }

    if (this.mode === 'cinematic') {
      this.updateCinematic(dt);
    } else if (this.mode === 'free') {
      this.updateFreeFlight(dt);
    } else if (this.mode === 'walk') {
      this.updateWalk(dt);
    }
  }

  updateCinematic(dt) {
    this.cinematicTime += dt;
    const t = this.cinematicTime;

    // 1. Dynamic Autonomous Speed Variation (Silky Smooth Lerped Acceleration & Deceleration)
    const speedCycle = 0.5 + 0.35 * Math.sin(t * 0.04) + 0.15 * Math.sin(t * 0.09);
    const targetMoveSpeed = this.speed * (0.65 + speedCycle * 0.95);
    this.cinematicSpeed = THREE.MathUtils.lerp(this.cinematicSpeed || this.speed, targetMoveSpeed, dt * 1.6);

    // 2. Ultra Low-Frequency Smooth Sweeping Turns & Gentle Aircraft Banking
    const turnRate = Math.sin(t * 0.042) * 0.12 + Math.sin(t * 0.018 + 2.2) * 0.08 + Math.sin(t * 0.085) * 0.03;
    this.yaw += turnRate * dt;

    // Low-frequency gentle bank roll
    const targetRoll = -turnRate * 0.95;
    this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, dt * 1.5);

    const forwardDir = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    );

    this.camera.position.addScaledVector(forwardDir, this.cinematicSpeed * dt);

    // 3. Autonomous Altitude Modulation (Climbing high into peaks & diving low into valleys)
    const altitudeWave = 22.0 + 34.0 * (0.5 + 0.5 * Math.sin(t * 0.035 + 1.2)) + 10.0 * Math.cos(t * 0.08);

    // Look-ahead terrain probe to guarantee zero clipping over peaks, ridges, and slopes
    const lookAheadDist = Math.max(45.0, this.cinematicSpeed * 1.2);
    const aheadX = this.camera.position.x + forwardDir.x * lookAheadDist;
    const aheadZ = this.camera.position.z + forwardDir.z * lookAheadDist;
    const closeX = this.camera.position.x + forwardDir.x * 20.0;
    const closeZ = this.camera.position.z + forwardDir.z * 20.0;

    const groundH = this.generator.getHeight(aheadX, aheadZ);
    const closeH = this.generator.getHeight(closeX, closeZ);
    const currH = this.generator.getHeight(this.camera.position.x, this.camera.position.z);
    const waterLevel = this.generator.waterLevel || 3.0;

    const highestObstacle = Math.max(groundH, closeH, currH, waterLevel);
    const minSafeClearance = 10.0;
    const desiredAltitude = Math.max(highestObstacle + altitudeWave, highestObstacle + minSafeClearance);

    // Responsive climbing response with smooth glide lerping
    const isClimbing = desiredAltitude > this.camera.position.y;
    const lerpRate = isClimbing ? 2.8 : 1.4;
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, desiredAltitude, dt * lerpRate);

    // 4. Low-Frequency Dynamic Camera Pitch
    const altitudeDelta = (desiredAltitude - this.camera.position.y);
    const targetPitch = THREE.MathUtils.clamp(altitudeDelta * 0.015 - 0.04, -0.28, 0.20);
    this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, dt * 1.6);

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = this.roll;
  }

  updateFreeFlight(dt) {
    let currentSpeed = this.speed;
    if (this.keys.sprint) currentSpeed *= 2.5;

    const targetMove = new THREE.Vector3();

    const forward = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );

    const right = new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    );

    const up = new THREE.Vector3(0, 1, 0);

    if (this.keys.forward) targetMove.add(forward);
    if (this.keys.backward) targetMove.sub(forward);
    if (this.keys.right) targetMove.add(right);
    if (this.keys.left) targetMove.sub(right);
    if (this.keys.up) targetMove.add(up);
    if (this.keys.down) targetMove.sub(up);

    if (targetMove.lengthSq() > 0) {
      targetMove.normalize().multiplyScalar(currentSpeed);
    }

    // Smooth physical acceleration & deceleration momentum damping
    if (!this.freeVelocity) this.freeVelocity = new THREE.Vector3();
    const accelRate = targetMove.lengthSq() > 0 ? 5.5 : 4.2;
    this.freeVelocity.lerp(targetMove, dt * accelRate);
    this.camera.position.addScaledVector(this.freeVelocity, dt);

    const groundH = this.generator.getHeight(this.camera.position.x, this.camera.position.z);
    const minH = Math.max(groundH, this.generator.waterLevel || 0) + 1.2;
    if (this.camera.position.y < minH) {
      this.camera.position.y = minH;
    }

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  updateWalk(dt) {
    let targetSpeed = this.keys.sprint ? 26.0 : 14.0;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const targetMove = new THREE.Vector3();

    if (this.keys.forward) targetMove.add(forward);
    if (this.keys.backward) targetMove.sub(forward);
    if (this.keys.right) targetMove.add(right);
    if (this.keys.left) targetMove.sub(right);

    if (targetMove.lengthSq() > 0) {
      targetMove.normalize().multiplyScalar(targetSpeed);
    }

    // Smooth walk acceleration & deceleration
    if (!this.walkVelocity) this.walkVelocity = new THREE.Vector3();
    const walkAccel = targetMove.lengthSq() > 0 ? 8.0 : 6.0;
    this.walkVelocity.lerp(targetMove, dt * walkAccel);
    this.camera.position.addScaledVector(this.walkVelocity, dt);

    const groundH = this.generator.getHeight(this.camera.position.x, this.camera.position.z);
    const floorH = Math.max(groundH, this.generator.waterLevel || 0);
    const targetY = floorH + this.walkHeight;

    if (!this.isGrounded) {
      this.verticalVelocity -= 40.0 * dt;
      this.camera.position.y += this.verticalVelocity * dt;
      if (this.camera.position.y <= targetY) {
        this.camera.position.y = targetY;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    } else {
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, dt * 10.0);
    }

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  showPointerLockWarning(msg) {
    let toast = document.getElementById('pointer-lock-warning');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pointer-lock-warning';
      toast.className = 'glass-panel pointer-warning-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this.warningTimeout);
    this.warningTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }
}
