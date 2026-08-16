/**
 * Infinite Procedural Terrain Chunk & Biome Foliage System
 * with Normalized Buffer Merging, Generous Frustum Padding & Instanced Foliage
 */

class TerrainManager {
  constructor(scene, terrainGenerator) {
    this.scene = scene;
    this.generator = terrainGenerator;

    this.chunkSize = 120;
    this.segments = 64;
    this.viewRadius = 6;

    this.chunks = new Map();
    this.pendingChunks = [];
    this.currentCenterChunk = { x: null, z: null };

    this.wireframe = false;
    this.flatShading = false;
    this.foliageEnabled = true;
    this.ambientOcclusionAndReflections = false;

    // Viewport Frustum Culling
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();

    this.initTerrainTexturePack();

    this.terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.0,
      normalMap: this.grassNormTex,
      normalScale: new THREE.Vector2(0.45, 0.45),
      flatShading: false,
      wireframe: false
    });

    this.setupTerrainShader(this.terrainMaterial);
    this.initFoliagePrototypes();
  }

  initTerrainTexturePack() {
    const loader = new THREE.TextureLoader();
    const loadT = (file, repeat = 32) => {
      const tex = loader.load(`textures/terrain/${file}`);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat, repeat);
      return tex;
    };

    this.grassDiffTex = loadT('grass_green_d.jpg', 36);
    this.grassNormTex = loadT('grass_green_n.jpg', 36);
    this.grassSpecTex = loadT('grass_rocky_s.jpg', 36);

    this.rockDiffTex  = loadT('mntn_dark_d.jpg', 28);
    this.rockNormTex  = loadT('mntn_dark_n.jpg', 28);
    this.rockSpecTex  = loadT('mntn_dark_s.jpg', 28);

    this.sandDiffTex  = loadT('desert_sand_d.jpg', 36);
    this.sandNormTex  = loadT('desert_sand_n.jpg', 36);
    this.sandSpecTex  = loadT('desert_sand_s.jpg', 36);

    this.snowDiffTex  = loadT('snow1_d.jpg', 32);
    this.snowNormTex  = loadT('snow1_n.jpg', 32);
    this.snowSpecTex  = loadT('snow1_s.jpg', 32);
  }

  setupTerrainShader(mat) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.tGrassDiff = { value: this.grassDiffTex };
      shader.uniforms.tGrassSpec = { value: this.grassSpecTex };
      shader.uniforms.tRockDiff  = { value: this.rockDiffTex };
      shader.uniforms.tRockSpec  = { value: this.rockSpecTex };
      shader.uniforms.tSandDiff  = { value: this.sandDiffTex };
      shader.uniforms.tSandSpec  = { value: this.sandSpecTex };
      shader.uniforms.tSnowDiff  = { value: this.snowDiffTex };
      shader.uniforms.tSnowSpec  = { value: this.snowSpecTex };

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        `
      ).replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform sampler2D tGrassDiff;
        uniform sampler2D tGrassSpec;
        uniform sampler2D tRockDiff;
        uniform sampler2D tRockSpec;
        uniform sampler2D tSandDiff;
        uniform sampler2D tSandSpec;
        uniform sampler2D tSnowDiff;
        uniform sampler2D tSnowSpec;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        `
      ).replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        // Proven Industry-Standard Triplanar Projection (Zero texture stretching on all cliffs & slopes)
        vec3 blending = pow(abs(vWorldNormal), vec3(4.0));
        blending /= (blending.x + blending.y + blending.z);

        float uvScale = 0.032;
        vec2 uvX = vWorldPos.zy * uvScale;
        vec2 uvY = vWorldPos.xz * uvScale;
        vec2 uvZ = vWorldPos.xy * uvScale;

        // Triplanar Rock for Cliffs & Overhangs
        vec4 rockX = texture2D(tRockDiff, uvX);
        vec4 rockY = texture2D(tRockDiff, uvY);
        vec4 rockZ = texture2D(tRockDiff, uvZ);
        vec3 cRock = (rockX * blending.x + rockY * blending.y + rockZ * blending.z).rgb;

        // Ground Textures for Flat & Low-Slope Areas
        vec3 cGrass = texture2D(tGrassDiff, uvY * 1.1).rgb;
        vec3 cSand  = texture2D(tSandDiff,  uvY * 1.0).rgb;
        vec3 cSnow  = texture2D(tSnowDiff,  uvY * 0.9).rgb;

        // Slope angle factor (0 = flat, 1 = vertical cliff)
        float slope = 1.0 - max(0.0, vWorldNormal.y);
        float rockFactor = smoothstep(0.22, 0.58, slope);

        // Biome / Altitude texture blending
        vec3 texColor = cGrass;
        if (vWorldPos.y < 6.0) {
          float sandMix = smoothstep(6.0, 2.2, vWorldPos.y);
          texColor = mix(texColor, cSand, sandMix);
        } else if (vWorldPos.y > 58.0) {
          float snowMix = smoothstep(58.0, 80.0, vWorldPos.y);
          texColor = mix(texColor, cSnow, snowMix);
        }

        // Blend steep cliff rock texture seamlessly across all slope angles
        texColor = mix(texColor, cRock, rockFactor);

        diffuseColor.rgb *= texColor * 1.35;
        `
      ).replace(
        '#include <roughnessmap_fragment>',
        `
        #include <roughnessmap_fragment>
        // Material-Based Triplanar Specularity & Roughness
        vec4 rockSpecX = texture2D(tRockSpec, uvX);
        vec4 rockSpecY = texture2D(tRockSpec, uvY);
        vec4 rockSpecZ = texture2D(tRockSpec, uvZ);
        float rockSpec = (rockSpecX * blending.x + rockSpecY * blending.y + rockSpecZ * blending.z).r;

        float grassSpec = texture2D(tGrassSpec, uvY * 1.1).r;
        float sandSpec  = texture2D(tSandSpec, uvY * 1.0).r;
        float snowSpec  = texture2D(tSnowSpec, uvY * 0.9).r;

        float specValue = grassSpec;
        if (vWorldPos.y < 6.0) {
          float sandMix = smoothstep(6.0, 2.2, vWorldPos.y);
          specValue = mix(specValue, sandSpec * 1.3, sandMix);
        } else if (vWorldPos.y > 58.0) {
          float snowMix = smoothstep(58.0, 80.0, vWorldPos.y);
          specValue = mix(specValue, snowSpec * 1.45, snowMix);
        }
        specValue = mix(specValue, rockSpec, rockFactor);

        // Dynamically compute specular highlight response based on physical material
        roughnessFactor = clamp(1.0 - specValue * 0.65, 0.28, 0.95);
        `
      );
    };
  }

  mergeGeos(geos) {
    if (!THREE.BufferGeometryUtils || !THREE.BufferGeometryUtils.mergeBufferGeometries) {
      return geos[0];
    }
    // Normalize all geometries to non-indexed to ensure 100% attribute compatibility
    const nonIndexed = geos.map(g => (g.index ? g.toNonIndexed() : g));
    return THREE.BufferGeometryUtils.mergeBufferGeometries(nonIndexed);
  }

  initFoliagePrototypes() {
    // 1. Alpine Pine / Conifer (Mountains, Fjords, Tundra)
    const pineTrunk = new THREE.CylinderGeometry(0.3, 0.5, 4.0, 5);
    pineTrunk.translate(0, 2.0, 0);
    this.setGeoColor(pineTrunk, new THREE.Color(0x3e2717));

    const pineC1 = new THREE.ConeGeometry(3.0, 4.8, 5);
    pineC1.translate(0, 5.0, 0);
    this.setGeoColor(pineC1, new THREE.Color(0x18391e));

    const pineC2 = new THREE.ConeGeometry(2.2, 4.0, 5);
    pineC2.translate(0, 7.5, 0);
    this.setGeoColor(pineC2, new THREE.Color(0x1e4624));

    const pineC3 = new THREE.ConeGeometry(1.4, 3.0, 5);
    pineC3.translate(0, 9.6, 0);
    this.setGeoColor(pineC3, new THREE.Color(0x23522b));

    this.pineGeo = this.mergeGeos([pineTrunk, pineC1, pineC2, pineC3]);

    // 2. Broadleaf Deciduous Oak (Plains, Hills, Terraces)
    const oakTrunk = new THREE.CylinderGeometry(0.45, 0.7, 3.5, 5);
    oakTrunk.translate(0, 1.75, 0);
    this.setGeoColor(oakTrunk, new THREE.Color(0x4a3319));

    const oakCanopy1 = new THREE.DodecahedronGeometry(3.2, 0);
    oakCanopy1.translate(0, 5.5, 0);
    this.setGeoColor(oakCanopy1, new THREE.Color(0x2d6a2e));

    const oakCanopy2 = new THREE.DodecahedronGeometry(2.4, 0);
    oakCanopy2.translate(1.4, 6.2, 0.8);
    this.setGeoColor(oakCanopy2, new THREE.Color(0x388239));

    this.oakGeo = this.mergeGeos([oakTrunk, oakCanopy1, oakCanopy2]);

    // 3. Tropical Palm Tree (Islands, Coast)
    const palmTrunk = new THREE.CylinderGeometry(0.25, 0.45, 6.0, 5);
    palmTrunk.translate(0, 3.0, 0);
    this.setGeoColor(palmTrunk, new THREE.Color(0x6b4c2a));

    const palmFrond1 = new THREE.ConeGeometry(3.8, 1.2, 5);
    palmFrond1.rotateX(Math.PI);
    palmFrond1.translate(0, 6.0, 0);
    this.setGeoColor(palmFrond1, new THREE.Color(0x22c55e));

    this.palmGeo = this.mergeGeos([palmTrunk, palmFrond1]);

    // 4. African Flat-Top Acacia (Savanna)
    const acaciaTrunk = new THREE.CylinderGeometry(0.35, 0.55, 4.8, 4);
    acaciaTrunk.translate(0, 2.4, 0);
    this.setGeoColor(acaciaTrunk, new THREE.Color(0x45311d));

    const acaciaCrown = new THREE.CylinderGeometry(4.6, 1.2, 1.0, 6);
    acaciaCrown.translate(0, 5.2, 0);
    this.setGeoColor(acaciaCrown, new THREE.Color(0x526b2d));

    this.acaciaGeo = this.mergeGeos([acaciaTrunk, acaciaCrown]);

    // 5. Desert Saguaro Cactus (Desert)
    const cactusMain = new THREE.CylinderGeometry(0.5, 0.5, 5.5, 6);
    cactusMain.translate(0, 2.75, 0);
    this.setGeoColor(cactusMain, new THREE.Color(0x2e7d32));

    const cactusArm1 = new THREE.CylinderGeometry(0.3, 0.3, 2.2, 5);
    cactusArm1.translate(1.0, 3.8, 0);
    this.setGeoColor(cactusArm1, new THREE.Color(0x388e3c));

    const cactusArm2 = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 5);
    cactusArm2.translate(-0.9, 3.2, 0.4);
    this.setGeoColor(cactusArm2, new THREE.Color(0x388e3c));

    this.cactusGeo = this.mergeGeos([cactusMain, cactusArm1, cactusArm2]);

    // 6. Jungle Karst Canopy (Jungle)
    const jungleTrunk = new THREE.CylinderGeometry(0.5, 0.9, 7.5, 5);
    jungleTrunk.translate(0, 3.75, 0);
    this.setGeoColor(jungleTrunk, new THREE.Color(0x2b1d14));

    const jungleCanopy = new THREE.DodecahedronGeometry(4.2, 0);
    jungleCanopy.translate(0, 8.5, 0);
    this.setGeoColor(jungleCanopy, new THREE.Color(0x14532d));

    this.jungleGeo = this.mergeGeos([jungleTrunk, jungleCanopy]);

    // 7. Jagged Angular Boulders (Fractured Rock Crags)
    const rockGeo = new THREE.BoxGeometry(2.8, 1.8, 2.4, 2, 2, 2);
    const rPos = rockGeo.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      let x = rPos.getX(i);
      let y = rPos.getY(i);
      let z = rPos.getZ(i);

      const angleNoise = Math.sin(x * 3.5) * Math.cos(z * 3.5);
      const slabShift = (y > 0.0 ? 0.35 : -0.2) + (x > 0.0 ? -0.25 : 0.3);

      x += angleNoise * 0.45 + slabShift * 0.3;
      y += (Math.cos(x * 4.2) * 0.35) * (y > 0 ? 1 : 0.3);
      z += Math.sin(y * 3.8) * 0.4;

      rPos.setXYZ(i, x, y, z);
    }
    rockGeo.computeVertexNormals();
    this.setGeoColor(rockGeo, new THREE.Color(0x575a61));
    this.rockGeo = rockGeo;

    this.instancedMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true
    });
  }

  setGeoColor(geo, color) {
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  getTreeGeoForBiome(biome) {
    switch (biome) {
      case 'islands': return this.palmGeo;
      case 'desert': return this.cactusGeo;
      case 'savanna': return this.acaciaGeo;
      case 'jungle': return this.jungleGeo;
      case 'plains':
      case 'hills':
      case 'terraces': return this.oakGeo;
      case 'fjords':
      case 'tundra':
      case 'mountains':
      default: return this.pineGeo;
    }
  }

  setAmbientOcclusionAndReflections(enabled) {
    this.ambientOcclusionAndReflections = enabled;
    this.terrainMaterial.roughness = enabled ? 0.82 : 0.90;
    this.terrainMaterial.metalness = 0.0;
    this.terrainMaterial.needsUpdate = true;
    this.clear();
  }

  setResolution(segments) {
    if (this.segments === segments) return;
    this.segments = segments;
    this.clear();
  }

  setViewRadius(radius) {
    if (this.viewRadius === radius) return;
    this.viewRadius = radius;
    if (this.currentCenterChunk.x !== null) {
      this.refreshChunks(this.currentCenterChunk.x, this.currentCenterChunk.z);
    }
  }

  setFoliageEnabled(enabled) {
    this.foliageEnabled = enabled;
    this.chunks.forEach(chunk => {
      if (chunk.treeMesh) chunk.treeMesh.visible = enabled;
      if (chunk.rockMesh) chunk.rockMesh.visible = enabled;
    });
  }

  setWireframe(enabled) {
    this.wireframe = enabled;
    this.terrainMaterial.wireframe = enabled;
  }

  setFlatShading(enabled) {
    this.flatShading = enabled;
    this.terrainMaterial.flatShading = enabled;
    this.terrainMaterial.needsUpdate = true;
  }

  setChunkBorders(enabled) {
    this.debugChunkBorders = enabled;
    this.chunks.forEach(chunk => {
      if (chunk.borderHelper) {
        chunk.borderHelper.visible = enabled;
      } else if (enabled) {
        this.addChunkBorder(chunk);
      }
    });
  }

  addChunkBorder(chunk) {
    const size = this.chunkSize;
    const startX = chunk.chunkX * size;
    const startZ = chunk.chunkZ * size;
    const box = new THREE.Box3(
      new THREE.Vector3(startX, -50, startZ),
      new THREE.Vector3(startX + size, 220, startZ + size)
    );
    const helper = new THREE.Box3Helper(box, 0x4ade80);
    chunk.borderHelper = helper;
    this.scene.add(helper);
  }

  clear() {
    this.chunks.forEach(chunk => {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      if (chunk.borderHelper) {
        this.scene.remove(chunk.borderHelper);
        chunk.borderHelper.dispose();
      }
      if (chunk.treeMesh) {
        this.scene.remove(chunk.treeMesh);
        chunk.treeMesh.dispose();
      }
      if (chunk.rockMesh) {
        this.scene.remove(chunk.rockMesh);
        chunk.rockMesh.dispose();
      }
    });
    this.chunks.clear();
    this.pendingChunks = [];
    this.currentCenterChunk = { x: null, z: null };
  }

  update(camera) {
    const cameraPos = camera.position;
    const centerChunkX = Math.floor((cameraPos.x + this.chunkSize * 0.5) / this.chunkSize);
    const centerChunkZ = Math.floor((cameraPos.z + this.chunkSize * 0.5) / this.chunkSize);

    if (centerChunkX !== this.currentCenterChunk.x || centerChunkZ !== this.currentCenterChunk.z) {
      this.currentCenterChunk.x = centerChunkX;
      this.currentCenterChunk.z = centerChunkZ;
      this.refreshChunks(centerChunkX, centerChunkZ);
    }

    // Viewport Frustum Culling
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    this.chunks.forEach(chunk => {
      const isVisible = this.frustum.intersectsBox(chunk.boundingBox);
      chunk.mesh.visible = isVisible;
      if (chunk.treeMesh) chunk.treeMesh.visible = isVisible && this.foliageEnabled;
      if (chunk.rockMesh) chunk.rockMesh.visible = isVisible && this.foliageEnabled;
    });

    // Time-sliced chunk generation: 3.5ms frame budget
    const startTime = performance.now();
    while (this.pendingChunks.length > 0 && (performance.now() - startTime < 3.5)) {
      const { cx, cz } = this.pendingChunks.shift();
      const key = `${cx},${cz}`;
      if (!this.chunks.has(key)) {
        const chunk = this.createChunk(cx, cz);
        this.chunks.set(key, chunk);
        this.scene.add(chunk.mesh);
        if (this.debugChunkBorders) {
          this.addChunkBorder(chunk);
        }
        if (chunk.treeMesh) {
          chunk.treeMesh.visible = this.foliageEnabled;
          this.scene.add(chunk.treeMesh);
        }
        if (chunk.rockMesh) {
          chunk.rockMesh.visible = this.foliageEnabled;
          this.scene.add(chunk.rockMesh);
        }
      }
    }
  }

  refreshChunks(centerX, centerZ) {
    const activeKeys = new Set();
    const r = this.viewRadius;

    const needed = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const cx = centerX + dx;
        const cz = centerZ + dz;
        const key = `${cx},${cz}`;
        activeKeys.add(key);
        if (!this.chunks.has(key)) {
          const distSq = dx * dx + dz * dz;
          needed.push({ cx, cz, distSq });
        }
      }
    }

    needed.sort((a, b) => a.distSq - b.distSq);
    this.pendingChunks = needed.map(n => ({ cx: n.cx, cz: n.cz }));

    this.chunks.forEach((chunk, key) => {
      if (!activeKeys.has(key)) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        if (chunk.borderHelper) {
          this.scene.remove(chunk.borderHelper);
          chunk.borderHelper.dispose();
        }
        if (chunk.treeMesh) {
          this.scene.remove(chunk.treeMesh);
          chunk.treeMesh.dispose();
        }
        if (chunk.rockMesh) {
          this.scene.remove(chunk.rockMesh);
          chunk.rockMesh.dispose();
        }
        this.chunks.delete(key);
      }
    });
  }

  createChunk(chunkX, chunkZ) {
    const size = this.chunkSize;
    const segs = this.segments;
    const startX = chunkX * size;
    const startZ = chunkZ * size;

    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const vertexCount = pos.count;
    const colors = new Float32Array(vertexCount * 3);

    const heights = new Float32Array(vertexCount);
    const erosions = new Float32Array(vertexCount);
    const biomes = new Array(vertexCount);

    let minH = Infinity;
    let maxH = -Infinity;

    for (let i = 0; i < vertexCount; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = startX + lx;
      const wz = startZ + lz;

      const data = this.generator.getTerrainData(wx, wz);
      const rawH = data.height;
      const waterHeight = this.generator.waterLevel || 3.0;
      const waterDelta = rawH - waterHeight;
      let finalH = rawH;

      // Coastal Waterline Smoothing: creates an organic, smooth beach gradient without sharp polygon facets
      if (Math.abs(waterDelta) < 3.0) {
        const t = waterDelta / 3.0;
        const sCurve = Math.sign(t) * Math.pow(Math.abs(t), 1.3) * 3.0;
        finalH = waterHeight + THREE.MathUtils.lerp(waterDelta, sCurve, 0.5);
      }

      pos.setY(i, finalH);
      heights[i] = finalH;
      erosions[i] = data.erosion;
      biomes[i] = data.climate ? data.climate.biome : 'plains';

      if (finalH < minH) minH = finalH;
      if (finalH > maxH) maxH = finalH;
    }

    geo.computeVertexNormals();
    const normals = geo.attributes.normal;

    const dummyColor = new THREE.Color();
    const treeTransforms = [];
    const rockTransforms = [];

    const useAO = this.ambientOcclusionAndReflections;
    const waterHeight = this.generator.waterLevel || 3.0;

    // Palette Definitions
    const colPlainsGrass = new THREE.Color(0x4cae3a);
    const colMeadowGrass = new THREE.Color(0x3e8a34);
    const colDryGrass    = new THREE.Color(0xca8a04);
    const colSand        = new THREE.Color(0xdec898);
    const colDirt        = new THREE.Color(0x4a3522);
    const colSlateRock   = new THREE.Color(0x4f555d);
    const colStrata1     = new THREE.Color(0x5c564f);
    const colStrata2     = new THREE.Color(0x6b635a);
    const colSnow        = new THREE.Color(0xf8fafc);
    const colDuneSand    = new THREE.Color(0xfacc15);
    const colJungleGreen = new THREE.Color(0x15803d);
    const colTundraMoss  = new THREE.Color(0x64748b);
    const colCanyonRed   = new THREE.Color(0xb91c1c);

    const dominantBiome = biomes[Math.floor(vertexCount / 2)] || 'plains';

    for (let i = 0; i < vertexCount; i++) {
      const h = heights[i];
      const erosion = erosions[i];
      const biome = biomes[i];
      const ny = normals.getY(i);
      const slope = 1.0 - ny;

      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = startX + lx;
      const wz = startZ + lz;

      // Aperiodic micro-noise to break up cliff repetition patterns
      const hx = Math.sin(wx * 0.13 + wz * 0.07) * 43758.5453;
      const hz = Math.sin(wz * 0.11 + wx * 0.19) * 31337.9271;
      const microNoise = (Math.sin(hx) * 0.5 + Math.sin(hz) * 0.3 + Math.sin((hx + hz) * 0.5) * 0.2);
      const breakup = microNoise * 0.5 + 0.5;
      const occlusion = Math.pow(Math.min(1.0, Math.max(0.0, erosion + 0.35)), 2.0);

      // Cross-biome blending: sample climate at 2 neighbor offsets and blend colors
      const climate = this.generator.getClimate(wx, wz);
      const continentalness = climate.continentalness;
      const blendRadius = 180.0;
      const neighborData1 = this.generator.getClimate(wx + blendRadius, wz + blendRadius * 0.5);
      const neighborData2 = this.generator.getClimate(wx - blendRadius * 0.6, wz + blendRadius);
      // Blend weight based on how far continentalness is from its neighbors (0=edge, 1=deep core)
      const cBlend1 = Math.min(1.0, Math.max(0.0, Math.abs(continentalness - neighborData1.continentalness) * 2.5));
      const cBlend2 = Math.min(1.0, Math.max(0.0, Math.abs(continentalness - neighborData2.continentalness) * 2.5));
      const blendFactor = Math.min(1.0, (cBlend1 + cBlend2) * 0.5); // low at biome edges → more blending

      // Helper to compute color for a given biome/height/slope combination
      const getBiomeColor = (b, localH, localSlope, localBreakup) => {
        const c = new THREE.Color();
        if (b === 'desert') {
          c.copy(colDuneSand);
          if (localSlope > 0.35) c.lerp(colDirt, localSlope * 0.7);
        } else if (b === 'savanna') {
          c.copy(colDryGrass);
          if (localSlope > 0.3) c.lerp(colDirt, 0.7);
        } else if (b === 'tundra') {
          c.copy(colTundraMoss);
          if (localH > 20.0) c.lerp(colSnow, Math.min(1.0, (localH - 20.0) / 18.0));
        } else if (b === 'jungle') {
          c.copy(colJungleGreen);
          if (localSlope > 0.38) c.lerp(colSlateRock, localSlope * 1.5);
        } else if (b === 'canyons') {
          c.copy(colCanyonRed);
          const strata = Math.sin(localH * 0.8 + localBreakup * 2.0) * 0.5 + 0.5;
          c.lerp(colSand, strata * 0.6);
        } else if (b === 'plains') {
          c.lerpColors(colPlainsGrass, colMeadowGrass, localBreakup);
          if (localSlope > 0.28) c.lerp(colDirt, localSlope * 0.8);
        } else {
          c.copy(colSlateRock);
          const strata = Math.sin(localH * 0.7 + localBreakup * 1.8) * 0.5 + 0.5;
          c.lerp(strata > 0.5 ? colStrata1 : colStrata2, Math.min(1.0, localSlope * 1.5) * 0.5);
          const veg = Math.min(1.0, Math.max(0.0, (normals.getY(i) - 0.62) * 3.0)) * Math.max(0.0, 1.0 - (localH / 70.0));
          c.lerp(colMeadowGrass, veg);
          if (localH > 65.0) {
            const snowW = Math.min(1.0, (localH - 65.0) / 25.0) * Math.min(1.0, normals.getY(i) * 1.4);
            c.lerp(colSnow, snowW);
          }
        }
        return c;
      };

      // Procedural Climate-Based Surface Coloring with cross-biome blending
      dummyColor.copy(getBiomeColor(biome, h, slope, breakup));

      // Smoothly blend with neighboring biome colors where biomes meet
      if (blendFactor < 0.85 && neighborData1.biome !== biome) {
        const neighborColor = getBiomeColor(neighborData1.biome, h, slope, breakup);
        const weight = Math.pow(1.0 - blendFactor, 1.5) * 0.45;
        dummyColor.lerp(neighborColor, weight);
      }
      if (blendFactor < 0.85 && neighborData2.biome !== biome) {
        const neighborColor = getBiomeColor(neighborData2.biome, h, slope, breakup);
        const weight = Math.pow(1.0 - blendFactor, 1.5) * 0.3;
        dummyColor.lerp(neighborColor, weight);
      }

      if (h < waterHeight + 1.8) {
        const beachW = Math.min(1.0, Math.max(0.0, 1.0 - (h - (waterHeight - 0.5)) / 2.3));
        dummyColor.lerp(colSand, beachW);
      }

      if (useAO) {
        const aoFactor = Math.max(0.42, Math.min(1.0, Math.pow(ny, 0.72) * (0.65 + Math.min(h / 45.0, 0.35)) * (occlusion * 0.45 + 0.55)));
        dummyColor.multiplyScalar(aoFactor);
      }

      colors[i * 3]     = dummyColor.r;
      colors[i * 3 + 1] = dummyColor.g;
      colors[i * 3 + 2] = dummyColor.b;

      // Tree Groves & Open Plains Scattering
      const forestNoise = Math.sin(wx * 0.015) * Math.cos(wz * 0.015);
      const hash = Math.abs(Math.sin(wx * 12.9898 + wz * 78.233) * 43758.5453) % 1.0;

      let treeChance = 0.985;
      if (biome === 'plains') treeChance = 0.994;
      else if (biome === 'desert') treeChance = 0.992;
      else if (forestNoise > 0.25) treeChance = 0.965;

      if (h > waterHeight + 1.2 && h < 60.0 && slope < 0.26 && hash > treeChance) {
        const treeScale = 0.85 + (hash * 10 % 1.0) * 0.75;
        const treeMatrix = new THREE.Matrix4();
        const rotY = (hash * 100) % (Math.PI * 2);
        treeMatrix.makeRotationY(rotY);
        treeMatrix.scale(new THREE.Vector3(treeScale, treeScale, treeScale));
        treeMatrix.setPosition(startX + lx, h, startZ + lz);
        treeTransforms.push(treeMatrix);
      } else if (h > waterHeight + 1.0 && h < 95.0 && hash < 0.015) {
        const scaleX = 0.8 + (hash * 30 % 1.0) * 1.4;
        const scaleY = 0.5 + (hash * 60 % 1.0) * 1.0;
        const scaleZ = 0.7 + (hash * 90 % 1.0) * 1.3;

        const rockMatrix = new THREE.Matrix4();
        rockMatrix.makeRotationY(hash * 50);
        rockMatrix.scale(new THREE.Vector3(scaleX, scaleY, scaleZ));
        rockMatrix.setPosition(startX + lx, h, startZ + lz);
        rockTransforms.push(rockMatrix);
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mesh = new THREE.Mesh(geo, this.terrainMaterial);
    mesh.receiveShadow = true;
    mesh.position.set(startX, 0, startZ);

    // Generously Padded Bounding Box for Culling to prevent edge popping
    const cullingMargin = 60.0;
    const boundingBox = new THREE.Box3(
      new THREE.Vector3(startX - cullingMargin, minH - 25.0, startZ - cullingMargin),
      new THREE.Vector3(startX + size + cullingMargin, maxH + 45.0, startZ + size + cullingMargin)
    );

    const treeGeo = this.getTreeGeoForBiome(dominantBiome);
    let treeMesh = null;
    if (treeTransforms.length > 0 && treeGeo) {
      treeMesh = new THREE.InstancedMesh(treeGeo, this.instancedMaterial, treeTransforms.length);
      treeMesh.castShadow = true;
      treeMesh.receiveShadow = true;
      for (let i = 0; i < treeTransforms.length; i++) {
        treeMesh.setMatrixAt(i, treeTransforms[i]);
      }
      treeMesh.instanceMatrix.needsUpdate = true;
    }

    let rockMesh = null;
    if (rockTransforms.length > 0 && this.rockGeo) {
      rockMesh = new THREE.InstancedMesh(this.rockGeo, this.instancedMaterial, rockTransforms.length);
      rockMesh.castShadow = true;
      rockMesh.receiveShadow = true;
      for (let i = 0; i < rockTransforms.length; i++) {
        rockMesh.setMatrixAt(i, rockTransforms[i]);
      }
      rockMesh.instanceMatrix.needsUpdate = true;
    }

    return { mesh, treeMesh, rockMesh, chunkX, chunkZ, boundingBox };
  }
}
