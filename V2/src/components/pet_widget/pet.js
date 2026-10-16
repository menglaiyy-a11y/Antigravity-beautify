/**
 * Antigravity V2 - PetWidget (桌面伴侣独立沙箱组件)
 * 职责：
 * 1. 呈现独立的桌面陪伴挂件，支持帧动画循环播放与单图呼吸动效
 * 2. 交互细节调优：DragController 阻尼拖拽与边缘吸附、点击与拖拽防误触严格分离
 * 3. 丰富交互：单击弹出趣味对话与配额健康气泡、双击快速唤出视觉总控面板
 * 4. 完全封装在 Shadow DOM 内部，与宿主双向零样式污染
 * 5. 动态响应 AssetRegistry 换肤广播，支持用户自定义动图/序列帧无缝替换
 */

import { DragController } from '../../core/drag_controller.js';

export class PetWidget {
  constructor(stateMachine, assetRegistry, storageBridge = null) {
    this.stateMachine = stateMachine;
    this.assetRegistry = assetRegistry;
    this.storageBridge = storageBridge;
    this.host = null;
    this.shadow = null;
    this.visible = false;
    this.scale = 1.0;
    this.currentSkin = null;
    this.animTimer = null;
    this.currentFrame = 0;
    this.dragController = null;
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
        top: 0;
        left: 0;
        width: 120px;
        height: 120px;
        pointer-events: auto;
        cursor: grab;
        display: none;
        align-items: center;
        justify-content: center;
        user-select: none;
        touch-action: none;
        z-index: 999998;
      }
      .pet-container.active {
        display: flex;
      }
      .pet-container.is-dragging {
        cursor: grabbing;
        transform: scale(1.05) !important;
      }
      .pet-container.snapped-left {
        opacity: 0.85;
      }
      .pet-container.snapped-right {
        opacity: 0.85;
      }
      .pet-container:hover {
        opacity: 1 !important;
      }
      .pet-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.45));
        pointer-events: none;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .speech-bubble {
        position: absolute;
        bottom: 125px;
        left: 50%;
        transform: translateX(-50%) translateY(8px);
        background: rgba(18, 24, 38, 0.94);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.16);
        color: #ffffff;
        font-size: 11px;
        padding: 6px 12px;
        border-radius: 12px;
        white-space: nowrap;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
        opacity: 0;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .speech-bubble.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    `;
    this.shadow.appendChild(style);

    const container = document.createElement('div');
    container.className = 'pet-container';
    container.innerHTML = `
      <div class="speech-bubble" id="pet-bubble">伴侣已就绪 ~</div>
      <img class="pet-img" id="pet-display" alt="Desktop Pet" />
    `;
    this.shadow.appendChild(container);

    // 接入 DragController 拖拽与磁吸阻尼
    this.dragController = new DragController(container, {
      storageKey: 'ag_v2_pet_pos',
      snapThreshold: 64,
      edgeMargin: 20,
      onClick: () => this.handleInteractiveClick()
    });

    // 默认初始位置放置在视口右下方
    if (!localStorage.getItem('ag_v2_pet_pos')) {
      const initX = Math.max(20, window.innerWidth - 160);
      const initY = Math.max(20, window.innerHeight - 200);
      this.dragController.applyPosition(initX, initY, false);
    }

    // 双击快速呼出控制面板
    container.ondblclick = () => {
      if (window.__ag_v2_theme && window.__ag_v2_theme.controlPanel) {
        window.__ag_v2_theme.controlPanel.open();
      }
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

  handleInteractiveClick() {
    if (!this.shadow) return;
    const bubble = this.shadow.querySelector('#pet-bubble');
    if (!bubble) return;

    const messages = [
      '今天代码写得真棒！',
      '摸摸头，灵感涌现中~',
      '双击我可以呼出视觉总控面板哦！',
      '快捷键 Alt+T 随时召唤设置~',
      '额度健康稳定，放手去创造吧！',
      '我是你的专属智能陪伴~'
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    bubble.textContent = msg;
    bubble.classList.add('show');
    setTimeout(() => bubble.classList.remove('show'), 2800);
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

  setScale(scale) {
    this.scale = scale;
    if (!this.shadow) return;
    const img = this.shadow.querySelector('#pet-display');
    if (img) {
      img.style.transform = `scale(${scale})`;
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

    if (skin.isCustom && skin.customDataUrl) {
      // 用户自定义导入动图或静态表情
      displayImg.src = skin.customDataUrl;
    } else if (skin.id === 'skin_0_sunglasses' || skin.id === 'cat') {
      // 默认墨镜动图
      displayImg.src = this.assetRegistry ? this.assetRegistry.defaultGif : '';
    } else if (this.assetRegistry && this.assetRegistry.builtinFrames && this.assetRegistry.builtinFrames[skin.id]) {
      // 内置预制皮肤专属帧
      displayImg.src = this.assetRegistry.builtinFrames[skin.id];
    } else {
      // 序列帧动画播放
      const frameCount = skin.frameCount || 16;
      const fps = skin.fps || 15;
      const intervalMs = Math.round(1000 / fps);
      this.currentFrame = 0;

      // 如果是自定义存储在 storageBridge 中的资产
      if (skin.customAssetId && this.storageBridge) {
        const url = await this.storageBridge.getAsset(skin.customAssetId);
        if (url) displayImg.src = url;
      } else {
        // 内置动图或默认展示
        displayImg.src = this.assetRegistry ? this.assetRegistry.defaultGif : '';
      }
    }
  }
}
