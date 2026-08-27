class BF {
  static PREC = 256n;
  constructor(v) {
    if (typeof v === 'bigint') this.v = v;
    else if (v instanceof BF) this.v = v.v;
    else this.v = BigInt(Math.round(v * (2**52))) << (BF.PREC - 52n);
  }
  add(b) { return new BF(this.v + b.v); }
  sub(b) { return new BF(this.v - b.v); }
  mul(b) { return new BF((this.v * b.v) >> BF.PREC); }
  abs() { return new BF(this.v < 0n ? -this.v : this.v); }
  toNumber() { return Number(this.v) / Math.pow(2, Number(BF.PREC)); }
}

const canvas = document.getElementById('render-canvas');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
const $ = id => document.getElementById(id);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const defaults = {
  mandelbrot: { x: new BF(-0.5), y: new BF(0), scale: new BF(3.2) },
  julia: { x: new BF(0), y: new BF(0), scale: new BF(3.2) },
  ship: { x: new BF(-0.5), y: new BF(-0.5), scale: new BF(3.5) },
  tricorn: { x: new BF(-0.5), y: new BF(0), scale: new BF(3.2) },
  celtic: { x: new BF(-0.5), y: new BF(0), scale: new BF(3.2) },
  perpendicular: { x: new BF(-0.5), y: new BF(0), scale: new BF(3.2) }
};
const state = {
  type: 'mandelbrot',
  palette: 'ocean',
  x: new BF(-0.5),
  y: new BF(0),
  scale: new BF(3.2),
  iterations: 320,
  cycle: 1,
  smooth: true,
  aa: 2,
  juliaRe: -.745,
  juliaIm: .113,
  resolution: 'auto',
  customWidth: 1920,
  customHeight: 1080,
  autoZoom: false,
  homing: false,
  homeTargetType: 'mandelbrot',
  homeTargetX: defaults['mandelbrot'].x,
  homeTargetY: defaults['mandelbrot'].y,
  homeTargetScale: defaults['mandelbrot'].scale,
  animSpeed: 1.0,
  animSmoothing: 0.8,
  animEasing: 'exponential',
  animTracking: 50,
  animDensity: 7,
  animRadius: 0.25,
  animSensitivity: 70,
  dynamicIter: true,
  targetRelX: 0,
  targetRelY: 0,
  smoothRelX: 0,
  smoothRelY: 0,
  velRelX: 0,
  velRelY: 0,
  dragging: false,
  moved: false,
  lastX: 0,
  lastY: 0,
  renderQueued: false,
  slowFrameScore: 0
};

const vertexSource = `#version 300 es
in vec2 position; out vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }`;

