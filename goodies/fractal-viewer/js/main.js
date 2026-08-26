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
uniform vec2 uCentre, uJulia; uniform float uScale, uAspect, uCycle;
uniform int uIterations, uType, uPalette; uniform bool uSmooth;
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
  vec2 point = uCentre + vec2((uv.x-.5)*uScale*uAspect, (uv.y-.5)*uScale);
  vec2 z = uType == 1 ? point : vec2(0.); vec2 c = uType == 1 ? uJulia : point;
  float radius2 = 0.; int iteration = 0;
  for (int i = 0; i < 1200; i++) {
    if (i >= uIterations) break;
    if (uType == 2) z = abs(z);
    if (uType == 3) z = vec2(z.x*z.x-z.y*z.y, -2.*z.x*z.y) + c;
    else if (uType == 4) z = vec2(abs(z.x*z.x-z.y*z.y), 2.*z.x*z.y) + c;
    else if (uType == 5) z = vec2(z.x*z.x-z.y*z.y, 2.*abs(z.x)*z.y) + c;
    else z = vec2(z.x*z.x-z.y*z.y, 2.*z.x*z.y) + c;
    radius2 = dot(z,z); iteration = i;
    if (radius2 > 256.) break;
  }
  if (radius2 <= 256. && iteration + 1 >= uIterations) { outputColor = vec4(.012,.027,.071,1.); return; }
  float value = float(iteration);
  if (uSmooth) value += 1. - log(log(max(sqrt(radius2), 1.0001))) / log(2.);
  outputColor = vec4(palette(value / float(uIterations) * 2.8 * uCycle), 1.);
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
  return { program, uniforms: Object.fromEntries(['uCentre','uScale','uAspect','uIterations','uType','uPalette','uCycle','uSmooth','uJulia'].map(name => [name, gl.getUniformLocation(program, name)])) };
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

