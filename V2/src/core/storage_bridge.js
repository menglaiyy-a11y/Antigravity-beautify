/**
 * Antigravity V2 - StorageBridge (双擎高容灾持久化存储引擎)
 * 职责：
 * 1. 采用 IndexedDB 异步存取大容量素材 (图片/视频)，彻底杜绝 localStorage 5MB 溢出导致丢失
 * 2. 采用 localStorage + 原生 storageAPI 双重镜像保存轻量配置 (0ms 首帧决策)
 * 3. 提供素材指纹管理、存储容量统计与安全一键缓存清理
 */

const DB_NAME = 'AntigravityThemeV2';
const DB_VERSION = 1;
const STORE_ASSETS = 'custom_assets';

export class StorageBridge {
  constructor() {
    this.CONFIG_KEY = 'ag_theme_v2_config';
    this.db = null;
    this.dbReadyPromise = this.initIndexedDB();

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
      customAssetType: 'image',
      customAssetId: null,
      activePetSkinId: 'skin_0_sunglasses',
      petAutoStart: false,
      floatingIconType: 'default' // 'default' (锁暝), 'skin', 'custom'
    };
  }

  /**
   * 初始化原生 IndexedDB 存储
   */
  initIndexedDB() {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_ASSETS)) {
            db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = () => {
          console.warn('[StorageBridge] IndexedDB 启动失败，降级回退。');
          resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    });
  }

  /**
   * 同步读取本地极速配置 (0ms 首帧决策)
   */
  readLocalConfig() {
    try {
      const raw = localStorage.getItem(this.CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Object.assign({}, this.defaultConfig, parsed);
      }
    } catch (e) {}
    return Object.assign({}, this.defaultConfig);
  }

  /**
   * 保存配置至本地与宿主持久层
   */
  saveConfig(config) {
    const merged = Object.assign({}, this.defaultConfig, config);
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(merged));
    } catch (e) {}

    // 通知 Electron 原生层持久化
    try {
      if (typeof window !== 'undefined' && window.electronNative && typeof window.electronNative.updateStorage === 'function') {
        window.electronNative.updateStorage({ ag_theme_v2_config: JSON.stringify(merged) });
      }
    } catch (e) {}

    // 触发 DOM 事件通知主世界
    try {
      const event = new CustomEvent('ag-theme-storage-request', {
        detail: {
          method: 'updateItems',
          changes: { ag_theme_v2_config: JSON.stringify(merged) }
        }
      });
      document.dispatchEvent(event);
    } catch (e) {}
  }

  /**
   * 保存大容量素材至 IndexedDB (支持超大图片与 MP4 视频)
   * @param {string} id 素材唯一标识
   * @param {string} type 'image' | 'video'
   * @param {string} dataUrl Base64 或 BlobURL
   * @param {string} name 原始文件名
   * @param {number} size 字节大小
   */
  async saveAsset(id, type, dataUrl, name = '', size = 0) {
    await this.dbReadyPromise;
    if (!this.db) {
      // 降级使用 sessionStorage
      try {
        sessionStorage.setItem(`ag_asset_${id}`, dataUrl);
      } catch (e) {}
      return false;
    }
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(STORE_ASSETS, 'readwrite');
        const store = tx.objectStore(STORE_ASSETS);
        const record = {
          id,
          type,
          dataUrl,
          name,
          size,
          updatedAt: Date.now()
        };
        const req = store.put(record);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  /**
   * 异步读取大容量素材
   */
  async getAsset(id) {
    await this.dbReadyPromise;
    if (!this.db) {
      try {
        return sessionStorage.getItem(`ag_asset_${id}`);
      } catch (e) {
        return null;
      }
    }
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(STORE_ASSETS, 'readonly');
        const store = tx.objectStore(STORE_ASSETS);
        const req = store.get(id);
        req.onsuccess = (e) => {
          resolve(e.target.result ? e.target.result.dataUrl : null);
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  /**
   * 获取存储使用统计信息
   */
  async getStorageUsage() {
    await this.dbReadyPromise;
    let totalBytes = 0;
    let assetCount = 0;
    if (this.db) {
      await new Promise((resolve) => {
        try {
          const tx = this.db.transaction(STORE_ASSETS, 'readonly');
          const store = tx.objectStore(STORE_ASSETS);
          const req = store.openCursor();
          req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              assetCount++;
              totalBytes += (cursor.value.size || (cursor.value.dataUrl ? cursor.value.dataUrl.length : 0));
              cursor.continue();
            } else {
              resolve();
            }
          };
          req.onerror = () => resolve();
        } catch (e) {
          resolve();
        }
      });
    }
    return {
      assetCount,
      totalBytes,
      totalMB: (totalBytes / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * 安全彻底清除全部自定义素材缓存并复位
   */
  async clearAllAssets() {
    await this.dbReadyPromise;
    if (this.db) {
      await new Promise((resolve) => {
        try {
          const tx = this.db.transaction(STORE_ASSETS, 'readwrite');
          const store = tx.objectStore(STORE_ASSETS);
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        } catch (e) {
          resolve();
        }
      });
    }
    try {
      localStorage.removeItem(this.CONFIG_KEY);
      localStorage.removeItem('ag_theme_apple_config_v3');
      localStorage.removeItem('ag_theme_fast_asset_cache_v1');
    } catch (e) {}
    console.log('[StorageBridge] 自定义素材与配置已彻底清除。');
  }
}

export const storageBridge = new StorageBridge();
