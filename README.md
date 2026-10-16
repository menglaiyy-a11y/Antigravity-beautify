# Antigravity UI 工程中心 (Antigravity-beautify)

本仓库负责 Google Antigravity 客户端的界面美化、深层主题系统、WebGL 晶格动效与桌面伴侣工程。

---

## 目录分代架构 (Project Generations)

### 1. [`V1盲写版/`](file:///D:/Antigravity/6/V1盲写版/)
- **说明**：保存了 V1 阶段的所有原始文件、历史脚本、单文件巨石模板（`ui_panel_template.js`、`preload_head_snippet.js`）、静态表情包图集以及全套图片素材。
- **状态**：**已封存归档**。仅作为历史参照与素材提取源，不再作为主力维护版本。

### 2. [`V2/`](file:///D:/Antigravity/6/V2/)
- **说明**：基于全新工业级规范建立的第二代模块化工程系统。
- **设计标准**：
  - 严格遵循 `D:\Antigravity\2` 及全局技能库中的核心约束；
  - 源码期物理拆分子目录（`core/`, `shaders/`, `themes/`, `components/`, `assets/`）；
  - 底层设计变量（Design Tokens）优先劫持，模态完全物理互斥；
  - 引入现代编译构建流水线，产出自包含单文件 Bundle；
  - 配套基于 CDP 的全矩阵自动化测试驱动与计算样式断言套件。
