const canvas = document.getElementById('render-canvas');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
const $ = id => document.getElementById(id);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const defaults = { mandelbrot: { x: -.5, y: 0, scale: 3.2 }, julia: { x: 0, y: 0, scale: 3.2 }, ship: { x: -.5, y: -.5, scale: 3.5 }, tricorn: { x: -.5, y: 0, scale: 3.2 }, celtic: { x: -.5, y: 0, scale: 3.2 }, perpendicular: { x: -.5, y: 0, scale: 3.2 } };
const state = { type: 'mandelbrot', palette: 'ocean', x: -.5, y: 0, scale: 3.2, iterations: 320, cycle: 1, smooth: true, juliaRe: -.745, juliaIm: .113, resolution: 'auto', customWidth: 1920, customHeight: 1080, autoZoom: false, dragging: false, moved: false, lastX: 0, lastY: 0, renderQueued: false, slowFrameScore: 0 };

const vertexSource = `#version 300 es
in vec2 position; out vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }`;

const fragmentSource = `#version 300 es
precision highp float; precision highp int;
in vec2 uv; out vec4 outputColor;
uniform vec2 uCentreHigh, uCentreLow, uJulia;
uniform float uScaleHigh, uScaleLow, uAspect, uCycle;
uniform int uIterations, uType, uPalette; uniform bool uSmooth;

// Double-single (emulated double precision float) arithmetic:
// Represents double as pair of float (high + low)
vec2 ds_set(float a) { return vec2(a, 0.0); }

vec2 ds_add(vec2 dsa, vec2 dsb) {
  float t1 = dsa.x + dsb.x;
  float e = t1 - dsa.x;
  float t2 = ((dsb.x - e) + (dsa.x - (t1 - e))) + dsa.y + dsb.y;
  float high = t1 + t2;
  float low = t2 - (high - t1);
  return vec2(high, low);
}

vec2 ds_sub(vec2 dsa, vec2 dsb) {
  return ds_add(dsa, vec2(-dsb.x, -dsb.y));
}

// Dekker's product for precise 24-bit mantissa split without GLSL fma
vec2 ds_mul(vec2 dsa, vec2 dsb) {
  float conA = dsa.x * 4097.0;
  float a1 = conA - (conA - dsa.x);
  float a2 = dsa.x - a1;

  float conB = dsb.x * 4097.0;
  float b1 = conB - (conB - dsb.x);
  float b2 = dsb.x - b1;

  float c11 = dsa.x * dsb.x;
  float c21 = a2 * b2 - (((c11 - a1 * b1) - a2 * b1) - a1 * b2);
  float c2 = dsa.x * dsb.y + dsa.y * dsb.x + c21;

  float high = c11 + c2;
  float low = c2 - (high - c11);
  return vec2(high, low);
}

vec3 palette(float t) {
  t = fract(t);
  if (uPalette == 3) return vec3(t);
  vec3 offset = uPalette == 1 ? vec3(.02,.31,.60) : (uPalette == 2 ? vec3(.12,.48,.83) : vec3(.57,.65,.72));
  vec3 colour = .5 + .5 * cos(6.283185 * (t + offset));
  if (uPalette == 0) colour *= vec3(.30,.78,1.);
  if (uPalette == 1) colour *= vec3(1.,.56,.22);
  return colour;
}

void main() {
  vec2 scale_ds = vec2(uScaleHigh, uScaleLow);
  vec2 offX_ds = ds_mul(scale_ds, vec2((uv.x - 0.5) * uAspect, 0.0));
  vec2 offY_ds = ds_mul(scale_ds, vec2(uv.y - 0.5, 0.0));

  vec2 pointX_ds = ds_add(vec2(uCentreHigh.x, uCentreLow.x), offX_ds);
  vec2 pointY_ds = ds_add(vec2(uCentreHigh.y, uCentreLow.y), offY_ds);

  vec2 zX = uType == 1 ? pointX_ds : vec2(0.0);
  vec2 zY = uType == 1 ? pointY_ds : vec2(0.0);
  vec2 cX = uType == 1 ? vec2(uJulia.x, 0.0) : pointX_ds;
  vec2 cY = uType == 1 ? vec2(uJulia.y, 0.0) : pointY_ds;

  float radius2 = 0.0;
  int iteration = 0;
  for (int i = 0; i < 1200; i++) {
    if (i >= uIterations) break;

    if (uType == 2) {
      // Burning Ship: |Re(z)| + i|Im(z)|
      if (zX.x < 0.0) zX = -zX;
      if (zY.x < 0.0) zY = -zY;
    }

    vec2 x2 = ds_mul(zX, zX);
    vec2 y2 = ds_mul(zY, zY);
    vec2 xy = ds_mul(zX, zY);
    vec2 two_xy = ds_add(xy, xy);

    if (uType == 3) {
      // Tricorn / Mandelbar
      zX = ds_add(ds_sub(x2, y2), cX);
      zY = ds_sub(cY, two_xy);
    } else if (uType == 4) {
      // Celtic
      vec2 diff = ds_sub(x2, y2);
      if (diff.x < 0.0) diff = -diff;
      zX = ds_add(diff, cX);
      zY = ds_add(two_xy, cY);
    } else if (uType == 5) {
      // Perpendicular
      vec2 absX = zX;
      if (absX.x < 0.0) absX = -absX;
      vec2 two_abs_xy = ds_add(ds_mul(absX, zY), ds_mul(absX, zY));
      zX = ds_add(ds_sub(x2, y2), cX);
      zY = ds_add(two_abs_xy, cY);
    } else {
      // Standard Mandelbrot / Julia
      zX = ds_add(ds_sub(x2, y2), cX);
      zY = ds_add(two_xy, cY);
    }

    radius2 = x2.x + y2.x;
    iteration = i;
    if (radius2 > 256.0) break;
  }

  if (radius2 <= 256.0 && iteration + 1 >= uIterations) {
    outputColor = vec4(0.012, 0.027, 0.071, 1.0);
    return;
  }

  float value = float(iteration);
  if (uSmooth) {
    value += 1.0 - log(log(max(sqrt(radius2), 1.0001))) / log(2.0);
  }
  outputColor = vec4(palette(value / float(uIterations) * 2.8 * uCycle), 1.0);
}`;

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
  return { program, uniforms: Object.fromEntries(['uCentreHigh','uCentreLow','uScaleHigh','uScaleLow','uAspect','uIterations','uType','uPalette','uCycle','uSmooth','uJulia'].map(name => [name, gl.getUniformLocation(program, name)])) };
}

