/**
 * Sky, Celestial Mechanics, Day-Night Cycle & Atmospheric Horizon Fog
 * with Seamless Horizon Atmospheric Dissolve & Sparkling Pixel Starfield
 */

class SkyManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.timeOfDay = 17.5; // Default 17:30 (Golden Hour / Sunset)
    this.dayNightCycle = false;
    this.cycleSpeed = 0.3; // Hours per second
    this.fogDensityFactor = 0.91;

    this.currentPreset = {
      sunPos: new THREE.Vector3(),
      sunColor: new THREE.Color(),
      skyTop: new THREE.Color(),
      skyBottom: new THREE.Color(),
      fogColor: new THREE.Color(),
      waterColor: new THREE.Color(),
      fogDensity: 0.0028,
      nightFactor: 0.0
    };

    this.initLights();
    this.initSkyDome();
    this.initStars();
    this.updateCelestialState();
  }

  initLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x333333, 0.75);
    this.hemiLight.position.set(0, 200, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width  = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    // Focused 240m radius frustum around player for maximum texel density & crisp shadows
    const sRange = 240;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far  = 900;
    this.sunLight.shadow.camera.left   = -sRange;
    this.sunLight.shadow.camera.right  =  sRange;
    this.sunLight.shadow.camera.top    =  sRange;
    this.sunLight.shadow.camera.bottom = -sRange;
    this.sunLight.shadow.bias = -0.00008;
    this.sunLight.shadow.normalBias = 0.05; // Completely stops polygon acne / self-shadow glitches
    this.sunLight.shadow.radius = 1.8;
    this.scene.add(this.sunLight);

    // Sun Mesh Billboard (depthTest enabled so terrain and trees properly occlude the sun)
    const sunGeo = new THREE.SphereGeometry(32, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff4cc, fog: false, depthTest: true, depthWrite: false });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.renderOrder = 1;
    this.scene.add(this.sunMesh);

    // Moon Mesh Billboard
    const moonGeo = new THREE.SphereGeometry(14, 20, 20);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xd0d8ff, fog: false, depthTest: true, depthWrite: false });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.renderOrder = 1;
    this.scene.add(this.moonMesh);

    // Sun glow bloom sprite (additive, behind terrain/trees with depthTest)
    const sunGlowCanvas = document.createElement('canvas');
    sunGlowCanvas.width = 128; sunGlowCanvas.height = 128;
    const sgCtx = sunGlowCanvas.getContext('2d');
    const sgGrad = sgCtx.createRadialGradient(64,64,0,64,64,64);
    sgGrad.addColorStop(0.0, 'rgba(255,244,180,1.0)');
    sgGrad.addColorStop(0.35,'rgba(255,220,100,0.6)');
    sgGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
    sgCtx.fillStyle = sgGrad; sgCtx.fillRect(0,0,128,128);
    const sunGlowTex = new THREE.CanvasTexture(sunGlowCanvas);
    const sunGlowMat = new THREE.SpriteMaterial({
      map: sunGlowTex, color: 0xffd580, transparent: true,
      blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: false, opacity: 0.5
    });
    this.sunGlowSprite = new THREE.Sprite(sunGlowMat);
    this.sunGlowSprite.scale.set(280, 280, 1);
    this.sunGlowSprite.renderOrder = 1;
    this.scene.add(this.sunGlowSprite);

    // Moon subtle glow sprite
    const moonGlowCanvas = document.createElement('canvas');
    moonGlowCanvas.width = 64; moonGlowCanvas.height = 64;
    const mgCtx = moonGlowCanvas.getContext('2d');
    const mgGrad = mgCtx.createRadialGradient(32,32,0,32,32,32);
    mgGrad.addColorStop(0.0, 'rgba(180,190,255,1.0)');
    mgGrad.addColorStop(0.4, 'rgba(130,150,220,0.4)');
    mgGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
    mgCtx.fillStyle = mgGrad; mgCtx.fillRect(0,0,64,64);
    const moonGlowTex = new THREE.CanvasTexture(moonGlowCanvas);
    const moonGlowMat = new THREE.SpriteMaterial({
      map: moonGlowTex, color: 0x8899dd, transparent: true,
      blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false, opacity: 0.2
    });
    this.moonGlowSprite = new THREE.Sprite(moonGlowMat);
    this.moonGlowSprite.scale.set(100, 100, 1);
    this.moonGlowSprite.renderOrder = 1;
    this.scene.add(this.moonGlowSprite);
  }

  initSkyDome() {
    // Large seamless atmospheric sky dome
    const skyGeo = new THREE.SphereGeometry(2200, 48, 36);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1a2a6c) },
        horizonColor: { value: new THREE.Color(0xfd746c) },
        bottomColor: { value: new THREE.Color(0xfd746c) }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float y = dir.y;

          vec3 col;
          if (y >= 0.0) {
            // Exponential atmospheric aerial perspective gradient fading seamlessly into horizon fog
            float t = 1.0 - exp(-y * 3.2);
            col = mix(horizonColor, topColor, t);
          } else {
            // Below horizon stays smoothly bonded to horizon fog color
            float t = clamp(-y * 5.0, 0.0, 1.0);
            col = mix(horizonColor, bottomColor, t);
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });

    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
  }

  initStars() {
    const starCount = 2400;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const phases = new Float32Array(starCount);
    const sizes = new Float32Array(starCount);
    const depths = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      
      // Multi-layer depths (closer foreground stars vs far background cosmos)
      const depthFactor = 0.6 + Math.random() * 1.4; // 0.6 to 2.0
      depths[i] = depthFactor;

      const r = 1600 + depthFactor * 400; // 1800m - 2400m
      positions[idx] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = Math.abs(r * Math.cos(phi)) + 60; // Above horizon
      positions[idx + 2] = r * Math.sin(phi) * Math.sin(theta);

      phases[i] = Math.random() * Math.PI * 2.0;
      sizes[i] = 1.0 + Math.random() * 1.6; // Sharp pixel size (1.0px - 2.6px)
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    starGeo.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));

    this.starUniforms = {
      uTime: { value: 0.0 },
      uNightness: { value: 0.0 },
      uCameraPos: { value: new THREE.Vector3() }
    };

    const starShaderMat = new THREE.ShaderMaterial({
      uniforms: this.starUniforms,
      vertexShader: `
        attribute float aPhase;
        attribute float aSize;
        attribute float aDepth;
        uniform float uTime;
        uniform float uNightness;
        uniform vec3 uCameraPos;
        varying float vTwinkle;

        void main() {
          vTwinkle = 0.7 + 0.3 * sin(uTime * 3.5 + aPhase);
          
          // 3D Parallax shift based on camera movement and celestial depth layer
          vec3 pos = position;
          pos.xz -= uCameraPos.xz * (0.025 * (2.2 - aDepth));
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * vTwinkle * clamp(uNightness * 1.5, 0.0, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vTwinkle;
        uniform float uNightness;

        void main() {
          vec3 starColor = vec3(0.95, 0.98, 1.0);
          float alpha = vTwinkle * uNightness;
          gl_FragColor = vec4(starColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      fog: false,
      blending: THREE.AdditiveBlending
    });

    this.stars = new THREE.Points(starGeo, starShaderMat);
    this.scene.add(this.stars);
  }

  setTimeOfDay(hours) {
    this.timeOfDay = ((hours % 24) + 24) % 24;
    this.updateCelestialState();
    if (this.onTimeChange) {
      this.onTimeChange(this.timeOfDay);
    }
  }

  setDayNightCycle(enabled) {
    this.dayNightCycle = enabled;
  }

  setFogDensityFactor(factor) {
    this.fogDensityFactor = factor;
    if (this.scene.fog) {
      this.scene.fog.density = this.currentPreset.fogDensity * this.fogDensityFactor;
    }
  }

  updateCelestialState() {
    const t = this.timeOfDay;
    const solarAngle = ((t - 6.0) / 24.0) * Math.PI * 2.0;
    const sunHeight = Math.sin(solarAngle);
    const sunDist = 950;

    const sunX = Math.cos(solarAngle) * sunDist * 0.9;
    const sunY = sunHeight * sunDist;
    const sunZ = -Math.sin(solarAngle * 0.5) * 350 - 200;

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunMesh.position.set(sunX, sunY, sunZ);

    const moonX = -sunX;
    const moonY = -sunY;
    const moonZ = -sunZ;
    this.moonMesh.position.set(moonX, moonY, moonZ);
    if (this.sunGlowSprite) this.sunGlowSprite.position.set(sunX, sunY, sunZ);
    if (this.moonGlowSprite) this.moonGlowSprite.position.set(moonX, moonY, moonZ);

    const colNightTop   = new THREE.Color(0x040711);
    const colNightBot   = new THREE.Color(0x0e1424);
    const colNightFog   = new THREE.Color(0x090f1d);
    const colNightLight = new THREE.Color(0x7dd3fc);

    const colDawnTop   = new THREE.Color(0x2e3a6a);
    const colDawnBot   = new THREE.Color(0xfb923c);
    const colDawnFog   = new THREE.Color(0xf97316);
    const colDawnLight = new THREE.Color(0xffedd5);

    const colNoonTop   = new THREE.Color(0x1e6bb8);
    const colNoonBot   = new THREE.Color(0x7dd3fc);
    const colNoonFog   = new THREE.Color(0xa5e0fc);
    const colNoonLight = new THREE.Color(0xfffae5);

    const colSunsetTop   = new THREE.Color(0x1e1b4b);
    const colSunsetBot   = new THREE.Color(0xf43f5e);
    const colSunsetFog   = new THREE.Color(0xe11d48);
    const colSunsetLight = new THREE.Color(0xfecdd3);

    const skyTop = new THREE.Color();
    const skyBot = new THREE.Color();
    const fogCol = new THREE.Color();
    const sunCol = new THREE.Color();
    let ambientInt = 0.45;
    let sunInt = 1.6;
    let fogDensity = 0.0026;

    if (t >= 0 && t < 5.0) {
      skyTop.copy(colNightTop);
      skyBot.copy(colNightBot);
      fogCol.copy(colNightFog);
      sunCol.copy(colNightLight);
      ambientInt = 0.24;
      sunInt = 0.35;
      fogDensity = 0.0030;
    } else if (t >= 5.0 && t < 7.5) {
      const f = (t - 5.0) / 2.5;
      skyTop.lerpColors(colNightTop, colDawnTop, f);
      skyBot.lerpColors(colNightBot, colDawnBot, f);
      fogCol.lerpColors(colNightFog, colDawnFog, f);
      sunCol.lerpColors(colNightLight, colDawnLight, f);
      ambientInt = THREE.MathUtils.lerp(0.24, 0.48, f);
      sunInt = THREE.MathUtils.lerp(0.35, 1.4, f);
      fogDensity = THREE.MathUtils.lerp(0.0030, 0.0026, f);
    } else if (t >= 7.5 && t < 16.5) {
      const f = Math.sin(((t - 7.5) / 9.0) * Math.PI);
      skyTop.lerpColors(colDawnTop, colNoonTop, f);
      skyBot.lerpColors(colDawnBot, colNoonBot, f);
      fogCol.lerpColors(colDawnFog, colNoonFog, f);
      sunCol.lerpColors(colDawnLight, colNoonLight, f);
      ambientInt = THREE.MathUtils.lerp(0.48, 0.68, f);
      sunInt = THREE.MathUtils.lerp(1.4, 1.85, f);
      fogDensity = 0.0024;
    } else if (t >= 16.5 && t < 19.5) {
      const f = (t - 16.5) / 3.0;
      skyTop.lerpColors(colNoonTop, colSunsetTop, f);
      skyBot.lerpColors(colNoonBot, colSunsetBot, f);
      fogCol.lerpColors(colNoonFog, colSunsetFog, f);
      sunCol.lerpColors(colNoonLight, colSunsetLight, f);
      ambientInt = THREE.MathUtils.lerp(0.68, 0.38, f);
      sunInt = THREE.MathUtils.lerp(1.85, 1.35, f);
      fogDensity = THREE.MathUtils.lerp(0.0024, 0.0028, f);
    } else {
      const f = (t - 19.5) / 4.5;
      skyTop.lerpColors(colSunsetTop, colNightTop, f);
      skyBot.lerpColors(colSunsetBot, colNightBot, f);
      fogCol.lerpColors(colSunsetFog, colNightFog, f);
      sunCol.lerpColors(colSunsetLight, colNightLight, f);
      ambientInt = THREE.MathUtils.lerp(0.38, 0.24, f);
      sunInt = THREE.MathUtils.lerp(1.35, 0.35, f);
      fogDensity = THREE.MathUtils.lerp(0.0028, 0.0030, f);
    }

    this.currentPreset.skyTop.copy(skyTop);
    this.currentPreset.skyBottom.copy(skyBot);
    this.currentPreset.fogColor.copy(fogCol);
    this.currentPreset.sunColor.copy(sunCol);
    this.currentPreset.sunPos.copy(sunY > 0 ? this.sunLight.position : this.moonMesh.position);
    this.currentPreset.fogDensity = fogDensity;
    this.currentPreset.waterColor.copy(sunY > 0 ? new THREE.Color(0x0f4c81) : new THREE.Color(0x081526));
    this.currentPreset.timeOfDay = this.timeOfDay;

    this.scene.fog = new THREE.FogExp2(fogCol.getHex(), fogDensity * this.fogDensityFactor);
    this.renderer.setClearColor(fogCol);

    this.ambientLight.intensity = ambientInt;
    this.hemiLight.color.copy(skyTop);
    this.hemiLight.groundColor.copy(fogCol);
    this.hemiLight.intensity = ambientInt * 1.2;

    this.sunLight.color.copy(sunCol);
    this.sunLight.intensity = sunInt;


    if (this.skyMesh && this.skyMesh.material.uniforms) {
      this.skyMesh.material.uniforms.topColor.value.copy(skyTop);
      this.skyMesh.material.uniforms.horizonColor.value.copy(fogCol);
      this.skyMesh.material.uniforms.bottomColor.value.copy(fogCol);
    }

    // Dynamic Star Nightness
    if (this.starUniforms) {
      const nightFactor = Math.max(0.0, -sunHeight);
      this.currentPreset.nightFactor = nightFactor;
      if (this.starUniforms) this.starUniforms.uNightness.value = Math.pow(nightFactor, 0.4);
      // Update sun emissive warmth
      if (this.sunGlowSprite && this.sunGlowSprite.material) {
        this.sunGlowSprite.material.color.copy(sunCol);
        this.sunGlowSprite.material.opacity = 0.4 + 0.28 * Math.max(0, sunHeight / 950.0);
      }
      this.sunMesh.material.color.lerpColors(sunCol, new THREE.Color(0xffffff), 0.5);
      this.sunMesh.visible = sunY > -50;
      if (this.sunGlowSprite) this.sunGlowSprite.visible = sunY > -50;
      // Moon dim glow
      if (this.moonGlowSprite && this.moonGlowSprite.material) {
        this.moonGlowSprite.material.opacity = 0.15 + 0.12 * nightFactor;
      }
      this.moonMesh.visible = moonY > -50;
      if (this.moonGlowSprite) this.moonGlowSprite.visible = moonY > -50;
    }
  }

  update(delta, cameraPos) {
    if (this.dayNightCycle) {
      this.timeOfDay = ((this.timeOfDay + delta * this.cycleSpeed) % 24.0 + 24.0) % 24.0;
      this.updateCelestialState();
      if (this.onTimeChange) {
        this.onTimeChange(this.timeOfDay);
      }
    }

    if (this.starUniforms) {
      this.starUniforms.uTime.value += delta;
      if (cameraPos) {
        this.starUniforms.uCameraPos.value.copy(cameraPos);
      }
    }

    if (this.skyMesh) {
      this.skyMesh.position.copy(cameraPos);
    }
    if (this.stars) {
      this.stars.position.copy(cameraPos);
      this.stars.rotation.y = (this.timeOfDay / 24.0) * Math.PI * 2.0;
    }

    // Keep shadow frustum centered on camera so shadows follow the player
    if (this.sunLight && this.sunLight.castShadow) {
      const solarAngle = ((this.timeOfDay - 6.0) / 24.0) * Math.PI * 2.0;
      const sunHeight = Math.sin(solarAngle);
      if (sunHeight > 0.05) {
        // Shadow target = camera ground position
        this.sunLight.target.position.set(cameraPos.x, 0, cameraPos.z);
        this.sunLight.target.updateMatrixWorld();
        // Move light position relative to camera so frustum always covers local area
        const sunDist = 450;
        const sunX = Math.cos(solarAngle) * sunDist * 0.9 + cameraPos.x;
        const sunY = Math.max(80, sunHeight * sunDist);
        const sunZ = -Math.sin(solarAngle * 0.5) * 200 - 100 + cameraPos.z;
        this.sunLight.position.set(sunX, sunY, sunZ);
        this.sunLight.shadow.camera.updateProjectionMatrix();
      }
    }
  }
}
