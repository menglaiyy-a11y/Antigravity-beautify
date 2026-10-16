/**
 * Antigravity V2 - OceanRenderer (晶格海洋 WebGL 粒子波浪渲染引擎)
 * 职责：纯粹的 WebGL 着色器动力学引擎，负责粒子流体波浪模拟与鼠标涟漪冲击波
 * 优化：预缓存全量 Uniform Location、可见性休眠、DPR 视口降阶防护
 */

export const OCEAN_PALETTES = {
  gemini: ['#2980ff', '#0ac2ff', '#ad85f2', '#f570b3'],
  argon: ['#0d6bff', '#00dbff', '#26f2cc', '#618aff'],
  antigravity: ['#7a47fa', '#e05cf0', '#ffa847', '#5299ff'],
  emerald: ['#0ad199', '#1ff5d9', '#38a8ff', '#99fa70'],
  miku: ['#39c5bb', '#66f0e6', '#3b82f6', '#c084fc'],
  sunset: ['#f43f5e', '#fb7185', '#f59e0b', '#8b5cf6']
};

export function hexToRgbNorm(hex) {
  const clean = (hex || '#000000').replace('#', '');
  const num = parseInt(clean, 16);
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255
  ];
}

const OCEAN_VS_SRC = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const OCEAN_FS_SRC = `
  precision highp float;
  varying vec2 v_uv;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_intensity;
  uniform float u_voiceLevel;
  uniform float u_gridDensity;
  uniform float u_starSharpness;
  uniform float u_gridAngle;
  uniform float u_swellSpeed;
  uniform float u_rippleForce;
  uniform float u_parallax;
  uniform int u_shapeType;
  uniform float u_morphEnabled;
  uniform float u_emblemEnabled;
  uniform float u_emblemScale;
  uniform vec3 u_col1;
  uniform vec3 u_col2;
  uniform vec3 u_col3;
  uniform vec3 u_col4;
  uniform float u_colorSpread;
  uniform vec4 u_ripples[8];

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float sdDiamondStar(vec2 p, float k) {
    vec2 ap = abs(p) + 1e-4;
    return pow(pow(ap.x, k) + pow(ap.y, k), 1.0 / k);
  }

  void main() {
    vec2 uv = v_uv;
    float aspect = u_resolution.x / max(1.0, u_resolution.y);
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    float rad = radians(u_gridAngle);
    float cosA = cos(rad), sinA = sin(rad);
    mat2 rot = mat2(cosA, -sinA, sinA, cosA);
    vec2 rotP = rot * p;

    float t = u_time * u_swellSpeed * 0.45;
    float wave = snoise(rotP * 2.2 + vec2(t * 0.6, -t * 0.4)) * 0.5;
    wave += snoise(rotP * 4.5 - vec2(t * 0.3, t * 0.5)) * 0.25;

    float totalRipple = 0.0;
    for (int i = 0; i < 8; i++) {
      vec4 rip = u_ripples[i];
      if (rip.z >= 0.0) {
        vec2 ripPos = (rip.xy - 0.5) * vec2(aspect, 1.0);
        float d = distance(p, ripPos);
        float ripWave = sin(d * 32.0 - rip.z * 10.0) * exp(-d * 3.5) * exp(-rip.z * 1.4);
        totalRipple += ripWave * rip.w * u_rippleForce;
      }
    }

    vec2 distortP = rotP + vec2(wave * 0.08, totalRipple * 0.06);
    float cells = max(12.0, u_gridDensity * 32.0);
    vec2 cellCoord = fract(distortP * cells) - 0.5;
    vec2 cellId = floor(distortP * cells);

    float dShape = sdDiamondStar(cellCoord, mix(1.8, 0.7, u_starSharpness));
    float star = smoothstep(0.38, 0.02, dShape);

    float brightness = star * (0.45 + wave * 0.5 + totalRipple * 0.4);
    brightness *= u_intensity;

    float gradT = clamp((distortP.y + 0.5) * u_colorSpread, 0.0, 1.0);
    vec3 gradCol = mix(mix(u_col1, u_col2, smoothstep(0.0, 0.5, gradT)), mix(u_col3, u_col4, smoothstep(0.5, 1.0, gradT)), gradT);

    vec3 finalRgb = gradCol * brightness * 1.35;
    gl_FragColor = vec4(finalRgb, clamp(brightness * 0.85, 0.0, 1.0));
  }
`;

