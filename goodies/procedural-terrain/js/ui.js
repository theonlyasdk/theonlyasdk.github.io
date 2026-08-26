/**
 * User Interface & HUD Manager
 * Controls sidebar settings, real-time telemetry stats, F3 Minecraft-style debug mode, and modals
 */

class UIManager {
  constructor(app) {
    this.app = app;
    this.f3Debug = false;
    this.initElements();
    this.bindEvents();
    this.initStats();
  }

  initElements() {
    this.statX = document.getElementById('stat-x');
    this.statZ = document.getElementById('stat-z');
    this.statAlt = document.getElementById('stat-alt');
    this.statFps = document.getElementById('stat-fps');
    this.statBiome = document.getElementById('stat-biome');
    this.statChunks = document.getElementById('stat-chunks');

    // F3 Debug Elements
    this.f3Overlay = document.getElementById('f3-debug-overlay');
    this.f3Fps = document.getElementById('f3-fps');
    this.f3Xyz = document.getElementById('f3-xyz');
    this.f3Block = document.getElementById('f3-block');
    this.f3Chunk = document.getElementById('f3-chunk');
    this.f3Facing = document.getElementById('f3-facing');
    this.f3Climate = document.getElementById('f3-climate');
    this.f3Biome = document.getElementById('f3-biome');
    this.f3Light = document.getElementById('f3-light');
    this.f3Chunks = document.getElementById('f3-chunks');
    this.f3Render = document.getElementById('f3-render');
    this.f3Mem = document.getElementById('f3-mem');

    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.lastStatsUpdate = 0;
    this.currentFps = 60;
  }

  initStats() {
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
  }

  updateVSyncLabel(targetFps) {
    const label = document.getElementById('label-vsync-target');
    if (label) {
      label.textContent = this.app.autoRefreshDetect ? `Auto (${targetFps} Hz)` : `${targetFps} FPS`;
    }
  }

  syncRenderScale(scale) {
    const slider = document.getElementById('slider-render-scale');
    const label = document.getElementById('label-render-scale');
    if (slider) slider.value = scale;
    if (label) label.textContent = `${scale.toFixed(2)}x`;
  }

  syncRenderDist(dist) {
    const slider = document.getElementById('slider-render-dist');
    const label = document.getElementById('label-render-dist');
    if (slider) slider.value = dist;
    if (label) label.textContent = `${dist} chunks`;
  }

  syncAllToMaxQuality() {
    this.syncRenderScale(2.0);
    this.syncRenderDist(8);

    const resSlider = document.getElementById('slider-res');
    const resLabel = document.getElementById('label-res');
    if (resSlider) resSlider.value = 128;
    if (resLabel) resLabel.textContent = '128';

    const cloudStepsSlider = document.getElementById('slider-cloud-steps');
    const cloudStepsLabel = document.getElementById('label-cloud-steps');
    if (cloudStepsSlider) cloudStepsSlider.value = 24;
    if (cloudStepsLabel) cloudStepsLabel.textContent = '24';

    const shadowBtns = document.querySelectorAll('[data-shadow]');
    const shadowLabel = document.getElementById('label-shadows');
    shadowBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-shadow') === '4096'));
    if (shadowLabel) shadowLabel.textContent = 'Ultra (4K)';

    const aoToggle = document.getElementById('toggle-ao-reflections');
    if (aoToggle) aoToggle.checked = true;

    const cloudsToggle = document.getElementById('toggle-clouds');
    if (cloudsToggle) cloudsToggle.checked = true;

    const foliageToggle = document.getElementById('toggle-foliage');
    if (foliageToggle) foliageToggle.checked = true;
  }

  syncProfileSettings(p) {
    this.syncRenderScale(p.scale);
    this.syncRenderDist(p.chunks);

    const resSlider = document.getElementById('slider-res');
    const resLabel = document.getElementById('label-res');
    if (resSlider) resSlider.value = p.res;
    if (resLabel) resLabel.textContent = `${p.res}`;

    const cloudStepsSlider = document.getElementById('slider-cloud-steps');
    const cloudStepsLabel = document.getElementById('label-cloud-steps');
    if (cloudStepsSlider) cloudStepsSlider.value = p.cloudSteps;
    if (cloudStepsLabel) cloudStepsLabel.textContent = `${p.cloudSteps}`;

    const shadowBtns = document.querySelectorAll('[data-shadow]');
    const shadowLabel = document.getElementById('label-shadows');
    shadowBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-shadow') === p.shadow));
    if (shadowLabel) {
      const names = { off: 'Off', '1024': 'Low (1K)', '2048': 'High (2K)', '4096': 'Ultra (4K)' };
      shadowLabel.textContent = names[p.shadow] || p.shadow;
    }

    const aoToggle = document.getElementById('toggle-ao-reflections');
    if (aoToggle) aoToggle.checked = p.ssao;
  }

