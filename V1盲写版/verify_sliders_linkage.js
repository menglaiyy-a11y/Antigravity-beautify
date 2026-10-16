(async () => {
  const results = {};

  const leftEl = document.querySelector('div.bg-sidebar, aside');
  const centerPane = document.querySelector('div[data-pane-id="pane-1"], div[data-testid="conversation-view"]');
  const centerTurn = document.querySelector('div[class*="scroll-mt-4"]');
  const rightEl = document.querySelector('div[data-aux-pane-open="true"], div[data-aux-pane-open]');
  const inputBox = document.getElementById('antigravity.agentSidePanelInputBox');

  const waitTransition = () => new Promise(r => setTimeout(r, 220));

  function sampleStyles(label) {
    return {
      label,
      leftBg: leftEl ? window.getComputedStyle(leftEl).backgroundColor : null,
      centerPaneBg: centerPane ? window.getComputedStyle(centerPane).backgroundColor : null,
      centerTurnBg: centerTurn ? window.getComputedStyle(centerTurn).backgroundColor : null,
      rightBg: rightEl ? window.getComputedStyle(rightEl).backgroundColor : null,
      inputBoxBg: inputBox ? window.getComputedStyle(inputBox).backgroundColor : null,
      backdropFilterRight: rightEl ? window.getComputedStyle(rightEl).backdropFilter : null,
      backdropFilterCenter: centerPane ? window.getComputedStyle(centerPane).backdropFilter : (centerTurn ? window.getComputedStyle(centerTurn).backdropFilter : null)
    };
  }

  // 1. 测试全局联动：25% 透明度
  const slideGlobal = document.getElementById('slide-global-opacity');
  const subtabGlobal = document.getElementById('ag-subtab-global');
  if (subtabGlobal) subtabGlobal.click();
  
  if (slideGlobal) {
    slideGlobal.value = 25;
    slideGlobal.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await waitTransition();
  results.testGlobal25 = sampleStyles('Global 25%');

  // 2. 测试全局联动：75% 透明度
  if (slideGlobal) {
    slideGlobal.value = 75;
    slideGlobal.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await waitTransition();
  results.testGlobal75 = sampleStyles('Global 75%');

  // 3. 测试全局高斯模糊：30px
  const slideBlur = document.getElementById('slide-global-blur');
  if (slideBlur) {
    slideBlur.value = 30;
    slideBlur.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await waitTransition();
  results.testBlur30 = sampleStyles('Blur 30px');

  // 4. 测试独立分栏模式：左 30%，中 55%，右 80%
  const subtabSplit = document.getElementById('ag-subtab-split');
  if (subtabSplit) subtabSplit.click();

  const slideLeft = document.getElementById('slide-left-opacity');
  const slideCenter = document.getElementById('slide-center-opacity');
  const slideRight = document.getElementById('slide-right-opacity');

  if (slideLeft) {
    slideLeft.value = 30;
    slideLeft.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (slideCenter) {
    slideCenter.value = 55;
    slideCenter.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (slideRight) {
    slideRight.value = 80;
    slideRight.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await waitTransition();
  results.testSplit = sampleStyles('Split Mode (Left 30%, Center 55%, Right 80%)');

  // 5. 恢复全局共享模式 (50% 优雅预设，24px 模糊)
  if (subtabGlobal) subtabGlobal.click();
  if (slideGlobal) {
    slideGlobal.value = 50;
    slideGlobal.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (slideBlur) {
    slideBlur.value = 24;
    slideBlur.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await waitTransition();
  results.restoredDefault = sampleStyles('Restored Default Global 50% Blur 24px');

  return results;
})()
