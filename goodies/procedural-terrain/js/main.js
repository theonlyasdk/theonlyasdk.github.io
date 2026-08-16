/**
 * Main Application Entry Point
 * Orchestrates Scene, Camera, Terrain, Sky, Volumetric Clouds, Water, SSAO, Underwater, Audio, Physics and UI Modules
 */

class TerrainApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.seed = Math.floor(Math.random() * 1000000);

    this.initThree();
    this.initModules();
    this.initManagers();

    this.clock = new THREE.Clock();
    this.animate();

    window.addEventListener('resize', () => this.onResize());
  }

  initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.5,
      3200
    );
    this.camera.position.set(0, 45, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }

  initModules() {
    this.generator = new TerrainGenerator(this.seed, {
      heightScale: 65.0,
      roughness: 0.85,
      waterLevel: 3.0
    });

    this.sky = new SkyManager(this.scene, this.renderer);
    this.sky.setTimeOfDay(17.5);
    this.sky.setFogDensityFactor(0.91);

    this.clouds = new CloudsManager(this.scene);

    this.water = new WaterManager(this.scene, 3.0, this.generator);
    this.water.setWaveIntensity(0.35);

    this.terrain = new TerrainManager(this.scene, this.generator);
    this.terrain.setResolution(64);
    this.terrain.setViewRadius(6);

    this.controls = new CameraController(this.camera, this.renderer.domElement, this.generator);
    this.controls.setSpeed(40);

    this.water.updateSkyUniforms(this.sky.currentPreset, this.sky.scene.fog ? this.sky.scene.fog.density : 0.003);

    // Advanced Real SSAO & Underwater Visual Simulation
    this.ssao = new SSAOManager(this.renderer, this.scene, this.camera);
    this.underwater = new UnderwaterManager(this.scene, this.camera, this.water.waterLevel);

    // Dynamic Performance & VSync Lock Controller
    this.initPerformanceMonitor();
  }

  initPerformanceMonitor() {
    this.autoQuality = true;
    this.targetFps = 60;
    this.autoRefreshDetect = true;
    this.frameTimeHistory = [];
    this.historyLength = 40;
    this.lastQualityAdjust = 0;
    this.currentScale = 1.0;
    this.detectScreenRefresh();
  }

  detectScreenRefresh() {
    let frames = 0;
    const start = performance.now();
    const probe = () => {
      frames++;
      if (performance.now() - start < 450) {
        requestAnimationFrame(probe);
      } else {
        const detected = Math.round((frames * 1000) / (performance.now() - start));
        if (this.autoRefreshDetect) {
          if (detected >= 135) this.targetFps = 144;
          else if (detected >= 110) this.targetFps = 120;
          else if (detected >= 80) this.targetFps = 90;
          else this.targetFps = 60;
          if (this.ui && this.ui.updateVSyncLabel) {
            this.ui.updateVSyncLabel(this.targetFps);
          }
        }
      }
    };
    requestAnimationFrame(probe);
  }

  setRenderScale(scale) {
    this.currentScale = scale;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0) * scale);
  }

  setMaxQuality() {
    this.autoQuality = false;
    this.benchmarking = false;

    // Turn all options to absolute maximum quality
    this.currentScale = 2.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0) * 1.5);
    this.terrain.setViewRadius(8);
    this.terrain.setResolution(128);
    this.setShadowQuality('4096');
    if (this.ssao) this.ssao.setEnabled(true);
    if (this.clouds) {
      this.clouds.setVisible(true);
      this.clouds.setSteps(24);
    }
    this.terrain.setFoliageEnabled(true);
    this.water.setVisible(true);
    this.water.setShaderEffects(true);

    if (this.ui) this.ui.syncAllToMaxQuality();
  }

  startAutotuneFPS() {
    this.autoQuality = true;
    this.benchmarking = true;
    this.profileIndex = 0;
    this.profileTimer = 0;
    this.frameTimeHistory = [];

    // Candidate Profiles ranked from ultra fidelity down to maximum performance (Capped at max 1.0x scale)
    this.profiles = [
      { name: 'Ultra', scale: 1.0, chunks: 8, res: 96, shadow: '4096', cloudSteps: 20, ssao: true },
      { name: 'High', scale: 1.0, chunks: 7, res: 64, shadow: '2048', cloudSteps: 16, ssao: true },
      { name: 'Balanced', scale: 0.95, chunks: 6, res: 64, shadow: '2048', cloudSteps: 12, ssao: true },
      { name: 'Performance', scale: 0.80, chunks: 5, res: 48, shadow: '1024', cloudSteps: 8, ssao: false },
      { name: 'Maximum FPS', scale: 0.65, chunks: 4, res: 32, shadow: '1024', cloudSteps: 6, ssao: false }
    ];

    this.applyProfile(this.profiles[0]);
  }

  applyProfile(p) {
    this.currentScale = Math.min(1.0, p.scale);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0) * this.currentScale);
    this.terrain.setViewRadius(p.chunks);
    this.terrain.setResolution(p.res);
    this.setShadowQuality(p.shadow);
    if (this.ssao) this.ssao.setEnabled(p.ssao);
    if (this.clouds) this.clouds.setSteps(p.cloudSteps);

    if (this.ui) this.ui.syncProfileSettings(p);
  }

  setAutoQualityMode(mode) {
    if (mode === 'on' || mode === true) {
      this.startAutotuneFPS();
    } else if (mode === 'off' || mode === false) {
      this.setMaxQuality();
    } else if (mode === 'manual') {
      this.setManualMode();
    }
  }

  setManualMode() {
    this.autoQuality = false;
    this.benchmarking = false;
    if (this.ui && this.ui.syncManualMode) {
      this.ui.syncManualMode();
    }
  }

  setShadowQuality(quality) {
    if (quality === 'off') {
      this.renderer.shadowMap.enabled = false;
    } else {
      this.renderer.shadowMap.enabled = true;
      const size = parseInt(quality, 10) || 2048;
      if (this.sky && this.sky.sunLight && this.sky.sunLight.shadow) {
        this.sky.sunLight.shadow.mapSize.width = size;
        this.sky.sunLight.shadow.mapSize.height = size;
        if (this.sky.sunLight.shadow.map) {
          this.sky.sunLight.shadow.map.dispose();
          this.sky.sunLight.shadow.map = null;
        }
      }
    }
  }

  initManagers() {
    this.audio = new AudioManager();
    this.physics = new PhysicsManager(this.scene, this.camera, this.generator, this.water);
    this.ui = new UIManager(this);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.ssao) {
      this.ssao.setSize(window.innerWidth, window.innerHeight);
    }
  }

  updateAutoQuality(delta, elapsedTime) {
    if (!this.autoQuality) return;

    const fps = delta > 0 ? (1.0 / delta) : 60;
    this.frameTimeHistory.push(fps);
    if (this.frameTimeHistory.length > this.historyLength) {
      this.frameTimeHistory.shift();
    }

    if (elapsedTime - this.lastQualityAdjust < 0.65) return;

    const avgFps = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    const target = this.targetFps || 60;

    // Benchmarking calibration mode: tests profiles to find the highest graphics-to-FPS ratio
    if (this.benchmarking && this.profiles) {
      this.lastQualityAdjust = elapsedTime;
      if (avgFps >= target - 1.5) {
        // Optimal candidate found! Lock profile for maximum graphics at target VSync
        this.benchmarking = false;
      } else if (this.profileIndex < this.profiles.length - 1) {
        this.profileIndex++;
        this.applyProfile(this.profiles[this.profileIndex]);
        this.frameTimeHistory = [];
      } else {
        this.benchmarking = false;
      }
      return;
    }

    // Continuous dynamic VSync lock monitor (Scale is strictly clamped <= 1.0x)
    if (avgFps < target - 2.5) {
      this.lastQualityAdjust = elapsedTime;
      if (this.currentScale > 0.60) {
        this.currentScale = Math.max(0.60, this.currentScale - 0.08);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0) * this.currentScale);
        if (this.ui && this.ui.syncRenderScale) this.ui.syncRenderScale(this.currentScale);
      } else if (this.terrain.viewRadius > 4) {
        this.terrain.setViewRadius(this.terrain.viewRadius - 1);
        if (this.ui && this.ui.syncRenderDist) this.ui.syncRenderDist(this.terrain.viewRadius);
      }
    } else if (avgFps >= target - 0.5 && this.currentScale < 1.0) {
      this.lastQualityAdjust = elapsedTime;
      this.currentScale = Math.min(1.0, this.currentScale + 0.05);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0) * this.currentScale);
      if (this.ui && this.ui.syncRenderScale) this.ui.syncRenderScale(this.currentScale);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update(delta);
    this.terrain.update(this.camera);
    this.sky.update(delta, this.camera.position);
    this.clouds.update(elapsedTime, this.camera.position, this.sky.currentPreset, this.sky.currentPreset.nightFactor || 0.0);
    this.physics.update(delta, elapsedTime);

    // Autonomous Dynamic VSync Quality Tuning
    this.updateAutoQuality(delta, elapsedTime);

    // Calculate player 3D movement velocity vector
    if (!this.lastCamPos) this.lastCamPos = this.camera.position.clone();
    const vel3D = new THREE.Vector3().subVectors(this.camera.position, this.lastCamPos).multiplyScalar(delta > 0 ? (1.0 / delta) : 0);
    const playerSpeed = vel3D.length();
    this.lastCamPos.copy(this.camera.position);

    this.water.update(elapsedTime, this.camera.position, playerSpeed);
    this.water.updateSkyUniforms(this.sky.currentPreset, this.sky.scene.fog ? this.sky.scene.fog.density : 0.003);

    // Player Wading Ripples (Fluid interaction when walking / moving inside water)
    const inWaterZone = this.camera.position.y <= (this.water.waterLevel + 1.8);
    if (inWaterZone && playerSpeed > 0.4) {
      if (!this.lastWadePos) this.lastWadePos = new THREE.Vector2(this.camera.position.x, this.camera.position.z);
      if (!this.lastWadeTime) this.lastWadeTime = 0;

      const curPos = new THREE.Vector2(this.camera.position.x, this.camera.position.z);
      const movedDist = curPos.distanceTo(this.lastWadePos);
      if (movedDist > 0.8 && (elapsedTime - this.lastWadeTime) > 0.22) {
        this.water.addRipple(this.camera.position.x, this.camera.position.z, elapsedTime);
        this.lastWadePos.copy(curPos);
        this.lastWadeTime = elapsedTime;
      }
    }

    // Update underwater atmosphere & audio
    this.underwater.setWaterLevel(this.water.waterLevel);
    this.underwater.update(elapsedTime, this.camera.position, this.sky, this.audio);

    this.audio.update(elapsedTime, this.camera, this.generator, this.water.waterLevel, vel3D);
    this.ui.updateStats();

    // Native High-Performance Scene Rendering (Crisp pixel sharpness & locked 60/120 FPS)
    if (this.ssao && this.ssao.enabled) {
      this.ssao.render(elapsedTime);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Bootstrap Application
window.addEventListener('DOMContentLoaded', () => {
  window.app = new TerrainApp();
});
