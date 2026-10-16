/**
 * Antigravity V2 - Root Assembly Entry (总装配入口)
 * 职责：按依赖关系组装各解耦模块，执行无序冲突自愈，对外暴露安全状态总线
 */

import { storageBridge } from './core/storage_bridge.js';
import { ThemeStateMachine } from './core/state_machine.js';
import { OceanRenderer } from './shaders/ocean_renderer.js';
import { AuroraRenderer } from './shaders/aurora_renderer.js';
import { ControlPanel } from './components/control_panel/panel.js';

export function bootstrapAntigravityV2(options = {}) {
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
