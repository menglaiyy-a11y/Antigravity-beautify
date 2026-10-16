(function() {
  if (typeof window === 'undefined') return;

/**
 * Antigravity V2 - StorageBridge (跨上下文存储桥接单例)
 * 职责：在 Electron 隔离世界与页面主世界之间建立安全、受限的持久化配置通道
 */
class StorageBridge {
  constructor() {
    this.STORAGE_KEY = 'ag_theme_apple_config_v3';
    this.defaultConfig = {
      mode: 'native',
      accentHex: '#0a84ff',
      accentRgb: [10, 132, 255],
      tuneMode: 'global',
      globalOpacity: 0.50,
      globalBlur: 24,
      leftOpacity: 0.50,
      centerOpacity: 0.50,
      rightOpacity: 0.50,
      textureStyle: 'glass',
      customAssetType: 'image'
    };
  }

  /**
   * 同步读取本地极速缓存 (0ms 决策首帧)
   */
  readLocalConfig() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.mode === 'glacier') parsed.mode = 'native';
        return Object.assign({}, this.defaultConfig, parsed);
      }
    } catch (e) {}
    return Object.assign({}, this.defaultConfig);
  }

  /**
   * 保存配置至本地及宿主应用存储
   */
  saveConfig(config) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (e) {}

    // 触发 DOM 事件通知主世界桥接
    try {
      const event = new CustomEvent('ag-theme-storage-request', {
        detail: {
          method: 'updateItems',
          changes: { ag_theme_config_v1: JSON.stringify(config) }
        }
      });
      document.dispatchEvent(event);
    } catch (e) {}
  }
}

const storageBridge = new StorageBridge();


/**
 * Antigravity V2 - ThemeStateMachine (模态状态机)
 * 职责：严格控制 4 种视觉模态互斥运转，生命周期解耦，GPU 资源精准启停
 */
class ThemeStateMachine {
  constructor(initialConfig, renderers = {}) {
    this.config = Object.assign({}, initialConfig);
    this.renderers = renderers; // { ocean: OceanRenderer, aurora: AuroraRenderer }
    this.listeners = new Set();
  }

  init() {
    this.applyMode(this.config.mode || 'native');
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, payload) {
    this.listeners.forEach(fn => {
      try { fn(event, payload); } catch (e) {}
    });
  }

  setMode(mode) {
    if (this.config.mode === mode) return;
    this.config.mode = mode;
    this.applyMode(mode);
    this.notify('modeChange', mode);
  }

  applyMode(mode) {
    if (typeof document === 'undefined' || !document.body) return;

    // 1. 唯一设置全局模态互斥标记
    document.body.setAttribute('data-theme-mode', mode);

    // 2. 着色器渲染管线生命周期调度 (严格互斥与节电)
    if (this.renderers.ocean) {
      if (mode === 'ocean') {
        this.renderers.ocean.start();
      } else {
        this.renderers.ocean.stop();
      }
    }

    if (this.renderers.aurora) {
      if (mode === 'aurora') {
        this.renderers.aurora.start();
      } else {
        this.renderers.aurora.stop();
      }
    }
  }

  updateConfig(partial) {
    Object.assign(this.config, partial);
    this.notify('configChange', this.config);
  }

  getConfig() {
    return Object.assign({}, this.config);
  }
}


/**
 * Antigravity V2 - OceanRenderer (晶格海洋 WebGL 粒子波浪渲染引擎)
 * 职责：纯粹的 WebGL 着色器动力学引擎，负责粒子流体波浪模拟与鼠标涟漪冲击波
 */

const OCEAN_PALETTES = {
  gemini: ['#2980ff', '#0ac2ff', '#ad85f2', '#f570b3'],
  argon: ['#0d6bff', '#00dbff', '#26f2cc', '#618aff'],
  antigravity: ['#7a47fa', '#e05cf0', '#ffa847', '#5299ff'],
  emerald: ['#0ad199', '#1ff5d9', '#38a8ff', '#99fa70'],
  miku: ['#39c5bb', '#66f0e6', '#3b82f6', '#c084fc'],
  sunset: ['#f43f5e', '#fb7185', '#f59e0b', '#8b5cf6']
};

