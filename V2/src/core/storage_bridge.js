/**
 * Antigravity V2 - StorageBridge (跨上下文存储桥接单例)
 * 职责：在 Electron 隔离世界与页面主世界之间建立安全、受限的持久化配置通道
 */
export class StorageBridge {
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

export const storageBridge = new StorageBridge();
