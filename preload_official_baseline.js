"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Preload script — runs in every BrowserWindow before the page loads.
 * Exposes a minimal, secure API via contextBridge so the renderer can
 * communicate with the main-process auto-updater without nodeIntegration.
 */
const electron_1 = require("electron");


const updaterAPI = {
    onStateChanged: (callback) => {
        const handler = (_event, state) => {
            callback(state);
        };
        electron_1.ipcRenderer.on('updater:state-changed', handler);
        // Return unsubscribe function
        return () => {
            electron_1.ipcRenderer.removeListener('updater:state-changed', handler);
        };
    },
    applyUpdate: () => electron_1.ipcRenderer.invoke('updater:apply'),
    quitAndInstall: () => electron_1.ipcRenderer.invoke('updater:quit-and-install'),
    checkForUpdates: () => electron_1.ipcRenderer.invoke('updater:check-for-updates'),
    getState: () => electron_1.ipcRenderer.invoke('updater:get-state'),
};
const dialogAPI = {
    showOpenDialog: () => electron_1.ipcRenderer.invoke('dialog:open-workspace'),
    showOpenMultipleFolderDialog: () => electron_1.ipcRenderer.invoke('dialog:open-workspaces'),
};
const notificationAPI = {
    send: (options) => electron_1.ipcRenderer.invoke('notification:send', options),
    openSystemPreferences: () => electron_1.ipcRenderer.invoke('notification:open-system-preferences'),
    onClicked: (callback) => {
        const handler = (_event, payload) => {
            callback(payload);
        };
        electron_1.ipcRenderer.on('notification:clicked', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('notification:clicked', handler);
        };
    },
};
const storageAPI = {
    getItems: () => electron_1.ipcRenderer.invoke('storage:get-items'),
    updateItems: (changes) => electron_1.ipcRenderer.invoke('storage:update-items', changes),
    onChanged: (callback) => {
        const handler = (_event, changes) => {
            callback(changes);
        };
        electron_1.ipcRenderer.on('storage:changed', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('storage:changed', handler);
        };
    },
};
const logsAPI = {
    getElectronLogs: () => electron_1.ipcRenderer.invoke('logs:electron'),
};
const extensionsAPI = {
    sendAuthorities: (authoritiesMap) => electron_1.ipcRenderer.invoke('extensions:send-authorities', authoritiesMap),
};
const deepLinkAPI = {
    onDeepLink: (callback) => {
        const handler = (_event, url) => {
            callback(url);
        };
        electron_1.ipcRenderer.on('deep-link', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('deep-link', handler);
        };
    },
    getStoredDeepLink: () => electron_1.ipcRenderer.invoke('deep-link:get-stored'),
};
const agentAPI = {
    updateActiveAgentCount: (count) => electron_1.ipcRenderer.invoke('agent:update-active-count', count),
};
const electronNativeAPI = {
    getZoomLevel: () => electron_1.webFrame.getZoomFactor(),
    getPathForFile: (file) => electron_1.webUtils.getPathForFile(file),
    setTitleBarOverlay: (options) => electron_1.ipcRenderer.invoke('window:set-title-bar-overlay', options),
    minimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
    maximize: () => electron_1.ipcRenderer.invoke('window:maximize'),
    unmaximize: () => electron_1.ipcRenderer.invoke('window:unmaximize'),
    isMaximized: () => electron_1.ipcRenderer.invoke('window:is-maximized'),
    close: () => electron_1.ipcRenderer.invoke('window:close'),
    toggleDevTools: () => electron_1.ipcRenderer.invoke('window:toggle-devtools'),
    zoomIn: () => {
        void electron_1.ipcRenderer.invoke('window:zoom-in');
    },
    zoomOut: () => {
        void electron_1.ipcRenderer.invoke('window:zoom-out');
    },
    resetZoom: () => {
        void electron_1.ipcRenderer.invoke('window:reset-zoom');
    },
    openExternal: (url) => electron_1.ipcRenderer.invoke('shell:open-external', url),
    revealInFilePicker: (path) => electron_1.ipcRenderer.invoke('shell:reveal-in-file-picker', path),
    showContextMenu: (items) => electron_1.ipcRenderer.invoke('window:show-context-menu', items),
    closeContextMenu: () => electron_1.ipcRenderer.invoke('window:close-context-menu'),
    startPet: () => electron_1.ipcRenderer.invoke('pet:start'),
    stopPet: () => electron_1.ipcRenderer.invoke('pet:stop'),
    getPetStatus: () => electron_1.ipcRenderer.invoke('pet:status'),
};
const ideAPI = {
    isInstalled: () => electron_1.ipcRenderer.invoke('ide:is-installed'),
};
const wslAPI = {
    getState: () => electron_1.ipcRenderer.invoke('wsl:get-state'),
    connect: (distro) => electron_1.ipcRenderer.invoke('wsl:connect', distro),
};
electron_1.contextBridge.exposeInMainWorld('electronUpdater', updaterAPI);
electron_1.contextBridge.exposeInMainWorld('dialog', dialogAPI);
electron_1.contextBridge.exposeInMainWorld('nativeNotifications', notificationAPI);
electron_1.contextBridge.exposeInMainWorld('nativeStorage', storageAPI);
electron_1.contextBridge.exposeInMainWorld('logs', logsAPI);
electron_1.contextBridge.exposeInMainWorld('extensions', extensionsAPI);
electron_1.contextBridge.exposeInMainWorld('deepLink', deepLinkAPI);
electron_1.contextBridge.exposeInMainWorld('agent', agentAPI);
electron_1.contextBridge.exposeInMainWorld('electronNative', electronNativeAPI);
electron_1.contextBridge.exposeInMainWorld('ide', ideAPI);
electron_1.contextBridge.exposeInMainWorld('wsl', wslAPI);

