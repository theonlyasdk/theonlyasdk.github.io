/**
 * 3D Spatial Audio Engine with True Aerodynamic Wind Physics & Spatial Sound Emitters
 * - Web Audio API HRTF 3D spatial audio listener & panner nodes
 * - Aerodynamic boundary layer wind physics & vortex shedding aeroacoustics
 * - 3D Shoreline ocean wave surge emitters
 * - 3D Mountain ridge Venturi whistling emitters
 * - 3D Forest canopy wind rustling emitters
 */

class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.soundPlaying = false;
    this.masterVolume = 1.0;

    // Aerodynamic Wind State
    this.windHeading = 0.85; // Global wind direction angle (radians)
    this.baseWindSpeed = 14.0; // Base geostrophic atmospheric wind speed (m/s)
    this.relativeAirspeed = 0.0;
    this.dynamicPressure = 0.0;

    // 3D Spatial Emitters Cache
    this.shoreEmitters = [];
    this.ridgeEmitters = [];
    this.foliageEmitters = [];
  }

  setMasterVolume(vol) {
    this.masterVolume = Math.max(0.0, Math.min(2.0, vol));
    if (this.audioCtx && this.soundPlaying) {
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(this.masterVolume, this.audioCtx.currentTime, 0.05);
      }
    }
  }

  createNoiseBuffer() {
    const bufferSize = this.audioCtx.sampleRate * 4;
    const noiseBuffer = this.audioCtx.createBuffer(2, bufferSize, this.audioCtx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const output = noiseBuffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }
    }
    return noiseBuffer;
  }

  create3DPanner(refDist = 15, maxDist = 280, rollOff = 1.2) {
    const panner = this.audioCtx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = refDist;
    panner.maxDistance = maxDist;
    panner.rolloffFactor = rollOff;
    panner.coneInnerAngle = 360;
    return panner;
  }

  initAudioGraph() {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioCtxClass();

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioCtx.currentTime);
    this.masterGain.connect(this.audioCtx.destination);

    const noiseBuffer = this.createNoiseBuffer();

    // ── 1. Aerodynamic Dynamic Air-Rush & Vortex Whistle ──
    this.windSource = this.audioCtx.createBufferSource();
    this.windSource.buffer = noiseBuffer;
    this.windSource.loop = true;

    this.windFilter = this.audioCtx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(320, this.audioCtx.currentTime);
    this.windFilter.Q.setValueAtTime(3.2, this.audioCtx.currentTime);

    this.windPanner = this.create3DPanner(10, 200, 0.8);
    this.windGain = this.audioCtx.createGain();
    this.windGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windPanner);
    this.windPanner.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    this.windSource.start();

    // Aeroacoustic Vortex Whistle Resonator
    this.whistleSource = this.audioCtx.createBufferSource();
    this.whistleSource.buffer = noiseBuffer;
    this.whistleSource.loop = true;

    this.whistleFilter = this.audioCtx.createBiquadFilter();
    this.whistleFilter.type = 'bandpass';
    this.whistleFilter.frequency.setValueAtTime(450, this.audioCtx.currentTime);
    this.whistleFilter.Q.setValueAtTime(8.5, this.audioCtx.currentTime);

    this.whistleGain = this.audioCtx.createGain();
    this.whistleGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.whistleSource.connect(this.whistleFilter);
    this.whistleFilter.connect(this.whistleGain);
    this.whistleGain.connect(this.masterGain);
    this.whistleSource.start();

    // ── 2. 3D Coastal Shoreline Surf Wave Emitters ──
    this.shoreSource = this.audioCtx.createBufferSource();
    this.shoreSource.buffer = noiseBuffer;
    this.shoreSource.loop = true;

    this.shoreFilter = this.audioCtx.createBiquadFilter();
    this.shoreFilter.type = 'lowpass';
    this.shoreFilter.frequency.setValueAtTime(240, this.audioCtx.currentTime);
    this.shoreFilter.Q.setValueAtTime(2.2, this.audioCtx.currentTime);

    this.shorePanner = this.create3DPanner(12, 220, 1.4);
    this.shoreGain = this.audioCtx.createGain();
    this.shoreGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.shoreSource.connect(this.shoreFilter);
    this.shoreFilter.connect(this.shorePanner);
    this.shorePanner.connect(this.shoreGain);
    this.shoreGain.connect(this.masterGain);
    this.shoreSource.start();

    // ── 3. 3D Mountain Ridge Whistling / Venturi Flow Emitter ──
    this.ridgeSource = this.audioCtx.createBufferSource();
    this.ridgeSource.buffer = noiseBuffer;
    this.ridgeSource.loop = true;

    this.ridgeFilter = this.audioCtx.createBiquadFilter();
    this.ridgeFilter.type = 'bandpass';
    this.ridgeFilter.frequency.setValueAtTime(620, this.audioCtx.currentTime);
    this.ridgeFilter.Q.setValueAtTime(5.5, this.audioCtx.currentTime);

    this.ridgePanner = this.create3DPanner(18, 300, 1.2);
    this.ridgeGain = this.audioCtx.createGain();
    this.ridgeGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.ridgeSource.connect(this.ridgeFilter);
    this.ridgeFilter.connect(this.ridgePanner);
    this.ridgePanner.connect(this.ridgeGain);
    this.ridgeGain.connect(this.masterGain);
    this.ridgeSource.start();

    // ── 4. 3D Forest Canopy Wind Rustling Emitter ──
    this.foliageSource = this.audioCtx.createBufferSource();
    this.foliageSource.buffer = noiseBuffer;
    this.foliageSource.loop = true;

    this.foliageFilter = this.audioCtx.createBiquadFilter();
    this.foliageFilter.type = 'bandpass';
    this.foliageFilter.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    this.foliageFilter.Q.setValueAtTime(3.0, this.audioCtx.currentTime);

    this.foliagePanner = this.create3DPanner(8, 140, 1.6);
    this.foliageGain = this.audioCtx.createGain();
    this.foliageGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.foliageSource.connect(this.foliageFilter);
    this.foliageFilter.connect(this.foliagePanner);
    this.foliagePanner.connect(this.foliageGain);
    this.foliageGain.connect(this.masterGain);
    this.foliageSource.start();

    // ── 5. Water Splash & Aquatic Ripple Emitter ──
    this.waterRippleSource = this.audioCtx.createBufferSource();
    this.waterRippleSource.buffer = noiseBuffer;
    this.waterRippleSource.loop = true;

    this.waterRippleFilter = this.audioCtx.createBiquadFilter();
    this.waterRippleFilter.type = 'bandpass';
    this.waterRippleFilter.frequency.setValueAtTime(450, this.audioCtx.currentTime);
    this.waterRippleFilter.Q.setValueAtTime(4.0, this.audioCtx.currentTime);

    this.waterRippleGain = this.audioCtx.createGain();
    this.waterRippleGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.waterRippleSource.connect(this.waterRippleFilter);
    this.waterRippleFilter.connect(this.waterRippleGain);
    this.waterRippleGain.connect(this.masterGain);
    this.waterRippleSource.start();
  }

  toggleSound() {
    if (!this.audioCtx) {
      this.initAudioGraph();
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.soundPlaying = !this.soundPlaying;

    if (this.soundPlaying) {
      this.setMasterVolume(this.masterVolume);
    } else {
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0.0, this.audioCtx.currentTime, 0.2);
      }
    }

    const soundBtn = document.getElementById('btn-sound');
    if (soundBtn) {
      soundBtn.classList.toggle('active', this.soundPlaying);
      soundBtn.innerHTML = this.soundPlaying ?
        '<i class="bi bi-volume-up-fill"></i>' :
        '<i class="bi bi-volume-mute-fill"></i>';
    }
  }

  updateListenerOrientation(camera) {
    if (!this.audioCtx || !this.audioCtx.listener) return;

    const p = camera.position;
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const u = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    const listener = this.audioCtx.listener;
    if (listener.positionX) {
      listener.positionX.setTargetAtTime(p.x, this.audioCtx.currentTime, 0.05);
      listener.positionY.setTargetAtTime(p.y, this.audioCtx.currentTime, 0.05);
      listener.positionZ.setTargetAtTime(p.z, this.audioCtx.currentTime, 0.05);
      listener.forwardX.setTargetAtTime(f.x, this.audioCtx.currentTime, 0.05);
      listener.forwardY.setTargetAtTime(f.y, this.audioCtx.currentTime, 0.05);
      listener.forwardZ.setTargetAtTime(f.z, this.audioCtx.currentTime, 0.05);
      listener.upX.setTargetAtTime(u.x, this.audioCtx.currentTime, 0.05);
      listener.upY.setTargetAtTime(u.y, this.audioCtx.currentTime, 0.05);
      listener.upZ.setTargetAtTime(u.z, this.audioCtx.currentTime, 0.05);
    } else if (listener.setPosition) {
      listener.setPosition(p.x, p.y, p.z);
      listener.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z);
    }
  }

  set3DPosition(panner, x, y, z) {
    if (!panner) return;
    if (panner.positionX) {
      panner.positionX.setTargetAtTime(x, this.audioCtx.currentTime, 0.08);
      panner.positionY.setTargetAtTime(y, this.audioCtx.currentTime, 0.08);
      panner.positionZ.setTargetAtTime(z, this.audioCtx.currentTime, 0.08);
    } else if (panner.setPosition) {
      panner.setPosition(x, y, z);
    }
  }

  update(time, camera, generator, waterLevel = 3.0, velocity = new THREE.Vector3()) {
    if (!this.soundPlaying || !this.audioCtx) return;

    // 1. Update 3D Web Audio Spatial Listener
    this.updateListenerOrientation(camera);

    const camPos = camera.position;
    const terrainHeight = generator ? generator.getHeight(camPos.x, camPos.z) : 0;
    const altAboveGround = Math.max(0.5, camPos.y - terrainHeight);
    const altAboveSea = Math.max(0.0, camPos.y - waterLevel);

    // 2. Real Aerodynamic Wind Physics Model
    // Dynamic gusting turbulence modulation
    const gustFactor = 1.0 + 0.35 * Math.sin(time * 0.28) + 0.22 * Math.sin(time * 0.72 + 1.4) + 0.14 * Math.sin(time * 1.8);
    this.windHeading += Math.sin(time * 0.02) * 0.001; // Weather front heading drift

    // Logarithmic Atmospheric Boundary Layer (wind increases with altitude above surface roughness)
    const roughnessZ0 = 0.08; // Forest/terrain aerodynamic roughness
    const boundaryLayerProfile = Math.max(0.18, Math.log(Math.max(roughnessZ0, altAboveGround) / roughnessZ0) / Math.log(140.0 / roughnessZ0));

    // Orographic slope compression / ridge acceleration (Venturi effect)
    let slopeSpeedup = 1.0;
    if (generator) {
      const hAhead = generator.getHeight(camPos.x + 8.0 * Math.cos(this.windHeading), camPos.z + 8.0 * Math.sin(this.windHeading));
      const slope = (hAhead - terrainHeight) / 8.0;
      slopeSpeedup = Math.max(0.7, 1.0 + slope * 0.45);
    }

    const localWindSpeed = this.baseWindSpeed * gustFactor * boundaryLayerProfile * slopeSpeedup;
    const windVec = new THREE.Vector3(
      Math.cos(this.windHeading) * localWindSpeed,
      0.0,
      Math.sin(this.windHeading) * localWindSpeed
    );

    // Relative Airspeed Vector: V_rel = V_camera - W_wind
    const velVec = (velocity instanceof THREE.Vector3) ? velocity : new THREE.Vector3(0, 0, velocity || 0);
    const relAirVec = new THREE.Vector3().subVectors(velVec, windVec);
    const relAirspeed = relAirVec.length();

    // Barometric Air Density: rho(h) = rho_0 * exp(-h / H_b)
    const airDensity = 1.225 * Math.exp(-camPos.y / 7200.0);
    // Dynamic Ram Pressure: q = 0.5 * rho * v^2
    const dynamicPressure = 0.5 * airDensity * (relAirspeed * relAirspeed);

    // 3. Dynamic Air-Rush & Vortex Whistling Aeroacoustic Generation
    // Aeroacoustic sound power scales with dynamic pressure
    const aeroRushVol = Math.min(1.4, 0.06 + Math.pow(dynamicPressure / 180.0, 0.72) * 0.55);
    this.windGain.gain.setTargetAtTime(aeroRushVol, this.audioCtx.currentTime, 0.08);

    // Lowpass cutoff expands as airspeed increases (aerodynamic frequency broadening)
    const aeroCutoff = Math.min(2200, 240 + relAirspeed * 32.0 + Math.min(450, altAboveSea * 3.5));
    this.windFilter.frequency.setTargetAtTime(aeroCutoff, this.audioCtx.currentTime, 0.08);

    // 3D Airflow Origin Panner (air rushes towards the camera from the apparent wind vector)
    const apparentWindDir = relAirVec.clone().normalize();
    this.set3DPosition(this.windPanner, camPos.x - apparentWindDir.x * 12.0, camPos.y - apparentWindDir.y * 12.0, camPos.z - apparentWindDir.z * 12.0);

    // Aeroacoustic Vortex Whistling (Strouhal shedding frequency)
    const whistlePitch = Math.min(1800, 220 + relAirspeed * 28.0 + (slopeSpeedup - 1.0) * 150.0);
    const whistleVol = Math.min(0.65, Math.max(0.0, (relAirspeed - 12.0) / 45.0) * 0.42);
    this.whistleGain.gain.setTargetAtTime(whistleVol, this.audioCtx.currentTime, 0.08);
    this.whistleFilter.frequency.setTargetAtTime(whistlePitch, this.audioCtx.currentTime, 0.08);

    // 4. 3D Coastal Shoreline Surf Wave Emitters
    if (this.shoreGain && generator) {
      // Find nearest coastal shoreline point at waterLevel
      const shoreDistY = Math.abs(camPos.y - waterLevel);
      // Sample radial coastline points around player
      const probeR = Math.min(80.0, Math.max(10.0, shoreDistY * 3.0));
      let bestShoreX = camPos.x;
      let bestShoreZ = camPos.z;
      let minDiff = 9999;

      for (let angle = 0; angle < Math.PI * 2; angle += 0.785) {
        const px = camPos.x + Math.cos(angle) * probeR;
        const pz = camPos.z + Math.sin(angle) * probeR;
        const ph = generator.getHeight(px, pz);
        const diff = Math.abs(ph - waterLevel);
        if (diff < minDiff) {
          minDiff = diff;
          bestShoreX = px;
          bestShoreZ = pz;
        }
      }

      this.set3DPosition(this.shorePanner, bestShoreX, waterLevel, bestShoreZ);

      // Coastal swell wash audio
      const swellCycle = 0.5 + 0.35 * Math.sin(time * 1.5) + 0.15 * Math.sin(time * 0.8 + 1.1);
      const shoreProximity = Math.max(0.0, 1.0 - (shoreDistY / 22.0));
      const shoreVol = shoreProximity * (0.35 + swellCycle * 0.45);
      this.shoreGain.gain.setTargetAtTime(shoreVol, this.audioCtx.currentTime, 0.1);

      const shoreFilterFreq = 180 + swellCycle * 260 + (1.0 - Math.min(1.0, shoreDistY / 15.0)) * 140;
      this.shoreFilter.frequency.setTargetAtTime(shoreFilterFreq, this.audioCtx.currentTime, 0.1);
    }

    // 5. 3D Mountain Ridge Whistling / Venturi Flow Emitter
    if (this.ridgeGain && generator) {
      // Position ridge emitter at the highest terrain point in the upwind direction
      const ridgeDist = 60.0;
      const rx = camPos.x + Math.cos(this.windHeading) * ridgeDist;
      const rz = camPos.z + Math.sin(this.windHeading) * ridgeDist;
      const rh = generator.getHeight(rx, rz);

      this.set3DPosition(this.ridgePanner, rx, rh + 6.0, rz);

      const ridgeActivity = Math.max(0.0, (rh - (generator.waterLevel || 0) - 25.0) / 45.0);
      const ridgeVol = Math.min(0.55, ridgeActivity * (0.2 + gustFactor * 0.25));
      this.ridgeGain.gain.setTargetAtTime(ridgeVol, this.audioCtx.currentTime, 0.12);
      this.ridgeFilter.frequency.setTargetAtTime(480 + gustFactor * 220 + ridgeActivity * 180, this.audioCtx.currentTime, 0.12);
    }

    // 6. 3D Forest Canopy Rustling Emitter
    if (this.foliageGain && generator) {
      const fx = camPos.x + 15.0 * Math.sin(time * 0.1);
      const fz = camPos.z + 15.0 * Math.cos(time * 0.1);
      const fh = generator.getHeight(fx, fz);

      this.set3DPosition(this.foliagePanner, fx, fh + 4.0, fz);

      // Foliage rustles when near ground in moderate-to-high winds
      const groundProximity = Math.max(0.0, 1.0 - (altAboveGround / 18.0));
      const foliageVol = groundProximity * Math.min(0.5, (localWindSpeed / 20.0) * 0.42 * gustFactor);
      this.foliageGain.gain.setTargetAtTime(foliageVol, this.audioCtx.currentTime, 0.1);
    }

    // 7. Water In-Depth Ripple Emitter
    if (this.waterRippleGain) {
      const inWater = camPos.y <= (waterLevel + 1.2);
      const rawRippleVolume = inWater ? Math.max(0.05, 0.45 - Math.max(0, camPos.y - waterLevel) * 0.28) : 0.0;
      this.waterRippleGain.gain.setTargetAtTime(rawRippleVolume, this.audioCtx.currentTime, 0.12);

      const rippleFreq = 380 + Math.sin(time * 3.5) * 120 + Math.cos(time * 5.2) * 80;
      this.waterRippleFilter.frequency.setTargetAtTime(rippleFreq, this.audioCtx.currentTime, 0.15);
    }
  }
}
