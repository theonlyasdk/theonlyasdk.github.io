/**
 * Multi-Noise Minecraft-Style Climate & Infinite Biome World Generator
 * Featuring Continentalness, Temperature, Humidity, Vast Plains & Mountain Ranges
 */

class SimplexNoise {
  constructor(seed = 1337) {
    this.setSeed(seed);
  }

  setSeed(seed) {
    this.seed = seed;
    let s = seed >>> 0;
    const rnd = () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const n = Math.floor(rnd() * (i + 1));
      const q = p[i];
      p[i] = p[n];
      p[n] = q;
    }

    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise2D(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    let n0 = 0, n1 = 0, n2 = 0;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    const GRAD3 = [
      [1,1],[-1,1],[1,-1],[-1,-1],
      [1,0],[-1,0],[1,0],[-1,0],
      [0,1],[0,-1],[0,1],[0,-1]
    ];

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }

  fbm(x, y, octaves = 5, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  ridgedNoise(x, y, octaves = 4, persistence = 0.52, lacunarity = 2.1) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let weight = 1;

    for (let i = 0; i < octaves; i++) {
      let n = Math.abs(this.noise2D(x * frequency, y * frequency));
      n = 1.0 - n;
      n = n * n;
      n *= weight;
      weight = Math.min(1.0, Math.max(0.0, n * 2.0));
      total += n * amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total;
  }

  domainWarp(x, y, scale = 0.003, strength = 40.0) {
    const qx = this.noise2D(x * scale, y * scale);
    const qy = this.noise2D((x + 5.2) * scale, (y + 1.3) * scale);
    return {
      x: x + strength * qx,
      y: y + strength * qy
    };
  }
}

// Minecraft-Style Multi-Noise Climate & Infinite Biome Terrain Engine
class TerrainGenerator {
  constructor(seed = 42, params = {}) {
    this.simplex = new SimplexNoise(seed);
    this.tempSimplex = new SimplexNoise(seed + 10101);
    this.humiditySimplex = new SimplexNoise(seed + 20202);
    this.continentalSimplex = new SimplexNoise(seed + 30303);
    this.detailSimplex = new SimplexNoise(seed + 40404);

    this.heightScale = 65.0;
    this.roughness = 0.85;
    this.waterLevel = 3.0;

    this.setParams(params);
  }

  setParams(params = {}) {
    if (params.heightScale !== undefined) this.heightScale = params.heightScale;
    if (params.roughness !== undefined) this.roughness = params.roughness;
    if (params.waterLevel !== undefined) this.waterLevel = params.waterLevel;
  }

  setSeed(seed) {
    this.simplex.setSeed(seed);
    this.tempSimplex.setSeed(seed + 10101);
    this.humiditySimplex.setSeed(seed + 20202);
    this.continentalSimplex.setSeed(seed + 30303);
    this.detailSimplex.setSeed(seed + 40404);
  }

  // Minecraft-Style Multi-Noise Climate Sampling
  getClimate(worldX, worldZ) {
    const tempScale = 0.00035;
    const humScale = 0.00035;
    const contScale = 0.00045;

    const temp = this.tempSimplex.fbm(worldX * tempScale, worldZ * tempScale, 3, 0.5, 2.0);
    const humidity = this.humiditySimplex.fbm(worldX * humScale + 120.0, worldZ * humScale + 85.0, 3, 0.5, 2.0);
    const continentalness = this.continentalSimplex.fbm(worldX * contScale, worldZ * contScale, 4, 0.5, 2.0);

    // Determine Biome ID and Name from climate parameters
    let biome = 'plains';
    let biomeName = 'Vast Grassy Plains';

    if (continentalness > 0.38) {
      // High Altitude Mountains & Peaks
      if (temp < -0.15) {
        biome = 'mountains';
        biomeName = 'Alpine Glacier Peaks';
      } else if (temp > 0.25 && humidity < -0.1) {
        biome = 'canyons';
        biomeName = 'Red Canyon Mesas';
      } else if (humidity > 0.25) {
        biome = 'jungle';
        biomeName = 'Karst Rainforest Peaks';
      } else {
        biome = 'fjords';
        biomeName = 'Highland Ridge';
      }
    } else if (continentalness > 0.08) {
      // Rolling Foothills & Forests
      if (temp < -0.2) {
        biome = 'tundra';
        biomeName = 'Arctic Pine Tundra';
      } else if (temp > 0.3 && humidity < -0.2) {
        biome = 'badlands';
        biomeName = 'Stratified Badlands';
      } else if (humidity > 0.25) {
        biome = 'terraces';
        biomeName = 'Stepped Forest Terraces';
      } else {
        biome = 'hills';
        biomeName = 'Rolling Green Hills';
      }
    } else if (continentalness > -0.25) {
      // Lowland Expansive Flat Plains & Savannas
      if (temp > 0.35 && humidity < -0.15) {
        biome = 'desert';
        biomeName = 'Golden Desert Dunes';
      } else if (temp > 0.15 && humidity < 0.05) {
        biome = 'savanna';
        biomeName = 'Golden Savanna';
      } else if (humidity > 0.35) {
        biome = 'swamp';
        biomeName = 'Bayou Marshlands';
      } else if (temp < -0.3) {
        biome = 'tundra';
        biomeName = 'Frozen Tundra Plains';
      } else {
        biome = 'plains';
        biomeName = 'Vast Grassy Plains';
      }
    } else {
      // Coastal & Ocean Archipelago
      if (temp > 0.15) {
        biome = 'islands';
        biomeName = 'Tropical Archipelago';
      } else if (temp < -0.25) {
        biome = 'fjords';
        biomeName = 'Glacial Coast';
      } else {
        biome = 'islands';
        biomeName = 'Coastal Meadows';
      }
    }

    return {
      temp,
      humidity,
      continentalness,
      biome,
      biomeName
    };
  }

