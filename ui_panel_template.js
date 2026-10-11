// ==============================================================================
// Antigravity Apple-Inspired 极简极客控制台 (ui_panel.js)
// 设计哲学：对标 Apple 官网纯净设计，全局共享调节联动，彻底深层透底（主对话流/设置/审阅/终端），
// 修复色盘二级响应与 RGB 精准通道，统一纯白字无冗余杂色；
// 进阶特性：
// 1. 晶莹磨砂 (Glass) 与 柔雾类纸膜 (Paper Texture) 一键无缝质感切换；
// 2. 控制台按钮采用锁暝捏捏动态像素墨镜表情包，大小适中位置优雅；
// 3. 支持 MP4 动态视频素材导入与硬件加速全屏循环播放，自适应图片/视频双模无损切换。
// ==============================================================================

(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  function initAppleConsole() {
    if (!document.head || !document.body) {
      setTimeout(initAppleConsole, 30);
      return;
    }

    // 0. 清除旧实例，实现热替换无缝刷新
    if (window.__ag_emoji_timer) {
      clearInterval(window.__ag_emoji_timer);
      window.__ag_emoji_timer = null;
    }
    const oldPill = document.getElementById('ag-theme-pill');
    if (oldPill) oldPill.remove();
    const oldModal = document.getElementById('ag-theme-modal');
    if (oldModal) oldModal.remove();
    document.querySelectorAll('style[id*="antarctica"], style[id*="ag-theme"], style[id*="apple"]').forEach(s => s.remove());

    // 锁暝捏捏动态像素墨镜表情包 (自包含 Base64)
    const SUOMING_SUNGGLASSES_GIF = "___SUOMING_GIF_PLACEHOLDER___";

    // 1. 配置状态管理（默认模式：全局共享调节，左中右完全联动）
    const STORAGE_KEY = 'ag_theme_apple_config_v3';
    const DEFAULT_CONFIG = {
      mode: 'glacier', // 'aurora' | 'custom' | 'glacier'
      textureStyle: 'glass', // 'glass' (晶莹磨砂) | 'paper' (柔雾类纸膜)
      customAssetType: 'image', // 'image' | 'video'
      accentHex: '#0a84ff', // Apple 标志性系统蓝
      accentRgb: [10, 132, 255],
      tuneMode: 'global', // 'global' (全局共享，联动调节) | 'split' (独立分栏微调)
      globalOpacity: 0.50, // 全局统一透明度 (0.10 ~ 0.95)，50% 兼具通透美感与文字可读性
      globalBlur: 24,      // 全局统一高斯模糊 (0 ~ 45px)
      leftOpacity: 0.50,   // 左栏独立透明度
      centerOpacity: 0.50, // 中栏独立透明度 (主对话卡片/设置弹窗)
      rightOpacity: 0.50,  // 右栏独立透明度 (Aux Pane / Review / 终端)
      auroraSpeed: 1.0,
      customAssetUrl: ''
    };

    let config = Object.assign({}, DEFAULT_CONFIG);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        config = Object.assign(config, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('[Apple Theme] 读取缓存配置失败，使用预设值', e);
    }

    // 严格合法性校验与防 NaN 兜底保护
    if (!Array.isArray(config.accentRgb) || config.accentRgb.length !== 3 || config.accentRgb.some(x => typeof x !== 'number' || isNaN(x) || x === null)) {
      config.accentRgb = [10, 132, 255];
      config.accentHex = '#0a84ff';
    }
    if (!config.accentHex || typeof config.accentHex !== 'string' || config.accentHex.toUpperCase().includes('NAN')) {
      config.accentHex = '#0a84ff';
    }
    if (!config.textureStyle || (config.textureStyle !== 'glass' && config.textureStyle !== 'paper')) {
      config.textureStyle = 'glass';
    }
    if (!config.customAssetType) {
      config.customAssetType = 'image';
    }

    // 2. 注入全局 CSS 变量与穿透样式表
    const styleEl = document.createElement('style');
    styleEl.id = 'antarctica-glacier-theme';
    document.head.appendChild(styleEl);

    // 2.1 创建类纸膜微噪点漫反射全屏图层
    let paperLayer = document.getElementById('ag-paper-texture-layer');
    if (!paperLayer) {
      paperLayer = document.createElement('div');
      paperLayer.id = 'ag-paper-texture-layer';
      paperLayer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: -9996;
        pointer-events: none;
        display: none;
        opacity: 0.042;
        mix-blend-mode: overlay;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        background-repeat: repeat;
      `;
      document.body.appendChild(paperLayer);
    }

    // 2.2 创建全屏底层动态视频播放容器
    let videoBg = document.getElementById('ag-dynamic-video-bg');
    if (!videoBg) {
      videoBg = document.createElement('video');
      videoBg.id = 'ag-dynamic-video-bg';
      videoBg.autoplay = true;
      videoBg.loop = true;
      videoBg.muted = true;
      videoBg.playsInline = true;
      videoBg.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        object-fit: cover;
        z-index: -9998;
        pointer-events: none;
        display: none;
      `;
      document.body.appendChild(videoBg);
    }

    let activeVideoBlobUrl = null;

    // IndexedDB 异步存取本地 MP4 视频
    function saveVideoToIndexedDB(blob) {
      try {
        const req = indexedDB.open('ag_media_db', 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('media')) {
            db.createObjectStore('media');
          }
        };
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction('media', 'readwrite');
          tx.objectStore('media').put(blob, 'bg_video');
        };
      } catch (err) {
        console.warn('[Theme] IndexedDB 存储视频失败', err);
      }
    }

    function loadVideoFromIndexedDB(callback) {
      try {
        const req = indexedDB.open('ag_media_db', 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('media')) {
            db.createObjectStore('media');
          }
        };
        req.onsuccess = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('media')) return;
          const tx = db.transaction('media', 'readonly');
          const getReq = tx.objectStore('media').get('bg_video');
          getReq.onsuccess = () => {
            if (getReq.result) {
              callback(getReq.result);
            }
          };
        };
      } catch (err) {
        console.warn('[Theme] IndexedDB 读取视频失败', err);
      }
    }

    function playVideoBlob(blob) {
      if (activeVideoBlobUrl) {
        try { URL.revokeObjectURL(activeVideoBlobUrl); } catch (e) {}
      }
      activeVideoBlobUrl = URL.createObjectURL(blob);
      videoBg.src = activeVideoBlobUrl;
      videoBg.style.display = 'block';
      videoBg.play().catch(e => console.warn('[Video] 自动播放受阻或重试', e));
      document.body.style.backgroundImage = 'none';
      if (stageCanvas) stageCanvas.style.display = 'none';
      config.customAssetType = 'video';
      config.mode = 'custom';
    }

    function applyCssVariables() {
      const root = document.documentElement;
      const [r, g, b] = config.accentRgb;
      
      // 全局共享模式下，左、中、右三栏有效透明度严格受全局滑块联动调节
      const isGlobal = config.tuneMode === 'global';
      const effectiveLeft = isGlobal ? config.globalOpacity : config.leftOpacity;
      const effectiveCenter = isGlobal ? config.globalOpacity : config.centerOpacity;
      const effectiveRight = isGlobal ? config.globalOpacity : config.rightOpacity;

      // 质感风格状态同步
      const isPaper = config.textureStyle === 'paper';
      if (isPaper) {
        document.documentElement.classList.add('ag-texture-paper');
        if (paperLayer) paperLayer.style.display = 'block';
      } else {
        document.documentElement.classList.remove('ag-texture-paper');
        if (paperLayer) paperLayer.style.display = 'none';
      }

      root.style.setProperty('--ag-accent', config.accentHex);
      root.style.setProperty('--ag-accent-rgb', `${r}, ${g}, ${b}`);
      root.style.setProperty('--ag-ambient-tint', `rgba(${r}, ${g}, ${b}, 0.08)`);
      
      // 全局基础透底与高斯模糊
      const effectiveBlur = isPaper ? Math.min(16, config.globalBlur) : config.globalBlur;
      root.style.setProperty('--ag-global-blur', `${effectiveBlur}px`);
      root.style.setProperty('--ag-bg-base-overlay', `rgba(10, 12, 16, ${Math.max(0.01, config.globalOpacity * 0.12)})`);

      // 顶栏 (Top Bar) 调高透明度，实现全局通透一致性
      const topbarOpacity = Math.min(0.35, config.globalOpacity * 0.40);
      root.style.setProperty('--ag-topbar-bg', `rgba(16, 18, 24, ${topbarOpacity})`);

      // 聊天输入框 & 上下文弹出菜单 & 旁路提问专属低透明度磨砂 (通透轻薄，解决颜色过深问题)
      const chatBoxOpacity = Math.min(0.50, effectiveCenter * 0.65);
      root.style.setProperty('--ag-chat-box-bg', `rgba(18, 22, 32, ${chatBoxOpacity})`);
      root.style.setProperty('--ag-chat-box-blur', `${Math.max(20, effectiveBlur)}px`);

      // 左栏 (Sidebar)
      root.style.setProperty('--ag-left-bg', `rgba(16, 18, 24, ${effectiveLeft})`);
      root.style.setProperty('--ag-left-blur', `${effectiveBlur}px`);

      // 中栏 (主视窗、Chat 卡片、设置弹窗)
      root.style.setProperty('--ag-center-bg', `rgba(18, 20, 28, ${effectiveCenter})`);
      root.style.setProperty('--ag-center-card-bg', `rgba(255, 255, 255, ${Math.max(0.02, Math.min(0.06, effectiveCenter * 0.06))})`);
      root.style.setProperty('--ag-dialog-bg', `rgba(20, 22, 30, ${Math.min(0.85, effectiveCenter + 0.10)})`);
      root.style.setProperty('--ag-center-blur', `${effectiveBlur}px`);

      // 右栏 (Aux Pane / Review / Monaco / 终端)
      root.style.setProperty('--ag-right-bg', `rgba(16, 18, 24, ${effectiveRight})`);
      root.style.setProperty('--ag-right-review-bg', `rgba(16, 18, 24, ${effectiveRight})`);
      root.style.setProperty('--ag-right-term-bg', `rgba(12, 14, 18, ${Math.min(0.92, Math.max(0.35, effectiveRight + 0.15))})`);
      root.style.setProperty('--ag-right-blur', `${effectiveBlur}px`);

      // 同步右上角系统窗口控制按钮透明度
      syncTitleBarOverlay();
    }

    function syncTitleBarOverlay() {
      if (typeof window !== 'undefined' && window.electronNative && window.electronNative.setTitleBarOverlay) {
        try {
          window.electronNative.setTitleBarOverlay({
            color: '#00000000',
            symbolColor: '#f5f5f7'
          });
        } catch (e) {}
      }
    }

    // 强化标题栏与右上角按钮的全生命周期透明监听
    if (typeof window !== 'undefined' && !window.__ag_wco_listener_attached) {
      window.__ag_wco_listener_attached = true;
      window.addEventListener('focus', syncTitleBarOverlay);
      window.addEventListener('resize', syncTitleBarOverlay);
      setInterval(syncTitleBarOverlay, 2500);
    }

    // 构建核心深度穿透规则
    const baseThemeCss = `
:root {
  --background: transparent !important;
}

body {
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-attachment: fixed !important;
}

/* 全局工作区透光基底：消除最外层视窗死黑底衬 */
div.h-screen.w-screen.flex.flex-col.bg-background,
div.relative.w-screen.h-\\[100dvh\\],
#root > div.relative.w-screen,
#root {
  background-color: var(--ag-bg-base-overlay) !important;
}

/* 消除所有中间嵌套层的背景阻断 (根本病因根除，保留中栏主视窗) */
div.border-border:not([data-pane-id="pane-1"]),
div.h-full.w-full.overflow-hidden:not([data-pane-id="pane-1"]):not([data-aux-pane-open]),
div.flex-1.min-h-0:not([data-pane-id="pane-1"]),
div.relative.self-stretch.flex-grow.min-h-0,
div.relative.h-full.w-full.min-h-0,
div.relative.h-full.w-full.overflow-hidden,
div.w-full.flex.h-full.min-h-0.flex-col.items-center.relative.outline-none.overflow-y-auto,
div.h-full.overflow-y-auto.min-h-0.w-full.isolate,
div.isolate,
div.flex-1.min-h-0 > div.w-full.h-full,
div.flex.flex-col.gap-6.py-3,
div[data-aux-pane-open] div.relative.h-full.w-full,
div[data-aux-pane-open] div.flex-grow.overflow-hidden,
div[data-aux-pane-open] div[class*="overflow-y-auto"],
div[data-aux-pane-open] div[role="region"],
div[data-aux-pane-open] div.relative.outline-none {
  background-color: transparent !important;
}

/* ---------------------------------------------------- */
/* 1. 左栏 (Sidebar) 区域全面重构为 Apple 极简通透风格    */
/* ---------------------------------------------------- */
div.h-full.w-full.bg-sidebar,
div.h-full.w-full.flex.flex-col.bg-sidebar,
div.flex.items-center.h-full.bg-sidebar,
div[class*="bg-sidebar"],
div.bg-sidebar,
.bg-sidebar,
div[data-testid="sidebar-wrapper"],
aside {
  background-color: var(--ag-left-bg) !important;
  backdrop-filter: blur(var(--ag-left-blur)) saturate(160%) !important;
  -webkit-backdrop-filter: blur(var(--ag-left-blur)) saturate(160%) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* 消除左栏内所有子容器的深黑/深灰/暗土灰补丁底色 */
div.bg-sidebar div.bg-sidebar,
div.bg-sidebar div.bg-sidebar-muted,
div.bg-sidebar div.bg-sidebar-secondary,
div.bg-sidebar div.bg-muted,
div.bg-sidebar div[class*="bg-sidebar"],
div.bg-sidebar div[class*="w-full h-full group"],
div.bg-sidebar div.w-full.h-full.group,
div.bg-sidebar div[class*="group/header"],
div.bg-sidebar div[class*="group/section-header"],
div[data-testid="sidebar-wrapper"] .bg-sidebar,
div[data-testid="sidebar-wrapper"] .bg-sidebar-muted,
div[data-testid="sidebar-wrapper"] .bg-sidebar-secondary,
div[data-testid="sidebar-wrapper"] .bg-muted,
div[data-testid="sidebar-wrapper"] div[class*="w-full h-full group"],
aside .bg-sidebar,
aside .bg-sidebar-muted,
aside .bg-sidebar-secondary,
div.group\\/section-header {
  background-color: transparent !important;
  border-color: transparent !important;
}

/* 1.1 "新建对话"按钮：Apple 典雅高亮纯白微透毛玻璃胶囊 */
[data-testid="new-conversation-button"],
div.bg-sidebar a[class*="bg-sidebar-muted"],
div.bg-sidebar a.bg-sidebar-muted,
div[data-testid="sidebar-wrapper"] a[class*="bg-sidebar-muted"],
aside a[class*="bg-sidebar-muted"] {
  background: rgba(255, 255, 255, 0.09) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  border-radius: 9px !important;
  color: #ffffff !important;
  font-weight: 500 !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

[data-testid="new-conversation-button"]:hover,
div.bg-sidebar a[class*="bg-sidebar-muted"]:hover,
div.bg-sidebar a.bg-sidebar-muted:hover,
div[data-testid="sidebar-wrapper"] a[class*="bg-sidebar-muted"]:hover,
aside a[class*="bg-sidebar-muted"]:hover {
  background: rgba(255, 255, 255, 0.18) !important;
  border-color: rgba(255, 255, 255, 0.30) !important;
  color: #ffffff !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.22) !important;
}

/* 1.2 左栏常规导航项 */
div.bg-sidebar a:not([class*="bg-sidebar-muted"]):not([data-testid="new-conversation-button"]),
div.bg-sidebar button:not([class*="h-5"]):not([class*="h-6"]),
div[data-testid="sidebar-wrapper"] a:not([class*="bg-sidebar-muted"]),
aside a:not([class*="bg-sidebar-muted"]) {
  background-color: transparent !important;
  color: rgba(255, 255, 255, 0.88) !important;
  border-radius: 8px !important;
  border: 1px solid transparent !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

div.bg-sidebar a:not([class*="bg-sidebar-muted"]):not([data-testid="new-conversation-button"]):hover,
div.bg-sidebar button:not([class*="h-5"]):not([class*="h-6"]):not([class*="group/headerbtn"]):hover,
div[data-testid="sidebar-wrapper"] a:not([class*="bg-sidebar-muted"]):hover,
aside a:not([class*="bg-sidebar-muted"]):hover {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
  color: #ffffff !important;
}

/* 1.3 项目列表标题行 */
div.bg-sidebar div[class*="group/section-header"],
div.bg-sidebar div[class*="group/section-header"] button,
div.bg-sidebar div[class*="group/section-header"] span,
div[class*="group/section-header"] {
  background: transparent !important;
  color: rgba(255, 255, 255, 0.75) !important;
  font-weight: 500 !important;
}

/* 1.4 文件夹条目与表头按钮 */
div.bg-sidebar button[class*="group/headerbtn"],
div.bg-sidebar div[class*="group/header"] button,
button[class*="group/headerbtn"] {
  background: transparent !important;
  border: none !important;
  color: #ffffff !important;
  font-weight: 500 !important;
  border-radius: 7px !important;
  transition: all 0.2s ease !important;
}

div.bg-sidebar button[class*="group/headerbtn"]:hover,
div.bg-sidebar div[class*="group/header"] button:hover,
button[class*="group/headerbtn"]:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
}

/* 1.5 会话列表条目 */
div.bg-sidebar div.w-full.h-full.group,
div[data-testid="sidebar-wrapper"] div.w-full.h-full.group,
aside div.w-full.h-full.group {
  background-color: transparent !important;
  margin: 2px 0 !important;
}

/* 未激活的会话条目 */
div.bg-sidebar div[class*="group pl-[30px]"]:not(.bg-sidebar-secondary),
div[data-testid="sidebar-wrapper"] div[class*="group pl-[30px]"]:not(.bg-sidebar-secondary),
aside div[class*="group pl-[30px]"]:not(.bg-sidebar-secondary) {
  background-color: transparent !important;
  color: rgba(255, 255, 255, 0.82) !important;
  border-radius: 8px !important;
  border: 1px solid transparent !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

div.bg-sidebar div[class*="group pl-[30px]"]:not(.bg-sidebar-secondary):hover,
div[data-testid="sidebar-wrapper"] div[class*="group pl-[30px]"]:not(.bg-sidebar-secondary):hover,
aside div[class*="group pl-[30px]"]:not(.bg-sidebar-secondary):hover {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
}

/* 当前激活选中的会话项 (Apple 风格典雅微透卡片) */
div.bg-sidebar div[class*="group pl-[30px]"].bg-sidebar-secondary,
div.bg-sidebar div.bg-sidebar-secondary,
div[data-testid="sidebar-wrapper"] div.bg-sidebar-secondary,
aside div.bg-sidebar-secondary {
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  border-radius: 8px !important;
  color: #ffffff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.14) !important;
}

/* 1.6 左侧栏图标与文字统一纯白 */
div.bg-sidebar svg,
div.bg-sidebar span,
div.bg-sidebar p,
div[data-testid="sidebar-wrapper"] svg,
aside svg {
  color: #ffffff !important;
  fill: currentColor !important;
}

/* ---------------------------------------------------- */
/* 2. 顶栏 (Top Bar) 通透磨砂与右上角控制按钮平滑过度     */
/* ---------------------------------------------------- */
header,
div[class*="border-b bg-background"],
div[class*="h-11 flex items-center"],
div[class*="h-10 flex items-center"],
div[data-testid="top-nav-bar"],
div[data-testid="header-bar"] {
  background-color: var(--ag-topbar-bg) !important;
  backdrop-filter: blur(28px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(180%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* 面包屑导航与标题 (纯白字) */
header span,
header button,
header a,
div[data-testid="top-nav-bar"] span,
div[data-testid="top-nav-bar"] button {
  color: #ffffff !important;
}

/* 右上角按钮区域消除突兀纯黑断层 */
div.titlebar-drag-region,
div.titlebar,
div[style*="app-region: drag"],
div[style*="-webkit-app-region: drag"] {
  background-color: transparent !important;
}

/* ---------------------------------------------------- */
/* 3. 中栏 (Main Chat Viewport) 主视窗整体磨砂底衬与 UI 风格纯净统一 */
/* ---------------------------------------------------- */
/* 3.0 中栏最外层主视窗容器挂载 --ag-center-bg 与磨砂模糊，彻底解决中栏调控失效 */
div[data-pane-id="pane-1"],
div.group\\/pane[data-pane-id="pane-1"],
div.flex-1.flex.flex-col.min-w-0.h-full:has(> div[data-pane-id="pane-1"]),
div[data-testid="conversation-view"] {
  background-color: var(--ag-center-bg) !important;
  backdrop-filter: blur(var(--ag-center-blur)) saturate(160%) !important;
  -webkit-backdrop-filter: blur(var(--ag-center-blur)) saturate(160%) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* 中栏主视窗内部嵌套滚动层背景全部透通，杜绝死黑与多层杂色阻断 */
div[data-pane-id="pane-1"] div.h-full.w-full.overflow-hidden,
div[data-pane-id="pane-1"] div.w-full.flex.h-full.min-h-0.flex-col.items-center.relative.outline-none.overflow-y-auto,
div[data-pane-id="pane-1"] div.relative.self-stretch.flex-grow.min-h-0,
div[data-pane-id="pane-1"] div.relative.h-full.w-full.min-h-0,
div[data-pane-id="pane-1"] div.h-full.overflow-y-auto.min-h-0.w-full.isolate,
div[data-pane-id="pane-1"] .bg-background {
  background-color: transparent !important;
}

/* 为真实的主滚动容器强制注入顶部安全留白内边距，文字绝不顶格钻入顶栏遮挡 */
div.flex-1.min-h-0.overflow-y-auto,
div.flex-1.min-h-0.overflow-auto,
div.overflow-y-auto.flex-1,
div[class*="overflow-y-auto"][class*="flex-1"],
div.w-full.flex.h-full.min-h-0.flex-col.items-center.relative.outline-none.overflow-y-auto,
div.h-full.overflow-y-auto.min-h-0.w-full.isolate {
  padding-top: 56px !important;
  scroll-padding-top: 56px !important;
}

/* 消除所有强制顶格的 sticky 粘滞黑条与渐变蒙版 */
div.sticky.top-0,
div[class*="sticky top-0"],
div.sticky {
  position: relative !important;
  top: auto !important;
  background-color: transparent !important;
  mask-image: none !important;
  -webkit-mask-image: none !important;
}

/* 消除顶部渐变雾化遮挡罩 */
div[class*="mask-image"],
div[style*="mask-image"],
div[style*="-webkit-mask-image"] {
  mask-image: none !important;
  -webkit-mask-image: none !important;
}

/* 3.1 主对话 Turn 容器：统一纯净磨砂玻璃微透卡片 */
div[class*="scroll-mt-4"],
[data-testid="chat-turn-container"],
div[class*="group/turn"],
div[data-turn-id],
div[class*="border-border/50"],
div[class*="bg-background/50"] {
  background-color: var(--ag-center-card-bg) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 14px !important;
  margin: 10px 0 !important;
  padding: 14px 18px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

/* 3.2 彻底清除 Turn 内部一切无意义的死黑死灰堆叠层 (中栏风格统一核心) */
div[class*="scroll-mt-4"] div.relative.bg-background,
div[class*="scroll-mt-4"] div.md-sticky-message-bleed,
div[class*="scroll-mt-4"] div.bg-card,
div[class*="scroll-mt-4"] div.bg-card-border,
div[class*="scroll-mt-4"] div.bg-muted,
div[class*="scroll-mt-4"] div.leading-relaxed,
div[class*="scroll-mt-4"] div[data-testid="user-input-step"],
div[class*="scroll-mt-4"] article {
  background-color: transparent !important;
  box-shadow: none !important;
}

/* 消除顶部渐变雾化遮挡罩伪元素 */
div[class*="scroll-mt-4"] div.md-sticky-message-bleed::after {
  display: none !important;
}

/* 3.3 用户提问卡片统一：高雅纯净半透微光胶囊 */
div[class*="scroll-mt-4"] div[data-testid="user-input-step"] div[data-testid="lifted-context-menu-trigger"],
div[class*="scroll-mt-4"] div[data-testid="user-input-step"] div[class*="bg-card-border"] {
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.09) !important;
  border-radius: 12px !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  box-shadow: none !important;
  padding: 6px 10px !important;
}

/* 消除用户提问悬浮按键区域黑色光晕阴影 */
div.user-input-buttons-shadow,
div.user-input-buttons-container {
  box-shadow: none !important;
  background: transparent !important;
}

/* 3.4 思考过程与工具调用折叠框统一风格 (纯净磨砂胶囊) */
div[class*="scroll-mt-4"] button.group.tabular-nums,
div[class*="scroll-mt-4"] button[class*="tabular-nums"],
div[class*="scroll-mt-4"] div.relative:has(> button.tabular-nums) {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 8px !important;
  color: rgba(255, 255, 255, 0.88) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  box-shadow: none !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

div[class*="scroll-mt-4"] button.group.tabular-nums:hover {
  background: rgba(255, 255, 255, 0.09) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

/* 3.5 子智能体任务卡片 (Agent Subtask Card) 统一风格 */
div[class*="scroll-mt-4"] div[class*="group/agent-card"] {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 10px !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  box-shadow: none !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

div[class*="scroll-mt-4"] div[class*="group/agent-card"]:hover {
  background: rgba(255, 255, 255, 0.09) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
}

/* 3.6 更改文件统计条与审阅按钮统一风格 */
div[class*="scroll-mt-4"] div.files-changed-header,
div.files-changed-header {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 10px !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
}

button.review-button,
button[class*="review-button"] {
  background: rgba(255, 255, 255, 0.10) !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 7px !important;
  color: #ffffff !important;
}

/* 3.7 代码块 pre 与行内代码 code 统一高质感半透纯净风格 */
div[class*="scroll-mt-4"] pre,
pre {
  background-color: rgba(10, 12, 18, 0.50) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 10px !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
}

div[class*="scroll-mt-4"] code:not(pre code),
code:not(pre code) {
  background-color: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 5px !important;
  padding: 1px 5px !important;
}

/* 3.8 旁路提问与引用框统一风格 */
div[data-testid="side-question-panel"] {
  background-color: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  box-shadow: none !important;
}

div[data-testid="side-question-panel"] div.border-b {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  background: transparent !important;
}

blockquote,
div[class*="markdown-alert"] {
  background-color: rgba(255, 255, 255, 0.04) !important;
  border-left: 3px solid var(--ag-accent) !important;
  border-top: none !important;
  border-right: none !important;
  border-bottom: none !important;
  border-radius: 0 8px 8px 0 !important;
  backdrop-filter: blur(10px) !important;
  padding: 8px 12px !important;
}

/* 3.9 底部输入框整体磨砂与子智能体状态栏无缝整合 */
div[data-testid="chat-input-container"],
div[id="antigravity.agentSidePanelInputBox"],
#antigravity\.agentSidePanelInputBox,
div[class*="border-input"][class*="rounded-"],
div.relative.flex.flex-col.items-stretch.rounded-2xl {
  background-color: var(--ag-chat-box-bg) !important;
  backdrop-filter: blur(var(--ag-chat-box-blur)) saturate(180%) !important;
  -webkit-backdrop-filter: blur(var(--ag-chat-box-blur)) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 16px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.20) !important;
  overflow: visible !important;
}

div[id="antigravity.agentSidePanelInputBox"] > div:not(.bottom-full):not([data-mention-menu]),
div[id="antigravity.agentSidePanelInputBox"] div.bg-card:not(.bottom-full):not([data-mention-menu]),
div[id="antigravity.agentSidePanelInputBox"] div.bg-card-border:not(.bottom-full):not([data-mention-menu]) {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* 输入框内部子智能体状态行 */
div[id="antigravity.agentSidePanelInputBox"] div:has(> button[aria-label*="subagents running"]),
div[id="antigravity.agentSidePanelInputBox"] div.flex.items-center.justify-between.cursor-pointer {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  padding: 4px 12px !important;
  background: transparent !important;
}

/* 输入框内部文本与文本域透底 */
div[data-testid="chat-input-container"] textarea,
textarea[data-testid="chat-input-textarea"],
textarea.bg-transparent,
textarea {
  background: transparent !important;
  color: #ffffff !important;
  caret-color: var(--ag-accent) !important;
}

/* 3.10 上下文选择二级菜单 & 快捷命令 Slash / Actions 三级浮层 */
/* 排除光标锚点微型节点，防止 6px 细黑长条伪影 */
#typeahead-menu,
div[id="typeahead-menu"] {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  box-shadow: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

/* 保护 Actions / Mentions / Slash 向上弹出的三级浮层卡片磨砂质感与层级 */
div[id="antigravity.agentSidePanelInputBox"] div.bottom-full,
div[id="antigravity.agentSidePanelInputBox"] div[data-mention-menu],
div.bottom-full[role="listbox"],
div.bottom-full.bg-card {
  background-color: rgba(20, 24, 34, 0.78) !important;
  backdrop-filter: blur(32px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(190%) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 16px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
  z-index: 1000 !important;
}

/* 移除浮层底部的渐变淡化遮罩，保持全部条目清晰可读 */
div.bottom-full > div[style*="mask-image"],
div[data-mention-menu] > div[style*="mask-image"] {
  mask-image: none !important;
  -webkit-mask-image: none !important;
}

/* 浮层内列表项与高亮态 Apple 极简工业风格 */
div.bottom-full [role="option"],
div[data-mention-menu] [role="option"] {
  color: rgba(255, 255, 255, 0.90) !important;
}
div.bottom-full [role="option"] [data-testid="menu-option-label"],
div[data-mention-menu] [role="option"] [data-testid="menu-option-label"] {
  color: #ffffff !important;
  font-weight: 500 !important;
}
div.bottom-full [role="option"] [data-testid="menu-option-description"],
div[data-mention-menu] [role="option"] [data-testid="menu-option-description"] {
  color: rgba(255, 255, 255, 0.65) !important;
}
div.bottom-full [role="option"] svg,
div[data-mention-menu] [role="option"] svg {
  color: rgba(255, 255, 255, 0.85) !important;
}
div.bottom-full [role="option"][aria-selected="true"] > div,
div.bottom-full [role="option"]:hover > div,
div[data-mention-menu] [role="option"][aria-selected="true"] > div,
div[data-mention-menu] [role="option"]:hover > div {
  background: rgba(255, 255, 255, 0.12) !important;
  border-radius: 8px !important;
  color: #ffffff !important;
}

/* Base UI / Radix 弹出菜单磨砂毛玻璃卡片（包含二级添加上下文菜单） */
div[data-radix-popper-content-wrapper],
div[role="menu"],
div[role="listbox"]:not(#typeahead-menu):not(.bottom-full),
div.z-50.min-w-\\[8rem\\].overflow-hidden.rounded-md,
div[class*="bg-popover"],
div.bg-popover,
.bg-popover {
  background-color: rgba(22, 26, 36, 0.72) !important;
  backdrop-filter: blur(32px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(190%) !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 12px !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.40), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
}

/* 二级菜单文本统一纯白清晰度 */
div[role="menu"] [role="menuitem"],
div[role="menu"] [role="menuitem"] span {
  color: #ffffff !important;
}

/* 菜单项悬停 Apple 风格纯净微透卡片 */
div[role="menu"] [role="menuitem"]:hover,
div[role="listbox"]:not(.bottom-full) [role="option"]:hover,
div.bg-popover button:hover,
div.bg-popover [class*="hover:bg-accent"]:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #ffffff !important;
  border-radius: 7px !important;
}

/* ---------------------------------------------------- */
/* 4. 类纸膜 (Paper Texture) 专属漫反射与素描纸质样式    */
/* ---------------------------------------------------- */
.ag-texture-paper {
  --ag-global-blur: 14px !important;
  --ag-left-blur: 14px !important;
  --ag-center-blur: 14px !important;
  --ag-right-blur: 14px !important;
}

.ag-texture-paper aside,
.ag-texture-paper div.bg-sidebar,
.ag-texture-paper [data-testid="sidebar-wrapper"] {
  backdrop-filter: blur(14px) contrast(1.02) brightness(0.98) !important;
  -webkit-backdrop-filter: blur(14px) contrast(1.02) brightness(0.98) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.ag-texture-paper div[data-pane-id="pane-1"],
.ag-texture-paper div[data-testid="conversation-view"] {
  backdrop-filter: blur(14px) contrast(1.02) brightness(0.98) !important;
  -webkit-backdrop-filter: blur(14px) contrast(1.02) brightness(0.98) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.ag-texture-paper div[class*="scroll-mt-4"],
.ag-texture-paper [data-testid="chat-turn-container"],
.ag-texture-paper div[class*="group/turn"] {
  backdrop-filter: blur(14px) contrast(1.02) brightness(0.98) !important;
  -webkit-backdrop-filter: blur(14px) contrast(1.02) brightness(0.98) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.16) !important;
}

.ag-texture-paper div[data-aux-pane-open],
.ag-texture-paper div[data-aux-pane-open="true"] {
  backdrop-filter: blur(14px) contrast(1.02) brightness(0.98) !important;
  -webkit-backdrop-filter: blur(14px) contrast(1.02) brightness(0.98) !important;
  border-left: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.ag-texture-paper #ag-theme-modal {
  backdrop-filter: blur(20px) contrast(1.02) brightness(0.98) !important;
  -webkit-backdrop-filter: blur(20px) contrast(1.02) brightness(0.98) !important;
}

/* ---------------------------------------------------- */
/* 5. 设置弹窗 (Settings Dialog) 深度通透与磨砂          */
/* ---------------------------------------------------- */
div[role="dialog"],
div.fixed.z-50.grid.w-full.max-w-lg,
div[data-testid="settings-modal"],
div[data-testid="modal-container"] {
  background-color: var(--ag-dialog-bg) !important;
  backdrop-filter: blur(34px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(34px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 18px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.16) !important;
}

/* 消除设置弹窗子区域死灰底色 */
div[role="dialog"] div.bg-muted,
div[role="dialog"] div.bg-card,
div[role="dialog"] div.bg-background,
div[role="dialog"] .bg-muted,
div[role="dialog"] .bg-card,
div[role="dialog"] .bg-background {
  background-color: transparent !important;
}

/* ---------------------------------------------------- */
/* 6. 右栏 (Aux Pane / Review / Terminal / Monaco) 全域透底与磨砂 */
/* ---------------------------------------------------- */
/* 6.0 消除右栏外层容器的双重深色叠加与边框阻断 */
div.relative.flex-1.flex.min-w-0.h-full:has(> [data-aux-pane-open]),
div:has(> [data-aux-pane-open]) {
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
}

/* 6.1 右栏最外层主视窗挂载 --ag-right-bg 磨砂底衬 */
div.h-full.w-full[data-aux-pane-open],
div.h-full.w-full[data-aux-pane-open="true"],
div[data-aux-pane-open="true"],
div[data-aux-pane-open],
div[data-testid="review-pane"] {
  background-color: var(--ag-right-bg) !important;
  backdrop-filter: blur(var(--ag-right-blur)) saturate(160%) !important;
  -webkit-backdrop-filter: blur(var(--ag-right-blur)) saturate(160%) !important;
  border-left: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* 6.2 右栏内部嵌套视窗、Diff 审阅与文件列表消除死黑阻断 */
div[data-aux-pane-open] .bg-background,
div[data-aux-pane-open] div.flex-grow.overflow-hidden,
div[data-aux-pane-open] div.w-full.bg-background,
div[data-aux-pane-open] div.flex-col.gap-3.overflow-y-auto.h-full.w-full.bg-background,
div[data-aux-pane-open] div.flex.cursor-pointer.select-none.items-center.justify-between.bg-background {
  background-color: transparent !important;
}

/* 6.3 Monaco 代码编辑器全域透底 (消除深黑拦截) */
div[data-aux-pane-open] .monaco-editor,
div[data-aux-pane-open] .monaco-editor-background,
div[data-aux-pane-open] .monaco-editor .margin,
div[data-aux-pane-open] .monaco-editor .overflow-guard,
div[data-aux-pane-open] .monaco-editor .view-lines,
div[data-aux-pane-open] .monaco-workbench .part.editor,
div[data-aux-pane-open] .monaco-workbench .part.editor > .content {
  background-color: transparent !important;
}

/* 6.4 终端 (xterm) 专属磨砂与消除死黑 */
div[data-aux-pane-open] .xterm,
div[data-aux-pane-open] .xterm-viewport,
div[data-aux-pane-open] .xterm-screen,
div[data-aux-pane-open] .terminal,
div[data-aux-pane-open] [data-testid="terminal-container"] {
  background-color: var(--ag-right-term-bg) !important;
  backdrop-filter: blur(var(--ag-right-blur)) saturate(160%) !important;
  -webkit-backdrop-filter: blur(var(--ag-right-blur)) saturate(160%) !important;
}

div[data-aux-pane-open] .xterm-scrollable-element,
div[data-aux-pane-open] .composition-view {
  background-color: transparent !important;
}

/* 6.5 右栏内部顶栏与标签 */
div[data-aux-pane-open] div.shrink-0.flex.items-center,
div[data-aux-pane-open] div[data-active-tab-id] {
  background-color: rgba(255, 255, 255, 0.03) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* 右栏顶栏标签页按钮 */
div[data-aux-pane-open] button.bg-secondary,
div[data-aux-pane-open] button[aria-label*="标签页"].bg-secondary {
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  color: #ffffff !important;
}

/* 6.6 右栏卡片组件 (Subagent 列表项) */
div[data-aux-pane-open] [data-testid="subagent-node"],
div[data-aux-pane-open] div.flex.flex-col.rounded-lg.overflow-hidden.cursor-pointer {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 8px !important;
  color: #ffffff !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  margin-bottom: 6px !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

div[data-aux-pane-open] [data-testid="subagent-node"]:hover,
div[data-aux-pane-open] div.flex.flex-col.rounded-lg.overflow-hidden.cursor-pointer:hover {
  background: rgba(255, 255, 255, 0.09) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
}

/* 6.7 右栏文件胶囊与产物条目 */
div[data-aux-pane-open] button.inline-pill,
div[data-aux-pane-open] button[class*="inline-pill"] {
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 6px !important;
  color: #ffffff !important;
}

div[data-aux-pane-open] span,
div[data-aux-pane-open] p,
div[data-aux-pane-open] button {
  color: #ffffff !important;
}

/* Apple 风格纯净滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.22);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.38);
}

/* 控制台所有文字统一纯白字，去除任何杂色与图标 */
#ag-theme-modal,
#ag-theme-modal *,
#ag-theme-pill,
#ag-theme-pill * {
  color: #ffffff !important;
}
#ag-theme-modal span.val,
#ag-theme-modal button,
#ag-theme-modal div,
#ag-theme-modal span,
#ag-theme-modal p {
  color: #ffffff !important;
}
`;

    styleEl.textContent = baseThemeCss;
    applyCssVariables();

    // 3. 构建 WebGL 动态极光流体画布 (仅在极光模式运行)
    let stageCanvas = document.getElementById('ag-dynamic-stage-canvas');
    if (!stageCanvas) {
      stageCanvas = document.createElement('canvas');
      stageCanvas.id = 'ag-dynamic-stage-canvas';
      stageCanvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: -9999;
        pointer-events: none;
        display: none;
        opacity: 0.95;
      `;
      document.body.appendChild(stageCanvas);
    }

    let shaderGl = null;
    let shaderProgram = null;
    let shaderAnimFrame = null;

    function initAuroraShader() {
      if (shaderProgram) return;
      try {
        shaderGl = stageCanvas.getContext('webgl');
        if (!shaderGl) return;

        const vsSrc = `
          attribute vec2 a_pos;
          void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
        `;
        const fsSrc = `
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
        const vs = shaderGl.createShader(shaderGl.VERTEX_SHADER);
        shaderGl.shaderSource(vs, vsSrc);
        shaderGl.compileShader(vs);

        const fs = shaderGl.createShader(shaderGl.FRAGMENT_SHADER);
        shaderGl.shaderSource(fs, fsSrc);
        shaderGl.compileShader(fs);

        shaderProgram = shaderGl.createProgram();
        shaderGl.attachShader(shaderProgram, vs);
        shaderGl.attachShader(shaderProgram, fs);
        shaderGl.linkProgram(shaderProgram);

        const quadBuf = shaderGl.createBuffer();
        shaderGl.bindBuffer(shaderGl.ARRAY_BUFFER, quadBuf);
        shaderGl.bufferData(shaderGl.ARRAY_BUFFER, new Float32Array([
          -1, -1, 1, -1, -1, 1,
          -1, 1, 1, -1, 1, 1
        ]), shaderGl.STATIC_DRAW);

        const aPos = shaderGl.getAttribLocation(shaderProgram, 'a_pos');
        shaderGl.enableVertexAttribArray(aPos);
        shaderGl.vertexAttribPointer(aPos, 2, shaderGl.FLOAT, false, 0, 0);

        function render(time) {
          if (stageCanvas.style.display === 'none') return;
          stageCanvas.width = window.innerWidth * 0.75;
          stageCanvas.height = window.innerHeight * 0.75;
          shaderGl.viewport(0, 0, stageCanvas.width, stageCanvas.height);
          shaderGl.useProgram(shaderProgram);
          shaderGl.uniform2f(shaderGl.getUniformLocation(shaderProgram, 'u_res'), stageCanvas.width, stageCanvas.height);
          shaderGl.uniform1f(shaderGl.getUniformLocation(shaderProgram, 'u_time'), time * 0.001 * config.auroraSpeed);
          const [r, g, b] = config.accentRgb;
          shaderGl.uniform3f(shaderGl.getUniformLocation(shaderProgram, 'u_accent'), r / 255, g / 255, b / 255);
          shaderGl.drawArrays(shaderGl.TRIANGLES, 0, 6);
          shaderAnimFrame = requestAnimationFrame(render);
        }
        shaderAnimFrame = requestAnimationFrame(render);
      } catch (err) {
        console.warn('[Apple Theme] WebGL 启动失败', err);
      }
    }

    function applyMode(modeKey, customUrl = '') {
      config.mode = modeKey;
      if (modeKey === 'aurora') {
        if (videoBg) { videoBg.style.display = 'none'; videoBg.pause(); }
        document.body.style.backgroundImage = 'none';
        stageCanvas.style.display = 'block';
        initAuroraShader();
      } else if (modeKey === 'custom' && config.customAssetType === 'video') {
        stageCanvas.style.display = 'none';
        document.body.style.backgroundImage = 'none';
        if (videoBg) {
          videoBg.style.display = 'block';
          videoBg.play().catch(() => {});
        }
      } else if (modeKey === 'custom' && customUrl) {
        if (videoBg) { videoBg.style.display = 'none'; videoBg.pause(); }
        stageCanvas.style.display = 'none';
        config.customAssetUrl = customUrl;
        document.body.style.backgroundImage = `url('${customUrl}')`;
      } else {
        // 默认冰川底图
        if (videoBg) { videoBg.style.display = 'none'; videoBg.pause(); }
        stageCanvas.style.display = 'none';
        const defBg = config.customAssetUrl || (typeof window !== 'undefined' && window.__ag_default_wallpaper ? window.__ag_default_wallpaper : '');
        document.body.style.backgroundImage = defBg ? `url('${defBg}')` : '';
      }
      applyCssVariables();
    }

    // 尝试从 IndexedDB 恢复可能已导入的 MP4 视频
    if (config.mode === 'custom' && config.customAssetType === 'video') {
      loadVideoFromIndexedDB((savedBlob) => {
        if (savedBlob && config.mode === 'custom' && config.customAssetType === 'video') {
          playVideoBlob(savedBlob);
        }
      });
    }

    // 4. 控制台按钮采用锁暝捏捏动态表情包，全量表情包 10s 依次轮换 (大小适中，位置与原样式相同)
    const emojiList = (typeof window !== 'undefined' && Array.isArray(window.__ag_suoming_emojis) && window.__ag_suoming_emojis.length > 0)
      ? window.__ag_suoming_emojis
      : [SUOMING_SUNGGLASSES_GIF];
    let currentEmojiIdx = 0;

    const pill = document.createElement('div');
    pill.id = 'ag-theme-pill';
    pill.title = '视觉控制台 (⌥T / 点击展开)';
    pill.innerHTML = `
      <img src="${emojiList[0]}" alt="锁暝表情包" style="width: 44px; height: 44px; object-fit: contain; display: block; border-radius: 8px; pointer-events: none; transition: opacity 0.25s ease;" />
    `;
    pill.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 28px;
      z-index: 9999999;
      width: 52px;
      height: 52px;
      padding: 4px;
      box-sizing: border-box;
      background: rgba(20, 24, 32, 0.52);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.20);
      border-radius: 14px;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.20);
      user-select: none;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, background 0.22s ease;
    `;
    pill.onmouseenter = () => {
      pill.style.background = 'rgba(28, 34, 46, 0.75)';
      pill.style.transform = 'scale(1.10)';
      pill.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.40), 0 0 14px rgba(255, 255, 255, 0.22)';
    };
    pill.onmouseleave = () => {
      pill.style.background = 'rgba(20, 24, 32, 0.52)';
      pill.style.transform = 'scale(1)';
      pill.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.20)';
    };
    document.body.appendChild(pill);

    // 启动 10 秒定时顺序轮播全部表情包
    if (emojiList.length > 1) {
      window.__ag_emoji_timer = setInterval(() => {
        currentEmojiIdx = (currentEmojiIdx + 1) % emojiList.length;
        const imgEl = document.querySelector('#ag-theme-pill img');
        if (imgEl) {
          imgEl.style.opacity = '0';
          setTimeout(() => {
            imgEl.src = emojiList[currentEmojiIdx];
            imgEl.style.opacity = '1';
          }, 220);
        }
      }, 10000);
    }

    // 徽标拖拽防止阻挡
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialRight = 28, initialBottom = 24;
    let dragMoved = false;

    pill.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      pill.style.cursor = 'grabbing';
      const rect = pill.getBoundingClientRect();
      initialRight = window.innerWidth - rect.right;
      initialBottom = window.innerHeight - rect.bottom;
      e.stopPropagation();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
      const newRight = Math.max(12, Math.min(window.innerWidth - 70, initialRight - dx));
      const newBottom = Math.max(12, Math.min(window.innerHeight - 70, initialBottom - dy));
      pill.style.right = `${newRight}px`;
      pill.style.bottom = `${newBottom}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        pill.style.cursor = 'grab';
      }
    });

    pill.addEventListener('click', (e) => {
      if (dragMoved) return;
      togglePanel();
      e.stopPropagation();
    });

    // 5. Apple 极简纯净控制台模态层
    const modal = document.createElement('div');
    modal.id = 'ag-theme-modal';
    modal.style.cssText = `
      position: fixed;
      bottom: 84px;
      right: 28px;
      width: 350px;
      max-width: 92vw;
      background: rgba(22, 25, 34, 0.88);
      backdrop-filter: blur(40px) saturate(200%);
      -webkit-backdrop-filter: blur(40px) saturate(200%);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.18);
      z-index: 99999999;
      display: none;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
      animation: agModalSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    `;

    const animStyle = document.createElement('style');
    animStyle.textContent = `
      @keyframes agModalSlideUp {
        from { opacity: 0; transform: translateY(14px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .ag-apple-segmented {
        display: flex;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 3px;
        gap: 2px;
      }
      .ag-apple-segment-item {
        flex: 1;
        padding: 6px 0;
        text-align: center;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 500;
        color: #ffffff !important;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        border: none;
        background: transparent;
      }
      .ag-apple-segment-item.active {
        background: rgba(255, 255, 255, 0.22);
        color: #ffffff !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .ag-apple-slider-row {
        margin: 10px 0;
      }
      .ag-apple-slider-header {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 500;
        color: #ffffff;
        margin-bottom: 5px;
      }
      .ag-apple-slider-header span.val {
        color: #ffffff !important;
        font-family: -apple-system, BlinkMacSystemFont, monospace;
        font-weight: 600;
      }
      .ag-apple-slider {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.16);
        outline: none;
        margin: 6px 0;
      }
      .ag-apple-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: #ffffff;
        cursor: pointer;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
        transition: transform 0.12s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .ag-apple-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      .ag-apple-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 12px 14px;
        margin-bottom: 12px;
      }
      .ag-apple-rgb-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .ag-apple-rgb-tag {
        width: 16px;
        font-size: 11px;
        font-weight: 600;
        color: #ffffff !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Mono", monospace;
      }
    `;
    document.head.appendChild(animStyle);

    modal.innerHTML = `
      <!-- 一级页面: Apple 官网极简主控制台 -->
      <div id="ag-view-main" style="display: flex; flex-direction: column; padding: 18px 20px; overflow-y: auto; max-height: 86vh;">
        
        <!-- 顶栏标题与关闭按键 (无多余圆点图标，纯白字) -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <span style="font-weight: 600; font-size: 13px; letter-spacing: -0.2px; color: #ffffff;">视觉呈现设置</span>
          <button id="ag-btn-close" style="background: transparent; border: none; color: #ffffff; font-size: 14px; cursor: pointer; padding: 2px 6px; border-radius: 6px; transition: opacity 0.15s; opacity: 0.85;">✕</button>
        </div>

        <!-- 核心底图模式分段切换 (纯白字极简风格) -->
        <div class="ag-apple-segmented" style="margin-bottom: 14px;">
          <button class="ag-apple-segment-item ${config.mode === 'aurora' ? 'active' : ''}" id="ag-tab-aurora">
            <span>动态极光</span>
          </button>
          <button class="ag-apple-segment-item ${config.mode === 'glacier' || config.mode === 'custom' ? 'active' : ''}" id="ag-tab-custom">
            <span>本地素材</span>
          </button>
        </div>

        <!-- 极光控制模块 (统一白字) -->
        <div id="ag-panel-aurora" class="ag-apple-card" style="display: ${config.mode === 'aurora' ? 'block' : 'none'};">
          <div class="ag-apple-slider-header" style="margin-bottom: 6px;">
            <span style="font-weight: 500; color: #ffffff;">极光流动速率</span>
            <span class="val" id="val-aurora-speed" style="color: #ffffff;">${config.auroraSpeed.toFixed(1)}x</span>
          </div>
          <input type="range" class="ag-apple-slider" id="slide-aurora-speed" min="2" max="25" value="${Math.round(config.auroraSpeed * 10)}" />
        </div>

        <!-- 本地素材拖拽与导入模块 (支持图片与 MP4 视频，统一白字) -->
        <div id="ag-panel-custom" class="ag-apple-card" style="display: ${config.mode !== 'aurora' ? 'block' : 'none'}; cursor: pointer;">
          <input type="file" id="ag-file-input" accept="image/*,video/mp4,video/*" style="display: none;" />
          <div id="ag-dropzone" style="text-align: center; padding: 6px 0;">
            <div style="font-size: 12px; color: #ffffff; font-weight: 500;">
              点击选择素材 或拖拽图片/视频至此
            </div>
            <div style="font-size: 10px; color: rgba(255, 255, 255, 0.75); margin-top: 3px;">
              JPG / PNG / WebP 图片 或 MP4 动态视频 (全屏循环铺满)
            </div>
          </div>
        </div>

        <!-- 进阶特性 1：质感风格一键切换 (晶莹磨砂 vs 柔雾类纸膜) -->
        <div class="ag-apple-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 12px; font-weight: 600; color: #ffffff;">界面质感风格</span>
            <div class="ag-apple-segmented" style="padding: 2px;">
              <button class="ag-apple-segment-item ${config.textureStyle === 'glass' ? 'active' : ''}" id="ag-tex-glass" style="font-size: 10px; padding: 3px 10px; color: #ffffff;">晶莹磨砂</button>
              <button class="ag-apple-segment-item ${config.textureStyle === 'paper' ? 'active' : ''}" id="ag-tex-paper" style="font-size: 10px; padding: 3px 10px; color: #ffffff;">柔雾类纸膜</button>
            </div>
          </div>
          <div id="ag-tex-desc" style="font-size: 10px; color: rgba(255, 255, 255, 0.75); line-height: 1.4;">
            ${config.textureStyle === 'paper' ? '类纸膜模式：漫反射防眩光微噪点纹理，护眼低反光，降低视觉疲劳' : '晶莹磨砂模式：Apple 标志性通透高斯模糊与高光微边缘'}
          </div>
        </div>

        <!-- 调节架构：全局共享 vs 独立分栏微调 (统一白字) -->
        <div class="ag-apple-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 12px; font-weight: 600; color: #ffffff;">透底与模糊调节</span>
            <!-- 微型模式分段器 -->
            <div class="ag-apple-segmented" style="padding: 2px;">
              <button class="ag-apple-segment-item ${config.tuneMode === 'global' ? 'active' : ''}" id="ag-subtab-global" style="font-size: 10px; padding: 3px 8px; color: #ffffff;">全局共享</button>
              <button class="ag-apple-segment-item ${config.tuneMode === 'split' ? 'active' : ''}" id="ag-subtab-split" style="font-size: 10px; padding: 3px 8px; color: #ffffff;">独立微调</button>
            </div>
          </div>

          <!-- 默认全局共享调节 (所有视窗联动) -->
          <div id="ag-box-tune-global" style="display: ${config.tuneMode === 'global' ? 'block' : 'none'};">
            <div class="ag-apple-slider-row">
              <div class="ag-apple-slider-header">
                <span style="color: #ffffff;">全局视窗透明度 (全域联动)</span>
                <span class="val" id="val-global-opacity" style="color: #ffffff;">${Math.round(config.globalOpacity * 100)}%</span>
              </div>
              <input type="range" class="ag-apple-slider" id="slide-global-opacity" min="15" max="95" value="${Math.round(config.globalOpacity * 100)}" />
            </div>

            <div class="ag-apple-slider-row">
              <div class="ag-apple-slider-header">
                <span style="color: #ffffff;">全局毛玻璃高斯模糊</span>
                <span class="val" id="val-global-blur" style="color: #ffffff;">${config.globalBlur}px</span>
              </div>
              <input type="range" class="ag-apple-slider" id="slide-global-blur" min="0" max="45" value="${config.globalBlur}" />
            </div>
            <div style="font-size: 10px; color: rgba(255, 255, 255, 0.75); margin-top: 4px;">默认共享调节，左栏、中栏卡片与设置弹窗同步生效</div>
          </div>

          <!-- 可选左中右独立微调 (仅左/中/右三大分区) -->
          <div id="ag-box-tune-split" style="display: ${config.tuneMode === 'split' ? 'block' : 'none'};">
            <div class="ag-apple-slider-row">
              <div class="ag-apple-slider-header">
                <span style="color: #ffffff;">左栏侧边栏 (Sidebar)</span>
                <span class="val" id="val-left-opacity" style="color: #ffffff;">${Math.round(config.leftOpacity * 100)}%</span>
              </div>
              <input type="range" class="ag-apple-slider" id="slide-left-opacity" min="15" max="95" value="${Math.round(config.leftOpacity * 100)}" />
            </div>

            <div class="ag-apple-slider-row">
              <div class="ag-apple-slider-header">
                <span style="color: #ffffff;">中栏对话与设置 (Chat & Modal)</span>
                <span class="val" id="val-center-opacity" style="color: #ffffff;">${Math.round(config.centerOpacity * 100)}%</span>
              </div>
              <input type="range" class="ag-apple-slider" id="slide-center-opacity" min="15" max="95" value="${Math.round(config.centerOpacity * 100)}" />
            </div>

            <div class="ag-apple-slider-row">
              <div class="ag-apple-slider-header">
                <span style="color: #ffffff;">右栏审阅与工作区 (Review & Terminal)</span>
                <span class="val" id="val-right-opacity" style="color: #ffffff;">${Math.round(config.rightOpacity * 100)}%</span>
              </div>
              <input type="range" class="ag-apple-slider" id="slide-right-opacity" min="15" max="95" value="${Math.round(config.rightOpacity * 100)}" />
              <div style="font-size: 9px; color: rgba(255, 255, 255, 0.75);">支持深度透明调节，终端视窗自动保留字符反差增强</div>
            </div>
          </div>

        </div>

        <!-- 唯一的广色域调色盘入口卡片 (Apple 极简纯白字，点开进入二级专业调色) -->
        <div id="ag-color-entry-bar" class="ag-apple-card" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
          <div>
            <div style="font-size: 12px; font-weight: 600; color: #ffffff;">广色域调色盘与色彩设置</div>
            <div style="font-size: 10px; color: rgba(255, 255, 255, 0.75); margin-top: 3px;">
              当前主强调色：<span id="ag-color-hex-tag" style="font-family: monospace; font-weight: 600; color: #ffffff;">${config.accentHex.toUpperCase()}</span>
            </div>
          </div>
          <div style="font-size: 11px; color: #ffffff; font-weight: 500; padding: 4px 12px; background: rgba(255, 255, 255, 0.12); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.18);">
            <span>打开调色</span>
          </div>
        </div>

        <!-- 底部 Apple 风格操作胶囊 (统一纯白字) -->
        <div style="display: flex; gap: 8px;">
          <button id="ag-btn-reset" style="flex: 1; padding: 7px 10px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 11px; cursor: pointer; transition: all 0.15s;">
            恢复预设
          </button>
          <button id="ag-btn-save" style="flex: 1; padding: 7px 10px; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 8px; color: #ffffff; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            固化配置
          </button>
        </div>
        <div id="ag-toast" style="font-size: 11px; text-align: center; color: #ffffff; margin-top: 6px; height: 14px; opacity: 0; transition: opacity 0.2s;"></div>
      </div>

      <!-- 二级页面: 广色域专业色谱盘 + RGB 精准通道 (点开放大无缝切换，删除箭头，统一白字) -->
      <div id="ag-view-palette" style="display: none; flex-direction: column; padding: 18px 20px; overflow-y: auto; max-height: 86vh;">
        
        <!-- 顶部导航 (纯白字，删除 ‹ 符号) -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <button id="ag-btn-back-main" style="background: transparent; border: none; color: #ffffff; font-size: 12px; cursor: pointer; font-weight: 500; padding: 0;">
            <span>返回设置</span>
          </button>
          <span style="font-size: 12px; font-weight: 600; color: #ffffff;">广色域色彩调节</span>
          <div style="width: 20px;"></div>
        </div>

        <!-- 2D 连续色谱放大矩阵 Canvas -->
        <div style="position: relative; width: 100%; height: 160px; border-radius: 12px; overflow: hidden; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
          <canvas id="ag-palette-canvas" width="320" height="160" style="width: 100%; height: 100%; display: block; cursor: crosshair;"></canvas>
          <div id="ag-palette-cursor" style="position: absolute; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 4px rgba(0,0,0,0.6); pointer-events: none; transform: translate(-50%, -50%); top: 50%; left: 50%;"></div>
        </div>

        <!-- 明度 Lightness Apple 滑块 -->
        <div class="ag-apple-card" style="margin-bottom: 12px;">
          <div class="ag-apple-slider-row">
            <div class="ag-apple-slider-header">
              <span style="color: #ffffff;">色彩亮度 (Lightness)</span>
              <span class="val" id="val-lightness" style="color: #ffffff;">50%</span>
            </div>
            <input type="range" class="ag-apple-slider" id="slide-lightness" min="10" max="90" value="50" />
          </div>
        </div>

        <!-- RGB 精准通道 (独立三路精准调节，统一白字) -->
        <div class="ag-apple-card" style="margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 600; color: #ffffff; margin-bottom: 8px;">RGB 精准调色通道</div>
          
          <div class="ag-apple-rgb-row">
            <span class="ag-apple-rgb-tag">R</span>
            <input type="range" class="ag-apple-slider" id="slide-rgb-r" min="0" max="255" value="${config.accentRgb[0]}" />
            <span class="ag-apple-rgb-tag" id="val-rgb-r" style="text-align: right; width: 28px;">${config.accentRgb[0]}</span>
          </div>
          
          <div class="ag-apple-rgb-row">
            <span class="ag-apple-rgb-tag">G</span>
            <input type="range" class="ag-apple-slider" id="slide-rgb-g" min="0" max="255" value="${config.accentRgb[1]}" />
            <span class="ag-apple-rgb-tag" id="val-rgb-g" style="text-align: right; width: 28px;">${config.accentRgb[1]}</span>
          </div>

          <div class="ag-apple-rgb-row">
            <span class="ag-apple-rgb-tag">B</span>
            <input type="range" class="ag-apple-slider" id="slide-rgb-b" min="0" max="255" value="${config.accentRgb[2]}" />
            <span class="ag-apple-rgb-tag" id="val-rgb-b" style="text-align: right; width: 28px;">${config.accentRgb[2]}</span>
          </div>
        </div>

        <!-- 二级调色盘操作胶囊 (统一纯白字) -->
        <div style="display: flex; gap: 8px;">
          <button id="ag-btn-preset-blue" style="flex: 1; padding: 6px 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 10px; cursor: pointer;">
            Apple 蓝
          </button>
          <button id="ag-btn-preset-purple" style="flex: 1; padding: 6px 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 10px; cursor: pointer;">
            深空紫
          </button>
          <button id="ag-btn-preset-amber" style="flex: 1; padding: 6px 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; font-size: 10px; cursor: pointer;">
            晨曦金
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    // 控制台展开/收起切换
    function togglePanel() {
      const isVisible = modal.style.display === 'block';
      modal.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        showMainView();
      }
    }

    document.getElementById('ag-btn-close').onclick = () => {
      modal.style.display = 'none';
    };

    // 快捷键 Alt + T 唤出
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 't' || e.key === 'T' || e.code === 'KeyT')) {
        e.preventDefault();
        togglePanel();
      }
    });

    // 6. 二级页面无缝导航切换与色彩管理
    const viewMain = document.getElementById('ag-view-main');
    const viewPalette = document.getElementById('ag-view-palette');
    const paletteCanvas = document.getElementById('ag-palette-canvas');
    const paletteCursor = document.getElementById('ag-palette-cursor');

    function showMainView() {
      viewMain.style.display = 'flex';
      viewPalette.style.display = 'none';
    }

    function showPaletteView() {
      viewMain.style.display = 'none';
      viewPalette.style.display = 'flex';
      drawColorPalette();
    }

    // 绑定色盘打开与返回 (仅保留单一入口安全绑定)
    const colorEntryBar = document.getElementById('ag-color-entry-bar');
    if (colorEntryBar) colorEntryBar.onclick = showPaletteView;
    const btnBackMain = document.getElementById('ag-btn-back-main');
    if (btnBackMain) btnBackMain.onclick = showMainView;

    // 提示浮层
    let toastTimer = null;
    function showToast(msg) {
      const toast = document.getElementById('ag-toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.style.opacity = '1';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
      }, 2200);
    }

    // 7. 色彩转换算法 (HSL <-> RGB <-> HEX)
    function hslToRgb(h, s, l) {
      s /= 100;
      l /= 100;
      const k = n => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    }

    function rgbToHex(r, g, b) {
      return '#' + [r, g, b].map(x => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    }

    let currentHue = 210;
    let currentSat = 100;
    let currentLit = 50;

    function drawColorPalette() {
      if (!paletteCanvas) return;
      const ctx = paletteCanvas.getContext('2d');
      const w = paletteCanvas.width;
      const h = paletteCanvas.height;

      const gradH = ctx.createLinearGradient(0, 0, w, 0);
      for (let i = 0; i <= 360; i += 30) {
        gradH.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
      }
      ctx.fillStyle = gradH;
      ctx.fillRect(0, 0, w, h);

      const gradV = ctx.createLinearGradient(0, 0, 0, h);
      gradV.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      gradV.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      gradV.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      gradV.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = gradV;
      ctx.fillRect(0, 0, w, h);
    }

    function setAccentColor(r, g, b) {
      config.accentRgb = [r, g, b];
      config.accentHex = rgbToHex(r, g, b);
      applyCssVariables();
      
      const tag = document.getElementById('ag-color-hex-tag');
      if (tag) tag.textContent = config.accentHex.toUpperCase();
      
      const slideR = document.getElementById('slide-rgb-r');
      const slideG = document.getElementById('slide-rgb-g');
      const slideB = document.getElementById('slide-rgb-b');
      if (slideR) { slideR.value = r; document.getElementById('val-rgb-r').textContent = r; }
      if (slideG) { slideG.value = g; document.getElementById('val-rgb-g').textContent = g; }
      if (slideB) { slideB.value = b; document.getElementById('val-rgb-b').textContent = b; }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch (e) {}
    }

    // 预设色彩
    document.getElementById('ag-btn-preset-blue').onclick = () => setAccentColor(10, 132, 255);
    document.getElementById('ag-btn-preset-purple').onclick = () => setAccentColor(175, 82, 222);
    document.getElementById('ag-btn-preset-amber').onclick = () => setAccentColor(255, 159, 10);

    // 色盘点击拾色
    function pickCanvasColor(e) {
      const rect = paletteCanvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      
      currentHue = (x / rect.width) * 360;
      currentSat = 100;
      
      paletteCursor.style.left = `${x}px`;
      paletteCursor.style.top = `${y}px`;

      const [r, g, b] = hslToRgb(currentHue, currentSat, currentLit);
      setAccentColor(r, g, b);
    }

    let canvasMouseDown = false;
    paletteCanvas.onmousedown = (e) => {
      canvasMouseDown = true;
      pickCanvasColor(e);
    };
    window.addEventListener('mousemove', (e) => {
      if (canvasMouseDown) pickCanvasColor(e);
    });
    window.addEventListener('mouseup', () => {
      canvasMouseDown = false;
    });

    // 亮度滑块
    document.getElementById('slide-lightness').oninput = (e) => {
      currentLit = parseInt(e.target.value);
      document.getElementById('val-lightness').textContent = `${currentLit}%`;
      const [r, g, b] = hslToRgb(currentHue, currentSat, currentLit);
      setAccentColor(r, g, b);
    };

    // RGB 滑块通道联动
    function onRgbChange() {
      const r = parseInt(document.getElementById('slide-rgb-r').value);
      const g = parseInt(document.getElementById('slide-rgb-g').value);
      const b = parseInt(document.getElementById('slide-rgb-b').value);
      setAccentColor(r, g, b);
    }
    document.getElementById('slide-rgb-r').oninput = onRgbChange;
    document.getElementById('slide-rgb-g').oninput = onRgbChange;
    document.getElementById('slide-rgb-b').oninput = onRgbChange;

    // 8. 模式切换分段器
    const tabAurora = document.getElementById('ag-tab-aurora');
    const tabCustom = document.getElementById('ag-tab-custom');
    const panelAurora = document.getElementById('ag-panel-aurora');
    const panelCustom = document.getElementById('ag-panel-custom');

    tabAurora.onclick = () => {
      tabAurora.classList.add('active');
      tabCustom.classList.remove('active');
      panelAurora.style.display = 'block';
      panelCustom.style.display = 'none';
      applyMode('aurora');
      showToast('已切换至极光流体模式');
    };

    tabCustom.onclick = () => {
      tabCustom.classList.add('active');
      tabAurora.classList.remove('active');
      panelCustom.style.display = 'block';
      panelAurora.style.display = 'none';
      applyMode('custom', config.customAssetUrl);
      showToast('已切换至本地素材底图模式');
    };

    // 进阶特性 1 绑定：晶莹磨砂 vs 柔雾类纸膜切换
    const texGlassBtn = document.getElementById('ag-tex-glass');
    const texPaperBtn = document.getElementById('ag-tex-paper');
    const texDesc = document.getElementById('ag-tex-desc');

    function updateTextureUI() {
      if (config.textureStyle === 'paper') {
        texPaperBtn.classList.add('active');
        texGlassBtn.classList.remove('active');
        if (texDesc) texDesc.textContent = '类纸膜模式：漫反射防眩光微噪点纹理，护眼低反光，降低视觉疲劳';
      } else {
        texGlassBtn.classList.add('active');
        texPaperBtn.classList.remove('active');
        if (texDesc) texDesc.textContent = '晶莹磨砂模式：Apple 标志性通透高斯模糊与高光微边缘';
      }
    }

    texGlassBtn.onclick = () => {
      config.textureStyle = 'glass';
      updateTextureUI();
      applyCssVariables();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch (e) {}
      showToast('已开启晶莹磨砂质感');
    };

    texPaperBtn.onclick = () => {
      config.textureStyle = 'paper';
      updateTextureUI();
      applyCssVariables();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch (e) {}
      showToast('已开启柔雾类纸膜护眼质感');
    };

    // 9. 调节模式切换分段器：全局共享 vs 独立分栏微调
    const subtabGlobal = document.getElementById('ag-subtab-global');
    const subtabSplit = document.getElementById('ag-subtab-split');
    const boxTuneGlobal = document.getElementById('ag-box-tune-global');
    const boxTuneSplit = document.getElementById('ag-box-tune-split');

    subtabGlobal.onclick = () => {
      config.tuneMode = 'global';
      subtabGlobal.classList.add('active');
      subtabSplit.classList.remove('active');
      boxTuneGlobal.style.display = 'block';
      boxTuneSplit.style.display = 'none';
      applyCssVariables();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch (e) {}
      showToast('已切换至全局共享联动调节');
    };

    subtabSplit.onclick = () => {
      config.tuneMode = 'split';
      subtabSplit.classList.add('active');
      subtabGlobal.classList.remove('active');
      boxTuneSplit.style.display = 'block';
      boxTuneGlobal.style.display = 'none';
      applyCssVariables();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch (e) {}
      showToast('已切换至三栏独立微调');
    };

    // 极光流动速率
    document.getElementById('slide-aurora-speed').oninput = (e) => {
      config.auroraSpeed = parseInt(e.target.value) / 10;
      document.getElementById('val-aurora-speed').textContent = `${config.auroraSpeed.toFixed(1)}x`;
    };

    // 10. 本地素材与 MP4 视频加载与防崩
    const dropzone = document.getElementById('ag-dropzone');
    const fileInput = document.getElementById('ag-file-input');

    dropzone.onclick = () => fileInput.click();
    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.style.background = 'rgba(255, 255, 255, 0.08)';
    };
    dropzone.ondragleave = () => {
      dropzone.style.background = 'transparent';
    };
    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.style.background = 'transparent';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    };
    fileInput.onchange = () => {
      if (fileInput.files && fileInput.files[0]) {
        handleFile(fileInput.files[0]);
      }
    };

    function handleFile(file) {
      if (!file) return;
      const isVideo = file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mp4');
      if (isVideo) {
        showToast(`正在载入 MP4 动态视频 ${file.name}...`);
        try {
          saveVideoToIndexedDB(file);
        } catch (e) {}
        playVideoBlob(file);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {}
        showToast('MP4 动态视频壁纸已激活循环播放！');
      } else {
        showToast(`正在载入图片素材 ${file.name}...`);
        const reader = new FileReader();
        reader.onload = (evt) => {
          const dataUri = evt.target.result;
          config.customAssetType = 'image';
          applyMode('custom', dataUri);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
          } catch (e) {}
          showToast('素材底图已更新！');
        };
        reader.onerror = () => showToast('素材载入失败，已触发防崩回退');
        reader.readAsDataURL(file);
      }
    }

    // 滑块事件统一绑定
    function bindSlider(id, valId, configKey, transformFn, unit = '') {
      const el = document.getElementById(id);
      const label = document.getElementById(valId);
      if (!el || !label) return;
      el.oninput = () => {
        const val = parseFloat(el.value);
        config[configKey] = transformFn(val);
        label.textContent = `${el.value}${unit}`;
        applyCssVariables();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (err) {}
      };
    }

    bindSlider('slide-global-opacity', 'val-global-opacity', 'globalOpacity', v => v / 100, '%');
    bindSlider('slide-global-blur', 'val-global-blur', 'globalBlur', v => v, 'px');
    bindSlider('slide-left-opacity', 'val-left-opacity', 'leftOpacity', v => v / 100, '%');
    bindSlider('slide-center-opacity', 'val-center-opacity', 'centerOpacity', v => v / 100, '%');
    bindSlider('slide-right-opacity', 'val-right-opacity', 'rightOpacity', v => v / 100, '%');

    // 恢复预设
    document.getElementById('ag-btn-reset').onclick = () => {
      config = Object.assign({}, DEFAULT_CONFIG);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch (e) {}
      applyCssVariables();
      updateTextureUI();
      setAccentColor(...config.accentRgb);
      document.getElementById('slide-global-opacity').value = Math.round(config.globalOpacity * 100);
      document.getElementById('val-global-opacity').textContent = `${Math.round(config.globalOpacity * 100)}%`;
      document.getElementById('slide-global-blur').value = config.globalBlur;
      document.getElementById('val-global-blur').textContent = `${config.globalBlur}px`;
      showToast('已恢复 Apple 预设参数');
    };

    // 固化配置
    document.getElementById('ag-btn-save').onclick = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        showToast('配置已固化保存！');
      } catch (e) {
        showToast('保存失败: ' + e.message);
      }
    };

    console.log('[Antigravity Apple Control Panel] Apple 极简纯净控制台已载入 (⌥T 可快速唤出)');
  } // end initAppleConsole

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppleConsole);
  } else {
    initAppleConsole();
  }
})();