const fragmentSource = `#version 300 es
precision highp float; precision highp int;
in vec2 uv; out vec4 outputColor;
uniform float uScaleMantissa, uAspect, uCycle;
uniform int uScaleExp, uIterations, uType, uPalette, uAA; uniform bool uSmooth;
uniform sampler2D uOrbitTex;
uniform vec2 uJulia;
uniform vec2 uCentre;
uniform vec2 uRefUV;
uniform vec2 uPixelSize;

vec3 palette(float t) {
  t = fract(t);
  if (uPalette == 3) return vec3(t);
  vec3 offset = uPalette == 1 ? vec3(.02,.31,.60) : (uPalette == 2 ? vec3(.12,.48,.83) : vec3(.57,.65,.72));
  vec3 colour = .5 + .5 * cos(6.283185 * (t + offset));
  if (uPalette == 0) colour *= vec3(.30,.78,1.);
  if (uPalette == 1) colour *= vec3(1.,.56,.22);
  return colour;
}

float delta_abs(float X, float dX) {
  if (X + dX >= 0.0) return X >= 0.0 ? dX : 2.0*X + dX;
  else return X < 0.0 ? -dX : -2.0*X - dX;
}

vec3 sampleColor(vec2 sampleUV) {
  vec2 dC0 = vec2((sampleUV.x - uRefUV.x) * uAspect, sampleUV.y - uRefUV.y);
  vec2 u = dC0;
  vec2 v = vec2(0.0);
  if (uType == 1) {
    v = dC0;
    u = vec2(0.0);
  }
  
  float sMant = uScaleMantissa;
  int sExp = uScaleExp;
  
  vec2 dZ = vec2(0.0);
  vec2 dC = vec2(0.0);
  bool linear = true;
  if (sExp >= -4) {
    float curScale = sMant * pow(10.0, float(sExp));
    linear = false;
    dZ = curScale * v;
    dC = curScale * u;
  }
  
  float radius2 = 0.0;
  int iteration = 0;
  vec2 Z = vec2(0.0);
  bool perturb = true;

  for (int i = 0; i < 4000; i++) {
    if (i >= uIterations) break;
    
    vec2 A = texelFetch(uOrbitTex, ivec2(i, 0), 0).rg;
    if (A.x > 9999.0) perturb = false;
    
    if (perturb) {
      if (linear) {
        float vx = v.x; float vy = v.y;
        if (uType == 0 || uType == 1) {
          v.x = 2.0 * (A.x * vx - A.y * vy) + u.x;
          v.y = 2.0 * (A.x * vy + A.y * vx) + u.y;
        } else if (uType == 2) {
          float sx = A.x >= 0.0 ? 1.0 : -1.0;
          float sy = A.y >= 0.0 ? 1.0 : -1.0;
          float dX = sx * vx; float dY = sy * vy;
          float absA = abs(A.x); float absB = abs(A.y);
          v.x = 2.0 * (absA * dX - absB * dY) + u.x;
          v.y = 2.0 * (absA * dY + absB * dX) + u.y;
        } else if (uType == 3) {
          v.x = 2.0 * (A.x * vx - A.y * vy) + u.x;
          v.y = -2.0 * (A.x * vy + A.y * vx) + u.y;
        } else if (uType == 4) {
          float sDiff = (A.x * A.x - A.y * A.y) >= 0.0 ? 1.0 : -1.0;
          float dRe = 2.0 * (A.x * vx - A.y * vy);
          v.x = sDiff * dRe + u.x;
          v.y = 2.0 * (A.x * vy + A.y * vx) + u.y;
        } else if (uType == 5) {
          float sx = A.x >= 0.0 ? 1.0 : -1.0;
          float dX = sx * vx;
          float absA = abs(A.x);
          v.x = 2.0 * (A.x * vx - A.y * vy) + u.x;
          v.y = 2.0 * (absA * vy + A.y * dX) + u.y;
        }
        
        float vNorm2 = dot(v, v);
        if (vNorm2 > 1.0e8) {
          v *= 1.0e-4;
          u *= 1.0e-4;
          sExp += 4;
        }
        
        if (sExp >= -4) {
          float curScale = sMant * pow(10.0, float(sExp));
          if (curScale * sqrt(vNorm2) >= 1.0e-5) {
            dZ = curScale * v;
            dC = curScale * u;
            linear = false;
          }
        }
        
        if (linear) {
          if (sExp >= -30) {
            Z = A + (sMant * pow(10.0, float(sExp))) * v;
          } else {
            Z = A;
          }
        }
      } else {
        Z = A + dZ;
        
        float dx = dZ.x; float dy = dZ.y;
        float dx2 = dx * dx; float dy2 = dy * dy;
        
        if (uType == 0 || uType == 1) {
          dZ.x = 2.0 * (A.x * dx - A.y * dy) + dx2 - dy2 + dC.x;
          dZ.y = 2.0 * (A.x * dy + A.y * dx) + 2.0 * dx * dy + dC.y;
        } else if (uType == 2) {
          float dX = delta_abs(A.x, dx);
          float dY = delta_abs(A.y, dy);
          float absA = abs(A.x); float absB = abs(A.y);
          dZ.x = 2.0 * (absA * dX - absB * dY) + dX * dX - dY * dY + dC.x;
          dZ.y = 2.0 * (absA * dY + absB * dX) + 2.0 * dX * dY + dC.y;
        } else if (uType == 3) {
          dZ.x = 2.0 * (A.x * dx - A.y * dy) + dx2 - dy2 + dC.x;
          dZ.y = -2.0 * (A.x * dy + A.y * dx) - 2.0 * dx * dy + dC.y;
        } else if (uType == 4) {
          float dRe = 2.0 * (A.x * dx - A.y * dy) + dx2 - dy2;
          dZ.x = delta_abs(A.x * A.x - A.y * A.y, dRe) + dC.x;
          dZ.y = 2.0 * (A.x * dy + A.y * dx) + 2.0 * dx * dy + dC.y;
        } else if (uType == 5) {
          float dX = delta_abs(A.x, dx);
          float absA = abs(A.x);
          dZ.x = 2.0 * (A.x * dx - A.y * dy) + dx2 - dy2 + dC.x;
          dZ.y = 2.0 * (absA * dy + A.y * dX + dX * dy) + dC.y;
        }
      }
    } else {
      vec2 effOffset = linear ? (sExp >= -30 ? (sMant * pow(10.0, float(sExp))) * u : vec2(0.0)) : dC;
      vec2 C_abs = uType == 1 ? uJulia : (uCentre + effOffset);
      float zx = Z.x; float zy = Z.y;
      if (uType == 2) { zx = abs(zx); zy = abs(zy); }
      float zx2 = zx * zx; float zy2 = zy * zy; float zxy = zx * zy;
      
      if (uType == 0 || uType == 1 || uType == 2) {
        Z.x = zx2 - zy2 + C_abs.x;
        Z.y = 2.0 * zxy + C_abs.y;
      } else if (uType == 3) {
        Z.x = zx2 - zy2 + C_abs.x;
        Z.y = -2.0 * zxy + C_abs.y;
      } else if (uType == 4) {
        Z.x = abs(zx2 - zy2) + C_abs.x;
        Z.y = 2.0 * zxy + C_abs.y;
      } else if (uType == 5) {
        Z.x = zx2 - zy2 + C_abs.x;
        Z.y = 2.0 * abs(zx) * zy + C_abs.y;
      }
    }
    
    radius2 = dot(Z, Z);
    if (radius2 > 256.0) { iteration = i; break; }
  }
  
  if (iteration == 0 && radius2 <= 256.0) {
    return vec3(0.0);
  } else {
    float smoothIter = float(iteration);
    if (uSmooth && radius2 > 1.0) smoothIter += 1.0 - log(log(radius2)) / log(2.0);
    return palette(smoothIter / float(uIterations) + uCycle);
  }
}

void main() {
  if (uAA == 2) {
    vec2 off = uPixelSize * 0.25;
    vec3 c1 = sampleColor(uv - off);
    vec3 c2 = sampleColor(uv + off);
    outputColor = vec4((c1 + c2) * 0.5, 1.0);
  } else if (uAA == 4) {
    vec2 p = uPixelSize;
    vec3 c1 = sampleColor(uv + vec2(-0.375, -0.125) * p);
    vec3 c2 = sampleColor(uv + vec2( 0.125, -0.375) * p);
    vec3 c3 = sampleColor(uv + vec2( 0.375,  0.125) * p);
    vec3 c4 = sampleColor(uv + vec2(-0.125,  0.375) * p);
    outputColor = vec4((c1 + c2 + c3 + c4) * 0.25, 1.0);
  } else {
    outputColor = vec4(sampleColor(uv), 1.0);
  }
}
`;