  getTerrainData(worldX, worldZ) {
    const climate = this.getClimate(worldX, worldZ);
    const { continentalness, temp, humidity, biome } = climate;

    let h = 0;
    let erosionFactor = 0.5;

    const wx = worldX;
    const wz = worldZ;

    if (continentalness > 0.38) {
      // High Mountain Ranges: Majestic Alpine Peaks & Glacial Valleys (Proven Musgrave/Perlin Multi-Octave FBM)
      const mountainScale = (continentalness - 0.38) / 0.55;
      
      // Rotated Harmonic FBM (Breaks grid alignment & eliminates repetitive zigzag artifacts)
      let mTotal = 0.0;
      let mFreq = 0.0022;
      let mAmp = 1.0;
      let pX = wx * mFreq;
      let pZ = wz * mFreq;

      for (let i = 0; i < 5; i++) {
        let n = this.simplex.noise2D(pX, pZ);
        // Smooth exponential mountain ridge shaping (natural peaks without artificial folds)
        n = 1.0 - Math.abs(n);
        n = n * n;
        mTotal += n * mAmp;
        mAmp *= 0.52;
        // 45-degree octave coordinate rotation
        const nx = pX * 0.8 - pZ * 0.6;
        const nz = pX * 0.6 + pZ * 0.8;
        pX = nx * 2.05;
        pZ = nz * 2.05;
      }

      const valleys = Math.pow(Math.abs(this.simplex.fbm(wx * 0.0018, wz * 0.0018, 3, 0.5, 2.0)), 1.2);
      const peakHeight = (mTotal * 0.7 - valleys * 0.25) * (this.heightScale * 1.45);
      h = (24.0 + peakHeight * mountainScale) * this.roughness;
      erosionFactor = 0.75;
    } else if (continentalness > 0.08) {
      // Rolling Foothills & Low Mountains: Smooth, organic natural slopes
      const hillBase = this.simplex.fbm(wx * 0.0018, wz * 0.0018, 4, 0.5, 2.0);
      const hillDetail = this.simplex.noise2D(wx * 0.005, wz * 0.005) * 0.2;
      const hillHeight = (hillBase * 0.8 + hillDetail) * 32.0;
      h = (10.0 + hillHeight) * this.roughness;
      erosionFactor = 0.45;
    } else if (continentalness > -0.25) {
      // Vast, Sweeping Flat Plains & Lowland Meadows
      const plainsBase = this.simplex.fbm(wx * 0.0008, wz * 0.0008, 3, 0.45, 2.0);
      const gentleUndulation = this.simplex.noise2D(wx * 0.0022, wz * 0.0022) * 0.15;
      h = (4.0 + (plainsBase * 0.7 + gentleUndulation) * 8.0) * this.roughness;
      erosionFactor = 0.25;

      if (biome === 'desert') {
        const duneWave = Math.sin((wx * 0.7 + wz * 0.4) * 0.005) * 5.0;
        h += duneWave;
      }
    } else {
      // Coastal & Archipelago Lowlands
      const coastBase = this.simplex.fbm(wx * 0.0015, wz * 0.0015, 4, 0.5, 2.0);
      h = (coastBase * 22.0 - 2.0) * this.roughness;
      erosionFactor = 0.35;
    }

    // Gentle micro-surface variation
    const microCrags = this.detailSimplex.noise2D(worldX * 0.02, worldZ * 0.02) * 0.25;
    h += microCrags;

    // Coastal Waterline Smoothing: guarantees 100% precision between physics collision and visual terrain
    const waterHeight = this.waterLevel || 3.0;
    const waterDelta = h - waterHeight;
    if (Math.abs(waterDelta) < 3.0) {
      const t = waterDelta / 3.0;
      const sCurve = Math.sign(t) * Math.pow(Math.abs(t), 1.3) * 3.0;
      h = waterHeight + (waterDelta * 0.5 + sCurve * 0.5);
    }

    return {
      height: h,
      erosion: erosionFactor,
      climate
    };
  }

  getHeight(worldX, worldZ) {
    return this.getTerrainData(worldX, worldZ).height;
  }
}
