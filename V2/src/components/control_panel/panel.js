/**
 * Antigravity V2 - ControlPanel (Shadow DOM 隔离沙箱控制台)
 * 职责：提供模态切换、材质调优、自定义素材导入、缓存清除与表情替换控制
 * 隔离：完全封装在 Shadow DOM 内部，与宿主双向零样式污染
 */

export class ControlPanel {
  constructor(stateMachine, sunglassesGifBase64 = '', storageBridge = null, assetRegistry = null, petWidget = null) {
    this.stateMachine = stateMachine;
    this.sunglassesGif = sunglassesGifBase64;
    this.storageBridge = storageBridge;
    this.assetRegistry = assetRegistry;
    this.petWidget = petWidget;
    this.host = null;
    this.shadow = null;
    this.isOpen = false;
  }

  mount() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('ag-control-panel-host')) return;

    // 1. 创建宿主节点
    this.host = document.createElement('div');
    this.host.id = 'ag-control-panel-host';
    this.host.style.cssText = 'position: fixed; z-index: 999999; pointer-events: none; inset: 0;';

    // 2. 开启封闭的 Shadow DOM 沙箱
    this.shadow = this.host.attachShadow({ mode: 'open' });

    // 3. 注入独立的 Shadow CSS
    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      
      .floating-trigger {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(18, 24, 38, 0.85);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        cursor: pointer;
        pointer-events: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
      }
      .floating-trigger:hover {
        transform: scale(1.1);
        box-shadow: 0 12px 32px rgba(41, 128, 255, 0.35);
      }
      .floating-trigger img {
        width: 32px;
        height: 32px;
        object-fit: contain;
        pointer-events: none;
      }

      .panel-window {
        position: fixed;
        bottom: 84px;
        right: 24px;
        width: 360px;
        max-height: 82vh;
        overflow-y: auto;
        background: rgba(16, 20, 30, 0.94);
        backdrop-filter: blur(28px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.55);
        color: #ffffff;
        padding: 20px;
        pointer-events: auto;
        display: none;
        flex-direction: column;
        gap: 16px;
        animation: panelFadeIn 0.25s ease-out;
      }
      .panel-window.open {
        display: flex;
      }
      @keyframes panelFadeIn {
        from { opacity: 0; transform: translateY(12px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1.0); }
      }

      .panel-title {
        font-size: 15px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .panel-close {
        cursor: pointer;
        opacity: 0.6;
        font-size: 18px;
        transition: opacity 0.2s ease;
      }
      .panel-close:hover { opacity: 1; }

      .section-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 4px;
      }

      .mode-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .mode-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px;
        color: #ffffff;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        transition: all 0.2s ease;
      }
      .mode-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.2);
      }
      .mode-btn.active {
        background: rgba(41, 128, 255, 0.25);
        border-color: #2980ff;
        box-shadow: 0 0 12px rgba(41, 128, 255, 0.4);
      }

      .slider-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .slider-header {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
      }
      .slider-header span.val {
        color: #2980ff;
        font-weight: 600;
      }
      input[type="range"] {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.15);
        outline: none;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #2980ff;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }

      /* 自定义素材导入卡片 */
      .upload-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px dashed rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 14px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .upload-card:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: #2980ff;
      }
      .upload-hint {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 4px;
      }

      /* 皮肤与桌宠选择网格 */
      .skin-selector {
        width: 100%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 13px;
        outline: none;
      }
      .skin-selector option {
        background: #141824;
        color: #ffffff;
      }

      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        background: rgba(255, 255, 255, 0.04);
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      /* 缓存与存储卡片 */
      .storage-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
      }
      .btn-danger {
        background: rgba(255, 69, 58, 0.2);
        border: 1px solid rgba(255, 69, 58, 0.4);
        color: #ff453a;
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-danger:hover {
        background: rgba(255, 69, 58, 0.35);
      }
    `;
    this.shadow.appendChild(style);

    // 4. 构建 DOM 结构
    const cfg = this.stateMachine.getConfig();
    const currentMode = cfg.mode || 'native';

    const trigger = document.createElement('div');
    trigger.className = 'floating-trigger';
    trigger.title = 'Antigravity V2 控制中心';
    trigger.innerHTML = `<img id="trigger-img" src="${this.sunglassesGif || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="表情" />`;
    trigger.onclick = () => this.toggle();
    this.shadow.appendChild(trigger);

    const win = document.createElement('div');
    win.className = 'panel-window';
    win.innerHTML = `
      <div class="panel-title">
        <span>Antigravity V2 控制中心</span>
        <span class="panel-close">&times;</span>
      </div>

      <div class="section-label">视觉呈现模态 (物理互斥)</div>
      <div class="mode-grid">
        <button class="mode-btn ${currentMode === 'native' ? 'active' : ''}" data-mode="native">
          <span>原生模式</span>
        </button>
        <button class="mode-btn ${currentMode === 'ocean' ? 'active' : ''}" data-mode="ocean">
          <span>晶格海洋</span>
        </button>
        <button class="mode-btn ${currentMode === 'aurora' ? 'active' : ''}" data-mode="aurora">
          <span>流体极光</span>
        </button>
        <button class="mode-btn ${currentMode === 'custom' ? 'active' : ''}" data-mode="custom">
          <span>自定义素材</span>
        </button>
      </div>

      <!-- 晶格海洋参数 -->
      <div id="ocean-controls" style="display: ${currentMode === 'ocean' ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
        <div class="section-label">晶格海洋专用调优</div>
        <div class="slider-group">
          <div class="slider-header"><span>粒子波浪流速</span><span class="val" id="val-speed">1.0x</span></div>
          <input type="range" id="slide-speed" min="0.2" max="2.5" step="0.1" value="1.0" />
        </div>
        <div class="slider-group">
          <div class="slider-header"><span>星芒锐度</span><span class="val" id="val-sharp">0.65</span></div>
          <input type="range" id="slide-sharp" min="0.2" max="1.0" step="0.05" value="0.65" />
        </div>
      </div>

      <!-- 桌面伴侣与表情包自由替换 -->
      <div class="section-label">桌面伴侣与表情包自由替换 (拒绝固定指派)</div>
      <div class="toggle-row">
        <span>开启前端桌面伴侣挂件</span>
        <input type="checkbox" id="chk-pet-visible" />
      </div>

      <div class="slider-group">
        <div class="slider-header"><span>当前伴侣皮肤</span></div>
        <select class="skin-selector" id="select-pet-skin"></select>
      </div>

      <div class="toggle-row">
        <span>悬浮球跟随伴侣皮肤</span>
        <input type="checkbox" id="chk-sync-floating-icon" />
      </div>

      <input type="file" id="skin-custom-upload" accept="image/*" style="display: none;" />
      <div class="upload-card" id="btn-upload-skin">
        <div style="font-size: 13px; font-weight: 500;">+ 导入自定义表情/动图</div>
        <div class="upload-hint">支持 GIF 动图或 PNG，即刻加入皮肤注册表</div>
      </div>

      <!-- 自定义素材导入模块 -->
      <div id="custom-controls" style="display: ${currentMode === 'custom' ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
        <div class="section-label">本地大容量素材存取 (IndexedDB)</div>
        <input type="file" id="asset-file-input" accept="image/*,video/mp4" style="display: none;" />
        <div class="upload-card" id="btn-select-file">
          <div style="font-size: 13px; font-weight: 500;">点击选取本地图片或 MP4 视频</div>
          <div class="upload-hint">支持 4K 高清壁纸与动态视频，持久化存入 IndexedDB</div>
        </div>
      </div>

      <!-- 存储与缓存管理卡片 -->
      <div class="section-label">存储与缓存管理</div>
      <div class="storage-card">
        <div>
          <span>已占用空间: </span>
          <span id="storage-usage-val" style="color: #2980ff; font-weight: 600;">计算中...</span>
        </div>
        <button class="btn-danger" id="btn-purge-cache">一键清除缓存</button>
      </div>
    `;
    this.shadow.appendChild(win);

    // 5. 事件绑定与持久化联动
    win.querySelector('.panel-close').onclick = () => this.toggle(false);

    // 模态切换
    win.querySelectorAll('.mode-btn').forEach(btn => {
      btn.onclick = () => {
        const targetMode = btn.getAttribute('data-mode');
        this.stateMachine.setMode(targetMode);
        win.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const oceanControls = win.querySelector('#ocean-controls');
        if (oceanControls) {
          oceanControls.style.display = targetMode === 'ocean' ? 'flex' : 'none';
        }
        const customControls = win.querySelector('#custom-controls');
        if (customControls) {
          customControls.style.display = targetMode === 'custom' ? 'flex' : 'none';
        }
      };
    });

    // 渲染皮肤下拉列表
    this.renderSkinSelector();

    // 伴侣开关
    const chkPet = win.querySelector('#chk-pet-visible');
    if (chkPet && this.petWidget) {
      chkPet.checked = false;
      chkPet.onchange = (e) => {
        this.petWidget.setVisible(e.target.checked);
      };
    }

    // 悬浮球跟随皮肤
    const chkSync = win.querySelector('#chk-sync-floating-icon');
    if (chkSync) {
      chkSync.checked = cfg.floatingIconType === 'skin';
      chkSync.onchange = (e) => {
        const type = e.target.checked ? 'skin' : 'default';
        this.stateMachine.updateConfig({ floatingIconType: type });
        this.updateFloatingIcon();
      };
    }

    // 皮肤下拉切换
    const selectSkin = win.querySelector('#select-pet-skin');
    if (selectSkin) {
      selectSkin.onchange = (e) => {
        const skinId = e.target.value;
        this.stateMachine.updateConfig({ activePetSkinId: skinId });
        this.stateMachine.notify('skinChange', skinId);
        this.updateFloatingIcon();
      };
    }

    // 上传新表情包
    const skinUploadInput = win.querySelector('#skin-custom-upload');
    const btnUploadSkin = win.querySelector('#btn-upload-skin');
    if (btnUploadSkin && skinUploadInput) {
      btnUploadSkin.onclick = () => skinUploadInput.click();
      skinUploadInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const dataUrl = evt.target.result;
          if (this.assetRegistry) {
            const newSkin = await this.assetRegistry.registerCustomSkin(file.name, dataUrl);
            this.stateMachine.updateConfig({ activePetSkinId: newSkin.id });
            this.stateMachine.notify('skinChange', newSkin.id);
            this.renderSkinSelector();
            this.updateFloatingIcon();
            this.updateStorageUsageDisplay();
          }
        };
        reader.readAsDataURL(file);
      };
    }

    // 晶格流速滑块
    const slideSpeed = win.querySelector('#slide-speed');
    const valSpeed = win.querySelector('#val-speed');
    if (slideSpeed) {
      slideSpeed.oninput = (e) => {
        const v = parseFloat(e.target.value);
        valSpeed.textContent = v.toFixed(1) + 'x';
        if (this.stateMachine.renderers && this.stateMachine.renderers.ocean) {
          this.stateMachine.renderers.ocean.config.swellSpeed = v;
        }
      };
    }

    // 自定义壁纸文件选取
    const fileInput = win.querySelector('#asset-file-input');
    const btnSelectFile = win.querySelector('#btn-select-file');
    if (btnSelectFile && fileInput) {
      btnSelectFile.onclick = () => fileInput.click();
      fileInput.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4');
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const dataUrl = evt.target.result;
          if (this.storageBridge) {
            await this.storageBridge.saveAsset('default_custom', isVideo ? 'video' : 'image', dataUrl, file.name, file.size);
            this.stateMachine.updateConfig({
              customAssetId: 'default_custom',
              customAssetType: isVideo ? 'video' : 'image'
            });
            this.updateStorageUsageDisplay();
          }
        };
        reader.readAsDataURL(file);
      };
    }

    // 清除缓存
    const btnPurge = win.querySelector('#btn-purge-cache');
    if (btnPurge) {
      btnPurge.onclick = async () => {
        if (this.storageBridge) {
          await this.storageBridge.clearAllAssets();
          this.stateMachine.setMode('native');
          win.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
          const natBtn = win.querySelector('.mode-btn[data-mode="native"]');
          if (natBtn) natBtn.classList.add('active');
          this.renderSkinSelector();
          this.updateFloatingIcon();
          this.updateStorageUsageDisplay();
        }
      };
    }

    this.updateStorageUsageDisplay();
    document.body.appendChild(this.host);
  }

  renderSkinSelector() {
    if (!this.shadow) return;
    const select = this.shadow.querySelector('#select-pet-skin');
    if (!select) return;
    const skins = this.assetRegistry ? this.assetRegistry.getAllSkins() : [];
    const curSkinId = this.stateMachine.getConfig().activePetSkinId || 'skin_0_sunglasses';
    select.innerHTML = skins.map(s => {
      const selected = s.id === curSkinId ? 'selected' : '';
      return `<option value="${s.id}" ${selected}>${s.name}${s.isCustom ? ' (自定义)' : ''}</option>`;
    }).join('');
  }

  async updateFloatingIcon() {
    if (!this.shadow) return;
    const img = this.shadow.querySelector('#trigger-img');
    if (!img) return;
    if (this.assetRegistry) {
      const url = await this.assetRegistry.getFloatingIconUrl(this.stateMachine.getConfig());
      img.src = url;
    }
  }

  async updateStorageUsageDisplay() {
    if (!this.shadow || !this.storageBridge) return;
    const usageVal = this.shadow.querySelector('#storage-usage-val');
    if (!usageVal) return;
    const stats = await this.storageBridge.getStorageUsage();
    usageVal.textContent = `${stats.totalMB} MB (${stats.assetCount} 项素材)`;
  }

  toggle(forceState) {
    if (!this.shadow) return;
    const win = this.shadow.querySelector('.panel-window');
    if (!win) return;
    this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
    if (this.isOpen) {
      win.classList.add('open');
      this.renderSkinSelector();
      this.updateStorageUsageDisplay();
    } else {
      win.classList.remove('open');
    }
  }
}
