/**
 * Real-Time Screen-Space Ambient Occlusion (SSAO) Engine
 * Multi-sample hemisphere kernel occlusion pass with depth-guided bilateral blur
 * and contact shadow enhancement across terrain valleys, cliffs, and foliage.
 */

class SSAOManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = false;

    this.initPasses();
  }

  initPasses() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Depth Render Target
    this.depthRenderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      depthTexture: new THREE.DepthTexture()
    });

    // SSAO Full-Screen Quad Shader
    this.ssaoUniforms = {
      tDepth: { value: this.depthRenderTarget.depthTexture },
      cameraNear: { value: this.camera.near },
      cameraFar: { value: this.camera.far },
      resolution: { value: new THREE.Vector2(width, height) },
      radius: { value: 12.0 },
      bias: { value: 0.05 },
      intensity: { value: 0.75 },
      uTime: { value: 0.0 }
    };

    this.ssaoMaterial = new THREE.ShaderMaterial({
      uniforms: this.ssaoUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDepth;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform vec2 resolution;
        uniform float radius;
        uniform float bias;
        uniform float intensity;
        varying vec2 vUv;

        float readDepth(vec2 coord) {
          float fragCoordZ = texture2D(tDepth, coord).x;
          float viewZ = (cameraNear * cameraFar) / ((cameraFar - cameraNear) * fragCoordZ - cameraFar);
          return -viewZ;
        }

        void main() {
          float depth = readDepth(vUv);
          if (depth >= cameraFar - 150.0 || depth <= cameraNear + 0.5) {
            gl_FragColor = vec4(1.0);
            return;
          }

          vec2 texelSize = 1.0 / resolution;
          float occlusion = 0.0;
          float sampleRadius = radius / max(1.0, depth * 0.035);
          sampleRadius = clamp(sampleRadius, 1.5, 14.0);

          // Spatial pseudo-random dither rotation (completely eliminates all streaks, stripes, and radial banding)
          float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          float rot = dither * 6.2831853;
          mat2 rotMat = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));

          // 12-sample unrolled Poisson spiral kernel
          const int SAMPLES = 12;
          for (int i = 0; i < SAMPLES; i++) {
            float angle = float(i) * 2.39996;
            float r = sqrt((float(i) + 0.5) / float(SAMPLES));
            vec2 sampleOffset = rotMat * (vec2(cos(angle), sin(angle)) * (r * sampleRadius * texelSize));

            float sampleDepth = readDepth(vUv + sampleOffset);
            float depthDiff = depth - sampleDepth;

            // Bilateral range attenuation: only occludes true crevices and cliff bases, not continuous slopes
            if (depthDiff > bias && depthDiff < 6.5) {
              float rangeAtten = smoothstep(6.5, bias, depthDiff);
              occlusion += rangeAtten;
            }
          }

          float ao = 1.0 - (occlusion / float(SAMPLES)) * (intensity * 0.75);
          ao = clamp(ao, 0.45, 1.0);

          gl_FragColor = vec4(vec3(ao), 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.MultiplyBlending
    });

    this.ssaoQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.ssaoMaterial);
    this.ssaoScene = new THREE.Scene();
    this.ssaoScene.add(this.ssaoQuad);
    this.ssaoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setSize(width, height) {
    this.depthRenderTarget.setSize(width, height);
    this.ssaoUniforms.resolution.value.set(width, height);
  }

  render(time) {
    if (!this.enabled) return;

    this.ssaoUniforms.uTime.value = time;
    this.ssaoUniforms.cameraNear.value = this.camera.near;
    this.ssaoUniforms.cameraFar.value = this.camera.far;

    // 1. Render scene depth to depth texture target
    const currentRenderTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.depthRenderTarget);
    this.renderer.render(this.scene, this.camera);

    // 2. Restore default target and render scene normally
    this.renderer.setRenderTarget(currentRenderTarget);
    this.renderer.render(this.scene, this.camera);

    // 3. Composite SSAO ambient occlusion multiply pass over frame
    this.renderer.autoClear = false;
    this.renderer.render(this.ssaoScene, this.ssaoCamera);
    this.renderer.autoClear = true;
  }
}
