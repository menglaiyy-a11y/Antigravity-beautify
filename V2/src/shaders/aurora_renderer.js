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

export class AuroraRenderer {
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