function shader(type, source) {
  const compiled = gl.createShader(type); gl.shaderSource(compiled, source); gl.compileShader(compiled);
  if (!gl.getShaderParameter(compiled, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(compiled));
  return compiled;
}

function createRenderer() {
  if (!gl) throw new Error('WebGL 2 is unavailable');
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource)); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  return { program, uniforms: Object.fromEntries(['uScaleMantissa','uScaleExp','uAspect','uIterations','uType','uPalette','uCycle','uSmooth','uJulia','uOrbitTex','uCentre','uRefUV','uAA','uPixelSize'].map(name => [name, gl.getUniformLocation(program, name)])) };
}

let renderer;
try { renderer = createRenderer(); } catch (error) {
  document.body.innerHTML = '<main class="webgl-error"><h1>WebGL 2 is required</h1><p>This Fractal Viewer uses your GPU for real-time rendering. Please open it in a current browser with hardware acceleration enabled.</p></main>';
  throw error;
}

let orbitTexture = null;
function updateOrbitTexture(gl, renderer, orbitData) {
  if (!orbitTexture) {
    orbitTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, orbitTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  } else {
    gl.bindTexture(gl.TEXTURE_2D, orbitTexture);
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, orbitData.length / 2, 1, 0, gl.RG, gl.FLOAT, orbitData);
}

const BAILOUT_BIGINT = 256n << BF.PREC;
const TWO_PREC = BF.PREC - 1n;
const PREC_NUM = Math.pow(2, Number(BF.PREC));

const mlModel = {
  enabled: true,
  samples: 0,
  biasX: 0.0,
  biasY: 0.0,
  biasMagnitude: 0.0,
  targetDensity: 0.70,
  velocityWeight: 1.0,
  confidence: 0,
  
  updateFromPan(deltaX, deltaY, dtMs) {
    if (!this.enabled || dtMs <= 0) return;
    const speed = Math.hypot(deltaX, deltaY) / (dtMs || 16);
    if (speed < 0.01) return;
    
    this.samples++;
    const lr = Math.min(0.22, 0.06 + 1.0 / (this.samples + 8));
    
    const len = Math.hypot(deltaX, deltaY);
    // User drags in screen coords; camera pans in opposite direction
    const dirX = -deltaX / len;
    const dirY = deltaY / len;
    
    this.biasX = (1.0 - lr) * this.biasX + lr * dirX;
    this.biasY = (1.0 - lr) * this.biasY + lr * dirY;
    this.biasMagnitude = Math.min(1.0, Math.hypot(this.biasX, this.biasY));
    this.velocityWeight = clamp((1.0 - lr) * this.velocityWeight + lr * (speed * 0.9), 0.5, 2.5);
    this.confidence = Math.min(99, Math.round(this.biasMagnitude * Math.min(1.0, this.samples / 12) * 100));
  },
  
  scoreCandidate(dx, dy, rawScore, iter, maxIter) {
    if (!this.enabled || this.samples < 2) return rawScore;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-4) return rawScore;
    
    const dirX = dx / dist;
    const dirY = dy / dist;
    
    // Directional alignment score
    const dot = dirX * this.biasX + dirY * this.biasY;
    const dirBoost = 1.0 + 0.6 * dot * (this.confidence / 100);
    
    // Filament density alignment score
    const iterRatio = iter / maxIter;
    const densityMatch = 1.0 - Math.abs(iterRatio - this.targetDensity) * 0.45;
    
    return rawScore * dirBoost * Math.max(0.2, densityMatch);
  }
};