function hexToRgbNorm(hex) {
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

class OceanRenderer {
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


/**
 * Antigravity V2 - AuroraRenderer (全景流体极光 WebGL 渲染管线)
 * 职责：负责 aurora 模式下的多波长极光动态渲染与时间干涉模拟
 */

const VS_SRC = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FS_SRC = `
  precision mediump float;
  uniform vec2 u_res;
  uniform float u_time;
  uniform vec3 u_accent;
  void main() {
    vec2 p = gl_FragCoord.xy / u_res.xy;
    float t = u_time * 0.35;
    float f = sin(p.x * 3.5 + t) * cos(p.y * 2.8 - t * 0.9);
    f += sin(p.x * 6.0 - t * 1.4 + p.y * 4.2) * 0.45;
    vec3 baseDark = vec3(0.04, 0.06, 0.12);
    vec3 midTone = mix(baseDark, u_accent * 0.65, 0.6);
    vec3 highTone = u_accent;
    vec3 col = mix(baseDark, midTone, smoothstep(-0.9, 0.4, f));
    col = mix(col, highTone, smoothstep(0.1, 1.3, f));
    gl_FragColor = vec4(col, 1.0);
  }
`;

class AuroraRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.program = null;
    this.animId = null;
    this.running = false;
    this.speed = 1.0;
    this.accentRgb = [10, 132, 255];
  }

  init() {
    if (!this.canvas) return false;
    try {
      this.gl = this.canvas.getContext('webgl');
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

      const quadBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
      ]), gl.STATIC_DRAW);

      const aPos = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      return true;
    } catch (e) {
      console.warn('[AuroraRenderer] 初始化失败:', e);
      return false;
    }
  }

  setAccent(rgb) {
    this.accentRgb = rgb || [10, 132, 255];
  }

  start() {
    if (this.running) return;
    if (!this.gl && !this.init()) return;
    this.running = true;
    this.render(performance.now());
  }

  stop() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  render(time) {
    if (!this.running || !this.gl) return;
    const gl = this.gl;
    const w = window.innerWidth * 0.75;
    const h = window.innerHeight * 0.75;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      gl.viewport(0, 0, w, h);
    }

    gl.useProgram(this.program);
    gl.uniform2f(gl.getUniformLocation(this.program, 'u_res'), w, h);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_time'), time * 0.001 * this.speed);
    const [r, g, b] = this.accentRgb;
    gl.uniform3f(gl.getUniformLocation(this.program, 'u_accent'), r / 255, g / 255, b / 255);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    this.animId = requestAnimationFrame((t) => this.render(t));
  }
}


/**
 * Antigravity V2 - ControlPanel (Shadow DOM 隔离沙箱控制台)
 * 职责：提供模态切换与材质参数调节面板，完全封装在 Shadow DOM 内部，与宿主双向零样式污染
 */

class ControlPanel {
  constructor(stateMachine, sunglassesGifBase64 = '') {
    this.stateMachine = stateMachine;
    this.sunglassesGif = sunglassesGifBase64;
    this.host = null;
    this.shadow = null;
    this.isOpen = false;
  }

