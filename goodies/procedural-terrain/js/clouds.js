/**
 * Real-Time PBR Volumetric Clouds Layer
 * Raymarched planar volume situated directly above terrain (140m - 320m)
 * with Single Scattering, Henyey-Greenstein Phase & Beer's-Powder Optical Depth
 */

class CloudsManager {
  constructor(scene) {
    this.scene = scene;
    this.cloudMinY = 140.0;
    this.cloudMaxY = 300.0;
    this.cloudDensity = 0.018;
    this.cloudSpeed = 0.012;
    this.visible = true;

    this.initCloudMesh();
  }

  initCloudMesh() {
    // Large overhead volumetric bounding volume
    const geo = new THREE.BoxGeometry(4000, this.cloudMaxY - this.cloudMinY, 4000);

    this.uniforms = {
      uTime: { value: 0.0 },
      uSunPosition: { value: new THREE.Vector3(200, 70, -350) },
      uSunColor: { value: new THREE.Color(0xffedd5) },
      uSkyColor: { value: new THREE.Color(0x1e6bb8) },
      uFogColor: { value: new THREE.Color(0xa5e0fc) },
      uCameraPosition: { value: new THREE.Vector3() },
      uCloudMinY: { value: this.cloudMinY },
      uCloudMaxY: { value: this.cloudMaxY },
      uCloudDensity: { value: this.cloudDensity },
      uCloudSpeed: { value: this.cloudSpeed },
      uNightFactor: { value: 0.0 },
      uMidnightFade: { value: 1.0 }
    };

    this.userVisible = true;

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec3 vWorldPosition;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunPosition;
        uniform vec3 uSunColor;
        uniform vec3 uSkyColor;
        uniform vec3 uFogColor;
        uniform vec3 uCameraPosition;
        uniform float uCloudMinY;
        uniform float uCloudMaxY;
        uniform float uCloudDensity;
        uniform float uCloudSpeed;
        uniform float uNightFactor;
        uniform float uMidnightFade;

        varying vec3 vWorldPosition;

        // Optimized 3D procedural noise
        float hash3D(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise3D(vec3 x) {
          vec3 p = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);

          return mix(
            mix(
              mix(hash3D(p + vec3(0,0,0)), hash3D(p + vec3(1,0,0)), f.x),
              mix(hash3D(p + vec3(0,1,0)), hash3D(p + vec3(1,1,0)), f.x), f.y),
            mix(
              mix(hash3D(p + vec3(0,0,1)), hash3D(p + vec3(1,0,1)), f.x),
              mix(hash3D(p + vec3(0,1,1)), hash3D(p + vec3(1,1,1)), f.x), f.y), f.z
          );
        }

        float fbm3D(vec3 p) {
          float v = 0.0;
          float a = 0.5;
          vec3 shift = vec3(50.0);
          for (int i = 0; i < 4; ++i) {
            v += a * noise3D(p);
            p = p * 2.04 + shift;
            a *= 0.5;
          }
          return v;
        }

        // Henyey-Greenstein Dual Lobe Phase Function
        float hgPhase(float cosTheta, float g) {
          float g2 = g * g;
          return 0.25 * ((1.0 - g2) / max(0.001, pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5)));
        }

        float phase2Lobes(float cosTheta) {
          const float m = 0.6;
          const float gm = 0.78;
          float lobe1 = hgPhase(cosTheta, 0.8 * gm);
          float lobe2 = hgPhase(cosTheta, -0.45 * gm);
          return mix(lobe2, lobe1, m);
        }

        // Beer's Powder Law for Cloud Rim Light
        float powder(float od) {
          return 1.0 - exp(-od * 2.0);
        }

        // Box Ray Intersection
        vec2 intersectBox(vec3 ro, vec3 rd, vec3 boxMin, vec3 boxMax) {
          vec3 tMin = (boxMin - ro) / rd;
          vec3 tMax = (boxMax - ro) / rd;
          vec3 t1 = min(tMin, tMax);
          vec3 t2 = max(tMin, tMax);
          float tNear = max(max(t1.x, t1.y), t1.z);
          float tFar = min(min(t2.x, t2.y), t2.z);
          return vec2(tNear, tFar);
        }

        float getDensity(vec3 p) {
          if (p.y < uCloudMinY || p.y > uCloudMaxY || uMidnightFade <= 0.001) return 0.0;

          float t = uTime * uCloudSpeed;
          vec3 movement = vec3(t * 8.0, 0.0, t * 5.0);
          vec3 pNorm = (p + movement) * 0.0035;

          // Parabolic vertical altitude envelope (clouds form thickest in the middle, tapering top and bottom)
          float hFraction = (p.y - uCloudMinY) / (uCloudMaxY - uCloudMinY);
          float heightProfile = 4.0 * hFraction * (1.0 - hFraction);

          float fbmVal = fbm3D(pNorm);
          // Only areas where FBM noise exceeds cumulus threshold form volumetric clouds!
          float density = smoothstep(0.46, 0.82, fbmVal) * heightProfile;

          return density * uCloudDensity * uMidnightFade;
        }