function scheduleRender() { if (!state.renderQueued) { state.renderQueued = true; requestAnimationFrame(() => { state.renderQueued = false; render(); }); } }
function render() {
  const renderStarted = performance.now();
  const u = renderer.uniforms; gl.useProgram(renderer.program);
  gl.uniform2f(u.uCentre, state.x, state.y); gl.uniform1f(u.uScale, state.scale); gl.uniform1f(u.uAspect, canvas.width / canvas.height);
  gl.uniform1i(u.uIterations, state.iterations); gl.uniform1i(u.uType, { mandelbrot: 0, julia: 1, ship: 2, tricorn: 3, celtic: 4, perpendicular: 5 }[state.type]); gl.uniform1i(u.uPalette, { ocean: 0, ember: 1, neon: 2, mono: 3 }[state.palette]);
  gl.uniform1f(u.uCycle, state.cycle); gl.uniform1i(u.uSmooth, state.smooth ? 1 : 0); gl.uniform2f(u.uJulia, state.juliaRe, state.juliaIm); gl.drawArrays(gl.TRIANGLES, 0, 6);
  $('telemetry-formula').textContent = { mandelbrot: 'Mandelbrot', julia: 'Julia', ship: 'Burning Ship', tricorn: 'Tricorn', celtic: 'Celtic', perpendicular: 'Perpendicular' }[state.type]; $('telemetry-zoom').textContent = `${(3.2 / state.scale).toFixed(2)}x`; $('telemetry-centre').textContent = `${state.x.toFixed(4)}, ${state.y.toFixed(4)}`; $('telemetry-render').textContent = `GPU · ${canvas.width} × ${canvas.height}`;
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
  canvas.addEventListener('wheel', event => { event.preventDefault(); const point = pointAt(event.clientX, event.clientY), zoom = event.deltaY < 0 ? .82 : 1.22; state.scale = clamp(state.scale * zoom, 1e-12, 6); state.x = point.x + (state.x - point.x) * zoom; state.y = point.y + (state.y - point.y) * zoom; setAutoZoom(false); scheduleRender(); }, { passive: false });
  canvas.addEventListener('pointerdown', event => { state.dragging = true; state.moved = false; state.lastX = event.clientX; state.lastY = event.clientY; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => { if (!state.dragging) return; const deltaX = event.clientX - state.lastX, deltaY = event.clientY - state.lastY, rect = canvas.getBoundingClientRect(), aspect = canvas.width / canvas.height; if (Math.hypot(deltaX, deltaY) > 2) state.moved = true; state.x -= deltaX / rect.width * state.scale * aspect; state.y += deltaY / rect.height * state.scale; state.lastX = event.clientX; state.lastY = event.clientY; setAutoZoom(false); scheduleRender(); });
  canvas.addEventListener('pointerup', event => { state.dragging = false; if (state.type === 'julia' && !state.moved) { const point = pointAt(event.clientX, event.clientY); state.juliaRe = clamp(point.x, -1, 1); state.juliaIm = clamp(point.y, -1, 1); $('slider-julia-real').value = state.juliaRe; $('slider-julia-imag').value = state.juliaIm; $('label-julia-real').textContent = state.juliaRe.toFixed(3); $('label-julia-imag').textContent = state.juliaIm.toFixed(3); scheduleRender(); } });
}

function initCollapse() {
  const hud = $('left-hud');
  const collapseButton = $('btn-collapse-hud');
  let transitioning = false;
  const easing = 'cubic-bezier(0.32, 0.72, 0, 1)';

  function collapse() {
    if (transitioning || hud.classList.contains('collapsed')) return;
    transitioning = true;
    hud.classList.add('animating');
    const width = hud.offsetWidth || 310;
    const height = hud.offsetHeight || innerHeight - 32;
    const content = hud.querySelectorAll('.hud-title-row, .hud-section, .action-btn, .seg-control, .hud-top-actions > :not(#btn-collapse-hud)');
    content.forEach(element => { element.style.transition = 'opacity .1s ease-out'; element.style.opacity = '0'; });
    const animation = hud.animate([{ width: `${width}px`, height: `${height}px`, borderRadius: '16px', padding: '1.1rem' }, { width: '2.75rem', height: '2.75rem', borderRadius: '16px', padding: '0' }], { duration: 320, easing, fill: 'forwards' });
    animation.onfinish = () => { hud.classList.add('collapsed'); hud.classList.remove('animating'); animation.cancel(); content.forEach(element => { element.style.transition = ''; element.style.opacity = ''; }); transitioning = false; };
  }

  function expand() {
    if (transitioning || !hud.classList.contains('collapsed')) return;
    transitioning = true;
    hud.classList.add('animating');
    hud.classList.remove('collapsed');
    const content = hud.querySelectorAll('.hud-title-row, .hud-section, .action-btn, .seg-control, .hud-top-actions > :not(#btn-collapse-hud)');
    content.forEach(element => { element.style.opacity = '0'; element.style.transition = 'opacity .24s ease-out .16s'; });
    const animation = hud.animate([{ width: '2.75rem', height: '2.75rem', borderRadius: '16px', padding: '0' }, { width: '310px', height: `${innerHeight - 32}px`, borderRadius: '16px', padding: '1.1rem' }], { duration: 460, easing, fill: 'forwards' });
    requestAnimationFrame(() => content.forEach(element => { element.style.opacity = '1'; }));
    animation.onfinish = () => { hud.classList.remove('animating'); animation.cancel(); content.forEach(element => { element.style.transition = ''; element.style.opacity = ''; }); transitioning = false; };
  }

  collapseButton.addEventListener('click', event => { event.stopPropagation(); hud.classList.contains('collapsed') ? expand() : collapse(); });
  hud.addEventListener('click', () => { if (hud.classList.contains('collapsed')) expand(); });
}
function animate() { if (state.autoZoom && !state.dragging) { state.scale = Math.max(1e-12, state.scale * .992); scheduleRender(); } requestAnimationFrame(animate); }

addEventListener('resize', resize); initControls(); initInput(); initCollapse(); resize(); animate();
