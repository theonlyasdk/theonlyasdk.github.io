/**
 * High-Performance Canvas Rendering Engines for Sorting Visualizations
 * 20 Distinct 2D, Polar, Parametric & True 3D Perspective Visualization Modes
 */

class SortingRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'bars';
    this.colorTheme = 'cyan';
    this.bloomEnabled = true;

    // 3D Orbital & Drag Rotation State
    this.rotAngleX = 0;
    this.rotAngleY = 0.2; // Default aesthetic camera tilt
    this.rotAngle = 0;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Minute Rendering & Optical Shader Parameters
    this.glowMultiplier = 1.0;
    this.gapSize = 1.0;
    this.trailPersistence = 0.0;
    this.rotSpeedFactor = 1.0;
    this.dotSizeMultiplier = 1.0;
    this.sortedGlowAlpha = 1.0;
    this.connectLines = true; // Toggle continuous lines on/off

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initDragInteractions();
  }

  is3DMode() {
    return ['iso3d', 'helix3d', 'globe3d', 'torus3d', 'cylinder3d', 'tunnel3d', 'mesh3d', 'lissajous'].includes(this.mode);
  }

  initDragInteractions() {
    const canvas = this.canvas;

    const onDown = (clientX, clientY) => {
      if (!this.is3DMode()) return;
      this.isDragging = true;
      this.lastMouseX = clientX;
      this.lastMouseY = clientY;
      canvas.style.cursor = 'grabbing';
    };

    const onMove = (clientX, clientY) => {
      if (!this.isDragging) {
        if (this.is3DMode()) canvas.style.cursor = 'grab';
        else canvas.style.cursor = 'default';
        return;
      }
      const dx = clientX - this.lastMouseX;
      const dy = clientY - this.lastMouseY;

      this.rotAngleX += dx * 0.007;
      this.rotAngleY = Math.max(-1.4, Math.min(1.4, this.rotAngleY + dy * 0.007));
      this.rotAngle = this.rotAngleX;

      this.lastMouseX = clientX;
      this.lastMouseY = clientY;
    };

    const onUp = () => {
      if (this.isDragging) {
        this.isDragging = false;
        canvas.style.cursor = this.is3DMode() ? 'grab' : 'default';
      }
    };

    canvas.addEventListener('mousedown', e => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onUp);

    // Touch support for mobile / tablets
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        onDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && this.isDragging) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', onUp);
  }

  rotate3D(x, y, z) {
    // Yaw (Around Y Axis)
    const cosX = Math.cos(this.rotAngleX);
    const sinX = Math.sin(this.rotAngleX);
    const x1 = cosX * x + sinX * z;
    const z1 = -sinX * x + cosX * z;
    const y1 = y;

    // Pitch (Around X Axis)
    const cosY = Math.cos(this.rotAngleY);
    const sinY = Math.sin(this.rotAngleY);
    const y2 = cosY * y1 - sinY * z1;
    const z2 = sinY * y1 + cosY * z1;
    const x2 = x1;

    return { x: x2, y: y2, z: z2 };
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setMode(mode) {
    this.mode = mode;
    this.canvas.style.cursor = this.is3DMode() ? 'grab' : 'default';
  }

  setColorTheme(theme) {
    this.colorTheme = theme;
  }

  setConnectLines(val) {
    this.connectLines = !!val;
  }

  setSortedGlowAlpha(alpha) {
    this.sortedGlowAlpha = Math.max(0.0, Math.min(1.0, alpha));
  }

  setGlow(val) {
    this.glowMultiplier = Math.max(0.0, Math.min(2.5, val));
    this.bloomEnabled = this.glowMultiplier > 0.05;
  }

  setGap(val) {
    this.gapSize = Math.max(0.0, Math.min(6.0, val));
  }

  setTrail(val) {
    this.trailPersistence = Math.max(0.0, Math.min(0.85, val));
  }

  setRotSpeed(val) {
    this.rotSpeedFactor = Math.max(0.0, Math.min(3.0, val));
  }

  setDotSize(val) {
    this.dotSizeMultiplier = Math.max(0.5, Math.min(2.5, val));
  }

  getColor(val, maxVal, state = 'default', brightnessMult = 1.0) {
    if (state === 'compare') return '#f43f5e'; // Rose red
    if (state === 'swap' || state === 'write') return '#fbbf24'; // Amber yellow
    if (state === 'pivot') return '#a855f7'; // Purple

    const ratio = maxVal > 0 ? (val / maxVal) : 0;
    let baseH = 195 + ratio * 35;
    let baseS = 90;
    let baseL = Math.min(95, (45 + ratio * 35) * brightnessMult);

    if (this.colorTheme === 'rainbow') {
      baseH = ratio * 320;
      baseS = 85;
      baseL = Math.min(95, 60 * brightnessMult);
    } else if (this.colorTheme === 'sunset') {
      baseH = (340 + ratio * 70) % 360;
      baseS = 90;
      baseL = Math.min(95, 60 * brightnessMult);
    } else if (this.colorTheme === 'emerald') {
      baseH = 140 + ratio * 40;
      baseS = 80;
      baseL = Math.min(95, 55 * brightnessMult);
    }

    if (state === 'sorted') {
      if (this.sortedGlowAlpha >= 0.99) {
        return '#34d399'; // Pure Emerald green
      } else if (this.sortedGlowAlpha <= 0.01) {
        return `hsl(${baseH}, ${baseS}%, ${baseL}%)`;
      }
      // Smooth 4-second HSL crossfade from Emerald (#34d399 -> hsl(158, 64%, 52%)) back to base palette
      const targetH = 158;
      const targetS = 64;
      const targetL = 52 * brightnessMult;
      const a = this.sortedGlowAlpha;

      const finalH = baseH + (targetH - baseH) * a;
      const finalS = baseS + (targetS - baseS) * a;
      const finalL = baseL + (targetL - baseL) * a;
      return `hsl(${finalH}, ${finalS}%, ${finalL}%)`;
    }

    return `hsl(${baseH}, ${baseS}%, ${baseL}%)`;
  }

  applyGlow(ctx, color, state, baseBlur = 14) {
    if (state !== 'default' && this.bloomEnabled) {
      if (state === 'sorted') {
        const blur = Math.round(baseBlur * this.glowMultiplier * this.sortedGlowAlpha);
        if (blur > 0) {
          ctx.shadowColor = color;
          ctx.shadowBlur = blur;
        } else {
          ctx.shadowBlur = 0;
        }
      } else {
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.round(baseBlur * this.glowMultiplier);
      }
    } else {
      ctx.shadowBlur = 0;
    }
  }

  render(arr, maxVal, activeStates = {}) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Advance 3D rotational momentum only when NOT dragging
    if (!this.isDragging) {
      this.rotAngleX += 0.008 * this.rotSpeedFactor;
      this.rotAngle = this.rotAngleX;
    }

    // Background Clear with Optional Motion Phosphor Trail Persistence
    if (this.trailPersistence > 0.02) {
      ctx.fillStyle = `rgba(6, 9, 19, ${1.0 - this.trailPersistence})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, w, h);
    }

    if (!arr || arr.length === 0) return;

    switch (this.mode) {
      case 'bars': return this.renderBars(arr, maxVal, activeStates);
      case 'radial': return this.renderRadial(arr, maxVal, activeStates);
      case 'scatter': return this.renderScatter(arr, maxVal, activeStates);
      case 'spiral': return this.renderSpiral(arr, maxVal, activeStates);
      case 'pyramid': return this.renderPyramid(arr, maxVal, activeStates);
      case 'iso3d': return this.renderIsometric3D(arr, maxVal, activeStates);
      case 'helix3d': return this.renderHelix3D(arr, maxVal, activeStates);
      case 'globe3d': return this.renderGlobe3D(arr, maxVal, activeStates);
      case 'torus3d': return this.renderTorus3D(arr, maxVal, activeStates);
      case 'cylinder3d': return this.renderCylinder3D(arr, maxVal, activeStates);
      case 'tunnel3d': return this.renderTunnel3D(arr, maxVal, activeStates);
      case 'mesh3d': return this.renderMesh3D(arr, maxVal, activeStates);
      case 'waveform': return this.renderWaveform(arr, maxVal, activeStates);
      case 'heatmap': return this.renderHeatmap(arr, maxVal, activeStates);
      case 'circle_pack': return this.renderRadarRings(arr, maxVal, activeStates);
      case 'phyllotaxis': return this.renderPhyllotaxis(arr, maxVal, activeStates);
      case 'butterfly': return this.renderButterfly(arr, maxVal, activeStates);
      case 'lissajous': return this.renderLissajous3D(arr, maxVal, activeStates);
      case 'starburst': return this.renderStarburst(arr, maxVal, activeStates);
      case 'voronoi_mesh': return this.renderConstellation(arr, maxVal, activeStates);
      default: return this.renderBars(arr, maxVal, activeStates);
    }
  }

  // 1. 2D Vertical Bars
  renderBars(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const padX = 40;
    const padBottom = 40;
    const padTop = 60;
    const availW = this.width - padX * 2;
    const availH = this.height - padBottom - padTop;
    const barW = Math.max(1, availW / n);
    const gap = n > 192 ? 0 : Math.min(barW * 0.4, this.gapSize);

    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const barH = (val / maxVal) * availH;
      const x = padX + i * barW;
      const y = this.height - padBottom - barH;

      const state = activeStates[i] || 'default';
      const color = this.getColor(val, maxVal, state);

      ctx.fillStyle = color;
      this.applyGlow(ctx, color, state, 14);

      const drawW = Math.max(1, barW - gap);
      ctx.fillRect(x, y, drawW, barH);
    }
    ctx.shadowBlur = 0;
  }

  // 2. 360° Polar Circle Dial
  renderRadial(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const maxR = Math.min(cx, cy) * 0.76;
    const minR = maxR * 0.14;
    const angleStep = (Math.PI * 2) / n;

    // Boundary Rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, minR, 0, Math.PI * 2);
    ctx.stroke();

    // Spoke ray width modulated by gapSize parameter
    const rawRayW = (Math.PI * 2 * maxR) / n;
    const rayWidth = Math.max(1.0, rawRayW * 0.85 - this.gapSize * 0.6);

    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const color = this.getColor(val, maxVal, state);

      const angle = i * angleStep - Math.PI * 0.5;
      const barLen = minR + (val / maxVal) * (maxR - minR);

      const x1 = cx + Math.cos(angle) * minR;
      const y1 = cy + Math.sin(angle) * minR;
      const x2 = cx + Math.cos(angle) * barLen;
      const y2 = cy + Math.sin(angle) * barLen;

      ctx.strokeStyle = color;
      ctx.lineWidth = rayWidth;
      ctx.lineCap = 'butt';

      this.applyGlow(ctx, color, state, 14);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // 3. Cartesian Scatter Matrix (Connected Polyline + Nodes)
  renderScatter(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const padX = Math.max(60, this.width * 0.12);
    const padY = Math.max(60, this.height * 0.12);
    const availW = this.width - padX * 2;
    const availH = this.height - padY * 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padX, padY, availW, availH);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padX, padY + availH);
    ctx.lineTo(padX + availW, padY);
    ctx.stroke();
    ctx.setLineDash([]);

    const points = new Array(n);
    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const x = padX + (i / (n - 1 || 1)) * availW;
      const y = padY + availH - (val / maxVal) * availH;
      points[i] = { x, y, val, state };
    }

    const strokeW = Math.max(1.5, Math.min(3.5, (availW / n) * 1.6));
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Connect dots with continuous line of matching thickness (if enabled)
    if (this.connectLines) {
      for (let i = 0; i < n - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const color = this.getColor(p1.val, maxVal, p1.state);

        ctx.strokeStyle = color;
        this.applyGlow(ctx, color, p1.state, 14);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // 2. Vertex Nodes
    const dotR = Math.max(1.8, Math.min(6.5, strokeW * (this.connectLines ? 1.3 : 1.6))) * this.dotSizeMultiplier;
    for (let i = 0; i < n; i++) {
      const p = points[i];
      const color = this.getColor(p.val, maxVal, p.state);

      ctx.fillStyle = color;
      this.applyGlow(ctx, color, p.state, 14);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.state !== 'default' ? dotR * 1.7 : dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // 4. Archimedean Galaxy Ribbon
  renderSpiral(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const maxR = Math.min(cx, cy) * 0.84;
    const minR = 20.0;

    const turns = Math.min(6.5, Math.max(2.5, Math.sqrt(n) * 0.32));
    const totalAngle = turns * Math.PI * 2;

    const points = new Array(n);
    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const angle = (i / (n - 1 || 1)) * totalAngle;
      const r = minR + (val / maxVal) * (maxR - minR);
      points[i] = {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        val: val,
        state: activeStates[i] || 'default'
      };
    }

    ctx.lineWidth = Math.max(1.5, Math.min(4.0, (maxR / n) * 4.0));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.connectLines) {
      for (let i = 0; i < n - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const color = this.getColor(p1.val, maxVal, p1.state);

        ctx.strokeStyle = color;
        if (p1.state !== 'default' && this.bloomEnabled) {
          ctx.shadowColor = color;
          ctx.shadowBlur = Math.round(14 * this.glowMultiplier);
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    const dotR = Math.max(2.2, Math.min(6.5, (maxR / n) * 3.2)) * this.dotSizeMultiplier;
    for (let i = 0; i < n; i++) {
      const p = points[i];
      const color = this.getColor(p.val, maxVal, p.state);

      ctx.fillStyle = color;
      if (p.state !== 'default' && this.bloomEnabled) {
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.round(16 * this.glowMultiplier);
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.state !== 'default' ? dotR * 1.7 : dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // 5. Symmetric Pyramid Slices
  renderPyramid(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const pad = 50;
    const maxW = this.width * 0.72;
    const sliceH = (this.height - pad * 2) / n;
    const sliceGap = Math.min(sliceH * 0.45, this.gapSize * 0.5);
    const cx = this.width * 0.5;

    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const color = this.getColor(val, maxVal, state);

      const barW = (val / maxVal) * maxW;
      const y = pad + i * sliceH;
      const x = cx - barW * 0.5;

      ctx.fillStyle = color;
      if (state !== 'default' && this.bloomEnabled) {
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.round(10 * this.glowMultiplier);
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillRect(x, y, barW, Math.max(1, sliceH - sliceGap));
    }
    ctx.shadowBlur = 0;
  }

  // 6. 3D Isometric Voxel Pillars
  renderIsometric3D(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const cx = this.width * 0.5;
    const cy = this.height * 0.58;

    const tileW = Math.min(38, (this.width * 0.7) / (cols + rows));
    const tileH = tileW * 0.5;
    const maxPillarH = Math.min(180, this.height * 0.35);
    const spacingMult = 0.72 + (this.gapSize / 6.0) * 0.36;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= n) continue;

        const val = arr[idx];
        const state = activeStates[idx] || 'default';
        const pillarH = (val / maxVal) * maxPillarH;

        const isoX = cx + (c - r) * tileW * spacingMult;
        const isoY = cy + (c + r) * tileH * spacingMult;
        const topY = isoY - pillarH;
        const baseColor = this.getColor(val, maxVal, state);

        // Top Face
        ctx.fillStyle = baseColor;
        if (state !== 'default' && this.bloomEnabled) {
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = Math.round(12 * this.glowMultiplier);
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(isoX, topY - tileH * 0.5);
        ctx.lineTo(isoX + tileW * 0.5, topY);
        ctx.lineTo(isoX, topY + tileH * 0.5);
        ctx.lineTo(isoX - tileW * 0.5, topY);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Left Face
        ctx.fillStyle = this.getColor(val, maxVal, state, 0.7);
        ctx.beginPath();
        ctx.moveTo(isoX - tileW * 0.5, topY);
        ctx.lineTo(isoX, topY + tileH * 0.5);
        ctx.lineTo(isoX, isoY + tileH * 0.5);
        ctx.lineTo(isoX - tileW * 0.5, isoY);
        ctx.closePath();
        ctx.fill();

        // Right Face
        ctx.fillStyle = this.getColor(val, maxVal, state, 0.5);
        ctx.beginPath();
        ctx.moveTo(isoX, topY + tileH * 0.5);
        ctx.lineTo(isoX + tileW * 0.5, topY);
        ctx.lineTo(isoX + tileW * 0.5, isoY);
        ctx.lineTo(isoX, isoY + tileH * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // 7. 3D Rotating DNA Helix (Connected Strand + Nodes)
  renderHelix3D(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const helixH = this.height * 0.75;
    const baseR = Math.min(cx, cy) * 0.45;
    const turns = 3.0;

    const rawNodes = new Array(n);
    const fov = 480;

    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const angle = (i / (n - 1 || 1)) * turns * Math.PI * 2;
      const y3d = -helixH * 0.5 + (i / (n - 1 || 1)) * helixH;
      const r = baseR * (0.3 + 0.7 * (val / maxVal));

      const unrotX = Math.cos(angle) * r;
      const unrotY = y3d;
      const unrotZ = Math.sin(angle) * r;

      const rot = this.rotate3D(unrotX, unrotY, unrotZ);
      const scale = fov / (fov + rot.z);
      rawNodes[i] = {
        x: cx + rot.x * scale,
        y: cy + rot.y * scale,
        z: rot.z,
        scale: scale,
        val: val,
        state: state
      };
    }

    const strokeW = Math.max(1.5, Math.min(4.0, 3.0));
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';

    // Connect consecutive strand segments (if enabled)
    if (this.connectLines) {
      for (let i = 0; i < n - 1; i++) {
        const p1 = rawNodes[i];
        const p2 = rawNodes[i + 1];
        const color = this.getColor(p1.val, maxVal, p1.state);

        ctx.strokeStyle = color;
        if (p1.state !== 'default' && this.bloomEnabled) {
          ctx.shadowColor = color;
          ctx.shadowBlur = Math.round(14 * this.glowMultiplier);
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    const depthSortedNodes = [...rawNodes].sort((a, b) => b.z - a.z);

    for (let i = 0; i < n; i++) {
      const node = depthSortedNodes[i];
      const color = this.getColor(node.val, maxVal, node.state);
      const dotR = Math.max(2.0, Math.min(6.5, strokeW * (this.connectLines ? 1.3 : 1.6) * node.scale)) * this.dotSizeMultiplier;

      ctx.fillStyle = color;
      if (node.state !== 'default' && this.bloomEnabled) {
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.round(14 * this.glowMultiplier);
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // 8. 3D Geodesic Sphere Globe with 3D Coordinate XYZ Plane Grid
  renderGlobe3D(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const baseR = Math.min(cx, cy) * 0.52;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const fov = 500;

    // ── 3D Rotating Coordinate Floor Grid (XZ Plane) ──
    const gridSpan = baseR * 1.25;
    const gridSteps = 6;
    const stepSize = (gridSpan * 2) / gridSteps;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;

    for (let i = -gridSteps / 2; i <= gridSteps / 2; i++) {
      const pos = i * stepSize;

      // Lines parallel to Z
      const rot1 = this.rotate3D(pos, baseR * 0.7, -gridSpan);
      const rot2 = this.rotate3D(pos, baseR * 0.7, gridSpan);
      const s1 = fov / (fov + rot1.z);
      const s2 = fov / (fov + rot2.z);

      ctx.beginPath();
      ctx.moveTo(cx + rot1.x * s1, cy + rot1.y * s1);
      ctx.lineTo(cx + rot2.x * s2, cy + rot2.y * s2);
      ctx.stroke();

      // Lines parallel to X
      const rotZ1 = this.rotate3D(-gridSpan, baseR * 0.7, pos);
      const rotZ2 = this.rotate3D(gridSpan, baseR * 0.7, pos);
      const sz1 = fov / (fov + rotZ1.z);
      const sz2 = fov / (fov + rotZ2.z);

      ctx.beginPath();
      ctx.moveTo(cx + rotZ1.x * sz1, cy + rotZ1.y * sz1);
      ctx.lineTo(cx + rotZ2.x * sz2, cy + rotZ2.y * sz2);
      ctx.stroke();
    }

    // ── 3D XYZ Coordinate Axis Vectors ──
    const axisLen = baseR * 1.2;
    const axes = [
      { name: '+X', x: axisLen, y: 0, z: 0, color: 'rgba(244, 63, 94, 0.45)' },
      { name: '+Y', x: 0, y: -axisLen, z: 0, color: 'rgba(52, 211, 153, 0.45)' },
      { name: '+Z', x: 0, y: 0, z: axisLen, color: 'rgba(56, 189, 248, 0.45)' }
    ];

    axes.forEach(axis => {
      const rot = this.rotate3D(axis.x, axis.y, axis.z);
      const s = fov / (fov + rot.z);
      const px = cx + rot.x * s;
      const py = cy + rot.y * s;

      ctx.strokeStyle = axis.color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = axis.color;
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillText(axis.name, px + 3, py - 3);
    });

    const nodes = new Array(n);
    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';

      const phi = Math.acos(1 - 2 * (i + 0.5) / n);
      const theta = 2 * Math.PI * i / goldenRatio;

      const r = baseR * (0.82 + (val / maxVal) * 0.42);
      const unrotX = r * Math.sin(phi) * Math.cos(theta);
      const unrotY = r * Math.cos(phi);
      const unrotZ = r * Math.sin(phi) * Math.sin(theta);

      const rot = this.rotate3D(unrotX, unrotY, unrotZ);
      const scale = fov / (fov + rot.z);
      nodes[i] = {
        x: cx + rot.x * scale,
        y: cy + rot.y * scale,
        z: rot.z,
        scale: scale,
        val: val,
        state: state
      };
    }

    nodes.sort((a, b) => b.z - a.z);

    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      const color = this.getColor(node.val, maxVal, node.state);
      const dotR = Math.max(1.8, Math.min(6.5, 4.2 * node.scale)) * this.dotSizeMultiplier;

      ctx.fillStyle = color;
      if (node.state !== 'default' && this.bloomEnabled) {
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.round(14 * this.glowMultiplier);
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // 9. 3D Rotating Donut Torus (Connected Orbital Loop + Nodes)
  renderTorus3D(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const R = Math.min(cx, cy) * 0.5;
    const r = R * 0.35;
    const fov = 480;

    const rawNodes = new Array(n);
    const loops = 4.0;

    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const u = (i / (n - 1 || 1)) * Math.PI * 2 * loops;
      const v = (i / (n - 1 || 1)) * Math.PI * 2;

      const tubeR = r * (0.4 + 0.6 * (val / maxVal));
      const unrotX = (R + tubeR * Math.cos(u)) * Math.cos(v);
      const unrotY = (R + tubeR * Math.cos(u)) * Math.sin(v) * 0.45 + tubeR * Math.sin(u) * 0.9;
      const unrotZ = (R + tubeR * Math.cos(u)) * Math.sin(v);

      const rot = this.rotate3D(unrotX, unrotY, unrotZ);
      const scale = fov / (fov + rot.z);
      rawNodes[i] = {
        x: cx + rot.x * scale,
        y: cy + rot.y * scale,
        z: rot.z,
        scale: scale,
        val: val,
        state: state
      };
    }

    const strokeW = Math.max(1.5, Math.min(3.5, 2.5));
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';

    // Connect toroidal path (if enabled)
    if (this.connectLines) {
      for (let i = 0; i < n - 1; i++) {
        const p1 = rawNodes[i];
        const p2 = rawNodes[i + 1];
        const color = this.getColor(p1.val, maxVal, p1.state);

        ctx.strokeStyle = color;
        if (p1.state !== 'default' && this.bloomEnabled) {
          ctx.shadowColor = color;
          ctx.shadowBlur = Math.round(14 * this.glowMultiplier);
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    const depthSortedNodes = [...rawNodes].sort((a, b) => b.z - a.z);

    for (let i = 0; i < n; i++) {
      const node = depthSortedNodes[i];
      const color = this.getColor(node.val, maxVal, node.state);
      const dotR = Math.max(2.0, Math.min(6.5, strokeW * (this.connectLines ? 1.3 : 1.6) * node.scale)) * this.dotSizeMultiplier;

      ctx.fillStyle = color;
      if (node.state !== 'default' && this.bloomEnabled) {
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.round(14 * this.glowMultiplier);
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // 10. 3D Holographic Cylinder
  renderCylinder3D(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const radius = Math.min(cx, cy) * 0.55;
    const height3D = this.height * 0.45;
    const fov = 450;

    const nodes = new Array(n);
    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const angle = (i / (n - 1 || 1)) * Math.PI * 2 + this.rotAngle;

      const x3d = Math.cos(angle) * radius;
      const z3d = Math.sin(angle) * radius;
      const barH = (val / maxVal) * height3D;

      const scale = fov / (fov + z3d);
      const projX = cx + x3d * scale;
      const projY = cy + (height3D * 0.35) * scale;
      const topY = projY - barH * scale;

      nodes[i] = {
        x: projX,
        y: projY,
        topY: topY,
        z: z3d,
        scale: scale,
        val: val,
        state: state
      };
    }

    nodes.sort((a, b) => b.z - a.z);

    const rawBarW = (Math.PI * 2 * radius / n) * 0.75;
    const barW = Math.max(1.0, rawBarW - this.gapSize * 0.5);

    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      const color = this.getColor(node.val, maxVal, node.state);

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.8, barW * node.scale);
      ctx.lineCap = 'round';

      if (node.state !== 'default' && this.bloomEnabled) {
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.round(14 * this.glowMultiplier);
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(node.x, node.topY);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // 11. 3D Infinite Warp Tunnel (High-Performance GPU-Optimized Rendering)
  renderTunnel3D(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const maxR = Math.min(cx, cy) * 0.85;

    // Dynamic Level of Detail (LOD) stride to prevent rasterizer saturation at N > 256
    const step = n > 512 ? 4 : (n > 256 ? 2 : 1);
    const activeIndices = new Set();

    // Collect all active comparison/swap indices so they are ALWAYS rendered with high priority
    for (let key in activeStates) {
      if (activeStates[key] && activeStates[key] !== 'default') {
        activeIndices.add(parseInt(key, 10));
      }
    }

    // 1. Render Background Warp Stream Depth Rays
    const warpRayCount = 12;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let j = 0; j < warpRayCount; j++) {
      const theta = (j / warpRayCount) * Math.PI * 2 + this.rotAngle * 0.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(theta) * 15, cy + Math.sin(theta) * 10);
      ctx.lineTo(cx + Math.cos(theta) * maxR, cy + Math.sin(theta) * (maxR * 0.7));
      ctx.stroke();
    }

    // 2. Render Tunnel Rings (Batch rendering for default rings, high-fidelity bloom for active rings)
    for (let i = 0; i < n; i++) {
      const isActive = activeIndices.has(i);
      // Skip non-active rings according to LOD step
      if (!isActive && (i % step !== 0) && i !== n - 1) continue;

      const val = arr[i];
      const state = activeStates[i] || 'default';
      const color = this.getColor(val, maxVal, state);

      const zFrac = i / (n - 1 || 1);
      const r = Math.pow(zFrac, 1.35) * maxR;
      if (r < 2.0) continue; // Skip sub-pixel singularity at center

      const angle = this.rotAngle * 0.5 + (val / maxVal) * Math.PI * 0.8;

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.0, zFrac * 3.2 * (isActive ? 1.5 : 1.0));

      if (isActive && this.bloomEnabled) {
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.round(14 * this.glowMultiplier);
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.68, angle, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // 12. 3D Terrain Heightfield Mesh
  renderMesh3D(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const cx = this.width * 0.5;
    const cy = this.height * 0.62;

    const spacingMult = 0.8 + (this.gapSize / 6.0) * 0.4;
    const spacingX = Math.min(36, ((this.width * 0.65) / cols) * spacingMult);
    const spacingY = spacingX * 0.5;
    const maxMeshH = this.height * 0.3;

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const idx = r * cols + c;
        if (idx >= n) continue;

        const val = arr[idx];
        const state = activeStates[idx] || 'default';
        const color = this.getColor(val, maxVal, state);

        const x = cx + (c - cols * 0.5) * spacingX;
        const y = cy + (r - rows * 0.5) * spacingY - (val / maxVal) * maxMeshH;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;

        if (state !== 'default' && this.bloomEnabled) {
          ctx.shadowColor = color;
          ctx.shadowBlur = Math.round(10 * this.glowMultiplier);
        } else {
          ctx.shadowBlur = 0;
        }

        const nextX = cx + ((c + 1) - cols * 0.5) * spacingX;
        const nextIdx = r * cols + (c + 1);
        const nextVal = nextIdx < n ? arr[nextIdx] : val;
        const nextY = cy + (r - rows * 0.5) * spacingY - (nextVal / maxVal) * maxMeshH;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nextX, nextY);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
  }

  // 13. Audio Waveform Oscilloscope
  renderWaveform(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const padX = 50;
    const cy = this.height * 0.5;
    const availW = this.width - padX * 2;
    const maxAmp = this.height * 0.38;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, cy);
    ctx.lineTo(padX + availW, cy);
    ctx.stroke();

    ctx.lineWidth = Math.max(1.5, Math.min(4.0, (availW / n) * 1.5));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < n - 1; i++) {
      const val1 = arr[i];
      const val2 = arr[i + 1];
      const state1 = activeStates[i] || 'default';

      const x1 = padX + (i / (n - 1 || 1)) * availW;
      const amp1 = ((val1 / maxVal) * 2 - 1) * maxAmp;
      const y1 = cy - amp1;

      const x2 = padX + ((i + 1) / (n - 1 || 1)) * availW;
      const amp2 = ((val2 / maxVal) * 2 - 1) * maxAmp;
      const y2 = cy - amp2;

      const color = this.getColor(val1, maxVal, state1);
      ctx.strokeStyle = color;

      if (state1 !== 'default' && this.bloomEnabled) {
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.round(14 * this.glowMultiplier);
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // 14. Color Disparity Matrix Heatmap
  renderHeatmap(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cols = Math.ceil(Math.sqrt(n * (this.width / this.height)));
    const rows = Math.ceil(n / cols);

    const pad = 60;
    const availW = this.width - pad * 2;
    const availH = this.height - pad * 2;
    const tileW = availW / cols;
    const tileH = availH / rows;
    const cellGap = Math.min(tileW * 0.4, this.gapSize * 0.7);

    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const c = i % cols;
      const r = Math.floor(i / cols);

      const x = pad + c * tileW;
      const y = pad + r * tileH;
      const color = this.getColor(val, maxVal, state);

      ctx.fillStyle = color;
      if (state !== 'default' && this.bloomEnabled) {
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.round(12 * this.glowMultiplier);
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillRect(x + cellGap * 0.5, y + cellGap * 0.5, Math.max(1, tileW - cellGap), Math.max(1, tileH - cellGap));
    }
    ctx.shadowBlur = 0;
  }

  // 15. Concentric Radar Rings
  renderRadarRings(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const maxR = Math.min(cx, cy) * 0.82;
    const rawRingW = (maxR / n) * 0.85;
    const ringW = Math.max(1.0, rawRingW - this.gapSize * 0.45);

    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const color = this.getColor(val, maxVal, state);

      const r = (val / maxVal) * maxR;
      ctx.strokeStyle = color;
      ctx.lineWidth = ringW;

      if (state !== 'default' && this.bloomEnabled) {
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.round(12 * this.glowMultiplier);
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, r), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // 16. Fermat Sunflower Phyllotaxis (Connected Spiral Path + Nodes)
  renderPhyllotaxis(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const maxR = Math.min(cx, cy) * 0.82;
    const goldenAngle = 137.507764 * (Math.PI / 180);

    const points = new Array(n);
    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const angle = i * goldenAngle + this.rotAngle;
      const r = Math.sqrt((i + 1) / n) * maxR * (0.25 + 0.75 * (val / maxVal));
      points[i] = {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        val: val,
        state: state
      };
    }

    const strokeW = Math.max(1.5, Math.min(3.5, 2.2));
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';

    // Connect phyllotaxis petal curve (if enabled)
    if (this.connectLines) {
      for (let i = 0; i < n - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const color = this.getColor(p1.val, maxVal, p1.state);

        ctx.strokeStyle = color;
        this.applyGlow(ctx, color, p1.state, 14);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    for (let i = 0; i < n; i++) {
      const p = points[i];
      const color = this.getColor(p.val, maxVal, p.state);
      const dotR = Math.max(2.0, Math.min(7.0, strokeW * (this.connectLines ? 1.3 : 1.6))) * this.dotSizeMultiplier;

      ctx.fillStyle = color;
      this.applyGlow(ctx, color, p.state, 14);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.state !== 'default' ? dotR * 1.6 : dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // 17. Transcendental Butterfly Curve (Connected Wing Polyline + Nodes)
  renderButterfly(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const scale = Math.min(cx, cy) * 0.38;

    const points = new Array(n);
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1 || 1)) * Math.PI * 12 + this.rotAngle;
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const r = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.pow(Math.sin(t / 12), 5);
      const amp = r * scale * (0.3 + 0.7 * (val / maxVal));
      points[i] = {
        x: cx + Math.sin(t) * amp,
        y: cy - Math.cos(t) * amp,
        val: val,
        state: state
      };
    }

    const strokeW = Math.max(1.5, Math.min(3.5, 2.2));
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';

    if (this.connectLines) {
      for (let i = 0; i < n - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const color = this.getColor(p1.val, maxVal, p1.state);

        ctx.strokeStyle = color;
        this.applyGlow(ctx, color, p1.state, 12);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    for (let i = 0; i < n; i++) {
      const p = points[i];
      const color = this.getColor(p.val, maxVal, p.state);
      const dotR = Math.max(1.8, Math.min(6.0, strokeW * (this.connectLines ? 1.3 : 1.6))) * this.dotSizeMultiplier;

      ctx.fillStyle = color;
      this.applyGlow(ctx, color, p.state, 12);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.state !== 'default' ? dotR * 1.6 : dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // 18. 3D Lissajous Harmonic Knot (Connected 3D Path + Nodes)
  renderLissajous3D(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const scaleR = Math.min(cx, cy) * 0.65;
    const fov = 450;

    const rawNodes = new Array(n);
    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const t = (i / (n - 1 || 1)) * Math.PI * 2 + this.rotAngle;

      const r = scaleR * (0.4 + 0.6 * (val / maxVal));
      const x3d = Math.sin(3 * t) * r;
      const y3d = Math.sin(4 * t) * r * 0.7;
      const z3d = Math.cos(5 * t) * r;

      const scale = fov / (fov + z3d);
      rawNodes[i] = {
        x: cx + x3d * scale,
        y: cy + y3d * scale,
        z: z3d,
        scale: scale,
        val: val,
        state: state
      };
    }

    const strokeW = Math.max(1.5, Math.min(3.5, 2.5));
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';

    if (this.connectLines) {
      for (let i = 0; i < n - 1; i++) {
        const p1 = rawNodes[i];
        const p2 = rawNodes[i + 1];
        const color = this.getColor(p1.val, maxVal, p1.state);

        ctx.strokeStyle = color;
        this.applyGlow(ctx, color, p1.state, 14);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    const depthSortedNodes = [...rawNodes].sort((a, b) => b.z - a.z);

    for (let i = 0; i < n; i++) {
      const node = depthSortedNodes[i];
      const color = this.getColor(node.val, maxVal, node.state);
      const dotR = Math.max(2.0, Math.min(6.5, strokeW * (this.connectLines ? 1.3 : 1.6) * node.scale)) * this.dotSizeMultiplier;

      ctx.fillStyle = color;
      this.applyGlow(ctx, color, node.state, 14);

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.state !== 'default' ? dotR * 1.6 : dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // 19. Supernova Starburst Rays
  renderStarburst(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const maxR = Math.min(cx, cy) * 0.88;

    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const color = this.getColor(val, maxVal, state);

      const angle = (i / n) * Math.PI * 2 + this.rotAngle * 0.3;
      const len = (val / maxVal) * maxR;
      const rawRayW = (Math.PI * 2 * maxR / n) * 0.8;

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.0, rawRayW - this.gapSize * 0.55);
      ctx.lineCap = 'round';

      this.applyGlow(ctx, color, state, 14);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // 20. Constellation Proximity Graph
  renderConstellation(arr, maxVal, activeStates) {
    const ctx = this.ctx;
    const n = arr.length;
    const pad = 60;
    const availW = this.width - pad * 2;
    const availH = this.height - pad * 2;

    const points = new Array(n);
    for (let i = 0; i < n; i++) {
      const val = arr[i];
      const state = activeStates[i] || 'default';
      const x = pad + (i / (n - 1 || 1)) * availW;
      const y = this.height - pad - (val / maxVal) * availH;
      points[i] = { x, y, val, state };
    }

    // Connect proximity graph lines
    const maxDist = Math.max(40, availW / (n * 0.3));
    ctx.lineWidth = 1;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < Math.min(n, i + 6); j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = 1.0 - (dist / maxDist);
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.45})`;
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      }
    }

    // Nodes
    const dotR = Math.max(2.0, Math.min(6.5, (availW / n) * 0.9)) * this.dotSizeMultiplier;
    for (let i = 0; i < n; i++) {
      const p = points[i];
      const color = this.getColor(p.val, maxVal, p.state);

      ctx.fillStyle = color;
      this.applyGlow(ctx, color, p.state, 14);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.state !== 'default' ? dotR * 1.8 : dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}
