/**
 * Sorting Visualizer Application Main Controller
 */

class SortingApp {
  constructor() {
    this.canvas = document.getElementById('render-canvas');
    this.renderer = new SortingRenderer(this.canvas);
    this.audio = new SortingAudioEngine();

    this.arraySize = 128;
    this.speed = 8; // operations per frame
    this.currentAlgoKey = 'quick';
    this.distribution = 'random';

    this.array = [];
    this.maxVal = 100;
    this.generator = null;
    this.isPlaying = false;
    this.isSorted = false;
    this.isSweeping = false;
    this.sweepIndex = 0;

    this.stats = {
      comparisons: 0,
      swaps: 0,
      elapsedTime: 0,
      opsPerSec: 0,
      timeComplexity: 'O(N log N)',
      spaceComplexity: 'O(log N)'
    };

    this.activeStates = {};
    this.lastFrameTime = performance.now();
    this.opsCountHistory = 0;
    this.lastFpsSampleTime = performance.now();

    this.ui = new SortingUIManager(this);
    this.resetArray();
    this.animate();
  }

  setAlgorithm(key) {
    this.currentAlgoKey = key;
    const info = SortingAlgorithms.info[key];
    if (info) {
      this.stats.timeComplexity = info.time;
      this.stats.spaceComplexity = info.space;
    }
    this.resetArray();
  }

  setDistribution(dist) {
    this.distribution = dist;
    this.resetArray();
  }

  setArraySize(size) {
    this.arraySize = size;
    this.resetArray();
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  resetArray() {
    this.isPlaying = false;
    this.isSorted = false;
    this.isSweeping = false;
    this.sweepIndex = 0;
    this.sortedGlowFadeStartTime = null;
    if (this.renderer) this.renderer.setSortedGlowAlpha(1.0);
    this.generator = null;
    this.activeStates = {};
    this.stats.comparisons = 0;
    this.stats.swaps = 0;
    this.stats.elapsedTime = 0;
    this.stats.opsPerSec = 0;

    const n = this.arraySize;
    this.array = new Array(n);
    this.maxVal = n;

    if (this.distribution === 'random') {
      for (let i = 0; i < n; i++) this.array[i] = i + 1;
      // Fisher-Yates Shuffle
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = this.array[i];
        this.array[i] = this.array[j];
        this.array[j] = temp;
      }
    } else if (this.distribution === 'reversed') {
      for (let i = 0; i < n; i++) this.array[i] = n - i;
    } else if (this.distribution === 'nearly_sorted') {
      for (let i = 0; i < n; i++) this.array[i] = i + 1;
      const swaps = Math.max(2, Math.floor(n * 0.08));
      for (let s = 0; s < swaps; s++) {
        const i = Math.floor(Math.random() * n);
        const j = Math.floor(Math.random() * n);
        const temp = this.array[i];
        this.array[i] = this.array[j];
        this.array[j] = temp;
      }
    } else if (this.distribution === 'few_unique') {
      const step = Math.max(1, Math.floor(n / 6));
      for (let i = 0; i < n; i++) {
        this.array[i] = Math.floor(i / step) * step + step;
      }
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = this.array[i];
        this.array[i] = this.array[j];
        this.array[j] = temp;
      }
    }

