/* LightRays (React Bits) as a dependency-free vanilla WebGL2 background.
   The shader and props are React Bits' own; the React component wrapper is
   replaced with a data-attribute driven boot so the Jekyll site needs no
   React, no ogl and no build step. */
(() => {
  'use strict';

  const PIXEL_BUDGET = 4.8e6;
  const MAX_PULSES = 4;

  const ORIGINS = {
    'top-left': { anchor: [0, -0.2], dir: [0, 1] },
    'top-center': { anchor: [0.5, -0.2], dir: [0, 1] },
    'top-right': { anchor: [1, -0.2], dir: [0, 1] },
    left: { anchor: [-0.2, 0.5], dir: [1, 0] },
    right: { anchor: [1.2, 0.5], dir: [-1, 0] },
    'bottom-left': { anchor: [0, 1.2], dir: [0, -1] },
    'bottom-center': { anchor: [0.5, 1.2], dir: [0, -1] },
    'bottom-right': { anchor: [1, 1.2], dir: [0, -1] }
  };

  const VERTEX = `#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`;

  const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uScale;
uniform float uTime;
uniform vec2 uSource;
uniform vec2 uAim;
uniform float uReach;
uniform vec3 uColor;
uniform float uSpread;
uniform float uLength;
uniform float uFade;
uniform float uSaturation;
uniform float uPulsating;
uniform float uNoise;
uniform float uDistortion;
uniform float uDensity;
uniform float uSharpness;
uniform float uGlow;
uniform float uHaze;
uniform float uAtmosphere;
uniform float uIntensity;
uniform vec4 uShadow;
uniform vec4 uPulses[${MAX_PULSES}];
uniform vec2 uIntro;
uniform float uLight;
uniform float uOpacity;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
}

float shape(float strength, float width) {
  float edge = max(mix(0.5, 0.08, uSharpness), width);
  return mix(strength, smoothstep(0.62 - edge, 0.62 + edge, strength), uSharpness);
}

void main() {
  vec2 coord = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uScale;
  vec2 delta = coord - uSource;
  float distance = length(delta);
  vec2 dir = delta / max(distance, 1e-4);
  float cosAngle = dot(dir, uAim);
  float angle = cosAngle + uDistortion * sin(uTime * 2.0 + distance * 0.02) * 0.2;
  float slope = fwidth(angle);
  float depth = distance / uReach;

  float source = exp(-depth * depth * 9.0) * 0.9 + exp(-depth * 3.2) * 0.25;
  float glowLight = uGlow * source * smoothstep(-0.2, 0.6, cosAngle);
  float spread = pow(max(angle, 0.0), 1.0 / uSpread);
  float lengthFalloff = clamp(1.0 - distance / (uReach * uLength), 0.0, 1.0);
  float fadeFalloff = clamp(1.0 - distance / (uReach * uFade), 0.5, 1.0);
  float envelope = spread * lengthFalloff * fadeFalloff;
  float reveal = uIntensity * uIntro.y * (1.0 - smoothstep(uIntro.x - 0.35, uIntro.x, depth));
  if ((envelope * 1.6 + glowLight) * reveal < 0.0015) {
    fragColor = vec4(0.0);
    return;
  }

  float phaseA = angle * 36.2214 * uDensity + uTime * 1.5;
  float phaseB = -angle * 21.11349 * uDensity + uTime * 1.5;
  float phaseC = angle * 22.3991 * uDensity + uTime * 1.1;
  float phaseD = -angle * 18.0234 * uDensity + uTime * 1.1;
  float strengthA = clamp(0.75 + 0.15 * sin(phaseA) + 0.2 * cos(phaseB), 0.0, 1.0);
  float strengthB = clamp(0.75 + 0.15 * sin(phaseC) + 0.2 * cos(phaseD), 0.0, 1.0);
  float widthA = abs(0.15 * 36.2214 * cos(phaseA) + 0.2 * 21.11349 * sin(phaseB)) * uDensity * slope;
  float widthB = abs(0.15 * 22.3991 * cos(phaseC) + 0.2 * 18.0234 * sin(phaseD)) * uDensity * slope;
  float pulseA = uPulsating > 0.5 ? 0.8 + 0.2 * sin(uTime * 4.5) : 1.0;
  float pulseB = uPulsating > 0.5 ? 0.8 + 0.2 * sin(uTime * 3.3) : 1.0;
  float rayLight = envelope * (0.5 * shape(strengthA, widthA) * pulseA + 0.4 * shape(strengthB, widthB) * pulseB);

  if (uHaze > 0.0) {
    float around = atan(uAim.x * dir.y - uAim.y * dir.x, cosAngle);
    vec2 drift = vec2(around * 2.2 + uTime * 0.035, depth * 2.6 - uTime * 0.11);
    float fog = 0.65 * valueNoise(drift * vec2(3.0, 1.0)) + 0.35 * valueNoise(drift * vec2(7.0, 2.3) + 4.1);
    rayLight *= mix(1.0, 0.25 + 1.2 * fog, uHaze);
  }

  if (uShadow.z > 0.0) {
    vec2 toCursor = uShadow.xy - uSource;
    float cursorDistance = length(toCursor);
    float along = dot(delta, toCursor) / max(cursorDistance * cursorDistance, 1e-4);
    float side = abs(delta.x * toCursor.y - delta.y * toCursor.x) / max(cursorDistance, 1e-4);
    float trail = max(along - 1.0, 0.0);
    float width = uShadow.w * along + 0.22 * trail * cursorDistance;
    float behind = smoothstep(0.97, 1.25, along) * exp(-trail * 1.1);
    float shade = (1.0 - smoothstep(width * 0.3, width * 1.6, side)) * behind;
    rayLight *= 1.0 - uShadow.z * 0.62 * shade;
  }

  float boost = 0.0;
  for (int i = 0; i < ${MAX_PULSES}; i++) {
    vec4 wave = uPulses[i];
    if (wave.z <= 0.0) continue;
    float x = (depth - wave.x) / wave.y;
    boost += wave.z * exp(-x * x);
  }
  float light = (rayLight * (1.0 + boost) + glowLight) * reveal;

  if (uNoise > 0.0) {
    float n = fract(sin(dot(coord * 0.02 + uTime * 0.1, vec2(12.9898, 78.233))) * 43758.5453123);
    light *= 1.0 - uNoise + uNoise * n;
  }

  float near = clamp(1.2 - distance / (uResolution.y / uScale), 0.0, 1.0);
  vec3 tint = mix(vec3(0.9), vec3(0.1, 0.3, 0.5) + near * vec3(0.8, 0.6, 0.5), uAtmosphere);
  float gray = dot(tint, vec3(0.299, 0.587, 0.114));
  vec3 hue = max(mix(vec3(gray), tint, uSaturation), 0.0) * uColor;

  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uLight > 0.5) {
    vec3 color = hue * light;
    float energy = max(color.r, max(color.g, color.b));
    vec3 tone = clamp(1.0 - (1.0 - hue / max(max(hue.r, max(hue.g, hue.b)), 1e-4)) * 1.8, 0.0, 1.0);
    float warm = clamp((min(tone.r, tone.g) - tone.b) * 2.0, 0.0, 1.0);
    vec3 ink = tone * (mix(0.66, 0.94, warm) - 0.1 * smoothstep(0.4, 1.2, energy));
    float density = clamp(0.82 * (1.0 - exp(-1.5 * energy * energy)) * uOpacity + grain, 0.0, 1.0);
    fragColor = vec4(ink * density, density);
    return;
  }
  float level = light < 0.75 ? light : 0.75 + 0.25 * (1.0 - exp(-(light - 0.75) / 0.25));
  float top = max(hue.r, max(hue.g, hue.b));
  hue = mix(hue, vec3(top), smoothstep(0.8, 1.0, level) * 0.45);
  vec3 shown = clamp(hue * level, 0.0, 1.0) * level;
  fragColor = vec4(clamp(shown + grain, 0.0, level) * uOpacity, level * uOpacity);
}`;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const colorProbe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });

  const parseColor = value => {
    const text = String(value || '').trim();
    const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
    if (hex) {
      const full = hex[1].length === 3 ? hex[1].replace(/./g, digit => digit + digit) : hex[1];
      return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16) / 255);
    }
    const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
    if (rgb) return [rgb[1], rgb[2], rgb[3]].map(channel => clamp(parseFloat(channel) / 255, 0, 1));
    if (colorProbe && text) {
      colorProbe.clearRect(0, 0, 1, 1);
      colorProbe.fillStyle = '#000000';
      colorProbe.fillStyle = text;
      colorProbe.fillRect(0, 0, 1, 1);
      const data = colorProbe.getImageData(0, 0, 1, 1).data;
      return [data[0] / 255, data[1] / 255, data[2] / 255];
    }
    return null;
  };

  const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const link = gl => {
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = vertex && fragment ? gl.createProgram() : null;
    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return null;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let index = 0; index < count; index++) {
      const info = gl.getActiveUniform(program, index);
      if (info) uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  };

  const smoother = t => {
    const x = clamp(t, 0, 1);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };

  const readNumber = (element, name, fallback) => {
    const value = parseFloat(element.dataset[name]);
    return Number.isFinite(value) ? value : fallback;
  };

  const readBoolean = (element, name, fallback) => {
    const value = element.dataset[name];
    if (value === undefined || value === '') return fallback;
    return value !== 'false' && value !== '0';
  };

  /* The site palette decides the light: a dark page gets white rays, a light
     page gets the accent ink the shader prints for light backgrounds. */
  const themeState = () => {
    const style = getComputedStyle(document.documentElement);
    const bg = parseColor(style.getPropertyValue('--main-bg').trim() || '#ffffff') || [1, 1, 1];
    const linear = channel => (channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4));
    const luminance = 0.2126 * linear(bg[0]) + 0.7152 * linear(bg[1]) + 0.0722 * linear(bg[2]);
    const dark = luminance < 0.36;
    if (dark) return { light: false, color: [1, 1, 1] };
    const link = parseColor(style.getPropertyValue('--link-color').trim() || '#0056b2') || [0, 0.34, 0.7];
    return { light: true, color: link };
  };

  const create = container => {
    const canvas = container.querySelector('canvas');
    if (!canvas) return null;
    const hero = container.closest('.goodies-rays-hero') || container;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    const shader = gl ? link(gl) : null;
    if (!gl || !shader) {
      hero.classList.add('is-unsupported');
      return null;
    }

    const state = themeState();
    const colorOverride = container.dataset.raysColor && container.dataset.raysColor !== 'auto'
      ? parseColor(container.dataset.raysColor)
      : null;
    const lightOverride = container.dataset.lightMode === undefined || container.dataset.lightMode === 'auto'
      ? null
      : readBoolean(container, 'lightMode', state.light);

    const settings = {
      origin: ORIGINS[(container.dataset.raysOrigin || 'top-center').toLowerCase()] || ORIGINS['top-center'],
      color: colorOverride || state.color,
      speed: Math.max(0, readNumber(container, 'raysSpeed', 1)),
      spread: Math.max(0.001, readNumber(container, 'lightSpread', 0.5)),
      length: Math.max(0.01, readNumber(container, 'rayLength', 3)),
      density: clamp(readNumber(container, 'rayDensity', 1), 0.1, 6),
      tilt: (clamp(readNumber(container, 'tilt', 0), -90, 90) * Math.PI) / 180,
      sharpness: clamp(readNumber(container, 'raySharpness', 0.35), 0, 1),
      glow: Math.max(0, readNumber(container, 'glow', 0.6)),
      haze: clamp(readNumber(container, 'haze', 0.25), 0, 1),
      atmosphere: clamp(readNumber(container, 'atmosphere', 1), 0, 1),
      intensity: Math.max(0, readNumber(container, 'intensity', 1)),
      pulsating: readBoolean(container, 'pulsating', false),
      fade: Math.max(0.01, readNumber(container, 'fadeDistance', 1)),
      saturation: Math.max(0, readNumber(container, 'saturation', 1)),
      follow: readBoolean(container, 'followMouse', true),
      influence: clamp(readNumber(container, 'mouseInfluence', 0.1), 0, 1),
      cursorShadow: readBoolean(container, 'cursorShadow', true),
      clickPulse: readBoolean(container, 'clickPulse', true),
      noise: clamp(readNumber(container, 'noiseAmount', 0), 0, 1),
      distortion: readNumber(container, 'distortion', 0),
      intro: readBoolean(container, 'intro', true),
      light: lightOverride === null ? state.light : lightOverride,
      opacity: clamp(readNumber(container, 'opacity', 1), 0, 1),
      maxRatio: clamp(readNumber(container, 'maxDevicePixelRatio', 2), 0.5, 3)
    };

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const vao = gl.createVertexArray();
    const size = { width: 1, height: 1, ratio: 1 };
    const pointer = { x: 0.5, y: 0.5, inside: false, seen: false };
    const aim = { x: 0.5, y: 0.5 };
    const shade = { x: 0.5, y: 0.5, presence: 0 };
    const pulses = [];
    const pulseData = new Float32Array(MAX_PULSES * 4);
    let time = 0;
    let opening = settings.intro && !reduced ? 0 : 1;
    let raf = 0;
    let last = 0;
    let visible = true;
    let pageVisible = document.visibilityState !== 'hidden';
    let lost = false;
    let ready = false;

    const markReady = () => {
      if (ready) return;
      ready = true;
      hero.classList.add('is-ready');
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const cssWidth = Math.max(1, rect.width);
      const cssHeight = Math.max(1, rect.height);
      const detail = settings.density * (0.35 + 0.65 * settings.sharpness);
      const sampling = Math.max(clamp(0.35 + 0.3 * detail, 0.5, 2), settings.noise > 0 ? 1 : 0);
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        settings.maxRatio,
        sampling,
        Math.sqrt(PIXEL_BUDGET / (cssWidth * cssHeight))
      );
      const width = Math.max(1, Math.round(cssWidth * ratio));
      const height = Math.max(1, Math.round(cssHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      size.width = cssWidth;
      size.height = cssHeight;
      size.ratio = width / cssWidth;
    };

    const frame = now => {
      raf = 0;
      if (lost) return;
      const dt = clamp((now - last) / 1000 || 0, 0, 0.05);
      last = Math.max(last, now);
      time += dt * settings.speed * (reduced ? 0.35 : 1);
      if (opening < 1) opening = Math.min(1, opening + dt / 1.8);

      const steer = 1 - Math.exp(-dt / 0.2);
      const aimX = settings.follow && pointer.seen ? pointer.x : 0.5;
      const aimY = settings.follow && pointer.seen ? pointer.y : 0.5;
      aim.x += (aimX - aim.x) * steer;
      aim.y += (aimY - aim.y) * steer;
      const glide = 1 - Math.exp(-dt / 0.08);
      shade.x += (pointer.x - shade.x) * glide;
      shade.y += (pointer.y - shade.y) * glide;
      const shading = pointer.inside && settings.cursorShadow && !reduced;
      shade.presence += ((shading ? 1 : 0) - shade.presence) * (1 - Math.exp(-dt / (shading ? 0.25 : 0.5)));

      for (let index = pulses.length - 1; index >= 0; index--) {
        pulses[index].age += dt;
        if (pulses[index].age >= 2) pulses.splice(index, 1);
      }
      pulseData.fill(0);
      pulses.forEach((pulse, index) => {
        const t = pulse.age;
        pulseData[index * 4] = 0.05 + t * 1.05;
        pulseData[index * 4 + 1] = 0.14 + t * 0.14;
        pulseData[index * 4 + 2] = 0.9 * smoother(t / 0.15) * (1 - smoother(t / 2));
      });

      const width = size.width;
      const height = size.height;
      const sourceX = settings.origin.anchor[0] * width;
      const sourceY = settings.origin.anchor[1] * height;
      const cos = Math.cos(settings.tilt);
      const sin = Math.sin(settings.tilt);
      let dirX = settings.origin.dir[0] * cos - settings.origin.dir[1] * sin;
      let dirY = settings.origin.dir[0] * sin + settings.origin.dir[1] * cos;
      if (settings.follow && settings.influence > 0) {
        const mx = aim.x * width - sourceX;
        const my = aim.y * height - sourceY;
        const ml = Math.hypot(mx, my) || 1;
        const bx = dirX + (mx / ml - dirX) * settings.influence;
        const by = dirY + (my / ml - dirY) * settings.influence;
        const bl = Math.hypot(bx, by) || 1;
        dirX = bx / bl;
        dirY = by / bl;
      }
      const eased = 1 - Math.pow(1 - opening, 3);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(shader.program);
      gl.bindVertexArray(vao);
      const u = shader.uniforms;
      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
      gl.uniform1f(u.uScale, size.ratio);
      gl.uniform1f(u.uTime, time);
      gl.uniform2f(u.uSource, sourceX, sourceY);
      gl.uniform2f(u.uAim, dirX, dirY);
      gl.uniform1f(u.uReach, Math.max(width, height));
      gl.uniform3f(u.uColor, settings.color[0], settings.color[1], settings.color[2]);
      gl.uniform1f(u.uSpread, settings.spread);
      gl.uniform1f(u.uLength, settings.length);
      gl.uniform1f(u.uFade, settings.fade);
      gl.uniform1f(u.uSaturation, settings.saturation);
      gl.uniform1f(u.uPulsating, settings.pulsating ? 1 : 0);
      gl.uniform1f(u.uNoise, settings.noise);
      gl.uniform1f(u.uDistortion, settings.distortion);
      gl.uniform1f(u.uDensity, settings.density);
      gl.uniform1f(u.uSharpness, settings.sharpness);
      gl.uniform1f(u.uGlow, settings.glow);
      gl.uniform1f(u.uHaze, settings.haze);
      gl.uniform1f(u.uAtmosphere, settings.atmosphere);
      gl.uniform1f(u.uIntensity, settings.intensity);
      gl.uniform4f(u.uShadow, shade.x * width, shade.y * height, shade.presence, 16);
      gl.uniform4fv(u.uPulses, pulseData);
      gl.uniform2f(u.uIntro, eased * 2.6, smoother(opening / 0.5));
      gl.uniform1f(u.uLight, settings.light ? 1 : 0);
      gl.uniform1f(u.uOpacity, settings.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      markReady();

      const settling =
        Math.abs(aim.x - aimX) > 1e-4 ||
        Math.abs(aim.y - aimY) > 1e-4 ||
        (shade.presence > 1e-3 && Math.abs(shade.x - pointer.x) + Math.abs(shade.y - pointer.y) > 1e-4) ||
        Math.abs((shading ? 1 : 0) - shade.presence) > 1e-3 ||
        pulses.length > 0;
      const busy = settings.speed > 0 || opening < 1 || settling;
      if (busy && visible && pageVisible) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf || lost || !visible || !pageVisible) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const locate = event => {
      const rect = container.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / Math.max(1, rect.width),
        y: (event.clientY - rect.top) / Math.max(1, rect.height),
        inside:
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
      };
    };

    const onPointerMove = event => {
      const spot = locate(event);
      if (!pointer.inside && spot.inside) {
        shade.x = spot.x;
        shade.y = spot.y;
      }
      pointer.x = spot.x;
      pointer.y = spot.y;
      pointer.inside = spot.inside;
      pointer.seen = true;
      wake();
    };

    const onPointerDown = event => {
      const spot = locate(event);
      if (!spot.inside || !settings.clickPulse || reduced) return;
      pulses.push({ age: 0 });
      if (pulses.length > MAX_PULSES) pulses.shift();
      wake();
    };

    const onLeave = () => {
      pointer.inside = false;
      wake();
    };

    const onPointerUp = event => {
      if (event.pointerType !== 'mouse') onLeave();
    };

    const onVisibility = () => {
      pageVisible = document.visibilityState !== 'hidden';
      last = performance.now();
      wake();
    };

    const applyTheme = () => {
      const next = themeState();
      settings.color = colorOverride || next.color;
      settings.light = lightOverride === null ? next.light : lightOverride;
      wake();
    };

    const onLost = event => {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onRestored = () => {
      const api = container.__lightRays;
      if (api) api.destroy();
      container.__lightRays = create(container);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    window.addEventListener('message', event => {
      if (event.data && event.data.id === 'theme-mode') applyTheme();
    });
    if (window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      if (media.addEventListener) media.addEventListener('change', applyTheme);
    }
    if ('MutationObserver' in window) {
      new MutationObserver(applyTheme).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-mode', 'data-theme', 'data-bs-theme']
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      resize();
      wake();
    });
    resizeObserver.observe(container);

    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      wake();
    });
    intersection.observe(container);

    resize();
    wake();

    return {
      destroy() {
        lost = true;
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        intersection.disconnect();
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        document.documentElement.removeEventListener('pointerleave', onLeave);
        document.removeEventListener('visibilitychange', onVisibility);
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
        if (!gl.isContextLost()) {
          gl.deleteVertexArray(vao);
          gl.deleteProgram(shader.program);
        }
        hero.classList.remove('is-ready');
      }
    };
  };

  /* The layer is fixed so it stays put while the page scrolls, which removes
     it from the flow. Fixed means viewport coordinates, so it is inset by JS to
     the main content column: full viewport width would reach under the
     sidebars, and any narrower fixed width would leave gaps when the column
     resizes. */
  const insetHero = hero => {
    const column = document.querySelector('#main-wrapper main');
    if (!column) return;
    let frame = 0;
    const applyInset = () => {
      frame = 0;
      const rect = column.getBoundingClientRect();
      const style = window.getComputedStyle(column);
      const left = rect.left + (parseFloat(style.paddingLeft) || 0);
      const right = rect.right - (parseFloat(style.paddingRight) || 0);
      /* Fixed elements resolve against the document client box, which leaves
         out a classic scrollbar; window.innerWidth includes it and would leave
         the layer short by that width. */
      const viewport = document.documentElement.clientWidth || window.innerWidth;
      hero.style.left = `${Math.max(0, left)}px`;
      hero.style.right = `${Math.max(0, viewport - right)}px`;
    };
    /* Deferred so a ResizeObserver callback never mutates layout twice in the
       same delivery (which would log a loop warning). Always re-scheduling (and
       cancelling the previous frame) means one dropped frame cannot freeze the
       insets and leave the layer over the sidebar. */
    const queueInset = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(applyInset);
    };
    applyInset();
    window.addEventListener('resize', queueInset, { passive: true });
    window.addEventListener('load', queueInset);
    window.addEventListener('pageshow', queueInset);
    if ('ResizeObserver' in window) new ResizeObserver(queueInset).observe(column);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(queueInset, () => {});
    }
  };

  const boot = () => {
    const hero = document.querySelector('.goodies-rays-hero');
    if (hero) {
      const container = document.querySelector('#main-wrapper > .container');
      if (container) {
        container.classList.add('has-goodies-rays');
        if (hero.parentElement !== container) {
          container.insertBefore(hero, container.firstChild);
        }
      }
      insetHero(hero);
    }
    document.querySelectorAll('[data-light-rays]').forEach(element => {
      if (!element.__lightRays) element.__lightRays = create(element);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
