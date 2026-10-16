(async () => {
  const results = [];
  function assert(name, condition, extra = '') {
    results.push({ name, passed: Boolean(condition), extra: String(extra) });
  }

  // 1. 验证核心命名空间与挂载
  assert('命名空间 __ag_v2_theme 正常装配', window.__ag_v2_theme && window.__ag_v2_theme.version === '2.0.0');
  assert('兼容接口 window.agVisualPanel 挂载正常', window.agVisualPanel && typeof window.agVisualPanel.open === 'function' && typeof window.agVisualPanel.fetchQuota === 'function');
  
  const panelHost = document.getElementById('ag-control-panel-host');
  const petHost = document.getElementById('ag-pet-widget-host');
  assert('控制面板 Shadow DOM 宿主存在', Boolean(panelHost && panelHost.shadowRoot));
  assert('桌面伴侣 Shadow DOM 宿主存在', Boolean(petHost && petHost.shadowRoot));

  const api = window.__ag_v2_theme;
  const panel = api.controlPanel;
  const pet = api.petWidget;

  // 2. 验证拖拽控制器初始化
  assert('总控悬浮球 DragController 正常绑定', Boolean(panel.dragController));
  assert('桌面伴侣 DragController 正常绑定', Boolean(pet.dragController));

  // 3. 验证快捷键事件联动
  panel.close();
  const altTEvent = new KeyboardEvent('keydown', { key: 't', code: 'KeyT', altKey: true, bubbles: true });
  window.dispatchEvent(altTEvent);
  assert('Alt+T 成功呼出控制面板', panel.isOpen === true);

  const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true });
  window.dispatchEvent(escEvent);
  assert('Escape 成功关闭控制面板', panel.isOpen === false);

  const initPetVis = pet.visible;
  const petKeydown = new KeyboardEvent('keydown', { key: 'p', code: 'KeyP', ctrlKey: true, shiftKey: true, bubbles: true });
  window.dispatchEvent(petKeydown);
  assert('Ctrl+Shift+P 成功切换桌宠显隐', pet.visible === !initPetVis);

  // 4. 验证桌宠双击唤起控制面板
  pet.setVisible(true);
  const petContainer = petHost.shadowRoot.querySelector('.pet-container');
  if (petContainer) {
    petContainer.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    assert('桌宠双击成功呼出控制面板', panel.isOpen === true);
  } else {
    assert('桌宠双击触发检查', false, '未找到 pet-container');
  }

  // 5. 验证气泡单击交互
  if (petContainer) {
    pet.handleInteractiveClick();
    const bubble = petHost.shadowRoot.querySelector('#pet-bubble');
    assert('桌宠单击气泡展示文本正常', Boolean(bubble && bubble.textContent && bubble.textContent.length > 0), bubble ? bubble.textContent : '');
  }

  // 6. 验证流体极光模式动态 CSS Token 联动
  api.setMode('aurora');
  document.documentElement.style.setProperty('--ag-glass-blur', '28px');
  document.documentElement.style.setProperty('--ag-card-opacity', '0.42');
  // 等待 tokens_base.css 中 250ms 的 background-color 过渡动画完全到达稳态
  await new Promise(r => setTimeout(r, 320));
  const card = document.querySelector('div[class*="scroll-mt-4"]');
  if (card) {
    const cs = window.getComputedStyle(card);
    assert('流体极光卡片 blur 动态联动', cs.backdropFilter.includes('28px'), cs.backdropFilter);
    assert('流体极光卡片 opacity 动态联动', cs.backgroundColor.includes('0.42'), cs.backgroundColor);
  } else {
    assert('流体极光卡片元素存在', false);
  }

  // 7. 验证晶格海洋模式切换与无掉帧管线运行
  api.setMode('ocean');
  await new Promise(r => requestAnimationFrame(r));
  assert('晶格海洋当前运行状态为 true', api.oceanRenderer.running === true);
  assert('晶格海洋中栏 Canvas 处于 display block', document.getElementById('ag-center-ocean-canvas').style.display === 'block');

  // 保持桌宠与控制面板处于打开状态便于截图
  panel.open();
  pet.setVisible(true);

  return results;
})();
