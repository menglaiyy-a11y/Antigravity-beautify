/**
 * Antigravity V2 - PetWidget (桌面伴侣独立沙箱组件)
 * 职责：
 * 1. 在主界面右下角呈现独立的陪伴挂件，支持帧动画播放、点击互动与配额气泡
 * 2. 完全封装在 Shadow DOM 内部，与宿主双向零样式污染
 * 3. 动态响应 AssetRegistry 换肤广播，支持用户自定义动图/序列帧替换
 */

export class PetWidget {
  constructor(stateMachine, assetRegistry, storageBridge = null) {
    this.stateMachine = stateMachine;
    this.assetRegistry = assetRegistry;
    this.storageBridge = storageBridge;
    this.host = null;
    this.shadow = null;
    this.visible = false;
    this.currentSkin = null;
    this.animTimer = null;
    this.currentFrame = 0;
  }

  mount() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('ag-pet-widget-host')) return;

    this.host = document.createElement('div');
    this.host.id = 'ag-pet-widget-host';
    this.host.style.cssText = 'position: fixed; z-index: 999998; pointer-events: none; inset: 0;';

    this.shadow = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      .pet-container {
        position: fixed;
        bottom: 84px;
        right: 84px;
        width: 120px;
        height: 120px;
        pointer-events: auto;
        cursor: grab;
        display: none;
        align-items: center;
        justify-content: center;
        user-select: none;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .pet-container.active {
        display: flex;
      }
      .pet-container:active {
        cursor: grabbing;
        transform: scale(0.95);
      }
      .pet-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.45));
        pointer-events: none;
      }
      .speech-bubble {
        position: absolute;
        bottom: 125px;
        right: 0;
        background: rgba(20, 26, 40, 0.92);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        font-size: 11px;
        padding: 6px 10px;
        border-radius: 10px;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
        opacity: 0;
        transform: translateY(6px);
        transition: all 0.25s ease;
        pointer-events: none;
      }
      .speech-bubble.show {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    this.shadow.appendChild(style);

    const container = document.createElement('div');
    container.className = 'pet-container';
    container.innerHTML = `
      <div class="speech-bubble" id="pet-bubble">伴侣已上线 ~</div>
      <img class="pet-img" id="pet-display" alt="Desktop Pet" />
    `;
    this.shadow.appendChild(container);

    // 点击互动
    const bubble = container.querySelector('#pet-bubble');
    const displayImg = container.querySelector('#pet-display');

    container.onclick = () => {
      const messages = ['今天代码写得真棒！', '摸摸头，继续加油~', '需要换个主题模态吗？', '我在一直陪着你呢！'];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      bubble.textContent = msg;
      bubble.classList.add('show');
      setTimeout(() => bubble.classList.remove('show'), 2500);
    };

    // 监听状态机与皮肤变动
    this.stateMachine.subscribe((event, payload) => {
      if (event === 'skinChange' || event === 'configChange') {
        this.updateSkin();
      }
    });

    if (this.assetRegistry) {
      this.assetRegistry.subscribe(() => this.updateSkin());
    }

    document.body.appendChild(this.host);
    this.updateSkin();
  }

  setVisible(visible) {
    this.visible = visible;
    if (!this.shadow) return;
    const container = this.shadow.querySelector('.pet-container');
    if (container) {
      if (visible) {
        container.classList.add('active');
        this.updateSkin();
      } else {
        container.classList.remove('active');
        if (this.animTimer) {
          clearInterval(this.animTimer);
          this.animTimer = null;
        }
      }
    }
  }

  async updateSkin() {
    if (!this.shadow) return;
    const cfg = this.stateMachine.getConfig();
    const targetSkinId = cfg.activePetSkinId || 'skin_0_sunglasses';
    const allSkins = this.assetRegistry ? this.assetRegistry.getAllSkins() : [];
    const skin = allSkins.find(s => s.id === targetSkinId) || allSkins[0];

    const displayImg = this.shadow.querySelector('#pet-display');
    if (!displayImg) return;

    if (this.animTimer) {
      clearInterval(this.animTimer);
      this.animTimer = null;
    }

    if (!skin) return;

    // 自定义皮肤 / 单图素材
    if (skin.isCustom && skin.customDataUrl) {
      displayImg.src = skin.customDataUrl;
      return;
    }

    // 默认内置皮肤第一帧或动图
    const baseDir = `file:///D:/Antigravity/6/V2/src/assets/pet_skins/${skin.id}`;
    this.currentFrame = 0;
    const totalFrames = skin.frameCount || 19;
    const intervalMs = Math.floor(1000 / (skin.fps || 15));

    this.animTimer = setInterval(() => {
      const frameStr = String(this.currentFrame).padStart(2, '0');
      displayImg.src = `${baseDir}/frame_${frameStr}.png`;
      this.currentFrame = (this.currentFrame + 1) % totalFrames;
    }, intervalMs);
  }
}
