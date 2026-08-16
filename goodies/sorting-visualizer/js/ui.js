/**
 * Sorting Visualizer UI & Interaction Controller
 * 100% Matching Procedural Terrain iOS FLIP Spring Animators & Telemetry HUD
 */

class SortingUIManager {
  constructor(app) {
    this.app = app;
    this.initFLIPSidebar();
    this.initTelemetryHUD();
    this.bindEvents();
  }

  initFLIPSidebar() {
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
      hudSidebar.addEventListener('click', () => {
        if (hudSidebar.classList.contains('collapsed')) {
          expandSidebar();
        }
      });
    }
  }

  initTelemetryHUD() {
    const telemetryHud = document.getElementById('telemetry-hud');
    const telemetryToggle = document.getElementById('btn-telemetry-toggle');
    let isTelemetryTransitioning = false;

    const IOS_SPRING_EXPAND_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
    const IOS_SPRING_COLLAPSE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

    const closeTelemetry = () => {
      if (!telemetryHud || isTelemetryTransitioning || telemetryHud.classList.contains('hidden')) return;
      isTelemetryTransitioning = true;

      const fullW = telemetryHud.offsetWidth || 210;
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
      const targetW = telemetryHud.offsetWidth || 210;
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

    const bindStepperSelect = (prevId, nextId, selectId, changeFn) => {
      const prevBtn = document.getElementById(prevId);
      const nextBtn = document.getElementById(nextId);
      const select = document.getElementById(selectId);
      if (!select) return;

      const step = (dir) => {
        const enabledOptions = Array.from(select.options).filter(opt => !opt.disabled);
        if (enabledOptions.length <= 1) return;
        const currentIdx = enabledOptions.findIndex(opt => opt.value === select.value);
        let nextIdx = (currentIdx + dir + enabledOptions.length) % enabledOptions.length;
        select.value = enabledOptions[nextIdx].value;
        select.dispatchEvent(new Event('change'));
      };

      if (prevBtn) prevBtn.addEventListener('click', () => step(-1));
      if (nextBtn) nextBtn.addEventListener('click', () => step(1));
      select.addEventListener('change', (e) => changeFn(e.target.value));
    };

    // ── Settings Persistence Initialization ──
    const STORAGE_KEY = 'sorting_visualizer_settings';
    const saved = window.GoodieStorage ? window.GoodieStorage.load(STORAGE_KEY, {
      algorithm: 'quick',
      distribution: 'random',
      projection: 'bars',
      colorTheme: 'cyan',
      glow: 100,
      gap: 1.0,
      trail: 0,
      rot: 100,
      connectLines: true,
      size: 128,
      speedSlider: 62,
      timbre: 'sine_bell',
      volume: 65,
      sound: true,
      telemetry: true,
      sidebarCollapsed: false
    }) : {};

    const saveParam = (k, v) => {
      if (window.GoodieStorage) {
        window.GoodieStorage.updateKey(STORAGE_KEY, k, v);
      }
    };

    // Algorithm Selector with Steppers
    bindStepperSelect('btn-algo-prev', 'btn-algo-next', 'select-algorithm', v => {
      app.setAlgorithm(v);
      saveParam('algorithm', v);
    });
    if (saved.algorithm) {
      const selectAlgo = document.getElementById('select-algorithm');
      if (selectAlgo) { selectAlgo.value = saved.algorithm; app.setAlgorithm(saved.algorithm); }
    }

    // Distribution / Initial Pattern Selector with Steppers
    bindStepperSelect('btn-dist-prev', 'btn-dist-next', 'select-distribution', v => {
      app.setDistribution(v);
      saveParam('distribution', v);
    });
    if (saved.distribution) {
      const selectDist = document.getElementById('select-distribution');
      if (selectDist) { selectDist.value = saved.distribution; app.setDistribution(saved.distribution); }
    }

    // Sound Timbre Selector with Steppers
    bindStepperSelect('btn-sound-prev', 'btn-sound-next', 'select-sound-timbre', v => {
      app.audio.setPreset(v);
      saveParam('timbre', v);
    });
    if (saved.timbre) {
      const selectTimbre = document.getElementById('select-sound-timbre');
      if (selectTimbre) { selectTimbre.value = saved.timbre; app.audio.setPreset(saved.timbre); }
    }

    // Projection Mode Selector with Steppers
    bindStepperSelect('btn-proj-prev', 'btn-proj-next', 'select-projection', v => {
      app.renderer.setMode(v);
      app.renderCurrent();
      saveParam('projection', v);
    });
    if (saved.projection) {
      const selectProj = document.getElementById('select-projection');
      if (selectProj) { selectProj.value = saved.projection; app.renderer.setMode(saved.projection); }
    }

    // Theme Selector
    const themeBtns = document.querySelectorAll('[data-theme]');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        themeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.getAttribute('data-theme');
        app.renderer.setColorTheme(theme);
        app.renderCurrent();
        saveParam('colorTheme', theme);
      });
    });
    if (saved.colorTheme) {
      themeBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-theme') === saved.colorTheme));
      app.renderer.setColorTheme(saved.colorTheme);
    }

    // Play / Pause Button
    const playBtn = document.getElementById('btn-play');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        app.togglePlay();
      });
    }

    // Step Button
    const stepBtn = document.getElementById('btn-step');
    if (stepBtn) {
      stepBtn.addEventListener('click', () => {
        app.step();
      });
    }

    // Shuffle / Reset Button in Execution Controls
    const shuffleBtn = document.getElementById('btn-shuffle') || document.getElementById('btn-reset');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => {
        app.resetArray();
      });
    }

    // Custom Audio File Upload
    const uploadBtn = document.getElementById('btn-upload-audio');
    const audioInput = document.getElementById('input-custom-audio');
    const customLabel = document.getElementById('label-custom-audio');
    const optCustom = document.getElementById('opt-custom-sound');

    if (uploadBtn && audioInput) {
      uploadBtn.addEventListener('click', () => {
        audioInput.click();
      });

      audioInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        uploadBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Decoding...';
        const res = await app.audio.loadCustomAudioFile(file);

        if (res.success) {
          uploadBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Sound Loaded';
          if (customLabel) {
            customLabel.style.display = 'block';
            customLabel.textContent = `Custom: ${file.name}`;
          }
          if (optCustom) {
            optCustom.disabled = false;
            const selectSound = document.getElementById('select-sound-timbre');
            if (selectSound) {
              selectSound.value = 'custom';
              selectSound.dispatchEvent(new Event('change'));
            }
          }
        } else {
          uploadBtn.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Failed to Decode';
        }
      });
    }

    // ── Optics Sliders ──
    bindSlider('slider-glow', 'label-glow', v => `${Math.round(v)}%`, v => {
      app.renderer.setGlow(v / 100.0);
      app.renderCurrent();
      saveParam('glow', v);
    });
    if (saved.glow !== undefined) {
      const slider = document.getElementById('slider-glow');
      const label = document.getElementById('label-glow');
      if (slider) slider.value = saved.glow;
      if (label) label.textContent = `${Math.round(saved.glow)}%`;
      app.renderer.setGlow(saved.glow / 100.0);
    }

    bindSlider('slider-gap', 'label-gap', v => `${v.toFixed(1)} px`, v => {
      app.renderer.setGap(v);
      app.renderCurrent();
      saveParam('gap', v);
    });
    if (saved.gap !== undefined) {
      const slider = document.getElementById('slider-gap');
      const label = document.getElementById('label-gap');
      if (slider) slider.value = saved.gap;
      if (label) label.textContent = `${saved.gap.toFixed(1)} px`;
      app.renderer.setGap(saved.gap);
    }

    bindSlider('slider-trail', 'label-trail', v => `${Math.round(v)}%`, v => {
      app.renderer.setTrail(v / 100.0);
      saveParam('trail', v);
    });
    if (saved.trail !== undefined) {
      const slider = document.getElementById('slider-trail');
      const label = document.getElementById('label-trail');
      if (slider) slider.value = saved.trail;
      if (label) label.textContent = `${Math.round(saved.trail)}%`;
      app.renderer.setTrail(saved.trail / 100.0);
    }

    bindSlider('slider-rot', 'label-rot', v => `${(v / 100.0).toFixed(1)}x`, v => {
      app.renderer.setRotSpeed(v / 100.0);
      saveParam('rot', v);
    });
    if (saved.rot !== undefined) {
      const slider = document.getElementById('slider-rot');
      const label = document.getElementById('label-rot');
      if (slider) slider.value = saved.rot;
      if (label) label.textContent = `${(saved.rot / 100.0).toFixed(1)}x`;
      app.renderer.setRotSpeed(saved.rot / 100.0);
    }

    const toggleLines = document.getElementById('toggle-connect-lines');
    if (toggleLines) {
      toggleLines.addEventListener('change', (e) => {
        app.renderer.setConnectLines(e.target.checked);
        app.renderCurrent();
        saveParam('connectLines', e.target.checked);
      });
      if (saved.connectLines !== undefined) {
        toggleLines.checked = !!saved.connectLines;
        app.renderer.setConnectLines(!!saved.connectLines);
      }
    }

    // ── Parameters Sliders ──
    bindSlider('slider-size', 'label-size', v => `${v}`, v => {
      app.setArraySize(parseInt(v, 10));
      saveParam('size', v);
    });
    if (saved.size) {
      const slider = document.getElementById('slider-size');
      const label = document.getElementById('label-size');
      if (slider) slider.value = saved.size;
      if (label) label.textContent = `${saved.size}`;
      app.setArraySize(parseInt(saved.size, 10));
    }

    const speedSlider = document.getElementById('slider-speed');
    const speedLabel = document.getElementById('label-speed');

    const calculateSpeed = (sliderVal) => {
      if (sliderVal <= 50) {
        // 0 -> 0.02 op/frame (~1.2 op/sec); 50 -> 1.0 op/frame (60 op/sec)
        return 0.02 * Math.pow(50, sliderVal / 50);
      } else {
        // 50 -> 1.0 op/frame; 100 -> 250 op/frame (15,000 op/sec)
        return 1.0 + Math.pow((sliderVal - 50) / 50, 2.2) * 249.0;
      }
    };

    const formatSpeed = (speed) => {
      if (speed < 0.95) {
        const opsPerSec = speed * 60;
        if (opsPerSec < 1.0) {
          return `${opsPerSec.toFixed(2)} op/s (1/${Math.round(1 / speed)}f)`;
        }
        return `${opsPerSec.toFixed(1)} op/s (1/${Math.round(1 / speed)}f)`;
      } else if (speed < 1.1) {
        return `1 op/frame`;
      } else {
        return `${Math.round(speed)} op/frame`;
      }
    };

    if (speedSlider) {
      if (saved.speedSlider !== undefined) {
        speedSlider.value = saved.speedSlider;
      }
      speedSlider.addEventListener('input', (e) => {
        const rawVal = parseFloat(e.target.value);
        const speed = calculateSpeed(rawVal);
        if (speedLabel) speedLabel.textContent = formatSpeed(speed);
        app.setSpeed(speed);
        saveParam('speedSlider', rawVal);
      });
      // Initial label format
      const initialSpeed = calculateSpeed(parseFloat(speedSlider.value));
      if (speedLabel) speedLabel.textContent = formatSpeed(initialSpeed);
      app.setSpeed(initialSpeed);
    }

    bindSlider('slider-volume', 'label-volume', v => `${Math.round(v)}%`, v => {
      app.audio.setVolume(v / 100.0);
      saveParam('volume', v);
    });
    if (saved.volume !== undefined) {
      const slider = document.getElementById('slider-volume');
      const label = document.getElementById('label-volume');
      if (slider) slider.value = saved.volume;
      if (label) label.textContent = `${Math.round(saved.volume)}%`;
      app.audio.setVolume(saved.volume / 100.0);
    }

    // Sound Toggle Button
    const soundBtn = document.getElementById('btn-sound');
    if (soundBtn) {
      if (saved.sound !== undefined && !saved.sound) {
        app.audio.toggleSound();
        soundBtn.classList.remove('active');
        soundBtn.innerHTML = '<i class="bi bi-volume-mute-fill"></i>';
      }
      soundBtn.addEventListener('click', () => {
        const enabled = app.audio.toggleSound();
        soundBtn.classList.toggle('active', enabled);
        soundBtn.innerHTML = enabled ?
          '<i class="bi bi-volume-up-fill"></i>' :
          '<i class="bi bi-volume-mute-fill"></i>';
        saveParam('sound', enabled);
      });
    }

    // ── Help Modal (FLIP 0% -> 100% Background Scale with Inner Content Fade-In) ──
    const instructionsModal = document.getElementById('instructions-modal');
    const modalContent = instructionsModal ? instructionsModal.querySelector('.modal-content') : null;
    const modalInner = instructionsModal ? instructionsModal.querySelector('.modal-inner') : null;
    const infoBtn = document.getElementById('btn-info');
    const closeInfoBtn = document.getElementById('btn-close-info');
    let isModalTransitioning = false;

    const openModal = () => {
      if (!instructionsModal || !modalContent || isModalTransitioning) return;
      isModalTransitioning = true;

      instructionsModal.classList.add('show');
      instructionsModal.style.opacity = '1';
      instructionsModal.style.pointerEvents = 'auto';

      if (modalInner) {
        modalInner.style.opacity = '0';
        modalInner.style.transition = 'opacity 0.2s linear 0.12s';
      }

      // Background card scales from 0% to 100% with linear easing
      const anim = modalContent.animate([
        {
          transform: 'scale(0)',
          opacity: 0,
          borderRadius: '32px'
        },
        {
          transform: 'scale(1)',
          opacity: 1,
          borderRadius: '18px'
        }
      ], {
        duration: 340,
        easing: 'linear',
        fill: 'forwards'
      });

      // Inner content fades in cleanly without squishing
      requestAnimationFrame(() => {
        if (modalInner) {
          modalInner.style.opacity = '1';
        }
      });

      anim.onfinish = () => {
        anim.cancel();
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
        if (modalInner) {
          modalInner.style.transition = '';
          modalInner.style.opacity = '';
        }
        isModalTransitioning = false;
      };
    };

    const closeModal = () => {
      if (!instructionsModal || !modalContent || isModalTransitioning || !instructionsModal.classList.contains('show')) return;
      isModalTransitioning = true;

      if (modalInner) {
        modalInner.style.transition = 'opacity 0.1s linear';
        modalInner.style.opacity = '0';
      }

      const modalFade = instructionsModal.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], {
        duration: 240,
        easing: 'linear',
        fill: 'forwards'
      });

      const anim = modalContent.animate([
        {
          transform: 'scale(1)',
          opacity: 1,
          borderRadius: '18px'
        },
        {
          transform: 'scale(0)',
          opacity: 0,
          borderRadius: '32px'
        }
      ], {
        duration: 260,
        easing: 'linear',
        fill: 'forwards'
      });

      anim.onfinish = () => {
        instructionsModal.classList.remove('show');
        instructionsModal.style.opacity = '';
        instructionsModal.style.pointerEvents = '';
        modalContent.style.transform = '';
        modalContent.style.opacity = '';
        anim.cancel();
        modalFade.cancel();
        if (modalInner) {
          modalInner.style.transition = '';
          modalInner.style.opacity = '';
        }
        isModalTransitioning = false;
      };
    };

    if (infoBtn) {
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (instructionsModal && instructionsModal.classList.contains('show')) {
          closeModal();
        } else {
          openModal();
        }
      });
    }

    if (closeInfoBtn) {
      closeInfoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
      });
    }

    if (instructionsModal) {
      instructionsModal.addEventListener('click', (e) => {
        if (e.target === instructionsModal) {
          closeModal();
        }
      });
    }

    // Keyboard Escape to dismiss modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && instructionsModal && instructionsModal.classList.contains('show')) {
        closeModal();
      }
    });
  }

  updatePlayButton(isPlaying) {
    const playBtn = document.getElementById('btn-play');
    if (playBtn) {
      playBtn.classList.toggle('running', isPlaying);
      playBtn.innerHTML = isPlaying ?
        '<i class="bi bi-pause-fill"></i> Pause' :
        '<i class="bi bi-play-fill"></i> Start Sorting';
    }
  }

  updateStats(stats) {
    const elCompares = document.getElementById('stat-compares');
    const elSwaps = document.getElementById('stat-swaps');
    const elTime = document.getElementById('stat-time');
    const elOps = document.getElementById('stat-ops');
    const elTimeComp = document.getElementById('stat-complexity-time');
    const elSpaceComp = document.getElementById('stat-complexity-space');

    if (elCompares) elCompares.textContent = stats.comparisons.toLocaleString();
    if (elSwaps) elSwaps.textContent = stats.swaps.toLocaleString();
    if (elTime) elTime.textContent = `${stats.elapsedTime.toFixed(2)}s`;
    if (elOps) elOps.textContent = `${Math.round(stats.opsPerSec).toLocaleString()}/s`;
    if (elTimeComp) elTimeComp.textContent = stats.timeComplexity || 'O(N log N)';
    if (elSpaceComp) elSpaceComp.textContent = stats.spaceComplexity || 'O(1)';
  }
}
