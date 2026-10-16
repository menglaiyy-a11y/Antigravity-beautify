/**
 * Antigravity V2 - DragController (拖拽与边缘吸附阻尼控制器)
 * 职责：
 * 1. 精准分离点击与拖拽手势，位移 < 6px 判定为点击，彻底避免误触发
 * 2. 纯 GPU 硬件加速移动 (transform: translate3d)，保持 120 FPS 无重排
 * 3. 视口边界钳制与边缘弹性磁吸阻尼 (Snap-to-Edge)
 * 4. 吸附位置状态持久化与自愈恢复
 */

export class DragController {
  constructor(element, options = {}) {
    this.element = element;
    this.storageKey = options.storageKey || null;
    this.snapThreshold = options.snapThreshold || 48;
    this.edgeMargin = options.edgeMargin || 16;
    this.onClick = options.onClick || (() => {});
    this.onDragEnd = options.onDragEnd || (() => {});

    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.initialLeft = 0;
    this.initialTop = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.pointerId = null;

    this.init();
  }

  init() {
    if (!this.element) return;
    this.element.style.touchAction = 'none';
    this.restorePosition();

    this.element.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    window.addEventListener('resize', () => this.clampToViewport());
  }

  restorePosition() {
    if (!this.storageKey) return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const pos = JSON.parse(raw);
        if (typeof pos.x === 'number' && typeof pos.y === 'number') {
          this.applyPosition(pos.x, pos.y, false);
          return;
        }
      }
    } catch (e) {}
  }

  savePosition(x, y) {
    if (!this.storageKey) return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({ x, y }));
    } catch (e) {}
  }

  applyPosition(x, y, animate = true) {
    const maxX = Math.max(0, window.innerWidth - (this.element.offsetWidth || 48) - this.edgeMargin);
    const maxY = Math.max(0, window.innerHeight - (this.element.offsetHeight || 48) - this.edgeMargin);
    const clampedX = Math.max(this.edgeMargin, Math.min(x, maxX));
    const clampedY = Math.max(this.edgeMargin, Math.min(y, maxY));

    this.currentX = clampedX;
    this.currentY = clampedY;

    if (animate) {
      this.element.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease';
    } else {
      this.element.style.transition = 'none';
    }

    this.element.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
  }

  onPointerDown(e) {
    if (e.button !== 0) return; // 仅响应鼠标主键 / 触控
    this.isDragging = false;
    this.pointerId = e.pointerId;
    this.startX = e.clientX;
    this.startY = e.clientY;

    const rect = this.element.getBoundingClientRect();
    this.initialLeft = rect.left;
    this.initialTop = rect.top;
    this.element.style.transition = 'none';
  }

  onPointerMove(e) {
    if (this.pointerId === null || e.pointerId !== this.pointerId) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    const dist = Math.hypot(dx, dy);

    if (!this.isDragging && dist >= 6) {
      this.isDragging = true;
      try { this.element.setPointerCapture(this.pointerId); } catch (err) {}
      this.element.classList.add('is-dragging');
    }

    if (this.isDragging) {
      const targetX = this.initialLeft + dx;
      const targetY = this.initialTop + dy;
      this.currentX = targetX;
      this.currentY = targetY;
      this.element.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    }
  }

  onPointerUp(e) {
    if (this.pointerId === null || e.pointerId !== this.pointerId) return;
    try { this.element.releasePointerCapture(this.pointerId); } catch (err) {}
    this.pointerId = null;
    this.element.classList.remove('is-dragging');

    if (!this.isDragging) {
      // 触发纯点击事件
      this.onClick(e);
      return;
    }

    this.isDragging = false;
    this.snapToEdge();
  }

  snapToEdge() {
    const width = this.element.offsetWidth || 48;
    const winWidth = window.innerWidth;
    const distLeft = this.currentX;
    const distRight = winWidth - (this.currentX + width);

    let finalX = this.currentX;
    if (distLeft < distRight) {
      // 靠近左边缘
      finalX = this.edgeMargin;
      this.element.classList.add('snapped-left');
      this.element.classList.remove('snapped-right');
    } else {
      // 靠近右边缘
      finalX = winWidth - width - this.edgeMargin;
      this.element.classList.add('snapped-right');
      this.element.classList.remove('snapped-left');
    }

    this.applyPosition(finalX, this.currentY, true);
    this.savePosition(finalX, this.currentY);
    this.onDragEnd({ x: finalX, y: this.currentY });
  }

  clampToViewport() {
    this.applyPosition(this.currentX, this.currentY, false);
  }
}