function generateOrbit(maxIter = state.iterations) {
  const aspect = canvas.width / canvas.height;
  
  const stateXv = state.x.v;
  const stateYv = state.y.v;
  const scaleV = state.scale.v;
  const isJulia = state.type === 'julia';
  const fractalType = state.type;
  
  const juliaRev = isJulia ? new BF(state.juliaRe).v : 0n;
  const juliaImv = isJulia ? new BF(state.juliaIm).v : 0n;
  
  let bestCxV = stateXv, bestCyV = stateYv;
  let bestIter = -1;
  let bestUV = [0.5, 0.5];
  
  let bestEdgeRelX = 0, bestEdgeRelY = 0;
  let maxEdgeScore = -1;

  const scaleNum = Math.max(1e-75, state.scale.toNumber());
  const zoomFactor = 3.2 / scaleNum;
  const zoomExp = Math.max(0, Math.log10(zoomFactor));

  // Automatically adjust edge tracking parameters based on current zoom region
  const baseDensity = state.animDensity || 7;
  const adaptiveDensity = Math.min(11, Math.max(baseDensity, Math.floor(baseDensity + zoomExp * 0.15)));
  const density = adaptiveDensity % 2 === 0 ? adaptiveDensity + 1 : adaptiveDensity;

  const baseRadius = state.animRadius || 0.25;
  const radius = clamp(baseRadius * (1.0 - Math.min(0.45, zoomExp * 0.012)), 0.12, 0.50);

  const baseSens = (state.animSensitivity !== undefined ? state.animSensitivity : 70) / 100;
  const adaptiveSens = clamp(baseSens + zoomExp * 0.008, 0.1, 1.0);
  const sensExp = 0.5 + adaptiveSens * 1.6;

  const stepSize = density > 1 ? (radius * 2) / (density - 1) : 0;

  for (let sY = 0; sY < density; sY++) {
    const dy = -radius + sY * stepSize;
    // Lossless high-precision BigInt offset calculation (12 decimal places)
    const dyScaledV = (scaleV * BigInt(Math.round(dy * 1000000000000))) / 1000000000000n;
    const testCyV = stateYv + dyScaledV;

    for (let sX = 0; sX < density; sX++) {
      const dx = -radius + sX * stepSize;
      const dxScaledV = (scaleV * BigInt(Math.round(dx * aspect * 1000000000000))) / 1000000000000n;
      const testCxV = stateXv + dxScaledV;
      
      let av = isJulia ? testCxV : 0n;
      let bv = isJulia ? testCyV : 0n;
      const cxV = isJulia ? juliaRev : testCxV;
      const cyV = isJulia ? juliaImv : testCyV;
      
      let iter = 0;
      for (; iter < maxIter; iter++) {
        const a2 = (av * av) >> BF.PREC;
        const b2 = (bv * bv) >> BF.PREC;
        if (a2 + b2 > BAILOUT_BIGINT) break;
        const ab2 = (av * bv) >> TWO_PREC;

        if (fractalType === 'mandelbrot' || fractalType === 'julia') {
          av = a2 - b2 + cxV;
          bv = ab2 + cyV;
        } else if (fractalType === 'ship') {
          const absA = av < 0n ? -av : av;
          const absB = bv < 0n ? -bv : bv;
          av = a2 - b2 + cxV;
          bv = ((absA * absB) >> TWO_PREC) + cyV;
        } else if (fractalType === 'tricorn') {
          av = a2 - b2 + cxV;
          bv = -ab2 + cyV;
        } else if (fractalType === 'celtic') {
          const diff = a2 - b2;
          av = (diff < 0n ? -diff : diff) + cxV;
          bv = ab2 + cyV;
        } else if (fractalType === 'perpendicular') {
          const absA = av < 0n ? -av : av;
          av = a2 - b2 + cxV;
          bv = ((absA * bv) >> TWO_PREC) + cyV;
        }
      }
      
      if (iter > bestIter) {
        bestIter = iter;
        bestCxV = testCxV;
        bestCyV = testCyV;
        bestUV = [0.5 + dx, 0.5 + dy];
      }
      
      // High-precision filament detection calibrated with ML guidance
      if (iter < maxIter && iter > 8) {
        const distSq = (dx * dx + dy * dy) / (radius * radius * 2.0);
        const centerWeight = Math.max(0.05, 1.0 - distSq);
        const edgeScore = Math.pow(iter, sensExp) * centerWeight;
        const finalScore = mlModel.scoreCandidate(dx, dy, edgeScore, iter, maxIter);
        if (finalScore > maxEdgeScore) {
          maxEdgeScore = finalScore;
          bestEdgeRelX = dx;
          bestEdgeRelY = dy;
        }
      }
    }
  }

  if (maxEdgeScore > 0) {
    state.targetRelX = bestEdgeRelX;
    state.targetRelY = bestEdgeRelY;
  } else {
    state.targetRelX = 0;
    state.targetRelY = 0;
  }

  state.refUV = bestUV;
  state.refX = new BF(bestCxV);
  state.refY = new BF(bestCyV);

  const orbitData = new Float32Array(maxIter * 2);
  let av = isJulia ? bestCxV : 0n;
  let bv = isJulia ? bestCyV : 0n;
  const cxV = isJulia ? juliaRev : bestCxV;
  const cyV = isJulia ? juliaImv : bestCyV;

  let escaped = false;
  for (let i = 0; i < maxIter; i++) {
    if (escaped) {
      orbitData[i * 2] = 10000.0;
      orbitData[i * 2 + 1] = 10000.0;
      continue;
    }
    
    orbitData[i * 2] = Number(av) / PREC_NUM;
    orbitData[i * 2 + 1] = Number(bv) / PREC_NUM;
    
    const a2 = (av * av) >> BF.PREC;
    const b2 = (bv * bv) >> BF.PREC;
    if (a2 + b2 > BAILOUT_BIGINT) {
      escaped = true;
      continue;
    }
    const ab2 = (av * bv) >> TWO_PREC;

    if (fractalType === 'mandelbrot' || fractalType === 'julia') {
      av = a2 - b2 + cxV;
      bv = ab2 + cyV;
    } else if (fractalType === 'ship') {
      const absA = av < 0n ? -av : av;
      const absB = bv < 0n ? -bv : bv;
      av = a2 - b2 + cxV;
      bv = ((absA * absB) >> TWO_PREC) + cyV;
    } else if (fractalType === 'tricorn') {
      av = a2 - b2 + cxV;
      bv = -ab2 + cyV;
    } else if (fractalType === 'celtic') {
      const diff = a2 - b2;
      av = (diff < 0n ? -diff : diff) + cxV;
      bv = ab2 + cyV;
    } else if (fractalType === 'perpendicular') {
      const absA = av < 0n ? -av : av;
      av = a2 - b2 + cxV;
      bv = ((absA * bv) >> TWO_PREC) + cyV;
    }
  }
  return orbitData;
}

const maxRenderSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
const lowPowerHost = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);

function renderSize() {
  if (state.resolution === 'custom') return { width: state.customWidth, height: state.customHeight };
  const factor = state.resolution === 'auto' ? 1 : Number(state.resolution);
  const deviceScale = Math.min(window.devicePixelRatio || 1, 2) * factor;
  return { width: Math.floor(innerWidth * deviceScale), height: Math.floor(innerHeight * deviceScale) };
}

function updateResolutionWarning(width, height) {
  const warning = $('resolution-warning');
  const pixels = width * height;
  let message = '';
  if (width > maxRenderSize || height > maxRenderSize) message = `This GPU supports up to ${maxRenderSize}px on either side. Reduce the custom size.`;
  else if ((lowPowerHost || state.slowFrameScore >= 2) && pixels > 1500000) message = 'This device may be too slow for this resolution. Use Performance or Balanced if interaction stutters.';
  else if (pixels > 6000000) message = 'This is a demanding render size and may reduce responsiveness on some devices.';
  warning.hidden = !message;
  warning.textContent = message;
}

function resize() {
  const size = renderSize();
  canvas.width = Math.max(1, Math.min(maxRenderSize, size.width)); canvas.height = Math.max(1, Math.min(maxRenderSize, size.height));
  canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
  $('label-resolution').textContent = `${canvas.width} × ${canvas.height}`;
  updateResolutionWarning(size.width, size.height);
  gl.viewport(0, 0, canvas.width, canvas.height); scheduleRender();
}

function scheduleRender() { if (!state.renderQueued) { state.renderQueued = true; requestAnimationFrame(() => { state.renderQueued = false; render(); }); } }
function render() {
  const renderStarted = performance.now();
  const u = renderer.uniforms; gl.useProgram(renderer.program);

  const scaleNum = Math.max(1e-75, state.scale.toNumber());
  const zoomFactor = 3.2 / scaleNum;
  const zoomExp = Math.max(0, Math.log10(zoomFactor));
  const effectiveIterations = state.dynamicIter !== false
    ? Math.min(3600, Math.round(state.iterations + zoomExp * 35))
    : state.iterations;

  updateOrbitTexture(gl, renderer, generateOrbit(effectiveIterations));
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, orbitTexture);
  gl.uniform1i(u.uOrbitTex, 0);

  gl.uniform2f(u.uCentre, (state.refX || state.x).toNumber(), (state.refY || state.y).toNumber());
  if (state.refUV) gl.uniform2f(u.uRefUV, state.refUV[0], state.refUV[1]);
  const scaleDbl = Math.max(1e-75, state.scale.toNumber());
  const exp10 = Math.floor(Math.log10(scaleDbl));
  const mantissa10 = scaleDbl / Math.pow(10, exp10);

  gl.uniform1f(u.uScaleMantissa, mantissa10);
  gl.uniform1i(u.uScaleExp, exp10);
  gl.uniform1f(u.uAspect, canvas.width / canvas.height);
  gl.uniform1i(u.uIterations, effectiveIterations);
  gl.uniform1i(u.uType, { mandelbrot: 0, julia: 1, ship: 2, tricorn: 3, celtic: 4, perpendicular: 5 }[state.type]);
  gl.uniform1i(u.uPalette, { ocean: 0, ember: 1, neon: 2, mono: 3 }[state.palette]);
  gl.uniform1f(u.uCycle, state.cycle);
  gl.uniform1i(u.uSmooth, state.smooth ? 1 : 0);
  gl.uniform1i(u.uAA, state.aa !== undefined ? state.aa : 2);
  gl.uniform2f(u.uPixelSize, 1.0 / canvas.width, 1.0 / canvas.height);
  gl.uniform2f(u.uJulia, state.juliaRe, state.juliaIm);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  const zoomText = zoomFactor > 1e6 ? `${zoomFactor.toExponential(2)}x` : `${zoomFactor.toFixed(2)}x`;
  $('telemetry-formula').textContent = { mandelbrot: 'Mandelbrot', julia: 'Julia', ship: 'Burning Ship', tricorn: 'Tricorn', celtic: 'Celtic', perpendicular: 'Perpendicular' }[state.type];
  $('telemetry-zoom').textContent = zoomText;
  $('telemetry-centre').textContent = `${state.x.toNumber().toFixed(6)}, ${state.y.toNumber().toFixed(6)}`;
  $('telemetry-render').textContent = `GPU · ${canvas.width} × ${canvas.height}`;
  const elML = $('telemetry-ml');
  if (elML) {
    if (!mlModel.enabled) {
      elML.textContent = 'Disabled';
    } else if (mlModel.samples === 0) {
      elML.textContent = 'Active (Listening)';
    } else {
      const deg = Math.round((Math.atan2(mlModel.biasY, mlModel.biasX) * 180 / Math.PI + 360) % 360);
      elML.textContent = `${mlModel.confidence}% conf · ${deg}° bias`;
    }
  }
  requestAnimationFrame(() => { state.slowFrameScore = clamp(state.slowFrameScore + (performance.now() - renderStarted > 45 ? 1 : -1), 0, 3); updateResolutionWarning(canvas.width, canvas.height); });
}

function pointAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect(), aspect = canvas.width / canvas.height;
  const dx = ((clientX - rect.left) / rect.width - .5) * aspect;
  const dy = (.5 - (clientY - rect.top) / rect.height);
  return {
    x: state.x.add(state.scale.mul(new BF(dx))),
    y: state.y.add(state.scale.mul(new BF(dy)))
  };
}

function resetView() {
  state.homing = false;
  Object.assign(state, defaults[state.type]);
  state.targetRelX = 0; state.targetRelY = 0;
  state.smoothRelX = 0; state.smoothRelY = 0;
  state.velRelX = 0; state.velRelY = 0;
  scheduleRender();
}
function setAutoZoom(enabled) {
  state.autoZoom = enabled;
  if (!enabled) {
    state.targetRelX = 0; state.targetRelY = 0;
    state.smoothRelX = 0; state.smoothRelY = 0;
    state.velRelX = 0; state.velRelY = 0;
  }
  $('btn-auto-zoom').classList.toggle('active', enabled);
  $('btn-auto-zoom').innerHTML = `<i class="bi bi-${enabled ? 'pause' : 'play'}-fill"></i>`;
}
function startHoming() {
  setAutoZoom(false);
  state.homing = true;
  state.homeTargetType = 'mandelbrot';
  state.homeTargetX = defaults['mandelbrot'].x;
  state.homeTargetY = defaults['mandelbrot'].y;
  state.homeTargetScale = defaults['mandelbrot'].scale;
  state.homeStartX = state.x;
  state.homeStartY = state.y;
  state.homeStartScale = state.scale;
  state.homeStartLog = Math.log10(Math.max(1e-75, state.scale.toNumber()));
  state.homeTargetLog = Math.log10(state.homeTargetScale.toNumber());
  state.targetRelX = 0; state.targetRelY = 0;
  state.smoothRelX = 0; state.smoothRelY = 0;
  state.velRelX = 0; state.velRelY = 0;
}
function bindStepper(prev, next, select) { const control = $(select), shift = amount => { control.selectedIndex = (control.selectedIndex + amount + control.options.length) % control.options.length; control.dispatchEvent(new Event('change')); }; $(prev).addEventListener('click', () => shift(-1)); $(next).addEventListener('click', () => shift(1)); }

function initControls() {
  $('select-fractal').addEventListener('change', event => { state.type = event.target.value; resetView(); }); bindStepper('btn-fractal-prev', 'btn-fractal-next', 'select-fractal');
  document.querySelectorAll('#palette-control .seg-btn').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('#palette-control .seg-btn').forEach(item => item.classList.toggle('active', item === button)); state.palette = button.dataset.palette; scheduleRender(); }));
  $('select-resolution').addEventListener('change', event => { state.resolution = event.target.value; $('custom-resolution').hidden = state.resolution !== 'custom'; if (state.resolution !== 'custom') resize(); else updateResolutionWarning(state.customWidth, state.customHeight); });
  $('btn-apply-resolution').addEventListener('click', () => { state.customWidth = clamp(Math.round(Number($('input-resolution-width').value) || 1920), 320, maxRenderSize); state.customHeight = clamp(Math.round(Number($('input-resolution-height').value) || 1080), 180, maxRenderSize); $('input-resolution-width').value = state.customWidth; $('input-resolution-height').value = state.customHeight; resize(); });
  ['input-resolution-width', 'input-resolution-height'].forEach(id => $(id).addEventListener('input', () => updateResolutionWarning(Number($('input-resolution-width').value), Number($('input-resolution-height').value))));
  [['slider-iterations','label-iterations','iterations', v => v],
   ['slider-cycle','label-cycle','cycle', v => `${(v / 100).toFixed(1)}x`],
   ['slider-julia-real','label-julia-real','juliaRe', v => Number(v).toFixed(3)],
   ['slider-julia-imag','label-julia-imag','juliaIm', v => Number(v).toFixed(3)],
   ['slider-anim-speed','label-anim-speed','animSpeed', v => `${Number(v).toFixed(1)}x`],
   ['slider-anim-smoothing','label-anim-smoothing','animSmoothing', v => `${Number(v).toFixed(2)}s`],
   ['slider-anim-tracking','label-anim-tracking','animTracking', v => {
     const n = Number(v);
     return n === 0 ? 'Centered (0%)' : (n <= 40 ? `Slight (${n}%)` : (n <= 70 ? `Balanced (${n}%)` : `Aggressive (${n}%)`));
   }],
   ['slider-anim-radius','label-anim-radius','animRadius', v => `±${Math.round(Number(v) * 100)}%`],
   ['slider-anim-sensitivity','label-anim-sensitivity','animSensitivity', v => `${Math.round(Number(v))}%`]
  ].forEach(([input,label,key,format]) => {
    const el = $(input);
    if (el) el.addEventListener('input', event => {
      const value = Number(event.target.value);
      state[key] = key === 'cycle' ? value / 100 : value;
      const lbl = $(label);
      if (lbl) lbl.textContent = format(value);
      scheduleRender();
    });
  });

  const selectEasing = $('select-anim-easing');
  if (selectEasing) selectEasing.addEventListener('change', event => { state.animEasing = event.target.value; });

  const selectDensity = $('select-anim-density');
  if (selectDensity) selectDensity.addEventListener('change', event => {
    state.animDensity = Number(event.target.value);
    scheduleRender();
  });

  const toggleDynamic = $('toggle-dynamic-iter');
  if (toggleDynamic) toggleDynamic.addEventListener('change', event => { state.dynamicIter = event.target.checked; scheduleRender(); });

  const toggleML = $('toggle-ml-guidance');
  if (toggleML) toggleML.addEventListener('change', event => { mlModel.enabled = event.target.checked; scheduleRender(); });

  $('toggle-smooth').addEventListener('change', event => { state.smooth = event.target.checked; scheduleRender(); });
  const selectAA = $('select-aa');
  if (selectAA) selectAA.addEventListener('change', event => {
    state.aa = Number(event.target.value);
    scheduleRender();
  });
  $('btn-reset').addEventListener('click', resetView);
  $('btn-home').addEventListener('click', startHoming);
  $('btn-save').addEventListener('click', () => { const link = document.createElement('a'); link.download = `fractal-${state.type}.png`; link.href = canvas.toDataURL('image/png'); link.click(); });
  $('btn-auto-zoom').addEventListener('click', () => setAutoZoom(!state.autoZoom));
  $('btn-telemetry-toggle').addEventListener('click', () => { $('telemetry-hud').classList.toggle('hidden'); $('btn-telemetry-toggle').classList.toggle('active', !$('telemetry-hud').classList.contains('hidden')); });
  $('btn-info').addEventListener('click', () => { $('info-modal').hidden = false; });
  $('btn-close-info').addEventListener('click', () => { $('info-modal').hidden = true; });
}

