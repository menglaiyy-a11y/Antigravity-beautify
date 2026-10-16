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

    // Preload 在 Electron 隔离世界运行；Antigravity 的 nativeStorage 只暴露在页面主世界。
    // 通过 DOM 脚本建立窄接口桥接，避免错误地退回按 localhost 端口隔离的 IndexedDB。
    function installNativeStorageBridge() {
      if (window.__ag_native_storage_bridge_requested) return;
      window.__ag_native_storage_bridge_requested = true;
      const bridge = document.createElement('script');
      bridge.textContent = `(() => {
        if (window.__agThemeStorageBridgeInstalled) return;
        window.__agThemeStorageBridgeInstalled = true;
        const waitForStorage = () => new Promise((resolve, reject) => {
          const deadline = Date.now() + 15000;
          const check = () => {
            if (window.nativeStorage && typeof window.nativeStorage.getItems === 'function' && typeof window.nativeStorage.updateItems === 'function') return resolve(window.nativeStorage);
            if (Date.now() >= deadline) return reject(new Error('Antigravity nativeStorage API 不可用'));
            setTimeout(check, 50);
          };
          check();
        });
        document.addEventListener('ag-theme-storage-request', async (event) => {
          const request = event.detail || {};
          try {
            const storage = await waitForStorage();
            let value;
            if (request.method === 'getItems') {
              const items = await storage.getItems();
              value = {
                ag_theme_config_v1: items && items.ag_theme_config_v1,
                ag_theme_asset_v1: items && items.ag_theme_asset_v1
              };
            } else if (request.method === 'updateItems') {
              const changes = request.changes || {};
              const allowedKeys = new Set(['ag_theme_config_v1', 'ag_theme_asset_v1']);
              if (Object.keys(changes).some((key) => !allowedKeys.has(key))) throw new Error('主题存储桥接只允许修改主题配置与素材');
              value = await storage.updateItems(changes);
            } else {
              throw new Error('未知的主题存储操作');
            }
            document.dispatchEvent(new CustomEvent('ag-theme-storage-result', { detail: { id: request.id, ok: true, value } }));
          } catch (error) {
            document.dispatchEvent(new CustomEvent('ag-theme-storage-result', { detail: { id: request.id, ok: false, error: String(error && error.message || error) } }));
          }
        });
      })();`;
      (document.head || document.documentElement).appendChild(bridge);
      bridge.remove();
    }

    function callNativeStorage(method, changes) {
      if (window.nativeStorage && typeof window.nativeStorage[method] === 'function') {
        return method === 'updateItems' ? window.nativeStorage.updateItems(changes) : window.nativeStorage.getItems();
      }
      installNativeStorageBridge();
      const id = `ag-theme-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          document.removeEventListener('ag-theme-storage-result', onResult);
          reject(new Error('等待 Antigravity 主题存储响应超时'));
        }, 20000);
        const onResult = (event) => {
          const result = event.detail || {};
          if (result.id !== id) return;
          clearTimeout(timeout);
          document.removeEventListener('ag-theme-storage-result', onResult);
          if (result.ok) resolve(result.value);
          else reject(new Error(result.error || 'Antigravity 主题存储操作失败'));
        };
        document.addEventListener('ag-theme-storage-result', onResult);
        document.dispatchEvent(new CustomEvent('ag-theme-storage-request', { detail: { id, method, changes } }));
      });
    }

    // Electron 内置 storage 位于应用 userData，不受 localhost 动态端口变化影响。
    // 先从主世界读取配置与素材，再初始化 UI，避免冷启动落入空的端口隔离缓存。
    if (!window.__ag_theme_native_ready) {
      if (window.__ag_theme_native_loading) return;
      window.__ag_theme_native_loading = true;
      callNativeStorage('getItems').then((items) => {
        try {
          const savedConfig = items && items.ag_theme_config_v1;
          window.__ag_native_theme_config = savedConfig ? JSON.parse(savedConfig) : null;
          const savedAsset = items && items.ag_theme_asset_v1;
          window.__ag_native_asset_payload = savedAsset ? JSON.parse(savedAsset) : null;
          window.__ag_theme_native_available = true;
        } catch (err) {
          console.warn('[Theme] 读取应用级主题存储失败', err);
          window.__ag_native_theme_config = null;
          window.__ag_native_asset_payload = null;
          window.__ag_theme_native_available = false;
        }
        window.__ag_theme_native_ready = true;
        window.__ag_theme_native_loading = false;
        initAppleConsole();
      }).catch((err) => {
        console.warn('[Theme] 应用级存储不可用，回退到浏览器存储', err);
        window.__ag_theme_native_available = false;
        window.__ag_theme_native_ready = true;
        window.__ag_theme_native_loading = false;
        initAppleConsole();
      });
      return;
    }

    // 0. 清除旧实例，实现热替换无缝刷新
    if (window.__ag_theme_config_save_timer) {
      clearTimeout(window.__ag_theme_config_save_timer);
      window.__ag_theme_config_save_timer = null;
    }
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
    const NATIVE_CONFIG_KEY = 'ag_theme_config_v1';
    const NATIVE_ASSET_KEY = 'ag_theme_asset_v1';
    const MAX_PERSISTENT_ASSET_BYTES = 50 * 1024 * 1024;
    const DEFAULT_CONFIG = {
      mode: 'native', // 4 模态：'native' (还原原生UI) | 'ocean' (中栏晶格海洋) | 'aurora' (流体极光) | 'custom' (自定义素材)
      textureStyle: 'glass', // 'glass' (晶莹磨砂) | 'paper' (柔雾类纸膜)
      customAssetType: 'image', // 'image' | 'video'
      accentHex: '#0a84ff', // Apple 标志性系统蓝
      accentRgb: [10, 132, 255],
      tuneMode: 'global', // 'global' (全局共享，联动调节) | 'split' (独立分栏微调)
      globalOpacity: 0.50, // 全局统一透明度 (0.00 ~ 1.00)
      globalBlur: 24,      // 全局统一高斯模糊 (0 ~ 45px)
      leftOpacity: 0.50,   // 左栏独立透明度
      centerOpacity: 0.50, // 中栏独立透明度 (主对话卡片/设置弹窗)
      rightOpacity: 0.50,  // 右栏独立透明度 (Aux Pane / Review / 终端)
      auroraSpeed: 1.0,
      oceanShape: 0,       // 0=四芒星, 1=正菱形, 2=圆点, 3=六边形, 4=十字星, 5=波纹环
      oceanSpeed: 0.62,
      oceanDensity: 48.0,
      oceanSharpness: 0.54,
      oceanRippleForce: 0.95,
      oceanColorSpread: 1.0,
      oceanPalette: 'gemini', // 'gemini' | 'argon' | 'antigravity' | 'emerald' | 'miku' | 'sunset' | 'custom'
      oceanColorsHex: ['#2980ff', '#0ac2ff', '#ad85f2', '#f570b3'],
      oceanMorphEnabled: true,
      oceanEmblemEnabled: true,
      oceanEmblemStyle: 'gemini', // 'gemini' | 'antigravity' | 'windows' | 'apple'
      oceanEmblemScale: 1.0,
      oceanEmblemColorMode: 'classic', // 'classic' | 'sync'
      oceanPreset: 'focus',   // 'idle' | 'focus' | 'thinking' | 'voice'
      oceanAudio: false,
      customAssetUrl: '',
      customAssetName: ''
    };

    let config = Object.assign({}, DEFAULT_CONFIG);
    try {
      const saved = window.__ag_native_theme_config || localStorage.getItem(STORAGE_KEY);
      if (saved) {
        config = Object.assign(config, typeof saved === 'string' ? JSON.parse(saved) : saved);
        // 废弃旧版试验阶段的 glacier 冰川图，自动平滑回归纯净原生 UI
        if (config.mode === 'glacier') {
          config.mode = 'native';
        }
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
    if (!Array.isArray(config.oceanColorsHex) || config.oceanColorsHex.length < 4) {
      config.oceanColorsHex = ['#2980ff', '#0ac2ff', '#ad85f2', '#f570b3'];
    }
    if (typeof config.oceanMorphEnabled !== 'boolean') config.oceanMorphEnabled = true;
    if (typeof config.oceanEmblemEnabled !== 'boolean') config.oceanEmblemEnabled = true;
    if (!config.oceanEmblemStyle) config.oceanEmblemStyle = 'gemini';
    if (typeof config.oceanEmblemScale !== 'number' || isNaN(config.oceanEmblemScale)) config.oceanEmblemScale = 1.0;
    if (!config.oceanEmblemColorMode) config.oceanEmblemColorMode = 'classic';

    function updateNativeStorage(changes) {
      const previous = window.__ag_theme_storage_queue || Promise.resolve();
      const next = previous.catch(() => {}).then(() => callNativeStorage('updateItems', changes));
      window.__ag_theme_storage_queue = next.catch(() => {});
      return next;
    }

    function persistConfig() {
      const serialized = JSON.stringify(config);
      try { localStorage.setItem(STORAGE_KEY, serialized); } catch (e) {}
      if (window.__ag_theme_native_available || (window.nativeStorage && typeof window.nativeStorage.updateItems === 'function')) {
        window.__ag_native_theme_config = config;
        clearTimeout(window.__ag_theme_config_save_timer);
        window.__ag_theme_config_save_timer = setTimeout(() => {
          updateNativeStorage({ [NATIVE_CONFIG_KEY]: serialized }).catch((err) => {
            console.warn('[Theme] 应用级配置写入失败', err);
          });
        }, 500);
      }
    }
    async function persistConfigNow() {
      const serialized = JSON.stringify(config);
      try { localStorage.setItem(STORAGE_KEY, serialized); } catch (e) {}
      clearTimeout(window.__ag_theme_config_save_timer);
      if (window.__ag_theme_native_available || (window.nativeStorage && typeof window.nativeStorage.updateItems === 'function')) {
        await updateNativeStorage({ [NATIVE_CONFIG_KEY]: serialized });
        window.__ag_native_theme_config = config;
      }
    }
    persistConfig();

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
        z-index: 999990;
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
    let activeImageBlobUrl = null;
    const MEDIA_DB_NAME = 'ag_media_db_v2';

    // IndexedDB 作为同源缓存；跨重启的正式副本保存在 Electron userData 的 nativeStorage。
    function openMediaDb() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(MEDIA_DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('无法打开素材数据库'));
        req.onblocked = () => reject(new Error('素材数据库升级被其他窗口阻塞'));
      });
    }

    async function saveAssetToIndexedDB(blob) {
      const db = await openMediaDb();
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction('media', 'readwrite');
          tx.objectStore('media').put(blob, 'bg_asset');
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error || new Error('素材写入失败'));
          tx.onabort = () => reject(tx.error || new Error('素材写入已取消'));
        });
      } finally { db.close(); }
    }

    async function loadAssetFromIndexedDB() {
      const nativeAsset = window.__ag_native_asset_payload;
      if (nativeAsset && nativeAsset.dataUrl) {
        try { return await (await fetch(nativeAsset.dataUrl)).blob(); }
        catch (err) { console.warn('[Theme] 原生存储素材解码失败，尝试浏览器缓存', err); }
      }
      const db = await openMediaDb();
      let currentAsset = null;
      try {
        currentAsset = await new Promise((resolve, reject) => {
          const tx = db.transaction('media', 'readonly');
          const req = tx.objectStore('media').get('bg_asset');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error || new Error('素材读取失败'));
        });
      } finally { db.close(); }
      if (currentAsset) return currentAsset;

      // 兼容旧版数据库（其中可能存有 bg_video 或较早构建的 bg_asset）。
      return await new Promise((resolve) => {
        const req = indexedDB.open('ag_media_db');
        req.onsuccess = () => {
          const legacyDb = req.result;
          if (!legacyDb.objectStoreNames.contains('media')) { legacyDb.close(); resolve(null); return; }
          const tx = legacyDb.transaction('media', 'readonly');
          const store = tx.objectStore('media');
          const assetReq = store.get('bg_asset');
          assetReq.onsuccess = () => {
            if (assetReq.result) { resolve(assetReq.result); return; }
            const videoReq = store.get('bg_video');
            videoReq.onsuccess = () => resolve(videoReq.result || null);
            videoReq.onerror = () => resolve(null);
          };
          assetReq.onerror = () => resolve(null);
          tx.oncomplete = () => legacyDb.close();
          tx.onerror = () => legacyDb.close();
        };
        req.onerror = () => resolve(null);
      });
    }

    async function clearAssetFromIndexedDB() {
      const db = await openMediaDb();
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction('media', 'readwrite');
          tx.objectStore('media').delete('bg_asset');
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error || new Error('素材删除失败'));
          tx.onabort = () => reject(tx.error || new Error('素材删除已取消'));
        });
      } finally { db.close(); }
    }

    function blobToDataUrl(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('素材读取失败'));
        reader.readAsDataURL(blob);
      });
    }

    async function persistAsset(blob, type, name) {
      if (window.__ag_theme_native_available || (window.nativeStorage && typeof window.nativeStorage.updateItems === 'function')) {
        if (blob.size > MAX_PERSISTENT_ASSET_BYTES) {
          throw new Error('跨重启永久保存目前支持不超过 50 MB 的素材，请压缩后重试');
        }
        clearTimeout(window.__ag_theme_config_save_timer);
        const payload = { type, name, mime: blob.type || '', dataUrl: await blobToDataUrl(blob) };
        await updateNativeStorage({
          [NATIVE_ASSET_KEY]: JSON.stringify(payload),
          [NATIVE_CONFIG_KEY]: JSON.stringify(config)
        });
        window.__ag_native_asset_payload = payload;
        window.__ag_native_theme_config = config;
        return;
      }
      await saveAssetToIndexedDB(blob);
      await persistConfigNow();
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
      
      const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0.5));
      const isGlobal = config.tuneMode === 'global';
      const globalOp = clamp01(config.globalOpacity);
      const effectiveLeft = clamp01(isGlobal ? globalOp : config.leftOpacity);
      const effectiveCenter = clamp01(isGlobal ? globalOp : config.centerOpacity);
      const effectiveRight = clamp01(isGlobal ? globalOp : config.rightOpacity);

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
      root.style.setProperty('--ag-ambient-tint', `rgba(${r}, ${g}, ${b}, ${(0.08 * globalOp).toFixed(3)})`);
      
      // 当分栏透明度为 0 时，联动归零对应模糊度，做到真正 100% 全透明无雾化残留
      const baseBlur = Math.max(0, isPaper ? Math.min(16, config.globalBlur) : config.globalBlur);
      const leftBlur = effectiveLeft === 0 ? 0 : baseBlur;
      const centerBlur = effectiveCenter === 0 ? 0 : baseBlur;
      const rightBlur = effectiveRight === 0 ? 0 : baseBlur;

      root.style.setProperty('--ag-global-blur', `${baseBlur}px`);
      // 根容器不再额外叠加底色，避免与左/中/右三栏产生二次 Alpha 累乘导致透明度失真
      root.style.setProperty('--ag-bg-base-overlay', 'transparent');

      // 顶栏 (Top Bar)：直接对应全局/中栏透明度，支持 0% 全透明 与 100% 全遮挡
      root.style.setProperty('--ag-topbar-bg', `rgba(16, 18, 24, ${globalOp})`);
      root.style.setProperty('--ag-topbar-blur', `${globalOp === 0 ? 0 : baseBlur}px`);

      // 左栏 (Sidebar)
      root.style.setProperty('--ag-left-bg', `rgba(16, 18, 24, ${effectiveLeft})`);
      root.style.setProperty('--ag-left-blur', `${leftBlur}px`);
      root.style.setProperty('--ag-left-border', `rgba(255, 255, 255, ${(0.08 * (effectiveLeft > 0 ? Math.max(0.25, effectiveLeft) : 0)).toFixed(3)})`);

      // 中栏 (主视窗、Chat 卡片、输入框、代码块、设置弹窗) —— 严格与 effectiveCenter 对应
      root.style.setProperty('--ag-center-bg', `rgba(18, 20, 28, ${effectiveCenter})`);
      root.style.setProperty('--ag-center-blur', `${centerBlur}px`);
      // 对话卡片、气泡、工具折叠框、代码块均随 effectiveCenter 线性缩放：0% 时完全透明(0)，100% 时完全不透(1)
      const cardAlpha = effectiveCenter === 0 ? 0 : (effectiveCenter >= 0.99 ? 1 : Number((effectiveCenter * 0.22).toFixed(3)));
      const cardBorderAlpha = effectiveCenter === 0 ? 0 : Number((0.08 * Math.max(0.3, effectiveCenter)).toFixed(3));
      const cardShadowAlpha = effectiveCenter === 0 ? 0 : Number((0.16 * effectiveCenter).toFixed(3));
      const subItemAlpha = effectiveCenter === 0 ? 0 : (effectiveCenter >= 0.99 ? 1 : Number((effectiveCenter * 0.14).toFixed(3)));
      const codeBlockAlpha = effectiveCenter === 0 ? 0 : (effectiveCenter >= 0.99 ? 1 : Number((effectiveCenter * 0.75).toFixed(3)));

      root.style.setProperty('--ag-center-card-bg', effectiveCenter >= 0.99 ? `rgb(22, 25, 34)` : `rgba(255, 255, 255, ${cardAlpha})`);
      root.style.setProperty('--ag-center-card-border', `rgba(255, 255, 255, ${cardBorderAlpha})`);
      root.style.setProperty('--ag-center-card-shadow', `0 4px 16px rgba(0, 0, 0, ${cardShadowAlpha})`);
      root.style.setProperty('--ag-center-subitem-bg', effectiveCenter >= 0.99 ? `rgb(26, 30, 40)` : `rgba(255, 255, 255, ${subItemAlpha})`);
      root.style.setProperty('--ag-code-bg', `rgba(10, 12, 18, ${codeBlockAlpha})`);

      // 聊天输入框：直接与中栏透明度 1:1 对应，支持 0% 全透明与 100% 全遮挡
      root.style.setProperty('--ag-chat-box-bg', `rgba(18, 22, 32, ${effectiveCenter})`);
      root.style.setProperty('--ag-chat-box-blur', `${centerBlur}px`);

      // 弹窗与二级/三级菜单：支持跟随中栏/全局透明度，支持 0% 全透明与 100% 全遮挡；常态提供 86% 坚实遮光毛玻璃，彻底杜绝底层文字透视重叠
      const dialogAlpha = effectiveCenter === 0 ? 0 : (effectiveCenter >= 0.99 ? 1 : Number((0.70 + effectiveCenter * 0.28).toFixed(3)));
      const popoverAlpha = effectiveCenter === 0 ? 0 : (effectiveCenter >= 0.99 ? 1 : Number((0.74 + effectiveCenter * 0.24).toFixed(3)));
      root.style.setProperty('--ag-dialog-bg', `rgba(20, 24, 34, ${dialogAlpha})`);
      root.style.setProperty('--ag-popover-bg', `rgba(20, 24, 34, ${popoverAlpha})`);

      // 右栏 (Aux Pane / Review / Monaco / 终端)：直接 1:1 对应 effectiveRight，无强制保底截断
      root.style.setProperty('--ag-right-bg', `rgba(16, 18, 24, ${effectiveRight})`);
      root.style.setProperty('--ag-right-review-bg', `rgba(16, 18, 24, ${effectiveRight})`);
      root.style.setProperty('--ag-right-term-bg', `rgba(12, 14, 18, ${effectiveRight})`);
      root.style.setProperty('--ag-right-blur', `${rightBlur}px`);

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

html,
body,
body[data-scroll-locked] {
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  background-color: transparent !important;
}

body {
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-attachment: fixed !important;
}

/* 消除 4 层根容器重复叠加底色，全部设为 transparent */
div.h-screen.w-screen.flex.flex-col.bg-background,
div.relative.w-screen.h-\[100dvh\],
#root > div.relative.w-screen,
#root {
  background-color: transparent !important;
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
/* 1. 左栏 (Sidebar) 区域全面重构为 Apple 极简通透风格 */
/* 1.0 精准对齐真实左侧栏垂直主容器，挂载 --ag-left-bg 与毛玻璃 */
div.h-full.w-full.flex.flex-col.pb-2.bg-sidebar,
div.h-full.w-full.flex.flex-col.bg-sidebar,
div.flex:has(> div.h-full.w-full > div.bg-sidebar),
div[data-testid="sidebar-wrapper"],
aside {
  background-color: var(--ag-left-bg) !important;
  backdrop-filter: blur(var(--ag-left-blur)) saturate(160%) !important;
  -webkit-backdrop-filter: blur(var(--ag-left-blur)) saturate(160%) !important;
  border-right: 1px solid var(--ag-left-border, rgba(255, 255, 255, 0.08)) !important;
}

/* 彻底清除左栏内部所有子容器、项目条目、折叠条目的重复背景与死黑色块，消除斑驳感与重复叠色 */
div.h-full.w-full.flex.flex-col.pb-2.bg-sidebar div.bg-sidebar,
div.h-full.w-full.flex.flex-col.pb-2.bg-sidebar [class*="bg-sidebar"],
div.h-full.w-full.flex.flex-col.pb-2.bg-sidebar div.pt-1,
div.h-full.w-full.flex.flex-col.pb-2.bg-sidebar div[class*="pt-1"],
div.h-full.w-full.flex.flex-col.pb-2.bg-sidebar div[class*="group/section-header"],
div.h-full.w-full.flex.flex-col.pb-2.bg-sidebar div[class*="group/header"],
div[data-testid="sidebar-wrapper"] div.bg-sidebar,
aside div.bg-sidebar,
div[class*="group/section-header"],
div[class*="group/header"] {
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
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

/* 1.2 左栏常规导航项与按钮 */
div.bg-sidebar a:not([class*="bg-sidebar-muted"]):not([data-testid="new-conversation-button"]),
div.bg-sidebar button:not([class*="h-5"]):not([class*="h-6"]):not([class*="group/headerbtn"]),
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
div[class*="group/section-header"],
div[class*="group/section-header"] button,
div[class*="group/section-header"] span,
div[class*="group/section-header"] h2 {
  background: transparent !important;
  color: rgba(255, 255, 255, 0.75) !important;
  font-weight: 500 !important;
}

/* 1.4 项目列表折叠项与项目卡片 */
div.bg-sidebar button[class*="group/headerbtn"],
div.bg-sidebar div[class*="group/header"] button,
button[class*="group/headerbtn"] {
  background: transparent !important;
  border: 1px solid transparent !important;
  color: #ffffff !important;
  font-weight: 500 !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

div.bg-sidebar button[class*="group/headerbtn"]:hover,
div.bg-sidebar div[class*="group/header"] button:hover,
button[class*="group/headerbtn"]:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
  color: #ffffff !important;
}

/* 1.5 会话列表条目与历史对话项 (全域通透与优雅卡片化) */
div[data-testid="conversation-row-sidebar"],
div.bg-sidebar div.cursor-pointer.rounded-lg,
div.bg-sidebar div.w-full.h-full.group,
div[data-testid="sidebar-wrapper"] div.w-full.h-full.group,
aside div.w-full.h-full.group {
  background-color: transparent !important;
  margin: 1px 0 !important;
  border: 1px solid transparent !important;
  border-radius: 8px !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

div[data-testid="conversation-row-sidebar"]:hover,
div.bg-sidebar div.cursor-pointer.rounded-lg:hover,
div.bg-sidebar div.w-full.h-full.group:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
}

/* 当前激活选中的会话项 (Apple 风格典雅微透高光毛玻璃卡片) */
div[data-testid="conversation-row-sidebar"]:has(a.bg-sidebar-secondary),
div[data-testid="conversation-row-sidebar"].bg-sidebar-secondary,
div.bg-sidebar div.bg-sidebar-secondary,
div[data-testid="sidebar-wrapper"] div.bg-sidebar-secondary,
aside div.bg-sidebar-secondary {
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.20) !important;
  border-radius: 8px !important;
  color: #ffffff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.14) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
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
div[data-testid="top-nav-bar"],
div[data-testid="header-bar"],
div[data-testid="title-menu-bar"] {
  position: relative !important;
  z-index: 99990 !important;
  background-color: var(--ag-topbar-bg) !important;
  backdrop-filter: blur(var(--ag-topbar-blur, 24px)) saturate(180%) !important;
  -webkit-backdrop-filter: blur(var(--ag-topbar-blur, 24px)) saturate(180%) !important;
  border-bottom: 1px solid var(--ag-left-border, rgba(255, 255, 255, 0.08)) !important;
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
div[data-pane-id="pane-1"] {
  background-color: var(--ag-center-bg) !important;
  backdrop-filter: blur(var(--ag-center-blur)) saturate(160%) !important;
  -webkit-backdrop-filter: blur(var(--ag-center-blur)) saturate(160%) !important;
  border-right: 1px solid var(--ag-left-border, rgba(255, 255, 255, 0.08)) !important;
}

div.flex-1.flex.flex-col.min-w-0.h-full:has(> div[data-pane-id="pane-1"]),
div[data-pane-id="pane-1"] [data-testid="conversation-view"] {
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
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

div[data-pane-id="pane-1"] div.w-full.flex.h-full.min-h-0.flex-col.items-center.relative.outline-none.overflow-y-auto,
div[data-pane-id="pane-1"] div.h-full.overflow-y-auto.min-h-0.w-full.isolate {
  padding-top: 24px !important;
  scroll-padding-top: 24px !important;
}

div.md-sticky-message-bleed {
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

/* 3.1 主对话 Turn 容器：极光/自定义模式下统一纯净磨砂玻璃微透卡片 */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-pane-id="pane-1"] div[class*="scroll-mt-4"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-pane-id="pane-1"] [data-testid="chat-turn-container"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-pane-id="pane-1"] div[class*="group/turn"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-pane-id="pane-1"] div[data-turn-id] {
  background-color: var(--ag-center-card-bg) !important;
  border: 1px solid var(--ag-center-card-border, rgba(255, 255, 255, 0.08)) !important;
  border-radius: 14px !important;
  margin: 10px 0 !important;
  padding: 14px 18px !important;
  box-shadow: var(--ag-center-card-shadow, 0 4px 16px rgba(0, 0, 0, 0.12)) !important;
  transition: background-color 0.18s ease, border-color 0.18s ease !important;
}

/* 3.2 彻底清除 Turn 内部一切无意义的死黑死灰堆叠层 (中栏风格统一核心) */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div.relative.bg-background,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div.md-sticky-message-bleed,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div.bg-card,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div.bg-card-border,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div.bg-muted,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div.leading-relaxed,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div[data-testid="user-input-step"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] article {
  background-color: transparent !important;
  box-shadow: none !important;
}

/* 消除顶部渐变雾化遮挡罩伪元素 */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div.md-sticky-message-bleed::after {
  display: none !important;
}

/* 3.3 用户提问卡片统一：高雅纯净半透微光胶囊 */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div[data-testid="user-input-step"] div[data-testid="lifted-context-menu-trigger"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div[data-testid="user-input-step"] div[class*="bg-card-border"] {
  background: var(--ag-center-subitem-bg) !important;
  border: 1px solid rgba(255, 255, 255, 0.09) !important;
  border-radius: 12px !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  box-shadow: none !important;
  padding: 6px 10px !important;
}

/* 消除用户提问悬浮按键区域黑色光晕阴影 */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.user-input-buttons-shadow,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.user-input-buttons-container {
  box-shadow: none !important;
  background: transparent !important;
}

/* 3.4 思考过程与工具调用折叠框统一风格 (纯净磨砂胶囊) */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] button.group.tabular-nums,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] button[class*="tabular-nums"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div.relative:has(> button.tabular-nums) {
  background: var(--ag-center-subitem-bg) !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 8px !important;
  color: rgba(255, 255, 255, 0.88) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  box-shadow: none !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] button.group.tabular-nums:hover {
  background: rgba(255, 255, 255, 0.09) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

/* 3.5 子智能体任务卡片 (Agent Subtask Card) 统一风格 */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div[class*="group/agent-card"] {
  background: var(--ag-center-subitem-bg) !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 10px !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  box-shadow: none !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div[class*="group/agent-card"]:hover {
  background: rgba(255, 255, 255, 0.09) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
}

/* 3.6 更改文件统计条与审阅按钮统一风格 */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] div.files-changed-header,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.files-changed-header {
  background: var(--ag-center-subitem-bg) !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 10px !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
}

body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) button.review-button,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) button[class*="review-button"] {
  background: rgba(255, 255, 255, 0.10) !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 7px !important;
  color: #ffffff !important;
}

/* 3.7 代码块 pre 与行内代码 code 统一高质感半透纯净风格 */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] pre,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) pre {
  background-color: rgba(10, 12, 18, 0.50) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 10px !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
}

body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="scroll-mt-4"] code:not(pre code),
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) code:not(pre code) {
  background-color: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 5px !important;
  padding: 1px 5px !important;
}

/* 3.8 旁路提问与引用框统一风格 */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid="side-question-panel"] {
  background-color: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  box-shadow: none !important;
}

body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid="side-question-panel"] div.border-b {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  background: transparent !important;
}

body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) blockquote,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="markdown-alert"] {
  background-color: rgba(255, 255, 255, 0.04) !important;
  border-left: 3px solid var(--ag-accent) !important;
  border-top: none !important;
  border-right: none !important;
  border-bottom: none !important;
  border-radius: 0 8px 8px 0 !important;
  backdrop-filter: blur(10px) !important;
  padding: 8px 12px !important;
}

/* 3.9 底部输入框整体磨砂与子智能体状态栏无缝整合 (仅限极光与自定义模态) */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid="chat-input-container"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[id="antigravity.agentSidePanelInputBox"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) #antigravity\.agentSidePanelInputBox {
  position: relative !important;
  z-index: 60 !important;
  background-color: var(--ag-chat-box-bg) !important;
  backdrop-filter: blur(var(--ag-chat-box-blur)) saturate(180%) !important;
  -webkit-backdrop-filter: blur(var(--ag-chat-box-blur)) saturate(180%) !important;
  border: 1px solid var(--ag-center-card-border, rgba(255, 255, 255, 0.12)) !important;
  border-radius: 16px !important;
  box-shadow: var(--ag-center-card-shadow, 0 4px 20px rgba(0, 0, 0, 0.20)) !important;
  overflow: visible !important;
}

body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[id="antigravity.agentSidePanelInputBox"] > div:not(.bottom-full):not([data-mention-menu]),
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[id="antigravity.agentSidePanelInputBox"] div.bg-card:not(.bottom-full):not([data-mention-menu]),
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[id="antigravity.agentSidePanelInputBox"] div.bg-card-border:not(.bottom-full):not([data-mention-menu]) {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* 输入框内部子智能体状态行 */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[id="antigravity.agentSidePanelInputBox"] div:has(> button[aria-label*="subagents running"]),
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[id="antigravity.agentSidePanelInputBox"] div.flex.items-center.justify-between.cursor-pointer {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  padding: 4px 12px !important;
  background: transparent !important;
}

/* 输入框内部文本与文本域透底 */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid="chat-input-container"] textarea,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) textarea[data-testid="chat-input-textarea"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) textarea.bg-transparent,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) textarea {
  background: transparent !important;
  color: #ffffff !important;
  caret-color: var(--ag-accent) !important;
}

/* 3.10 上下文选择二级菜单 & 快捷命令 Slash / Actions 三级浮层 */
/* 仅当 #typeahead-menu 为空锚点时隐藏，避免误杀有效补全菜单 */
#typeahead-menu:empty,
div[id="typeahead-menu"]:empty {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

/* 底部向上弹出的 Actions / Mention 菜单层级设为 99990 */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[id="antigravity.agentSidePanelInputBox"] div.bottom-full,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[id="antigravity.agentSidePanelInputBox"] div[data-mention-menu],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.bottom-full[role="listbox"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.bottom-full.bg-card {
  background-color: var(--ag-popover-bg, rgba(20, 24, 34, 0.88)) !important;
  backdrop-filter: blur(32px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(190%) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 16px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
  z-index: 99990 !important;
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

/* Radix Popper 外层定位包装器：仅提升层级至 100000（高于 .bottom-full），严禁加 border / background / backdrop-filter */
div[data-radix-popper-content-wrapper] {
  z-index: 100000 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 仅对极光与自定义素材模态下的多级菜单、三级子菜单、左上角标题栏菜单及额度展示页面的真实内容卡片添加毛玻璃与坚实底衬 */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[role="menu"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[role="listbox"]:not(#typeahead-menu):not(.bottom-full),
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="border-menu-border"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.absolute[class*="border-menu-border"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="min-w-64"][class*="bg-card"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="z-[6000]"] > div.bg-card,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-radix-popper-content-wrapper] > div,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-radix-popper-content-wrapper] [data-radix-menu-content],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.absolute.top-full.left-0.mt-1,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="quota"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="usage"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="credit"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="rate-limit"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid*="quota"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid*="credit"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid*="usage"] {
  z-index: 100000 !important;
  background-color: var(--ag-popover-bg, rgba(20, 24, 34, 0.88)) !important;
  backdrop-filter: blur(32px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(190%) !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 12px !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
  overflow: visible !important;
}

/* 彻底消除额度卡片与弹出层内部纯展示容器的深色死黑底衬，但绝不误杀主卡片自身 (仅限极光与自定义素材模态) */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="quota"] div.bg-background,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="quota"] div.bg-secondary,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="quota"] div.bg-card,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="quota"] div.bg-muted,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid*="quota"] div.bg-background,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid*="quota"] div.bg-secondary,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid*="quota"] div.bg-card,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid*="quota"] div.bg-muted,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[role="menu"] div.bg-secondary,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[role="menu"] div.bg-muted,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="min-w-64"] div.bg-secondary,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[class*="min-w-64"] div.bg-muted {
  background-color: transparent !important;
}

/* 弹出菜单条目与按钮通透卡片化与 hover 优雅高光 */
div[role="menu"] [role="menuitem"],
div[data-radix-popper-content-wrapper] [role="menuitem"],
div[class*="min-w-64"] div.cursor-pointer {
  background-color: transparent !important;
  transition: all 0.15s ease !important;
}

div[role="menu"] [role="menuitem"]:hover,
div[role="menu"] [role="menuitem"][data-highlighted],
div[data-radix-popper-content-wrapper] [role="menuitem"]:hover,
div[data-radix-popper-content-wrapper] [data-highlighted],
div[class*="min-w-64"] div.cursor-pointer:hover,
div[class*="min-w-64"] div[data-highlighted] {
  background-color: rgba(255, 255, 255, 0.12) !important;
  color: #ffffff !important;
  border-radius: 6px !important;
}

/* 额度进度条与滑轨通透高光美化 */
div[class*="quota"] div[role="progressbar"],
div[class*="quota"] progress,
div[data-testid*="quota"] div[role="progressbar"],
div[data-testid*="quota"] progress {
  background-color: rgba(255, 255, 255, 0.12) !important;
  border-radius: 9999px !important;
  overflow: hidden !important;
}

/* 二级/三级菜单与标题栏菜单文本统一纯白清晰度 */
div[role="menu"] [role="menuitem"],
div[role="menu"] [role="menuitem"] span,
div[class*="border-menu-border"] span,
div[class*="border-menu-border"] button,
button[data-testid="title-menu-bar-option"] span,
button[data-testid="title-menu-bar-option"],
div[class*="quota"] span,
div[class*="quota"] p,
div[class*="quota"] h3,
div[class*="quota"] h4,
div[data-testid*="quota"] span,
div[data-testid*="quota"] p {
  color: #ffffff !important;
}

/* 菜单项悬停 Apple 风格纯净微透卡片 */
div[role="menu"] [role="menuitem"]:hover,
div[role="listbox"]:not(.bottom-full) [role="option"]:hover,
div.bg-popover button:hover,
div.bg-popover [class*="hover:bg-accent"]:hover,
div[class*="border-menu-border"] button:hover,
button[data-testid="title-menu-bar-option"]:hover {
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
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.settings-modal-backdrop {
  background-color: rgba(0, 0, 0, 0.35) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
}

body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[role="dialog"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.settings-modal-container,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.fixed.z-50.grid.w-full.max-w-lg,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid="settings-modal"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-testid="modal-container"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.settings-modal-backdrop > div {
  background-color: var(--ag-dialog-bg, rgba(20, 24, 34, 0.75)) !important;
  backdrop-filter: blur(36px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(36px) saturate(190%) !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 18px !important;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

/* 消除设置弹窗与二级设置列表所有子区域的死黑与灰色底衬 (仅极光与自定义模态) */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[role="dialog"] div.bg-muted,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[role="dialog"] div.bg-card,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[role="dialog"] div.bg-background,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[role="dialog"] .bg-muted,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[role="dialog"] .bg-card,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[role="dialog"] .bg-background,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.settings-modal-container div.bg-muted,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.settings-modal-container div.bg-card,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.settings-modal-container div.bg-background,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.settings-modal-container .bg-muted,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.settings-modal-container .bg-card,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.settings-modal-container .bg-background,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.settings-modal-container div.text-foreground,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div.settings-modal-container > div,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[role="dialog"] > div {
  background-color: transparent !important;
}

/* 设置弹窗所有文字确保纯白清晰度 */
div[role="dialog"] span,
div[role="dialog"] button,
div[role="dialog"] p,
div[role="dialog"] h1,
div[role="dialog"] h2,
div[role="dialog"] h3,
div.settings-modal-container span,
div.settings-modal-container button,
div.settings-modal-container p,
div.settings-modal-container h1,
div.settings-modal-container h2,
div.settings-modal-container h3 {
  color: #ffffff !important;
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

/* 6.1 右栏最外层主视窗挂载 --ag-right-bg 磨砂底衬 (仅极光与自定义模态) */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open="true"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open]:not([data-aux-pane-open="false"]) {
  background-color: var(--ag-right-bg) !important;
  backdrop-filter: blur(var(--ag-right-blur)) saturate(160%) !important;
  -webkit-backdrop-filter: blur(var(--ag-right-blur)) saturate(160%) !important;
  border-left: 1px solid var(--ag-left-border, rgba(255, 255, 255, 0.08)) !important;
}

/* 6.2 右栏内部嵌套视窗、Diff 审阅与文件列表消除死黑阻断 (仅极光与自定义模态) */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .bg-background,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] div.flex-grow.overflow-hidden,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] div.w-full.bg-background,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] div.flex-col.gap-3.overflow-y-auto.h-full.w-full.bg-background,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] div.flex.cursor-pointer.select-none.items-center.justify-between.bg-background {
  background-color: transparent !important;
}

/* 6.3 Monaco 代码编辑器全域透底 (仅极光与自定义模态，消除深黑拦截) */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .monaco-editor,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .monaco-editor-background,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .monaco-editor .margin,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .monaco-editor .overflow-guard,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .monaco-editor .view-lines,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .monaco-workbench .part.editor,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .monaco-workbench .part.editor > .content {
  background-color: transparent !important;
}

/* 6.4 终端 (xterm) 专属磨砂与消除死黑 (仅极光与自定义模态) */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] [data-testid="review-pane"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .terminal,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .xterm,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .xterm-viewport,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .xterm-screen {
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] [data-testid="terminal-container"] {
  background-color: var(--ag-right-term-bg) !important;
}

body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .xterm-scrollable-element,
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] .composition-view {
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

/* 6.6 右栏卡片组件 (Subagent 列表项，仅极光与自定义模态磨砂) */
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] [data-testid="subagent-node"],
body:is([data-ag-mode="aurora"], [data-ag-mode="custom"]) div[data-aux-pane-open] div.flex.flex-col.rounded-lg.overflow-hidden.cursor-pointer {
  background: var(--ag-center-subitem-bg) !important;
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
  background: var(--ag-center-subitem-bg) !important;
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

/* ==================================================== */
/* 4 模态系统样式与中栏区域控制规则                     */
/* ==================================================== */

/* [模态 1: Native 原生 UI] 完全还原官方纯黑原生，彻底消除全部毛玻璃滤镜与半透明底色，零渲染开销 */
body[data-ag-mode="native"] *:not(#ag-theme-modal):not(#ag-theme-modal *):not(#ag-theme-pill):not(#ag-theme-pill *) {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

body[data-ag-mode="native"],
body[data-ag-mode="native"] #root,
body[data-ag-mode="native"] #root > div,
body[data-ag-mode="native"] div.h-screen.w-screen {
  background-color: #0e1117 !important;
  background-image: none !important;
}

body[data-ag-mode="native"] aside,
body[data-ag-mode="native"] div[data-testid="sidebar-wrapper"],
body[data-ag-mode="native"] div.bg-sidebar,
body[data-ag-mode="native"] div.shrink-0:has(> div.bg-sidebar) {
  background-color: var(--sidebar, #0e1117) !important;
}

body[data-ag-mode="native"] div[data-pane-id="pane-1"],
body[data-ag-mode="native"] div.flex-1.min-w-0.h-full {
  background-color: #0e1117 !important;
}

body[data-ag-mode="native"] [data-aux-pane-open],
body[data-ag-mode="native"] div[data-aux-pane-open="true"],
body[data-ag-mode="native"] div.flex-1.min-w-0.h-full > div.flex {
  background-color: #0e1117 !important;
}

/* 审阅面板与终端完全回归原生深黑 */
body[data-ag-mode="native"] [data-testid="review-pane"],
body[data-ag-mode="native"] [data-testid="terminal-container"],
body[data-ag-mode="native"] div[data-aux-pane-open] .bg-background,
body[data-ag-mode="native"] div[data-aux-pane-open] div.flex-grow.overflow-hidden {
  background-color: #0e1117 !important;
}

/* Monaco 编辑器完全还原纯黑背景，不透明，无滤镜 */
body[data-ag-mode="native"] .monaco-editor,
body[data-ag-mode="native"] .monaco-editor .overflow-guard,
body[data-ag-mode="native"] .monaco-editor-background,
body[data-ag-mode="native"] .monaco-editor .margin,
body[data-ag-mode="native"] .monaco-editor .view-lines,
body[data-ag-mode="native"] .monaco-workbench .part.editor,
body[data-ag-mode="native"] .monaco-workbench .part.editor > .content {
  background-color: #0e1117 !important;
}

body[data-ag-mode="native"] div[data-testid="conversation-view"] {
  background-color: transparent !important;
}

/* 官方原生中栏对话卡片：彻底清除自定义卡片边框、深灰底色与圆角，100% 还原官方原生 */
body[data-ag-mode="native"] div[data-pane-id="pane-1"] [data-testid="conversation-view"] > div,
body[data-ag-mode="native"] div[data-pane-id="pane-1"] div[class*="scroll-mt-4"],
body[data-ag-mode="native"] div[data-pane-id="pane-1"] [data-testid="chat-turn-container"],
body[data-ag-mode="native"] div[data-pane-id="pane-1"] div[class*="group/turn"],
body[data-ag-mode="native"] div[data-pane-id="pane-1"] div[data-turn-id],
body[data-ag-mode="native"] div[data-testid="conversation-view"] > div,
body[data-ag-mode="native"] div[class*="scroll-mt-4"],
body[data-ag-mode="native"] [data-testid="chat-turn-container"],
body[data-ag-mode="native"] div[class*="group/turn"],
body[data-ag-mode="native"] div[data-turn-id] {
  background-color: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 原生模式下对话内部子元素彻底去除自定义边框与背景，恢复官方原生 */
body[data-ag-mode="native"] div[data-testid="user-input-step"] div[data-testid="lifted-context-menu-trigger"],
body[data-ag-mode="native"] div[data-testid="user-input-step"] div[class*="bg-card-border"],
body[data-ag-mode="native"] button.group.tabular-nums,
body[data-ag-mode="native"] button[class*="tabular-nums"],
body[data-ag-mode="native"] div.relative:has(> button.tabular-nums),
body[data-ag-mode="native"] div[class*="group/agent-card"],
body[data-ag-mode="native"] div.files-changed-header {
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 原生模式左侧栏新建会话按钮与选中项还原官方原生 */
body[data-ag-mode="native"] [data-testid="new-conversation-button"],
body[data-ag-mode="native"] div.bg-sidebar a.bg-sidebar-secondary {
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 原生模式全域彻底清除一切毛玻璃残留 (除视觉控制台悬浮球与控制台弹窗外) */
body[data-ag-mode="native"] *:not(#ag-theme-modal):not(#ag-theme-modal *):not(#ag-theme-pill):not(#ag-theme-pill *) {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 原生模式输入框：彻底清除任何外置边框、圆角、阴影与半透明底色，让内部官方原生 bg-card-border 和 bg-card 完美原样呈现 */
body[data-ag-mode="native"] div[data-testid="chat-input-container"],
body[data-ag-mode="native"] div[id="antigravity.agentSidePanelInputBox"],
body[data-ag-mode="native"] #antigravity\.agentSidePanelInputBox {
  background-color: transparent !important;
  background-image: none !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* 二三级菜单、Radix 浮层、下拉列表、Typeahead 与设置弹窗完全还原原生纯黑实体底衬 */
body[data-ag-mode="native"] div[role="menu"],
body[data-ag-mode="native"] div[role="listbox"]:not(#typeahead-menu),
body[data-ag-mode="native"] div[class*="border-menu-border"],
body[data-ag-mode="native"] div.absolute[class*="border-menu-border"],
body[data-ag-mode="native"] div[class*="min-w-64"][class*="bg-card"],
body[data-ag-mode="native"] div[class*="z-[6000]"] > div.bg-card,
body[data-ag-mode="native"] div[data-radix-popper-content-wrapper] > div,
body[data-ag-mode="native"] div[data-radix-popper-content-wrapper] [data-radix-menu-content],
body[data-ag-mode="native"] #typeahead-menu,
body[data-ag-mode="native"] div[role="dialog"],
body[data-ag-mode="native"] div.settings-modal-container,
body[data-ag-mode="native"] div.fixed.z-50.grid.w-full.max-w-lg,
body[data-ag-mode="native"] div[data-testid="settings-modal"],
body[data-ag-mode="native"] div[data-testid="modal-container"],
body[data-ag-mode="native"] div[class*="quota"],
body[data-ag-mode="native"] div[class*="usage"],
body[data-ag-mode="native"] div[class*="credit"] {
  background-color: #181b22 !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.65) !important;
}

/* 弹窗与菜单内部子元素还原原生背景 */
body[data-ag-mode="native"] div[role="dialog"] div.bg-muted,
body[data-ag-mode="native"] div[role="dialog"] div.bg-card,
body[data-ag-mode="native"] div[role="dialog"] div.bg-background,
body[data-ag-mode="native"] div.settings-modal-container div.bg-muted,
body[data-ag-mode="native"] div.settings-modal-container div.bg-card,
body[data-ag-mode="native"] div.settings-modal-container div.bg-background,
body[data-ag-mode="native"] div.settings-modal-container > div,
body[data-ag-mode="native"] div[role="dialog"] > div,
body[data-ag-mode="native"] div[role="menu"] div.bg-secondary,
body[data-ag-mode="native"] div[role="menu"] div.bg-muted,
body[data-ag-mode="native"] div[class*="quota"] div.bg-background,
body[data-ag-mode="native"] div[class*="quota"] div.bg-secondary,
body[data-ag-mode="native"] div[class*="quota"] div.bg-card,
body[data-ag-mode="native"] div[class*="quota"] div.bg-muted {
  background-color: #161922 !important;
}

/* [模态 2: Ocean 晶格海洋] 严格执行中栏区域控制与零遮盖 */
/* 左右两边原生深黑背景完全遮光，绝不透出画布；零毛玻璃，零模糊 */
body[data-ag-mode="ocean"] aside,
body[data-ag-mode="ocean"] div[data-testid="sidebar-wrapper"],
body[data-ag-mode="ocean"] div.bg-sidebar,
body[data-ag-mode="ocean"] div.shrink-0:has(> div.bg-sidebar) {
  background-color: #0b0e14 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
}

body[data-ag-mode="ocean"] [data-aux-pane-open],
body[data-ag-mode="ocean"] div[data-aux-pane-open="true"],
body[data-ag-mode="ocean"] div.flex-1.min-w-0.h-full > div.flex:not(:has(div[data-pane-id="pane-1"])) {
  background-color: #0b0e14 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-left: 1px solid rgba(255, 255, 255, 0.08) !important;
}

body[data-ag-mode="ocean"] [data-testid="review-pane"],
body[data-ag-mode="ocean"] [data-testid="terminal-container"],
body[data-ag-mode="ocean"] div[data-aux-pane-open] .bg-background,
body[data-ag-mode="ocean"] div[data-aux-pane-open] div.flex-grow.overflow-hidden {
  background-color: #0b0e14 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

body[data-ag-mode="ocean"] .monaco-editor,
body[data-ag-mode="ocean"] .monaco-editor .overflow-guard,
body[data-ag-mode="ocean"] .monaco-editor-background,
body[data-ag-mode="ocean"] .monaco-editor .margin,
body[data-ag-mode="ocean"] .monaco-editor .view-lines,
body[data-ag-mode="ocean"] .monaco-workbench .part.editor,
body[data-ag-mode="ocean"] .monaco-workbench .part.editor > .content {
  background-color: #12151c !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

body[data-ag-mode="ocean"] div[role="menu"],
body[data-ag-mode="ocean"] div[role="listbox"]:not(#typeahead-menu):not(.bottom-full),
body[data-ag-mode="ocean"] div[class*="border-menu-border"],
body[data-ag-mode="ocean"] div.absolute[class*="border-menu-border"],
body[data-ag-mode="ocean"] div[data-radix-popper-content-wrapper] > div,
body[data-ag-mode="ocean"] #typeahead-menu,
body[data-ag-mode="ocean"] div[role="dialog"],
body[data-ag-mode="ocean"] div.settings-modal-container {
  background-color: #181b22 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.65) !important;
}

/* 中栏 pane-1 容器透出底部的 WebGL 画布，限制溢出 */
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] {
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  position: absolute !important;
  overflow: hidden !important;
}

/* 中栏画布置于中栏绝对底层 z-index: 0，pointer-events: none */
#ag-center-ocean-canvas {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none !important;
  z-index: 0 !important;
}

/* 居中流光商标置于 canvas 之上、文本之下 */
#ag-center-emblem-wrapper {
  position: absolute !important;
  top: 36% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 1 !important;
  pointer-events: auto !important;
}

/* 在空白会话初始启动界面，商标自适应上浮至 18%，完美避开居中输入框遮挡 */
body[data-ag-mode="ocean"]:not(:has(div[data-pane-id="pane-1"])) #ag-center-emblem-wrapper,
body[data-ag-mode="ocean"]:has(div.w-full.h-full.flex.flex-col.gap-6.justify-start) #ag-center-emblem-wrapper {
  top: 18% !important;
}

/* 中栏内部所有会话容器与交互内容置于 canvas 之上 (z-index: 1)，保证文字绝对不被遮挡 */
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] > div:not(#ag-center-ocean-canvas):not(#ag-center-emblem-wrapper),
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] > [class*="group"] {
  position: relative !important;
  z-index: 1 !important;
  background-color: transparent !important;
  pointer-events: auto !important;
}

body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] [data-testid="conversation-view"] {
  background-color: transparent !important;
}

/* 中栏会话视窗父容器：完全透空，绝不遮挡底层晶格海洋 */
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] [data-testid="conversation-view"],
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] [data-testid="conversation-view"] > div {
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  box-shadow: none !important;
}

/* 中栏对话卡片：采用轻量通透背景配合清爽细微描边，让晶格海洋与流动粒子清晰可见，同时保证文字易读 */
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div[class*="scroll-mt-4"],
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] [data-testid="chat-turn-container"],
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div[class*="group/turn"] {
  background-color: rgba(10, 14, 22, 0.16) !important;
  backdrop-filter: blur(3px) !important;
  -webkit-backdrop-filter: blur(3px) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  border-radius: 14px !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15) !important;
}

/* 对话内部子元素：高雅微透，杜绝沉重黑块遮蔽 */
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div[data-testid="user-input-step"] div[data-testid="lifted-context-menu-trigger"],
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div[data-testid="user-input-step"] div[class*="bg-card-border"],
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] button.group.tabular-nums,
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div.relative:has(> button.tabular-nums),
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div[class*="group/agent-card"],
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div.files-changed-header {
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 10px !important;
  backdrop-filter: blur(4px) !important;
  -webkit-backdrop-filter: blur(4px) !important;
}

/* 底部输入框：高透柔光毛玻璃悬浮，清晰悬浮于晶格海洋之上 */
body[data-ag-mode="ocean"] div[data-testid="chat-input-container"],
body[data-ag-mode="ocean"] div[id="antigravity.agentSidePanelInputBox"],
body[data-ag-mode="ocean"] #antigravity\\.agentSidePanelInputBox,
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] div:has(> textarea),
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] form:has(textarea),
body[data-ag-mode="ocean"] div[data-pane-id="pane-1"] textarea {
  background-color: rgba(14, 18, 28, 0.48) !important;
  backdrop-filter: blur(16px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(16px) saturate(160%) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 18px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.10) !important;
  position: relative !important;
  z-index: 10 !important;
}

/* 新会话聊天启动界面 (未有对话历史时的空白初始界面)：彻底去除不透明黑底遮盖，通透毛玻璃展示让海洋完美透显 */
body[data-ag-mode="ocean"] div.w-full.h-full.flex.flex-col.gap-6.justify-start,
body[data-ag-mode="ocean"] div[class*="justify-start"][class*="animate-fade-in"],
body[data-ag-mode="ocean"] div.animate-fade-in:has(> div.w-full.h-full.flex.flex-col.gap-6),
body[data-ag-mode="ocean"] div.flex-1.min-h-0:has(> div.w-full.h-full.flex.animate-fade-in),
body[data-ag-mode="ocean"] div.relative.z-0.flex-1.flex.min-h-0.h-full {
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  position: relative !important;
  overflow: hidden !important;
}

body[data-ag-mode="ocean"] div.w-full.h-full.flex.flex-col.gap-6.justify-start > div,
body[data-ag-mode="ocean"] div[class*="justify-start"][class*="animate-fade-in"] > div {
  position: relative !important;
  z-index: 2 !important;
}

/* 启动界面所有胶囊按钮/选项卡：清透高雅毛玻璃 */
body[data-ag-mode="ocean"] div[class*="justify-start"][class*="animate-fade-in"] button,
body[data-ag-mode="ocean"] div.w-full.h-full.flex.flex-col.gap-6.justify-start button {
  background-color: rgba(255, 255, 255, 0.06) !important;
  backdrop-filter: blur(12px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(160%) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: #ffffff !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18) !important;
}

/* 启动界面底部输入框：高透柔光毛玻璃悬浮于晶格海洋之上 */
body[data-ag-mode="ocean"] div[class*="justify-start"][class*="animate-fade-in"] div.relative.flex.flex-col:has(textarea),
body[data-ag-mode="ocean"] div[class*="justify-start"][class*="animate-fade-in"] div[data-testid="chat-input-container"] {
  background-color: rgba(14, 18, 28, 0.48) !important;
  backdrop-filter: blur(16px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(16px) saturate(160%) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 18px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.10) !important;
}
`;

    styleEl.textContent = baseThemeCss;
    applyCssVariables();

    // 3. 构建 WebGL 动态极光流体画布 (全景极光模式)
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
      if (shaderAnimFrame) return;
      try {
        if (!shaderGl) {
          shaderGl = stageCanvas.getContext('webgl');
        }
        if (!shaderGl) return;

        if (!shaderProgram) {
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
        }

        function render(time) {
          if (stageCanvas.style.display === 'none') return;
          stageCanvas.width = window.innerWidth * 0.75;
          stageCanvas.height = window.innerHeight * 0.75;
          shaderGl.viewport(0, 0, stageCanvas.width, stageCanvas.height);
          shaderGl.useProgram(shaderProgram);
          shaderGl.uniform2f(shaderGl.getUniformLocation(shaderProgram, 'u_res'), stageCanvas.width, stageCanvas.height);
          shaderGl.uniform1f(shaderGl.getUniformLocation(shaderProgram, 'u_time'), time * 0.001 * (config.auroraSpeed || 1.0));
          const [r, g, b] = config.accentRgb || [10, 132, 255];
          shaderGl.uniform3f(shaderGl.getUniformLocation(shaderProgram, 'u_accent'), r / 255, g / 255, b / 255);
          shaderGl.drawArrays(shaderGl.TRIANGLES, 0, 6);
          shaderAnimFrame = requestAnimationFrame(render);
        }
        shaderAnimFrame = requestAnimationFrame(render);
      } catch (err) {
        console.warn('[Apple Theme] 极光 WebGL 启动失败', err);
      }
    }

    // 3.1 Gemini 晶格海洋 WebGL 引擎 (仅在中栏主视口区域独占运行，左右两边原生深黑遮光，零遮挡会话文字)
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

    let oceanAudioCtx = null;
    function playRippleSynth(freqBase = 520, isLiftoff = false) {
      if (!config.oceanAudio) return;
      try {
        if (!oceanAudioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) oceanAudioCtx = new AudioContextClass();
        }
        if (!oceanAudioCtx) return;
        if (oceanAudioCtx.state === 'suspended') {
          oceanAudioCtx.resume();
        }
        const now = oceanAudioCtx.currentTime;
        const osc = oceanAudioCtx.createOscillator();
        const gain = oceanAudioCtx.createGain();
        osc.type = isLiftoff ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freqBase, now);
        osc.frequency.exponentialRampToValueAtTime(isLiftoff ? freqBase * 1.85 : freqBase * 1.35, now + (isLiftoff ? 0.38 : 0.16));

        gain.gain.setValueAtTime(isLiftoff ? 0.08 : 0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (isLiftoff ? 0.42 : 0.18));

        osc.connect(gain);
        gain.connect(oceanAudioCtx.destination);
        osc.start(now);
        osc.stop(now + (isLiftoff ? 0.44 : 0.2));
      } catch (e) {}
    }

    function getOceanMountTarget() {
      const p1 = document.querySelector('div[data-pane-id="pane-1"]');
      if (p1) return p1;
      const blankStart = document.querySelector('div.w-full.h-full.flex.flex-col.gap-6.justify-start')
        || document.querySelector('div[class*="justify-start"][class*="animate-fade-in"]');
      if (blankStart) return blankStart;
      const chatContainer = document.querySelector('div.flex-1.min-h-0:has(> div.w-full.h-full.flex)');
      if (chatContainer) return chatContainer;
      return document.querySelector('div.relative.z-0.flex-1.flex.min-h-0.h-full');
    }

    let oceanCanvas = document.getElementById('ag-center-ocean-canvas');

    function ensureOceanMount() {
      const target = getOceanMountTarget();
      if (!target) return null;
      target.style.position = 'relative';
      if (!oceanCanvas) {
        oceanCanvas = document.createElement('canvas');
        oceanCanvas.id = 'ag-center-ocean-canvas';
      }
      oceanCanvas.style.cssText = `
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        pointer-events: none !important;
        z-index: 0 !important;
        display: ${config.mode === 'ocean' ? 'block' : 'none'} !important;
        border-radius: 0 !important;
      `;
      if (oceanCanvas.parentElement !== target) {
        target.insertBefore(oceanCanvas, target.firstChild);
      }
      return oceanCanvas;
    }

    const OFFICIAL_TRADEMARK_PATHS = {
      gemini: 'M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81T4.68 11.04Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81Z',
      antigravity: 'M12.0 2.6C9.4 2.6 8.1 5.0 6.7 9.2C5.2 13.6 3.9 17.2 2.1 20.0C1.7 20.6 2.3 21.2 3.1 20.7C5.1 19.5 6.8 16.6 8.2 14.0C9.4 11.7 10.6 10.6 12.0 10.6C13.4 10.6 14.6 11.7 15.8 14.0C17.2 16.6 18.9 19.5 20.9 20.7C21.7 21.2 22.3 20.6 21.9 20.0C20.1 17.2 18.8 13.6 17.3 9.2C15.9 5.0 14.6 2.6 12.0 2.6Z',
      windows: 'M1.5 1.5H11.1V11.1H1.5ZM12.9 1.5H22.5V11.1H12.9ZM1.5 12.9H11.1V22.5H1.5ZM12.9 12.9H22.5V22.5H12.9Z',
      apple: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701Z'
    };
    const CLASSIC_FOUR_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

    let emblemWrapper = document.getElementById('ag-center-emblem-wrapper');

    function ensureEmblemMount() {
      const target = getOceanMountTarget();
      if (!target) return null;
      target.style.position = 'relative';
      if (!emblemWrapper) {
        emblemWrapper = document.createElement('div');
        emblemWrapper.id = 'ag-center-emblem-wrapper';
        emblemWrapper.title = '点击无边框流光商标向四周海面发射环形冲击波';
        emblemWrapper.innerHTML = `
          <svg id="ag-center-emblem-svg" viewBox="0 0 24 24" style="width: 100px; height: 100px; overflow: visible; transition: transform 0.3s ease;">
            <defs>
              <path id="ag-tm-path-gemini" d="${OFFICIAL_TRADEMARK_PATHS.gemini}" />
              <path id="ag-tm-path-antigravity" d="${OFFICIAL_TRADEMARK_PATHS.antigravity}" />
              <path id="ag-tm-path-windows" d="${OFFICIAL_TRADEMARK_PATHS.windows}" />
              <path id="ag-tm-path-apple" d="${OFFICIAL_TRADEMARK_PATHS.apple}" />

              <linearGradient id="ag-classic-four-grad" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22">
                <stop id="ag-emblem-stop1" offset="0%" stop-color="#4285F4" />
                <stop id="ag-emblem-stop2" offset="33%" stop-color="#EA4335" />
                <stop id="ag-emblem-stop3" offset="66%" stop-color="#FBBC05" />
                <stop id="ag-emblem-stop4" offset="100%" stop-color="#34A853" />
                <animateTransform id="ag-emblem-body-rot" attributeName="gradientTransform" type="rotate" from="0 12 12" to="360 12 12" dur="5.5s" repeatCount="indefinite" />
              </linearGradient>

              <linearGradient id="ag-edge-flow-grad" gradientUnits="userSpaceOnUse" x1="0" y1="12" x2="24" y2="12">
                <stop offset="0%" stop-color="#FFFFFF" />
                <stop id="ag-edge-stop-a" offset="22%" stop-color="#4285F4" />
                <stop id="ag-edge-stop-b" offset="50%" stop-color="#EA4335" />
                <stop id="ag-edge-stop-c" offset="78%" stop-color="#FBBC05" />
                <stop offset="100%" stop-color="#34A853" />
                <animateTransform id="ag-emblem-edge-rot" attributeName="gradientTransform" type="rotate" from="360 12 12" to="0 12 12" dur="2.8s" repeatCount="indefinite" />
              </linearGradient>

              <filter id="ag-emblem-aura-filter" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="glowNear" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="3.8" result="glowFar" />
                <feMerge>
                  <feMergeNode in="glowFar" />
                  <feMergeNode in="glowNear" />
                </feMerge>
              </filter>

              <filter id="ag-emblem-edge-rim-filter" x="-30%" y="-30%" width="160%" height="160%">
                <feMorphology in="SourceAlpha" operator="erode" radius="0.65" result="eroded" />
                <feGaussianBlur in="eroded" stdDeviation="0.55" result="blurredInner" />
                <feComposite in="SourceGraphic" in2="blurredInner" operator="out" result="innerRimBand" />
                <feGaussianBlur in="innerRimBand" stdDeviation="0.35" result="softRimGlow" />
                <feMerge>
                  <feMergeNode in="softRimGlow" />
                  <feMergeNode in="innerRimBand" />
                </feMerge>
              </filter>
            </defs>

            <g id="ag-icon-group-gemini">
              <use href="#ag-tm-path-gemini" fill="url(#ag-edge-flow-grad)" filter="url(#ag-emblem-aura-filter)" opacity="0.85" />
              <use href="#ag-tm-path-gemini" fill="url(#ag-classic-four-grad)" opacity="0.92" />
              <use href="#ag-tm-path-gemini" fill="url(#ag-edge-flow-grad)" filter="url(#ag-emblem-edge-rim-filter)" opacity="0.98" />
            </g>
            <g id="ag-icon-group-antigravity" style="display: none;">
              <use href="#ag-tm-path-antigravity" fill="url(#ag-edge-flow-grad)" filter="url(#ag-emblem-aura-filter)" opacity="0.85" />
              <use href="#ag-tm-path-antigravity" fill="url(#ag-classic-four-grad)" opacity="0.92" />
              <use href="#ag-tm-path-antigravity" fill="url(#ag-edge-flow-grad)" filter="url(#ag-emblem-edge-rim-filter)" opacity="0.98" />
            </g>
            <g id="ag-icon-group-windows" style="display: none;">
              <use href="#ag-tm-path-windows" fill="url(#ag-edge-flow-grad)" filter="url(#ag-emblem-aura-filter)" opacity="0.85" />
              <use href="#ag-tm-path-windows" fill="url(#ag-classic-four-grad)" opacity="0.92" />
              <use href="#ag-tm-path-windows" fill="url(#ag-edge-flow-grad)" filter="url(#ag-emblem-edge-rim-filter)" opacity="0.98" />
            </g>
            <g id="ag-icon-group-apple" style="display: none;">
              <use href="#ag-tm-path-apple" fill="url(#ag-edge-flow-grad)" filter="url(#ag-emblem-aura-filter)" opacity="0.85" />
              <use href="#ag-tm-path-apple" fill="url(#ag-classic-four-grad)" opacity="0.92" />
              <use href="#ag-tm-path-apple" fill="url(#ag-edge-flow-grad)" filter="url(#ag-emblem-edge-rim-filter)" opacity="0.98" />
            </g>
          </svg>
        `;
        emblemWrapper.onclick = (e) => {
          e.stopPropagation();
          if (oceanEngine) {
            oceanEngine.spawnRipple(0.5, 0.60, 1.55);
            setTimeout(() => oceanEngine.spawnRipple(0.5, 0.60, 1.25), 110);
          }
          playRippleSynth(640, true);
        };
      }
      const isOcean = config.mode === 'ocean' && config.oceanEmblemEnabled;
      const isBlank = !document.querySelector('div[data-pane-id="pane-1"]');
      const emblemTop = isBlank ? '18%' : '36%';
      emblemWrapper.style.cssText = `
        position: absolute !important;
        top: ${emblemTop} !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        z-index: 1 !important;
        pointer-events: auto !important;
        cursor: pointer !important;
        display: ${isOcean ? 'flex' : 'none'} !important;
        align-items: center !important;
        justify-content: center !important;
        transition: opacity 0.3s ease, top 0.3s ease !important;
      `;
      if (oceanCanvas && oceanCanvas.nextSibling !== emblemWrapper) {
        target.insertBefore(emblemWrapper, oceanCanvas.nextSibling);
      } else if (!oceanCanvas && emblemWrapper.parentElement !== target) {
        target.insertBefore(emblemWrapper, target.firstChild);
      }
      updateEmblemSvg();
      return emblemWrapper;
    }

    function updateEmblemSvg() {
      if (!emblemWrapper) return;
      const svg = document.getElementById('ag-center-emblem-svg');
      if (svg) {
        svg.style.transform = `scale(${config.oceanEmblemScale || 1.0})`;
      }
      ['gemini', 'antigravity', 'windows', 'apple'].forEach(k => {
        const g = document.getElementById(`ag-icon-group-${k}`);
        if (g) g.style.display = (k === config.oceanEmblemStyle) ? 'block' : 'none';
      });

      const activeColors = config.oceanEmblemColorMode === 'sync'
        ? (config.oceanPalette === 'custom' ? config.oceanColorsHex : (OCEAN_PALETTES[config.oceanPalette] || OCEAN_PALETTES.gemini))
        : CLASSIC_FOUR_COLORS;

      ['stop1', 'stop2', 'stop3', 'stop4'].forEach((s, idx) => {
        const el = document.getElementById(`ag-emblem-${s}`);
        if (el) el.setAttribute('stop-color', activeColors[idx] || '#4285F4');
      });
      const edgeA = document.getElementById('ag-edge-stop-a');
      const edgeB = document.getElementById('ag-edge-stop-b');
      const edgeC = document.getElementById('ag-edge-stop-c');
      if (edgeA) edgeA.setAttribute('stop-color', activeColors[0]);
      if (edgeB) edgeB.setAttribute('stop-color', activeColors[1]);
      if (edgeC) edgeC.setAttribute('stop-color', activeColors[2]);
    }

    class AgOceanEngine {
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
        this.mouse = { x: 0.5, y: 0.3 };
        this.targetMouse = { x: 0.5, y: 0.3 };
        this.currentIntensity = 0.92;
        this.targetIntensity = 0.92;
        this.voiceLevel = 0.0;
        this.uniformLocs = {};
        this.init();
      }

      init() {
        if (!this.canvas) {
          this.canvas = document.getElementById('ag-center-ocean-canvas') || ensureOceanMount();
        }
        if (!this.canvas) return;
        try {
          this.gl = this.canvas.getContext('webgl', { antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
          if (!this.gl) return;

          const vsSrc = `
            attribute vec2 a_position;
            varying vec2 v_uv;
            void main() {
              v_uv = a_position * 0.5 + 0.5;
              gl_Position = vec4(a_position, 0.0, 1.0);
            }
          `;

          const fsSrc = `
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
            float sdHexagonMetric(vec2 p) {
              p = abs(p);
              return max(dot(p, vec2(0.8660254, 0.5)), p.y);
            }
            float sdCrossPlusMetric(vec2 p, float armRatio) {
              vec2 ap = abs(p);
              float armA = max(ap.x, ap.y / max(0.18, armRatio));
              float armB = max(ap.y, ap.x / max(0.18, armRatio));
              return min(armA, armB);
            }
            float evaluateMotifDistance(vec2 p, int shapeType, float kParam, float morphFactor) {
              float circleDist = length(p);
              float targetDist = circleDist;
              if (shapeType == 0) {
                float k = mix(1.45, kParam, morphFactor);
                targetDist = sdDiamondStar(p, k);
              } else if (shapeType == 1) {
                targetDist = (abs(p.x) + abs(p.y)) * 0.78;
              } else if (shapeType == 2) {
                targetDist = circleDist;
              } else if (shapeType == 3) {
                targetDist = sdHexagonMetric(p) * 1.06;
              } else if (shapeType == 4) {
                float armRatio = clamp(kParam * 0.55, 0.20, 0.58);
                targetDist = sdCrossPlusMetric(p, armRatio);
              } else {
                targetDist = circleDist;
              }
              if (shapeType == 0) {
                return targetDist;
              }
              return mix(circleDist, targetDist, morphFactor);
            }
            vec3 evaluateCustomGradient(float t) {
              float c = fract(t);
              if (c < 0.25) return mix(u_col1, u_col2, smoothstep(0.0, 0.25, c));
              if (c < 0.50) return mix(u_col2, u_col3, smoothstep(0.25, 0.50, c));
              if (c < 0.75) return mix(u_col3, u_col4, smoothstep(0.50, 0.75, c));
              return mix(u_col4, u_col1, smoothstep(0.75, 1.0, c));
            }

            void main() {
              vec2 aspect = vec2(u_resolution.x / max(1.0, u_resolution.y), 1.0);
              vec2 uv = (v_uv - 0.5) * aspect;
              vec2 mouseWorld = (u_mouse - 0.5) * aspect;

              float regionMask = 1.0;

              float t = u_time * u_swellSpeed;
              float baseWave1 = snoise(uv * 2.3 + vec2(t * 0.62, t * 0.28));
              float baseWave2 = snoise(uv * 4.6 - vec2(t * 0.45, -t * 0.52));
              vec2 waveGrad = vec2(baseWave1, baseWave2);
              vec2 warpedUV = uv + waveGrad * u_parallax * u_intensity;

              float cosA = cos(u_gridAngle);
              float sinA = sin(u_gridAngle);
              mat2 rotMat = mat2(cosA, -sinA, sinA, cosA);
              mat2 invRotMat = mat2(cosA, sinA, -sinA, cosA);

              vec2 gridSpace = rotMat * warpedUV * u_gridDensity;
              vec2 cellId = floor(gridSpace);
              vec2 localP = fract(gridSpace) - 0.5;
              vec2 cellCenterWorld = invRotMat * ((cellId + 0.5) / u_gridDensity);

              float swellA = snoise(cellCenterWorld * 2.4 + vec2(t * 0.55, t * 0.24));
              float swellB = snoise(cellCenterWorld * 5.0 - vec2(t * 0.38, -t * 0.46));
              float oceanHeight = (swellA * 0.62 + swellB * 0.38) * 0.5 + 0.5;

              float wavePhase = cellCenterWorld.x * 3.2 + cellCenterWorld.y * 2.1 - t * 1.15 + swellA * 1.6;
              float causticRidge = pow(1.0 - abs(sin(wavePhase)), 3.2) * 0.42;

              float cellRand = hash21(cellId);
              float twinkle = 0.88 + 0.12 * sin(u_time * 3.8 + cellRand * 6.2831);

              float distMouse = length(cellCenterWorld - mouseWorld);
              float cursorWave = sin(distMouse * 22.0 - u_time * 6.0) * exp(-distMouse * 3.1) * 0.36 * u_rippleForce;
              float cursorHoverGlow = exp(-distMouse * 4.2) * 0.28 * u_rippleForce;

              float rippleAccum = 0.0;
              for (int i = 0; i < 8; i++) {
                vec4 rp = u_ripples[i];
                if (rp.z >= 0.0) {
                  float age = u_time - rp.z;
                  if (age >= 0.0 && age < 2.8) {
                    vec2 rpPos = (rp.xy - 0.5) * aspect;
                    float d = length(cellCenterWorld - rpPos);
                    float radius = age * 0.74;
                    float ring = cos((d - radius) * 28.0) * exp(-abs(d - radius) * 6.2);
                    float fade = exp(-age * 1.3) * rp.w;
                    rippleAccum += ring * fade;
                  }
                }
              }

              float voiceWave = 0.0;
              if (u_voiceLevel > 0.01) {
                float radialDist = length(cellCenterWorld - vec2(0.0, -0.22));
                voiceWave = sin(radialDist * 26.0 - u_time * 9.5) * u_voiceLevel * exp(-radialDist * 1.6);
              }

              // 居中发光图标向外辐射的柔和能量波环 (通过 u_emblemScale 动态缩放)
              vec2 emblemCenter = vec2(0.0, 0.0);
              float cellDistToEmblem = length(cellCenterWorld - emblemCenter);
              float scaledEmblemDist = cellDistToEmblem / max(0.2, u_emblemScale);
              float emblemPulseWave = u_emblemEnabled * (0.28 + 0.22 * sin(scaledEmblemDist * 18.0 - u_time * 3.8)) * exp(-scaledEmblemDist * 3.2);

              float rawEnergy = (oceanHeight * 0.58 + causticRidge + emblemPulseWave + cursorWave + cursorHoverGlow + rippleAccum * u_rippleForce + voiceWave * 0.7) * twinkle;
              float energy = clamp(rawEnergy * regionMask * (0.55 + 0.62 * u_intensity), 0.0, 1.0);

              vec2 motifP = invRotMat * localP;
              float morphFactor = mix(1.0, smoothstep(0.14, 0.82, energy), u_morphEnabled);
              float sdfDist = evaluateMotifDistance(motifP, u_shapeType, u_starSharpness, morphFactor);

              float radius = 0.49 * pow(energy, 1.12);
              float aa = 0.052;
              float shapeMask = 0.0;

              if (u_shapeType == 5) {
                float ringThick = clamp(u_starSharpness * 0.24, 0.06, 0.22) * (0.5 + 0.5 * energy);
                float ringDist = abs(sdfDist - radius * 0.72);
                shapeMask = 1.0 - smoothstep(ringThick - aa, ringThick + aa, ringDist);
              } else {
                shapeMask = 1.0 - smoothstep(radius - aa, radius + aa, sdfDist);
              }

              float coreHighlight = (1.0 - smoothstep(0.0, radius * 0.45, sdfDist)) * smoothstep(0.42, 0.95, energy);

              float colorPhase = (cellCenterWorld.x * 0.46 + cellCenterWorld.y * 0.34) * u_colorSpread - u_time * 0.15 + oceanHeight * 0.40 + rippleAccum * 0.18;
              vec3 spectralCol = evaluateCustomGradient(colorPhase);
              vec3 motifCol = mix(spectralCol, vec3(0.98, 0.99, 1.0), coreHighlight * 0.82);

              vec3 bgCol = vec3(0.024, 0.035, 0.066);
              float underGlow = regionMask * (0.14 + 0.32 * oceanHeight + causticRidge * 0.4 + max(0.0, rippleAccum) * 0.28) * u_intensity;
              vec3 finalColor = bgCol + spectralCol * underGlow * 0.44;

              float alphaWeight = shapeMask * smoothstep(0.03, 0.20, energy);
              finalColor = mix(finalColor, motifCol, alphaWeight);

              gl_FragColor = vec4(finalColor, 1.0);
            }
          `;

          const compile = (type, src) => {
            const s = this.gl.createShader(type);
            this.gl.shaderSource(s, src);
            this.gl.compileShader(s);
            if (!this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS)) {
              console.error('[AgOceanEngine] Shader compile error:', this.gl.getShaderInfoLog(s));
            }
            return s;
          };

          const vs = compile(this.gl.VERTEX_SHADER, vsSrc);
          const fs = compile(this.gl.FRAGMENT_SHADER, fsSrc);
          this.program = this.gl.createProgram();
          this.gl.attachShader(this.program, vs);
          this.gl.attachShader(this.program, fs);
          this.gl.linkProgram(this.program);
          if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('[AgOceanEngine] Program link error:', this.gl.getProgramInfoLog(this.program));
          }
          this.gl.useProgram(this.program);

          const buf = this.gl.createBuffer();
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buf);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
          ]), this.gl.STATIC_DRAW);

          const aPos = this.gl.getAttribLocation(this.program, 'a_position');
          this.gl.enableVertexAttribArray(aPos);
          this.gl.vertexAttribPointer(aPos, 2, this.gl.FLOAT, false, 0, 0);

          this.uniformLocs = {
            u_resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
            u_time: this.gl.getUniformLocation(this.program, 'u_time'),
            u_mouse: this.gl.getUniformLocation(this.program, 'u_mouse'),
            u_intensity: this.gl.getUniformLocation(this.program, 'u_intensity'),
            u_voiceLevel: this.gl.getUniformLocation(this.program, 'u_voiceLevel'),
            u_gridDensity: this.gl.getUniformLocation(this.program, 'u_gridDensity'),
            u_starSharpness: this.gl.getUniformLocation(this.program, 'u_starSharpness'),
            u_gridAngle: this.gl.getUniformLocation(this.program, 'u_gridAngle'),
            u_swellSpeed: this.gl.getUniformLocation(this.program, 'u_swellSpeed'),
            u_rippleForce: this.gl.getUniformLocation(this.program, 'u_rippleForce'),
            u_parallax: this.gl.getUniformLocation(this.program, 'u_parallax'),
            u_shapeType: this.gl.getUniformLocation(this.program, 'u_shapeType'),
            u_morphEnabled: this.gl.getUniformLocation(this.program, 'u_morphEnabled'),
            u_emblemEnabled: this.gl.getUniformLocation(this.program, 'u_emblemEnabled'),
            u_emblemScale: this.gl.getUniformLocation(this.program, 'u_emblemScale'),
            u_col1: this.gl.getUniformLocation(this.program, 'u_col1'),
            u_col2: this.gl.getUniformLocation(this.program, 'u_col2'),
            u_col3: this.gl.getUniformLocation(this.program, 'u_col3'),
            u_col4: this.gl.getUniformLocation(this.program, 'u_col4'),
            u_colorSpread: this.gl.getUniformLocation(this.program, 'u_colorSpread'),
            u_ripples: []
          };
          for (let i = 0; i < 8; i++) {
            this.uniformLocs.u_ripples.push(this.gl.getUniformLocation(this.program, `u_ripples[${i}]`));
          }

          // 鼠标在中栏主视区交互发射涟漪
          const handlePointerAction = (e) => {
            if (!this.running || config.mode !== 'ocean') return;
            const target = getOceanMountTarget();
            if (!target) return;
            const r = target.getBoundingClientRect();
            if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
              const nx = (e.clientX - r.left) / Math.max(1, r.width);
              const ny = 1.0 - (e.clientY - r.top) / Math.max(1, r.height);
              if (e.type === 'pointermove' || e.type === 'mousemove') {
                this.targetMouse.x = nx;
                this.targetMouse.y = ny;
              } else if (e.type === 'pointerdown' || e.type === 'click') {
                this.spawnRipple(nx, ny, 1.3);
                playRippleSynth(440 + Math.round(nx * 260), false);
              }
            }
          };

          window.addEventListener('mousemove', handlePointerAction, { passive: true });
          window.addEventListener('click', handlePointerAction, { passive: true });

          // 键盘在输入框打字触发水波共振
          window.addEventListener('keydown', (e) => {
            if (!this.running || config.mode !== 'ocean') return;
            const target = e.target;
            if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
              this.spawnRipple(0.5, 0.88, 1.15);
              playRippleSynth(580, false);
            }
          }, { passive: true });

        } catch (e) {
          console.warn('[AgOceanEngine] WebGL 初始化异常', e);
        }
      }

      spawnRipple(nx, ny, weight = 1.0) {
        this.ripples[this.rippleCursor] = [nx, ny, this.simTime, weight];
        this.rippleCursor = (this.rippleCursor + 1) % 8;
      }

      setStatePreset(preset) {
        config.oceanPreset = preset;
        if (preset === 'idle') {
          this.targetIntensity = 0.55;
        } else if (preset === 'focus') {
          this.targetIntensity = 0.92;
          this.spawnRipple(0.5, 0.4, 1.25);
          playRippleSynth(540, false);
        } else if (preset === 'thinking') {
          this.targetIntensity = 1.0;
          this.spawnRipple(0.5, 0.35, 1.5);
          setTimeout(() => this.spawnRipple(0.35, 0.45, 1.2), 90);
          setTimeout(() => this.spawnRipple(0.65, 0.45, 1.2), 180);
          playRippleSynth(620, true);
        } else if (preset === 'voice') {
          this.targetIntensity = 0.95;
          this.spawnRipple(0.5, 0.3, 1.35);
          playRippleSynth(580, false);
        }
        try { persistConfig(); } catch (e) {}
      }

      start() {
        if (this.running) return;
        ensureOceanMount();
        if (!this.canvas) {
          this.canvas = document.getElementById('ag-center-ocean-canvas');
        }
        if (!this.gl || !this.program) {
          this.init();
        }
        this.running = true;
        this.lastFrameTime = performance.now();

        const render = (time) => {
          if (!this.running) return;
          try {
            if (!this.canvas) {
              this.canvas = document.getElementById('ag-center-ocean-canvas') || ensureOceanMount();
            }
            if (!this.gl || !this.program || (this.gl && this.gl.isContextLost())) {
              this.init();
              if (!this.gl || !this.program) {
                this.animId = requestAnimationFrame(render);
                return;
              }
            }

            const target = getOceanMountTarget();
            if (target && this.canvas && this.canvas.parentElement !== target) {
              target.style.position = 'relative';
              target.insertBefore(this.canvas, target.firstChild);
              if (emblemWrapper) {
                target.insertBefore(emblemWrapper, this.canvas.nextSibling);
              }
            }

            // 动态对齐尺寸
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const cw = (this.canvas && this.canvas.clientWidth) || (target ? target.clientWidth : 800);
            const ch = (this.canvas && this.canvas.clientHeight) || (target ? target.clientHeight : 600);
            const w = Math.max(1, Math.floor(cw * dpr));
            const h = Math.max(1, Math.floor(ch * dpr));
            if (this.canvas && (this.canvas.width !== w || this.canvas.height !== h)) {
              this.canvas.width = w;
              this.canvas.height = h;
              this.gl.viewport(0, 0, w, h);
            }

            const now = time || performance.now();
            let dt = this.lastFrameTime ? (now - this.lastFrameTime) * 0.001 : 0.016;
            if (dt <= 0 || dt > 0.1) dt = 0.016;
            this.lastFrameTime = now;
            this.simTime += dt;

            this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.08;
            this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.08;
            this.currentIntensity += (this.targetIntensity - this.currentIntensity) * 0.07;

            if (config.oceanPreset === 'voice') {
              const v = 0.48 + 0.35 * Math.sin(this.simTime * 7.5) + 0.22 * Math.cos(this.simTime * 13.8);
              this.voiceLevel += (v - this.voiceLevel) * 0.16;
            } else {
              this.voiceLevel *= 0.88;
            }

            const palKey = config.oceanPalette || 'gemini';
            const palColors = (palKey === 'custom' && Array.isArray(config.oceanColorsHex) && config.oceanColorsHex.length >= 4)
              ? config.oceanColorsHex
              : (OCEAN_PALETTES[palKey] || OCEAN_PALETTES.gemini);
            const c1 = hexToRgbNorm(palColors[0]);
            const c2 = hexToRgbNorm(palColors[1]);
            const c3 = hexToRgbNorm(palColors[2]);
            const c4 = hexToRgbNorm(palColors[3]);

            let speedMult = 1.0;
            if (config.oceanPreset === 'idle') speedMult = 0.6;
            else if (config.oceanPreset === 'thinking') speedMult = 1.6;

            this.gl.useProgram(this.program);
            this.gl.uniform2f(this.uniformLocs.u_resolution, w, h);
            this.gl.uniform1f(this.uniformLocs.u_time, this.simTime);
            this.gl.uniform2f(this.uniformLocs.u_mouse, this.mouse.x, this.mouse.y);
            this.gl.uniform1f(this.uniformLocs.u_intensity, this.currentIntensity);
            this.gl.uniform1f(this.uniformLocs.u_voiceLevel, this.voiceLevel);
            this.gl.uniform1f(this.uniformLocs.u_gridDensity, config.oceanDensity || 48.0);
            this.gl.uniform1f(this.uniformLocs.u_starSharpness, config.oceanSharpness || 0.54);
            this.gl.uniform1f(this.uniformLocs.u_gridAngle, 0.785398); // 45 deg
            this.gl.uniform1f(this.uniformLocs.u_swellSpeed, (config.oceanSpeed || 0.62) * speedMult);
            this.gl.uniform1f(this.uniformLocs.u_rippleForce, config.oceanRippleForce || 0.95);
            this.gl.uniform1f(this.uniformLocs.u_parallax, 0.024);
            this.gl.uniform1i(this.uniformLocs.u_shapeType, config.oceanShape || 0);
            this.gl.uniform1f(this.uniformLocs.u_morphEnabled, config.oceanMorphEnabled ? 1.0 : 0.0);
            this.gl.uniform1f(this.uniformLocs.u_emblemEnabled, config.oceanEmblemEnabled ? 1.0 : 0.0);
            this.gl.uniform1f(this.uniformLocs.u_emblemScale, config.oceanEmblemScale || 1.0);
            this.gl.uniform3f(this.uniformLocs.u_col1, c1[0], c1[1], c1[2]);
            this.gl.uniform3f(this.uniformLocs.u_col2, c2[0], c2[1], c2[2]);
            this.gl.uniform3f(this.uniformLocs.u_col3, c3[0], c3[1], c3[2]);
            this.gl.uniform3f(this.uniformLocs.u_col4, c4[0], c4[1], c4[2]);
            this.gl.uniform1f(this.uniformLocs.u_colorSpread, config.oceanColorSpread || 1.0);

            for (let i = 0; i < 8; i++) {
              const rp = this.ripples[i];
              this.gl.uniform4f(this.uniformLocs.u_ripples[i], rp[0], rp[1], rp[2], rp[3]);
            }

            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
          } catch (renderErr) {
            console.warn('[AgOceanEngine] render exception:', renderErr);
          }
          this.animId = requestAnimationFrame(render);
        };
        this.animId = requestAnimationFrame(render);
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
    }

    const oceanEngine = new AgOceanEngine(ensureOceanMount());

    // 动态监听 DOM 树变化（如新建会话与已有会话切换），自适应将海洋画布与商标迁移至活动容器
    const oceanDomObserver = new MutationObserver(() => {
      if (config.mode === 'ocean') {
        const target = getOceanMountTarget();
        if (target && oceanCanvas && oceanCanvas.parentElement !== target) {
          ensureOceanMount();
          ensureEmblemMount();
        }
      }
    });
    oceanDomObserver.observe(document.body, { childList: true, subtree: true });

    // 4 模态系统状态调度器 (原生UI + 3美化模态：晶格海洋 / 流体极光 / 自定义素材)
    function applyMode(modeKey, customUrl = '') {
      config.mode = modeKey;
      document.body.setAttribute('data-ag-mode', modeKey);

      // 彻底停止并回收所有活跃动画循环与视频，杜绝后台空转卡顿
      if (shaderAnimFrame) {
        cancelAnimationFrame(shaderAnimFrame);
        shaderAnimFrame = null;
      }
      if (stageCanvas) stageCanvas.style.display = 'none';

      if (oceanEngine) {
        oceanEngine.stop();
      }
      if (oceanCanvas) oceanCanvas.style.display = 'none';
      if (emblemWrapper) {
        emblemWrapper.style.display = 'none';
      }

      if (videoBg) {
        videoBg.pause();
        videoBg.style.display = 'none';
      }
      document.body.style.backgroundImage = 'none';

      if (modeKey === 'native') {
        // [模态 1: 纯净原生 UI] 左右中全原生黑白，不运行任何 Canvas/WebGL，零渲染负担
      } else if (modeKey === 'ocean') {
        // [模态 2: Gemini 晶格海洋] 严格中栏区域控制：左右两边原生深黑遮光，中栏独占通透
        if (oceanCanvas) oceanCanvas.style.display = 'block';
        if (oceanEngine) oceanEngine.start();
        ensureEmblemMount();
        if (emblemWrapper) {
          emblemWrapper.style.display = config.oceanEmblemEnabled ? 'flex' : 'none';
        }
      } else if (modeKey === 'aurora') {
        // [模态 3: 全景流体极光] 全屏通透极光
        if (stageCanvas) stageCanvas.style.display = 'block';
        initAuroraShader();
      } else if (modeKey === 'custom' && config.customAssetType === 'video') {
        // [模态 4: 自定义素材 - 动态视频]
        if (videoBg) {
          videoBg.style.display = 'block';
          videoBg.play().catch(() => {});
        }
      } else if (modeKey === 'custom' && customUrl) {
        // [模态 4: 自定义素材 - 自定义图片]
        document.body.style.backgroundImage = `url('${customUrl}')`;
      }

      applyCssVariables();
    }

    // 恢复图片或视频素材。素材正文放 IndexedDB，配置只记录类型和文件名。
    if (config.mode === 'custom') {
      loadAssetFromIndexedDB().then((savedBlob) => {
        if (config.mode !== 'custom') return;
        if (savedBlob && config.customAssetType === 'video') playVideoBlob(savedBlob);
        else if (savedBlob) {
          activeImageBlobUrl = URL.createObjectURL(savedBlob);
          applyMode('custom', activeImageBlobUrl);
        } else if (config.customAssetType === 'image' && config.customAssetUrl.startsWith('data:image/')) {
          // 兼容旧版保存在 localStorage 的图片，并迁移到 IndexedDB。
          const legacyUrl = config.customAssetUrl;
          fetch(legacyUrl).then(r => r.blob()).then(blob => saveAssetToIndexedDB(blob).then(() => {
            config.customAssetUrl = '';
            persistConfig();
          })).catch(() => {});
          applyMode('custom', legacyUrl);
        } else {
          throw new Error('数据库中没有找到已保存的素材');
        }
      }).catch((err) => {
        console.warn('[Theme] 恢复本地素材失败', err);
        config.mode = 'native';
        config.customAssetUrl = '';
        persistConfig();
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

        <!-- 核心视觉模态分段切换 (4 模态：原生UI + 3美化模态) -->
        <div class="ag-apple-segmented" style="margin-bottom: 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 3px;">
          <button class="ag-apple-segment-item ${config.mode === 'native' ? 'active' : ''}" id="ag-tab-native" style="padding: 4px 6px; font-size: 11px;">
            <span>原生 UI</span>
          </button>
          <button class="ag-apple-segment-item ${config.mode === 'ocean' ? 'active' : ''}" id="ag-tab-ocean" style="padding: 4px 6px; font-size: 11px;">
            <span>晶格海洋</span>
          </button>
          <button class="ag-apple-segment-item ${config.mode === 'aurora' ? 'active' : ''}" id="ag-tab-aurora" style="padding: 4px 6px; font-size: 11px;">
            <span>流体极光</span>
          </button>
          <button class="ag-apple-segment-item ${config.mode === 'custom' ? 'active' : ''}" id="ag-tab-custom" style="padding: 4px 6px; font-size: 11px;">
            <span>自定义素材</span>
          </button>
        </div>

        <!-- 模态 1：原生 UI 面板 -->
        <div id="ag-panel-native" class="ag-apple-card" style="display: ${config.mode === 'native' ? 'block' : 'none'};">
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.90); line-height: 1.6;">
            <div style="font-weight: 600; color: #ffffff; margin-bottom: 4px;">官方纯净原生 UI 模式</div>
            完全保留官方纯黑/纯白原生界面，已彻底关闭所有毛玻璃滤镜与背景图层，二三级菜单、Monaco 及审阅面板完全回归官方原生深色，零 GPU/CPU 渲染负担。
          </div>
        </div>

        <!-- 模态 2：Gemini 晶格海洋控制面板 (中栏区域控制独占) -->
        <div id="ag-panel-ocean" class="ag-apple-card" style="display: ${config.mode === 'ocean' ? 'block' : 'none'};">
          <div style="font-size: 11px; font-weight: 600; color: #ffffff; margin-bottom: 8px;">Gemini 晶格波纹海洋参数</div>

          <!-- 0. 居中无边框官方流光商标控制 (1:1 官方还原商标) -->
          <div style="margin-bottom: 10px; padding: 8px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 11px; font-weight: 600; color: #ffffff;">居中无边框流光商标</span>
              <button id="ag-btn-emblem-toggle" class="ag-apple-segment-item ${config.oceanEmblemEnabled ? 'active' : ''}" style="flex: 0 0 auto; padding: 2px 8px; font-size: 10px; border-radius: 6px;">
                <span id="ag-emblem-toggle-label">${config.oceanEmblemEnabled ? '✦ 已开启' : '🌑 已关闭'}</span>
              </button>
            </div>
            <!-- 4款官方商标切换 -->
            <div class="ag-apple-segmented" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 2px; margin-bottom: 6px;">
              <button class="ag-apple-segment-item ${config.oceanEmblemStyle === 'gemini' ? 'active' : ''}" id="ag-emblem-gemini" data-emblem="gemini" style="font-size: 10px; padding: 3px 0;">✦ Gemini</button>
              <button class="ag-apple-segment-item ${config.oceanEmblemStyle === 'antigravity' ? 'active' : ''}" id="ag-emblem-antigravity" data-emblem="antigravity" style="font-size: 10px; padding: 3px 0;">🚀 AG</button>
              <button class="ag-apple-segment-item ${config.oceanEmblemStyle === 'windows' ? 'active' : ''}" id="ag-emblem-windows" data-emblem="windows" style="font-size: 10px; padding: 3px 0;">⊞ Win</button>
              <button class="ag-apple-segment-item ${config.oceanEmblemStyle === 'apple' ? 'active' : ''}" id="ag-emblem-apple" data-emblem="apple" style="font-size: 10px; padding: 3px 0;"> Apple</button>
            </div>
            <!-- 商标缩放滑块 -->
            <div class="ag-apple-slider-row" style="margin: 4px 0;">
              <div class="ag-apple-slider-header">
                <span style="font-size: 10px; color: rgba(255, 255, 255, 0.75);">商标尺寸缩放</span>
                <span class="val" id="val-ocean-emblem-scale" style="font-size: 10px; color: #ffffff;">${(config.oceanEmblemScale || 1.0).toFixed(2)}x</span>
              </div>
              <input type="range" class="ag-apple-slider" id="slide-ocean-emblem-scale" min="50" max="200" value="${Math.round((config.oceanEmblemScale || 1.0) * 100)}" />
            </div>
            <!-- 商标色彩模式切换 (经典四色 vs 同步海洋色谱) -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
              <span style="font-size: 10px; color: rgba(255, 255, 255, 0.75);">商标流光色彩模式</span>
              <div class="ag-apple-segmented" style="padding: 2px;">
                <button class="ag-apple-segment-item ${config.oceanEmblemColorMode === 'classic' ? 'active' : ''}" id="ag-emblem-color-classic" style="font-size: 9px; padding: 2px 6px;">四色流光</button>
                <button class="ag-apple-segment-item ${config.oceanEmblemColorMode === 'sync' ? 'active' : ''}" id="ag-emblem-color-sync" style="font-size: 9px; padding: 2px 6px;">同步海洋</button>
              </div>
            </div>
          </div>

          <!-- 1. 形态切换 (6大形态) 与 动态形变开关 -->
          <div style="margin-bottom: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; color: rgba(255, 255, 255, 0.75);">晶格波纹形态</span>
              <button id="ag-btn-ocean-morph" class="ag-apple-segment-item ${config.oceanMorphEnabled ? 'active' : ''}" style="flex: 0 0 auto; padding: 1px 6px; font-size: 9px; border-radius: 4px;">
                <span id="ag-ocean-morph-label">${config.oceanMorphEnabled ? '动态波峰形变：开' : '动态波峰形变：关'}</span>
              </button>
            </div>
            <div class="ag-apple-segmented" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; padding: 2px;">
              <button class="ag-apple-segment-item ${config.oceanShape === 0 ? 'active' : ''}" id="ag-shape-0" data-shape="0" style="font-size: 10px; padding: 3px 0;">✦ 四芒星</button>
              <button class="ag-apple-segment-item ${config.oceanShape === 1 ? 'active' : ''}" id="ag-shape-1" data-shape="1" style="font-size: 10px; padding: 3px 0;">◆ 正菱形</button>
              <button class="ag-apple-segment-item ${config.oceanShape === 2 ? 'active' : ''}" id="ag-shape-2" data-shape="2" style="font-size: 10px; padding: 3px 0;">● 圆点阵</button>
              <button class="ag-apple-segment-item ${config.oceanShape === 3 ? 'active' : ''}" id="ag-shape-3" data-shape="3" style="font-size: 10px; padding: 3px 0;">⬡ 六边形</button>
              <button class="ag-apple-segment-item ${config.oceanShape === 4 ? 'active' : ''}" id="ag-shape-4" data-shape="4" style="font-size: 10px; padding: 3px 0;">✚ 十字星</button>
              <button class="ag-apple-segment-item ${config.oceanShape === 5 ? 'active' : ''}" id="ag-shape-5" data-shape="5" style="font-size: 10px; padding: 3px 0;">◎ 波纹环</button>
            </div>
          </div>

          <!-- 2. 预设色谱 (6大色谱) 与 4 节点自定义过渡色拾色器 -->
          <div style="margin-bottom: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; color: rgba(255, 255, 255, 0.75);">海洋光谱预设</span>
              <div style="display: flex; gap: 4px;">
                <button id="ag-btn-random-lut" type="button" style="padding: 1px 6px; font-size: 9px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #ffffff; cursor: pointer;" title="随机生成 4 色光谱">🎲 随机光谱</button>
                <button id="ag-btn-random-ripple" type="button" style="padding: 1px 6px; font-size: 9px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #38bdf8; cursor: pointer;" title="投掷石子发射冲击波">🌊 投石涟漪</button>
              </div>
            </div>
            <div class="ag-apple-segmented" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; padding: 2px; margin-bottom: 6px;">
              <button class="ag-apple-segment-item ${config.oceanPalette === 'gemini' ? 'active' : ''}" id="ag-pal-gemini" data-pal="gemini" style="font-size: 10px; padding: 3px 0;">🌌 经典极光</button>
              <button class="ag-apple-segment-item ${config.oceanPalette === 'argon' ? 'active' : ''}" id="ag-pal-argon" data-pal="argon" style="font-size: 10px; padding: 3px 0;">🌊 深海蓝青</button>
              <button class="ag-apple-segment-item ${config.oceanPalette === 'antigravity' ? 'active' : ''}" id="ag-pal-antigravity" data-pal="antigravity" style="font-size: 10px; padding: 3px 0;">🚀 星云紫金</button>
              <button class="ag-apple-segment-item ${config.oceanPalette === 'emerald' ? 'active' : ''}" id="ag-pal-emerald" data-pal="emerald" style="font-size: 10px; padding: 3px 0;">🌿 赛博翡翠</button>
              <button class="ag-apple-segment-item ${config.oceanPalette === 'miku' ? 'active' : ''}" id="ag-pal-miku" data-pal="miku" style="font-size: 10px; padding: 3px 0;">🎵 初音苍绿</button>
              <button class="ag-apple-segment-item ${config.oceanPalette === 'sunset' ? 'active' : ''}" id="ag-pal-sunset" data-pal="sunset" style="font-size: 10px; padding: 3px 0;">🌅 落日熔金</button>
            </div>
            <!-- 4 节点过渡色拾色器与渐变条 -->
            <div style="padding: 6px 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;">
              <div id="ag-ocean-lut-preview" style="width: 100%; height: 8px; border-radius: 4px; margin-bottom: 6px; background: linear-gradient(to right, ${config.oceanColorsHex[0]}, ${config.oceanColorsHex[1]}, ${config.oceanColorsHex[2]}, ${config.oceanColorsHex[3]}); border: 1px solid rgba(255,255,255,0.15);"></div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                <input type="color" id="ag-ocean-color-0" value="${config.oceanColorsHex[0]}" style="width: 22%; height: 20px; border: none; border-radius: 4px; background: transparent; cursor: pointer;" title="Stop 1" />
                <input type="color" id="ag-ocean-color-1" value="${config.oceanColorsHex[1]}" style="width: 22%; height: 20px; border: none; border-radius: 4px; background: transparent; cursor: pointer;" title="Stop 2" />
                <input type="color" id="ag-ocean-color-2" value="${config.oceanColorsHex[2]}" style="width: 22%; height: 20px; border: none; border-radius: 4px; background: transparent; cursor: pointer;" title="Stop 3" />
                <input type="color" id="ag-ocean-color-3" value="${config.oceanColorsHex[3]}" style="width: 22%; height: 20px; border: none; border-radius: 4px; background: transparent; cursor: pointer;" title="Stop 4" />
              </div>
            </div>
          </div>

          <!-- 3. 参数滑块 -->
          <div class="ag-apple-slider-row">
            <div class="ag-apple-slider-header">
              <span style="font-size: 11px; color: #ffffff;">海洋流速</span>
              <span class="val" id="val-ocean-speed" style="color: #ffffff;">${((config.oceanSpeed || 0.62) * 10).toFixed(0)}</span>
            </div>
            <input type="range" class="ag-apple-slider" id="slide-ocean-speed" min="1" max="20" value="${Math.round((config.oceanSpeed || 0.62) * 10)}" />
          </div>

          <div class="ag-apple-slider-row">
            <div class="ag-apple-slider-header">
              <span style="font-size: 11px; color: #ffffff;">晶格密度</span>
              <span class="val" id="val-ocean-density" style="color: #ffffff;">${Math.round(config.oceanDensity || 48)}</span>
            </div>
            <input type="range" class="ag-apple-slider" id="slide-ocean-density" min="24" max="72" value="${Math.round(config.oceanDensity || 48)}" />
          </div>

          <div class="ag-apple-slider-row">
            <div class="ag-apple-slider-header">
              <span style="font-size: 11px; color: #ffffff;">星芒锐度</span>
              <span class="val" id="val-ocean-sharpness" style="color: #ffffff;">${(config.oceanSharpness || 0.54).toFixed(2)}</span>
            </div>
            <input type="range" class="ag-apple-slider" id="slide-ocean-sharpness" min="20" max="80" value="${Math.round((config.oceanSharpness || 0.54) * 100)}" />
          </div>

          <div class="ag-apple-slider-row">
            <div class="ag-apple-slider-header">
              <span style="font-size: 11px; color: #ffffff;">涟漪冲击力</span>
              <span class="val" id="val-ocean-ripple" style="color: #ffffff;">${(config.oceanRippleForce || 0.95).toFixed(2)}</span>
            </div>
            <input type="range" class="ag-apple-slider" id="slide-ocean-ripple" min="20" max="200" value="${Math.round((config.oceanRippleForce || 0.95) * 100)}" />
          </div>

          <div class="ag-apple-slider-row">
            <div class="ag-apple-slider-header">
              <span style="font-size: 11px; color: #ffffff;">色彩扩散度</span>
              <span class="val" id="val-ocean-spread" style="color: #ffffff;">${(config.oceanColorSpread || 1.0).toFixed(2)}</span>
            </div>
            <input type="range" class="ag-apple-slider" id="slide-ocean-spread" min="40" max="200" value="${Math.round((config.oceanColorSpread || 1.0) * 100)}" />
          </div>

          <!-- 4. 动画动态预设快捷按键 -->
          <div style="margin-top: 8px; margin-bottom: 8px;">
            <div style="font-size: 10px; color: rgba(255, 255, 255, 0.75); margin-bottom: 4px;">动态情境预设</div>
            <div class="ag-apple-segmented" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 2px;">
              <button class="ag-apple-segment-item ${config.oceanPreset === 'idle' ? 'active' : ''}" id="ag-state-idle" data-state="idle" style="font-size: 9px; padding: 3px 0;">🌊 静默</button>
              <button class="ag-apple-segment-item ${config.oceanPreset === 'focus' ? 'active' : ''}" id="ag-state-focus" data-state="focus" style="font-size: 9px; padding: 3px 0;">✨ 聚焦</button>
              <button class="ag-apple-segment-item ${config.oceanPreset === 'thinking' ? 'active' : ''}" id="ag-state-thinking" data-state="thinking" style="font-size: 9px; padding: 3px 0;">🚀 涌浪</button>
              <button class="ag-apple-segment-item ${config.oceanPreset === 'voice' ? 'active' : ''}" id="ag-state-voice" data-state="voice" style="font-size: 9px; padding: 3px 0;">🎙️ 声浪</button>
            </div>
          </div>

          <!-- 5. 交互波纹声效开关 -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <span style="font-size: 11px; color: #ffffff;">交互水波声效反馈</span>
            <button id="ag-btn-ocean-audio" class="ag-apple-segment-item ${config.oceanAudio ? 'active' : ''}" style="flex: 0 0 auto; padding: 3px 10px; font-size: 10px; border-radius: 6px;">
              <span id="ag-ocean-audio-icon">${config.oceanAudio ? '🔊 已开启' : '🔇 已静音'}</span>
            </button>
          </div>

          <div style="font-size: 9px; color: rgba(255, 255, 255, 0.60); margin-top: 6px;">
            ✦ 区域控制：晶格海洋仅在中栏主视口独占，左右两侧原生深黑遮光，对话文本置于上层。
          </div>
        </div>

        <!-- 模态 3：流体极光控制面板 -->
        <div id="ag-panel-aurora" class="ag-apple-card" style="display: ${config.mode === 'aurora' ? 'block' : 'none'};">
          <div class="ag-apple-slider-header" style="margin-bottom: 6px;">
            <span style="font-weight: 500; color: #ffffff;">极光流动速率</span>
            <span class="val" id="val-aurora-speed" style="color: #ffffff;">${config.auroraSpeed.toFixed(1)}x</span>
          </div>
          <input type="range" class="ag-apple-slider" id="slide-aurora-speed" min="2" max="25" value="${Math.round(config.auroraSpeed * 10)}" />
        </div>

        <!-- 模态 4：自定义素材拖拽与导入面板 -->
        <div id="ag-panel-custom" class="ag-apple-card" style="display: ${config.mode === 'custom' ? 'block' : 'none'}; cursor: pointer;">
          <input type="file" id="ag-file-input" accept="image/*,video/mp4,video/*" style="display: none;" />
          <div id="ag-dropzone" style="text-align: center; padding: 6px 0;">
            <div style="font-size: 12px; color: #ffffff; font-weight: 500;">
              点击选择素材 或拖拽图片/视频至此
            </div>
            <div style="font-size: 10px; color: rgba(255, 255, 255, 0.75); margin-top: 3px;">
              JPG / PNG / WebP 图片 或 MP4 动态视频 (全屏循环铺满)
            </div>
          </div>
          <button id="ag-clear-asset" type="button" style="width: 100%; margin-top: 6px; padding: 5px 8px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.10); border-radius: 8px; color: rgba(255,255,255,.88); font-size: 10px; cursor: pointer;">清除已保存素材</button>
        </div>

        <!-- 毛玻璃与透视专属控制容器 (仅在 流体极光 aurora 与 自定义素材 custom 下展示) -->
        <div id="ag-frosted-controls" style="display: ${(config.mode === 'aurora' || config.mode === 'custom') ? 'block' : 'none'};">
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
                <input type="range" class="ag-apple-slider" id="slide-global-opacity" min="0" max="100" step="1" value="${Math.round(config.globalOpacity * 100)}" />
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
                <input type="range" class="ag-apple-slider" id="slide-left-opacity" min="0" max="100" step="1" value="${Math.round(config.leftOpacity * 100)}" />
              </div>

              <div class="ag-apple-slider-row">
                <div class="ag-apple-slider-header">
                  <span style="color: #ffffff;">中栏对话与设置 (Chat & Modal)</span>
                  <span class="val" id="val-center-opacity" style="color: #ffffff;">${Math.round(config.centerOpacity * 100)}%</span>
                </div>
                <input type="range" class="ag-apple-slider" id="slide-center-opacity" min="0" max="100" step="1" value="${Math.round(config.centerOpacity * 100)}" />
              </div>

              <div class="ag-apple-slider-row">
                <div class="ag-apple-slider-header">
                  <span style="color: #ffffff;">右栏审阅与工作区 (Review & Terminal)</span>
                  <span class="val" id="val-right-opacity" style="color: #ffffff;">${Math.round(config.rightOpacity * 100)}%</span>
                </div>
                <input type="range" class="ag-apple-slider" id="slide-right-opacity" min="0" max="100" step="1" value="${Math.round(config.rightOpacity * 100)}" />
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

        <!-- 全局桌面伴侣快捷入口 -->
        <div style="margin-top: 8px;">
          <button id="ag-btn-launch-pet" style="width: 100%; padding: 7px 10px; background: rgba(10, 132, 255, 0.20); border: 1px solid rgba(10, 132, 255, 0.40); border-radius: 8px; color: #ffffff; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>🐱 全局桌面伴侣已就绪 (双击 start_pet.bat 运行)</span>
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

    function syncModalView() {
      const mode = config.mode || 'native';
      ['native', 'ocean', 'aurora', 'custom'].forEach(k => {
        const tabEl = document.getElementById('ag-tab-' + k);
        const panEl = document.getElementById('ag-panel-' + k);
        if (tabEl) tabEl.classList.toggle('active', k === mode);
        if (panEl) panEl.style.display = (k === mode) ? 'block' : 'none';
      });
      const frostedControls = document.getElementById('ag-frosted-controls');
      if (frostedControls) {
        frostedControls.style.display = (mode === 'aurora' || mode === 'custom') ? 'block' : 'none';
      }
      if (mode === 'ocean' && typeof syncOceanPanelControls === 'function') {
        syncOceanPanelControls();
      }
    }

    // 控制台展开/收起切换
    function togglePanel() {
      const isVisible = modal.style.display === 'block';
      modal.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        syncModalView();
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
        persistConfig();
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

    // 8. 模式切换分段器 (4 模态系统：原生UI + 3美化模态)
    const tabNative = document.getElementById('ag-tab-native');
    const tabOcean = document.getElementById('ag-tab-ocean');
    const tabAurora = document.getElementById('ag-tab-aurora');
    const tabCustom = document.getElementById('ag-tab-custom');

    const panelNative = document.getElementById('ag-panel-native');
    const panelOcean = document.getElementById('ag-panel-ocean');
    const panelAurora = document.getElementById('ag-panel-aurora');
    const panelCustom = document.getElementById('ag-panel-custom');

    function switchModeTabs(activeTab, activePanel, modeKey) {
      [tabNative, tabOcean, tabAurora, tabCustom].forEach(t => t && t.classList.remove('active'));
      [panelNative, panelOcean, panelAurora, panelCustom].forEach(p => p && (p.style.display = 'none'));
      if (activeTab) activeTab.classList.add('active');
      if (activePanel) activePanel.style.display = 'block';

      // 关键隔离：只有 aurora 和 custom 模式才展示质感风格、透底模糊与色盘设置
      const frostedControls = document.getElementById('ag-frosted-controls');
      if (frostedControls) {
        frostedControls.style.display = (modeKey === 'aurora' || modeKey === 'custom') ? 'block' : 'none';
      }

      applyMode(modeKey, config.customAssetUrl);
      if (modeKey === 'ocean' && typeof syncOceanPanelControls === 'function') {
        syncOceanPanelControls();
      }
      try { persistConfig(); } catch (e) {}
    }

    if (tabNative) {
      tabNative.onclick = () => {
        switchModeTabs(tabNative, panelNative, 'native');
        showToast('已切换至纯净原生 UI 模式');
      };
    }

    if (tabOcean) {
      tabOcean.onclick = () => {
        switchModeTabs(tabOcean, panelOcean, 'ocean');
        showToast('已切换至 Gemini 晶格海洋 (中栏区域控制)');
      };
    }

    if (tabAurora) {
      tabAurora.onclick = () => {
        switchModeTabs(tabAurora, panelAurora, 'aurora');
        showToast('已切换至全景极光流体模式');
      };
    }

    if (tabCustom) {
      tabCustom.onclick = () => {
        switchModeTabs(tabCustom, panelCustom, 'custom');
        showToast('已切换至自定义素材底图模式');
      };
    }

    // 8.0 居中无边框流光商标交互绑定
    const btnEmblemToggle = document.getElementById('ag-btn-emblem-toggle');
    const labelEmblemToggle = document.getElementById('ag-emblem-toggle-label');
    if (btnEmblemToggle) {
      btnEmblemToggle.onclick = () => {
        config.oceanEmblemEnabled = !config.oceanEmblemEnabled;
        btnEmblemToggle.classList.toggle('active', config.oceanEmblemEnabled);
        if (labelEmblemToggle) labelEmblemToggle.textContent = config.oceanEmblemEnabled ? '✦ 已开启' : '🌑 已关闭';
        if (emblemWrapper) emblemWrapper.style.display = config.oceanEmblemEnabled ? 'flex' : 'none';
        if (config.oceanEmblemEnabled) {
          ensureEmblemMount();
          if (oceanEngine) oceanEngine.spawnRipple(0.5, 0.60, 1.4);
          playRippleSynth(580, false);
        }
        try { persistConfig(); } catch (e) {}
        showToast(config.oceanEmblemEnabled ? '已开启居中无边框流光商标' : '已关闭居中流光商标');
      };
    }

    const emblemStyleKeys = ['gemini', 'antigravity', 'windows', 'apple'];
    const emblemStyleNames = {
      gemini: '✦ Gemini',
      antigravity: '🚀 Antigravity',
      windows: '⊞ Windows',
      apple: ' Apple'
    };
    emblemStyleKeys.forEach(k => {
      const btn = document.getElementById(`ag-emblem-${k}`);
      if (btn) {
        btn.onclick = () => {
          config.oceanEmblemStyle = k;
          config.oceanEmblemEnabled = true;
          if (btnEmblemToggle) btnEmblemToggle.classList.add('active');
          if (labelEmblemToggle) labelEmblemToggle.textContent = '✦ 已开启';
          emblemStyleKeys.forEach(j => {
            const b = document.getElementById(`ag-emblem-${j}`);
            if (b) b.classList.toggle('active', j === k);
          });
          ensureEmblemMount();
          if (emblemWrapper) emblemWrapper.style.display = 'flex';
          updateEmblemSvg();
          if (oceanEngine) oceanEngine.spawnRipple(0.5, 0.60, 1.45);
          playRippleSynth(600, false);
          try { persistConfig(); } catch (e) {}
          showToast(`流光商标已切换为 1:1 官方 ${emblemStyleNames[k]}`);
        };
      }
    });

    const slideOceanEmblemScale = document.getElementById('slide-ocean-emblem-scale');
    if (slideOceanEmblemScale) {
      slideOceanEmblemScale.oninput = (e) => {
        config.oceanEmblemScale = parseInt(e.target.value) / 100;
        const valEl = document.getElementById('val-ocean-emblem-scale');
        if (valEl) valEl.textContent = `${config.oceanEmblemScale.toFixed(2)}x`;
        updateEmblemSvg();
        try { persistConfig(); } catch (err) {}
      };
    }

    const btnEmblemColorClassic = document.getElementById('ag-emblem-color-classic');
    const btnEmblemColorSync = document.getElementById('ag-emblem-color-sync');
    if (btnEmblemColorClassic && btnEmblemColorSync) {
      btnEmblemColorClassic.onclick = () => {
        config.oceanEmblemColorMode = 'classic';
        btnEmblemColorClassic.classList.add('active');
        btnEmblemColorSync.classList.remove('active');
        updateEmblemSvg();
        try { persistConfig(); } catch (e) {}
        showToast('商标色彩：经典四色流光');
      };
      btnEmblemColorSync.onclick = () => {
        config.oceanEmblemColorMode = 'sync';
        btnEmblemColorSync.classList.add('active');
        btnEmblemColorClassic.classList.remove('active');
        updateEmblemSvg();
        try { persistConfig(); } catch (e) {}
        showToast('商标色彩：同步海洋色谱');
      };
    }

    // 8.01 动态波峰形变开关
    const btnOceanMorph = document.getElementById('ag-btn-ocean-morph');
    const labelOceanMorph = document.getElementById('ag-ocean-morph-label');
    if (btnOceanMorph) {
      btnOceanMorph.onclick = () => {
        config.oceanMorphEnabled = !config.oceanMorphEnabled;
        btnOceanMorph.classList.toggle('active', config.oceanMorphEnabled);
        if (labelOceanMorph) labelOceanMorph.textContent = config.oceanMorphEnabled ? '动态波峰形变：开' : '动态波峰形变：关';
        try { persistConfig(); } catch (e) {}
        showToast(config.oceanMorphEnabled ? '已开启动态波峰形变（平滑形变）' : '已固定静态晶格形态');
      };
    }

    // 8.02 4 节点自定义过渡色与渐变条同步
    function updateLutPreview() {
      const preview = document.getElementById('ag-ocean-lut-preview');
      if (preview && Array.isArray(config.oceanColorsHex) && config.oceanColorsHex.length >= 4) {
        preview.style.background = `linear-gradient(to right, ${config.oceanColorsHex[0]}, ${config.oceanColorsHex[1]}, ${config.oceanColorsHex[2]}, ${config.oceanColorsHex[3]})`;
      }
      for (let i = 0; i < 4; i++) {
        const inp = document.getElementById(`ag-ocean-color-${i}`);
        if (inp && config.oceanColorsHex[i]) inp.value = config.oceanColorsHex[i];
      }
      if (config.oceanEmblemColorMode === 'sync') updateEmblemSvg();
    }

    for (let i = 0; i < 4; i++) {
      const inp = document.getElementById(`ag-ocean-color-${i}`);
      if (inp) {
        inp.oninput = (e) => {
          config.oceanColorsHex[i] = e.target.value;
          config.oceanPalette = 'custom';
          Object.keys(palNames).forEach(j => {
            const b = document.getElementById(`ag-pal-${j}`);
            if (b) b.classList.remove('active');
          });
          updateLutPreview();
          try { persistConfig(); } catch (err) {}
        };
      }
    }

    // 8.03 🎲 随机光谱生成
    const btnRandomLut = document.getElementById('ag-btn-random-lut');
    if (btnRandomLut) {
      btnRandomLut.onclick = () => {
        const hBase = Math.floor(Math.random() * 360);
        const randColors = [
          rgbToHex(...hslToRgb(hBase, 90, 56)),
          rgbToHex(...hslToRgb((hBase + 45 + Math.floor(Math.random() * 40)) % 360, 95, 52)),
          rgbToHex(...hslToRgb((hBase + 120 + Math.floor(Math.random() * 60)) % 360, 90, 58)),
          rgbToHex(...hslToRgb((hBase + 200 + Math.floor(Math.random() * 80)) % 360, 95, 60))
        ];
        config.oceanColorsHex = randColors;
        config.oceanPalette = 'custom';
        Object.keys(palNames).forEach(j => {
          const b = document.getElementById(`ag-pal-${j}`);
          if (b) b.classList.remove('active');
        });
        updateLutPreview();
        if (oceanEngine) oceanEngine.spawnRipple(0.5, 0.45, 1.35);
        playRippleSynth(620, false);
        try { persistConfig(); } catch (err) {}
        showToast('已生成随机光谱！');
      };
    }

    // 8.04 🌊 投石激起波纹
    const btnRandomRipple = document.getElementById('ag-btn-random-ripple');
    if (btnRandomRipple) {
      btnRandomRipple.onclick = () => {
        const nx = 0.2 + Math.random() * 0.6;
        const ny = 0.25 + Math.random() * 0.5;
        if (oceanEngine) oceanEngine.spawnRipple(nx, ny, 1.4);
        playRippleSynth(480 + Math.round(nx * 300), false);
        showToast('🌊 投掷石子激起涟漪与水波回响');
      };
    }

    // 8.1 晶格海洋形态切换 (6大形态: 0=四芒星, 1=正菱形, 2=圆点, 3=六边形, 4=十字星, 5=波纹环)
    const shapeNames = ['✦ 四芒星', '◆ 正菱形', '● 圆点阵', '⬡ 六边形', '✚ 十字星', '◎ 波纹环'];
    for (let i = 0; i < 6; i++) {
      const btn = document.getElementById(`ag-shape-${i}`);
      if (btn) {
        btn.onclick = () => {
          config.oceanShape = i;
          for (let j = 0; j < 6; j++) {
            const b = document.getElementById(`ag-shape-${j}`);
            if (b) b.classList.toggle('active', j === i);
          }
          try { persistConfig(); } catch (e) {}
          showToast(`晶格形态：${shapeNames[i]}`);
        };
      }
    }

    // 8.2 海洋光谱预设切换 (6大光谱预设)
    const palNames = {
      gemini: '🌌 经典极光',
      argon: '🌊 深海蓝青',
      antigravity: '🚀 星云紫金',
      emerald: '🌿 赛博翡翠',
      miku: '🎵 初音苍绿',
      sunset: '🌅 落日熔金'
    };
    Object.keys(palNames).forEach(k => {
      const btn = document.getElementById(`ag-pal-${k}`);
      if (btn) {
        btn.onclick = () => {
          config.oceanPalette = k;
          if (OCEAN_PALETTES[k]) {
            config.oceanColorsHex = [...OCEAN_PALETTES[k]];
            updateLutPreview();
          }
          Object.keys(palNames).forEach(j => {
            const b = document.getElementById(`ag-pal-${j}`);
            if (b) b.classList.toggle('active', j === k);
          });
          try { persistConfig(); } catch (e) {}
          showToast(`海洋光谱：${palNames[k]}`);
        };
      }
    });

    // 8.3 晶格海洋实时参数滑块绑定
    const slideOceanSpeed = document.getElementById('slide-ocean-speed');
    if (slideOceanSpeed) {
      slideOceanSpeed.oninput = (e) => {
        config.oceanSpeed = parseInt(e.target.value) / 10;
        const valEl = document.getElementById('val-ocean-speed');
        if (valEl) valEl.textContent = (config.oceanSpeed * 10).toFixed(0);
        try { persistConfig(); } catch (err) {}
      };
    }

    const slideOceanDensity = document.getElementById('slide-ocean-density');
    if (slideOceanDensity) {
      slideOceanDensity.oninput = (e) => {
        config.oceanDensity = parseInt(e.target.value);
        const valEl = document.getElementById('val-ocean-density');
        if (valEl) valEl.textContent = config.oceanDensity;
        try { persistConfig(); } catch (err) {}
      };
    }

    const slideOceanSharpness = document.getElementById('slide-ocean-sharpness');
    if (slideOceanSharpness) {
      slideOceanSharpness.oninput = (e) => {
        config.oceanSharpness = parseInt(e.target.value) / 100;
        const valEl = document.getElementById('val-ocean-sharpness');
        if (valEl) valEl.textContent = config.oceanSharpness.toFixed(2);
        try { persistConfig(); } catch (err) {}
      };
    }

    const slideOceanRipple = document.getElementById('slide-ocean-ripple');
    if (slideOceanRipple) {
      slideOceanRipple.oninput = (e) => {
        config.oceanRippleForce = parseInt(e.target.value) / 100;
        const valEl = document.getElementById('val-ocean-ripple');
        if (valEl) valEl.textContent = config.oceanRippleForce.toFixed(2);
        try { persistConfig(); } catch (err) {}
      };
    }

    const slideOceanSpread = document.getElementById('slide-ocean-spread');
    if (slideOceanSpread) {
      slideOceanSpread.oninput = (e) => {
        config.oceanColorSpread = parseInt(e.target.value) / 100;
        const valEl = document.getElementById('val-ocean-spread');
        if (valEl) valEl.textContent = config.oceanColorSpread.toFixed(2);
        try { persistConfig(); } catch (err) {}
      };
    }

    // 8.4 动态情境预设切换
    ['idle', 'focus', 'thinking', 'voice'].forEach(st => {
      const btn = document.getElementById(`ag-state-${st}`);
      if (btn) {
        btn.onclick = () => {
          ['idle', 'focus', 'thinking', 'voice'].forEach(s => {
            const b = document.getElementById(`ag-state-${s}`);
            if (b) b.classList.toggle('active', s === st);
          });
          if (oceanEngine) oceanEngine.setStatePreset(st);
          showToast(`动态情境：${st}`);
        };
      }
    });

    // 8.5 交互水波声效反馈切换
    const btnOceanAudio = document.getElementById('ag-btn-ocean-audio');
    const iconOceanAudio = document.getElementById('ag-ocean-audio-icon');
    if (btnOceanAudio) {
      btnOceanAudio.onclick = () => {
        config.oceanAudio = !config.oceanAudio;
        btnOceanAudio.classList.toggle('active', config.oceanAudio);
        if (iconOceanAudio) iconOceanAudio.textContent = config.oceanAudio ? '🔊 已开启' : '🔇 已静音';
        if (config.oceanAudio) playRippleSynth(540, false);
        try { persistConfig(); } catch (e) {}
        showToast(config.oceanAudio ? '已开启水波交互声效反馈' : '已静音水波交互声效');
      };
    }

    // 8.6 晶格海洋参数与交互面板全量状态双向同步
    function syncOceanPanelControls() {
      // 1. 居中流光商标状态
      const btnEmblemToggle = document.getElementById('ag-btn-emblem-toggle');
      const labelEmblemToggle = document.getElementById('ag-emblem-toggle-label');
      if (btnEmblemToggle) btnEmblemToggle.classList.toggle('active', !!config.oceanEmblemEnabled);
      if (labelEmblemToggle) labelEmblemToggle.textContent = config.oceanEmblemEnabled ? '✦ 已开启' : '🌑 已关闭';

      emblemStyleKeys.forEach(k => {
        const b = document.getElementById(`ag-emblem-${k}`);
        if (b) b.classList.toggle('active', k === config.oceanEmblemStyle);
      });

      const slideOceanEmblemScale = document.getElementById('slide-ocean-emblem-scale');
      const valOceanEmblemScale = document.getElementById('val-ocean-emblem-scale');
      if (slideOceanEmblemScale) slideOceanEmblemScale.value = Math.round((config.oceanEmblemScale || 1.0) * 100);
      if (valOceanEmblemScale) valOceanEmblemScale.textContent = `${(config.oceanEmblemScale || 1.0).toFixed(2)}x`;

      const btnEmblemColorClassic = document.getElementById('ag-emblem-color-classic');
      const btnEmblemColorSync = document.getElementById('ag-emblem-color-sync');
      if (btnEmblemColorClassic) btnEmblemColorClassic.classList.toggle('active', config.oceanEmblemColorMode === 'classic');
      if (btnEmblemColorSync) btnEmblemColorSync.classList.toggle('active', config.oceanEmblemColorMode === 'sync');

      // 2. 动态波峰形变开关
      const btnOceanMorph = document.getElementById('ag-btn-ocean-morph');
      const labelOceanMorph = document.getElementById('ag-ocean-morph-label');
      if (btnOceanMorph) btnOceanMorph.classList.toggle('active', !!config.oceanMorphEnabled);
      if (labelOceanMorph) labelOceanMorph.textContent = config.oceanMorphEnabled ? '动态波峰形变：开' : '动态波峰形变：关';

      // 3. 6大形态按钮
      for (let i = 0; i < 6; i++) {
        const b = document.getElementById(`ag-shape-${i}`);
        if (b) b.classList.toggle('active', i === (config.oceanShape || 0));
      }

      // 4. 6大预设光谱按钮
      Object.keys(palNames).forEach(k => {
        const b = document.getElementById(`ag-pal-${k}`);
        if (b) b.classList.toggle('active', k === config.oceanPalette);
      });

      // 5. 4 节点过渡色拾色器与渐变条
      updateLutPreview();

      // 6. 5 维实时参数滑块
      const slideOceanSpeed = document.getElementById('slide-ocean-speed');
      const valOceanSpeed = document.getElementById('val-ocean-speed');
      if (slideOceanSpeed) slideOceanSpeed.value = Math.round((config.oceanSpeed || 0.62) * 10);
      if (valOceanSpeed) valOceanSpeed.textContent = ((config.oceanSpeed || 0.62) * 10).toFixed(0);

      const slideOceanDensity = document.getElementById('slide-ocean-density');
      const valOceanDensity = document.getElementById('val-ocean-density');
      if (slideOceanDensity) slideOceanDensity.value = Math.round(config.oceanDensity || 48);
      if (valOceanDensity) valOceanDensity.textContent = Math.round(config.oceanDensity || 48);

      const slideOceanSharpness = document.getElementById('slide-ocean-sharpness');
      const valOceanSharpness = document.getElementById('val-ocean-sharpness');
      if (slideOceanSharpness) slideOceanSharpness.value = Math.round((config.oceanSharpness || 0.54) * 100);
      if (valOceanSharpness) valOceanSharpness.textContent = (config.oceanSharpness || 0.54).toFixed(2);

      const slideOceanRipple = document.getElementById('slide-ocean-ripple');
      const valOceanRipple = document.getElementById('val-ocean-ripple');
      if (slideOceanRipple) slideOceanRipple.value = Math.round((config.oceanRippleForce || 0.95) * 100);
      if (valOceanRipple) valOceanRipple.textContent = (config.oceanRippleForce || 0.95).toFixed(2);

      const slideOceanSpread = document.getElementById('slide-ocean-spread');
      const valOceanSpread = document.getElementById('val-ocean-spread');
      if (slideOceanSpread) slideOceanSpread.value = Math.round((config.oceanColorSpread || 1.0) * 100);
      if (valOceanSpread) valOceanSpread.textContent = (config.oceanColorSpread || 1.0).toFixed(2);

      // 7. 动态情境预设切换
      ['idle', 'focus', 'thinking', 'voice'].forEach(s => {
        const b = document.getElementById(`ag-state-${s}`);
        if (b) b.classList.toggle('active', s === (config.oceanPreset || 'focus'));
      });

      // 8. 交互水波声效反馈
      const btnOceanAudio = document.getElementById('ag-btn-ocean-audio');
      const iconOceanAudio = document.getElementById('ag-ocean-audio-icon');
      if (btnOceanAudio) btnOceanAudio.classList.toggle('active', !!config.oceanAudio);
      if (iconOceanAudio) iconOceanAudio.textContent = config.oceanAudio ? '🔊 已开启' : '🔇 已静音';

      // 9. 商标 SVG 与比例更新
      updateEmblemSvg();
    }

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
      try { persistConfig(); } catch (e) {}
      showToast('已开启晶莹磨砂质感');
    };

    texPaperBtn.onclick = () => {
      config.textureStyle = 'paper';
      updateTextureUI();
      applyCssVariables();
      try { persistConfig(); } catch (e) {}
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
      try { persistConfig(); } catch (e) {}
      showToast('已切换至全局共享联动调节');
    };

    subtabSplit.onclick = () => {
      config.tuneMode = 'split';
      subtabSplit.classList.add('active');
      subtabGlobal.classList.remove('active');
      boxTuneSplit.style.display = 'block';
      boxTuneGlobal.style.display = 'none';
      applyCssVariables();
      try { persistConfig(); } catch (e) {}
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

    document.getElementById('ag-clear-asset').onclick = async (e) => {
      e.stopPropagation();
      try {
        if (window.__ag_theme_native_available || (window.nativeStorage && typeof window.nativeStorage.updateItems === 'function')) {
          await updateNativeStorage({ [NATIVE_ASSET_KEY]: null });
          window.__ag_native_asset_payload = null;
        }
        await clearAssetFromIndexedDB();
        if (activeVideoBlobUrl) { URL.revokeObjectURL(activeVideoBlobUrl); activeVideoBlobUrl = null; }
        if (activeImageBlobUrl) { URL.revokeObjectURL(activeImageBlobUrl); activeImageBlobUrl = null; }
        if (videoBg) { videoBg.pause(); videoBg.removeAttribute('src'); videoBg.load(); videoBg.style.display = 'none'; }
        config.mode = 'native';
        config.customAssetUrl = '';
        config.customAssetName = '';
        applyMode('native');
        if (tabNative) switchModeTabs(tabNative, panelNative, 'native');
        await persistConfigNow();
        showToast('已清除素材并恢复纯净原生 UI');
      } catch (err) { showToast(`清除失败：${err.message || '存储不可用'}`); }
    };

    function handleFile(file) {
      if (!file) return;
      const isVideo = file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mp4');
      if (!isVideo && !file.type.startsWith('image/')) { showToast('仅支持图片或视频文件'); return; }
      const previousConfig = Object.assign({}, config);
      config.customAssetType = isVideo ? 'video' : 'image';
      config.customAssetName = file.name;
      config.customAssetUrl = '';
      config.mode = 'custom';
      showToast(`正在保存素材 ${file.name}...`);
      persistAsset(file, isVideo ? 'video' : 'image', file.name).then(() => {
        if (isVideo) {
          if (activeImageBlobUrl) { URL.revokeObjectURL(activeImageBlobUrl); activeImageBlobUrl = null; }
          playVideoBlob(file);
        }
        else {
          if (activeImageBlobUrl) URL.revokeObjectURL(activeImageBlobUrl);
          if (activeVideoBlobUrl) { URL.revokeObjectURL(activeVideoBlobUrl); activeVideoBlobUrl = null; }
          activeImageBlobUrl = URL.createObjectURL(file);
          applyMode('custom', activeImageBlobUrl);
        }
        showToast(`${isVideo ? '视频' : '图片'}素材已保存，重启后会恢复`);
      }).catch((err) => {
        config = previousConfig;
        console.error('[Theme] 持久保存素材失败', err);
        showToast(`素材保存失败：${err.message || '存储不可用'}`);
      });
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
          persistConfig();
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
        persistConfig();
      } catch (e) {}
      applyCssVariables();
      updateTextureUI();
      setAccentColor(...config.accentRgb);
      document.getElementById('slide-global-opacity').value = Math.round(config.globalOpacity * 100);
      document.getElementById('val-global-opacity').textContent = `${Math.round(config.globalOpacity * 100)}%`;
      document.getElementById('slide-global-blur').value = config.globalBlur;
      document.getElementById('val-global-blur').textContent = `${config.globalBlur}px`;
      syncOceanPanelControls();
      applyMode(config.mode, config.customAssetUrl);
      showToast('已恢复 Apple 预设参数');
    };

    // 固化配置
    document.getElementById('ag-btn-save').onclick = () => {
      try {
        persistConfig();
        showToast('配置已固化保存！');
      } catch (e) {
        showToast('保存失败: ' + e.message);
      }
    };

    // 全局桌面伴侣启动提示
    const btnLaunchPet = document.getElementById('ag-btn-launch-pet');
    if (btnLaunchPet) {
      btnLaunchPet.onclick = () => {
        showToast('桌宠已就绪！可运行 start_pet.bat 启动全局桌面伴侣');
      };
    }

    // 暴露全局实例与对外桥接 API (供全局桌宠与外部控制调用)
    window.agVisualPanel = {
      oceanEngine: oceanEngine,
      syncOceanControls: syncOceanPanelControls,
      toggle: togglePanel,
      open: () => {
        modal.style.display = 'block';
        syncModalView();
        showMainView();
      },
      close: () => {
        modal.style.display = 'none';
      },
      isOpen: () => modal.style.display === 'block',
      getConfig: () => Object.assign({}, config),
      applyMode: applyMode,
      fetchQuota: async () => {
        try {
          const csrf = window.__APP_CONFIG__?.csrfToken || '';
          const resp = await fetch('/exa.language_server_pb.LanguageServerService/GetUserStatus', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-codeium-csrf-token': csrf
            },
            body: '{}'
          });
          const json = await resp.json();
          return json.userStatus || null;
        } catch (e) {
          return null;
        }
      }
    };

    // 初始化时立即激活当前配置模式，确保 ocean 引擎或 native 状态在冷启动时立即生效
    applyMode(config.mode, config.customAssetUrl);

    console.log('[Antigravity Apple Control Panel] Apple 极简纯净控制台已载入 (⌥T 可快速唤出)');
  } // end initAppleConsole

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppleConsole);
  } else {
    initAppleConsole();
  }
})();