  mount() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('ag-control-panel-host')) return;

    // 1. 创建宿主节点
    this.host = document.createElement('div');
    this.host.id = 'ag-control-panel-host';
    this.host.style.cssText = 'position: fixed; z-index: 999999; pointer-events: none; inset: 0;';

    // 2. 开启封闭的 Shadow DOM 沙箱
    this.shadow = this.host.attachShadow({ mode: 'open' });

    // 3. 注入独立的 Shadow CSS
    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      
      .floating-trigger {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(18, 24, 38, 0.85);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        cursor: pointer;
        pointer-events: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
      }
      .floating-trigger:hover {
        transform: scale(1.1);
        box-shadow: 0 12px 32px rgba(41, 128, 255, 0.35);
      }
      .floating-trigger img {
        width: 32px;
        height: 32px;
        object-fit: contain;
        pointer-events: none;
      }

      .panel-window {
        position: fixed;
        bottom: 84px;
        right: 24px;
        width: 340px;
        max-height: 80vh;
        overflow-y: auto;
        background: rgba(16, 20, 30, 0.94);
        backdrop-filter: blur(28px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.55);
        color: #ffffff;
        padding: 20px;
        pointer-events: auto;
        display: none;
        flex-direction: column;
        gap: 16px;
        animation: panelFadeIn 0.25s ease-out;
      }
      .panel-window.open {
        display: flex;
      }
      @keyframes panelFadeIn {
        from { opacity: 0; transform: translateY(12px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1.0); }
      }

      .panel-title {
        font-size: 15px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .panel-close {
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.2s;
        font-size: 18px;
      }
      .panel-close:hover { opacity: 1; }

      .section-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 6px;
      }

      .mode-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .mode-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        color: #ffffff;
        padding: 10px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        transition: all 0.2s ease;
      }
      .mode-btn:hover {
        background: rgba(255, 255, 255, 0.12);
      }
      .mode-btn.active {
        background: rgba(41, 128, 255, 0.25);
        border-color: #2980ff;
        box-shadow: 0 0 12px rgba(41, 128, 255, 0.35);
      }

      .slider-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .slider-header {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
      }
      .slider-header span.val {
        color: #2980ff;
        font-weight: 600;
      }
      input[type="range"] {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.15);
        outline: none;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #2980ff;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
    `;
    this.shadow.appendChild(style);

    // 4. 构建 DOM 结构
    const currentMode = this.stateMachine.getConfig().mode || 'native';

    const trigger = document.createElement('div');
    trigger.className = 'floating-trigger';
    trigger.title = 'Antigravity V2 控制中心';
    trigger.innerHTML = `<img src="${this.sunglassesGif || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="锁暝" />`;
    trigger.onclick = () => this.toggle();
    this.shadow.appendChild(trigger);

    const win = document.createElement('div');
    win.className = 'panel-window';
    win.innerHTML = `
      <div class="panel-title">
        <span>Antigravity V2 控制中心</span>
        <span class="panel-close">&times;</span>
      </div>

      <div class="section-label">视觉呈现模态 (物理互斥)</div>
      <div class="mode-grid">
        <button class="mode-btn ${currentMode === 'native' ? 'active' : ''}" data-mode="native">
          <span>原生模式</span>
        </button>
        <button class="mode-btn ${currentMode === 'ocean' ? 'active' : ''}" data-mode="ocean">
          <span>晶格海洋</span>
        </button>
        <button class="mode-btn ${currentMode === 'aurora' ? 'active' : ''}" data-mode="aurora">
          <span>流体极光</span>
        </button>
        <button class="mode-btn ${currentMode === 'custom' ? 'active' : ''}" data-mode="custom">
          <span>自定义素材</span>
        </button>
      </div>

      <div id="ocean-controls" style="display: ${currentMode === 'ocean' ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
        <div class="section-label">晶格海洋专用调优</div>
        <div class="slider-group">
          <div class="slider-header"><span>粒子波浪流速</span><span class="val" id="val-speed">1.0x</span></div>
          <input type="range" id="slide-speed" min="0.2" max="2.5" step="0.1" value="1.0" />
        </div>
        <div class="slider-group">
          <div class="slider-header"><span>星芒锐度</span><span class="val" id="val-sharp">0.65</span></div>
          <input type="range" id="slide-sharp" min="0.2" max="1.0" step="0.05" value="0.65" />
        </div>
      </div>
    `;
    this.shadow.appendChild(win);

    // 5. 事件绑定
    win.querySelector('.panel-close').onclick = () => this.toggle(false);

    win.querySelectorAll('.mode-btn').forEach(btn => {
      btn.onclick = () => {
        const targetMode = btn.getAttribute('data-mode');
        this.stateMachine.setMode(targetMode);
        win.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const oceanControls = win.querySelector('#ocean-controls');
        if (oceanControls) {
          oceanControls.style.display = targetMode === 'ocean' ? 'flex' : 'none';
        }
      };
    });

    document.body.appendChild(this.host);
  }

  toggle(forceState) {
    if (!this.shadow) return;
    const win = this.shadow.querySelector('.panel-window');
    if (!win) return;
    this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
    if (this.isOpen) {
      win.classList.add('open');
    } else {
      win.classList.remove('open');
    }
  }
}