let lastPanTime = performance.now();
function initInput() {
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    state.homing = false;
    const point = pointAt(event.clientX, event.clientY);
    const zoom = event.deltaY < 0 ? 0.82 : 1.22;
    let ns = state.scale.mul(new BF(zoom));
    if (ns.toNumber() < 1e-75) ns = new BF(1e-75);
    if (ns.toNumber() > 10.0) ns = new BF(10.0);
    state.scale = ns;
    state.x = point.x.add(state.x.sub(point.x).mul(new BF(zoom)));
    state.y = point.y.add(state.y.sub(point.y).mul(new BF(zoom)));
    setAutoZoom(false);
    scheduleRender();
  }, { passive: false });
  canvas.addEventListener('pointerdown', event => {
    state.homing = false;
    state.dragging = true;
    state.moved = false;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    lastPanTime = performance.now();
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!state.dragging) return;
    state.homing = false;
    const now = performance.now();
    const dt = now - lastPanTime;
    lastPanTime = now;

    const deltaX = event.clientX - state.lastX, deltaY = event.clientY - state.lastY, rect = canvas.getBoundingClientRect(), aspect = canvas.width / canvas.height;
    if (Math.hypot(deltaX, deltaY) > 2) state.moved = true;
    
    // Feed pan physics into ML model for online adaptation
    mlModel.updateFromPan(deltaX, deltaY, dt);

    state.x = state.x.sub(state.scale.mul(new BF(deltaX / rect.width * aspect)));
    state.y = state.y.add(state.scale.mul(new BF(deltaY / rect.height)));
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    scheduleRender();
  });
  canvas.addEventListener('pointerup', event => {
    state.dragging = false;
    if (state.type === 'julia' && !state.moved) {
      const point = pointAt(event.clientX, event.clientY);
      state.juliaRe = clamp(point.x.toNumber(), -1, 1);
      state.juliaIm = clamp(point.y.toNumber(), -1, 1);
      $('slider-julia-real').value = state.juliaRe;
      $('slider-julia-imag').value = state.juliaIm;
      $('label-julia-real').textContent = state.juliaRe.toFixed(3);
      $('label-julia-imag').textContent = state.juliaIm.toFixed(3);
      scheduleRender();
    }
  });
}

function initSidebar() {
  if (typeof Sidebar !== 'undefined') {
    new Sidebar({
      sidebarSelector: '#left-hud',
      collapseTriggerSelector: '#btn-collapse-hud'
    });
  }
}
let fpsFrames = 0;
let fpsLastTime = performance.now();
function updateFPS() {
  fpsFrames++;
  const now = performance.now();
  const elapsed = now - fpsLastTime;
  if (elapsed >= 500) {
    const currentFPS = Math.round((fpsFrames * 1000) / elapsed);
    fpsFrames = 0;
    fpsLastTime = now;
    const elFPS = $('telemetry-fps');
    if (elFPS) elFPS.textContent = `${currentFPS} FPS`;
  }
}

