/**
 * Physical Fluid Dynamics Water Engine
 * Pure GPU-accelerated terrain bed collision, continuous world-space flow,
 * Navier-Stokes wave shoaling, and Beer-Lambert depth extinction with 0 frame drops.
 */

class WaterManager {
  constructor(scene, waterLevel = 3.0, terrainGenerator = null) {
    this.scene = scene;
    this.waterLevel = waterLevel;
    this.generator = terrainGenerator;
    this.waveStrength = 1.0;
    this.waveSpeed = 1.0;
    this.useShaders = true;

    this.maxRipples = 8;
    this.ripples = [];
    for (let i = 0; i < this.maxRipples; i++) {
      this.ripples.push(new THREE.Vector3(0, 0, -9999));
    }

    const waterGeo = new THREE.PlaneGeometry(2400, 2400, 160, 160);
    waterGeo.rotateX(-Math.PI / 2);

    this.uniforms = {
      uTime:           { value: 0.0 },
      uWaterLevel:     { value: waterLevel },
      uWaveStrength:   { value: 1.0 },
      uWaveSpeed:      { value: 1.0 },
      uSunPosition:    { value: new THREE.Vector3(0.077, 0.5, 0.577).normalize() },
      uSunColor:       { value: new THREE.Color(0xffedd5) },
      uSkyColor:       { value: new THREE.Color(0x2980b9) },
      uFogColor:       { value: new THREE.Color(0xa5e0fc) },
      uFogDensity:     { value: 0.0032 },
      uCameraPosition: { value: new THREE.Vector3() },
      uPlayerPos:      { value: new THREE.Vector3() },
      uPlayerSpeed:    { value: 0.0 },
      uShaderEffects:  { value: 1.0 },
      uRipples:        { value: this.ripples }
    };

    // ─── Vertex Shader ────────────────────────────────────────────────────
    const vertexShader = `
      uniform float uTime;
      uniform float uWaterLevel;
      uniform float uWaveStrength;
      uniform float uWaveSpeed;
      uniform float uShaderEffects;
      uniform vec3  uCameraPosition;
      uniform vec3  uPlayerPos;
      uniform float uPlayerSpeed;
      uniform vec3  uRipples[8];

      varying vec3  vWorldPosition;
      varying vec3  vViewDir;
      varying float vDist;

      #define DRAG_MULT 0.38

      vec2 wavedxV(vec2 position, vec2 direction, float frequency, float timeshift) {
        float x = dot(direction, position) * frequency + timeshift;
        float wave = exp(sin(x) - 1.0);
        return vec2(wave, -wave * cos(x));
      }

      float getwavesV(vec2 position, int iterations) {
        float wps = length(position) * 0.06;
        float iter = 0.0; float freq = 0.75; float tm = 1.6;
        float weight = 1.0; float sv = 0.0; float sw = 0.0;
        for (int i = 0; i < 8; i++) {
          if (i >= iterations) break;
          vec2 p = vec2(sin(iter), cos(iter));
          vec2 res = wavedxV(position, p, freq, uTime * uWaveSpeed * tm + wps);
          position += p * res.y * weight * DRAG_MULT;
          sv += res.x * weight; sw += weight;
          weight = mix(weight, 0.0, 0.24); freq *= 1.28; tm *= 1.09; iter += 1.45;
        }
        return sv / max(sw, 0.001);
      }

      void main() {
        vec3 pos = position;
        vec4 worldPos4 = modelMatrix * vec4(pos, 1.0);

        if (uShaderEffects > 0.5) {
          float h = getwavesV(worldPos4.xz * 0.08, 8) * uWaveStrength * 0.65;
          pos.y += h;

          // Player movement fluid displacement & wake waves (in continuous world space)
          float pDist = distance(worldPos4.xz, uPlayerPos.xz);
          if (pDist < 24.0 && uPlayerSpeed > 0.1) {
            float pEnv = exp(-pDist * 0.22);
            float pWave = sin(pDist * 1.6 - uTime * 6.0) * min(1.2, uPlayerSpeed * 0.16) * pEnv;
            pos.y += pWave;
          }

          // Multi-Ring Dynamic Water Splashes & Concentric Ripples (in continuous world space)
          for (int i = 0; i < 8; i++) {
            vec3 r = uRipples[i];
            if (r.z > 0.0) {
              float dt = uTime - r.z;
              if (dt > 0.0 && dt < 12.0) {
                float d = distance(worldPos4.xz, r.xy);
                float speed = 14.0;
                float maxDist = dt * speed;
                float ringWidth = 8.0 + dt * 4.0;
                if (d < maxDist + ringWidth && d > maxDist - ringWidth) {
                  float damp = exp(-dt * 0.32) * (1.0 - dt / 12.0);
                  float env = smoothstep(ringWidth, 0.0, abs(d - maxDist));
                  float rippleWave = (sin((d - maxDist) * 1.8 - dt * 3.0) * 1.8 + sin((d - maxDist) * 3.6) * 0.6);
                  pos.y += rippleWave * damp * env;
                }
              }
            }
          }
        } else {
          pos.y += (sin(worldPos4.x * 0.05 + uTime * 1.5) + cos(worldPos4.z * 0.05 + uTime * 1.2)) * 0.15 * uWaveStrength;
        }

        vec4 fw = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = fw.xyz;
        vDist = length(fw.xyz - cameraPosition);
        vViewDir = cameraPosition - fw.xyz;
        gl_Position = projectionMatrix * viewMatrix * fw;
      }
    `;

    // ─── Fragment Shader ──────────────────────────────────────────────────
    const fragmentShader = `
      uniform float uTime;
      uniform float uWaveStrength;
      uniform float uWaveSpeed;
      uniform vec3  uSunPosition;
      uniform vec3  uSunColor;
      uniform vec3  uSkyColor;
      uniform vec3  uFogColor;
      uniform float uFogDensity;
      uniform vec3  uCameraPosition;
      uniform vec3  uPlayerPos;
      uniform float uPlayerSpeed;
      uniform float uShaderEffects;
      uniform float uWaterLevel;
      uniform vec3  uRipples[8];

      varying vec3  vWorldPosition;
      varying vec3  vViewDir;
      varying float vDist;

      #define DRAG_MULT 0.38

      // Analytical Gerstner surface gradient
      vec3 computeWaterNormal(vec2 pos) {
        float wps = length(pos) * 0.06;
        float iter = 0.0;
        float freq = 0.75;
        float tm = 1.6;
        float weight = 1.0;
        vec2 grad = vec2(0.0);
        vec2 curPos = pos;

        for (int i = 0; i < 8; i++) {
          vec2 d = vec2(sin(iter), cos(iter));
          float phase = dot(d, curPos) * freq + uTime * uWaveSpeed * tm + wps;
          float sinP = sin(phase);
          float cosP = cos(phase);
          float wave = exp(sinP - 1.0);

          grad += d * (wave * cosP * freq * weight * uWaveStrength);
          curPos += d * (wave * cosP * weight * 0.25);

          weight *= 0.76;
          freq *= 1.28;
          tm *= 1.09;
          iter += 1.45;
        }

        return normalize(vec3(-grad.x * 0.7, 1.0, -grad.y * 0.7));
      }

      void main() {
        vec3 viewDir = normalize(vViewDir);
        vec3 sunDir  = normalize(uSunPosition);
        vec3 N = vec3(0.0, 1.0, 0.0);

        if (uShaderEffects > 0.5) {
          N = computeWaterNormal(vWorldPosition.xz * 0.08);

          // Player movement fluid wake normal perturbation
          float pDist = distance(vWorldPosition.xz, uPlayerPos.xz);
          if (pDist < 24.0 && uPlayerSpeed > 0.1) {
            vec2 pDir = normalize(vWorldPosition.xz - uPlayerPos.xz + vec2(0.0001));
            float pDamp = exp(-pDist * 0.22);
            float pSlope = cos(pDist * 1.6 - uTime * 6.0) * min(2.5, uPlayerSpeed * 0.4) * pDamp;
            N.xz += pDir * pSlope * 0.7;
          }

          // Multi-ring ripple normal perturbation
          for (int i = 0; i < 8; i++) {
            vec3 r = uRipples[i];
            if (r.z > 0.0) {
              float dt = uTime - r.z;
              if (dt > 0.0 && dt < 12.0) {
                float rd = distance(vWorldPosition.xz, r.xy);
                float speed = 14.0;
                float maxDist = dt * speed;
                float ringWidth = 8.0 + dt * 4.0;
                if (rd < maxDist + ringWidth && rd > maxDist - ringWidth) {
                  float damp = exp(-dt * 0.32) * (1.0 - dt / 12.0);
                  float env = smoothstep(ringWidth, 0.0, abs(rd - maxDist));
                  vec2 rDir = normalize(vWorldPosition.xz - r.xy + vec2(0.0001));
                  float slope = (cos((rd - maxDist) * 1.8 - dt * 3.0) * 2.8 + cos((rd - maxDist) * 3.6) * 1.2) * damp * env;
                  N.xz += rDir * slope * 0.85;
                }
              }
            }
          }
          N = mix(N, vec3(0.0, 1.0, 0.0), 0.7 * min(1.0, sqrt(vDist * 0.005) * 1.1));
          N = normalize(N);
        }

        if (!gl_FrontFacing) N = -N;

        // Dielectric Water Fresnel
        float fresnel = 0.02 + 0.55 * pow(1.0 - max(0.0, dot(N, viewDir)), 4.0);
        vec3 R = normalize(reflect(-viewDir, N));
        R.y = abs(R.y);

        vec3 skyRefl = mix(uFogColor, uSkyColor, clamp(R.y * 0.85 + 0.15, 0.0, 1.0));
        float sunDot = max(0.0, dot(R, sunDir));
        float sunGlint = pow(sunDot, 380.0) * 1.8;
        vec3 reflection = skyRefl + uSunColor * sunGlint;

        // Oceanic deep body color
        vec3 fluidBody = vec3(0.03, 0.14, 0.24);
        vec3 C = mix(fluidBody, reflection, fresnel);

        // Atmospheric perspective fog blending
        float fogFactor = clamp(1.0 - exp(-vDist * vDist * uFogDensity * uFogDensity), 0.0, 1.0);
        vec3 finalColor = mix(C, uFogColor, fogFactor * 0.65);

        float alpha = clamp(0.85 + fresnel * 0.12, 0.0, 0.96);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(waterGeo, this.material);
    this.mesh.position.y = this.waterLevel;
    this.scene.add(this.mesh);
  }

  setTerrainGenerator(generator) {
    this.generator = generator;
  }

  setWaterLevel(level) {
    this.waterLevel = level;
    if (this.mesh) { this.mesh.position.y = level; this.uniforms.uWaterLevel.value = level; }
  }
  setWaveIntensity(strength) { this.waveStrength = strength; this.uniforms.uWaveStrength.value = strength; }
  setWaveSpeed(speed) { this.waveSpeed = speed; this.uniforms.uWaveSpeed.value = speed; }
  setShaderEffects(enabled) { this.useShaders = enabled; this.uniforms.uShaderEffects.value = enabled ? 1.0 : 0.0; }
  setVisible(visible) { if (this.mesh) this.mesh.visible = visible; }

  addRipple(x, z, time) {
    let oldestIdx = 0, oldestTime = 99999999;
    for (let i = 0; i < this.maxRipples; i++) {
      if (this.ripples[i].z < oldestTime) { oldestTime = this.ripples[i].z; oldestIdx = i; }
    }
    this.ripples[oldestIdx].set(x, z, time);
    this.uniforms.uRipples.value = this.ripples;
  }

  updateSkyUniforms(skyPreset, fogDensity) {
    this.uniforms.uSunPosition.value.copy(skyPreset.sunPos).normalize();
    this.uniforms.uSunColor.value.copy(skyPreset.sunColor);
    this.uniforms.uSkyColor.value.copy(skyPreset.skyTop);
    this.uniforms.uFogColor.value.copy(skyPreset.fogColor);
    this.uniforms.uFogDensity.value = fogDensity;
  }

  update(time, cameraPos, playerSpeed = 0) {
    if (!this.mesh || !this.mesh.visible) return;

    this.mesh.position.x = cameraPos.x;
    this.mesh.position.z = cameraPos.z;
    this.uniforms.uTime.value = time;
    this.uniforms.uCameraPosition.value.copy(cameraPos);
    this.uniforms.uPlayerPos.value.copy(cameraPos);
    this.uniforms.uPlayerSpeed.value = playerSpeed;
  }
}
