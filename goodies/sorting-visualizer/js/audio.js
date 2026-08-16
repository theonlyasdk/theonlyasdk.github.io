/**
 * 3D Stereo Web Audio Synthesizer for Sorting Operations
 * Includes 10 Distinct Timbre Presets + Custom User Audio File Upload & Sample Pitch-Shifter
 */

class SortingAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this.masterVolume = 0.65;
    this.activeVoices = 0;
    this.maxVoices = 10;
    this.currentPreset = 'sine_bell';

    // Custom decoded user audio sample buffer
    this.customAudioBuffer = null;
    this.customAudioName = null;

    this.presets = {
      sine_bell: { name: 'Sine Bell (Pure Chime)', type: 'synth', wave: 'sine', attack: 0.005, decay: 0.05, minF: 120, maxF: 1400 },
      chiptune_8bit: { name: '8-Bit Chiptune (Square)', type: 'synth', wave: 'square', attack: 0.002, decay: 0.04, minF: 100, maxF: 1200 },
      triangle_flute: { name: 'Triangle Flute (Soft)', type: 'synth', wave: 'triangle', attack: 0.01, decay: 0.06, minF: 130, maxF: 1100 },
      saw_cyber: { name: 'Sawtooth Synth (Lead)', type: 'synth', wave: 'sawtooth', attack: 0.003, decay: 0.045, minF: 90, maxF: 1000 },
      marimba: { name: 'Wooden Marimba (Percussive)', type: 'synth', wave: 'sine', attack: 0.001, decay: 0.035, minF: 140, maxF: 1500, harmonic: 2.76 },
      harp_pluck: { name: 'Harp Pluck (String)', type: 'synth', wave: 'triangle', attack: 0.002, decay: 0.07, minF: 120, maxF: 1300 },
      fm_laser: { name: 'FM Cyber Pulse (Sci-Fi)', type: 'fm', modIndex: 8.0, attack: 0.004, decay: 0.05, minF: 110, maxF: 1200 },
      kalimba: { name: 'Metallic Kalimba (Tine)', type: 'synth', wave: 'sine', attack: 0.002, decay: 0.06, minF: 180, maxF: 1600, harmonic: 4.2 },
      sub_kick: { name: 'Sub-Bass 808 (Punchy)', type: 'pitch_drop', wave: 'sine', attack: 0.001, decay: 0.08, minF: 55, maxF: 450 },
      crystal_pad: { name: 'Crystal Glass (Ethereal)', type: 'synth', wave: 'sine', attack: 0.015, decay: 0.09, minF: 220, maxF: 1800 }
    };
  }

  init() {
    if (this.audioCtx) return;
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioCtxClass();

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioCtx.currentTime);

    // Dynamics Limiter
    this.compressor = this.audioCtx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-12, this.audioCtx.currentTime);
    this.compressor.knee.setValueAtTime(30, this.audioCtx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);

    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.audioCtx.destination);
  }

  toggleSound() {
    this.init();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setVolume(val) {
    this.masterVolume = Math.max(0.0, Math.min(1.0, val));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.audioCtx.currentTime, 0.05);
    }
  }

  setPreset(key) {
    this.currentPreset = key;
  }

  async loadCustomAudioFile(file) {
    this.init();
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await this.audioCtx.decodeAudioData(arrayBuffer);
      this.customAudioBuffer = decoded;
      this.customAudioName = file.name;
      this.currentPreset = 'custom';
      return { success: true, name: file.name };
    } catch (err) {
      console.error('Failed to decode user audio sample:', err);
      return { success: false, error: err.message };
    }
  }

  playTone(normalizedVal, panVal = 0.0, isSwap = false) {
    if (!this.enabled) return;
    this.init();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (this.activeVoices >= this.maxVoices) return;
    this.activeVoices++;

    const now = this.audioCtx.currentTime;
    const clampedVal = Math.max(0.0, Math.min(1.0, normalizedVal));

    // ── Custom User Sample Playback (Pitch-Shifted) ──
    if (this.currentPreset === 'custom' && this.customAudioBuffer) {
      this.playCustomSample(clampedVal, panVal, isSwap, now);
      return;
    }

    const preset = this.presets[this.currentPreset] || this.presets.sine_bell;
    const panner = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;

    if (preset.type === 'fm') {
      // FM Synthesizer Voice
      const carrier = this.audioCtx.createOscillator();
      const modulator = this.audioCtx.createOscillator();
      const modGain = this.audioCtx.createGain();
      const voiceGain = this.audioCtx.createGain();

      const freq = preset.minF + Math.pow(clampedVal, 1.35) * (preset.maxF - preset.minF);
      carrier.frequency.setValueAtTime(freq, now);
      modulator.frequency.setValueAtTime(freq * 1.5, now);
      modGain.gain.setValueAtTime(freq * (preset.modIndex || 4.0), now);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      voiceGain.gain.setValueAtTime(0.001, now);
      voiceGain.gain.exponentialRampToValueAtTime(isSwap ? 0.28 : 0.18, now + preset.attack);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + preset.decay + 0.02);

      if (panner) {
        panner.pan.setValueAtTime(Math.max(-1.0, Math.min(1.0, panVal)), now);
        carrier.connect(voiceGain);
        voiceGain.connect(panner);
        panner.connect(this.masterGain);
      } else {
        carrier.connect(voiceGain);
        voiceGain.connect(this.masterGain);
      }

      carrier.start(now);
      modulator.start(now);
      carrier.stop(now + preset.decay + 0.03);
      modulator.stop(now + preset.decay + 0.03);

      carrier.onended = () => {
        carrier.disconnect();
        modulator.disconnect();
        modGain.disconnect();
        voiceGain.disconnect();
        if (panner) panner.disconnect();
        this.activeVoices--;
      };
      return;
    }

    // Standard Subtractive / Additive Voice
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const freq = preset.minF + Math.pow(clampedVal, 1.35) * (preset.maxF - preset.minF);

    osc.type = isSwap ? (preset.wave === 'sine' ? 'triangle' : preset.wave) : preset.wave;
    osc.frequency.setValueAtTime(freq, now);

    if (preset.type === 'pitch_drop') {
      osc.frequency.exponentialRampToValueAtTime(preset.minF, now + preset.decay);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(isSwap ? 0.28 : 0.18, now + preset.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.decay);

    if (panner) {
      panner.pan.setValueAtTime(Math.max(-1.0, Math.min(1.0, panVal)), now);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);
    } else {
      osc.connect(gain);
      gain.connect(this.masterGain);
    }

    osc.start(now);
    osc.stop(now + preset.decay + 0.01);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      if (panner) panner.disconnect();
      this.activeVoices--;
    };
  }

  playCustomSample(normalizedVal, panVal, isSwap, now) {
    const src = this.audioCtx.createBufferSource();
    src.buffer = this.customAudioBuffer;

    // Pitch shift range: 0.35x (deep) to 3.2x (high)
    const rate = 0.35 + Math.pow(normalizedVal, 1.25) * 2.85;
    src.playbackRate.setValueAtTime(rate, now);

    const gain = this.audioCtx.createGain();
    const duration = Math.min(src.buffer.duration / rate, 0.08);

    gain.gain.setValueAtTime(isSwap ? 0.4 : 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const panner = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;

    if (panner) {
      panner.pan.setValueAtTime(Math.max(-1.0, Math.min(1.0, panVal)), now);
      src.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);
    } else {
      src.connect(gain);
      gain.connect(this.masterGain);
    }

    src.start(now);
    src.stop(now + duration + 0.01);

    src.onended = () => {
      src.disconnect();
      gain.disconnect();
      if (panner) panner.disconnect();
      this.activeVoices--;
    };
  }

  playCompletionChime() {
    if (!this.enabled) return;
    this.init();
    // Harmonious completion arpeggio chord using the active timbre sound
    const chordRatios = [0.55, 0.68, 0.82, 0.92, 1.0];
    chordRatios.forEach((ratio, idx) => {
      setTimeout(() => {
        const pan = (idx / (chordRatios.length - 1)) * 1.6 - 0.8;
        this.playTone(ratio, pan, true);
      }, idx * 70);
    });
  }
}