  syncManualMode() {
    const autotuneBtns = document.querySelectorAll('[data-autotune]');
    autotuneBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-autotune') === 'manual'));
  }

  formatTimeOfDay(hours) {
    const totalMinutes = Math.floor(hours * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const pad = (n) => (n < 10 ? '0' + n : n);
    const timeStr = `${pad(h)}:${pad(m)}`;

    if (hours >= 5.0 && hours < 7.5) return `${timeStr} Sunrise`;
    if (hours >= 7.5 && hours < 16.5) return `${timeStr} Day`;
    if (hours >= 16.5 && hours < 19.5) return `${timeStr} Sunset`;
    return `${timeStr} Night`;
  }

  toggleF3Debug() {
    this.f3Debug = !this.f3Debug;
    if (this.f3Overlay) {
      this.f3Overlay.classList.toggle('hidden', !this.f3Debug);
    }
    this.app.terrain.setChunkBorders(this.f3Debug);
  }

  bindEvents() {
    const app = this.app;

    const bindSlider = (id, labelId, formatFn, changeFn) => {
      const slider = document.getElementById(id);
      const label = document.getElementById(labelId);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          if (label) label.textContent = formatFn(val);
          changeFn(val);
        });
      }
    };

    // ── Settings Persistence Initialization ──
    const STORAGE_KEY = 'procedural_terrain_settings';
    const saved = window.GoodieStorage ? window.GoodieStorage.load(STORAGE_KEY, {
      autotune: 'on',
      vsync: 'auto',
      renderScale: 1.0,
      cameraMode: 'cinematic',
      shadow: '2048',
      time: 14.0,
      cycle: false,
      res: 64,
      height: 120,
      roughness: 1.0,
      renderDist: 4,
      speed: 25,
      fov: 75,
      fog: 50,
      exposure: 1.0,
      cloudSteps: 16,
      cloudHeight: 350,
      waterLevel: 3,
      waves: 0.35,
      waveSpeed: 1.0,
      volume: 100,
      wireframe: false,
      ao: true,
      clouds: true,
      shaders: true,
      foliage: true,
      water: true
    }) : {};

    const saveParam = (k, v) => {
      if (window.GoodieStorage) {
        window.GoodieStorage.updateKey(STORAGE_KEY, k, v);
      }
    };

    // ── VSync Target & Auto Quality ──
    const autotuneBtns = document.querySelectorAll('[data-autotune]');
    autotuneBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        autotuneBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-autotune');
        app.setAutoQualityMode(mode);
        saveParam('autotune', mode);
      });
    });
    if (saved.autotune) {
      autotuneBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-autotune') === saved.autotune));
      app.setAutoQualityMode(saved.autotune);
    }

    const vsyncBtns = document.querySelectorAll('[data-vsync]');
    const vsyncLabel = document.getElementById('label-vsync-target');
    vsyncBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        vsyncBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-vsync');
        if (mode === 'auto') {
          app.autoRefreshDetect = true;
          app.detectScreenRefresh();
        } else {
          app.autoRefreshDetect = false;
          app.targetFps = parseInt(mode, 10) || 60;
          if (vsyncLabel) vsyncLabel.textContent = `${app.targetFps} FPS`;
        }
        saveParam('vsync', mode);
      });
    });
    if (saved.vsync) {
      vsyncBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-vsync') === saved.vsync));
      if (saved.vsync === 'auto') {
        app.autoRefreshDetect = true;
        app.detectScreenRefresh();
      } else {
        app.autoRefreshDetect = false;
        app.targetFps = parseInt(saved.vsync, 10) || 60;
        if (vsyncLabel) vsyncLabel.textContent = `${app.targetFps} FPS`;
      }
    }

    bindSlider('slider-render-scale', 'label-render-scale', v => `${v.toFixed(2)}x`, v => {
      app.setManualMode();
      app.setRenderScale(v);
      saveParam('renderScale', v);
    });
    if (saved.renderScale !== undefined) {
      const slider = document.getElementById('slider-render-scale');
      const label = document.getElementById('label-render-scale');
      if (slider) slider.value = saved.renderScale;
      if (label) label.textContent = `${saved.renderScale.toFixed(2)}x`;
      app.setRenderScale(saved.renderScale);
    }

    // ── Camera Mode Switcher ──
    const modeBtns = document.querySelectorAll('[data-mode]');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const m = btn.getAttribute('data-mode');
        app.controls.setMode(m);
        saveParam('cameraMode', m);
      });
    });
    if (saved.cameraMode) {
      modeBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-mode') === saved.cameraMode));
      app.controls.setMode(saved.cameraMode);
    }

    // ── Shadow Quality Selector ──
    const shadowBtns = document.querySelectorAll('[data-shadow]');
    const shadowLabel = document.getElementById('label-shadows');
    shadowBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        app.setManualMode();
        shadowBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const q = btn.getAttribute('data-shadow');
        app.setShadowQuality(q);
        if (shadowLabel) {
          const names = { off: 'Off', '1024': 'Low (1K)', '2048': 'High (2K)', '4096': 'Ultra (4K)' };
          shadowLabel.textContent = names[q] || q;
        }
        saveParam('shadow', q);
      });
    });
    if (saved.shadow) {
      shadowBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-shadow') === saved.shadow));
      app.setShadowQuality(saved.shadow);
      if (shadowLabel) {
        const names = { off: 'Off', '1024': 'Low (1K)', '2048': 'High (2K)', '4096': 'Ultra (4K)' };
        shadowLabel.textContent = names[saved.shadow] || saved.shadow;
      }
    }

    // ── Time of Day & Cycle ──
    const timeSlider = document.getElementById('slider-time');
    const timeLabel = document.getElementById('label-time');
    if (timeSlider) {
      if (saved.time !== undefined) {
        timeSlider.value = saved.time;
        if (timeLabel) timeLabel.textContent = this.formatTimeOfDay(saved.time);
        app.sky.setTimeOfDay(saved.time);
      }
      timeSlider.addEventListener('input', (e) => {
        const hours = parseFloat(e.target.value);
        app.sky.setTimeOfDay(hours);
        app.water.updateSkyUniforms(app.sky.currentPreset, app.sky.scene.fog ? app.sky.scene.fog.density : 0.003);
        if (timeLabel) timeLabel.textContent = this.formatTimeOfDay(hours);
        saveParam('time', hours);
      });
    }

    const cycleToggle = document.getElementById('toggle-cycle');
    if (cycleToggle) {
      if (saved.cycle !== undefined) {
        cycleToggle.checked = !!saved.cycle;
        app.sky.setDayNightCycle(!!saved.cycle);
      }
      cycleToggle.addEventListener('change', (e) => {
        app.sky.setDayNightCycle(e.target.checked);
        saveParam('cycle', e.target.checked);
      });
    }

    app.sky.onTimeChange = (hours) => {
      const slider = document.getElementById('slider-time');
      const label = document.getElementById('label-time');
      if (slider) slider.value = hours.toFixed(2);
      if (label) label.textContent = this.formatTimeOfDay(hours);
    };

    // ── Sliders ──
    bindSlider('slider-res', 'label-res', v => `${v}`, v => {
      app.setManualMode();
      app.terrain.setResolution(parseInt(v, 10));
      saveParam('res', v);
    });
    if (saved.res) {
      const slider = document.getElementById('slider-res');
      const label = document.getElementById('label-res');
      if (slider) slider.value = saved.res;
      if (label) label.textContent = `${saved.res}`;
      app.terrain.setResolution(parseInt(saved.res, 10));
    }

    bindSlider('slider-height', 'label-height', v => `${v}m`, v => {
      app.generator.setParams({ heightScale: v });
      app.terrain.clear();
      saveParam('height', v);
    });
    if (saved.height !== undefined) {
      const slider = document.getElementById('slider-height');
      const label = document.getElementById('label-height');
      if (slider) slider.value = saved.height;
      if (label) label.textContent = `${saved.height}m`;
      app.generator.setParams({ heightScale: saved.height });
    }

    bindSlider('slider-roughness', 'label-roughness', v => `${v.toFixed(2)}x`, v => {
      app.generator.setParams({ roughness: v });
      app.terrain.clear();
      saveParam('roughness', v);
    });
    if (saved.roughness !== undefined) {
      const slider = document.getElementById('slider-roughness');
      const label = document.getElementById('label-roughness');
      if (slider) slider.value = saved.roughness;
      if (label) label.textContent = `${saved.roughness.toFixed(2)}x`;
      app.generator.setParams({ roughness: saved.roughness });
    }

    bindSlider('slider-render-dist', 'label-render-dist', v => `${v} chunks`, v => {
      app.setManualMode();
      app.terrain.setViewRadius(parseInt(v, 10));
      saveParam('renderDist', v);
    });
    if (saved.renderDist) {
      const slider = document.getElementById('slider-render-dist');
      const label = document.getElementById('label-render-dist');
      if (slider) slider.value = saved.renderDist;
      if (label) label.textContent = `${saved.renderDist} chunks`;
      app.terrain.setViewRadius(parseInt(saved.renderDist, 10));
    }

    bindSlider('slider-speed', 'label-speed', v => `${v} m/s`, v => {
      app.controls.setSpeed(v);
      saveParam('speed', v);
    });
    if (saved.speed !== undefined) {
      const slider = document.getElementById('slider-speed');
      const label = document.getElementById('label-speed');
      if (slider) slider.value = Math.round(saved.speed);
      if (label) label.textContent = `${Math.round(saved.speed)} m/s`;
      app.controls.setSpeed(saved.speed);
    }

    app.controls.onSpeedChange = (v) => {
      const slider = document.getElementById('slider-speed');
      const label = document.getElementById('label-speed');
      if (slider) slider.value = Math.round(v);
      if (label) label.textContent = `${Math.round(v)} m/s`;
    };

    bindSlider('slider-fov', 'label-fov', v => `${Math.round(v)}°`, v => {
      app.camera.fov = v;
      app.camera.updateProjectionMatrix();
      saveParam('fov', v);
    });
    if (saved.fov !== undefined) {
      const slider = document.getElementById('slider-fov');
      const label = document.getElementById('label-fov');
      if (slider) slider.value = saved.fov;
      if (label) label.textContent = `${Math.round(saved.fov)}°`;
      app.camera.fov = saved.fov;
      app.camera.updateProjectionMatrix();
    }

    bindSlider('slider-fog', 'label-fog', v => `${v}%`, v => {
      const factor = v / 100.0;
      app.sky.setFogDensityFactor(factor);
      if (app.sky.scene.fog) {
        app.water.updateSkyUniforms(app.sky.currentPreset, app.sky.scene.fog.density);
      }
      saveParam('fog', v);
    });
    if (saved.fog !== undefined) {
      const slider = document.getElementById('slider-fog');
      const label = document.getElementById('label-fog');
      if (slider) slider.value = saved.fog;
      if (label) label.textContent = `${saved.fog}%`;
      app.sky.setFogDensityFactor(saved.fog / 100.0);
    }

    bindSlider('slider-exposure', 'label-exposure', v => `${v.toFixed(2)}x`, v => {
      app.renderer.toneMappingExposure = v;
      saveParam('exposure', v);
    });
    if (saved.exposure !== undefined) {
      const slider = document.getElementById('slider-exposure');
      const label = document.getElementById('label-exposure');
      if (slider) slider.value = saved.exposure;
      if (label) label.textContent = `${saved.exposure.toFixed(2)}x`;
      app.renderer.toneMappingExposure = saved.exposure;
    }

    bindSlider('slider-cloud-steps', 'label-cloud-steps', v => `${v}`, v => {
      app.setManualMode();
      if (app.clouds && app.clouds.setSteps) app.clouds.setSteps(v);
      saveParam('cloudSteps', v);
    });
    if (saved.cloudSteps !== undefined) {
      const slider = document.getElementById('slider-cloud-steps');
      const label = document.getElementById('label-cloud-steps');
      if (slider) slider.value = saved.cloudSteps;
      if (label) label.textContent = `${saved.cloudSteps}`;
      if (app.clouds && app.clouds.setSteps) app.clouds.setSteps(saved.cloudSteps);
    }

    bindSlider('slider-cloud-height', 'label-cloud-height', v => `${v}m`, v => {
      if (app.clouds && app.clouds.setAltitude) app.clouds.setAltitude(v);
      saveParam('cloudHeight', v);
    });
    if (saved.cloudHeight !== undefined) {
      const slider = document.getElementById('slider-cloud-height');
      const label = document.getElementById('label-cloud-height');
      if (slider) slider.value = saved.cloudHeight;
      if (label) label.textContent = `${saved.cloudHeight}m`;
      if (app.clouds && app.clouds.setAltitude) app.clouds.setAltitude(saved.cloudHeight);
    }

    bindSlider('slider-water-level', 'label-water-level', v => `${v}m`, v => {
      app.water.setWaterLevel(v);
      app.generator.setParams({ waterLevel: v });
      app.terrain.clear();
      saveParam('waterLevel', v);
    });
    if (saved.waterLevel !== undefined) {
      const slider = document.getElementById('slider-water-level');
      const label = document.getElementById('label-water-level');
      if (slider) slider.value = saved.waterLevel;
      if (label) label.textContent = `${saved.waterLevel}m`;
      app.water.setWaterLevel(saved.waterLevel);
      app.generator.setParams({ waterLevel: saved.waterLevel });
    }

    bindSlider('slider-waves', 'label-waves', v => `${v.toFixed(2)}x`, v => {
      app.water.setWaveIntensity(v);
      saveParam('waves', v);
    });
    if (saved.waves !== undefined) {
      const slider = document.getElementById('slider-waves');
      const label = document.getElementById('label-waves');
      if (slider) slider.value = saved.waves;
      if (label) label.textContent = `${saved.waves.toFixed(2)}x`;
      app.water.setWaveIntensity(saved.waves);
    }

    bindSlider('slider-wave-speed', 'label-wave-speed', v => `${v.toFixed(1)}x`, v => {
      app.water.setWaveSpeed(v);
      saveParam('waveSpeed', v);
    });
    if (saved.waveSpeed !== undefined) {
      const slider = document.getElementById('slider-wave-speed');
      const label = document.getElementById('label-wave-speed');
      if (slider) slider.value = saved.waveSpeed;
      if (label) label.textContent = `${saved.waveSpeed.toFixed(1)}x`;
      app.water.setWaveSpeed(saved.waveSpeed);
    }

    bindSlider('slider-volume', 'label-volume', v => `${Math.round(v)}%`, v => {
      app.audio.setMasterVolume(v / 100.0);
      saveParam('volume', v);
    });
    if (saved.volume !== undefined) {
      const slider = document.getElementById('slider-volume');
      const label = document.getElementById('label-volume');
      if (slider) slider.value = saved.volume;
      if (label) label.textContent = `${Math.round(saved.volume)}%`;
      app.audio.setMasterVolume(saved.volume / 100.0);
    }

    // ── Toggles ──
    const wireframeBtn = document.getElementById('btn-wireframe');
    if (wireframeBtn) {
      if (saved.wireframe !== undefined) {
        app.terrain.setWireframe(!!saved.wireframe);
        wireframeBtn.classList.toggle('active', !!saved.wireframe);
      }
      wireframeBtn.addEventListener('click', () => {
        app.terrain.setWireframe(!app.terrain.wireframe);
        wireframeBtn.classList.toggle('active', app.terrain.wireframe);
        saveParam('wireframe', app.terrain.wireframe);
      });
    }

    const soundBtn = document.getElementById('btn-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => app.audio.toggleSound());
    }

    const aoToggle = document.getElementById('toggle-ao-reflections');
    if (aoToggle) {
      if (saved.ao !== undefined) {
        aoToggle.checked = !!saved.ao;
        app.terrain.setAmbientOcclusionAndReflections(!!saved.ao);
        if (app.ssao) app.ssao.setEnabled(!!saved.ao);
      }
      aoToggle.addEventListener('change', (e) => {
        app.setManualMode();
        app.terrain.setAmbientOcclusionAndReflections(e.target.checked);
        if (app.ssao) app.ssao.setEnabled(e.target.checked);
        saveParam('ao', e.target.checked);
      });
    }

    const cloudsToggle = document.getElementById('toggle-clouds');
    if (cloudsToggle) {
      if (saved.clouds !== undefined) {
        cloudsToggle.checked = !!saved.clouds;
        if (app.clouds) app.clouds.setVisible(!!saved.clouds);
      }
      cloudsToggle.addEventListener('change', (e) => {
        app.setManualMode();
        if (app.clouds) app.clouds.setVisible(e.target.checked);
        saveParam('clouds', e.target.checked);
      });
    }

    const shadersToggle = document.getElementById('toggle-shaders');
    if (shadersToggle) {
      if (saved.shaders !== undefined) {
        shadersToggle.checked = !!saved.shaders;
        app.water.setShaderEffects(!!saved.shaders);
      }
      shadersToggle.addEventListener('change', (e) => {
        app.setManualMode();
        app.water.setShaderEffects(e.target.checked);
        saveParam('shaders', e.target.checked);
      });
    }

    const foliageToggle = document.getElementById('toggle-foliage');
    if (foliageToggle) {
      if (saved.foliage !== undefined) {
        foliageToggle.checked = !!saved.foliage;
        app.terrain.setFoliageEnabled(!!saved.foliage);
      }
      foliageToggle.addEventListener('change', (e) => {
        app.setManualMode();
        app.terrain.setFoliageEnabled(e.target.checked);
        saveParam('foliage', e.target.checked);
      });
    }

    const waterToggle = document.getElementById('toggle-water');
    if (waterToggle) {
      if (saved.water !== undefined) {
        waterToggle.checked = !!saved.water;
        app.water.setVisible(!!saved.water);
      }
      waterToggle.addEventListener('change', (e) => {
        app.water.setVisible(e.target.checked);
        saveParam('water', e.target.checked);
      });
    }

    // World Seed Randomizer (R)
    const seedBtn = document.getElementById('btn-seed') || document.getElementById('btn-random-seed');
    if (seedBtn) {
      seedBtn.addEventListener('click', () => {
        app.seed = Math.floor(Math.random() * 1000000);
        app.generator.setSeed(app.seed);
        app.water.setTerrainGenerator(app.generator);
        app.terrain.clear();
      });
    }

    // ── Canonical iOS FLIP Modal Spring Animator ─────────────────────────────
    const hudSidebar = document.getElementById('left-hud');
    const collapseBtn = document.getElementById('btn-collapse-hud');
    let isTransitioning = false;

    // Apple Spring Easing Curves
    const IOS_SPRING_EXPAND_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
    const IOS_SPRING_COLLAPSE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

    const collapseSidebar = () => {
      if (!hudSidebar || isTransitioning || hudSidebar.classList.contains('collapsed')) return;
      isTransitioning = true;
      hudSidebar.classList.add('animating');

      const fullW = hudSidebar.offsetWidth || 310;
      const fullH = hudSidebar.offsetHeight || (window.innerHeight - 32);

      // 1. Crossfade: Fade out all panel contents immediately (100ms)
      const innerElements = hudSidebar.querySelectorAll('.hud-title-row, .hud-section, .action-btn, .seg-control, .hud-top-actions > :not(#btn-collapse-hud)');
      innerElements.forEach(el => {
        el.style.transition = 'opacity 0.1s ease-out';
        el.style.opacity = '0';
      });

      // 2. Animate container physical dimensions down to button bounds (320ms dismissal)
      const anim = hudSidebar.animate([
        {
          width: `${fullW}px`,
          height: `${fullH}px`,
          borderRadius: '16px',
          padding: '1.1rem'
        },
        {
          width: '2.75rem',
          height: '2.75rem',
          borderRadius: '16px',
          padding: '0px'
        }
      ], {
        duration: 320,
        easing: IOS_SPRING_COLLAPSE_EASE,
        fill: 'forwards'
      });

      anim.onfinish = () => {
        hudSidebar.classList.add('collapsed');
        hudSidebar.classList.remove('animating');
        anim.cancel();
        innerElements.forEach(el => {
          el.style.transition = '';
          el.style.opacity = '';
        });
        isTransitioning = false;
      };
    };

    const expandSidebar = () => {
      if (!hudSidebar || isTransitioning || !hudSidebar.classList.contains('collapsed')) return;
      isTransitioning = true;
      hudSidebar.classList.add('animating');

      const fullW = 310;
      const fullH = window.innerHeight - 32;

      // 1. Remove collapsed state and prep staged fade-in
      hudSidebar.classList.remove('collapsed');
      const innerElements = hudSidebar.querySelectorAll('.hud-title-row, .hud-section, .action-btn, .seg-control, .hud-top-actions > :not(#btn-collapse-hud)');
      innerElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.24s ease-out 0.16s'; // Crossfade: fades in smoothly as container expands
      });

      // 2. Animate container physical bounds from button to full panel (460ms presentation)
      const anim = hudSidebar.animate([
        {
          width: '2.75rem',
          height: '2.75rem',
          borderRadius: '16px',
          padding: '0px'
        },
        {
          width: `${fullW}px`,
          height: `${fullH}px`,
          borderRadius: '16px',
          padding: '1.1rem'
        }
      ], {
        duration: 460,
        easing: IOS_SPRING_EXPAND_EASE,
        fill: 'forwards'
      });

      // Trigger inner content reveal
      requestAnimationFrame(() => {
        innerElements.forEach(el => {
          el.style.opacity = '1';
        });
      });

      anim.onfinish = () => {
        hudSidebar.classList.remove('animating');
        anim.cancel();
        innerElements.forEach(el => {
          el.style.transition = '';
          el.style.opacity = '';
        });
        isTransitioning = false;
      };
    };

    // Collapse button closes or expands the sidebar
    if (collapseBtn) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hudSidebar.classList.contains('collapsed')) {
          expandSidebar();
        } else {
          collapseSidebar();
        }
      });
    }

    // Clicking anywhere on the collapsed sidebar re-opens it
    if (hudSidebar) {
      hudSidebar.addEventListener('click', (e) => {
        if (hudSidebar.classList.contains('collapsed')) {
          expandSidebar();
        }
      });
    }

    // ── Telemetry Stats HUD iOS Modal Spring Animator ──
    const telemetryHud = document.getElementById('telemetry-hud');
    const telemetryToggle = document.getElementById('btn-telemetry-toggle');
    let isTelemetryTransitioning = false;

    const closeTelemetry = () => {
      if (!telemetryHud || isTelemetryTransitioning || telemetryHud.classList.contains('hidden')) return;
      isTelemetryTransitioning = true;

      const fullW = telemetryHud.offsetWidth || 215;
      const fullH = telemetryHud.offsetHeight || 195;

      // 1. Crossfade: fade out contents immediately
      const innerElements = telemetryHud.querySelectorAll('.telemetry-header, .telemetry-grid');
      innerElements.forEach(el => {
        el.style.transition = 'opacity 0.1s ease-out';
        el.style.opacity = '0';
      });

      // 2. Animate container physical bounds collapse towards top-right corner
      const anim = telemetryHud.animate([
        {
          width: `${fullW}px`,
          height: `${fullH}px`,
          borderRadius: '14px',
          opacity: 0.5,
          transform: 'scale(1)',
          padding: '0.85rem 1rem'
        },
        {
          width: '0px',
          height: '0px',
          borderRadius: '14px',
          opacity: 0,
          transform: 'scale(0.4)',
          padding: '0px'
        }
      ], {
        duration: 320,
        easing: IOS_SPRING_COLLAPSE_EASE,
        fill: 'forwards'
      });

      anim.onfinish = () => {
        telemetryHud.classList.add('hidden');
        anim.cancel();
        telemetryHud.style.width = '';
        telemetryHud.style.height = '';
        innerElements.forEach(el => {
          el.style.transition = '';
          el.style.opacity = '';
        });
        if (telemetryToggle) telemetryToggle.classList.remove('active');
        isTelemetryTransitioning = false;
      };
    };

    const openTelemetry = () => {
      if (!telemetryHud || isTelemetryTransitioning || !telemetryHud.classList.contains('hidden')) return;
      isTelemetryTransitioning = true;

      // 1. Measure natural live DOM dimensions without hardcoded height
      telemetryHud.style.visibility = 'hidden';
      telemetryHud.classList.remove('hidden');
      const targetW = telemetryHud.offsetWidth || 215;
      const targetH = telemetryHud.offsetHeight || 195;
      telemetryHud.style.visibility = '';

      const innerElements = telemetryHud.querySelectorAll('.telemetry-header, .telemetry-grid');
      innerElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.22s ease-out 0.14s';
      });

      // 2. Animate from 0x0 to the EXACT measured natural dimensions
      const anim = telemetryHud.animate([
        {
          width: '0px',
          height: '0px',
          borderRadius: '14px',
          opacity: 0,
          transform: 'scale(0.4)',
          padding: '0px'
        },
        {
          width: `${targetW}px`,
          height: `${targetH}px`,
          borderRadius: '14px',
          opacity: 0.5,
          transform: 'scale(1)',
          padding: '0.85rem 1rem'
        }
      ], {
        duration: 440,
        easing: IOS_SPRING_EXPAND_EASE,
        fill: 'forwards'
      });

      requestAnimationFrame(() => {
        innerElements.forEach(el => {
          el.style.opacity = '1';
        });
      });

      anim.onfinish = () => {
        anim.cancel();
        telemetryHud.style.width = '';
        telemetryHud.style.height = '';
        innerElements.forEach(el => {
          el.style.transition = '';
          el.style.opacity = '';
        });
        if (telemetryToggle) telemetryToggle.classList.add('active');
        isTelemetryTransitioning = false;
      };
    };

    const toggleTelemetry = (show) => {
      if (!telemetryHud) return;
      const isHidden = telemetryHud.classList.contains('hidden');
      const shouldShow = show !== undefined ? show : isHidden;
      if (shouldShow) {
        openTelemetry();
      } else {
        closeTelemetry();
      }
    };

    if (telemetryToggle) {
      telemetryToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTelemetry();
      });
    }

    // Help Modal
    const instructionsModal = document.getElementById('instructions-modal');
    const infoBtn = document.getElementById('btn-info');
    const closeInfoBtn = document.getElementById('btn-close-info');

    const showHelpModal = () => {
      if (!instructionsModal) return;
      instructionsModal.classList.remove('hiding');
      instructionsModal.classList.add('show');
    };

    const hideHelpModal = () => {
      if (!instructionsModal) return;
      instructionsModal.classList.add('hiding');
      setTimeout(() => {
        instructionsModal.classList.remove('show', 'hiding');
      }, 220);
    };

    if (infoBtn) {
      infoBtn.addEventListener('click', () => {
        if (instructionsModal.classList.contains('show')) {
          hideHelpModal();
        } else {
          showHelpModal();
        }
      });
    }

    if (closeInfoBtn) {
      closeInfoBtn.addEventListener('click', hideHelpModal);
    }

    // Global Keybindings
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'F3' || e.keyCode === 114) {
        e.preventDefault();
        this.toggleF3Debug();
      } else if (e.key === 'h' || e.key === 'H') {
        if (instructionsModal && instructionsModal.classList.contains('show')) {
          hideHelpModal();
        } else {
          showHelpModal();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (seedBtn) seedBtn.click();
      } else if (e.key === 'm' || e.key === 'M') {
        app.audio.toggleSound();
      }
    });

    window.addEventListener('pointerLockActive', () => {
      if (hudSidebar && !hudSidebar.classList.contains('collapsed') && collapseBtn) {
        collapseBtn.click();
      }
    });

    window.addEventListener('throwStone', () => {
      app.physics.throwStone();
    });
  }

  updateStats() {
    this.frameCount++;
    const now = performance.now();
    const dt = now - this.lastFpsTime;

    if (dt >= 400) {
      this.currentFps = Math.round((this.frameCount * 1000) / dt);
      this.frameCount = 0;
      this.lastFpsTime = now;
      if (this.statFps) this.statFps.textContent = `${this.currentFps} FPS`;
    }

    // Avoid repeated climate sampling and DOM writes on every rendered frame.
    if (now - this.lastStatsUpdate < 100) return;
    this.lastStatsUpdate = now;

    const cam = this.app.camera;
    const camPos = cam.position;
    if (this.statX) this.statX.textContent = `${Math.round(camPos.x)}m`;
    if (this.statZ) this.statZ.textContent = `${Math.round(camPos.z)}m`;
    if (this.statAlt) this.statAlt.textContent = `${Math.round(camPos.y)}m`;
    if (this.statChunks) this.statChunks.textContent = `${this.app.terrain.chunks.size}`;

    const climate = this.app.generator.getClimate(camPos.x, camPos.z);
    if (this.statBiome) {
      this.statBiome.textContent = climate.biomeName;
    }

    // F3 Debug Screen Live Updates
    if (this.f3Debug && this.f3Overlay) {
      const ms = (1000 / Math.max(1, this.currentFps)).toFixed(1);
      if (this.f3Fps) this.f3Fps.textContent = `${this.currentFps} fps (${ms} ms)`;

      if (this.f3Xyz) {
        this.f3Xyz.textContent = `XYZ: ${camPos.x.toFixed(3)} / ${camPos.y.toFixed(3)} / ${camPos.z.toFixed(3)}`;
      }

      const bx = Math.floor(camPos.x);
      const by = Math.floor(camPos.y);
      const bz = Math.floor(camPos.z);
      if (this.f3Block) this.f3Block.textContent = `Block: ${bx} ${by} ${bz}`;

      const cSize = this.app.terrain.chunkSize;
      const cx = Math.floor((camPos.x + cSize * 0.5) / cSize);
      const cz = Math.floor((camPos.z + cSize * 0.5) / cSize);
      const inX = ((bx % cSize) + cSize) % cSize;
      const inZ = ((bz % cSize) + cSize) % cSize;
      if (this.f3Chunk) this.f3Chunk.textContent = `Chunk: ${cx} ${cz} in [${inX}, ${inZ}]`;

      // Facing Direction
      const yaw = this.app.controls.yaw || 0;
      const deg = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
      let dirStr = 'South (+Z)';
      if (deg >= 45 && deg < 135) dirStr = 'West (-X)';
      else if (deg >= 135 && deg < 225) dirStr = 'North (-Z)';
      else if (deg >= 225 && deg < 315) dirStr = 'East (+X)';

      if (this.f3Facing) {
        this.f3Facing.textContent = `Facing: ${dirStr} (${deg.toFixed(1)}° / ${((this.app.controls.pitch || 0) * 180 / Math.PI).toFixed(1)}°)`;
      }

      if (this.f3Climate) {
        this.f3Climate.textContent = `Climate: Temp: ${climate.temp.toFixed(2)} | Hum: ${climate.humidity.toFixed(2)} | Cont: ${climate.continentalness.toFixed(2)}`;
      }

      if (this.f3Biome) {
        this.f3Biome.textContent = `Biome: minecraft:${climate.biome} (${climate.biomeName})`;
      }

      if (this.f3Chunks) {
        this.f3Chunks.textContent = `Chunks: ${this.app.terrain.chunks.size} active (${this.app.terrain.pendingChunks.length} queued)`;
      }

      const rInfo = this.app.renderer.info.render;
      if (this.f3Render && rInfo) {
        this.f3Render.textContent = `Draw calls: ${rInfo.calls} | Triangles: ${(rInfo.triangles / 1000).toFixed(1)}k`;
      }

      const mem = performance.memory;
      if (this.f3Mem && mem) {
        const usedMB = (mem.usedJSHeapSize / 1048576).toFixed(0);
        const totalMB = (mem.totalJSHeapSize / 1048576).toFixed(0);
        this.f3Mem.textContent = `Mem: Heap ${usedMB}MB / ${totalMB}MB`;
      }
    }
  }
}
