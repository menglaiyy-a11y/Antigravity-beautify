/**
 * Antigravity V2 - ControlPanel (Shadow DOM 隔离沙箱控制台)
 * 职责：提供模态切换与材质参数调节面板，完全封装在 Shadow DOM 内部，与宿主双向零样式污染
 */

export class ControlPanel {
  constructor(stateMachine, sunglassesGifBase64 = '') {
    this.stateMachine = stateMachine;
    this.sunglassesGif = sunglassesGifBase64;
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
        width: 340px;
        max-height: 80vh;
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
        transition: opacity 0.2s;
        font-size: 18px;
      }
      .panel-close:hover { opacity: 1; }

      .section-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 6px;
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
        color: #ffffff;
        padding: 10px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        transition: all 0.2s ease;
      }
      .mode-btn:hover {
        background: rgba(255, 255, 255, 0.12);
      }
      .mode-btn.active {
        background: rgba(41, 128, 255, 0.25);
        border-color: #2980ff;
        box-shadow: 0 0 12px rgba(41, 128, 255, 0.35);
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
    `;
    this.shadow.appendChild(style);

    // 4. 构建 DOM 结构
    const currentMode = this.stateMachine.getConfig().mode || 'native';

    const trigger = document.createElement('div');
    trigger.className = 'floating-trigger';
    trigger.title = 'Antigravity V2 控制中心';
    trigger.innerHTML = `<img src="${this.sunglassesGif || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="锁暝" />`;
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
    `;
    this.shadow.appendChild(win);

    // 5. 事件绑定
    win.querySelector('.panel-close').onclick = () => this.toggle(false);

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
      };
    });

    document.body.appendChild(this.host);
  }

  toggle(forceState) {
    if (!this.shadow) return;
    const win = this.shadow.querySelector('.panel-window');
    if (!win) return;
    this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
    if (this.isOpen) {
      win.classList.add('open');
    } else {
      win.classList.remove('open');
    }
  }
}
