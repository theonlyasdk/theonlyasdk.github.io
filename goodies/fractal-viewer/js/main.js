class BF {
  static PREC = 120n;
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
  juliaRe: -.745,
  juliaIm: .113,
  resolution: 'auto',
  customWidth: 1920,
  customHeight: 1080,
  autoZoom: false,
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
uniform float uScale, uAspect, uCycle;
uniform int uIterations, uType, uPalette; uniform bool uSmooth;
uniform sampler2D uOrbitTex;
uniform vec2 uJulia;
uniform vec2 uCentre;
uniform vec2 uRefUV;

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

void main() {
  vec2 dC = vec2((uv.x - uRefUV.x) * uAspect, uv.y - uRefUV.y) * uScale;
  vec2 dZ = vec2(0.0);
  if (uType == 1) {
    dZ = dC;
    dC = vec2(0.0);
  }
  
  float radius2 = 0.0;
  int iteration = 0;
  vec2 Z = vec2(0.0);
  bool perturb = true;

  for (int i = 0; i < 2000; i++) {
    if (i >= uIterations) break;
    
    vec2 A = texelFetch(uOrbitTex, ivec2(i, 0), 0).rg;
    if (A.x > 9999.0) perturb = false;
    
    if (perturb) {
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
    } else {
      vec2 C_abs = uType == 1 ? uJulia : (uCentre + dC);
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
    
    radius2 = Z.x * Z.x + Z.y * Z.y;
    if (radius2 > 256.0) { iteration = i; break; }
  }
  
  if (iteration == 0 && radius2 <= 256.0) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float smoothIter = float(iteration);
    if (uSmooth) smoothIter += 1.0 - log(log(radius2)) / log(2.0);
    outputColor = vec4(palette(smoothIter / float(uIterations) + uCycle), 1.0);
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
  return { program, uniforms: Object.fromEntries(['uScale','uAspect','uIterations','uType','uPalette','uCycle','uSmooth','uJulia','uOrbitTex','uCentre','uRefUV'].map(name => [name, gl.getUniformLocation(program, name)])) };
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

function generateOrbit() {
  const maxIter = state.iterations;
  const aspect = canvas.width / canvas.height;
  
  let bestCx = state.x, bestCy = state.y;
  let bestIter = -1;
  let bestUV = [0.5, 0.5];

  for (let dy = -0.5; dy <= 0.5; dy += 0.5) {
    for (let dx = -0.5; dx <= 0.5; dx += 0.5) {
      const testCx = state.x.add(state.scale.mul(new BF(dx * aspect)));
      const testCy = state.y.add(state.scale.mul(new BF(dy)));
      
      let A = new BF(0), B = new BF(0);
      if (state.type === 'julia') { A = testCx; B = testCy; }
      const Cx = state.type === 'julia' ? new BF(state.juliaRe) : testCx;
      const Cy = state.type === 'julia' ? new BF(state.juliaIm) : testCy;
      
      let iter = 0;
      for (; iter < maxIter; iter++) {
        const A2 = A.mul(A);
        const B2 = B.mul(B);
        if (A2.add(B2).toNumber() > 256) break;
        const AB = A.mul(B);

        if (state.type === 'mandelbrot' || state.type === 'julia') {
          A = A2.sub(B2).add(Cx); B = AB.add(AB).add(Cy);
        } else if (state.type === 'ship') {
          const absA = A.abs(), absB = B.abs();
          A = A2.sub(B2).add(Cx); B = absA.mul(absB).add(absA.mul(absB)).add(Cy);
        } else if (state.type === 'tricorn') {
          A = A2.sub(B2).add(Cx); B = AB.add(AB).mul(new BF(-1)).add(Cy);
        } else if (state.type === 'celtic') {
          A = A2.sub(B2).abs().add(Cx); B = AB.add(AB).add(Cy);
        } else if (state.type === 'perpendicular') {
          A = A2.sub(B2).add(Cx); B = A.abs().mul(B).add(A.abs().mul(B)).add(Cy);
        }
      }
      
      if (iter > bestIter) {
        bestIter = iter;
        bestCx = testCx;
        bestCy = testCy;
        bestUV = [0.5 + dx, 0.5 + dy];
      }
    }
  }

  state.refUV = bestUV;
  state.refX = bestCx;
  state.refY = bestCy;
  const orbitData = new Float32Array(maxIter * 2);
  let A = new BF(0), B = new BF(0);
  const Cx = state.type === 'julia' ? new BF(state.juliaRe) : bestCx;
  const Cy = state.type === 'julia' ? new BF(state.juliaIm) : bestCy;
  if (state.type === 'julia') { A = bestCx; B = bestCy; }

  let escaped = false;
  for (let i = 0; i < maxIter; i++) {
    if (escaped) {
      orbitData[i * 2] = 10000.0;
      orbitData[i * 2 + 1] = 10000.0;
      continue;
    }
    
    orbitData[i * 2] = A.toNumber();
    orbitData[i * 2 + 1] = B.toNumber();
    
    const A2 = A.mul(A);
    const B2 = B.mul(B);
    if (A2.add(B2).toNumber() > 256) {
      escaped = true;
      continue;
    }
    const AB = A.mul(B);

    if (state.type === 'mandelbrot' || state.type === 'julia') {
      A = A2.sub(B2).add(Cx); B = AB.add(AB).add(Cy);
    } else if (state.type === 'ship') {
      const absA = A.abs(), absB = B.abs();
      A = A2.sub(B2).add(Cx); B = absA.mul(absB).add(absA.mul(absB)).add(Cy);
    } else if (state.type === 'tricorn') {
      A = A2.sub(B2).add(Cx); B = AB.add(AB).mul(new BF(-1)).add(Cy);
    } else if (state.type === 'celtic') {
      A = A2.sub(B2).abs().add(Cx); B = AB.add(AB).add(Cy);
    } else if (state.type === 'perpendicular') {
      A = A2.sub(B2).add(Cx); B = A.abs().mul(B).add(A.abs().mul(B)).add(Cy);
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

  updateOrbitTexture(gl, renderer, generateOrbit());
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, orbitTexture);
  gl.uniform1i(u.uOrbitTex, 0);

  gl.uniform2f(u.uCentre, (state.refX || state.x).toNumber(), (state.refY || state.y).toNumber());
  if (state.refUV) gl.uniform2f(u.uRefUV, state.refUV[0], state.refUV[1]);
  gl.uniform1f(u.uScale, state.scale.toNumber());
  gl.uniform1f(u.uAspect, canvas.width / canvas.height);
  gl.uniform1i(u.uIterations, state.iterations);
  gl.uniform1i(u.uType, { mandelbrot: 0, julia: 1, ship: 2, tricorn: 3, celtic: 4, perpendicular: 5 }[state.type]);
  gl.uniform1i(u.uPalette, { ocean: 0, ember: 1, neon: 2, mono: 3 }[state.palette]);
  gl.uniform1f(u.uCycle, state.cycle);
  gl.uniform1i(u.uSmooth, state.smooth ? 1 : 0);
  gl.uniform2f(u.uJulia, state.juliaRe, state.juliaIm);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  const zoomFactor = 3.2 / state.scale.toNumber();
  const zoomText = zoomFactor > 1e6 ? `${zoomFactor.toExponential(2)}x` : `${zoomFactor.toFixed(2)}x`;
  $('telemetry-formula').textContent = { mandelbrot: 'Mandelbrot', julia: 'Julia', ship: 'Burning Ship', tricorn: 'Tricorn', celtic: 'Celtic', perpendicular: 'Perpendicular' }[state.type];
  $('telemetry-zoom').textContent = zoomText;
  $('telemetry-centre').textContent = `${state.x.toNumber().toFixed(6)}, ${state.y.toNumber().toFixed(6)}`;
  $('telemetry-render').textContent = `GPU · ${canvas.width} × ${canvas.height}`;
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

function resetView() { Object.assign(state, defaults[state.type]); scheduleRender(); }
function setAutoZoom(enabled) { state.autoZoom = enabled; $('btn-auto-zoom').classList.toggle('active', enabled); $('btn-auto-zoom').innerHTML = `<i class="bi bi-${enabled ? 'pause' : 'play'}-fill"></i>`; }
function bindStepper(prev, next, select) { const control = $(select), shift = amount => { control.selectedIndex = (control.selectedIndex + amount + control.options.length) % control.options.length; control.dispatchEvent(new Event('change')); }; $(prev).addEventListener('click', () => shift(-1)); $(next).addEventListener('click', () => shift(1)); }

function initControls() {
  $('select-fractal').addEventListener('change', event => { state.type = event.target.value; resetView(); }); bindStepper('btn-fractal-prev', 'btn-fractal-next', 'select-fractal');
  document.querySelectorAll('#palette-control .seg-btn').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('#palette-control .seg-btn').forEach(item => item.classList.toggle('active', item === button)); state.palette = button.dataset.palette; scheduleRender(); }));
  $('select-resolution').addEventListener('change', event => { state.resolution = event.target.value; $('custom-resolution').hidden = state.resolution !== 'custom'; if (state.resolution !== 'custom') resize(); else updateResolutionWarning(state.customWidth, state.customHeight); });
  $('btn-apply-resolution').addEventListener('click', () => { state.customWidth = clamp(Math.round(Number($('input-resolution-width').value) || 1920), 320, maxRenderSize); state.customHeight = clamp(Math.round(Number($('input-resolution-height').value) || 1080), 180, maxRenderSize); $('input-resolution-width').value = state.customWidth; $('input-resolution-height').value = state.customHeight; resize(); });
  ['input-resolution-width', 'input-resolution-height'].forEach(id => $(id).addEventListener('input', () => updateResolutionWarning(Number($('input-resolution-width').value), Number($('input-resolution-height').value))));
  [['slider-iterations','label-iterations','iterations', v => v], ['slider-cycle','label-cycle','cycle', v => `${(v / 100).toFixed(1)}x`], ['slider-julia-real','label-julia-real','juliaRe', v => Number(v).toFixed(3)], ['slider-julia-imag','label-julia-imag','juliaIm', v => Number(v).toFixed(3)]].forEach(([input,label,key,format]) => $(input).addEventListener('input', event => { const value = Number(event.target.value); state[key] = key === 'cycle' ? value / 100 : value; $(label).textContent = format(value); scheduleRender(); }));
  $('toggle-smooth').addEventListener('change', event => { state.smooth = event.target.checked; scheduleRender(); }); $('btn-reset').addEventListener('click', resetView);
  $('btn-home').addEventListener('click', () => { state.type = 'mandelbrot'; $('select-fractal').value = 'mandelbrot'; resetView(); });
  $('btn-save').addEventListener('click', () => { const link = document.createElement('a'); link.download = `fractal-${state.type}.png`; link.href = canvas.toDataURL('image/png'); link.click(); });
  $('btn-auto-zoom').addEventListener('click', () => setAutoZoom(!state.autoZoom)); $('btn-telemetry-toggle').addEventListener('click', () => { $('telemetry-hud').classList.toggle('hidden'); $('btn-telemetry-toggle').classList.toggle('active', !$('telemetry-hud').classList.contains('hidden')); });
  $('btn-info').addEventListener('click', () => { $('info-modal').hidden = false; }); $('btn-close-info').addEventListener('click', () => { $('info-modal').hidden = true; });
}

function initInput() {
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const point = pointAt(event.clientX, event.clientY);
    const zoom = event.deltaY < 0 ? 0.82 : 1.22;
    let ns = state.scale.mul(new BF(zoom));
    if (ns.toNumber() < 1e-36) ns = new BF(1e-36);
    if (ns.toNumber() > 10.0) ns = new BF(10.0);
    state.scale = ns;
    state.x = point.x.add(state.x.sub(point.x).mul(new BF(zoom)));
    state.y = point.y.add(state.y.sub(point.y).mul(new BF(zoom)));
    setAutoZoom(false);
    scheduleRender();
  }, { passive: false });
  canvas.addEventListener('pointerdown', event => { state.dragging = true; state.moved = false; state.lastX = event.clientX; state.lastY = event.clientY; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (!state.dragging) return;
    const deltaX = event.clientX - state.lastX, deltaY = event.clientY - state.lastY, rect = canvas.getBoundingClientRect(), aspect = canvas.width / canvas.height;
    if (Math.hypot(deltaX, deltaY) > 2) state.moved = true;
    state.x = state.x.sub(state.scale.mul(new BF(deltaX / rect.width * aspect)));
    state.y = state.y.add(state.scale.mul(new BF(deltaY / rect.height)));
    state.lastX = event.clientX; state.lastY = event.clientY;
    setAutoZoom(false); scheduleRender();
  });
  canvas.addEventListener('pointerup', event => { state.dragging = false; if (state.type === 'julia' && !state.moved) { const point = pointAt(event.clientX, event.clientY); state.juliaRe = clamp(point.x.toNumber(), -1, 1); state.juliaIm = clamp(point.y.toNumber(), -1, 1); $('slider-julia-real').value = state.juliaRe; $('slider-julia-imag').value = state.juliaIm; $('label-julia-real').textContent = state.juliaRe.toFixed(3); $('label-julia-imag').textContent = state.juliaIm.toFixed(3); scheduleRender(); } });
}

function initSidebar() {
  if (typeof Sidebar !== 'undefined') {
    new Sidebar({
      sidebarSelector: '#left-hud',
      collapseTriggerSelector: '#btn-collapse-hud'
    });
  }
}
function animate() {
  if (state.autoZoom && !state.dragging) {
    let ns = state.scale.mul(new BF(0.992));
    if (ns.toNumber() < 1e-36) ns = new BF(1e-36);
    state.scale = ns;
    scheduleRender();
  }
  requestAnimationFrame(animate);
}

addEventListener('resize', resize); initControls(); initInput(); initSidebar(); resize(); animate();
