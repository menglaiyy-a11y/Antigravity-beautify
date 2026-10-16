/**
 * Antigravity V2 - Computed Styles Assertion Script
 * 职责：提取底层渲染树关键 DOM 节点的计算样式，执行形式化客观断言
 */
(() => {
  const assertions = [];
  function assert(condition, message) {
    assertions.push({ pass: !!condition, message });
  }

  // 1. 结构容器纯透空断言
  const outerPanes = document.querySelectorAll('[data-pane-id="pane-1"], .group\\/pane, [data-testid="chat-turn-container"]');
  outerPanes.forEach((pane, idx) => {
    const cs = window.getComputedStyle(pane);
    assert(
      cs.backdropFilter === 'none' || cs.backdropFilter === '',
      `结构容器[${idx}] backdrop-filter 必须为 none，实测: ${cs.backdropFilter}`
    );
    assert(
      cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent',
      `结构容器[${idx}] 背景必须纯透，实测: ${cs.backgroundColor}`
    );
  });

  // 2. 缩略图与媒体容器生硬黑框断言
  const mediaContainers = document.querySelectorAll('div:has(> img)');
  mediaContainers.forEach((mc, idx) => {
    const cs = window.getComputedStyle(mc);
    assert(
      cs.borderWidth === '0px' || cs.borderColor === 'transparent' || cs.borderColor === 'rgba(0, 0, 0, 0)',
      `缩略图外壳[${idx}] 边框必须透空，实测 borderWidth:${cs.borderWidth}, borderColor:${cs.borderColor}`
    );
  });

  // 3. 悬空吸顶截断横条抑制断言
  const bleedBands = document.querySelectorAll('div.md-sticky-message-bleed');
  bleedBands.forEach((band, idx) => {
    const cs = window.getComputedStyle(band);
    const hidden = cs.display === 'none' || cs.opacity === '0' || cs.visibility === 'hidden' || cs.height === '0px';
    assert(hidden, `吸顶截断横条[${idx}] 必须被隐藏，实测 display:${cs.display}, opacity:${cs.opacity}`);
  });

  // 4. 当前激活模态特征断言
  const currentMode = document.body.getAttribute('data-theme-mode') || 'native';
  const card = document.querySelector('div[class*="scroll-mt-4"]');
  if (card) {
    const cardCs = window.getComputedStyle(card);
    if (currentMode === 'ocean') {
      assert(
        cardCs.backdropFilter === 'none' || cardCs.backdropFilter === '',
        `晶格海洋模式下卡片绝对禁止施加高斯模糊，实测: ${cardCs.backdropFilter}`
      );
    }
  }

  const failed = assertions.filter(a => !a.pass);
  return {
    total: assertions.length,
    passedCount: assertions.length - failed.length,
    failedCount: failed.length,
    passed: failed.length === 0,
    details: assertions
  };
})();