    if (this.ui) {
      this.ui.updatePlayButton(false);
      this.ui.updateStats(this.stats);
    }
    this.renderCurrent();
  }

  togglePlay() {
    if (this.isSorted) {
      this.resetArray();
    }

    this.isPlaying = !this.isPlaying;
    if (this.isPlaying && !this.generator && !this.isSweeping) {
      const algoFn = SortingAlgorithms[this.currentAlgoKey];
      if (algoFn) {
        this.generator = algoFn(this.array);
      }
    }

    if (this.ui) this.ui.updatePlayButton(this.isPlaying);
  }

  step() {
    if (this.isSorted) return;
    if (!this.generator && !this.isSweeping) {
      const algoFn = SortingAlgorithms[this.currentAlgoKey];
      if (algoFn) {
        this.generator = algoFn(this.array);
      }
    }

    if (this.isSweeping) {
      this.processSweepStep();
    } else {
      this.processSingleStep();
    }
    this.renderCurrent();
  }

  startVerificationSweep() {
    this.isSweeping = true;
    this.sweepIndex = 0;
    this.generator = null;
    this.activeStates = {};
  }

  processSweepStep() {
    if (this.sweepIndex >= this.array.length) {
      this.isSweeping = false;
      this.isSorted = true;
      this.isPlaying = false;
      this.sortedGlowFadeStartTime = performance.now();
      this.renderer.setSortedGlowAlpha(1.0);

      // All elements locked into sorted state (fades back to base theme over 4 seconds)
      this.activeStates = {};
      for (let i = 0; i < this.array.length; i++) {
        this.activeStates[i] = 'sorted';
      }
      this.audio.playCompletionChime();
      if (this.ui) this.ui.updatePlayButton(false);
      return;
    }

    const idx = this.sweepIndex;
    // Trailing elements remain marked as sorted green
    for (let i = 0; i < idx; i++) {
      this.activeStates[i] = 'sorted';
    }
    // Sweep head glows bright as an active leading marker
    this.activeStates[idx] = 'swap';

    const pan = (idx / (this.array.length - 1 || 1)) * 2.0 - 1.0;
    const normVal = (this.array[idx] || (idx + 1)) / this.maxVal;
    this.audio.playTone(normVal, pan, false);
    this.sweepIndex++;
  }

  processSingleStep() {
    if (!this.generator) return;

    const res = this.generator.next();
    if (res.done) {
      // Start full verification green sweep pass across the array
      this.startVerificationSweep();
      return;
    }

    const action = res.value;
    if (!action) return;

    this.activeStates = {};

    if (action.type === 'compare') {
      this.stats.comparisons++;
      if (action.indices) {
        action.indices.forEach(idx => {
          this.activeStates[idx] = 'compare';
          const pan = (idx / this.array.length) * 2.0 - 1.0;
          this.audio.playTone(this.array[idx] / this.maxVal, pan, false);
        });
      }
    } else if (action.type === 'swap') {
      this.stats.swaps++;
      if (action.indices) {
        action.indices.forEach(idx => {
          this.activeStates[idx] = 'swap';
          const pan = (idx / this.array.length) * 2.0 - 1.0;
          this.audio.playTone(this.array[idx] / this.maxVal, pan, true);
        });
      }
    } else if (action.type === 'write') {
      this.stats.swaps++;
      if (action.indices) {
        action.indices.forEach(idx => {
          this.activeStates[idx] = 'write';
          const pan = (idx / this.array.length) * 2.0 - 1.0;
          this.audio.playTone(this.array[idx] / this.maxVal, pan, true);
        });
      }
    } else if (action.type === 'pivot') {
      if (action.indices) {
        action.indices.forEach(idx => {
          this.activeStates[idx] = 'pivot';
        });
      }
    } else if (action.type === 'sorted') {
      if (action.indices) {
        action.indices.forEach(idx => {
          this.activeStates[idx] = 'sorted';
        });
      }
    }
  }

  renderCurrent() {
    this.renderer.render(this.array, this.maxVal, this.activeStates);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (this.isPlaying && !this.isSorted) {
      this.stats.elapsedTime += dt;

      if (this.isSweeping) {
        // Musical pacing: sweeps the full array in ~0.7 to 0.9 seconds for a pure ascending glissando
        const elementsPerSec = Math.max(70, this.array.length / 0.82);
        this.sweepAccumulator = (this.sweepAccumulator || 0) + elementsPerSec * dt;
        const stepsToRun = Math.floor(this.sweepAccumulator);
        if (stepsToRun > 0) {
          this.sweepAccumulator -= stepsToRun;
          for (let s = 0; s < stepsToRun; s++) {
            this.processSweepStep();
            if (!this.isSweeping) break;
          }
        }
      } else {
        // Continuous fractional & whole operations accumulator
        this.opAccumulator = (this.opAccumulator || 0) + this.speed;
        const stepsToExecute = Math.floor(this.opAccumulator);
        if (stepsToExecute > 0) {
          this.opAccumulator -= stepsToExecute;
          for (let s = 0; s < stepsToExecute; s++) {
            this.processSingleStep();
            this.opsCountHistory++;
            if (!this.isPlaying || this.isSweeping) break;
          }
        }
      }
    }

    if (now - this.lastFpsSampleTime >= 500) {
      this.stats.opsPerSec = (this.opsCountHistory / (now - this.lastFpsSampleTime)) * 1000;
      this.opsCountHistory = 0;
      this.lastFpsSampleTime = now;
      if (this.ui) this.ui.updateStats(this.stats);
    }

    // 4-Second Post-Sorting Green Glow Decay
    if (this.isSorted && this.sortedGlowFadeStartTime) {
      const elapsed = (now - this.sortedGlowFadeStartTime) / 4000.0;
      const alpha = Math.max(0.0, 1.0 - elapsed);
      this.renderer.setSortedGlowAlpha(alpha);

      if (alpha <= 0.001) {
        this.sortedGlowFadeStartTime = null;
        this.activeStates = {};
      }
    }

    this.renderCurrent();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new SortingApp();
});