        float getSunShadow(vec3 p, vec3 sunDir) {
          float lightStep = 18.0;
          float lightSamples = 3.0;
          float totalDensity = 0.0;
          vec3 curP = p;

          for (float s = 0.0; s < 3.0; s++) {
            curP += sunDir * lightStep;
            totalDensity += getDensity(curP);
          }
          return exp(-totalDensity * 0.45);
        }

        void main() {
          if (uMidnightFade <= 0.001) discard;

          vec3 rayDir = normalize(vWorldPosition - uCameraPosition);
          vec3 boxMin = vec3(uCameraPosition.x - 2000.0, uCloudMinY, uCameraPosition.z - 2000.0);
          vec3 boxMax = vec3(uCameraPosition.x + 2000.0, uCloudMaxY, uCameraPosition.z + 2000.0);

          vec2 tHit = intersectBox(uCameraPosition, rayDir, boxMin, boxMax);
          if (tHit.x > tHit.y || tHit.y < 0.0) {
            discard;
          }

          float startDist = max(0.0, tHit.x);
          float endDist = min(tHit.y, 2200.0);
          float marchDist = endDist - startDist;

          if (marchDist <= 0.0) {
            discard;
          }

          const int steps = 28;
          float stepLength = marchDist / float(steps);

          vec3 p = uCameraPosition + rayDir * (startDist + stepLength * 0.5);
          vec3 inc = rayDir * stepLength;

          vec3 sunDir = normalize(uSunPosition);
          float cosTheta = dot(rayDir, sunDir);
          float phase = phase2Lobes(cosTheta);

          vec3 cloudScattering = vec3(0.0);
          float transmittance = 1.0;

          for (int i = 0; i < steps; i++) {
            float d = getDensity(p);
            if (d > 0.0001) {
              float optDepth = d * stepLength;
              float sunVis = getSunShadow(p, sunDir);
              float beerPowder = powder(optDepth);

              vec3 sunRadiance = uSunColor * sunVis * phase * 2.8 * (0.3 + 0.7 * beerPowder);
              vec3 ambientRadiance = mix(uSkyColor, vec3(1.0), 0.75) * 1.1;

              vec3 stepLight = (sunRadiance + ambientRadiance) * optDepth;
              cloudScattering += stepLight * transmittance;
              transmittance *= exp(-optDepth * 0.65);

              if (transmittance < 0.01) break;
            }
            p += inc;
          }

          float alpha = clamp(1.0 - transmittance, 0.0, 1.0);

          float grazeY = abs(rayDir.y);
          float horizonFade = smoothstep(0.0, 0.08, grazeY);
          float distFade = 1.0 - smoothstep(1600.0, 2200.0, startDist);
          alpha *= horizonFade * (0.5 + 0.5 * distFade);

          vec3 intrinsicColor = cloudScattering / max(0.0001, (1.0 - transmittance));
          vec3 finalColor = mix(uSkyColor, intrinsicColor, smoothstep(0.0, 0.22, alpha));

          // Soft overall transparency with midnight fade
          float finalAlpha = smoothstep(0.01, 0.85, alpha) * 0.68 * uMidnightFade;

          if (finalAlpha <= 0.002) discard;

          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.renderOrder = 2;
    this.mesh.position.set(0, (this.cloudMinY + this.cloudMaxY) * 0.5, 0);
    this.scene.add(this.mesh);
  }

  setVisible(visible) {
    this.userVisible = visible;
    if (this.mesh) this.mesh.visible = visible;
  }

  setSteps(steps) {
    this.steps = Math.max(6, Math.min(32, parseInt(steps, 10) || 16));
  }

  setAltitude(altitude) {
    this.cloudMinY = altitude - 70.0;
    this.cloudMaxY = altitude + 90.0;
    this.uniforms.uCloudMinY.value = this.cloudMinY;
    this.uniforms.uCloudMaxY.value = this.cloudMaxY;
    if (this.mesh) {
      this.mesh.position.y = altitude;
    }
  }

  update(time, cameraPos, skyPreset, nightFactor = 0.0) {
    if (!this.mesh || this.userVisible === false) return;

    // At time 00:00 (midnight), clouds are completely invisible
    const hours = skyPreset && skyPreset.timeOfDay !== undefined ? skyPreset.timeOfDay : 12.0;
    const distToMidnight = Math.min(hours, 24.0 - hours); // 0 at 00:00, 6 at 06:00
    // Completely vanishes below 1.5h around midnight (22:30 to 01:30)
    const midnightFade = THREE.MathUtils.smoothstep(distToMidnight, 1.2, 4.0);

    if (midnightFade <= 0.001) {
      this.mesh.visible = false;
      return;
    } else {
      this.mesh.visible = true;
    }

    this.mesh.position.x = cameraPos.x;
    this.mesh.position.z = cameraPos.z;

    this.uniforms.uTime.value = time;
    this.uniforms.uCameraPosition.value.copy(cameraPos);
    this.uniforms.uSunPosition.value.copy(skyPreset.sunPos);
    this.uniforms.uSunColor.value.copy(skyPreset.sunColor);
    this.uniforms.uSkyColor.value.copy(skyPreset.skyTop);
    this.uniforms.uFogColor.value.copy(skyPreset.fogColor);
    this.uniforms.uNightFactor.value = nightFactor;
    this.uniforms.uMidnightFade.value = midnightFade;
  }
}
