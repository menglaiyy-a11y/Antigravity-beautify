/**
 * Antigravity V2 - ThemeStateMachine (模态状态机)
 * 职责：严格控制 4 种视觉模态互斥运转，生命周期解耦，GPU 资源精准启停
 */
export class ThemeStateMachine {
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
