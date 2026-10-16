/**
 * Antigravity V2 - Root Assembly Entry (总装配入口)
 * 职责：按依赖关系组装各解耦模块，执行无序冲突自愈，对外暴露安全状态总线
 */

import { storageBridge } from './core/storage_bridge.js';
import { AssetRegistry } from './core/asset_registry.js';
import { ThemeStateMachine } from './core/state_machine.js';
import { OceanRenderer } from './shaders/ocean_renderer.js';
import { AuroraRenderer } from './shaders/aurora_renderer.js';
import { ControlPanel } from './components/control_panel/panel.js';
import { PetWidget } from './components/pet_widget/pet.js';

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
      'ag-custom-video-bg',
      'ag-center-emblem-wrapper',
      'ag-control-panel-host',
      'ag-pet-widget-host',
      'ag-custom-mask',
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

    // 2. 初始化全屏背景 Stage Canvas (用于 Aurora 极光等模态)
    const stageCanvas = document.createElement('canvas');
    stageCanvas.id = 'ag-stage-canvas';
    stageCanvas.style.cssText = 'position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 0; display: none;';
    document.body.insertBefore(stageCanvas, document.body.firstChild);

    // 初始化硬件加速全屏 Video 背景节点 (用于 custom 模态动态视频)
    const videoBg = document.createElement('video');
    videoBg.id = 'ag-custom-video-bg';
    videoBg.autoplay = true;
    videoBg.loop = true;
    videoBg.muted = true;
    videoBg.playsInline = true;
    videoBg.style.cssText = 'position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: cover; z-index: 0; pointer-events: none; display: none;';
    document.body.insertBefore(videoBg, document.body.firstChild);

    // 初始化自定义素材暗化遮罩节点 (用于 custom 模态防背景眩光)
    const customMask = document.createElement('div');
    customMask.id = 'ag-custom-mask';
    customMask.style.display = 'none';
    document.body.insertBefore(customMask, document.body.firstChild);

    // 晶格海洋 Canvas (挂载在中栏)
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

    // 3. 实例化独立着色器引擎与资产注册表
    const oceanRenderer = new OceanRenderer(oceanCanvas);
    const auroraRenderer = new AuroraRenderer(stageCanvas);
    const assetRegistry = new AssetRegistry(storageBridge, options.sunglassesGifBase64 || '', options.builtinSkinFrames || {});

    // 4. 读取持久化配置并启动状态机
    const initialConfig = storageBridge.readLocalConfig();
    const stateMachine = new ThemeStateMachine(initialConfig, {
      ocean: oceanRenderer,
      aurora: auroraRenderer
    });

    // 实例化桌面伴侣挂件
    const petWidget = new PetWidget(stateMachine, assetRegistry, storageBridge);
    petWidget.mount();

    // 自定义素材渲染管理
    async function applyCustomAsset() {
      const cfg = stateMachine.getConfig();
      if (cfg.mode !== 'custom') {
        if (customMask) customMask.style.display = 'none';
        if (videoBg) { videoBg.pause(); videoBg.style.display = 'none'; }
        if (document.body.getAttribute('data-theme-mode') !== 'custom') {
          document.body.style.backgroundImage = 'none';
        }
        return;
      }
      if (customMask) customMask.style.display = 'block';
      const assetId = cfg.customAssetId || 'default_custom';
      const assetData = await storageBridge.getAsset(assetId);
      if (assetData) {
        if (cfg.customAssetType === 'video') {
          document.body.style.backgroundImage = 'none';
          if (videoBg.src !== assetData) {
            videoBg.src = assetData;
          }
          videoBg.style.display = 'block';
          videoBg.play().catch(() => {});
        } else {
          if (videoBg) { videoBg.pause(); videoBg.style.display = 'none'; }
          document.body.style.backgroundImage = `url("${assetData}")`;
          document.body.style.backgroundSize = 'cover';
          document.body.style.backgroundPosition = 'center';
          document.body.style.backgroundRepeat = 'no-repeat';
        }
      }
    }

    stateMachine.subscribe((event, payload) => {
      if (event === 'modeChange') {
        ensureOceanCanvasMount();
        stageCanvas.style.display = payload === 'aurora' ? 'block' : 'none';
        oceanCanvas.style.display = payload === 'ocean' ? 'block' : 'none';
        applyCustomAsset();
        storageBridge.saveConfig(stateMachine.getConfig());
      } else if (event === 'configChange') {
        applyCustomAsset();
        storageBridge.saveConfig(stateMachine.getConfig());
      }
    });

    stateMachine.init();
    // 初始根据模式显示/隐藏 Canvas 与素材
    const curMode = stateMachine.getConfig().mode;
    stageCanvas.style.display = curMode === 'aurora' ? 'block' : 'none';
    oceanCanvas.style.display = curMode === 'ocean' ? 'block' : 'none';
    applyCustomAsset();

    // 5. 挂载 Shadow DOM 隔离控制面板
    const controlPanel = new ControlPanel(stateMachine, options.sunglassesGifBase64 || '', storageBridge, assetRegistry, petWidget);
    controlPanel.mount();

    // 6. 构造标准化外部桥接 API
    const publicApi = {
      version: '2.0.0',
      setMode: (m) => stateMachine.setMode(m),
      getMode: () => stateMachine.getConfig().mode,
      getConfig: () => stateMachine.getConfig(),
      stateMachine,
      updateConfig: (cfg) => stateMachine.updateConfig(cfg),
      storageBridge,
      assetRegistry,
      petWidget,
      oceanRenderer,
      auroraRenderer,
      controlPanel,
      clearCache: async () => {
        await storageBridge.clearAllAssets();
        stateMachine.setMode('native');
        console.log('[Antigravity V2] 本地主题缓存已彻底清除并回退原生模式。');
      }
    };

    window.__ag_v2_theme = publicApi;
    document.__ag_v2_theme = publicApi;
    window.agVisualPanel = controlPanel;

    // 尝试安全暴露至 Main World
    try {
      if (typeof electron_1 !== 'undefined' && electron_1 && electron_1.contextBridge && typeof electron_1.contextBridge.exposeInMainWorld === 'function') {
        electron_1.contextBridge.exposeInMainWorld('__ag_v2_theme', {
          setMode: (m) => stateMachine.setMode(m),
          getMode: () => stateMachine.getConfig().mode,
          getConfig: () => stateMachine.getConfig()
        });
      }
    } catch (e) {}

    // 跨上下文事件通信通道
    document.addEventListener('ag-v2-cmd', (ev) => {
      if (!ev || !ev.detail) return;
      const { action, payload } = ev.detail;
      if (action === 'setMode') {
        stateMachine.setMode(payload);
      } else if (action === 'clearCache') {
        publicApi.clearCache();
      }
    });

    console.log('[Antigravity V2] 现代化模块解耦引擎装配就绪。当前模态:', curMode);
  }

  init();
}
