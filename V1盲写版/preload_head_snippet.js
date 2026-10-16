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
        ':root {',
        '  --background: #000000 !important;',
        '  --card: #000000 !important;',
        '  --popover: #000000 !important;',
        '  --sidebar: #000000 !important;',
        '  --muted: #0a0a0a !important;',
        '}',
        'html[data-ag-early-mode="native"], body[data-ag-mode="native"], html[data-ag-early-mode="native"] body {',
        '  background-color: #000000 !important;',
        '  background-image: none !important;',
        '}',
        'body[data-ag-mode="native"] aside, body[data-ag-mode="native"] div[data-testid="sidebar-wrapper"], body[data-ag-mode="native"] div.bg-sidebar {',
        '  background-color: #000000 !important;',
        '}',
        'body[data-ag-mode="native"] header, body[data-ag-mode="native"] div[data-testid="top-nav-bar"], body[data-ag-mode="native"] div[data-testid="header-bar"] {',
        '  background-color: #000000 !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'body[data-ag-mode="native"] div[data-pane-id="pane-1"], body[data-ag-mode="native"] [data-aux-pane-open], body[data-ag-mode="native"] div.flex-1.min-w-0.h-full, body[data-ag-mode="native"] div.flex-1.flex.flex-col {',
        '  background-color: #000000 !important;',
        '}',
        'body[data-ag-mode="native"] div.settings-modal-backdrop {',
        '  background-color: rgba(0, 0, 0, 0.75) !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'body[data-ag-mode="native"] div[role="menu"], body[data-ag-mode="native"] div[role="dialog"], body[data-ag-mode="native"] div.settings-modal-container,',
        'body[data-ag-mode="native"] div.settings-modal-container div,',
        'body[data-ag-mode="native"] div[role="dialog"] div,',
        'body[data-ag-mode="native"] div[role="menu"] div,',
        'body[data-ag-mode="native"] div[data-radix-popper-content-wrapper] > div {',
        '  background-color: #000000 !important;',
        '  color: #cccccc !important;',
        '}',
        'body[data-ag-mode="native"] div[data-testid="conversation-view"] > div,',
        'body[data-ag-mode="native"] div[class*="scroll-mt-4"],',
        'body[data-ag-mode="native"] [data-testid="chat-turn-container"],',
        'body[data-ag-mode="native"] div[class*="group/turn"] {',
        '  background-color: transparent !important;',
        '  border: none !important;',
        '  border-radius: 0 !important;',
        '  box-shadow: none !important;',
        '}',
        'body[data-ag-mode="native"] div[data-testid="chat-input-container"],',
        'body[data-ag-mode="native"] div[id="antigravity.agentSidePanelInputBox"],',
        'body[data-ag-mode="native"] #antigravity\\.agentSidePanelInputBox {',
        '  background: transparent !important;',
        '  border: none !important;',
        '  border-radius: 0 !important;',
        '  box-shadow: none !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'body[data-ag-mode="native"] *:not(#ag-theme-modal):not(#ag-theme-modal *):not(#ag-theme-pill):not(#ag-theme-pill *) {',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}'
      ].join('\n');
      targetParent.appendChild(earlyStyle);
      return;
    }

    if (earlyConfig.mode === 'ocean') {
      earlyStyle.textContent = [
        ':root {',
        '  --background: transparent !important;',
        '}',
        'html[data-ag-early-mode="ocean"], body[data-ag-mode="ocean"], html[data-ag-early-mode="ocean"] body {',
        '  background-color: #000000 !important;',
        '  background-image: none !important;',
        '}',
        'body[data-ag-mode="ocean"] aside, body[data-ag-mode="ocean"] div[data-testid="sidebar-wrapper"], body[data-ag-mode="ocean"] div.bg-sidebar {',
        '  background-color: #000000 !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'body[data-ag-mode="ocean"] header, body[data-ag-mode="ocean"] div[data-testid="top-nav-bar"], body[data-ag-mode="ocean"] div[data-testid="header-bar"] {',
        '  background-color: #000000 !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'body[data-ag-mode="ocean"] [data-aux-pane-open], body[data-ag-mode="ocean"] div.flex-1.min-w-0.h-full > div.flex:not(:has(div[data-pane-id="pane-1"])) {',
        '  background-color: #000000 !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'body[data-ag-mode="ocean"] div[data-pane-id="pane-1"],',
        'body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div[class*="group/pane"],',
        'body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div.h-full.w-full,',
        'body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div[data-testid="overview-panel-host"],',
        'body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div.flex-1.min-w-0.h-full,',
        'body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div.flex-1.flex.flex-col,',
        'body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] [data-testid="conversation-view"],',
        'body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] [data-testid="autoscroll-viewport"],',
        'body[data-ag-mode="ocean"] div.w-full.h-full.flex.flex-col.gap-6.justify-start,',
        'body[data-ag-mode="ocean"] div[class*="justify-start"][class*="animate-fade-in"],',
        'body[data-ag-mode="ocean"] div.flex-1.flex.flex-col,',
        'body[data-ag-mode="ocean"] div[data-testid="overview-panel-host"],',
        'body[data-ag-mode="ocean"] div.flex-1.min-w-0.h-full {',
        '  background-color: transparent !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'body[data-ag-mode="ocean"] [data-testid="chat-turn-container"] {',
        '  background-color: transparent !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '  border: none !important;',
        '  box-shadow: none !important;',
        '  margin: 0 !important;',
        '  padding: 0 !important;',
        '}',
        'body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div[class*="scroll-mt-4"],',
        'body[data-ag-mode="ocean"] div[class*="scroll-mt-4"] {',
        '  background-color: rgba(10, 14, 22, 0.12) !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '  border: 1px solid rgba(255, 255, 255, 0.05) !important;',
        '  border-radius: 12px !important;',
        '  box-shadow: none !important;',
        '}',
        'body[data-ag-mode="ocean"] div[class*="scroll-mt-4"] div[class*="group/turn"],',
        'body[data-ag-mode="ocean"] div[class*="scroll-mt-4"] div[data-turn-id],',
        'body[data-ag-mode="ocean"] div[class*="scroll-mt-4"] .bg-card,',
        'body[data-ag-mode="ocean"] div[class*="scroll-mt-4"] .bg-card-border,',
        'body[data-ag-mode="ocean"] div[class*="scroll-mt-4"] .bg-muted,',
        'body[data-ag-mode="ocean"] div[class*="scroll-mt-4"] article,',
        'body[data-ag-mode="ocean"] div[class*="scroll-mt-4"] div[data-testid="user-input-step"],',
        'body[data-ag-mode="ocean"] div[class*="scroll-mt-4"] div:has(> img),',
        'body[data-ag-mode="ocean"] div[class*="scroll-mt-4"] div:has(> div > img),',
        'body[data-ag-mode="ocean"] div.md-sticky-message-bleed {',
        '  background-color: transparent !important;',
        '  border: none !important;',
        '  box-shadow: none !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'body[data-ag-mode="ocean"] div.md-sticky-message-bleed::before,',
        'body[data-ag-mode="ocean"] div.md-sticky-message-bleed::after,',
        'body[data-ag-mode="ocean"] .md-table-bleed .md-sticky-message-bleed::before,',
        'body[data-ag-mode="ocean"] .md-table-bleed .md-sticky-message-bleed::after,',
        'body[data-ag-mode="ocean"] [class*="md-sticky-message-bleed"]::before,',
        'body[data-ag-mode="ocean"] [class*="md-sticky-message-bleed"]::after {',
        '  display: none !important;',
        '  background: transparent !important;',
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
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.h-screen.w-screen.flex.flex-col.bg-background,',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.relative.w-screen[class*="100dvh"],',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.relative.w-screen,',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) #root > div.relative.w-screen,',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) #root {',
      '  background-color: transparent !important;',
      '}',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.border-border:not([data-pane-id="pane-1"]):not([role="dialog"] *):not(.settings-modal-container *),',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.h-full.w-full.overflow-hidden:not([data-pane-id="pane-1"]):not([data-aux-pane-open]):not([role="dialog"]):not([role="dialog"] *):not(.settings-modal-container):not(.settings-modal-container *),',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.flex-1.min-h-0:not([data-pane-id="pane-1"]):not([role="dialog"] *):not(.settings-modal-container *),',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.relative.self-stretch.flex-grow.min-h-0:not([role="dialog"] *):not(.settings-modal-container *),',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.relative.h-full.w-full.min-h-0:not([role="dialog"] *):not(.settings-modal-container *),',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.relative.h-full.w-full.overflow-hidden:not([role="dialog"] *):not(.settings-modal-container *),',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.isolate:not([role="dialog"] *):not(.settings-modal-container *) {',
      '  background-color: transparent !important;',
      '}',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.relative.flex.w-full.h-full.outline-none > div.flex,',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.h-full.w-full.flex.flex-col.pb-2.bg-sidebar,',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) aside,',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid="sidebar-wrapper"],',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.bg-sidebar:not(aside *):not([data-testid="sidebar-wrapper"] *) {',
      '  background-color: var(--ag-left-bg) !important;',
      '  backdrop-filter: blur(var(--ag-left-blur)) saturate(160%) !important;',
      '  -webkit-backdrop-filter: blur(var(--ag-left-blur)) saturate(160%) !important;',
      '  border-right: 1px solid var(--ag-left-border, rgba(255, 255, 255, 0.08)) !important;',
      '}',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.h-full.w-full.flex.flex-col.pb-2.bg-sidebar *,',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.bg-sidebar *,',
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
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-pane-id="pane-1"],',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-pane-id="pane-1"] div[class*="group/pane"] {',
      '  background-color: transparent !important;',
      '  backdrop-filter: none !important;',
      '  -webkit-backdrop-filter: none !important;',
      '}',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) [data-testid="chat-turn-container"] {',
      '  background-color: transparent !important;',
      '  backdrop-filter: none !important;',
      '  -webkit-backdrop-filter: none !important;',
      '  border: none !important;',
      '  box-shadow: none !important;',
      '  margin: 0 !important;',
      '  padding: 0 !important;',
      '}',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.flex-1.flex.flex-col,',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid="overview-panel-host"],',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.flex-1.min-w-0.h-full,',
      'body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-pane-id="pane-1"] [data-testid="conversation-view"] {',
      '  background-color: transparent !important;',
      '  backdrop-filter: none !important;',
      '  -webkit-backdrop-filter: none !important;',
      '}',
      'div.md-sticky-message-bleed::before,',
      'div.md-sticky-message-bleed::after,',
      '.md-table-bleed .md-sticky-message-bleed::before,',
      '.md-table-bleed .md-sticky-message-bleed::after,',
      '[class*="md-sticky-message-bleed"]::before,',
      '[class*="md-sticky-message-bleed"]::after {',
      '  display: none !important;',
      '  background: transparent !important;',
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
        document.documentElement.setAttribute('data-ag-mode', mode);
      }
      document.body.setAttribute('data-ag-mode', mode);
    } catch (e) {}

    if (mode === 'native' || mode === 'ocean') {
      document.body.style.backgroundImage = 'none';
      document.body.style.backgroundColor = '#000000';
    } else if (mode === 'aurora') {
      document.body.style.backgroundImage = 'none';
      document.body.style.backgroundColor = 'transparent';
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

  /* 8. 桌面伴侣 (Desktop Pet) 宿主级启停桥接与开机自启动引擎 */
  const callPetIpc = async (channel, ...args) => {
    // 优先 1：Preload 作用域直出 electron_1.ipcRenderer
    try {
      if (typeof electron_1 !== 'undefined' && electron_1 && electron_1.ipcRenderer) {
        return await electron_1.ipcRenderer.invoke(channel, ...args);
      }
    } catch (e) {}

    // 优先 2：Main World 暴露的 window.electronNative
    try {
      if (typeof window !== 'undefined' && window.electronNative) {
        if (channel === 'pet:start' && typeof window.electronNative.startPet === 'function') {
          return await window.electronNative.startPet();
        }
        if (channel === 'pet:stop' && typeof window.electronNative.stopPet === 'function') {
          return await window.electronNative.stopPet();
        }
        if (channel === 'pet:status' && typeof window.electronNative.getPetStatus === 'function') {
          return await window.electronNative.getPetStatus();
        }
      }
    } catch (e) {}

    // 优先 3：通用 require('electron')（如果环境允许）
    try {
      if (typeof require === 'function') {
        const electron = require('electron');
        if (electron && electron.ipcRenderer) {
          return await electron.ipcRenderer.invoke(channel, ...args);
        }
      }
    } catch (e) {}

    return null;
  };

  const petBridge = {
    isSupported: true,
    startPet: async function () {
      try {
        const res = await callPetIpc('pet:start');
        return !!(res && (res.ok !== false));
      } catch (e) {
        return false;
      }
    },
    stopPet: async function () {
      try {
        const res = await callPetIpc('pet:stop');
        return !!(res && (res.ok !== false));
      } catch (e) {
        return false;
      }
    },
    checkRunning: async function (cb) {
      try {
        const res = await callPetIpc('pet:status');
        const isRunning = !!(res && (
          res.realChecked ? (res.running === true || res.count > 0) : (res.count > 2)
        ));
        if (typeof cb === 'function') cb(isRunning);
        return isRunning;
      } catch (e) {
        if (typeof cb === 'function') cb(false);
        return false;
      }
    }
  };

  window.__ag_pet_bridge = petBridge;
  try {
    if (typeof electron_1 !== 'undefined' && electron_1 && electron_1.contextBridge && typeof electron_1.contextBridge.exposeInMainWorld === 'function') {
      electron_1.contextBridge.exposeInMainWorld('__ag_pet_bridge', petBridge);
    }
  } catch (e) {}

  // 建立跨世界 CustomEvent 窄接口通信，保障任何上下文均能无缝调用
  try {
    document.addEventListener('ag-pet-cmd', async (ev) => {
      const detail = ev.detail || {};
      const action = detail.action;
      if (action === 'start') {
        const ok = await petBridge.startPet();
        document.dispatchEvent(new CustomEvent('ag-pet-status-change', { detail: { action: 'start', ok } }));
      } else if (action === 'stop') {
        const ok = await petBridge.stopPet();
        document.dispatchEvent(new CustomEvent('ag-pet-status-change', { detail: { action: 'stop', ok } }));
      } else if (action === 'check') {
        const running = await petBridge.checkRunning();
        document.dispatchEvent(new CustomEvent('ag-pet-status-change', { detail: { action: 'check', running } }));
      }
    });
  } catch (e) {}

  // 随客户端启动自启动检测（常驻开启项检查）
  try {
    const PET_AUTO_KEY = 'ag_pet_auto_launch_v1';
    const isAuto = localStorage.getItem(PET_AUTO_KEY) === 'true';
    if (isAuto) {
      setTimeout(async () => {
        const running = await petBridge.checkRunning();
        if (!running) {
          await petBridge.startPet();
        }
      }, 1500);
    }
  } catch (e) {}
})();