;
// === Antigravity Simplified Chinese Localization ===
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.__AGY_ZH_CN_ACTIVE__ = true;

  // 1. 精确词条映射表（忽略首尾空白，支持大小写精确匹配与不区分大小写回退）
  const RAW_MAP = {
    // === 顶部栏、侧边栏与主导航 ===
    "Antigravity": "Antigravity",
    "New Conversation": "新建对话",
    "New conversation": "新建对话",
    "New Chat": "新建对话",
    "New Window": "新建窗口",
    "New Thread": "新建会话",
    "Start a new conversation": "开始新对话",
    "Start Conversation": "开始对话",
    "Conversation History": "对话历史",
    "Conversations": "对话列表",
    "Conversation": "对话",
    "Search Conversations": "搜索对话",
    "Search conversations": "搜索对话",
    "Search conversations...": "搜索对话...",
    "No conversations": "暂无对话",
    "No conversations found": "未找到匹配的对话",
    "No matching conversations": "无匹配对话",
    "Scheduled Tasks": "计划任务",
    "Automations": "自动化任务",
    "Automation": "自动化",
    "UI Plugins": "界面插件",
    "Plugins": "插件",
    "Customizations": "自定义配置",
    "Customization": "自定义",
    "Projects": "项目列表",
    "Project": "项目",
    "Workspaces": "工作区",
    "Workspace": "工作区",
    "No workspaces": "暂无工作区",
    "Outside of Project": "项目外对话",
    "Outside of project": "项目外对话",
    "Scratchpad": "临时草稿区",
    "Settings": "设置",
    "Open Settings": "打开设置",
    "Close Settings": "关闭设置",
    "Back to app": "返回应用",
    "Back": "返回",
    "Provide Feedback": "提交反馈",
    "Send Feedback": "发送反馈",
    "Feedback": "意见反馈",
    "Toggle Sidebar": "切换侧边栏",
    "Toggle Left Sidebar": "切换左侧边栏",
    "Toggle Right Sidebar": "切换右侧边栏",
    "Toggle Auxiliary Pane": "切换辅助面板",
    "Toggle Terminal": "切换终端面板",
    "Toggle Editor": "切换编辑器",
    "Toggle Browser": "切换内置浏览器",
    "Open Folder": "打开文件夹",
    "Open Folder...": "打开文件夹...",
    "Open Workspace": "打开工作区",
    "Add Workspace": "添加工作区",
    "Add Project": "添加项目",
    "Remove Project": "移除项目",
    "Remove Workspace": "移除工作区",
    "Switch Project": "切换项目",
    "Switch Workspace": "切换工作区",
    "Pinned": "已置顶",
    "Pin": "置顶",
    "Unpin": "取消置顶",
    "Pin Conversation": "置顶对话",
    "Unpin Conversation": "取消置顶对话",
    "Archived": "已归档",
    "Archive": "归档",
    "Unarchive": "取消归档",
    "Archive Conversation": "归档对话",
    "Delete Conversation": "删除对话",
    "Rename Conversation": "重命名对话",
    "Duplicate Conversation": "复制对话",
    "Share Conversation": "分享对话",
    "Export Conversation": "导出对话",
    "Mark as Read": "标为已读",
    "Mark as Unread": "标为未读",
    "Today": "今天",
    "Yesterday": "昨天",
    "Previous 7 Days": "过去 7 天",
    "Previous 30 Days": "过去 30 天",
    "Last 7 Days": "最近 7 天",
    "Last 30 Days": "最近 30 天",
    "This Week": "本周",
    "This Month": "本月",
    "Older": "更早",
    "All": "全部",
    "Active": "进行中",
    "Completed": "已完成",
    "Recent": "最近",
    "Favorites": "收藏",
    "Show more": "显示更多",
    "Show less": "收起",
    "Load more": "加载更多",
    "Collapse": "折叠",
    "Expand": "展开",
    "Collapse All": "全部折叠",
    "Expand All": "全部展开",
    "Filter": "筛选",
    "Sort by": "排序方式",
    "Refresh": "刷新",
    "Reload": "重新加载",
    "Close": "关闭",
    "Close All": "全部关闭",
    "Close Others": "关闭其他",

    // === 提问输入框 (Prompt Input Box) 与工具栏 ===
    "Ask anything, @ to mention, / for actions": "输入任何问题，输入 @ 引用上下文，输入 / 调用指令",
    "Ask anything, @ to mention": "输入任何问题，输入 @ 引用上下文",
    "Ask anything...": "输入任何问题...",
    "Ask anything": "输入任何问题",
    "Message subagent, @ to mention, / for actions": "向子智能体发送消息，@ 引用上下文，/ 调用指令",
    "Message subagent, @ to mention": "向子智能体发送消息，@ 引用上下文",
    "Message subagent...": "向子智能体发送消息...",
    "Reply...": "输入回复...",
    "Type a message...": "输入消息...",
    "Send a message...": "发送消息...",
    "Follow up...": "继续追问...",
    "Ask a follow-up question...": "输入追问内容...",
    "Add context": "添加上下文",
    "Add Context": "添加上下文",
    "Attach file": "添加附件",
    "Attach File": "添加附件",
    "Attach files": "添加文件",
    "Attach image": "添加图片",
    "Upload file": "上传文件",
    "Upload image": "上传图片",
    "Voice input": "语音输入",
    "Start voice input": "开始语音输入",
    "Stop recording": "停止录音",
    "Send": "发送",
    "Send message": "发送消息",
    "Queue message": "排队发送消息",
    "Queue": "加入队列",
    "Queued": "排队中",
    "Queued Messages": "排队中的消息",
    "Stop": "停止",
    "Stop generating": "停止生成",
    "Stop response": "停止回复",
    "Stop Agent": "停止智能体",
    "Interrupt": "中断",
    "Retry": "重试",
    "Regenerate": "重新生成",
    "Edit": "编辑",
    "Edit message": "编辑消息",
    "Copy": "复制",
    "Copied": "已复制",
    "Copied!": "已复制！",
    "Copy code": "复制代码",
    "Copy message": "复制消息",
    "Copy link": "复制链接",
    "Copy path": "复制路径",
    "Paste": "粘贴",
    "Clear": "清空",
    "Reset": "重置",
    "Save": "保存",
    "Save Changes": "保存更改",
    "Saved": "已保存",
    "Discard": "放弃",
    "Discard Changes": "放弃更改",
    "Apply": "应用",
    "Accept": "接受",
    "Accept All": "全部接受",
    "Reject": "拒绝",
    "Reject All": "全部拒绝",
    "Proceed": "继续执行",
    "Review": "审阅",
    "Review Changes": "审阅更改",
    "View Diff": "查看差异",
    "Open in Editor": "在编辑器中打开",
    "Open in Terminal": "在终端中打开",
    "Reveal in File Explorer": "在文件资源管理器中显示",
    "Reveal in Explorer": "在资源管理器中显示",

    // === 模式选择、模型与推理强度 ===
    "Mode": "运行模式",
    "Select mode": "选择模式",
    "Fast": "快速 (Fast)",
    "Planning": "规划 (Planning)",
    "Plan": "规划",
    "Autonomous": "自主执行 (Autonomous)",
    "Autonomous Mode": "自主执行模式 (Autonomous)",
    "Best-of-N": "多路优选 (Best-of-N)",
    "Best of N": "多路优选 (Best-of-N)",
    "Battle Mode": "对战评测模式 (Battle Mode)",
    "Model": "模型",
    "Models": "模型",
    "Select model": "选择模型",
    "Select a model": "选择模型",
    "Auto": "自动 (Auto)",
    "Default": "默认",
    "Thinking Level": "思考深度",
    "Thinking level": "思考深度",
    "Reasoning Effort": "推理强度",
    "High": "高 (High)",
    "Medium": "中 (Medium)",
    "Low": "低 (Low)",
    "Minimal": "极简 (Minimal)",
    "None": "无",
    "Off": "关闭",
    "On": "开启",
    "Experimental": "实验性",
    "Beta": "测试版",
    "New": "新功能",
    "Recommended": "推荐",
    "(Recommended)": "（推荐）",
    "Default model": "默认模型",

    // === @ 引用与 / 斜杠命令弹窗 ===
    "Search...": "搜索...",
    "Search": "搜索",
    "Search files...": "搜索文件...",
    "Search symbols...": "搜索符号...",
    "Search commands...": "搜索命令...",
    "Search customizations...": "搜索自定义项...",
    "Search tasks...": "搜索任务...",
    "Search plugins...": "搜索插件...",
    "Search automations...": "搜索自动化任务...",
    "Search flags": "搜索实验性标志...",
    "Search flags...": "搜索实验性标志...",
    "Search settings...": "搜索设置...",
    "No results found": "未找到结果",
    "No results": "无结果",
    "No matches": "无匹配项",
    "No items": "暂无内容",
    "Loading...": "正在加载...",
    "Loading": "加载中",
    "Files": "文件",
    "File": "文件",
    "Folders": "文件夹",
    "Folder": "文件夹",
    "Symbols": "代码符号",
    "Code Context": "代码上下文",
    "Rules": "规则 (Rules)",
    "Rule": "规则",
    "Skills": "技能 (Skills)",
    "Skill": "技能",
    "Subagents": "子智能体 (Subagents)",
    "Subagent": "子智能体",
    "Agents": "智能体",
    "Agent": "智能体",
    "Hooks": "钩子 (Hooks)",
    "Hook": "钩子",
    "MCP Servers": "MCP 服务器",
    "MCP Server": "MCP 服务器",
    "MCP": "MCP 服务",
    "Terminal": "终端",
    "Terminals": "终端",
    "Google Drive": "Google 云端硬盘",
    "Web": "网页",
    "Browser": "浏览器",
    "Git": "Git 版本控制",
    "Diff": "代码差异",
    "Problems": "问题诊断",
    "Output": "输出",
    "Debug Console": "调试控制台",
    "Ports": "端口",
    "Artifacts": "生成文档 (Artifacts)",
    "Artifact": "生成文档",
    "Ask a quick question without interrupting the main conversation.": "在不中断主对话的情况下快速提问。",
    "Quick question": "快速提问",
    "Side question": "旁路提问",

    // === 聊天画布、思考状态、工具步骤与权限审批 ===
    "Thinking": "思考中",
    "Thinking...": "正在思考...",
    "Thought Process": "思考过程",
    "Thought": "已思考",
    "Working": "正在执行",
    "Working...": "正在执行...",
    "Worked": "已执行",
    "Done": "已完成",
    "Completed": "已完成",
    "Failed": "失败",
    "Error": "错误",
    "Warning": "警告",
    "Info": "提示",
    "Canceled": "已取消",
    "Cancelled": "已取消",
    "Aborted": "已中止",
    "Skipped": "已跳过",
    "Pending": "等待中",
    "Running": "正在运行",
    "Running...": "正在运行...",
    "Running command": "正在运行命令",
    "Ran command": "已运行命令",
    "Command": "命令",
    "Background task": "后台任务",
    "Background Tasks": "后台任务",
    "Waiting for user input": "等待用户输入",
    "Waiting for approval": "等待审批确认",
    "Waiting for confirmation": "等待确认",
    "Needs attention": "需要关注",
    "Action required": "需要操作",
    "Blocked, needs input": "已暂停，等待输入",
    "No subagents": "暂无子智能体",
    "Stop Subagent": "停止子智能体",
    "View Subagent": "查看子智能体",
    "Subagent Transcript": "子智能体执行记录",
    "Approve": "批准",
    "Approve All": "全部批准",
    "Deny": "拒绝",
    "Deny All": "全部拒绝",
    "Allow": "允许",
    "Always Allow": "始终允许",
    "Allow Once": "允许一次",
    "Allow this time": "仅本次允许",
    "Always allow": "始终允许",
    "Reject": "拒绝",
    "Configure": "配置",
    "Skip": "跳过",
    "Skip All": "全部跳过",
    "Submit": "提交",
    "Continue": "继续",
    "Cancel": "取消",
    "Confirm": "确认",
    "OK": "确定",
    "Yes": "是",
    "No": "否",
    "Proceed Anyway": "仍然继续",
    "Check again": "重新检查",
    "Checking...": "正在检查...",
    "Try Again": "重试",
    "Retry": "重试",
    "Dismiss": "忽略",
    "Learn more": "了解更多",
    "Learn More": "了解更多",
    "Documentation": "说明文档",
    "Docs": "文档",
    "View Docs": "查看文档",
    "Show details": "显示详情",
    "Hide details": "隐藏详情",
    "View details": "查看详情",
    "Full Error": "完整错误信息",
    "Details": "详情",
    "Details: ": "详情：",
    "Multi-select": "多选",
    "Other (write your answer)": "其他（请填写您的回答）",
    "(tell the agent what to do instead)": "（告诉智能体您希望怎么做）",
    "Yes, allow this time": "是的，仅本次允许",
    "Yes, allow": "是的，允许执行",
    "No, deny": "不，拒绝执行",
    "Explored": "已探索",
    "Exploring": "正在探索",
    "Searched": "已搜索",
    "Searching": "正在搜索",
    "Read": "已读取",
    "Reading": "正在读取",
    "Viewed": "已查看",
    "Viewing": "正在查看",
    "Edited": "已编辑",
    "Editing": "正在编辑",
    "Created": "已创建",
    "Creating": "正在创建",
    "Deleted": "已删除",
    "Deleting": "正在删除",
    "Analyzed": "已分析",
    "Analyzing": "正在分析",
    "Wrote": "已写入",
    "Writing": "正在写入",

    // === 设置界面 (Settings) - 左侧导航栏与大标题 ===
    "Account": "账户与认证",
    "General": "常规设置",
    "Appearance": "外观与主题",
    "Models & Usage": "模型与用量",
    "Notifications": "通知与提醒",
    "App": "应用设置",
    "Application": "应用程序",
    "Shortcuts": "键盘快捷键",
    "Keyboard Shortcuts": "键盘快捷键",
    "Tab": "Tab 补全",
    "Editor": "代码编辑器",
    "Editor Settings": "编辑器设置",
    "Developer": "开发者选项",
    "Advanced": "高级设置",
    "Permissions": "权限管理",
    "Global Permissions": "全局权限",
    "Local Permissions": "当前工作区权限",
    "Permission Settings": "权限设置",
    "Network Permissions": "网络访问权限",
    "Terminal & Tooling Permissions": "终端与工具权限",
    "Tool Permissions": "工具调用权限",
    "File Permissions": "文件读写权限",
    "Agent Behavior": "智能体行为",
    "Agent Settings": "智能体设置",
    "Workspace Settings": "工作区设置",
    "Project 4K": "Project 4K 实验特性",
    "About": "关于",

    // === 设置界面 - 账户与通用操作 ===
    "Sign In": "登录",
    "Sign in": "登录",
    "Sign Out": "退出登录",
    "Sign out": "退出登录",
    "Log In": "登录",
    "Log Out": "退出登录",
    "Switch Account": "切换账户",
    "Manage Account": "管理账户",
    "Upgrade": "升级套餐",
    "Upgrade Plan": "升级订阅计划",
    "Manage Subscription": "管理订阅",
    "Subscription": "订阅计划",
    "Plan": "当前计划",
    "Usage": "使用额度",
    "Quota": "配额",
    "Reset to Default": "恢复默认",
    "Reset to defaults": "恢复默认设置",
    "Restore Defaults": "恢复默认值",
    "Check for Updates": "检查更新",
    "Checking for updates...": "正在检查更新...",
    "Update Available": "发现可用更新",
    "Up to date": "已是最新版本",
    "Restart to Update": "重启以完成更新",
    "Version": "版本",

    // === 设置界面 - 外观与通用配置项 ===
    "Theme": "界面主题",
    "Color Theme": "色彩主题",
    "Appearance Theme": "外观主题",
    "Light": "浅色模式 (Light)",
    "Dark": "深色模式 (Dark)",
    "System": "跟随系统 (System)",
    "Follow System": "跟随系统",
    "Font Size": "字体大小",
    "Font Family": "字体族",
    "Line Height": "行高",
    "Zoom": "界面缩放",
    "Zoom Level": "缩放级别",
    "Zoom In": "放大",
    "Zoom Out": "缩小",
    "Reset Zoom": "重置缩放",
    "Language": "语言",
    "Compact Mode": "紧凑模式",
    "Word Wrap": "自动换行",
    "Minimap": "代码缩略图 (Minimap)",
    "Line Numbers": "显示行号",
    "Format on Save": "保存时自动格式化",
    "Auto Save": "自动保存",

    // === 设置界面 - 详细配置项（来自 slices 1/2/3） ===
    "Artifact Review Policy": "生成文档 (Artifact) 审阅策略",
    "Control when the agent requests review for implementation plans and artifacts.": "控制智能体在生成实施计划与文档何时请求人工审阅。",
    "Always Proceed": "始终自动继续",
    "Agent Decides": "由智能体自行决定",
    "Request Review": "始终请求人工审阅",
    "Terminal Execution Policy": "终端命令执行策略",
    "Terminal Auto Execution": "终端命令自动执行策略",
    "Control whether the agent can execute terminal commands without asking for confirmation.": "控制智能体是否无需确认即可自动运行终端命令。",
    "Always Ask": "每次询问",
    "Ask": "询问确认",
    "Auto-execute": "自动执行",
    "Turbo": "极速模式（全部自动执行）",
    "Allow List": "命令白名单 (Allow List)",
    "Allowlist": "允许列表 (白名单)",
    "Deny List": "命令黑名单 (Deny List)",
    "Denylist": "禁止列表 (黑名单)",
    "Allowed Commands": "允许自动执行的命令",
    "Denied Commands": "禁止执行的命令",
    "Add Command": "添加命令",
    "Add Pattern": "添加匹配规则",
    "Add Rule": "添加规则",
    "Add URL": "添加网址",
    "Allowed URLs": "允许访问的网址",
    "Blocked URLs": "禁止访问的网址",
    "File Access": "文件访问权限",
    "Workspace Files Only": "仅限工作区内文件",
    "All Files": "所有文件",
    "External Files": "工作区外文件",
    "Gitignore Access": "访问 .gitignore 忽略的文件",
    "Non-Workspace File Access": "非工作区文件访问权限",
    "Allow agent to read and edit files outside the current workspace": "允许智能体读取和编辑当前工作区以外的文件",
    "Allow agent to access files ignored by git": "允许智能体访问被 Git 忽略的文件",
    "Browser Settings": "内置浏览器设置",
    "Enable Browser": "启用内置浏览器",
    "Browser Execution Policy": "浏览器操作执行策略",
    "Allow agent to interact with web pages automatically": "允许智能体自动与网页进行交互",
    "Headless Mode": "无头模式 (Headless)",
    "Desktop Notifications": "桌面系统通知",
    "Enable Notifications": "启用通知提醒",
    "Notification Sound": "通知提示音",
    "Play sound when agent finishes or needs input": "当智能体完成任务或需要输入时播放提示音",
    "Notify on Completion": "任务完成时通知",
    "Notify on Permission Request": "请求权限审批时通知",
    "Notify on Error": "发生错误时通知",
    "Startup Behavior": "启动时行为",
    "Launch on Startup": "开机自动启动",
    "Reopen last workspace on startup": "启动时重新打开上次的工作区",
    "Send Usage Statistics": "发送匿名使用统计",
    "Telemetry": "遥测与诊断数据",
    "Crash Reports": "崩溃报告",
    "Enable Tab Autocomplete": "启用 Tab 代码自动补全",
    "Autocomplete": "自动补全",
    "Suggestions": "补全建议",
    "Inline Suggestions": "行内补全建议",
    "Developer Mode": "开发者模式",
    "Enable Developer Tools": "启用开发者工具",
    "Open DevTools": "打开开发者工具 (DevTools)",
    "View Logs": "查看运行日志",
    "Open Log Folder": "打开日志文件夹",
    "Clear Cache": "清除缓存",
    "Experimental Flags": "实验性功能标志 (Flags)",
    "Reset All Flags": "重置所有实验标志",

    // === 自定义配置 (Customizations) 与自动化 (Automations) ===
    "Create New": "新建",
    "Create": "创建",
    "New Skill": "新建技能 (Skill)",
    "New Rule": "新建规则 (Rule)",
    "New Subagent": "新建子智能体 (Subagent)",
    "New Plugin": "新建插件 (Plugin)",
    "New Automation": "新建自动化任务",
    "Add MCP Server": "添加 MCP 服务器",
    "Install Plugin": "安装插件",
    "Installed": "已安装",
    "Marketplace": "插件市场",
    "Browse": "浏览",
    "Enabled": "已启用",
    "Disabled": "已禁用",
    "Enable": "启用",
    "Disable": "禁用",
    "Uninstall": "卸载",
    "Delete": "删除",
    "Remove": "移除",
    "Configure": "配置",
    "Reconnect": "重新连接",
    "Connected": "已连接",
    "Disconnected": "未连接",
    "Connecting...": "正在连接...",
    "Global": "全局 (Global)",
    "Workspace": "工作区 (Workspace)",
    "Built-in": "内置 (Built-in)",
    "Builtin": "内置",
    "Custom": "自定义",
    "Schedule": "执行计划",
    "Run Now": "立即运行",
    "Last Run": "上次运行",
    "Next Run": "下次运行",
    "Every Day": "每天",
    "Every Week": "每周",
    "Every Hour": "每小时",
    "No automations yet": "暂无自动化任务",
    "No scheduled tasks": "暂无计划任务",
    "No customizations found": "未找到自定义配置",
    "No plugins installed": "暂未安装插件",
    "No MCP servers configured": "暂未配置 MCP 服务器",

    // === 补充：设置界面 (Settings) 全量细分标题、描述与选项 ===
    "Manage your account, subscription, and profile settings.": "管理您的账户、订阅计划和个人资料设置。",
    "Configure general application behavior and preferences.": "配置常规应用程序行为与偏好设置。",
    "Customize the look and feel of Antigravity.": "自定义 Antigravity 的外观、主题与显示效果。",
    "Manage AI models, default selections, and usage quotas.": "管理 AI 模型、默认模型选择以及使用配额。",
    "Configure how and when Antigravity sends you notifications.": "配置 Antigravity 向您发送通知的方式与时机。",
    "View and customize keyboard shortcuts.": "查看并自定义键盘快捷键。",
    "Configure code editor and diff viewer settings.": "配置代码编辑器与差异对比视图 (Diff) 设置。",
    "Configure built-in browser behavior and permissions.": "配置内置浏览器的行为与访问权限。",
    "Advanced settings and developer tools.": "高级设置与开发者调试工具。",
    "Control what actions the agent can perform automatically.": "控制智能体可以自动执行的操作与权限范围。",
    "Default Mode": "默认运行模式",
    "Choose the default mode for new conversations.": "选择新建对话时的默认运行模式。",
    "Default Model": "默认模型",
    "Choose the default model used for new conversations.": "选择新建对话时默认使用的 AI 模型。",
    "Default Thinking Level": "默认思考深度",
    "Set the default reasoning effort for supported models.": "为支持深度思考的模型设置默认推理强度。",
    "Auto-Approve Safe Commands": "自动批准安全命令",
    "Automatically run read-only and safe terminal commands without asking.": "无需询问即可自动运行只读和安全的终端命令。",
    "Command Allowlist": "终端命令白名单",
    "Commands matching these patterns will run automatically without confirmation.": "匹配这些规则的命令将无需确认自动运行。",
    "Command Denylist": "终端命令黑名单",
    "Commands matching these patterns will always be blocked or require confirmation.": "匹配这些规则的命令将被始终拦截或强制要求确认。",
    "Allow External File Access": "允许访问工作区外文件",
    "Allow the agent to read and modify files outside the current workspace directory.": "允许智能体读取和修改当前工作区目录以外的文件。",
    "Allow Gitignored File Access": "允许访问 Git 忽略的文件",
    "Allow the agent to read and modify files matched by .gitignore.": "允许智能体读取和修改被 .gitignore 忽略的文件。",
    "Network Access": "网络访问权限",
    "Control whether the agent can fetch URLs and search the web.": "控制智能体是否可以抓取网页链接和进行联网搜索。",
    "Allow Web Search": "允许联网搜索",
    "Allow URL Fetching": "允许读取网页内容 (URL Fetch)",
    "Allowed Domains": "允许访问的域名白名单",
    "Blocked Domains": "禁止访问的域名黑名单",
    "Sound Effects": "声音效果",
    "Play a sound when the agent completes a task or requests input.": "当智能体完成任务或请求输入时播放提示音。",
    "System Notifications": "系统桌面通知",
    "Show a desktop notification when the window is in the background.": "当窗口处于后台时显示系统桌面通知。",
    "Send with Enter": "按 Enter 键发送消息",
    "Use Enter to send messages and Shift+Enter for a new line.": "按 Enter 键直接发送消息，按 Shift+Enter 换行。",
    "Auto-Scroll": "自动滚动到底部",
    "Automatically scroll to the bottom as the agent generates responses.": "当智能体生成回复时自动滚动到对话底部。",
    "Show Thinking Process": "显示思考过程",
    "Display the agent's internal reasoning steps in the chat.": "在对话中展示智能体的内部推理与思考步骤。",
    "Show Tool Details": "显示工具调用详情",
    "Expand tool execution steps by default.": "默认展开工具执行的详细步骤。",
    "Diff View": "代码差异视图 (Diff View)",
    "Unified": "统一视图 (Unified)",
    "Split": "分栏对比视图 (Split)",
    "Side by Side": "并排对比 (Side by Side)",
    "Inline": "行内对比 (Inline)",
    "Tab Size": "Tab 缩进空格数",
    "Insert Spaces": "使用空格代替制表符",
    "Render Whitespace": "显示空白字符",
    "Cursor Style": "光标样式",
    "Cursor Blinking": "光标闪烁",
    "Smooth Scrolling": "平滑滚动",
    "Hardware Acceleration": "硬件加速",
    "Use GPU acceleration for rendering.": "使用 GPU 硬件加速进行界面渲染。",
    "Log Level": "日志级别",
    "Info": "信息 (Info)",
    "Debug": "调试 (Debug)",
    "Trace": "追踪 (Trace)",
    "Copy Diagnostics": "复制诊断信息",
    "Open Settings JSON": "打开设置 JSON 文件",
    "Edit in settings.json": "在 settings.json 中编辑",

    // === 补充：快捷键 (Shortcuts) 常见动作名称 ===
    "Send Message": "发送消息",
    "New Line": "换行",
    "Stop Generation": "停止生成",
    "Focus Input": "聚焦提问输入框",
    "Focus Chat Input": "聚焦聊天输入框",
    "Next Conversation": "下一个对话",
    "Previous Conversation": "上一个对话",
    "Search in Conversation": "在对话中搜索",
    "Find": "查找",
    "Replace": "替换",
    "Command Palette": "命令面板",
    "Toggle Fullscreen": "切换全屏",
    "Toggle Dark Mode": "切换深色模式",
    "Switch Mode": "切换运行模式",
    "Switch Model": "切换模型",
    "Clear Conversation": "清空当前对话",

    // === 补充：侧边栏、自定义与面板空状态文案 ===
    "Skills extend the agent with specialized instructions and scripts.": "技能 (Skills) 通过专用指令和脚本扩展智能体的专业能力。",
    "Rules define persistent guidelines and constraints for the agent.": "规则 (Rules) 为智能体定义持久化的行为准则与约束条件。",
    "Subagents are specialized agents that can be invoked for delegated tasks.": "子智能体 (Subagents) 是可被主智能体调用以委派特定任务的专业智能体。",
    "Plugins bundle skills, rules, subagents, hooks, and MCP servers.": "插件 (Plugins) 将技能、规则、子智能体、钩子和 MCP 服务器打包为一个整体。",
    "MCP servers connect the agent to external tools and data sources.": "MCP 服务器将智能体连接到外部工具与数据源。",
    "Hooks run custom commands in response to agent lifecycle events.": "钩子 (Hooks) 在智能体生命周期事件触发时自动运行自定义命令。",
    "Automations run scheduled tasks in the background.": "自动化 (Automations) 按照预定计划在后台自动执行任务。",
    "Create Automation": "创建自动化任务",
    "Edit Automation": "编辑自动化任务",
    "Delete Automation": "删除自动化任务",
    "Pause": "暂停",
    "Resume": "恢复",
    "Paused": "已暂停",
    "History": "历史记录",
    "Run History": "运行历史",
    "Logs": "日志",
    "Transcript": "对话记录",
    "Open Transcript": "打开对话记录",
    "View Transcript": "查看完整记录",
    "Copy Conversation ID": "复制对话 ID",
    "Terminal Output": "终端输出",
    "Kill Process": "终止进程",
    "Kill Task": "终止任务",
    "Send Input": "发送输入",
    "Task Running": "任务正在运行",
    "Task Completed": "任务已完成",
    "Task Failed": "任务失败",

    // === 补充：DOM 实时扫描捕获的顶栏、侧边栏、画布与无障碍标签 ===
    "File": "文件",
    "Edit": "编辑",
    "View": "视图",
    "Window": "窗口",
    "Help": "帮助",
    "Sidebar": "侧边栏",
    "Display Options": "显示选项",
    "Create New Project": "创建新项目",
    "Project options": "项目选项",
    "Project Options": "项目选项",
    "New Conversation in Project": "在项目中新建对话",
    "More options": "更多选项",
    "More Options": "更多选项",
    "More actions": "更多操作",
    "More Actions": "更多操作",
    "Stop execution": "停止执行",
    "Stop Execution": "停止执行",
    "No conversations yet": "暂无对话",
    "No more older messages": "没有更多历史消息",
    "Conversation Log": "对话记录",
    "User message": "用户消息",
    "Undo to this point": "撤回到此处",
    "Agent response": "智能体回复",
    "Scroll to Bottom": "滚动到底部",
    "Scroll to bottom": "滚动到底部",
    "Message input": "消息输入框",
    "Record voice memo": "录制语音输入",
    "Go Back": "后退",
    "Go Forward": "前进",
    "Typeahead menu": "快捷指令菜单",

    // === 补充：设置界面各分页精确词条与描述 ===
    "Account Settings": "账户设置",
    "Profile": "个人资料",
    "Email": "电子邮箱",
    "Current Plan": "当前订阅计划",
    "Free": "免费版",
    "Pro": "专业版 (Pro)",
    "Ultra": "旗舰版 (Ultra)",
    "Enterprise": "企业版 (Enterprise)",
    "Team": "团队版 (Team)",
    "Manage Billing": "管理账单",
    "Billing": "账单与订阅",
    "Usage & Limits": "用量与限额",
    "Credits": "额度点数",
    "Reset Time": "重置时间",
    "General Settings": "常规设置",
    "Appearance Settings": "外观设置",
    "Light Mode": "浅色模式",
    "Dark Mode": "深色模式",
    "System Default": "跟随系统默认",
    "UI Font Size": "界面字体大小",
    "Editor Font Size": "编辑器字体大小",
    "Editor Font Family": "编辑器字体族",
    "Terminal Font Size": "终端字体大小",
    "Terminal Font Family": "终端字体族",
    "Sidebar Position": "侧边栏位置",
    "Left": "左侧",
    "Right": "右侧",
    "Top": "顶部",
    "Bottom": "底部",
    "Show Status Bar": "显示状态栏",
    "Show Activity Bar": "显示活动栏",
    "Notification Settings": "通知设置",
    "Desktop Notification": "桌面通知",
    "Sound": "提示音",
    "Play Sound": "播放提示音",
    "Mute": "静音",
    "When window is unfocused": "仅当窗口未聚焦时",
    "Always": "始终",
    "Never": "从不",
    "Ask Every Time": "每次询问",
    "Auto Approve": "自动批准",
    "Safe Commands Only": "仅安全命令",
    "All Commands": "所有命令",
    "Command Execution": "命令执行",
    "Terminal Commands": "终端命令",
    "File Edits": "文件编辑",
    "File Creation": "文件创建",
    "File Deletion": "文件删除",
    "External Directory Access": "外部目录访问",
    "MCP Tool Execution": "MCP 工具调用",
    "Browser Automation": "浏览器自动化",
    "Web Search": "联网搜索",
    "Fetch URL": "抓取网页 (Fetch URL)",
    "Subagent Execution": "子智能体调用",
    "Allow Subagents": "允许调用子智能体",
    "Max Concurrent Subagents": "最大并发子智能体数",
    "Memory & Rules": "记忆与规则",
    "Global Rules": "全局规则",
    "Workspace Rules": "工作区规则",
    "Edit Global Rules": "编辑全局规则",
    "Edit Workspace Rules": "编辑工作区规则",
    "Custom Instructions": "自定义指令",
    "Keyboard Shortcut": "键盘快捷键",
    "Press keys...": "请按下快捷键...",
    "Record Shortcut": "录制快捷键",
    "Reset Shortcut": "重置快捷键",
    "Conflict": "快捷键冲突",
    "Experimental Features": "实验性功能",
    "Enable experimental features": "启用实验性功能",
    "Diagnostics": "诊断信息",
    "Export Logs": "导出日志",
    "Clear Conversation History": "清空对话历史",
    "Factory Reset": "恢复出厂设置",

    // === 补充：设置界面 100% 实机 DOM 抓取の全量未覆盖文案 ===
    // 1. 账户与认证 (Account)
    "Manage your plan, credentials, and general preferences.": "管理您的订阅计划、凭证与常规偏好设置。",
    "Enable Telemetry": "启用遥测数据收集",
    "When toggled on, Antigravity collects usage data to help Google enhance performance and features.": "开启后，Antigravity 会收集使用数据以帮助 Google 提升性能与功能体验。",
    "Marketing Emails": "营销与产品动态邮件",
    "Receive product updates, tips, and promotions from Google Antigravity via email.": "通过电子邮件接收来自 Google Antigravity 的产品更新、使用技巧和优惠信息。",
    "Your Plan:": "您的当前计划：",
    "Google AI Pro": "Google AI Pro 专业版",
    "Google AI Ultra": "Google AI Ultra 旗舰版",
    "You can upgrade to a Google AI Ultra plan to receive higher rate limits.": "您可以升级至 Google AI Ultra 计划以获取更高的调用速率限额。",
    "By using this app, you agree to its": "使用本应用即表示您同意其",
    "Terms of Service": "服务条款",
    "Privacy Policy": "隐私政策",

    // 2. 常规设置与权限 (General & Permissions)
    "Configure agent execution, queued message delivery, and permissions.": "配置智能体执行方式、排队消息发送策略以及操作权限。",
    "Execution": "执行策略",
    "Configure when follow-up messages are sent.": "配置追问消息的发送时机。",
    "Queue until after the current turn.": "排队等待当前轮次结束后发送。",
    "Interrupt the agent and send immediately.": "中断智能体并立即发送。",
    "Send Immediately": "立即发送",
    "Security Preset": "安全预设级别",
    "Controls the actions the agent can take.": "控制智能体可执行的操作范围。",
    "Learn more about": "进一步了解",
    "Modify permissions for file, terminal, and MCP tools.": "修改文件、终端和 MCP 工具的访问权限。",
    "Open": "打开",
    "Plan Review Policy": "计划审阅策略",
    "Whether the agent asks you to review its documents.": "控制智能体是否请求您审阅其生成的计划与文档。",
    "Type": "输入",
    "and select": "并选择",
    "to have the agent generate a plan.": "以让智能体生成实施计划。",
    "Network Access Rules": "网络访问规则",
    "Configure allowed and denied URLs for reading.": "配置允许和禁止读取的网址 (URL) 列表。",
    "Commands Outside Sandbox": "沙盒外命令执行",
    "Configure allowed commands outside the sandbox.": "配置允许在沙盒环境外执行的命令。",

    // 3. 浏览器子智能体 (Browser)
    "Configure the browser subagent. It requires": "配置浏览器子智能体。该功能需要安装",
    "to be installed.": "。",
    "The browser subagent can be invoked by typing /browser in the conversation input box.": "您可以在对话输入框中输入 /browser 来调用浏览器子智能体。",
    "Browser Javascript Execution Policy": "浏览器 JavaScript 执行策略",
    "Controls whether the agent can run custom JavaScript to automate complex browser actions.": "控制智能体是否可以运行自定义 JavaScript 来自动执行复杂的浏览器操作。",
    "Browser Actuation Rules": "浏览器交互控制规则",
    "Configure allowed and denied URLs for browser actuation.": "配置允许和禁止浏览器进行自动化操作的网址。",

    // 4. 外观与主题 (Appearance)
    "Configure the agent's visual theme and display preferences.": "配置界面的视觉主题与显示偏好。",
    "Contrast": "对比度",
    "Strong": "高对比度 (Strong)",
    "Normal": "标准 (Normal)",
    "Light Theme": "浅色主题",
    "Preset": "预设方案",
    "Default Light": "默认浅色",
    "Background": "背景色",
    "Foreground": "前景色 (文字)",
    "Accent": "强调色",
    "Dark Theme": "深色主题",
    "Default Dark": "默认深色",
    "Chat Settings": "对话界面设置",
    "Verbose Agent Chat": "详细对话模式",
    "Display and preserve intermediate thinking steps.": "显示并保留智能体的中间思考步骤。",
    "Conversation Width": "对话区域宽度",
    "Configure the maximum width of the conversation panel.": "配置对话面板的最大显示宽度。",
    "Narrow": "紧凑 (Narrow)",
    "Wide": "宽屏 (Wide)",
    "Choose the experience that fits how you work.": "选择适合您工作方式的界面体验模式。",
    "Choose between the Default and Project 4K experience.": "在默认模式与 Project 4K 体验模式之间切换。",
    "The full developer experience.": "完整的开发者体验模式。",
    "Project 4K interface without developer tooling.": "精简开发者工具的 Project 4K 界面。",

    // 5. 代码编辑器与 Tab 补全 (Editor & Tab)
    "Configure editor-specific behaviors and shortcuts.": "配置代码编辑器的专属行为与快捷键。",
    "Marketplace Item URL": "插件市场详情页地址 (Item URL)",
    "Changes the base URL on each extension page. You must restart Antigravity to use the new marketplace after changing this value.": "更改每个扩展详情页的基础 URL。修改此值后必须重启 Antigravity 才能使新插件市场生效。",
    "Marketplace Gallery URL": "插件市场搜索源地址 (Gallery URL)",
    "Changes the base URL for marketplace search results. You must restart Antigravity to use the new marketplace after changing this value.": "更改插件市场搜索结果的基础 URL。修改此值后必须重启 Antigravity 才能使新插件市场生效。",
    "Selection Actions": "划词快捷操作",
    "Show Selection Actions": "显示划词快捷按钮",
    "Show \"Edit\" and \"Chat\" buttons when selecting text in the editor.": "在编辑器中选中文本时显示“编辑”与“对话”快捷按钮。",
    "To modify editor settings, open Settings within the editor window.": "若需修改更多编辑器详细设置，请在编辑器窗口内打开设置。",
    "Open Editor Settings": "打开编辑器设置",
    "Configure tab completion, suggestions, and navigation behavior.": "配置 Tab 代码补全、智能建议与导航行为。",

    // 6. Jetski Chat 与自定义配置 (Customizations)
    "Jetski Chat": "Jetski 聊天机器人",
    "Configure a chat bot so you can use Jetski directly from Google Chat.": "配置聊天机器人，以便直接从 Google Chat 中使用 Jetski。",
    "For help, visit": "如需帮助，请访问",
    "or join the": "或加入",
    "chat space": "聊天空间",
    "Setup": "配置",
    "Bot Name": "机器人名称",
    "Enter bot name (optional)": "输入机器人名称（可选）",
    "Avatar URL": "头像 URL",
    "Enter avatar URL (optional)": "输入头像图片 URL（可选）",
    "Setup Jetski Chat": "设置 Jetski Chat",
    "Configure default behaviors, skills, and MCP servers.": "配置默认规则、技能 (Skills)、子智能体与 MCP 服务器。",
    "Token Usage": "Token 占用统计",
    "The breakdown below shows token usage from customizations like rules, skills, and MCP. If a budget is exceeded, large rules are demoted to path pointers and large customizations are excluded automatically.": "下方明细展示了规则、技能和 MCP 等自定义项的上下文 Token 占用情况。若超出预算上限，较大的规则会自动降级为路径引用，过大的自定义项将被自动排除。",
    "Other Customizations": "其他自定义项",
    "Mcp Tools": "MCP 工具",
    "MCP Tools": "MCP 工具",
    "Plugin:": "所属插件：",
    "Custom Agents": "自定义子智能体",
    "Delete agent": "删除子智能体",
    "Build With Google Plugins": "Build With Google 官方插件",
    "Browse and enable plugins from the Build With Google catalog.": "浏览并启用来自 Build With Google 官方目录的插件。",
    "Customize": "自定义",
    "Loading token usage...": "正在加载 Token 占用统计...",
    "Loading workspace customizations...": "正在加载工作区自定义配置...",

    // 7. 应用设置与通知 (App & Notifications)
    "Manage Antigravity app settings.": "管理 Antigravity 应用程序级别设置。",
    "Prevent Sleep": "防止系统休眠",
    "Prevent the computer from sleeping while the app is running.": "在应用运行期间防止电脑进入睡眠状态。",
    "Keep In Menu Bar": "保持在系统托盘中运行",
    "Keep the app accessible from the menu bar and running in the background when all windows are closed.": "当所有窗口关闭后，仍保留在系统栏/托盘中并保持后台运行。",
    "Remote Control": "远程控制",
    "Enable Remote Control": "启用远程控制",
    "Work with local agents from another device.": "允许从其他设备连接并操作本地智能体。",
    "To modify notification settings, open your operating system's system preferences.": "若需修改通知权限与提醒方式，请打开操作系统的系统通知设置。",
    "Open System Preferences": "打开系统偏好设置",
    "App version": "应用版本",
    "Advanced Settings": "高级设置",

    // 8. 意见反馈弹窗 (Provide Feedback)
    "Feedback Type": "反馈类型",
    "Bug Report": "问题与故障报告 (Bug)",
    "Feature Request": "功能建议",
    "Auth and Billing": "账户认证与账单问题",
    "Remote Control Issue": "远程控制问题",
    "General Feedback": "常规意见反馈",
    "Description": "详细描述",
    "Please describe the issue in detail. The more actionable your feedback, the quicker our team can address your request. Some helpful information includes:": "请详细描述您遇到的问题。您提供的信息越具体，我们的团队就能越快处理您的反馈。建议包含以下信息：",
    "Steps to reproduce the issue": "重现该问题的具体步骤",
    "Expected behavior": "预期正常行为",
    "Actual behavior": "实际发生的行为",
    "Any error messages": "相关错误提示信息",
    "Any relevant information": "其他相关背景信息",
    "Describe the bug you encountered...": "请描述您遇到的问题或建议...",
    "Steps to Reproduce": "重现步骤",
    "Please list the steps to reproduce the issue": "请列出重现该问题的操作步骤",
    "Attach a screenshot (optional)": "附上屏幕截图（可选）",
    "Attach Antigravity server logs": "附上 Antigravity 运行日志",
    "Visit": "访问",
    "Legal Help": "法律帮助中心",
    "to ask for content changes for legal reasons.": "以出于法律原因申请内容变更。",

    // 9. 键盘快捷键 (Shortcuts)
    "Keyboard shortcuts for quick navigation and control.": "用于快速导航与界面控制的键盘快捷键。",
    "Open Conversation Picker": "打开对话切换器",
    "Open File Search": "打开文件搜索",
    "Navigation": "导航控制",
    "File Picker": "文件选择器",
    "Select Previous Conversation": "选择上一个对话",
    "Select Next Conversation": "选择下一个对话",
    "Previous Pane Tab": "上一个面板标签页",
    "Next Pane Tab": "下一个面板标签页",
    "Toggle Model Selector": "切换模型选择器",
    "Toggle Voice Recording": "切换语音录制",
    "Find in Pane": "在面板中查找",
    "Add to Chat/Quote": "添加到对话 / 引用",
    "Layout Controls": "布局控制",

    // 10. 模型与配额 (Models & Quota)
    "Refresh quota and credits data": "刷新配额与点数数据",
    "Manage your model quota and credits.": "管理您的模型调用配额与 AI 点数。",
    "Model Credits": "模型点数 (Credits)",
    "Enable AI Credit Overages": "允许使用 AI 点数抵扣超额调用",
    "When toggled on, Antigravity will use your AI credits to fulfill model requests once you're out of model quota. Antigravity will always use your model quota first before using AI credits.": "开启后，当您的常规模型配额用尽时，Antigravity 将自动使用您的 AI 点数继续完成模型请求。系统始终优先消耗常规配额，用尽后才会使用 AI 点数。",
    "Model Quota": "模型配额",
    "Gemini Models": "Gemini 系列模型",
    "Claude and GPT models": "Claude 与 GPT 系列模型",
    "Weekly Limit Remaining": "本周剩余额度",
    "Five Hour Limit Remaining": "5 小时周期剩余额度",

    // 11. 开发者选项 (Developer)
    "Developer-only tools. These settings are stored locally in this browser and do not affect other users.": "仅供开发者使用的调试工具。这些设置仅保存在当前本地客户端中，不会影响其他用户。",
    "Regroup Google3 Chats": "重新归组 Google3 对话",
    "Google3 chats will be regrouped into their workspaces in the sidebar.": "侧边栏中的 Google3 对话将按各自的工作区重新归类。",
    "This migration may mess up your settings, chats, and sidebar.": "此迁移操作可能会打乱您的设置、对话和侧边栏结构。",
    "Follow the guide at": "请先参阅指南",
    "to back up your data and run the migration.": "备份您的数据后再执行迁移。",

    // 12. 辅助面板、审阅面板、自动化与文件查看器
    "Overview tab": "概览标签页",
    "Review tab": "审阅标签页",
    "Terminal tab": "终端标签页",
    "Add": "添加",
    "Review header": "审阅栏标题",
    "For Turn": "按对话轮次",
    "Clear filter": "清除筛选",
    "Toggle file diff": "切换文件差异对比",
    "Agent Edits": "智能体修改记录",
    "Maximize Pane": "最大化面板",
    "Minimize": "最小化",
    "Maximize": "最大化",
    "File Viewer header": "文件查看器标题栏",
    "File path breadcrumbs": "文件路径导航栏",
    "Preview": "预览",
    "Raw": "源码 (Raw)",
    "File Viewer": "文件查看器",
    "Fold code block": "折叠代码块",
    "Add inline comment": "添加行内评论",
    "Create with Prompt": "通过提示词创建",
    "Add automation": "添加自动化任务",
    "No automations configured.": "暂未配置自动化任务。",
    "No Project": "无所属项目",
    "Not in Project": "未归入项目",
    "Guide me through creating an automated task": "引导我创建一个自动化任务",
    "Select Agent": "选择智能体",
    "Main Agent": "主智能体 (Main Agent)",
    "Load older messages": "加载更早的消息",
    "Good response": "回答得好（点赞）",
    "Bad response": "回答不佳（点踩）",

    // 13. 内置技能 (Skills) 与子智能体 (Subagents) 卡片描述汉化
    "Uses Chrome DevTools MCP for accessibility (a11y) debugging and auditing based on web.dev guidelines. Use when testing semantic HTML, ARIA labels, focus states, keyboard navigation, tap targets, and color contrast.": "使用 Chrome DevTools MCP 基于 web.dev 指南进行无障碍 (a11y) 调试与审计。适用于测试语义化 HTML、ARIA 标签、焦点状态、键盘导航、点击目标和色彩对比度。",
    "Comprehensive guide and reference for the Antigravity Customization System. Use to explain how customizations work, their loading priority, discovery mechanisms, and to guide the creation of skills, rules, plugins, hooks, and MCP servers.": "Antigravity 自定义系统的全面指南与参考手册。用于解释自定义项的工作原理、加载优先级、发现机制，并指导创建技能、规则、插件、钩子和 MCP 服务器。",
    "Retrieve and analyze AlphaFold predicted structures for a protein. Use when the user provides a specific UniProt Accession ID and wants structural confidence metrics (pLDDT), domain boundary analysis, or disorder assessment. Do not use if the user only has a protein name, gene name, or amino acid sequence — ask for a UniProt ID first.": "检索并分析蛋白质的 AlphaFold 预测结构。当提供特定 UniProt ID 并需要结构置信度指标 (pLDDT)、结构域边界分析或无序评估时使用。",
    "Constructs deep-links and URLs for the AlphaGenome Atlas website. Supports generating single-variant exploration links (1-based chr:pos:ref>alt), genomic locus views (1-based closed chr:start-end), candidate summary tables, and AlphaGenome reference vs. alternate predictions. Use whenever visualizing, exploring, charting, or linking genetic variants and genomic loci on the AlphaGenome Atlas, or when asked to inspect, view, or link predictions for a genomic variant.": "构建 AlphaGenome Atlas 网站的深度链接与 URL。支持生成单变异探索链接、基因组位点视图、候选汇总表以及参考与突变预测对比。",
    "Analyzes genetic variant effects on gene expression (RNA-seq), chromatin accessibility (DNASE), histone marks (ChIP), and transcription factors using the AlphaGenome API. Use when the user asks about non-coding variant effects, pathogenicity, clinical significance, disease associations, functional effects, gene expression changes, splicing disruption, or regulatory effects in promoters and enhancers. Also use for resolving biological terms to tissue/cell-type ontologies (UBERON/CL) or analyzing variants in chr:pos:ref>alt format.": "使用 AlphaGenome API 分析基因变异对基因表达 (RNA-seq)、染色质可及性 (DNASE)、组蛋白标记 (ChIP) 和转录因子的影响。",
    "Score, annotate, and analyze the functional impact of genetic variants using AlphaGenome Variant Impact (AVI) scores. Query variants in chr:pos:ref>alt format, annotate VCF/tabular callsets, perform saturation mutagenesis window scans (1-based closed chr:start-end), and extract GENCODE v46 GTF gene/exon/junction coordinates all via the AlphaGenome Atlas API.": "使用 AlphaGenome 变异影响评分 (AVI) 对基因变异的功能影响进行评分、注释和分析。",
    "Provides instructions for installing and using the `android` CLI. The `android` command-line tool is a critical tool for Android development and helps you create new Android projects, run Android apps on devices, manage and interact with Android virtual devices (including screenshots and UI inspection), manage Android SDK components, look up official Android documentation, and discover and install official Android skills.": "提供安装和使用 `android` CLI 命令行工具的说明，支持创建 Android 项目、在设备上运行应用、管理虚拟设备、管理 SDK 组件及查阅官方文档。",
    "Provides a comprehensive guide, quick reference, and sitemap for Google Antigravity (AGY), including the Antigravity CLI (agy), Antigravity 2.0, Antigravity IDE, Python SDK, slash commands, keybindings, and customizations (skills, rules, MCP, sidecars). Activate this skill when the user asks questions about how to use, configure, or customize Antigravity, AGY, the agy CLI, the Antigravity IDE, or Antigravity 2.0.": "提供 Google Antigravity (AGY) 的完整指南、快速参考与站点地图，涵盖 agy CLI、Antigravity 2.0、IDE、Python SDK、斜杠命令、快捷键和自定义配置。",
    "Interactive guide to design and create a scheduled background automation. Use this skill when the user wants to create an automated or recurring scheduled task (e.g. \"summarize my emails every morning\", \"every Monday send me a to-do list\"). Also triggered by the /automation slash command.": "设计并创建后台计划自动化任务的交互式指南。当用户希望创建自动或周期性计划任务时使用（也可通过 /automation 斜杠命令触发）。",
    "Query the ChEMBL database for bioactive molecules, drug targets, bioactivity data, approved drugs, and chemical structures. Use when the user asks about compounds, targets, IC50/Ki values, drug mechanisms, or structure searches.": "查询 ChEMBL 数据库中的生物活性分子、药物靶点、生物活性数据、已批准药物及化学结构。",
    "Uses Chrome DevTools via MCP for efficient debugging, troubleshooting and browser automation. Use when debugging web pages, automating browser interactions, analyzing performance, or inspecting network requests. This skill does not apply to `--slim` mode (MCP configuration).": "通过 MCP 使用 Chrome DevTools 进行高效调试、故障排查和浏览器自动化（适用于调试网页、自动化交互、性能分析及网络请求检查）。",
    "Query ClinicalTrials.gov via APIv2. Use when you want to search for trials by condition, drug, location, status, or phase; retrieve trial details by NCT ID; check eligibility/inclusion criteria; count trials across conditions or time periods; identify a sponsor's trial portfolio; find recruiting trials for patient matching.": "通过 APIv2 查询 ClinicalTrials.gov 临床试验数据库，支持按疾病、药物、地点、状态或分期搜索试验详情。",
    "Use when needing clinical significance, pathogenicity classifications (e.g., Pathogenic, Benign, VUS), clinical evidence rationales, or finding \"hard positive\" benchmark controls for human genomic variants.": "查询 ClinVar 数据库以获取人类基因组变异的临床意义、致病性分类（如致病、良性、意义未明）及临床证据。",
    "Instructions for handling API keys and credentials safely, verifying their presence, and prompting the user to add them if missing using a safe protocol.": "安全处理 API 密钥与凭证的说明指南，支持验证凭证是否存在并通过安全协议提示用户添加缺失的密钥。",
    "Use when you want to look up, map, and search for short genetic variants (SNPs, indels) in NCBI's dbSNP database. Resolves between rsIDs, genomic coordinates in VCF format, and HGVS strings. For an rsID, returns variant type, gene associations, clinical significance, allele frequencies, and genomic coordinates (GRCh38).": "在 NCBI dbSNP 数据库中查找、映射和搜索短基因变异（SNP、Indel），支持在 rsID、VCF 基因组坐标与 HGVS 之间解析转换。",
    "Guides debugging and optimizing Largest Contentful Paint (LCP) using Chrome DevTools MCP tools. Use this skill whenever the user asks about LCP performance, slow page loads, Core Web Vitals optimization, or wants to understand why their page's main content takes too long to appear. Also use when the user mentions \"largest contentful paint\", \"page load speed\", \"CWV\", or wants to improve how fast their hero image or main content renders.": "使用 Chrome DevTools MCP 工具指导调试和优化最大内容绘制 (LCP) 与核心网页指标 (Core Web Vitals) 加载性能。",
    "Automatically migrate legacy workflows to modern skills across global and workspace configurations. Scans for existing workflows, creates target SKILL.md files, and safely archives old workflow files.": "跨全局和工作区配置自动将旧版工作流 (Workflows) 迁移为现代技能 (Skills)，创建 SKILL.md 并安全归档旧文件。",
    "How to manage and create plugins — namespaced bundles of skills, agents, rules, MCP servers and hooks that install, enable and disable as a single unit. Use this skill when the user wants to enable, disable, install or uninstall a plugin, when they want to create a new plugin, or when a new customization should be packaged into a plugin rather than left loose. Also triggered by the /plugin slash command. Don't use for the underlying customization system itself — discovery roots, loading priority, or authoring a standalone skill, agent, rule, hook or MCP server outside a plugin; see the customizations guide skill for those.": "管理与创建插件（将技能、子智能体、规则、MCP 服务器和钩子打包为独立安装/启停的命名空间单元），也可通过 /plugin 命令触发。",
    "How to render rich interactive HTML widgets inline in the chat or as standalone artifacts. Use this skill when you want to show the user diagrams, data visualizations, interactive controls, educational walkthroughs, or any rich visual content beyond plain text and markdown.": "在对话内联或作为独立文档渲染丰富的交互式 HTML 组件（适用于图表、数据可视化、交互控件和可视化演示）。",
    "Design, implement, and debug autonomous AI agents and multi-agent systems using the Google Antigravity (AGY) SDK. ACTIVATE this skill when the user wants to create, configure, or orchestrate Google Antigravity agents.": "使用 Google Antigravity (AGY) SDK 设计、实现和调试自主 AI 智能体与多智能体系统。",
    "Build, package, run, and debug UI extensions for Antigravity: interactive web panels that render in the side pane, served by a Node.js sidecar using the built-in Sidecar SDK.": "为 Antigravity 构建、打包、运行和调试 UI 扩展面板（通过内置 Sidecar SDK 在侧边面板渲染交互式 Web 界面）。",
    "Discover UI plugin panels relevant to the current task and surface a one-click pill in chat to open (toggle) them in the side pane. Use when a running UI plugin's panel would help with what the user is doing, or right after the user enables a new UI plugin pane and a shortcut to open it is handy.": "发现与当前任务相关的 UI 插件面板，并在对话中提供一键打开侧边栏插件面板的快捷按钮。",
    "MANDATORY specialist subagent for Cloud Firestore Security Rules (firestore.rules). Whenever your task requires creating, authoring, or modifying Firestore Security Rules (firestore.rules), you MUST delegate rules authoring to this subagent rather than writing firestore.rules directly in the main agent.": "Cloud Firestore 安全规则 (firestore.rules) 专用子智能体。当任务需要创建或修改 Firestore 安全规则时，将自动委派给此专家子智能体。",
    "Query and search the EMBL-EBI Ontology Lookup Service (OLS) for biomedical ontology terms, definitions, and hierarchies across 250+ ontologies (e.g., GO, DOID, HP). Use when the user asks to search for terms, retrieve details, navigate hierarchies (parents, children, ancestors), look up properties and individuals, get autocomplete suggestions, or access ontology metadata and statistics.": "查询和搜索 EMBL-EBI 本体查找服务 (OLS)，涵盖 250 多个生物医学本体（如 GO、DOID、HP）的术语、定义与层级关系。",
    "Query the ENCODE Registry of cis-Regulatory Elements (cCREs) via the SCREEN GraphQL API, or make custom queries to the ENCODE Portal REST API for experiments and files (ChIP-seq peaks, etc.). Use when you want to query regulatory annotations or raw experimental data across human cell types.": "通过 SCREEN GraphQL API 查询 ENCODE 顺式调控元件注册库 (cCREs)，或通过 ENCODE REST API 查询各类人类细胞系的调控注释与实验数据。",
    "Query the Ensembl database to resolve gene, transcript, and protein IDs, fetch genomic or protein sequences, retrieve gene structures (exons), and get variant consequence and effect predictions (VEP). Use this skill as a primary ID translator, genomic sequence database and variant effect prediction tool.": "查询 Ensembl 数据库以解析基因、转录本和蛋白质 ID，获取基因组或蛋白质序列、外显子结构以及变异效应预测 (VEP)。",
    "Skill for converting an installed Firebase Extension (or extension source) into a standalone Cloud Functions for Firebase codebase or publishable npm package, including V1 to V2 trigger upgrades, lifecycle hooks, and declarative security": "将已安装的 Firebase 扩展转换为独立的 Cloud Functions 代码库或可发布的 npm 包（含 V1 至 V2 触发器升级与声明式安全规则）。",
    "Official skill for integrating Firebase AI Logic (Gemini API) into web applications. Covers setup, multimodal inference, structured output, and security.": "将 Firebase AI Logic (Gemini API) 集成到 Web 应用的官方技能，涵盖初始化配置、多模态推理、结构化输出与安全防护。",
    "Deploys and manages full-stack web applications (Next.js, Angular) with Server-Side Rendering (SSR) using Firebase App Hosting. Use when deploying Next.js/Angular apps, configuring apphosting.yaml or firebase.json apphosting blocks, managing secrets, setting up GitHub CI/CD, or configuring Blaze billing requirements. Don't use for classic static web hosting, Auth, Firestore, Crashlytics, or Xcode.": "使用 Firebase App Hosting 部署和管理支持服务端渲染 (SSR) 的全栈 Web 应用（Next.js、Angular），涵盖 apphosting.yaml、密钥管理与 GitHub CI/CD。",
    "Guide for setting up and using Firebase Authentication. Use this skill when the user's app requires user sign-in, user management, or secure data access using auth rules.": "配置与使用 Firebase Authentication 身份验证的指南，适用于用户登录、账户管理与基于认证的安全访问控制。",
    "Provides foundational Firebase CLI setup, CLI installation, version checks (`firebase-tools@latest --version`), CLI login (including --no-localhost), project creation, project selection (`firebase use`), and app config file downloads (`google-services.json`, `GoogleService-Info.plist`). Use ONLY for CLI login, project creation/switching, or downloading app config files. Don't use for Firebase Hosting deploy, Firestore, Auth, App Hosting, Data Connect, Crashlytics, or Remote Config.": "提供基础 Firebase CLI 配置、安装、登录、项目创建与切换 (`firebase use`) 以及应用配置文件下载。",
    "Comprehensive guide for Firebase Crashlytics, including provisioning and SDK usage. Use this skill when the user needs help setting up Crashlytics, adding crash reporting, or using the Crashlytics SDK in their application.": "Firebase Crashlytics 崩溃分析完整指南，涵盖服务开通、崩溃报告配置与 SDK 集成使用。",
    "Builds and deploys Firebase SQL Connect (aka Firebase Data Connect) backends with PostgreSQL securely. Use when designing schemas with tables and relations, writing authorized queries and mutations, configuring real-time data updates, or generating type-safe SDKs. Use when you need a relational database with Firebase, or when the user mentions SQL Connect or Data Connect.": "使用 PostgreSQL 安全构建和部署 Firebase Data Connect 关系型数据库后端，支持表结构设计、授权查询变更与类型安全 SDK 生成。",
    "Sets up, manages, queries, and configures Cloud Firestore databases (Standard/Enterprise edition), including data modeling, security rules, indexes, and SDK integrations (Web, Python, iOS, Android, Flutter). Use when creating/listing Firestore databases, defining data models/indexes, writing SDK queries, or integrating Firestore SDKs. For authoring or modifying Firestore Security Rules (firestore.rules), delegate to the firestore-rules-author subagent if subagent delegation is available, or use firestore-rules-creation otherwise. Don't use for Firebase Hosting, Data Connect, Auth, Storage/GCS, Crashlytics, Functions, or BigQuery.": "配置、管理和查询 Cloud Firestore 数据库，涵盖数据建模、安全规则、索引以及多端 SDK 集成。",
    "Deploys and configures classic Firebase Hosting for static websites, single-page apps (SPAs), and microservices. Use when deploying static sites/SPAs, setting up custom domains, configuring firebase.json hosting settings (redirects, rewrites, headers, multi-site), or managing preview channels. Don't use for Firebase App Hosting (Next.js/SSR), Auth, Firestore queries/rules, Data Connect, or Crashlytics.": "部署和配置传统 Firebase Hosting 静态网站、单页应用 (SPA) 与微服务，支持自定义域名、重写重定向与预览通道管理。",
    "Manages Firebase Remote Config templates, feature flags, loading strategies, and SDKs (Android, iOS). Use when downloading/deploying remoteconfig JSON templates, managing version history/feature flags, setting in-app defaults, fetchAndActivate(), real-time listeners, or SDK setup. Don't use for Firebase Hosting, Auth, Firestore, Data Connect, Crashlytics, or App Hosting.": "管理 Firebase Remote Config 远程配置模板、特性开关 (Feature Flags)、加载策略及客户端 SDK 集成。",
    "Audits Firebase (Firestore, Cloud Storage) security rules for vulnerabilities, privilege escalation, role bypasses, create vs update inconsistencies, resource exhaustion, type safety, size limits, and hasOnly ownership checks. Use when auditing/reviewing rules, running red-team rule assessments, or scoring against auditor checklists. Don't use for Firebase CLI (login, deploy), Auth, Crashlytics, Remote Config, or database queries.": "审计 Firebase（Firestore、Cloud Storage）安全规则中的权限提升、角色绕过、类型安全与资源耗尽等潜在漏洞。",
    "Designs, authors, refactors, and hardens production-grade Cloud Firestore Security Rules (firestore.rules). IMPORTANT: If subagent delegation AND the firestore-rules-author subagent are available in your environment, delegate authoring firestore.rules to the firestore-rules-author subagent. If subagent delegation is unavailable (e.g. not enabled in the IDE), firestore-rules-author is not installed, or you are running inside firestore-rules-author, follow this skill directly.": "设计、编写、重构和加固生产级 Cloud Firestore 安全规则 (firestore.rules)。",
    "Performs 3D structural searches of proteins against various databases (PDB, AlphaFold, CATH, MGnify, etc.) using the Foldseek API. Use ONLY when the user provides a physical 3D coordinate file (.cif, .mmcif, or .pdb) and wants to find structurally similar proteins. Do NOT use if the user only provides a protein sequence, gene name, or UniProt ID.": "使用 Foldseek API 针对 PDB、AlphaFold、CATH 等数据库进行蛋白质 3D 结构相似性搜索（需提供 .cif/.mmcif/.pdb 坐标文件）。",
    "Read, create, and manage Google Calendar events. Use when the user shares a calendar.google.com URL, asks what is on their schedule, wants an event found, created, updated, deleted, or moved, wants to RSVP, wants free/busy or scheduling conflicts checked before proposing a time, wants focus time or an out-of-office block created, wants an event quick-added from a phrase or imported from an ICS file, or wants to know where someone is working from and which timezone they are in. Don't use for Gmail, Chat, or Tasks.": "读取、创建和管理 Google 日历 (Google Calendar) 日程事件，支持查询日程、检测忙闲冲突、回复邀请及导入 ICS 文件。",
    "Read, create, edit, and manage Google Docs. Use when the user shares a docs.google.com URL, asks to summarize or extract content from a doc, wants a doc drafted, edited, formatted, or commented on, wants tables, images, or smart chips inserted, wants markdown imported or synchronized with a doc, or wants a doc exported. Requires a known document ID — use the gdrive skill to search for or locate documents. Don't use for Google Sheets, Slides, or Drive file management.": "读取、创建、编辑和管理 Google 文档 (Google Docs)，支持提取摘要、起草排版、插入表格图片、同步 Markdown 及导出文档。",
    "Browse, search, and manage Google Drive files and folders. Use when the user shares a drive.google.com URL, asks what is in a folder, wants a file found, downloaded, uploaded, updated in place, moved, copied, or renamed, wants a Google file exported to PDF, Markdown, or CSV, wants comments read or added, wants sharing and permissions checked or changed, or wants Drive activity watched. Don't use for editing the contents of a Doc, Sheet, or Slides deck.": "浏览、搜索和管理 Google 云端硬盘 (Google Drive) 文件与文件夹，支持上传下载、导出 PDF/Markdown/CSV 及管理共享权限。",
    "Use this skill when writing code that calls the Gemini API for text generation, multi-turn chat, multimodal understanding, image generation, video generation, speech generation (TTS), voice design, voice replication, streaming responses, background research tasks, function calling, structured output, or migrating from the old generateContent API. Covers SDK usage and best practices for Gemini models and agents in Python and TypeScript.": "编写调用 Gemini API 代码的开发指南，涵盖文本生成、多轮对话、多模态理解、图像/视频/语音生成、流式响应、函数调用与结构化输出。",
    "Use this skill when building real-time, bidirectional streaming applications with the Gemini Live API, or migrating legacy Live models (2.0/2.5/3.1) to Gemini 3.8 Live. Covers WebSocket-based audio/video/text streaming, voice activity detection (VAD), background reasoning (extended thinking), asynchronous function calling, session management, ephemeral tokens, live transcription, and live translation. SDKs covered - google-genai (Python), @google/genai (JavaScript/TypeScript).": "使用 Gemini Live API 构建实时双向音视频/文本流式应用的开发指南，涵盖语音活动检测 (VAD)、异步函数调用、实时转录与翻译。",
    "Use this skill for generative video editing, text-to-video, image-referenced video generation, first-frame-to-video, first-and-last-frame transitions, and video extensions using Gemini Omni 1.1 Flash (gemini-omni-1.1-flash) via the official google-genai SDK. Includes workflows for pre-processing/optimizing high-resolution or long source videos with ffmpeg, stripping audio for full sound regeneration, and handling turn-by-turn video editing and parallel execution.": "使用 Gemini Omni 1.1 Flash 进行生成式视频编辑、文生视频、图生视频、首尾帧过渡及视频延展的开发工作流指南。",
    "Query the Genome Aggregation Database (gnomAD). Use when determining the rarity or allele frequency of specific genetic variants, retrieving gene constraint metrics (pLI, LOEUF) to assess loss-of-function intolerance, finding variants in a genomic region or gene, or querying structural variants. Don't use for analyzing individual patient genomes, tracking somatic mutations in cancer (use COSMIC), or requesting raw sequencing reads (use ENA).": "查询基因组聚合数据库 (gnomAD)，用于确定基因变异的等位基因频率、获取基因约束指标 (pLI, LOEUF) 及查询结构变异。",
    "Read, write, format, and manage Google Sheets. Use when the user shares a sheets.google.com or docs.google.com/spreadsheets URL, asks to read or summarize spreadsheet data, wants cells written, formatted, sorted, merged, or validated, wants rows/columns inserted or deleted, wants charts, pivot tables, or tables added, wants CSV imported, or wants a spreadsheet created, copied, shared, or exported. Don't use for Google Docs, Slides, or Drive file management.": "读取、写入、格式化和管理 Google 表格 (Google Sheets)，支持单元格读写、排序筛选、图表与数据透视表创建及 CSV 导入导出。",
    "Read, create, and edit Google Slides presentations. Use when creating presentations, when the user shares a slides.google.com URL, asks to summarize or extract content from a deck, wants slides drafted or updated, or wants a presentation exported. Don't use for Google Docs, Sheets, or Drive file management.": "读取、创建和编辑 Google 幻灯片 (Google Slides) 演示文稿，支持提取内容摘要、起草更新幻灯片及导出文件。",
    "Use when you want to retrieve quantitative RNA expression data and variant eQTL information from the GTEx (Genotype-Tissue Expression) Project across 54 non-diseased tissue sites.": "从基因型-组织表达项目 (GTEx) 检索跨 54 种健康组织位点的定量 RNA 表达数据与变异 eQTL 信息。",
    "Use when you want to retrieve semi-quantitative protein expression and spatial localisation data from the Human Protein Atlas (HPA).": "从人类蛋白质图谱 (HPA) 检索半定量蛋白质表达与空间亚细胞定位数据。",
    "Identify domains, families, and sites in proteins; find all proteins in a family or sharing a domain; explore species distribution for a domain; annotate genomes with protein families and GO terms. InterPro combines 14 databases (e.g., Pfam, CDD) into one searchable resource. InterPro-N significantly expands annotation and sequence coverage with deep learning. Includes domain architecture (IDA) search.": "使用 InterPro 识别蛋白质中的结构域、家族和位点，整合 Pfam、CDD 等 14 个数据库并支持深度学习扩展注释与结构域架构搜索。",
    "Query the JASPAR database for Transcription Factor (TF) binding profiles. Use when retrieving Position Frequency Matrices (PFMs) or Position Weight Matrices (PWMs) for specific TFs, resolving gene symbols to JASPAR Matrix IDs, or getting TF metadata. Supports multiple output formats (MEME, TRANSFAC, PFM, JASPAR, YAML).": "查询 JASPAR 数据库以获取转录因子 (TF) 结合谱、位置频率矩阵 (PFM) 与位置权重矩阵 (PWM)。",
    "Search for scientific papers, preprints, and publications on arXiv. Extract metadata, abstracts, and download full-text PDFs or HTML versions of papers. Use when the user asks to find research papers, literature, or specific arXiv IDs.": "在 arXiv 上搜索科学论文与预印本，支持提取元数据、摘要以及下载全文 PDF 或 HTML 版本。",
    "Browse, filter, and download life sciences, biology, and medical preprints from bioRxiv and medRxiv. Supports fetching paper metadata by DOI, and browsing by date range with category and keyword filters. Keyword filtering is local, so date ranges MUST be narrow (1-4 weeks) with a category to prevent timeouts.": "浏览、筛选和下载 bioRxiv 与 medRxiv 上的生命科学、生物学和医学预印本论文。",
    "Search Europe PMC for scientific literature and download open-access full texts and PDFs. Retrieve full-text XML/plain text by PMCID, get citation lists and bibliography.": "在 Europe PMC 中搜索科学文献并下载开放获取全文与 PDF，支持按 PMCID 获取全文及引用列表。",
    "Query the OpenAlex scholarly database for research papers, authors, institutions, topics, sources, publishers, funders, geo-locations, and keywords. Use when searching academic papers, resolving DOIs, downloading open-access PDFs, finding an author's publications, aggregating bibliometric data (citation counts, h-index, impact factor), exploring the research taxonomies, or performing DOI lookups.": "查询 OpenAlex 学术数据库中的论文、作者、机构、主题与期刊，支持 DOI 解析、文献计量统计（引用数、h 指数）及开放获取 PDF 下载。",
    "Diagnoses and resolves memory leaks in JavaScript/Node.js applications. Use when a user reports high memory usage, OOM errors, or wants to analyze heapsnapshots or run memory leak detection tools like memlab.": "诊断并解决 JavaScript/Node.js 应用中的内存泄漏问题，支持分析堆快照 (Heap Snapshots) 与运行 memlab 检测。",
    "Retrieve protein and nucleotide sequences from NCBI databases using E-utilities. Supports direct accession lookup, CDS translation, gene+organism search, locus lookup, PubMed-linked sequences, patent protein extraction, and organism+length fallback search. Use when you need to fetch biological sequences by accession, gene name, locus tag, PubMed ID, or patent number.": "使用 NCBI E-utilities 从 NCBI 数据库检索蛋白质与核苷酸序列，支持按登录号、基因名、位点标签或 PubMed ID 查询。",
    "Query, search, and download data from the openFDA API for drugs, devices, foods, tobacco, cosmetics, animal and veterinary products, substances, and transparency data. Use for FDA adverse events, recalls, labeling, approvals, shortages, 510(k) clearances, NDC lookups, and any FDA safety or regulatory data query across all 28 API endpoints.": "通过 openFDA API 查询药品、医疗器械、食品等监管数据，涵盖不良事件、召回、说明书、审批及 510(k) 许可。",
    "Query Open Targets Platform for target-disease associations, drug target discovery, tractability/safety data, genetics/omics evidence, known drugs, for therapeutic target identification.": "查询 Open Targets 平台以获取靶点-疾病关联、药物靶点发现、成药性/安全性数据及遗传组学证据。",
    "Use when you want to search for or download experimentally-determined 3D structures for biomolecules (proteins, nucleic acids, bound ligands). Supports searching by sequence similarity, structure similarity, chemical and other attributes. Also use to get metadata about biomolecular structure experiments.": "在 PDB 蛋白质结构数据库中搜索和下载实验测定的生物大分子（蛋白质、核酸、配体复合物）3D 结构与实验元数据。",
    "Guidelines for interacting with GitHub and request permissions from the user when commands fail due to restrictions in the agent environment.": "与 GitHub 交互并在受限环境中向用户请求相应访问权限的指南。",
    "Ancient text restoration, attribution, dating, contextualization, and embedding via Aeneas (Latin) / Ithaca (Ancient Greek). Use when asked to \"restore\", \"attribute\", \"date\", \"contextualize\", \"find parallels\", \"where was it written\", \"when was it written\", \"embed\", or \"analyze\" an ancient text, inscription, or epigraphic document, or when the user mentions \"Aeneas\", or \"Ithaca\".": "通过 Aeneas（拉丁语）和 Ithaca（古希腊语）对古代文献与铭文进行文本修复、归属地推断、年代测定与语境分析。",
    "Performs multiple sequence alignment of proteins with EBI Clustal Omega. Use when you need to align multiple sequences to assess similarity, domain conservation, or key residue conservation. Supports up to 4000 sequences and a maximum file size of 4 MB. Do not use to search for homologous proteins in a database (use MMseqs2, BLAST), align non-protein sequences (DNA, RNA), perform structural alignment (use Foldseek, PyMOL), or if you only have a single sequence.": "使用 EBI Clustal Omega 进行蛋白质多序列比对 (MSA)，以评估序列相似性、结构域保守性及关键残基。",
    "Searches for homologous protein sequences using MMseqs2 (fast, default) or BLAST (comprehensive, fallback). Trigger this whenever the user provides a protein sequence or FASTA file and asks to find homologues, sequence matches, or wants to infer protein function based on sequence similarity, but not when the user wants to infer protein function based on structural similarity.": "使用 MMseqs2 或 BLAST 搜索同源蛋白质序列，根据序列相似性查找同源物并推断蛋白质功能。",
    "Query PubChem, search by name/CID/SMILES, retrieve properties, similarity/substructure searches, bioactivity, for cheminformatics. Use when a user asks about a specific chemical, drug, or molecule.": "查询 PubChem 化学数据库，支持按名称/CID/SMILES 搜索化学性质、相似性/子结构检索及生物活性数据。",
    "Search PubMed for scientific literature, including published clinical trials. Fetch abstracts and full text. Link published research to biological databases (gene, protein, nucleotide, PubChem) to discover associations between papers and specific compounds or genes. Verify medical spelling, match raw citations, and cache result sets for bulk processing. Interfaces NCBI E-utilities and PMC BioC APIs.": "在 PubMed 中搜索生物医学文献与临床试验，获取摘要与全文，并关联基因、蛋白质和 PubChem 数据库。",
    "Visualize, analyze, and render protein and molecular structures using PyMOL. Use when the user wants to create images of protein structures, perform structural alignments or superposition, measure distances or contacts, highlight binding sites or active site residues, color by B-factor/pLDDT, or analyze protein-ligand interactions. Do not use for docking, molecular dynamics, or sequence-only analysis.": "使用 PyMOL 可视化、分析和渲染蛋白质与分子 3D 结构，支持结构叠合、距离测量、活性位点高亮及配体相互作用分析。",
    "Query the QuickGO and Evidence & Conclusion Ontology (ECO) REST API. Use this when you need to map genes to biological processes, molecular functions, or cellular components, find genes associated with a specific pathway/GO term, or explore the Gene Ontology hierarchy. Do not use for querying drug targets (use OpenTargets) or mechanistic signaling pathway diagrams (use KEGG).": "查询 QuickGO 与证据本体 (ECO) API，将基因映射到生物学过程、分子功能或细胞组分，并探索基因本体 (GO) 层级结构。",
    "Query the Reactome database (Analysis and Content Services). Use when the user asks about pathway analysis, gene list enrichment, retrieving results by token, finding unmapped or not-found identifiers, mapping identifiers, reaction participants (inputs, outputs), pathway hierarchy (including top-level pathways), diagram export, cross-reference mapping, or searching the knowledgebase.": "查询 Reactome 通路数据库，支持生物通路分析、基因列表富集、反应参与者查询、通路层级浏览及通路图导出。",
    "Query the STRING database for protein-protein interactions (PPIs), functional enrichment, and homology. Use when the user asks about interactions between specific proteins, interaction evidence, confidence scores, protein interaction partners, or pathway enrichments.": "查询 STRING 数据库以获取蛋白质-蛋白质相互作用 (PPI) 网络、相互作用证据评分及功能富集分析。",
    "Uses Chrome DevTools MCP and documentation to troubleshoot connection and target issues. Trigger this skill when list_pages, new_page, or navigate_page fail, or when the server initialization fails.": "使用 Chrome DevTools MCP 排查浏览器连接、页面目标与服务初始化故障。",
    "Fetch Evolutionary Conservation scores (phyloP, phastCons) and Transcription Factor Binding Sites (TFBS) from the UCSC Genome Browser. Use when analyzing whether genomic variants or regions are evolutionarily conserved, functionally important, or bounded by TF regulators across major projects (ENCODE, JASPAR, ReMap).": "从 UCSC 基因组浏览器获取进化保守性评分（phyloP、phastCons）与转录因子结合位点 (TFBS) 数据。",
    "Queries the UniBind database for experimentally validated transcription factor (TF) binding sites. Use when retrieving direct TF-DNA interaction datasets, downloading binding site coordinates (BED/FASTA) for local analysis, or listing available datasets by species, cell line, or TF name. Don't use to query specific intervals, locations, genes, motif models or expression data.": "查询 UniBind 数据库中经实验验证的转录因子 (TF) 直接结合位点数据集。",
    "Access protein metadata, function, taxonomy, and sequences across UniProtKB, UniParc, and UniRef. Use when searching for proteins, mapping identifiers, or retrieving functional annotations and publications. Don't use for sequence alignment, protein folding, or sequence similarity search (use specialized skills for those tasks).": "访问 UniProtKB、UniParc 和 UniRef 中的蛋白质元数据、功能注释、分类学信息与序列数据。",
    "Checks whether the uv Python package manager is installed and installs it if missing. Ensures uv is on PATH. Use when another skill requires uv as a prerequisite.": "检查并自动安装 uv Python 包管理器，确保 uv 已配置到系统 PATH 环境变量。",
    "Distills a completed user workflow or interaction into a reusable agent skill. Use when the user asks to turn their workflow, interaction, or multi-step process into a skill, or when they say \"make this a skill\", \"create a skill from what we just did\", \"package this workflow\" or similar. Do not use for creating skills from scratch without an existing workflow (use a generic skill-creator for that).": "将已完成的工作流或多步交互提炼并打包为可复用的智能体技能 (Skill)。",
    "Safely modifies Xcode projects (.pbxproj) to add Swift Packages and link files. Use this skill whenever an iOS project needs dependencies installed (e.g. Firebase, Alamofire).": "安全修改 Xcode 项目文件 (.pbxproj) 以添加 Swift Packages 依赖并链接源文件。",

    // === 补充：全量弹窗 (Modals / Dialogs / Toasts)、二级权限页与内联拆分片段 ===
    // 1. 归档、删除、重命名与对话操作弹窗/Toast
    "Conversation Archived": "对话已归档",
    "View archived conversations in": "可在以下位置查看已归档的对话：",
    "View archived conversations in history.": "可在历史记录中查看已归档的对话。",
    "Undo": "撤销",
    "Undo To Here": "撤回到此处",
    "Confirm Undo": "确认撤回",
    "Failed to rename conversation": "重命名对话失败",
    "Failed to delete conversation": "删除对话失败",
    "Failed to stop conversation": "停止对话失败",
    "Failed to start conversation": "启动对话失败",
    "Failed to fork conversation": "分支 (Fork) 对话失败",
    "Fork warning": "分支 (Fork) 警告",
    "Fork": "创建分支 (Fork)",
    "Create fork in current workspace": "在当前工作区创建对话分支",
    "Create fork in shared workspace": "在共享工作区创建对话分支",
    "Create fork in new workspace": "在新工作区创建对话分支",
    "Close split view and go to forked conversation": "关闭分栏视图并前往分支对话",
    "Open side-by-side view": "打开并排分栏视图",
    "Split Right": "向右分栏",
    "Split Down": "向下分栏",
    "Replace With New": "替换为新对话",
    "Remove From Split": "从分栏中移除",
    "Split Conversation Vertically": "垂直分栏对话",
    "Split Conversation Horizontally": "水平分栏对话",
    "Equalize Split Panes": "均分面板宽度",
    "Auto-dismissed due to conversation switching": "因切换对话已自动关闭",
    "Delete Task": "删除任务",
    "Are you sure you want to delete": "您确定要删除",
    "Are you sure you want to delete the": "您确定要删除",
    "Are you sure you want to delete this conversation? This action cannot be undone.": "您确定要删除此对话吗？此操作无法撤销。",
    "Are you sure you want to mark 1 conversation as read? This action cannot be undone.": "您确定要将 1 个对话标为已读吗？此操作无法撤销。",
    "Mark 1 conversation as read": "将 1 个对话标为已读",
    "Mark all as read": "全部标为已读",
    "Mark as read": "标为已读",
    "Failed to mark all as read": "全部标为已读失败",
    "This cannot be undone.": "此操作无法撤销。",
    "This will permanently delete": "这将永久删除",
    "within it.": "及其内部的全部内容。",
    "Archive / Restore": "归档 / 恢复",
    "Archive This Conversation": "归档此对话",
    "Pin This Conversation": "置顶此对话",
    "Unpin This Conversation": "取消置顶此对话",
    "Rename This Conversation": "重命名此对话",
    "Find in Conversation": "在对话中查找",
    "Copy Conversation Markdown": "复制对话为 Markdown",
    "Conversation copied as Markdown to clipboard": "已将对话以 Markdown 格式复制到剪贴板",
    "Share Conversation (Preview)": "分享对话（预览版）",
    "Sharing is a preview feature. It exports this conversation": "分享是一项预览功能，它会将此对话导出至",
    "user directory, and any Googler with the link can load and view it. Storage will move to Google Drive in a future version.": "用户目录，任何拥有链接的成员均可加载并查看。未来版本将迁移至 Google 云端硬盘存储。",
    "Conversation unavailable": "对话不可用",
    "The conversation could not be loaded because its data was not found.": "无法加载该对话，因为未找到其数据。",
    "This conversation is not on disk. Delete it to remove it from your sidebar.": "此对话不在本地磁盘上。请将其删除以从侧边栏移除。",
    "Pinned Conversations": "已置顶的对话",
    "Pinned Chats Only": "仅显示置顶对话",
    "Group By": "分组方式",
    "Group By Workspace": "按工作区分组",
    "Group By Project": "按项目分组",
    "Sidebar grouped by workspace": "侧边栏已按工作区分组",
    "Sidebar grouped by project": "侧边栏已按项目分组",
    "Updated sidebar grouping": "已更新侧边栏分组方式",
    "New Group": "新建分组",
    "Move to Group": "移动到分组",
    "Move to New Group": "移动到新分组",
    "Remove from Group": "从分组中移除",
    "Rename Group": "重命名分组",
    "Group name": "分组名称",
    "Conversation Name": "对话名称",
    "Conversation name": "对话名称",
    "Conversation ID": "对话 ID",
    "Project Name": "项目名称",
    "Delete Permanently": "永久删除",
    "Restore": "恢复",

    // 2. 远程调试 (Remote Debugging Required) 与浏览器配置弹窗
    "Remote Debugging Required": "需要启用远程调试 (Remote Debugging)",
    "Browser Configuration Required": "需要配置浏览器",
    "Browser control is gated in remote sessions.": "远程会话中受限使用浏览器控制功能。",
    "Chrome on the machine you are controlling is not accepting remote debugging. Complete these steps on that machine, not in this tab:": "您所控制机器上的 Chrome 未开启远程调试。请在那台机器上完成以下步骤（而非在当前标签页）：",
    "To use browser tools, you need to enable remote debugging:": "要使用内置浏览器工具，您需要先启用 Chrome 远程调试功能：",
    "Open Google Chrome on the machine running Antigravity.": "在运行 Antigravity 的电脑上打开 Google Chrome。",
    "If that machine is a cloudtop, reach it via": "如果该机器是云端桌面 (Cloudtop)，请通过以下地址访问：",
    "Go to": "前往",
    "on your cloudtop server": "（在您的云端服务器上）",
    "Navigate to": "在地址栏访问",
    "Allow remote debugging for this browser instance": "允许对此浏览器实例进行远程调试 (Allow remote debugging for this browser instance)",
    "DevTools port is still closed. Please make sure Chrome is running with remote debugging enabled.": "DevTools 调试端口仍处于关闭状态。请确保 Chrome 正在运行且已开启远程调试。",
    "The browser subagent has been disabled by your administrator. Contact your administrator to enable browser use.": "浏览器子智能体已被管理员禁用。请联系您的管理员以启用浏览器功能。",
    "Click to copy URL": "点击复制网址 (URL)",
    "Copy full URL to clipboard": "复制完整网址到剪贴板",
    "Failed to copy:": "复制失败：",
    "Copied to clipboard": "已复制到剪贴板",
    "Copied error": "已复制错误信息",
    "Copy error": "复制错误",
    "Copy error to clipboard": "复制错误信息到剪贴板",

    // 3. 权限二级子页面与工作区权限详情 (Security Preset / Tool Permissions / Workspace Settings)
    "Resolving permissions...": "正在解析权限...",
    "Folders these agents can access.": "这些智能体可以访问的文件夹。",
    "Access grants": "已授予的访问权限",
    "Commands and files these agents can use.": "这些智能体可以使用的命令与文件。",
    "Saving...": "正在保存...",
    "Confirm & Save": "确认并保存",
    "managed by your organization": "由您的组织统一管理",
    "Inherit Global": "继承全局设置",
    "Inherits your Global Permissions when working in this project.": "在此项目中工作时继承您的全局权限设置。",
    "Manually customize individual settings.": "手动自定义各项独立权限设置。",
    "Outside of folders file access policy": "工作区外文件夹访问策略",
    "Configures how the agent tries to access files outside of its working folders.": "配置智能体尝试访问其工作目录以外文件时的处理策略。",
    "Disabled by organization policy": "已被组织策略禁用",
    "Terminal Command Auto Execution": "终端命令自动执行策略",
    "Controls whether terminal commands require your approval before running.": "控制终端命令在运行前是否需要您的审批确认。",
    "Proceed in Sandbox": "在沙盒中自动执行",
    "Require Review": "需要人工审阅",
    "Enable Sandbox Mode (Preview)": "启用沙盒模式（预览版）",
    "Restricts agent tools to a secure, isolated local sandbox.": "将智能体工具限制在安全、隔离的本地沙盒环境中运行。",
    "Configure workspace-specific permissions, resources, and customizations.": "配置当前工作区专属的权限、资源与自定义项。",
    "Workspace File Access": "工作区文件访问权限",
    "Read Files": "读取文件",
    "Paths the agent can read inside this workspace.": "智能体在此工作区内可以读取的文件路径。",
    "Paths the agent can read.": "智能体可以读取的文件路径。",
    "Enter file or directory path...": "输入文件或目录路径...",
    "Write Files": "写入文件",
    "Paths the agent can modify inside this workspace.": "智能体在此工作区内可以修改的文件路径。",
    "Paths the agent can modify.": "智能体可以修改的文件路径。",
    "Workspace Command Access": "工作区命令执行权限",
    "Terminal commands the agent can execute in this workspace.": "智能体在此工作区内可以执行的终端命令。",
    "Terminal commands the agent can execute.": "智能体可以执行的终端命令。",
    "Enter command (e.g., git, blaze)...": "输入命令（例如 git、npm）...",
    "Commands the agent can run outside the sandbox in this workspace.": "智能体在此工作区内可以在沙盒外运行的命令。",
    "Commands the agent can run outside the sandbox.": "智能体可以在沙盒外运行的命令。",
    "External tools the agent can call via Model Context Protocol.": "智能体可通过模型上下文协议 (MCP) 调用的外部工具。",
    "Enter tool name or server...": "输入工具名称或服务器名称...",
    "Workspace Web Access": "工作区网络访问权限",
    "Read URLs": "读取网址 (Read URLs)",
    "URLs the agent can read or open in this workspace.": "智能体在此工作区内可以读取或打开的网址。",
    "URLs the agent can read or open in the browser.": "智能体可以在浏览器中读取或打开的网址。",
    "Enter URL pattern...": "输入网址匹配规则...",
    "Execute URLs": "操作网址 (Execute URLs)",
    "URLs the agent can actuate on in this workspace.": "智能体在此工作区内可以进行交互操作的网址。",
    "URLs the agent can actuate on using the browser.": "智能体可以使用浏览器进行交互操作的网址。",
    "Browser Actuation Permissions": "浏览器自动化交互权限",
    "Allow/deny agent browser actuation access to specific URLs.": "允许或禁止智能体对特定网址进行浏览器自动化操作。",
    "Organization Allowed Domains (Read-Only)": "组织允许的域名白名单（只读）",
    "These allowed domain rules are set by your organization": "这些允许访问的域名规则由您的组织设定",
    "File Reads": "文件读取规则",
    "Allow/deny agent read access to specific files or directories.": "允许或禁止智能体读取特定文件或目录。",
    "File Writes": "文件写入规则",
    "Allow/deny agent write access to specific files or directories.": "允许或禁止智能体写入或修改特定文件或目录。",
    "Allow/deny agent read access to specific URLs or domains.": "允许或禁止智能体读取特定网址或域名。",
    "Allow/deny specific terminal commands.": "允许或禁止执行特定终端命令。",
    "Allow/deny agent command execution outside the sandbox.": "允许或禁止智能体在沙盒外执行命令。",
    "File Access Rules": "文件访问规则",
    "Configure allowed and denied paths for file reads and writes.": "配置允许和禁止文件读写的路径规则。",
    "Configure allowed terminal commands.": "配置允许执行的终端命令。",
    "Configure external tools via Model Context Protocol.": "通过模型上下文协议 (MCP) 配置外部工具权限。",
    "Configure GitHub access policies.": "配置 GitHub 访问策略与精细化权限。",
    "Advanced File Access": "高级文件访问权限",
    "Advanced Command Access": "高级命令访问权限",
    "Advanced Web Access": "高级网络访问权限",
    "Global Permission Settings": "全局权限设置",
    "Permission Preset": "权限预设方案",
    "Agent Security Settings": "智能体安全设置",
    "Ask first": "先询问我",
    "Always run": "始终运行",
    "Allow once": "允许一次",
    "Ask every time": "每次询问",
    "Got it": "知道了",
    "Block": "拦截",

    // 4. 所有隐藏/高级设置项标签与描述 (来自 Fast:label / Fast:description)
    "Show a floating notification card when background conversations need your input. Answer questions, approve commands, and grant permissions without leaving your current conversation. Share feedback at go/inline-actions-feedback.": "当后台对话需要您的输入时显示浮动通知卡片，无需离开当前对话即可回答问题、批准命令和授予权限。",
    "A permanent Chief of Staff conversation in the sidebar that manages your other conversations: delegate tasks, check status, and read results from one place.": "在侧边栏常驻的智能幕僚长 (Chief of Staff) 对话，集中管理您的其他对话：委派任务、检查状态并汇总结果。",
    "Adds an Autonomous Mode switch to the modes dropdown below the input box. Turns sent with it on run non-interactively: the agent does not ask questions or request new permissions.": "在输入框下方的模式菜单中添加“自主执行模式”开关。开启后将以非交互方式运行：智能体不会中途提问或请求新权限。",
    "Agent never asks for review. This maximizes the autonomy of the Agent, but also has the highest risk of the Agent operating over unsafe or injected Artifact content.": "智能体从不请求审阅。这能最大化智能体的自主性，但也存在处理不安全内容时的最高风险。",
    "Agent always asks for review.": "智能体始终请求人工审阅。",
    "Every command requires approval.": "每条命令都需要审批确认。",
    "Ask before sensitive operations.": "在执行敏感操作前询问。",
    "Security agent decides if commands run.": "由安全智能体自动评估决定是否运行命令。",
    "Automatically decide if commands run.": "自动判断并决定是否运行命令。",
    "Run all commands without restrictions.": "无限制自动运行所有命令。",
    "The agent auto-executes commands matched by an allow list entry.": "智能体会自动执行匹配白名单规则的终端命令。",
    "The agent asks for permission before executing commands matched by a deny list entry.": "智能体在执行匹配黑名单规则的命令前会先请求您的许可。",
    "Give the agent awareness of lint errors created by its edits so it can fix them without explicit prompting.": "让智能体自动感知其编辑引入的 Lint 代码检查错误，并在无需额外提示的情况下自动修复。",
    "Enforce settings that prevent the agent from autonomously running targeted exploits and require human review for all agent actions. Visit antigravity.google/docs/strict-mode for details.": "强制启用严格安全设置，防止智能体自主运行高风险操作，并要求所有智能体操作均经过人工审阅。",
    "A shell setup script run before every command the agent executes.": "在智能体执行每条终端命令之前自动运行的 Shell 初始化脚本。",
    "Run terminal commands with sandbox restrictions.": "在受沙盒限制的隔离环境中运行终端命令。",
    "Allow sandboxed commands to make network requests.": "允许沙盒内的命令发起网络请求。",
    "Use the IDE's shell integration to detect and report terminal command execution. When disabled, the agent uses its own shell. Restart the application for this to take effect.": "使用 IDE 的 Shell 集成来检测和报告终端命令执行情况。禁用时智能体将使用内置 Shell（重启应用后生效）。",
    "Specifies the agent's behavior when asking for review on artifacts, which are documents it creates to enable a richer conversation experience.": "指定智能体在请求审阅生成文档 (Artifact) 时的策略行为。",
    "Play a sound when the agent finishes generating a response.": "当智能体完成回复生成时播放提示音。",
    "Show browser notifications when your action is needed or execution finishes.": "当需要您操作或任务执行完成时显示桌面通知。",
    "Automatically expand the Changes Overview toolbar when the agent finishes generating a response.": "当智能体完成回复时自动展开“更改概览”工具栏。",
    "Let the agent access past conversations to inform its responses.": "允许智能体参考历史对话记录以提供更准确的回复。",
    "Open files in the background if the agent creates or edits them": "当智能体创建或编辑文件时在后台自动打开文件",
    "Open files in the background if Agent creates or edits them": "当智能体创建或编辑文件时在后台自动打开文件",
    "Open the agent panel on window reload": "重新加载窗口时自动打开智能体面板",
    "Open Agent panel on window reload": "重新加载窗口时自动打开智能体面板",
    "Replace the default browser right-click menu with quick actions.": "使用快捷操作菜单替换默认的右键菜单。",
    "Configure the default width of markdown artifacts.": "配置 Markdown 生成文档 (Artifact) 的默认显示宽度。",
    "Show suggestions when typing in the editor": "在编辑器中输入代码时显示自动补全建议",
    "Predict the location of your next edit and navigate you there with a tab keypress.": "预测您下一个要编辑的代码位置，按 Tab 键即可直接跳转。",
    "Quickly add and update imports with a tab keypress.": "按 Tab 键快速添加和更新代码导入 (Imports)。",
    "Set the speed of tab suggestions": "设置 Tab 补全建议的触发速度",
    "Highlight newly inserted text after accepting a Tab completion.": "接受 Tab 补全后高亮显示新插入的代码文本。",
    "Allow Tab to view and edit the files in .gitignore. Use with caution if your .gitignore lists files containing credentials, secrets, or other sensitive information.": "允许 Tab 补全查看和编辑 .gitignore 中的文件。若 .gitignore 包含密钥或敏感凭证，请谨慎开启。",
    "Path to the Chrome/Chromium executable. Leave empty for auto-detection.": "Chrome/Chromium 可执行文件的路径。留空则自动检测。",
    "Custom path for the browser user profile directory. Leave empty for default (~/.gemini/antigravity-browser-profile).": "浏览器用户配置目录的自定义路径。留空则使用默认路径 (~/.gemini/antigravity-browser-profile)。",
    "Port number for Chrome DevTools Protocol remote debugging. Leave empty for default (9222).": "Chrome DevTools 协议远程调试端口号。留空则使用默认端口 (9222)。",
    "Include default customizations, such as default skills.": "包含系统默认的自定义项（如内置默认技能）。",
    "Automatically prompt you to restart the app when a new update is available. When disabled, you can check for updates manually from the app menu.": "当有新版本可用时自动提示重启应用。禁用后仍可通过应用菜单手动检查更新。",
    "Manage your conversations from the companion website.": "从配套网页端远程管理您的本地对话。",
    "A nickname for identifying this application in the companion website. Changing this will restart the connection.": "用于在配套网页端识别此客户端的设备昵称（修改后将重新建立连接）。",
    "A label for this computer when you connect from another device. Changing it reconnects.": "从其他设备连接时显示的本机名称标签（修改后将重新连接）。",
    "Continue your work from another device with Remote Control. Scan the QR code or open the link below.": "使用远程控制从其他设备继续您的工作。请扫描二维码或打开下方链接。",
    "Allow List Terminal Commands": "终端命令白名单",
    "Deny List Terminal Commands": "终端命令黑名单",
    "Agent Auto-Fix Lints": "智能体自动修复 Lint 错误",
    "Confirm Window Reload": "重新加载窗口前确认",
    "Enable Demo Mode (Beta)": "启用演示模式 (Beta)",
    "Explain and Fix in Current Conversation": "在当前对话中解释并修复",
    "Strict Mode": "严格安全模式 (Strict Mode)",
    "Agent Non-Workspace File Access": "允许智能体访问非工作区文件",
    "Command Setup Script": "命令前置初始化脚本",
    "Enable Terminal Sandbox": "启用终端沙盒",
    "Sandbox Allow Network": "允许沙盒访问网络",
    "Enable Shell Integration": "启用 Shell 集成",
    "Agent Host Address": "智能体主机地址",
    "Review Policy": "审阅策略",
    "Enable Sounds for Agent": "启用智能体提示音",
    "Enable Notifications for Agent": "启用智能体桌面通知",
    "Auto-Expand Changes Overview": "自动展开更改概览",
    "Auto-Open Edited Files": "自动打开已编辑的文件",
    "Open Agent on Reload": "重载时打开智能体面板",
    "Custom Context Menus": "自定义右键快捷菜单",
    "Markdown Artifact Width": "Markdown 文档宽度",
    "Suggestions in Editor": "编辑器内代码建议",
    "Tab to Jump": "按 Tab 键跳转编辑点",
    "Tab to Import": "按 Tab 键自动导入",
    "Tab Speed": "Tab 补全响应速度",
    "Highlight After Accept": "接受补全后高亮代码",
    "Tab Gitignore Access": "Tab 补全访问 .gitignore 文件",
    "Enable Browser Tools": "启用内置浏览器工具",
    "Chrome Binary Path": "Chrome 可执行文件路径",
    "Browser User Profile Path": "浏览器用户数据目录",
    "Browser CDP Port": "浏览器 CDP 调试端口",
    "Include Jetski Default Customizations": "包含系统默认自定义项",
    "Automatic Check for Updates": "自动检查更新",
    "Nickname": "设备昵称",
    "Device Name": "设备名称",
    "Local Windows environment": "本地 Windows 环境",
    "Not Signed In": "未登录",

    // 5. Git、MCP、Hooks、插件与工作区弹窗提示
    "Browse the Marketplace": "浏览插件市场",
    "Explore the plugin marketplace": "探索插件市场",
    "Loading MCP servers...": "正在加载 MCP 服务器...",
    "Search for MCP servers to add to your configuration": "搜索要添加到配置中的 MCP 服务器",
    "Installed MCP Servers": "已安装的 MCP 服务器",
    "Refresh MCP servers": "刷新 MCP 服务器列表",
    "Add MCP Servers": "添加 MCP 服务器",
    "Delete MCP Server": "删除 MCP 服务器",
    "Delete Skill": "删除技能",
    "Manage Skills": "管理技能",
    "Installed Skills": "已安装的技能",
    "Refresh skills paths": "刷新技能路径",
    "Skill Custom Paths": "自定义技能路径",
    "This skill came from the marketplace, so you can add it again whenever you need it.": "此技能来自插件市场，您可以随时重新添加。",
    "Deleting...": "正在删除...",
    "Loading hooks...": "正在加载钩子 (Hooks)...",
    "Agent Hooks Configuration": "智能体钩子 (Hooks) 配置",
    "Manage Hooks": "管理钩子 (Hooks)",
    "New hook name": "新钩子名称",
    "Add Handler": "添加处理程序",
    "Delete Hook": "删除钩子",
    "Add Hook Card": "添加钩子卡片",
    "Delete Handler": "删除处理程序",
    "Save Configuration": "保存配置",
    "Configuration saved successfully!": "配置已成功保存！",
    "Hook with this name already exists": "已存在同名钩子",
    "Are you sure you want to delete this handler?": "您确定要删除此处理程序吗？",
    "Are you sure you want to delete this hook card?": "您确定要删除此钩子卡片吗？",
    "Configure hooks that run on agent lifecycle events.": "配置在智能体生命周期事件触发时运行的钩子脚本。",
    "Hook will trigger if any tool is executed.": "当执行任何工具时均触发此钩子。",
    "Hook will only trigger if the tool name matches run_command.": "仅当工具名称为 run_command 时触发此钩子。",
    "Hook will only trigger if the tool name matches run_command or view_file.": "仅当工具名称为 run_command 或 view_file 时触发此钩子。",
    "Hook will only trigger if the tool name starts with browser_.": "仅当工具名称以 browser_ 开头时触发此钩子。",
    "All tools (*)": "所有工具 (*)",
    "Browser tools (browser_.*)": "浏览器工具 (browser_.*)",
    "Commit": "提交 (Commit)",
    "Amend": "修正提交 (Amend)",
    "Push": "推送 (Push)",
    "Include unstaged changes": "包含未暂存的更改",
    "Added (Staged)": "新增（已暂存）",
    "Untracked (Unstaged)": "未跟踪（未暂存）",
    "Modified": "已修改",
    "Renamed": "已重命名",
    "Staged Changes": "已暂存的更改",
    "Changes": "更改",
    "Branch Changes": "分支更改",
    "Files Changed": "已更改的文件",
    "Modified Files": "已修改的文件",
    "True changes vs the parent workspace": "相对于父工作区的实际更改",
    "Files modified by the agent in this conversation": "智能体在本次对话中修改的文件",
    "Staged index changes and working tree changes": "暂存区更改与工作区更改",
    "Unstage change": "取消暂存更改",
    "Stage change": "暂存更改",
    "Discard unstaged changes": "放弃未暂存的更改",
    "Revert file changes": "还原文件更改",
    "Commit succeeded": "提交成功",
    "Amend succeeded": "修正提交成功",
    "Push succeeded": "推送成功",
    "Failed to Commit": "提交失败",
    "Failed to Amend": "修正提交失败",
    "Failed to Push": "推送失败",
    "Failed to Generate Commit Message": "生成提交信息失败",
    "Insufficient AI Credits": "AI 点数不足",
    "Model quota reached": "已达到模型配额上限",
    "Baseline model quota reached": "已达到基础模型配额上限",
    "Error Loading Models": "加载模型列表出错",
    "No Models Available": "暂无可用模型",
    "No Model Selected": "未选择模型",
    "Select Model to Send Message": "请选择模型以发送消息",
    "Select another model": "选择其他模型",
    "Enable Overages": "启用超额点数抵扣",
    "Purchase Credits": "购买 AI 点数",
    "See Plans": "查看订阅计划",
    "Verification required": "需要验证",
    "Complete verification": "完成验证",
    "Agent terminated due to error": "智能体因错误已终止运行",
    "Create Project": "创建项目",
    "Working directory:": "工作目录：",
    "Logs": "日志",
    "Errors": "错误",
    "Allow listing project files?": "允许列出项目文件吗？",
    "Requesting permission ": "正在请求权限 ",
    "Yes, and always allow '...' in this conversation": "是，且在本对话中始终允许“...”"
  };

  // 构建大小写不敏感索引与精确索引
  const EXACT_MAP = new Map();
  const LOWER_MAP = new Map();
  for (const [k, v] of Object.entries(RAW_MAP)) {
    const trimmed = k.trim();
    EXACT_MAP.set(trimmed, v);
    LOWER_MAP.set(trimmed.toLowerCase(), v);
  }

  // 复合动作短语词典（如 "Explored files, ran commands, edited files" 或 "Running commands, editing files"）
  const ACTION_PART_MAP = {
    "explored files": "已探索文件",
    "exploring files": "正在探索文件",
    "explored file": "已探索文件",
    "exploring file": "正在探索文件",
    "ran commands": "已运行命令",
    "running commands": "正在运行命令",
    "ran command": "已运行命令",
    "running command": "正在运行命令",
    "edited files": "已编辑文件",
    "editing files": "正在编辑文件",
    "edited file": "已编辑文件",
    "editing file": "正在编辑文件",
    "viewed files": "已查看文件",
    "viewing files": "正在查看文件",
    "viewed file": "已查看文件",
    "viewing file": "正在查看文件",
    "read files": "已读取文件",
    "reading files": "正在读取文件",
    "created files": "已创建文件",
    "creating files": "正在创建文件",
    "deleted files": "已删除文件",
    "deleting files": "正在删除文件",
    "searched code": "已搜索代码",
    "searching code": "正在搜索代码",
    "searched web": "已搜索网页",
    "searching web": "正在搜索网页",
    "searched files": "已搜索文件",
    "searching files": "正在搜索文件",
    "analyzed files": "已分析文件",
    "analyzing files": "正在分析文件",
    "used tools": "已调用工具",
    "using tools": "正在调用工具",
    "invoked subagents": "已调用子智能体",
    "invoking subagents": "正在调用子智能体"
  };

  // 2. 动态正则替换规则（处理带数字、秒数、文件名、快捷键、配额倒计时等动态文本）
  const REGEX_RULES = [
    [/^Thinking for (\d+)\s*s(?:ec(?:ond)?s?)?$/i, "已思考 $1 秒"],
    [/^Thought for (\d+)\s*s(?:ec(?:ond)?s?)?$/i, "思考用时 $1 秒"],
    [/^Thought for (<1|\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?$/i, "思考用时 $1 秒"],
    [/^Thought for (\d+)m\s*(\d+)s$/i, "思考用时 $1 分 $2 秒"],
    [/^Worked for (\d+)\s*s(?:ec(?:ond)?s?)?$/i, "执行用时 $1 秒"],
    [/^Worked for (\d+)m\s*(\d+)s$/i, "执行用时 $1 分 $2 秒"],
    [/^Worked for (.+)$/i, "执行用时 $1"],
    [/^Working for (.+)$/i, "已执行 $1"],
    [/^Running for (.+)$/i, "已运行 $1"],
    [/^Select model, current:\s*(.+)$/i, "选择模型，当前：$1"],
    [/^Select project, current:\s*(.+)$/i, "选择项目，当前：$1"],
    [/^No more older messages, showing (\d+) of (\d+)$/i, "没有更多历史消息，当前显示 $1 / $2 条"],
    [/^Load older messages, showing (\d+) of (\d+)$/i, "加载更早的消息（当前显示 $1 / $2 条）"],
    [/^Showing (\d+) of (\d+)$/i, "显示 $1 / $2"],
    [/^Show (\d+) breakdowns?$/i, "展开 $1 项明细"],
    [/^Hide (\d+) breakdowns?$/i, "收起 $1 项明细"],
    [/^Rules:\s*([\d,]+)\s*tokens?$/i, "规则：$1 tokens"],
    [/^Skills:\s*([\d,]+)\s*tokens?$/i, "技能：$1 tokens"],
    [/^Subagents:\s*([\d,]+)\s*tokens?$/i, "子智能体：$1 tokens"],
    [/^Mcp Tools:\s*([\d,]+)\s*tokens?$/i, "MCP 工具：$1 tokens"],
    [/^Send feedback as (.+)$/i, "以 $1 身份发送反馈"],
    [/^Toggle (.+)$/i, "切换 $1"],
    [/^Delete (.+)$/i, "删除 $1"],
    [/^Updated (.+)$/i, "更新于 $1"],
    [/^Fold lines (\d+)-(\d+)$/i, "折叠第 $1-$2 行"],
    [/^You have used some of your weekly limit, it will fully refresh in (\d+) days?, (\d+) hours?\.$/i, "您已使用部分本周额度，将在 $1 天 $2 小时后完全重置。"],
    [/^You have used some of your weekly limit, it will fully refresh in (.+)\.$/i, "您已使用部分本周额度，将在 $1 后完全重置。"],
    [/^You have used some of your 5-hour limit, it will fully refresh in (\d+) hours?, (\d+) minutes?\.$/i, "您已使用部分 5 小时周期额度，将在 $1 小时 $2 分钟后完全重置。"],
    [/^You have used some of your 5-hour limit, it will fully refresh in (.+)\.$/i, "您已使用部分 5 小时周期额度，将在 $1 后完全重置。"],
    [/^Are you sure you want to delete (.+)\?$/i, "您确定要删除 $1 吗？"],
    [/^Are you sure you want to archive (.+)\?$/i, "您确定要归档 $1 吗？"],
    [/^Mark (\d+) conversations? as read$/i, "将 $1 个对话标为已读"],
    [/^Message from (.+)$/i, "来自 $1 的消息"],
    [/^Cancel \((.+)\)$/i, "取消 ($1)"],
    [/^Close \((.+)\)$/i, "关闭 ($1)"],
    [/^Submit \((.+)\)$/i, "提交 ($1)"],
    [/^Send \((.+)\)$/i, "发送 ($1)"],
    [/^Previous match \((.+)\)$/i, "上一个匹配项 ($1)"],
    [/^Next match \((.+)\)$/i, "下一个匹配项 ($1)"],
    [/^Clear search \((.+)\)$/i, "清除搜索 ($1)"],
    [/^Explored (\d+) files?$/i, "已探索 $1 个文件"],
    [/^Exploring (\d+) files?$/i, "正在探索 $1 个文件"],
    [/^Searched (\d+) files?$/i, "已搜索 $1 个文件"],
    [/^Read (\d+) files?$/i, "已读取 $1 个文件"],
    [/^Viewed (\d+) files?$/i, "已查看 $1 个文件"],
    [/^Edited (\d+) files?$/i, "已编辑 $1 个文件"],
    [/^Editing (\d+) files?$/i, "正在编辑 $1 个文件"],
    [/^Created (\d+) files?$/i, "已创建 $1 个文件"],
    [/^Ran (\d+) commands?$/i, "已运行 $1 条命令"],
    [/^Running (\d+) commands?$/i, "正在运行 $1 条命令"],
    [/^(\d+) files? changed$/i, "$1 个文件已更改"],
    [/^(\d+) conversations?$/i, "$1 个对话"],
    [/^(\d+) selected$/i, "已选择 $1 项"],
    [/^(\d+) results?$/i, "$1 个结果"],
    [/^(\d+) items?$/i, "$1 项"],
    [/^(\d+) tasks?$/i, "$1 个任务"],
    [/^(\d+) subagents?$/i, "$1 个子智能体"],
    [/^(\d+) plugins?$/i, "$1 个插件"],
    [/^(\d+) rules?$/i, "$1 条规则"],
    [/^(\d+) skills?$/i, "$1 项技能"],
    [/^(\d+)s ago$/i, "$1 秒前"],
    [/^(\d+)m ago$/i, "$1 分钟前"],
    [/^(\d+)h ago$/i, "$1 小时前"],
    [/^(\d+)d ago$/i, "$1 天前"],
    [/^Just now$/i, "刚刚"],
    [/^Yes, and always allow '(.+)' in this conversation$/i, "是，且在本对话中始终允许 $1"],
    [/^Yes, and always allow (.+) in this conversation$/i, "是，且在本对话中始终允许 $1"],
    [/^Yes, and always allow '(.+)' in this project$/i, "是，且在本项目中始终允许 $1"],
    [/^Yes, and always allow (.+) in this project$/i, "是，且在本项目中始终允许 $1"],
    [/^Yes, save rule (.+)$/i, "是，并保存规则 $1"],
    [/^Always allow (.+)$/i, "始终允许 $1"],
    [/^Allow (.+)\?$/i, "允许 $1 吗？"],
    [/^Run (.+)\?$/i, "运行 $1 吗？"],
    [/^Running (.+)$/i, "正在运行 $1"],
    [/^Ran (.+)$/i, "已运行 $1"],
    [/^Wait for (.+)$/i, "等待 $1"],
    [/^Reading terminal:(.+)$/i, "读取终端：$1"],
    [/^Error while editing (.+)$/i, "编辑 $1 时出错"],
    [/^Error while viewing (.+)$/i, "查看 $1 时出错"],
    [/^Error while running (.+)$/i, "运行 $1 时出错"],
    [/^Error while (.+)$/i, "执行 $1 时出错"],
    [/^Version\s+([0-9.]+.*)$/i, "版本 $1"]
  ];

  function translateCompoundActions(trimmed) {
    if (!trimmed.includes(',')) return null;
    const parts = trimmed.split(',').map((s) => s.trim().toLowerCase());
    if (parts.length < 2) return null;
    const translatedParts = [];
    for (const p of parts) {
      if (ACTION_PART_MAP[p]) {
        translatedParts.push(ACTION_PART_MAP[p]);
      } else {
        return null;
      }
    }
    return translatedParts.join('、');
  }

  function lookupCore(trimmed) {
    let mapped = EXACT_MAP.get(trimmed);
    if (!mapped) {
      mapped = LOWER_MAP.get(trimmed.toLowerCase());
    }
    if (mapped) return mapped;

    const compound = translateCompoundActions(trimmed);
    if (compound) return compound;

    for (const [regex, replacement] of REGEX_RULES) {
      if (regex.test(trimmed)) {
        return trimmed.replace(regex, replacement);
      }
    }
    return null;
  }

  function translateString(str) {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    if (!trimmed) return null;
    
    // 如果已经包含中文字符且不是纯英文词条，跳过避免重复替换
    if (/[\u4e00-\u9fa5]/.test(trimmed) && !EXACT_MAP.has(trimmed)) {
      const allowedPrefixes = ['Allow ', 'Save rule ', 'Yes, ', 'Running ', 'Ran ', 'Error while ', 'Requesting permission ', 'Run ', 'Wait for ', 'Reading terminal:'];
      const hasAllowedPrefix = allowedPrefixes.some(prefix => trimmed.startsWith(prefix));
      if (!hasAllowedPrefix) {
        return null;
      }
    }

    const leading = str.match(/^\s*/)[0];
    const trailing = str.match(/\s*$/)[0];

    // 1. 直接匹配
    let res = lookupCore(trimmed);
    if (res) return leading + res + trailing;

    // 2. 若首尾包裹了英文双引号或单引号（例如 "Allow remote debugging for this browser instance"）
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 2)
    ) {
      const inner = trimmed.slice(1, -1).trim();
      const innerRes = lookupCore(inner);
      if (innerRes) {
        return leading + '“' + innerRes + '”' + trailing;
      }
    }

    // 3. 若带有序号前缀（例如 "1. Open" 或 "2. Navigate to"）
    const numMatch = trimmed.match(/^(\d+\.\s+)(.+)$/);
    if (numMatch) {
      const restRes = lookupCore(numMatch[2].trim());
      if (restRes) {
        return leading + numMatch[1] + restRes + trailing;
      }
    }

    // 4. 若末尾带冒号或句号（例如 "Navigate to:" 或 "View archived conversations in."）
    if (trimmed.endsWith(':') || trimmed.endsWith('.')) {
      const punc = trimmed.endsWith(':') ? '：' : '。';
      const bare = trimmed.slice(0, -1).trim();
      const bareRes = lookupCore(bare);
      if (bareRes) {
        return leading + bareRes + punc + trailing;
      }
    }

    return null;
  }

  // 检查节点是否处于不可翻译的代码/编辑器/输入框区域
  const SKIP_TAGS = new Set(['CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA', 'SVG', 'PATH']);
  function shouldSkipElement(el) {
    if (!el || el.nodeType !== 1) return true;
    let cur = el;
    while (cur && cur.nodeType === 1) {
      if (SKIP_TAGS.has(cur.tagName)) return true;
      if (cur.getAttribute && cur.getAttribute('contenteditable') === 'true') return true;
      const cls = typeof cur.className === 'string' ? cur.className : '';
      if (
        cls.includes('monaco-editor') ||
        cls.includes('xterm') ||
        cls.includes('cm-editor') ||
        cls.includes('prism') ||
        cls.includes('hljs') ||
        cls === 'token' ||
        cls.includes('token ')
      ) {
        return true;
      }
      cur = cur.parentElement;
    }
    return false;
  }

  function processTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    const parent = node.parentElement;
    if (!parent || shouldSkipElement(parent)) return;
    const val = node.nodeValue;
    if (!val || val.length > 1200) return;
    const translated = translateString(val);
    if (translated && translated !== val) {
      node.nodeValue = translated;
    }
  }

  const ATTRS = ['placeholder', 'title', 'aria-label'];
  function processElementAttrs(el) {
    if (!el || el.nodeType !== 1) return;
    for (const attr of ATTRS) {
      if (el.hasAttribute && el.hasAttribute(attr)) {
        const val = el.getAttribute(attr);
        const translated = translateString(val);
        if (translated && translated !== val) {
          el.setAttribute(attr, translated);
        }
      }
    }
  }

  function walkAndTranslate(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      processTextNode(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      processElementAttrs(root);
      if (shouldSkipElement(root)) return;
    }

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      null
    );
    let current = walker.nextNode();
    while (current) {
      if (current.nodeType === 3) {
        processTextNode(current);
      } else if (current.nodeType === 1) {
        processElementAttrs(current);
      }
      current = walker.nextNode();
    }
  }

  let scheduled = false;
  const pendingNodes = new Set();

  function flushPending() {
    scheduled = false;
    const nodes = Array.from(pendingNodes);
    pendingNodes.clear();
    for (const n of nodes) {
      walkAndTranslate(n);
    }
  }

  function scheduleWalk(node) {
    pendingNodes.add(node || document.body);
    if (!scheduled) {
      scheduled = true;
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(flushPending);
      } else {
        setTimeout(flushPending, 16);
      }
    }
  }

  function initObserver() {
    if (!document.body) {
      setTimeout(initObserver, 50);
      return;
    }

    if (window.__AGY_ZH_CN_OBSERVER__) {
      window.__AGY_ZH_CN_OBSERVER__.disconnect();
    }

    walkAndTranslate(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'characterData') {
          processTextNode(m.target);
        } else if (m.type === 'attributes') {
          processElementAttrs(m.target);
        } else if (m.type === 'childList') {
          for (const added of m.addedNodes) {
            if (added.nodeType === 3) {
              processTextNode(added);
            } else if (added.nodeType === 1) {
              scheduleWalk(added);
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS
    });

    window.__AGY_ZH_CN_OBSERVER__ = observer;
    window.__AGY_ZH_CN_SCAN__ = () => walkAndTranslate(document.body);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObserver);
  } else {
    initObserver();
  }
})();