function animate() {
  updateFPS();
  if (state.homing && !state.dragging) {
    const currentScaleNum = Math.max(1e-75, state.scale.toNumber());
    const targetScaleNum = state.homeTargetScale.toNumber();
    const logDist = Math.max(0, Math.log10(targetScaleNum / currentScaleNum));
    
    const zoomMultiplier = 1.08 + Math.min(0.38, logDist * 0.022);
    let ns = state.scale.mul(new BF(zoomMultiplier));
    
    const startX = state.homeStartX || state.x;
    const startY = state.homeStartY || state.y;
    const dxBF = state.homeTargetX.sub(startX);
    const dyBF = state.homeTargetY.sub(startY);
    
    // Macro progress kicks in only once scale reaches visible macroscopic range (> 0.02)
    // Holds the exact micro center during deep unwinding!
    const macroProgress = clamp((currentScaleNum - 0.02) / (targetScaleNum - 0.02), 0.0, 1.0);
    const smoothT = macroProgress * macroProgress * (3.0 - 2.0 * macroProgress);
    
    // Curved arc outward away from center (y=0) to circumvent the black cardioid
    const startYNum = startY.toNumber();
    const bowSign = startYNum >= 0 ? 1.0 : -1.0;
    const arcHeight = Math.sin(smoothT * Math.PI) * 0.55 * bowSign;
    
    state.x = startX.add(dxBF.mul(new BF(smoothT)));
    state.y = startY.add(dyBF.mul(new BF(smoothT))).add(new BF(arcHeight));
    
    if (ns.toNumber() >= targetScaleNum * 0.98) {
      state.scale = state.homeTargetScale;
      state.x = state.homeTargetX;
      state.y = state.homeTargetY;
      state.homing = false;
      if (state.type !== state.homeTargetType) {
        state.type = state.homeTargetType;
        $('select-fractal').value = state.homeTargetType;
      }
    } else {
      state.scale = ns;
    }
    scheduleRender();
  } else if (state.autoZoom) {
    const speed = (state.animSpeed || 1.0) * (mlModel.enabled ? mlModel.velocityWeight : 1.0);
    const zoomRate = 1.0 - 0.007 * speed;
    let ns = state.scale.mul(new BF(zoomRate));
    if (ns.toNumber() < 1e-75) ns = new BF(1e-75);
    state.scale = ns;
    
    // Only apply autopilot panning when user is not manually dragging
    if (!state.dragging) {
      const trackingWeight = (state.animTracking !== undefined ? state.animTracking : 50) / 100;
      const targetX = (state.targetRelX || 0) * trackingWeight;
      const targetY = (state.targetRelY || 0) * trackingWeight;
      
      const duration = Math.max(0.05, state.animSmoothing || 0.8);
      const alpha = clamp(1.0 - Math.exp(-1.0 / (60.0 * duration)), 0.01, 0.99);
      const easing = state.animEasing || 'exponential';
      
      if (easing === 'cubic') {
        const diffX = targetX - (state.smoothRelX || 0);
        const diffY = targetY - (state.smoothRelY || 0);
        state.smoothRelX = (state.smoothRelX || 0) + Math.sign(diffX) * Math.pow(Math.abs(diffX), 0.7) * alpha * 1.5;
        state.smoothRelY = (state.smoothRelY || 0) + Math.sign(diffY) * Math.pow(Math.abs(diffY), 0.7) * alpha * 1.5;
      } else if (easing === 'spring') {
        const k = 0.14 / duration;
        const damping = 0.84;
        state.velRelX = ((state.velRelX || 0) + (targetX - (state.smoothRelX || 0)) * k) * damping;
        state.velRelY = ((state.velRelY || 0) + (targetY - (state.smoothRelY || 0)) * k) * damping;
        state.smoothRelX = (state.smoothRelX || 0) + state.velRelX;
        state.smoothRelY = (state.smoothRelY || 0) + state.velRelY;
      } else if (easing === 'linear') {
        const maxStep = 0.02 * (1.0 / duration);
        const diffX = targetX - (state.smoothRelX || 0);
        const diffY = targetY - (state.smoothRelY || 0);
        state.smoothRelX = (state.smoothRelX || 0) + clamp(diffX, -maxStep, maxStep);
        state.smoothRelY = (state.smoothRelY || 0) + clamp(diffY, -maxStep, maxStep);
      } else {
        // Exponential low-pass filter
        state.smoothRelX = (state.smoothRelX || 0) * (1.0 - alpha) + targetX * alpha;
        state.smoothRelY = (state.smoothRelY || 0) * (1.0 - alpha) + targetY * alpha;
      }
      
      if (Math.abs(state.smoothRelX) > 1e-5 || Math.abs(state.smoothRelY) > 1e-5) {
        const aspect = canvas.width / canvas.height;
        const panStepX = state.scale.mul(new BF(state.smoothRelX * aspect * 0.015));
        const panStepY = state.scale.mul(new BF(state.smoothRelY * 0.015));
        state.x = state.x.add(panStepX);
        state.y = state.y.add(panStepY);
      }
    } else {
      // While dragging, damp velocity/smoothing so it doesn't fight the user's manual drag
      state.smoothRelX = 0;
      state.smoothRelY = 0;
      state.velRelX = 0;
      state.velRelY = 0;
    }
    
    scheduleRender();
  }
  requestAnimationFrame(animate);
}

addEventListener('resize', resize); initControls(); initInput(); initSidebar(); resize(); animate();
