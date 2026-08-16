/**
 * Real-Time Underwater Visual & Atmospheric Simulation Engine
 * Procedural caustic refraction, 3D floating bubble particles, depth tint,
 * and aquatic godray shimmering when camera descends below water level.
 */

class UnderwaterManager {
  constructor(scene, camera, waterLevel = 3.0) {
    this.scene = scene;
    this.camera = camera;
    this.waterLevel = waterLevel;
    this.isUnderwater = false;
    this.underwaterFactor = 0.0;

    this.initBubbles();
    this.initOverlay();
  }

  initBubbles() {
    const bubbleCount = 450;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(bubbleCount * 3);
    const scale = new Float32Array(bubbleCount);
    const speed = new Float32Array(bubbleCount);
    const phase = new Float32Array(bubbleCount);

    for (let i = 0; i < bubbleCount; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      scale[i] = 0.4 + Math.random() * 1.8;
      speed[i] = 1.2 + Math.random() * 3.0;
      phase[i] = Math.random() * Math.PI * 2.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));

    const bubbleCanvas = document.createElement('canvas');
    bubbleCanvas.width = 64; bubbleCanvas.height = 64;
    const bCtx = bubbleCanvas.getContext('2d');
    const bGrad = bCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
    bGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    bGrad.addColorStop(0.65, 'rgba(120, 220, 255, 0.4)');
    bGrad.addColorStop(0.9, 'rgba(200, 240, 255, 0.8)');
    bGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    bCtx.fillStyle = bGrad;
    bCtx.beginPath();
    bCtx.arc(32, 32, 30, 0, Math.PI * 2);
    bCtx.fill();
    const bubbleTexture = new THREE.CanvasTexture(bubbleCanvas);

    this.bubbleMaterial = new THREE.PointsMaterial({
      size: 1.5,
      map: bubbleTexture,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });

    this.bubbles = new THREE.Points(geo, this.bubbleMaterial);
    this.bubbles.visible = false;
    this.scene.add(this.bubbles);
  }

  initOverlay() {
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'underwater-overlay';
    this.overlayEl.innerHTML = `
      <div class="underwater-caustics"></div>
      <div class="underwater-vignette"></div>
      <div class="underwater-tint"></div>
    `;
    document.body.appendChild(this.overlayEl);
  }

  setWaterLevel(level) {
    this.waterLevel = level;
  }

  update(time, cameraPos, skyManager, audioManager) {
    const depthBelowWater = this.waterLevel - cameraPos.y;
    this.isUnderwater = depthBelowWater > 0.05;

    const targetFactor = this.isUnderwater ? Math.min(1.0, depthBelowWater * 0.85 + 0.35) : 0.0;
    this.underwaterFactor += (targetFactor - this.underwaterFactor) * 0.15;

    if (this.overlayEl) {
      if (this.underwaterFactor > 0.01) {
        this.overlayEl.style.display = 'block';
        this.overlayEl.style.opacity = this.underwaterFactor.toFixed(3);
        const causticOffsetX = (time * 18.0) % 256;
        const causticOffsetY = (time * 14.0) % 256;
        this.overlayEl.style.setProperty('--caustic-x', `${causticOffsetX}px`);
        this.overlayEl.style.setProperty('--caustic-y', `${causticOffsetY}px`);
      } else {
        this.overlayEl.style.display = 'none';
      }
    }

    if (this.bubbles) {
      if (this.underwaterFactor > 0.1) {
        this.bubbles.visible = true;
        this.bubbles.position.copy(cameraPos);
        this.bubbleMaterial.opacity = Math.min(0.85, this.underwaterFactor * 0.9);

        const posAttr = this.bubbles.geometry.attributes.position;
        const speedAttr = this.bubbles.geometry.attributes.aSpeed;
        const phaseAttr = this.bubbles.geometry.attributes.aPhase;
        const count = posAttr.count;

        for (let i = 0; i < count; i++) {
          let y = posAttr.getY(i);
          const spd = speedAttr.getX(i);
          const phs = phaseAttr.getX(i);
          y += spd * 0.08;

          if (y > 20.0 || (cameraPos.y + y) > this.waterLevel) {
            y = -20.0;
            posAttr.setX(i, (Math.random() - 0.5) * 60 + Math.sin(time + phs) * 2.0);
            posAttr.setZ(i, (Math.random() - 0.5) * 60 + Math.cos(time + phs) * 2.0);
          }
          posAttr.setY(i, y);
        }
        posAttr.needsUpdate = true;
      } else {
        this.bubbles.visible = false;
      }
    }

    if (skyManager && skyManager.scene && skyManager.scene.fog) {
      if (this.underwaterFactor > 0.05) {
        const deepAquaFog = new THREE.Color(0x04243a);
        const currentFog = skyManager.currentPreset.fogColor;
        const blendedFog = currentFog.clone().lerp(deepAquaFog, this.underwaterFactor * 0.85);
        skyManager.scene.fog.color.copy(blendedFog);
        skyManager.scene.fog.density = THREE.MathUtils.lerp(
          skyManager.currentPreset.fogDensity * skyManager.fogDensityFactor,
          0.016,
          this.underwaterFactor
        );
      }
    }

    if (audioManager && audioManager.audioCtx && audioManager.soundPlaying) {
      if (this.underwaterFactor > 0.05 && audioManager.windFilter) {
        audioManager.windFilter.frequency.setTargetAtTime(
          THREE.MathUtils.lerp(350, 110, this.underwaterFactor),
          audioManager.audioCtx.currentTime,
          0.1
        );
      }
    }
  }
}