export class OceanRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.program = null;
    this.animId = null;
    this.running = false;
    this.isVisible = true;
    this.uniformLocs = {};
    this.rippleLocs = [];
    this.lastFrameTime = performance.now();
    this.simTime = 0;
    this.ripples = Array.from({ length: 8 }, () => [0, 0, -10.0, 0]);
    this.rippleCursor = 0;

    this.config = {
      palette: 'gemini',
      intensity: 0.95,
      gridDensity: 1.0,
      starSharpness: 0.65,
      gridAngle: 25.0,
      swellSpeed: 1.0,
      rippleForce: 1.0,
      colorSpread: 1.15
    };

    // 绑定可见性监听，避免后台无谓消耗 GPU
    this.handleVisibilityChange = () => {
      this.isVisible = !document.hidden;
      if (!this.isVisible && this.running && this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      } else if (this.isVisible && this.running && !this.animId) {
        this.lastFrameTime = performance.now();
        this.render();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  init() {
    if (!this.canvas) return false;
    try {
      this.gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      });
      if (!this.gl) return false;

      const gl = this.gl;
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, OCEAN_VS_SRC);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, OCEAN_FS_SRC);
      gl.compileShader(fs);

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      this.program = prog;

      const quadBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
      ]), gl.STATIC_DRAW);

      const aPos = gl.getAttribLocation(prog, 'a_position');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // 全量缓存 uniforms 位置，彻底杜绝在每一帧 rAF 循环中 getUniformLocation 造成微卡顿
      const uniforms = [
        'u_resolution', 'u_time', 'u_mouse', 'u_intensity', 'u_voiceLevel',
        'u_gridDensity', 'u_starSharpness', 'u_gridAngle', 'u_swellSpeed',
        'u_rippleForce', 'u_colorSpread', 'u_col1', 'u_col2', 'u_col3', 'u_col4'
      ];
      uniforms.forEach(u => {
        this.uniformLocs[u] = gl.getUniformLocation(prog, u);
      });

      // 预先缓存 8 组涟漪 uniform 位置
      this.rippleLocs = [];
      for (let i = 0; i < 8; i++) {
        this.rippleLocs[i] = gl.getUniformLocation(prog, `u_ripples[${i}]`);
      }

      return true;
    } catch (e) {
      console.warn('[OceanRenderer] WebGL 初始化失败:', e);
      return false;
    }
  }

  spawnRipple(x, y, force = 1.0) {
    this.ripples[this.rippleCursor] = [x, y, 0.01, force];
    this.rippleCursor = (this.rippleCursor + 1) % 8;
  }

  start() {
    if (this.running) return;
    if (!this.gl && !this.init()) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.render();
  }

  stop() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.gl) {
      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
  }

  resize() {
    if (!this.canvas || !this.gl) return;
    // 视口降阶保护：高分屏限制 DPR 最大为 1.25，降低 70% 片段着色器计算负荷
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const w = Math.floor((this.canvas.clientWidth || 800) * dpr);
    const h = Math.floor((this.canvas.clientHeight || 600) * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  render() {
    if (!this.running || !this.gl || !this.isVisible) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    this.simTime += dt;

    this.resize();
    const gl = this.gl;
    gl.useProgram(this.program);

    gl.uniform2f(this.uniformLocs['u_resolution'], this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniformLocs['u_time'], this.simTime);
    gl.uniform1f(this.uniformLocs['u_intensity'], this.config.intensity);
    gl.uniform1f(this.uniformLocs['u_gridDensity'], this.config.gridDensity);
    gl.uniform1f(this.uniformLocs['u_starSharpness'], this.config.starSharpness);
    gl.uniform1f(this.uniformLocs['u_gridAngle'], this.config.gridAngle);
    gl.uniform1f(this.uniformLocs['u_swellSpeed'], this.config.swellSpeed);
    gl.uniform1f(this.uniformLocs['u_rippleForce'], this.config.rippleForce);
    gl.uniform1f(this.uniformLocs['u_colorSpread'], this.config.colorSpread);

    // 调色盘
    const colors = OCEAN_PALETTES[this.config.palette] || OCEAN_PALETTES.gemini;
    const c1 = hexToRgbNorm(colors[0]);
    const c2 = hexToRgbNorm(colors[1]);
    const c3 = hexToRgbNorm(colors[2]);
    const c4 = hexToRgbNorm(colors[3]);
    gl.uniform3f(this.uniformLocs['u_col1'], c1[0], c1[1], c1[2]);
    gl.uniform3f(this.uniformLocs['u_col2'], c2[0], c2[1], c2[2]);
    gl.uniform3f(this.uniformLocs['u_col3'], c3[0], c3[1], c3[2]);
    gl.uniform3f(this.uniformLocs['u_col4'], c4[0], c4[1], c4[2]);

    // 更新涟漪年龄 (直接使用预缓存的 rippleLocs)
    for (let i = 0; i < 8; i++) {
      if (this.ripples[i][2] >= 0.0) {
        this.ripples[i][2] += dt * 1.5;
        if (this.ripples[i][2] > 2.5) {
          this.ripples[i][2] = -10.0;
        }
      }
      const loc = this.rippleLocs[i];
      if (loc) {
        gl.uniform4fv(loc, this.ripples[i]);
      }
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.animId = requestAnimationFrame(() => this.render());
  }
}