/**
 * Antigravity V2 - Root Assembly Entry (总装配入口)
 * 职责：按依赖关系组装各解耦模块，执行无序冲突自愈，对外暴露安全状态总线
 */







function bootstrapAntigravityV2(options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  function init() {
    if (!document.head || !document.body) {
      setTimeout(init, 30);
      return;
    }

    // 0. 清理历史旧版残留 DOM 节点 (杜绝多层 Canvas 与样式幽灵污染)
    const oldNodes = [
      'ag-early-theme-style',
      'antarctica-glacier-theme',
      'ag-center-ocean-canvas',
      'ag-stage-canvas',
      'ag-center-emblem-wrapper',
      'ag-control-panel-host',
      'ag-v2-theme-styles'
    ];
    oldNodes.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        try { el.remove(); } catch (e) {}
      }
    });

    window.__ag_v2_bootstrapped = true;

    // 1. 注入聚合的 V2 样式表 (结构管线透空 + 4 套物理互斥模态 Tokens)
    const styleEl = document.createElement('style');
    styleEl.id = 'ag-v2-theme-styles';
    styleEl.textContent = options.combinedCss || '';
    document.head.appendChild(styleEl);

    // 2. 初始化背景 Canvas 容器
    const stageCanvas = document.createElement('canvas');
    stageCanvas.id = 'ag-stage-canvas';
    stageCanvas.style.cssText = 'position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 0; display: none;';
    document.body.insertBefore(stageCanvas, document.body.firstChild);

    // 晶格海洋 Canvas
    const oceanCanvas = document.createElement('canvas');
    oceanCanvas.id = 'ag-center-ocean-canvas';
    oceanCanvas.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; display: none;';

    function ensureOceanCanvasMount() {
      const pane1 = document.querySelector('div[data-pane-id="pane-1"]')
        || document.querySelector('div.flex-1.min-h-0:has(> div.w-full.h-full.flex)')
        || document.body;
      if (oceanCanvas.parentElement !== pane1) {
        pane1.style.position = 'relative';
        pane1.insertBefore(oceanCanvas, pane1.firstChild);
      }
    }
    ensureOceanCanvasMount();

    // 3. 实例化独立着色器引擎
    const oceanRenderer = new OceanRenderer(oceanCanvas);
    const auroraRenderer = new AuroraRenderer(stageCanvas);

    // 4. 读取持久化配置并启动状态机
    const initialConfig = storageBridge.readLocalConfig();
    const stateMachine = new ThemeStateMachine(initialConfig, {
      ocean: oceanRenderer,
      aurora: auroraRenderer
    });

    stateMachine.subscribe((event, payload) => {
      if (event === 'modeChange') {
        ensureOceanCanvasMount();
        storageBridge.saveConfig(stateMachine.getConfig());
      }
    });

    stateMachine.init();

    // 5. 挂载 Shadow DOM 隔离控制面板
    const controlPanel = new ControlPanel(stateMachine, options.sunglassesGifBase64 || '');
    controlPanel.mount();

    // 6. 暴露标准化 API 供 CDP 测试套件与用户控制
    window.__ag_v2_theme = {
      stateMachine,
      oceanRenderer,
      auroraRenderer,
      controlPanel,
      setMode: (m) => stateMachine.setMode(m),
      getMode: () => stateMachine.getConfig().mode,
      clearCache: () => {
        try {
          localStorage.removeItem('ag_theme_apple_config_v3');
          localStorage.removeItem('ag_theme_fast_asset_cache_v1');
          console.log('[Antigravity V2] 本地主题缓存已彻底清除。');
        } catch (e) {}
      }
    };

    console.log('[Antigravity V2] 现代化模块解耦引擎装配就绪。');
  }

  init();
}


  bootstrapAntigravityV2({
    combinedCss: "/**\n * Antigravity V2 - Base Structure Tokens (结构容器纯透空管线)\n * 职责：严格确立结构容器透空与单一实体卡片锚定体系\n */\n\n/* 1. 结构性布局管线：彻底透空，禁止视觉上色或挂载模糊 */\ndiv[data-pane-id=\"pane-1\"],\ndiv[class*=\"group/pane\"],\n[data-testid=\"chat-turn-container\"],\ndiv.relative.z-0.flex-1.flex.min-h-0.h-full,\ndiv.flex-1.min-h-0:has(\u003e div.w-full.h-full.flex),\ndiv.w-full.h-full.flex.flex-col.overflow-hidden,\ndiv.h-full.w-full.flex.flex-col.relative.select-text {\n  background: transparent !important;\n  background-color: transparent !important;\n  backdrop-filter: none !important;\n  -webkit-backdrop-filter: none !important;\n  border: none !important;\n  box-shadow: none !important;\n}\n\n/* 2. 彻底拔除悬空吸顶截断横条 (Sticky Bleed Overlay) */\ndiv[class*=\"md-sticky-message-bleed\"],\ndiv.md-sticky-message-bleed,\ndiv.sticky.top-0:has(.border-b) {\n  display: none !important;\n  opacity: 0 !important;\n  visibility: hidden !important;\n  height: 0px !important;\n  max-height: 0px !important;\n  pointer-events: none !important;\n  margin: 0 !important;\n  padding: 0 !important;\n}\n\n/* 3. 单一实体卡片锚定点 (Single Card Anchor) */\ndiv[class*=\"scroll-mt-4\"] {\n  border-radius: 14px !important;\n  transition: background-color 0.25s ease, border-color 0.25s ease !important;\n}\n\n/* 4. 卡片内子孙层全域透空化：绝不允许嵌套重复 Alpha 叠加或生硬黑框 */\ndiv[class*=\"scroll-mt-4\"] .group\\/turn,\ndiv[class*=\"scroll-mt-4\"] [data-turn-id],\ndiv[class*=\"scroll-mt-4\"] [data-testid=\"user-input-step\"],\ndiv[class*=\"scroll-mt-4\"] article,\ndiv[class*=\"scroll-mt-4\"] .prose,\ndiv[class*=\"scroll-mt-4\"] div:has(\u003e img),\ndiv[class*=\"scroll-mt-4\"] div.flex.shrink-0:has(img) {\n  background: transparent !important;\n  background-color: transparent !important;\n  backdrop-filter: none !important;\n  -webkit-backdrop-filter: none !important;\n  border: none !important;\n  box-shadow: none !important;\n}\n\n/* 5. 用户消息缩略图媒体容器：清除深黑矩形硬切边框与外壳边框 */\ndiv:has(\u003e img),\ndiv:has(\u003e div \u003e img),\ndiv.flex.shrink-0:has(img) {\n  border: none !important;\n  border-width: 0px !important;\n  border-color: transparent !important;\n  background-color: transparent !important;\n}\n\n/**\n * Antigravity V2 - Native Mode Tokens (原生纯黑模式)\n * 职责：还原官方纯黑底色，彻底禁用毛玻璃与半透明，二三级菜单完全统一\n */\n\nbody[data-theme-mode=\"native\"] {\n  --background: 0 0 0 !important;\n  --card: 0 0 0 !important;\n  --sidebar: 0 0 0 !important;\n  --popover: 10 10 10 !important;\n  --border: 38 38 38 !important;\n  --muted: 20 20 20 !important;\n}\n\nbody[data-theme-mode=\"native\"] #ag-center-ocean-canvas,\nbody[data-theme-mode=\"native\"] #ag-center-emblem-wrapper,\nbody[data-theme-mode=\"native\"] #ag-stage-canvas {\n  display: none !important;\n}\n\nbody[data-theme-mode=\"native\"] div[class*=\"scroll-mt-4\"] {\n  background-color: #000000 !important;\n  backdrop-filter: none !important;\n  -webkit-backdrop-filter: none !important;\n  border: 1px solid rgba(255, 255, 255, 0.08) !important;\n}\n\nbody[data-theme-mode=\"native\"] aside,\nbody[data-theme-mode=\"native\"] [data-testid=\"sidebar\"],\nbody[data-theme-mode=\"native\"] div.bg-sidebar {\n  background-color: #000000 !important;\n  backdrop-filter: none !important;\n  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;\n}\n\n/**\n * Antigravity V2 - Ocean Mode Tokens (晶格海洋模式)\n * 职责：WebGL 粒子波浪锐利展现，卡片绝对禁用高斯模糊，微透纯底衬\n */\n\nbody[data-theme-mode=\"ocean\"] {\n  --background: transparent !important;\n  --card: 10 14 22 / 0.12 !important;\n  --sidebar: 10 14 22 / 0.88 !important;\n  --popover: 14 18 26 / 0.94 !important;\n  --muted: transparent !important;\n  --border: transparent !important;\n}\n\nbody[data-theme-mode=\"ocean\"] #ag-center-ocean-canvas {\n  display: block !important;\n}\n\n/* 核心禁忌法则：高频粒子波浪上方绝对禁止挂载模糊滤镜 */\nbody[data-theme-mode=\"ocean\"] div[class*=\"scroll-mt-4\"] {\n  background-color: rgba(10, 14, 22, 0.12) !important;\n  backdrop-filter: none !important;\n  -webkit-backdrop-filter: none !important;\n  border: 1px solid rgba(255, 255, 255, 0.05) !important;\n  box-shadow: none !important;\n}\n\n/* 侧边栏微透深黑遮光，保护左侧项目列表对比度 */\nbody[data-theme-mode=\"ocean\"] aside,\nbody[data-theme-mode=\"ocean\"] [data-testid=\"sidebar\"],\nbody[data-theme-mode=\"ocean\"] div.bg-sidebar {\n  background-color: rgba(10, 14, 22, 0.88) !important;\n  backdrop-filter: blur(16px) !important;\n  -webkit-backdrop-filter: blur(16px) !important;\n  border-right: 1px solid rgba(255, 255, 255, 0.06) !important;\n}\n\n/**\n * Antigravity V2 - Aurora \u0026 Custom Mode Tokens (流体极光与自定义壁纸模式)\n * 职责：毛玻璃透视模态，底层渲染层自然透出，支持温润高斯模糊\n */\n\nbody[data-theme-mode=\"aurora\"],\nbody[data-theme-mode=\"custom\"] {\n  --background: transparent !important;\n  --card: 14 18 26 / 0.35 !important;\n  --sidebar: 10 14 22 / 0.45 !important;\n  --border: 255 255 255 / 0.08 !important;\n}\n\nbody[data-theme-mode=\"aurora\"] #ag-stage-canvas {\n  display: block !important;\n}\n\nbody[data-theme-mode=\"aurora\"] div[class*=\"scroll-mt-4\"],\nbody[data-theme-mode=\"custom\"] div[class*=\"scroll-mt-4\"] {\n  background-color: rgba(14, 18, 26, 0.35) !important;\n  backdrop-filter: blur(20px) !important;\n  -webkit-backdrop-filter: blur(20px) !important;\n  border: 1px solid rgba(255, 255, 255, 0.10) !important;\n}\n\n/* 侧边栏通透毛玻璃：彻底消除实黑遮挡 */\nbody[data-theme-mode=\"aurora\"] aside,\nbody[data-theme-mode=\"aurora\"] [data-testid=\"sidebar\"],\nbody[data-theme-mode=\"aurora\"] div.bg-sidebar,\nbody[data-theme-mode=\"custom\"] aside,\nbody[data-theme-mode=\"custom\"] [data-testid=\"sidebar\"],\nbody[data-theme-mode=\"custom\"] div.bg-sidebar {\n  background-color: rgba(10, 14, 22, 0.45) !important;\n  backdrop-filter: blur(24px) !important;\n  -webkit-backdrop-filter: blur(24px) !important;\n  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;\n}\n",
    sunglassesGifBase64: "data:image/gif;base64,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"
  });
})();
