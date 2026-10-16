// === Antigravity 4K Antarctic Glacier Wallpaper Theme ===
(function () {
  if (typeof window === 'undefined') return;

  try {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-ag-preload-ran', '1');
    }
  } catch (e) {}

  const defaultWallpaper = 'data:image/jpeg;base64,___BASE64_PLACEHOLDER___';
  window.__ag_default_wallpaper = defaultWallpaper;

  /* 1. 暴露并复用 preload 模块作用域直出的 nativeStorage 接口 */
  const nativeStorageRef = (typeof storageAPI !== 'undefined' ? storageAPI : null)
    || (typeof electron_1 !== 'undefined' && electron_1.ipcRenderer ? {
         getItems: () => electron_1.ipcRenderer.invoke('storage:get-items'),
         updateItems: (changes) => electron_1.ipcRenderer.invoke('storage:update-items', changes)
       } : null);

  if (nativeStorageRef) {
    window.__ag_native_storage = nativeStorageRef;
  }

  /* 2. 提前并发发起应用级存储读取（与 Chromium DOM 构建完全并行） */
  let earlyStoragePromise = null;
  if (nativeStorageRef && typeof nativeStorageRef.getItems === 'function') {
    try {
      earlyStoragePromise = nativeStorageRef.getItems();
      window.__ag_early_storage_promise = earlyStoragePromise;
    } catch (e) {}
  }

  /* 3. 极早同步读取配置与快速素材缓存（0ms 决策首帧外观） */
  const STORAGE_KEY = 'ag_theme_apple_config_v3';
  const ASSET_CACHE_KEY = 'ag_theme_fast_asset_cache_v1';
  let earlyConfig = {
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

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      earlyConfig = Object.assign(earlyConfig, JSON.parse(raw));
      if (earlyConfig.mode === 'glacier') {
        earlyConfig.mode = 'native';
      }
    }
  } catch (e) {}

  /* 4. 立即注入第 0 毫秒基础穿透与透明度规则，扼杀 FOUC (无样式闪烁) */
  function injectEarlyStyle() {
    const targetParent = document.head || document.documentElement;
    if (!targetParent) return;
    try {
      if (document.documentElement) {
        document.documentElement.setAttribute('data-ag-preload-ran', '1');
      }
    } catch (e) {}
    if (document.getElementById('ag-early-theme-style')) return;

    const earlyStyle = document.createElement('style');
    earlyStyle.id = 'ag-early-theme-style';

    const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0.5));
    const isGlobal = earlyConfig.tuneMode === 'global';
    const globalOp = clamp01(earlyConfig.globalOpacity);
    const effLeft = clamp01(isGlobal ? globalOp : earlyConfig.leftOpacity);
    const effCenter = clamp01(isGlobal ? globalOp : earlyConfig.centerOpacity);
    const effRight = clamp01(isGlobal ? globalOp : earlyConfig.rightOpacity);
    const isPaper = earlyConfig.textureStyle === 'paper';
    const baseBlur = Math.max(0, isPaper ? Math.min(16, earlyConfig.globalBlur) : earlyConfig.globalBlur);
    const leftBlur = effLeft === 0 ? 0 : baseBlur;
    const centerBlur = effCenter === 0 ? 0 : baseBlur;
    const rightBlur = effRight === 0 ? 0 : baseBlur;
    const rgb = (Array.isArray(earlyConfig.accentRgb) && earlyConfig.accentRgb.length === 3) ? earlyConfig.accentRgb : [10, 132, 255];
    const r = rgb[0], g = rgb[1], b = rgb[2];

    if (earlyConfig.mode === 'native') {
      earlyStyle.textContent = [
        'html, body {',
        '  background-color: #0b0d13 !important;',
        '  background-image: none !important;',
        '}',
        'aside, div[data-testid="sidebar-wrapper"], div.bg-sidebar {',
        '  background-color: var(--sidebar, #0e1117) !important;',
        '}',
        'div[data-pane-id="pane-1"], [data-aux-pane-open], div.flex-1.min-w-0.h-full {',
        '  background-color: #0e1117 !important;',
        '}',
        'div[data-testid="conversation-view"] > div,',
        'div[class*="scroll-mt-4"],',
        '[data-testid="chat-turn-container"],',
        'div[class*="group/turn"] {',
        '  background-color: transparent !important;',
        '  border: none !important;',
        '  border-radius: 0 !important;',
        '  box-shadow: none !important;',
        '}',
        'div[data-testid="chat-input-container"],',
        'div[id="antigravity.agentSidePanelInputBox"],',
        '#antigravity\\.agentSidePanelInputBox {',
        '  background: transparent !important;',
        '  border: none !important;',
        '  border-radius: 0 !important;',
        '  box-shadow: none !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        '*:not(#ag-theme-modal):not(#ag-theme-modal *):not(#ag-theme-pill):not(#ag-theme-pill *) {',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}'
      ].join('\n');
      targetParent.appendChild(earlyStyle);
      return;
    }

    if (earlyConfig.mode === 'ocean') {
      earlyStyle.textContent = [
        'html, body {',
        '  background-color: #0b0d13 !important;',
        '  background-image: none !important;',
        '}',
        'aside, div[data-testid="sidebar-wrapper"], div.bg-sidebar {',
        '  background-color: #0b0e14 !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        '[data-aux-pane-open], div.flex-1.min-w-0.h-full > div.flex:not(:has(div[data-pane-id="pane-1"])) {',
        '  background-color: #0b0e14 !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'div[data-pane-id="pane-1"],',
        'div.w-full.h-full.flex.flex-col.gap-6.justify-start,',
        'div[class*="justify-start"][class*="animate-fade-in"] {',
        '  background-color: transparent !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'div[data-pane-id="pane-1"] div[class*="scroll-mt-4"],',
        'div[data-pane-id="pane-1"] [data-testid="chat-turn-container"],',
        'div[data-pane-id="pane-1"] div[class*="group/turn"] {',
        '  background-color: rgba(10, 14, 22, 0.16) !important;',
        '  backdrop-filter: blur(3px) !important;',
        '  -webkit-backdrop-filter: blur(3px) !important;',
        '  border: 1px solid rgba(255, 255, 255, 0.05) !important;',
        '}'
      ].join('\n');
      targetParent.appendChild(earlyStyle);
      return;
    }

    earlyStyle.textContent = [
      ':root {',
      '  --background: transparent !important;',
      '  --ag-accent: ' + (earlyConfig.accentHex || '#0a84ff') + ';',
      '  --ag-accent-rgb: ' + r + ', ' + g + ', ' + b + ';',
      '  --ag-ambient-tint: rgba(' + r + ', ' + g + ', ' + b + ', ' + (0.08 * globalOp).toFixed(3) + ');',
      '  --ag-global-blur: ' + baseBlur + 'px;',
      '  --ag-bg-base-overlay: transparent;',
      '  --ag-topbar-bg: rgba(16, 18, 24, ' + globalOp + ');',
      '  --ag-topbar-blur: ' + (globalOp === 0 ? 0 : baseBlur) + 'px;',
      '  --ag-left-bg: rgba(16, 18, 24, ' + effLeft + ');',
      '  --ag-left-blur: ' + leftBlur + 'px;',
      '  --ag-center-bg: rgba(18, 20, 28, ' + effCenter + ');',
      '  --ag-center-blur: ' + centerBlur + 'px;',
      '  --ag-right-bg: rgba(16, 18, 24, ' + effRight + ');',
      '  --ag-right-blur: ' + rightBlur + 'px;',
      '  --ag-dialog-bg: rgba(20, 24, 34, ' + (effCenter === 0 ? 0 : (effCenter >= 0.99 ? 1 : (effCenter * 0.72).toFixed(3))) + ');',
      '  --ag-popover-bg: rgba(20, 24, 34, ' + (effCenter === 0 ? 0 : (effCenter >= 0.99 ? 1 : (effCenter * 0.70).toFixed(3))) + ');',
      '}',
      'html, body, body[data-scroll-locked] {',
      '  width: 100% !important;',
      '  height: 100% !important;',
      '  margin: 0 !important;',
      '  padding: 0 !important;',
      '  overflow: hidden !important;',
      '  background-color: transparent !important;',
      '}',
      'body {',
      '  background-size: cover !important;',
      '  background-position: center center !important;',
      '  background-repeat: no-repeat !important;',
      '  background-attachment: fixed !important;',
      '}',
      'div.h-screen.w-screen.flex.flex-col.bg-background,',
      'div.relative.w-screen.h-[100dvh],',
      '#root > div.relative.w-screen,',
      '#root {',
      '  background-color: transparent !important;',
      '}',
      'div.border-border:not([data-pane-id="pane-1"]),',
      'div.h-full.w-full.overflow-hidden:not([data-pane-id="pane-1"]):not([data-aux-pane-open]),',
      'div.flex-1.min-h-0:not([data-pane-id="pane-1"]),',
      'div.relative.self-stretch.flex-grow.min-h-0,',
      'div.relative.h-full.w-full.min-h-0,',
      'div.relative.h-full.w-full.overflow-hidden,',
      'div.isolate {',
      '  background-color: transparent !important;',
      '}',
      'aside,',
      'div[data-testid="sidebar-wrapper"],',
      'div.bg-sidebar:not(aside *):not([data-testid="sidebar-wrapper"] *) {',
      '  background-color: var(--ag-left-bg) !important;',
      '  backdrop-filter: blur(var(--ag-left-blur)) saturate(160%) !important;',
      '  -webkit-backdrop-filter: blur(var(--ag-left-blur)) saturate(160%) !important;',
      '}',
      'aside [class*="bg-sidebar"],',
      'aside .bg-muted,',
      'div[data-testid="sidebar-wrapper"] [class*="bg-sidebar"],',
      'div[data-testid="sidebar-wrapper"] .bg-muted,',
      'div.bg-sidebar [class*="bg-sidebar"],',
      'div.bg-sidebar .bg-muted,',
      'div.bg-sidebar div.w-full.h-full.group,',
      'div[class*="group/section-header"] {',
      '  background-color: transparent !important;',
      '  backdrop-filter: none !important;',
      '  -webkit-backdrop-filter: none !important;',
      '  border-color: transparent !important;',
      '}',
      'div[data-pane-id="pane-1"] {',
      '  background-color: var(--ag-center-bg) !important;',
      '  backdrop-filter: blur(var(--ag-center-blur)) saturate(160%) !important;',
      '  -webkit-backdrop-filter: blur(var(--ag-center-blur)) saturate(160%) !important;',
      '}',
      'div.flex-1.flex.flex-col.min-w-0.h-full:has(> div[data-pane-id="pane-1"]),',
      'div[data-pane-id="pane-1"] [data-testid="conversation-view"] {',
      '  background-color: transparent !important;',
      '  backdrop-filter: none !important;',
      '  -webkit-backdrop-filter: none !important;',
      '}'
    ].join('\n');
    targetParent.appendChild(earlyStyle);
  }

  /* 5. 核心壁纸首帧对齐函数：原生 UI 与海洋模式首帧绝不注入静态冰川图，杜绝重定向与闪烁 */
  function applyInitialWallpaper() {
    if (!document.body) return false;

    const mode = earlyConfig.mode || 'native';
    try {
      if (document.documentElement) {
        document.documentElement.setAttribute('data-ag-preload-ran', '1');
        document.documentElement.setAttribute('data-ag-early-mode', mode);
      }
    } catch (e) {}

    if (mode === 'native' || mode === 'ocean') {
      document.body.style.backgroundImage = 'none';
    } else if (mode === 'aurora') {
      document.body.style.backgroundImage = 'none';
      document.body.style.backgroundColor = '#06080f';
    } else if (mode === 'custom') {
      let fastAsset = '';
      try {
        fastAsset = sessionStorage.getItem(ASSET_CACHE_KEY) || localStorage.getItem(ASSET_CACHE_KEY) || '';
      } catch (e) {}

      if (fastAsset && earlyConfig.customAssetType !== 'video') {
        document.body.style.backgroundImage = 'url("' + fastAsset + '")';
      } else {
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = '#0a0c10';
      }
    }
    return true;
  }

  /* 6. 早期并发存储回调：若应用级存储抢先返回，立即注入缓存 */
  if (earlyStoragePromise) {
    earlyStoragePromise.then((items) => {
      if (!items) return;
      try {
        if (items.ag_theme_config_v1) {
          const cfg = JSON.parse(items.ag_theme_config_v1);
          window.__ag_native_theme_config = cfg;
          if (!localStorage.getItem(STORAGE_KEY)) {
            earlyConfig = Object.assign(earlyConfig, cfg);
          }
        }
        if (items.ag_theme_asset_v1) {
          const asset = JSON.parse(items.ag_theme_asset_v1);
          window.__ag_native_asset_payload = asset;
          if (asset && asset.type === 'image' && asset.dataUrl && earlyConfig.mode === 'custom') {
            if (document.body) {
              document.body.style.backgroundImage = 'url("' + asset.dataUrl + '")';
            }
            try { sessionStorage.setItem(ASSET_CACHE_KEY, asset.dataUrl); } catch (e) {}
          }
        }
        window.__ag_theme_native_ready = true;
      } catch (e) {}
    }).catch(() => {});
  }

  /* 7. 尽早挂载首帧样式与壁纸监听 */
  injectEarlyStyle();

  if (!applyInitialWallpaper()) {
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        injectEarlyStyle();
        applyInitialWallpaper();
      }
    });
    observer.observe(document.documentElement || document, { childList: true, subtree: true });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        injectEarlyStyle();
        applyInitialWallpaper();
      }, { once: true });
    }
  }
})();
