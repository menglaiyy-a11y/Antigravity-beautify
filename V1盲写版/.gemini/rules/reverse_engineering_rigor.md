# 复杂逆向注入与多模态前端工程硬性铁律 (Reverse Engineering & Multi-Modal Theming Rigor Rule)

当你执行涉及界面美化、深层样式重构、Electron 运行时注入、着色器动效叠加或多模态主题系统的编码任务时，必须无条件遵循以下硬性铁律：

## 一、 层叠上下文与透空原则（Stacking Context & Single-Anchor）
1. **严禁外层容器多层叠加背景与高斯模糊**：
   - 布局容器（Pane, ScrollArea, TurnContainer）必须声明为纯结构透空管线（`background: transparent !important; backdrop-filter: none !important; border: none !important;`）。
   - 实体视觉属性必须唯一锚定在单轮内容卡片（Single Card Anchor）上，其内部子元素（Markdown、缩略图、代码块）全部透空继承。
2. **动态粒子/着色器背景下严格禁模糊**：
   - 在晶格海洋等动态 WebGL 高频发光粒子模式下，卡片**绝对禁止施加 `backdrop-filter: blur(...)`**，杜绝数学卷积均值化导致画面退化为浑浊灰块。仅允许使用 $\alpha \le 0.15$ 的极轻微透底衬。

## 二、 模态互斥与 Token 拓扑控制（Modality Mutex & Token Theming）
1. **严格物理隔离**：
   - 原生模式（`native`）、晶格海洋（`ocean`）、全景极光（`aurora`）、自定义（`custom`）4 种模式在样式根部必须完全互斥（以 `body[data-theme-mode="..."]` 为前缀），严禁编写未限定模态范围的全局破坏性选择器。
2. **优先劫持底层 CSS Variables**：
   - 优先在模态根节点重写核心 Design Tokens（如 `--background`, `--card`, `--sidebar`, `--muted`），以点带面统领全组件，严禁在数百个叶子类名上写死硬编码覆盖。
3. **剪枝先行原则**：
   - 严禁为了覆盖现有错误而盲目追加 `!important` 补丁。新规则生效前，必须清理旧有冲突与冗余代码。

## 三、 全矩阵自动化驱动测试（Full-Matrix Viewport Test Driver）
1. **严禁仅测单一主视口**：
   - 必须通过自动化脚本主动模拟点击驱动，完整验证：【4 种主题模态】 × 【3 种会话状态】 × 【4 种图层视口（主对话视口、设置二级弹窗、侧边栏项目下拉、滚动吸顶横条）】。
2. **Portal 动态挂载显式等待**：
   - 对于 React Portal 挂载的二级弹窗和浮层，必须显式触发打开事件并在 DOM 稳定后截取独立视口。

## 四、 客观断言与基准差分（Computed Style & Pixel Assertion）
1. **严禁凭肉眼无基准放行**：
   - 必须保留官方纯净原生界面（Gold Master Baseline）进行比对，严禁在确认偏差下只看局部修改点而放过视口中央的大面积浑浊灰雾或生硬黑框。
2. **强制 CDP 计算样式形式化断言**：
   - 必须执行自动化断言脚本，校验关键 DOM 节点的 `window.getComputedStyle` 属性（确认 `backdropFilter === 'none'`，缩略图 `backgroundColor === 'transparent'`，吸顶截断条彻底隐藏）。

## 五、 源码期子工程解耦（Modular Sub-Project Architecture）
1. **禁止巨石单文件泥潭**：
   - 源码期必须按业务域物理拆分子目录（`core/`, `shaders/`, `themes/`, `components/`, `pet/`, `assets/`），通过打包编译流水线生成最终注入 Bundle，禁止直接在业务逻辑中混杂数十兆静态素材。
2. **独立 UI 沙箱化**：
   - 自定义控制面板与桌宠组件必须封装在独立的 Shadow DOM 容器内，杜绝与宿主双向样式污染。