let renderer;
try { renderer = createRenderer(); } catch (error) {
  document.body.innerHTML = '<main class="webgl-error"><h1>WebGL 2 is required</h1><p>This Fractal Viewer uses your GPU for real-time rendering. Please open it in a current browser with hardware acceleration enabled.</p></main>';
  throw error;
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

function splitDouble(val) {
  const high = Math.fround(val);
  const low = Math.fround(val - high);
  return [high, low];
}

function scheduleRender() { if (!state.renderQueued) { state.renderQueued = true; requestAnimationFrame(() => { state.renderQueued = false; render(); }); } }
function render() {
  const renderStarted = performance.now();
  const u = renderer.uniforms; gl.useProgram(renderer.program);

  const [xHigh, xLow] = splitDouble(state.x);
  const [yHigh, yLow] = splitDouble(state.y);
  const [scaleHigh, scaleLow] = splitDouble(state.scale);

  gl.uniform2f(u.uCentreHigh, xHigh, yHigh);
  gl.uniform2f(u.uCentreLow, xLow, yLow);
  gl.uniform1f(u.uScaleHigh, scaleHigh);
  gl.uniform1f(u.uScaleLow, scaleLow);
  gl.uniform1f(u.uAspect, canvas.width / canvas.height);
  gl.uniform1i(u.uIterations, state.iterations);
  gl.uniform1i(u.uType, { mandelbrot: 0, julia: 1, ship: 2, tricorn: 3, celtic: 4, perpendicular: 5 }[state.type]);
  gl.uniform1i(u.uPalette, { ocean: 0, ember: 1, neon: 2, mono: 3 }[state.palette]);
  gl.uniform1f(u.uCycle, state.cycle);
  gl.uniform1i(u.uSmooth, state.smooth ? 1 : 0);
  gl.uniform2f(u.uJulia, state.juliaRe, state.juliaIm);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  const zoomFactor = 3.2 / state.scale;
  const zoomText = zoomFactor > 1e6 ? `${zoomFactor.toExponential(2)}x` : `${zoomFactor.toFixed(2)}x`;
  $('telemetry-formula').textContent = { mandelbrot: 'Mandelbrot', julia: 'Julia', ship: 'Burning Ship', tricorn: 'Tricorn', celtic: 'Celtic', perpendicular: 'Perpendicular' }[state.type];
  $('telemetry-zoom').textContent = zoomText;
  $('telemetry-centre').textContent = `${state.x.toFixed(6)}, ${state.y.toFixed(6)}`;
  $('telemetry-render').textContent = `GPU · ${canvas.width} × ${canvas.height}`;
  requestAnimationFrame(() => { state.slowFrameScore = clamp(state.slowFrameScore + (performance.now() - renderStarted > 45 ? 1 : -1), 0, 3); updateResolutionWarning(canvas.width, canvas.height); });
}

function pointAt(clientX, clientY) { const rect = canvas.getBoundingClientRect(), aspect = canvas.width / canvas.height; return { x: state.x + ((clientX - rect.left) / rect.width - .5) * state.scale * aspect, y: state.y + (.5 - (clientY - rect.top) / rect.height) * state.scale }; }
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
    state.scale = clamp(state.scale * zoom, 1e-100, 10.0);
    state.x = point.x + (state.x - point.x) * zoom;
    state.y = point.y + (state.y - point.y) * zoom;
    setAutoZoom(false);
    scheduleRender();
  }, { passive: false });
  canvas.addEventListener('pointerdown', event => { state.dragging = true; state.moved = false; state.lastX = event.clientX; state.lastY = event.clientY; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => { if (!state.dragging) return; const deltaX = event.clientX - state.lastX, deltaY = event.clientY - state.lastY, rect = canvas.getBoundingClientRect(), aspect = canvas.width / canvas.height; if (Math.hypot(deltaX, deltaY) > 2) state.moved = true; state.x -= deltaX / rect.width * state.scale * aspect; state.y += deltaY / rect.height * state.scale; state.lastX = event.clientX; state.lastY = event.clientY; setAutoZoom(false); scheduleRender(); });
  canvas.addEventListener('pointerup', event => { state.dragging = false; if (state.type === 'julia' && !state.moved) { const point = pointAt(event.clientX, event.clientY); state.juliaRe = clamp(point.x, -1, 1); state.juliaIm = clamp(point.y, -1, 1); $('slider-julia-real').value = state.juliaRe; $('slider-julia-imag').value = state.juliaIm; $('label-julia-real').textContent = state.juliaRe.toFixed(3); $('label-julia-imag').textContent = state.juliaIm.toFixed(3); scheduleRender(); } });
}

function initSidebar() {
  if (typeof Sidebar !== 'undefined') {
    new Sidebar({
      sidebarSelector: '#left-hud',
      collapseTriggerSelector: '#btn-collapse-hud'
    });
  }
}
function animate() { if (state.autoZoom && !state.dragging) { state.scale = Math.max(1e-100, state.scale * 0.992); scheduleRender(); } requestAnimationFrame(animate); }

addEventListener('resize', resize); initControls(); initInput(); initSidebar(); resize(); animate();
