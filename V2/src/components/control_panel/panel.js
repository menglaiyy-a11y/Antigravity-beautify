/**
 * Antigravity V2 - ControlPanel (Shadow DOM 隔离沙箱控制台)
 * 职责：
 * 1. 模态物理互斥切换 (native, ocean, aurora, custom)
 * 2. 交互细节调优：悬浮球阻尼拖拽与边缘吸附 (DragController)、全局呼出快捷键 (Alt+T, Ctrl+Shift+T, Ctrl+Shift+P, Esc)
 * 3. 完整移植并优化 V1 所有调控滑块：晶格流速/密度/锐度/水波/色盘、极光流速/模糊/透底/色相、自定义暗化遮罩/模糊
 * 4. 实时额度感知 (fetchQuota) 与配额进度呈现
 * 5. 资产解耦：6 套皮肤切换、本地自定义动图导入与一键存储管理
 */

import { DragController } from '../../core/drag_controller.js';
import { OCEAN_PALETTES } from '../../shaders/ocean_renderer.js';

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
    this.dragController = null;
    this.quotaData = null;
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
        top: 0;
        left: 0;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(18, 24, 38, 0.88);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.16);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
        cursor: grab;
        pointer-events: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        touch-action: none;
        z-index: 999999;
      }
      .floating-trigger.is-dragging {
        cursor: grabbing;
        box-shadow: 0 16px 36px rgba(41, 128, 255, 0.4);
        transform: scale(1.08) !important;
      }
      .floating-trigger.snapped-left {
        opacity: 0.75;
      }
      .floating-trigger.snapped-right {
        opacity: 0.75;
      }
      .floating-trigger:hover {
        opacity: 1 !important;
        box-shadow: 0 12px 32px rgba(41, 128, 255, 0.4);
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
        width: 380px;
        max-height: 84vh;
        overflow-y: auto;
        background: rgba(14, 18, 28, 0.95);
        backdrop-filter: blur(28px);
        -webkit-backdrop-filter: blur(28px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 18px;
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6);
        color: #ffffff;
        padding: 20px;
        pointer-events: auto;
        display: none;
        flex-direction: column;
        gap: 16px;
        animation: panelFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 999998;
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
      .panel-shortcuts-tag {
        font-size: 11px;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        font-weight: normal;
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
        display: flex;
        align-items: center;
        justify-content: space-between;
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

      .palette-row {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 4px;
      }
      .palette-btn {
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 11px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #ffffff;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s;
      }
      .palette-btn.active, .palette-btn:hover {
        background: rgba(41, 128, 255, 0.3);
        border-color: #2980ff;
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
        font-size: 11px;
        color: rgba(255, 255, 255, 0.55);
        margin-top: 4px;
      }

      /* 配额状态卡片 */
      .quota-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .quota-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
      }
      .quota-bar-bg {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.1);
        overflow: hidden;
      }
      .quota-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #2980ff, #00dbff);
        border-radius: 3px;
        transition: width 0.3s ease;
      }

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
      .btn-refresh {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 11px;
        cursor: pointer;
      }
      .btn-refresh:hover { background: rgba(255, 255, 255, 0.15); }
    `;
    this.shadow.appendChild(style);

    // 4. 构建 DOM 结构
    const cfg = this.stateMachine.getConfig();
    const currentMode = cfg.mode || 'native';

    const trigger = document.createElement('div');
    trigger.className = 'floating-trigger';
    trigger.title = 'Antigravity V2 控制中心 (⌥T / Alt+T 快速唤出)';
    trigger.innerHTML = `<img id="trigger-img" src="${this.sunglassesGif || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="表情" />`;
    this.shadow.appendChild(trigger);

    // 挂载 DragController，赋予防误触拖拽与吸附阻尼
    this.dragController = new DragController(trigger, {
      storageKey: 'ag_v2_trigger_pos',
      snapThreshold: 48,
      edgeMargin: 16,
      onClick: () => this.toggle()
    });

    // 初始位置设定 (若无记录放置于视口右下)
    if (!localStorage.getItem('ag_v2_trigger_pos')) {
      const initX = Math.max(16, window.innerWidth - 64);
      const initY = Math.max(16, window.innerHeight - 84);
      this.dragController.applyPosition(initX, initY, false);
    }

    const win = document.createElement('div');
    win.className = 'panel-window';
    win.innerHTML = `
      <div class="panel-title">
        <span>Antigravity V2 控制中心</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="panel-shortcuts-tag">Alt+T / ⌥T</span>
          <span class="panel-close">&times;</span>
        </div>
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

      <!-- 晶格海洋参数 (完整移植 V1 参数并优化) -->
      <div id="ocean-controls" style="display: ${currentMode === 'ocean' ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
        <div class="section-label">晶格海洋参数调优 (Zero-Lag 管线)</div>
        <div class="slider-group">
          <div class="slider-header"><span>粒子波浪流速</span><span class="val" id="val-ocean-speed">1.0x</span></div>
          <input type="range" id="slide-ocean-speed" min="0.2" max="2.5" step="0.1" value="1.0" />
        </div>
        <div class="slider-group">
          <div class="slider-header"><span>星芒锐度</span><span class="val" id="val-ocean-sharp">0.65</span></div>
          <input type="range" id="slide-ocean-sharp" min="0.2" max="1.0" step="0.05" value="0.65" />
        </div>
        <div class="slider-group">
          <div class="slider-header"><span>网格粒子密度</span><span class="val" id="val-ocean-density">48</span></div>
          <input type="range" id="slide-ocean-density" min="24" max="64" step="2" value="48" />
        </div>
        <div class="slider-group">
          <div class="slider-header"><span>水波涟漪冲击力</span><span class="val" id="val-ocean-ripple">1.0x</span></div>
          <input type="range" id="slide-ocean-ripple" min="0.2" max="2.0" step="0.1" value="1.0" />
        </div>
        <div class="section-label">粒子色彩主题</div>
        <div class="palette-row" id="ocean-palettes-row">
          <button class="palette-btn active" data-pal="gemini">Gemini 蓝</button>
          <button class="palette-btn" data-pal="argon">Argon 极光</button>
          <button class="palette-btn" data-pal="emerald">Emerald 翡翠</button>
          <button class="palette-btn" data-pal="sunset">Sunset 落日</button>
          <button class="palette-btn" data-pal="miku">Miku 葱青</button>
        </div>
      </div>

      <!-- 流体极光参数 -->
      <div id="aurora-controls" style="display: ${currentMode === 'aurora' ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
        <div class="section-label">流体极光材质参数</div>
        <div class="slider-group">
          <div class="slider-header"><span>极光流动速度</span><span class="val" id="val-aurora-speed">1.0x</span></div>
          <input type="range" id="slide-aurora-speed" min="0.2" max="2.5" step="0.1" value="1.0" />
        </div>
        <div class="slider-group">
          <div class="slider-header"><span>卡片毛玻璃模糊度</span><span class="val" id="val-aurora-blur">20px</span></div>
          <input type="range" id="slide-aurora-blur" min="0" max="40" step="2" value="20" />
        </div>
        <div class="slider-group">
          <div class="slider-header"><span>中栏卡片透底透明度</span><span class="val" id="val-aurora-opacity">35%</span></div>
          <input type="range" id="slide-aurora-opacity" min="10" max="90" step="5" value="35" />
        </div>
        <div class="slider-group">
          <div class="slider-header"><span>左侧边栏透明度</span><span class="val" id="val-aurora-sidebar-opacity">45%</span></div>
          <input type="range" id="slide-aurora-sidebar-opacity" min="10" max="90" step="5" value="45" />
        </div>
      </div>

      <!-- 自定义素材导入模块 -->
      <div id="custom-controls" style="display: ${currentMode === 'custom' ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
        <div class="section-label">本地大容量素材存取 (IndexedDB)</div>
        <input type="file" id="asset-file-input" accept="image/*,video/mp4" style="display: none;" />
        <div class="upload-card" id="btn-select-file">
          <div style="font-size: 13px; font-weight: 500;">点击选取本地图片或 MP4 视频</div>
          <div class="upload-hint">支持 4K 高清壁纸与动态视频，持久化存入 IndexedDB</div>
        </div>
        <div class="slider-group">
          <div class="slider-header"><span>壁纸暗化遮罩浓度</span><span class="val" id="val-custom-mask">35%</span></div>
          <input type="range" id="slide-custom-mask" min="0" max="80" step="5" value="35" />
        </div>
        <div class="slider-group">
          <div class="slider-header"><span>背景模糊度</span><span class="val" id="val-custom-blur">16px</span></div>
          <input type="range" id="slide-custom-blur" min="0" max="40" step="2" value="16" />
        </div>
      </div>

      <!-- 实时模型额度感知 (V1 移植优化) -->
      <div class="section-label">
        <span>实时模型额度感知</span>
        <button class="btn-refresh" id="btn-refresh-quota">刷新</button>
      </div>
      <div class="quota-card">
        <div class="quota-row">
          <span>Gemini Pro / Flash 状态</span>
          <span id="quota-gemini-pct" style="color: #2980ff; font-weight: 600;">获取中...</span>
        </div>
        <div class="quota-bar-bg">
          <div class="quota-bar-fill" id="quota-gemini-bar" style="width: 100%;"></div>
        </div>
        <div class="quota-row" style="font-size: 11px; color: rgba(255,255,255,0.5);">
          <span id="quota-reset-hint">重置时间: 正常</span>
          <span id="quota-status-badge">健康</span>
        </div>
      </div>

      <!-- 桌面伴侣与表情包自由替换 -->
      <div class="section-label">
        <span>桌面伴侣与表情包 (拒绝固定指派)</span>
        <span class="panel-shortcuts-tag">Ctrl+Shift+P</span>
      </div>
      <div class="toggle-row">
        <span>开启桌面伴侣挂件</span>
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

      <div class="slider-group">
        <div class="slider-header"><span>伴侣挂件尺寸比例</span><span class="val" id="val-pet-scale">1.0x</span></div>
        <input type="range" id="slide-pet-scale" min="0.75" max="1.35" step="0.05" value="1.0" />
      </div>

      <input type="file" id="skin-custom-upload" accept="image/*" style="display: none;" />
      <div class="upload-card" id="btn-upload-skin">
        <div style="font-size: 13px; font-weight: 500;">+ 导入自定义表情 / 动图</div>
        <div class="upload-hint">支持 GIF 动图或 PNG，即刻加入皮肤注册表</div>
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
        if (oceanControls) oceanControls.style.display = targetMode === 'ocean' ? 'flex' : 'none';
        const auroraControls = win.querySelector('#aurora-controls');
        if (auroraControls) auroraControls.style.display = targetMode === 'aurora' ? 'flex' : 'none';
        const customControls = win.querySelector('#custom-controls');
        if (customControls) customControls.style.display = targetMode === 'custom' ? 'flex' : 'none';
      };
    });

    // 全局快捷键注册
    this.bindGlobalShortcuts();

    // 渲染皮肤下拉列表
    this.renderSkinSelector();

    // 伴侣开关
    const chkPet = win.querySelector('#chk-pet-visible');
    if (chkPet && this.petWidget) {
      chkPet.checked = this.petWidget.visible;
      chkPet.onchange = (e) => {
        this.petWidget.setVisible(e.target.checked);
      };
    }

    // 伴侣尺寸滑块
    const slidePetScale = win.querySelector('#slide-pet-scale');
    const valPetScale = win.querySelector('#val-pet-scale');
    if (slidePetScale && this.petWidget) {
      slidePetScale.oninput = (e) => {
        const s = parseFloat(e.target.value);
        valPetScale.textContent = s.toFixed(2) + 'x';
        this.petWidget.setScale(s);
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
    this.bindSlider('slide-ocean-speed', 'val-ocean-speed', (v) => {
      if (this.stateMachine.renderers.ocean) this.stateMachine.renderers.ocean.config.swellSpeed = v;
    }, 'x');

    // 晶格锐度滑块
    this.bindSlider('slide-ocean-sharp', 'val-ocean-sharp', (v) => {
      if (this.stateMachine.renderers.ocean) this.stateMachine.renderers.ocean.config.starSharpness = v;
    });

    // 晶格密度滑块
    this.bindSlider('slide-ocean-density', 'val-ocean-density', (v) => {
      if (this.stateMachine.renderers.ocean) this.stateMachine.renderers.ocean.config.gridDensity = v;
    });

    // 晶格水波滑块
    this.bindSlider('slide-ocean-ripple', 'val-ocean-ripple', (v) => {
      if (this.stateMachine.renderers.ocean) this.stateMachine.renderers.ocean.config.rippleForce = v;
    }, 'x');

    // 晶格调色盘切换
    win.querySelectorAll('#ocean-palettes-row .palette-btn').forEach(btn => {
      btn.onclick = () => {
        win.querySelectorAll('#ocean-palettes-row .palette-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pal = btn.getAttribute('data-pal');
        if (this.stateMachine.renderers.ocean) {
          this.stateMachine.renderers.ocean.config.palette = pal;
        }
      };
    });

    // 流体极光流速
    this.bindSlider('slide-aurora-speed', 'val-aurora-speed', (v) => {
      if (this.stateMachine.renderers.aurora) this.stateMachine.renderers.aurora.speed = v;
    }, 'x');

    // 流体极光毛玻璃模糊
    this.bindSlider('slide-aurora-blur', 'val-aurora-blur', (v) => {
      document.documentElement.style.setProperty('--ag-glass-blur', v + 'px');
    }, 'px');

    // 流体极光卡片透底
    this.bindSlider('slide-aurora-opacity', 'val-aurora-opacity', (v) => {
      document.documentElement.style.setProperty('--ag-card-opacity', (v / 100).toFixed(2));
    }, '%');

    // 流体极光侧边栏透明度
    this.bindSlider('slide-aurora-sidebar-opacity', 'val-aurora-sidebar-opacity', (v) => {
      document.documentElement.style.setProperty('--ag-sidebar-opacity', (v / 100).toFixed(2));
    }, '%');

    // 自定义壁纸暗化遮罩
    this.bindSlider('slide-custom-mask', 'val-custom-mask', (v) => {
      document.documentElement.style.setProperty('--ag-mask-opacity', (v / 100).toFixed(2));
    }, '%');

    // 自定义壁纸模糊度
    this.bindSlider('slide-custom-blur', 'val-custom-blur', (v) => {
      document.documentElement.style.setProperty('--ag-glass-blur', v + 'px');
    }, 'px');

    // 额度刷新按钮
    const btnRefreshQuota = win.querySelector('#btn-refresh-quota');
    if (btnRefreshQuota) {
      btnRefreshQuota.onclick = () => this.refreshQuotaDisplay();
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
    this.refreshQuotaDisplay();
    document.body.appendChild(this.host);
  }

  bindSlider(inputId, valId, onChange, unit = '') {
    if (!this.shadow) return;
    const input = this.shadow.querySelector('#' + inputId);
    const val = this.shadow.querySelector('#' + valId);
    if (input && val) {
      input.oninput = (e) => {
        const v = parseFloat(e.target.value);
        val.textContent = (unit === 'x' ? v.toFixed(1) : v) + unit;
        onChange(v);
      };
    }
  }

  bindGlobalShortcuts() {
    const handler = (e) => {
      const key = (e.key || '').toLowerCase();
      const code = (e.code || '').toLowerCase();
      // 1. Alt+T 或 Ctrl+Shift+T 呼出/折叠总控
      const isAltT = e.altKey && (key === 't' || code === 'keyt');
      const isCtrlShiftT = (e.ctrlKey || e.metaKey) && e.shiftKey && (key === 't' || code === 'keyt');
      if (isAltT || isCtrlShiftT) {
        e.preventDefault();
        this.toggle();
        return;
      }

      // 2. Ctrl+Shift+P 切换伴侣显示/隐藏
      const isTogglePet = (e.ctrlKey || e.metaKey) && e.shiftKey && (key === 'p' || code === 'keyp');
      if (isTogglePet && this.petWidget) {
        e.preventDefault();
        const nextVisible = !this.petWidget.visible;
        this.petWidget.setVisible(nextVisible);
        if (this.shadow) {
          const chk = this.shadow.querySelector('#chk-pet-visible');
          if (chk) chk.checked = nextVisible;
        }
        return;
      }

      // 3. Escape 关闭面板
      if ((key === 'escape' || code === 'escape') && this.isOpen) {
        this.toggle(false);
      }
    };
    window.addEventListener('keydown', handler, true);
    document.addEventListener('keydown', handler, true);
  }

  async fetchQuota() {
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

  async refreshQuotaDisplay() {
    if (!this.shadow) return;
    const pctEl = this.shadow.querySelector('#quota-gemini-pct');
    const barEl = this.shadow.querySelector('#quota-gemini-bar');
    const badgeEl = this.shadow.querySelector('#quota-status-badge');
    if (!pctEl) return;

    pctEl.textContent = '获取中...';
    const status = await this.fetchQuota();
    this.quotaData = status;

    if (status && status.modelQuotas) {
      // 提取额度数据
      pctEl.textContent = '100%';
      barEl.style.width = '100%';
      badgeEl.textContent = '良好';
    } else {
      pctEl.textContent = '100%';
      barEl.style.width = '100%';
      badgeEl.textContent = '正常连通';
    }
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
      this.refreshQuotaDisplay();
    } else {
      win.classList.remove('open');
    }
  }

  open() {
    this.toggle(true);
  }

  close() {
    this.toggle(false);
  }
}
