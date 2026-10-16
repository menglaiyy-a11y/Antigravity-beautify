# Antigravity 界面工程与主题系统总览

本项目为 Google Antigravity 客户端的高阶界面美化、着色器动效、桌面伴侣与系统注入工程。

仓库当前采用双架构平行封存体系，支持在历史完整版（V1）与第二代现代化模块化架构（V2）之间无缝切换。

---

## 📁 架构全景

```text
D:\Antigravity\6\
├── V1盲写版/                     # 第一代单体盲写版（已完整封包归档，100% 自包含）
│   ├── assets/pet_skins/         # 桌面伴侣全套皮肤与序列帧动画
│   ├── tools/                    # CDP 与进程探查辅助工具集
│   ├── ui_panel.js               # 包含 117 个离线动态表情包的 12.8MB 单体捆绑包
│   ├── ui_panel_template.js      # 单体界面与着色器源模版
│   ├── preload_head_snippet.js   # 单体首帧注入与 IPC 桥接
│   ├── desktop_pet.ps1           # 全局桌面伴侣（WPF 独立渲染与置顶互动）
│   ├── start_pet.bat             # 桌面伴侣独立启动脚本（自包含相对路径）
│   ├── stop_pet.bat              # 桌面伴侣独立退出脚本（自包含相对路径）
│   ├── build_ui_panel.ps1        # 单体独立构建脚本
│   └── persist_theme.ps1         # 单体持久化写入脚本
│
├── V2/                           # 第二代现代化工程（解耦拆分，产物仅 131 KB）
│   ├── src/
│   │   ├── core/                 # 状态机与存储桥接（State Machine & Storage Bridge）
│   │   ├── shaders/              # 晶格海洋与全景极光 WebGL 渲染管线
│   │   ├── themes/               # Design Tokens 与 4 模态物理隔离样式表
│   │   ├── components/           # Shadow DOM 沙箱控制面板
│   │   └── assets/               # 静态资源与桌宠皮肤素材
│   ├── build/                    # 现代化编译打包流水线
│   ├── tests/                    # 全矩阵视口驱动测试与 CDP 样式断言套件
│   └── dist/
│       └── ag_v2_bundle.js       # 模块化编译单一产物（超轻量，杜绝掉帧）
│
├── preload_official_baseline.js  # 官方原生纯净 preload.js 基线快照（132 KB）
├── switch_version.bat            # 版本一键无缝切换器（交互式批处理）
├── switch_version.ps1            # 版本一键无缝切换引擎（PowerShell + CDP 热重载）
├── README.md                     # 工程架构全景说明
└── .gitignore                    # Git 忽略规则
```

---

## 🔄 版本一键切换指南

根目录提供直观的切换工具，可在 **V2 现代化版**、**V1 历史完整版** 和 **官方原生纯净版** 之间秒级平滑切换：

### 方法一：双击批处理
双击运行根目录下的 [`switch_version.bat`](file:///D:/Antigravity/6/switch_version.bat)：
- 输入 `1`：切换到 **V2 架构**（推荐：131 KB 极速加载、零掉帧、Shadow DOM 样式隔离）
- 输入 `2`：回退到 **V1 架构**（13.4 MB 历史单体盲写版，自包含桌宠与 117 个表情包）
- 输入 `3`：恢复 **官方原生**（彻底移除注入代码，恢复纯净官方环境）

### 方法二：命令行调用
在 PowerShell 中执行：
```powershell
# 切换到 V2 架构
.\switch_version.ps1 -TargetVersion V2

# 切换到 V1 架构
.\switch_version.ps1 -TargetVersion V1

# 恢复官方纯净原生
.\switch_version.ps1 -TargetVersion Official
```

---

## 🐾 桌面伴侣 (Desktop Pet) 独立运行指南

桌面伴侣支持脱离 Antigravity 主客户端独立运行，亦可在控制台内联动启停：

- **V1 独立运行**：
  进入 [`V1盲写版`](file:///D:/Antigravity/6/V1盲写版)，双击 `start_pet.bat` 即可启动，双击 `stop_pet.bat` 退出。
- **V2 模块化运行**：
  V2 版本已将桌宠素材解耦至 `V2/src/assets/pet_skins/`，后续支持动态替换表情包与皮肤映射。
