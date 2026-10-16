/**
 * Antigravity V2 - AssetRegistry (动态资产与皮肤注册表)
 * 职责：
 * 1. 解耦固定指派，统一管理总控悬浮球图标与桌宠皮肤
 * 2. 支持内置 6 套皮肤与任意用户自定义导入素材 (动态扩展插拔)
 * 3. 协调总控与桌宠组件的实时换肤广播
 */

export const BUILTIN_SKINS = [
  { id: 'skin_0_sunglasses', name: '墨镜酷哥 (默认)', frameCount: 19, fps: 15 },
  { id: 'skin_1', name: '活力捏捏', frameCount: 32, fps: 16 },
  { id: 'skin_2', name: '开心晃脑', frameCount: 16, fps: 16 },
  { id: 'skin_3', name: '呆萌思考', frameCount: 34, fps: 16 },
  { id: 'skin_4', name: '得意轻笑', frameCount: 34, fps: 16 },
  { id: 'skin_5', name: '元气挥挥', frameCount: 31, fps: 16 }
];

export class AssetRegistry {
  constructor(storageBridge = null, defaultGif = '', builtinFrames = {}) {
    this.storageBridge = storageBridge;
    this.defaultGif = defaultGif;
    this.builtinFrames = builtinFrames;
    this.customSkins = [];
    this.listeners = new Set();
    this.loadCustomSkins();
  }

  loadCustomSkins() {
    try {
      const raw = localStorage.getItem('ag_v2_custom_skins');
      if (raw) {
        this.customSkins = JSON.parse(raw);
      }
    } catch (e) {}
  }

  saveCustomSkins() {
    try {
      localStorage.setItem('ag_v2_custom_skins', JSON.stringify(this.customSkins));
    } catch (e) {}
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(event, data) {
    this.listeners.forEach(fn => {
      try { fn(event, data); } catch (e) {}
    });
  }

  /**
   * 获取所有可用皮肤列表 (内置 + 自定义)
   */
  getAllSkins() {
    return BUILTIN_SKINS.concat(this.customSkins);
  }

  /**
   * 注册用户自定义表情/皮肤
   * @param {string} name 皮肤名称
   * @param {string} dataUrl 图片或动图的 DataURL
   */
  async registerCustomSkin(name, dataUrl) {
    const id = 'custom_skin_' + Date.now();
    const skinRecord = {
      id,
      name: name || '自定义表情',
      isCustom: true,
      frameCount: 1,
      fps: 1,
      customDataUrl: dataUrl
    };
    this.customSkins.push(skinRecord);
    this.saveCustomSkins();
    if (this.storageBridge) {
      await this.storageBridge.saveAsset(id, 'image', dataUrl, name, dataUrl.length);
    }
    this.notify('skinAdded', skinRecord);
    return skinRecord;
  }

  /**
   * 根据配置解析当前总控悬浮球的显示图标 URL
   */
  async getFloatingIconUrl(config) {
    const iconType = config.floatingIconType || 'default';
    if (iconType === 'default') {
      return this.defaultGif;
    }
    if (iconType === 'custom' && config.customFloatingIconId && this.storageBridge) {
      const customUrl = await this.storageBridge.getAsset(config.customFloatingIconId);
      if (customUrl) return customUrl;
    }
    // 若指向某个特定皮肤
    const targetSkin = this.getAllSkins().find(s => s.id === config.activePetSkinId);
    if (targetSkin) {
      if (targetSkin.customDataUrl) return targetSkin.customDataUrl;
      if (this.builtinFrames && this.builtinFrames[targetSkin.id]) {
        return this.builtinFrames[targetSkin.id];
      }
    }
    return this.defaultGif;
  }
}
