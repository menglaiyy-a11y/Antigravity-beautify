/**
 * Antigravity V2 - OceanRenderer (晶格海洋 WebGL 粒子波浪渲染引擎)
 * 职责：纯粹的 WebGL 着色器动力学引擎，负责粒子流体波浪模拟与鼠标涟漪冲击波
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

const VS_SRC = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FS_SRC = `
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

    // 视角倾斜与波浪动态
    float rad = radians(u_gridAngle);
    mat2 rot = mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
    vec2 rotP = rot * p;

    float t = u_time * u_swellSpeed * 0.45;
    float wave = snoise(rotP * 2.2 + vec2(t * 0.35, t * 0.22)) * 0.28;
    wave += sin(rotP.x * 3.5 + t * 1.8) * cos(rotP.y * 3.5 + t * 1.2) * 0.16;

    // 涟漪积分
    for (int i = 0; i < 8; i++) {
      vec4 r = u_ripples[i];
      if (r.z > 0.0) {
        float rAge = r.z;
        float rDist = length((uv - r.xy) * vec2(aspect, 1.0));
        float ringRadius = rAge * 0.55;
        float ring = exp(-pow(rDist - ringRadius, 2.0) * 85.0);
        float decay = max(0.0, 1.0 - rAge * 0.45);
        wave += ring * sin((rDist - ringRadius) * 35.0) * r.w * decay * u_rippleForce * 0.45;
      }
    }

    // 晶格点阵采样
    float density = max(12.0, u_gridDensity);
    vec2 gridUv = fract(rotP * density + wave * 0.35) - 0.5;
    float dist = sdDiamondStar(gridUv, max(0.2, u_starSharpness));
    float star = smoothstep(0.38, 0.02, dist);

    // 4色流体渐变
    float spread = max(0.2, u_colorSpread);
    float colorNoise = snoise(rotP * 0.8 * spread + vec2(t * 0.15, -t * 0.1)) * 0.5 + 0.5;
    vec3 gradA = mix(u_col1, u_col2, smoothstep(0.0, 0.5, colorNoise));
    vec3 gradB = mix(u_col3, u_col4, smoothstep(0.5, 1.0, colorNoise));
    vec3 baseColor = mix(gradA, gradB, smoothstep(0.25, 0.75, uv.x));

    float alpha = star * u_intensity * (0.8 + wave * 0.3 + u_voiceLevel * 0.4);
    gl_FragColor = vec4(baseColor * alpha, alpha);
  }
`;

export class OceanRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.program = null;
    this.animId = null;
    this.running = false;
    this.simTime = 0.0;
    this.lastFrameTime = 0;
    this.ripples = Array.from({ length: 8 }, () => [0.5, 0.5, -10.0, 0.0]);
    this.rippleCursor = 0;
    this.uniformLocs = {};
    this.config = {
      palette: 'gemini',
      gridDensity: 28.0,
      starSharpness: 0.65,
      gridAngle: 25.0,
      swellSpeed: 1.0,
      rippleForce: 1.2,
      intensity: 0.92,
      colorSpread: 1.0
    };
  }

  init() {
    if (!this.canvas) return false;
    try {
      this.gl = this.canvas.getContext('webgl', {
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      });
      if (!this.gl) return false;

      const gl = this.gl;
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, VS_SRC);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, FS_SRC);
      gl.compileShader(fs);

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      this.program = prog;

      const posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
      ]), gl.STATIC_DRAW);

      const aPos = gl.getAttribLocation(prog, 'a_position');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // 缓存 uniforms 位置
      const uniforms = [
        'u_resolution', 'u_time', 'u_mouse', 'u_intensity', 'u_voiceLevel',
        'u_gridDensity', 'u_starSharpness', 'u_gridAngle', 'u_swellSpeed',
        'u_rippleForce', 'u_colorSpread', 'u_col1', 'u_col2', 'u_col3', 'u_col4'
      ];
      uniforms.forEach(u => {
        this.uniformLocs[u] = gl.getUniformLocation(prog, u);
      });

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
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 600;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  render() {
    if (!this.running || !this.gl) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
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

    // 更新涟漪年龄
    for (let i = 0; i < 8; i++) {
      if (this.ripples[i][2] >= 0.0) {
        this.ripples[i][2] += dt * 1.5;
        if (this.ripples[i][2] > 2.5) {
          this.ripples[i][2] = -10.0;
        }
      }
      const loc = gl.getUniformLocation(this.program, `u_ripples[${i}]`);
      if (loc) {
        gl.uniform4fv(loc, this.ripples[i]);
      }
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.animId = requestAnimationFrame(() => this.render());
  }
}
