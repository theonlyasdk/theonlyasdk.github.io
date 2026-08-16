/**
 * High-Performance FXAA 3.11 Anti-Aliasing Engine
 * Subpixel edge detection, luma-gradient filtering, and polygon anti-aliasing
 * eliminates jagged edges, triangle staircasing, and foliage shimmering.
 */

class FXAAManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = true;

    this.initPass();
  }

  initPass() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = this.renderer.getPixelRatio();

    // Scene color render target
    this.renderTarget = new THREE.WebGLRenderTarget(
      Math.floor(width * pixelRatio),
      Math.floor(height * pixelRatio),
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: true,
        stencilBuffer: false
      }
    );

    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.orthoScene = new THREE.Scene();

    this.fxaaUniforms = {
      tDiffuse: { value: this.renderTarget.texture },
      resolution: { value: new THREE.Vector2(1.0 / (width * pixelRatio), 1.0 / (height * pixelRatio)) }
    };

    // Full-Screen FXAA 3.11 Shader
    this.fxaaMaterial = new THREE.ShaderMaterial({
      uniforms: this.fxaaUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        varying vec2 vUv;

        // NVIDIA FXAA 3.11 Quality Presets
        #define FXAA_REDUCE_MIN   (1.0 / 128.0)
        #define FXAA_REDUCE_MUL   (1.0 / 8.0)
        #define FXAA_SPAN_MAX     8.0

        float rgb2luma(vec3 rgb) {
          return dot(rgb, vec3(0.299, 0.587, 0.114));
        }

        void main() {
          vec3 rgbM = texture2D(tDiffuse, vUv).rgb;
          float lumaM = rgb2luma(rgbM);

          vec3 rgbNW = texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * resolution).rgb;
          vec3 rgbNE = texture2D(tDiffuse, vUv + vec2( 1.0, -1.0) * resolution).rgb;
          vec3 rgbSW = texture2D(tDiffuse, vUv + vec2(-1.0,  1.0) * resolution).rgb;
          vec3 rgbSE = texture2D(tDiffuse, vUv + vec2( 1.0,  1.0) * resolution).rgb;

          float lumaNW = rgb2luma(rgbNW);
          float lumaNE = rgb2luma(rgbNE);
          float lumaSW = rgb2luma(rgbSW);
          float lumaSE = rgb2luma(rgbSE);

          float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
          float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

          float lumaRange = lumaMax - lumaMin;

          // If contrast is below threshold, skip anti-aliasing to preserve crisp textures
          if (lumaRange < max(0.0416, lumaMax * 0.125)) {
            gl_FragColor = vec4(rgbM, 1.0);
            return;
          }

          vec2 dir;
          dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
          dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

          float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
          float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);

          dir = min(vec2(FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX), dir * rcpDirMin)) * resolution;

          vec3 rgbA = 0.5 * (
            texture2D(tDiffuse, vUv + dir * (1.0 / 3.0 - 0.5)).rgb +
            texture2D(tDiffuse, vUv + dir * (2.0 / 3.0 - 0.5)).rgb
          );

          vec3 rgbB = rgbA * 0.5 + 0.25 * (
            texture2D(tDiffuse, vUv + dir * -0.5).rgb +
            texture2D(tDiffuse, vUv + dir * 0.5).rgb
          );

          float lumaB = rgb2luma(rgbB);

          if (lumaB < lumaMin || lumaB > lumaMax) {
            gl_FragColor = vec4(rgbA, 1.0);
          } else {
            gl_FragColor = vec4(rgbB, 1.0);
          }
        }
      `,
      depthTest: false,
      depthWrite: false
    });

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.quadMesh = new THREE.Mesh(quadGeo, this.fxaaMaterial);
    this.orthoScene.add(this.quadMesh);
  }

  setSize(width, height) {
    const pixelRatio = this.renderer.getPixelRatio();
    const w = Math.floor(width * pixelRatio);
    const h = Math.floor(height * pixelRatio);
    this.renderTarget.setSize(w, h);
    this.fxaaUniforms.resolution.value.set(1.0 / w, 1.0 / h);
  }

  setEnabled(val) {
    this.enabled = val;
  }

  render() {
    if (!this.enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 1. Render main 3D scene to internal render target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // 2. Perform full-screen FXAA post-processing pass directly to canvas
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.orthoScene, this.orthoCamera);
  }
}
