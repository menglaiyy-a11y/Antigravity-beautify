# Antigravity V2 工程架构 (Modular Architecture)

本目录为 Antigravity 第二代完全解耦与模块化的全新工程系统。

## 目录规划
```
V2/
├── src/
│   ├── core/          # 模态状态机、存储桥接、Token 注入系统
│   ├── shaders/       # 晶格海洋 WebGL 与全景极光着色器模块
│   ├── themes/        # 4 种模态独立物理隔离样式表
│   ├── components/    # 封装于 Shadow DOM 的控制面板与桌面伴侣
│   └── assets/        # 静态资源与表情包结构化资产
├── tests/             # 全矩阵自动化 UI 动作驱动与 CDP 客观断言套件
├── build/             # 自动化编译打包流水线
└── dist/              # 生产级自包含单文件 Bundle 产物
```
