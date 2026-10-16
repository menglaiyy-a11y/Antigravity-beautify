# =====================================================================
# Antigravity 电脑全局桌面伴侣 (Desktop Pet)
# 特性：纯原生 WPF、完全无边框透明渲染、点击与拖拽精准分离、实时额度同步、一键唤出总控
# =====================================================================

param(
    [switch]$HiddenConsole = $false
)

$ErrorActionPreference = "Stop"

# 加载必要程序集
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Drawing, System.Windows.Forms, System.Web.Extensions

$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$ser.MaxJsonLength = 67108864

# 项目根目录与皮肤目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$skinsMetaPath = Join-Path $scriptDir "assets\pet_skins\skins.json"
$DevToolsPortFile = "C:\Users\31411\AppData\Roaming\Antigravity\DevToolsActivePort"
$quotaCachePath = Join-Path $env:TEMP "antigravity_quota_cache.json"

if (-not (Test-Path $skinsMetaPath)) {
    throw "未找到桌宠皮肤元数据: $skinsMetaPath"
}

# 1. 读取皮肤列表
$skinsMetaJson = [System.IO.File]::ReadAllText($skinsMetaPath, [System.Text.Encoding]::UTF8)
$skinsList = $ser.DeserializeObject($skinsMetaJson)

if ($skinsList.Count -eq 0) {
    throw "皮肤列表为空！"
}

# 预加载所有皮肤的帧图片进入显存/内存 (BitmapImage)
$loadedSkins = @()
foreach ($s in $skinsList) {
    $skinDir = $s["dir"]
    $frames = @()
    for ($i = 0; $i -lt $s["frameCount"]; $i++) {
        $frameFileName = "frame_" + $i.ToString("D2") + ".png"
        $framePath = Join-Path $skinDir $frameFileName
        if (Test-Path $framePath) {
            $bmp = New-Object System.Windows.Media.Imaging.BitmapImage
            $bmp.BeginInit()
            $bmp.UriSource = [Uri](Resolve-Path $framePath).Path
            $bmp.CacheOption = [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
            $bmp.EndInit()
            $bmp.Freeze()
            $frames += $bmp
        }
    }
    if ($frames.Count -gt 0) {
        $loadedSkins += @{
            id = $s["id"]
            name = $s["name"]
            fps = $s["fps"]
            frames = $frames
        }
    }
}

if ($loadedSkins.Count -eq 0) {
    throw "未能成功加载任何皮肤帧！"
}

$currentSkinIndex = 0
$currentFrameIndex = 0

# 2. CDP 通信模块 (调出总控、读取额度、窗口置顶激活)
function Send-CdpCommand($method, $params = @{}) {
    if (-not (Test-Path -LiteralPath $DevToolsPortFile)) {
        return $null
    }
    try {
        $port = (Get-Content $DevToolsPortFile)[0].Trim()
        $wc = New-Object System.Net.WebClient
        $wc.Encoding = [System.Text.Encoding]::UTF8
        $targets = $ser.DeserializeObject($wc.DownloadString("http://127.0.0.1:$port/json"))
        
        $page = $null
        foreach ($t in $targets) {
            if ($t.ContainsKey("type") -and $t["type"] -eq "page" -and $t.ContainsKey("webSocketDebuggerUrl")) {
                $page = $t
                break
            }
        }
        if (-not $page) { return $null }

        $wsUrl = $page["webSocketDebuggerUrl"].ToString()
        $ws = New-Object System.Net.WebSockets.ClientWebSocket
        $ct = [System.Threading.CancellationToken]::None
        $ws.ConnectAsync([Uri]$wsUrl, $ct).Wait(2000)

        $reqObj = @{
            id = 1
            method = $method
            params = $params
        }
        $reqJson = $ser.Serialize($reqObj)
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($reqJson)
        $seg = New-Object System.ArraySegment[byte]($bytes, 0, $bytes.Length)
        $ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait(3000)

        $ms = New-Object System.IO.MemoryStream
        $buf = New-Object byte[] 65536
        $rseg = New-Object System.ArraySegment[byte]($buf, 0, $buf.Length)
        do {
            $res = $ws.ReceiveAsync($rseg, $ct).GetAwaiter().GetResult()
            $ms.Write($buf, 0, $res.Count)
        } while (-not $res.EndOfMessage)

        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", $ct).Wait(1000)
        $respJson = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
        return $ser.DeserializeObject($respJson)
    } catch {
        return $null
    }
}

function Invoke-OpenVisualPanel {
    # 1. 唤出总控抽屉
    $evalJs = "window.agVisualPanel ? window.agVisualPanel.open() : (document.getElementById('ag-theme-pill') && document.getElementById('ag-theme-pill').click());"
    Send-CdpCommand "Runtime.evaluate" @{ expression = $evalJs; returnByValue = $true } | Out-Null
    
    # 2. 将 Antigravity 窗口带到最前并激活
    Send-CdpCommand "Page.bringToFront" @{} | Out-Null
}

function Get-LiveQuota {
    $evalJs = @'
(async () => {
    try {
        if (window.agVisualPanel && typeof window.agVisualPanel.fetchQuota === 'function') {
            return await window.agVisualPanel.fetchQuota();
        }
        const csrf = window.__APP_CONFIG__?.csrfToken || '';
        const resp = await fetch('/exa.language_server_pb.LanguageServerService/GetUserStatus', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-codeium-csrf-token': csrf
            },
            body: '{}'
        });
        const json = await resp.json();
        return json.userStatus || null;
    } catch (e) {
        return null;
    }
})()
'@
    $res = Send-CdpCommand "Runtime.evaluate" @{ expression = $evalJs; awaitPromise = $true; returnByValue = $true }
    if ($res -and $res.ContainsKey("result") -and $res["result"].ContainsKey("result") -and $res["result"]["result"].ContainsKey("value")) {
        $quotaData = $res["result"]["result"]["value"]
        if ($quotaData) {
            # 缓存到本地
            try {
                [System.IO.File]::WriteAllText($quotaCachePath, $ser.Serialize($quotaData), [System.Text.Encoding]::UTF8)
            } catch {}
            return $quotaData
        }
    }

    # 尝试从本地缓存读取兜底
    if (Test-Path $quotaCachePath) {
        try {
            $cached = [System.IO.File]::ReadAllText($quotaCachePath, [System.Text.Encoding]::UTF8)
            return $ser.DeserializeObject($cached)
        } catch {}
    }
    return $null
}

# 3. 创建桌宠主视窗 (无边框、纯透明、置顶)
$petXaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Antigravity Desktop Pet"
        Width="128" Height="128"
        WindowStyle="None"
        AllowsTransparency="True"
        Background="Transparent"
        Topmost="True"
        ShowInTaskbar="False"
        WindowStartupLocation="Manual">
    <Grid>
        <Image Name="PetImage" Stretch="Uniform" RenderOptions.BitmapScalingMode="HighQuality" Cursor="Hand">
            <Image.Effect>
                <DropShadowEffect BlurRadius="16" ShadowDepth="4" Direction="270" Color="#000000" Opacity="0.45" />
            </Image.Effect>
        </Image>
    </Grid>
</Window>
'@

$petWindow = [System.Windows.Markup.XamlReader]::Parse($petXaml)
$petImage = $petWindow.FindName("PetImage")

# 初始放置在屏幕右下角任务栏上方
$workArea = [System.Windows.SystemParameters]::WorkArea
$petWindow.Left = $workArea.Right - 160
$petWindow.Top = $workArea.Bottom - 160

# 4. 创建交互弹层视窗 (Flyout: 展示额度 + 调出总控 + 切换表情)
$flyoutXaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Antigravity Pet Flyout"
        Width="320" SizeToContent="Height"
        WindowStyle="None"
        AllowsTransparency="True"
        Background="Transparent"
        Topmost="True"
        ShowInTaskbar="False"
        WindowStartupLocation="Manual">
    <Window.Resources>
        <Style x:Key="GlassBtn" TargetType="Button">
            <Setter Property="Foreground" Value="#FFFFFF" />
            <Setter Property="FontSize" Value="12" />
            <Setter Property="FontFamily" Value="-apple-system, Segoe UI, Microsoft YaHei" />
            <Setter Property="Height" Value="32" />
            <Setter Property="Cursor" Value="Hand" />
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Name="border" Background="#26FFFFFF" BorderBrush="#33FFFFFF" BorderThickness="1" CornerRadius="8">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center" />
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="border" Property="Background" Value="#3DFFFFFF" />
                                <Setter TargetName="border" Property="BorderBrush" Value="#55FFFFFF" />
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter TargetName="border" Property="Background" Value="#1AFFFFFF" />
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>

        <Style x:Key="AccentBtn" TargetType="Button">
            <Setter Property="Foreground" Value="#FFFFFF" />
            <Setter Property="FontSize" Value="12" />
            <Setter Property="FontWeight" Value="SemiBold" />
            <Setter Property="FontFamily" Value="-apple-system, Segoe UI, Microsoft YaHei" />
            <Setter Property="Height" Value="34" />
            <Setter Property="Cursor" Value="Hand" />
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Name="border" Background="#0A84FF" BorderBrush="#33FFFFFF" BorderThickness="1" CornerRadius="8">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center" />
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="border" Property="Background" Value="#2997FF" />
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter TargetName="border" Property="Background" Value="#0071E3" />
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
    </Window.Resources>

    <Border Margin="10" Background="#F2141824" BorderBrush="#33FFFFFF" BorderThickness="1" CornerRadius="16">
        <Border.Effect>
            <DropShadowEffect BlurRadius="26" ShadowDepth="6" Direction="270" Color="#000000" Opacity="0.55" />
        </Border.Effect>
        <StackPanel Margin="16">
            <!-- 顶部标题栏 -->
            <Grid Margin="0,0,0,12">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*" />
                    <ColumnDefinition Width="Auto" />
                </Grid.ColumnDefinitions>
                <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                    <Ellipse Width="8" Height="8" Fill="#30D158" Margin="0,0,8,0" />
                    <TextBlock Text="Antigravity 桌面伴侣" Foreground="#FFFFFF" FontWeight="Bold" FontSize="13" FontFamily="-apple-system, Segoe UI, Microsoft YaHei" />
                </StackPanel>
                <Button Name="BtnCloseFlyout" Grid.Column="1" Content="✕" Foreground="#88FFFFFF" Background="Transparent" BorderThickness="0" FontSize="12" Cursor="Hand" Width="20" Height="20" />
            </Grid>

            <!-- 额度卡片容器 -->
            <Border Background="#1AFFFFFF" BorderBrush="#20FFFFFF" BorderThickness="1" CornerRadius="10" Padding="12" Margin="0,0,0,12">
                <StackPanel>
                    <!-- Gemini 额度 -->
                    <Grid Margin="0,0,0,4">
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="*" />
                            <ColumnDefinition Width="Auto" />
                        </Grid.ColumnDefinitions>
                        <TextBlock Text="✦ Gemini 模型配额" Foreground="#DDFFFFFF" FontSize="11" FontWeight="SemiBold" />
                        <TextBlock Name="TxtGeminiPercent" Grid.Column="1" Text="81.7% 剩余" Foreground="#30D158" FontSize="11" FontWeight="Bold" />
                    </Grid>
                    
                    <!-- 进度条 -->
                    <Border Background="#26FFFFFF" Height="6" CornerRadius="3" Margin="0,2,0,4">
                        <Border Name="BarGemini" HorizontalAlignment="Left" Width="180" Background="#30D158" CornerRadius="3" />
                    </Border>
                    <TextBlock Name="TxtGeminiReset" Text="重置周期: 5小时 / 正常活跃" Foreground="#77FFFFFF" FontSize="10" Margin="0,0,0,10" />

                    <!-- Claude & GPT 额度 -->
                    <Grid Margin="0,0,0,4">
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="*" />
                            <ColumnDefinition Width="Auto" />
                        </Grid.ColumnDefinitions>
                        <TextBlock Text="✦ Claude / GPT 高级模型" Foreground="#DDFFFFFF" FontSize="11" FontWeight="SemiBold" />
                        <TextBlock Name="TxtClaudeStatus" Grid.Column="1" Text="调用正常" Foreground="#0A84FF" FontSize="11" FontWeight="Bold" />
                    </Grid>
                    <TextBlock Name="TxtClaudeReset" Text="周期重置: 倒计时就绪" Foreground="#77FFFFFF" FontSize="10" />
                </StackPanel>
            </Border>

            <!-- 快捷操作按钮组 -->
            <StackPanel>
                <Button Name="BtnOpenPanel" Style="{StaticResource AccentBtn}" Content="🎛️ 调出视觉总控 (⌥T)" Margin="0,0,0,8" />
                <Grid>
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*" />
                        <ColumnDefinition Width="8" />
                        <ColumnDefinition Width="*" />
                    </Grid.ColumnDefinitions>
                    <Button Name="BtnRefreshQuota" Grid.Column="0" Style="{StaticResource GlassBtn}" Content="🔄 刷新额度" />
                    <Button Name="BtnSwitchSkin" Grid.Column="2" Style="{StaticResource GlassBtn}" Content="🎨 换个表情" />
                </Grid>
            </StackPanel>
        </StackPanel>
    </Border>
</Window>
'@

$flyoutWindow = [System.Windows.Markup.XamlReader]::Parse($flyoutXaml)
$btnCloseFlyout = $flyoutWindow.FindName("BtnCloseFlyout")
$btnOpenPanel = $flyoutWindow.FindName("BtnOpenPanel")
$btnRefreshQuota = $flyoutWindow.FindName("BtnRefreshQuota")
$btnSwitchSkin = $flyoutWindow.FindName("BtnSwitchSkin")

$txtGeminiPercent = $flyoutWindow.FindName("TxtGeminiPercent")
$barGemini = $flyoutWindow.FindName("BarGemini")
$txtGeminiReset = $flyoutWindow.FindName("TxtGeminiReset")
$txtClaudeStatus = $flyoutWindow.FindName("TxtClaudeStatus")
$txtClaudeReset = $flyoutWindow.FindName("TxtClaudeReset")

# 5. 弹层定位引擎 (紧贴桌宠上方或侧方，边界智能吸附)
function Update-FlyoutPosition {
    $targetLeft = $petWindow.Left - 96
    $targetTop = $petWindow.Top - 250

    # 边界检测
    $screen = [System.Windows.SystemParameters]::WorkArea
    if ($targetTop -lt $screen.Top + 10) {
        # 上方空间不足，翻转到下方
        $targetTop = $petWindow.Top + $petWindow.Height + 10
    }
    if ($targetLeft -lt $screen.Left + 10) {
        $targetLeft = $screen.Left + 10
    }
    if ($targetLeft + 320 -gt $screen.Right - 10) {
        $targetLeft = $screen.Right - 330
    }

    $flyoutWindow.Left = $targetLeft
    $flyoutWindow.Top = $targetTop
}

function Toggle-Flyout {
    if ($flyoutWindow.IsVisible) {
        $flyoutWindow.Hide()
    } else {
        Update-FlyoutPosition
        $flyoutWindow.Show()
        Update-QuotaUI
    }
}

# 6. 更新额度信息到卡片 UI
function Update-QuotaUI {
    $txtGeminiPercent.Text = "读取中..."
    $txtClaudeStatus.Text = "同步中..."

    [System.Threading.ThreadPool]::QueueUserWorkItem({
        $quota = Get-LiveQuota
        $flyoutWindow.Dispatcher.Invoke([Action]{
            if ($quota) {
                # 1. 查找 Gemini 配额
                $configs = $quota["cascadeModelConfigData"]["clientModelConfigs"]
                $geminiCfg = $null
                $claudeCfg = $null

                foreach ($c in $configs) {
                    if ($c["label"] -match "Gemini.*Flash.*Medium" -or $c["label"] -match "Gemini") {
                        if (-not $geminiCfg) { $geminiCfg = $c }
                    }
                    if ($c["label"] -match "Claude.*Sonnet" -or $c["label"] -match "Claude") {
                        if (-not $claudeCfg) { $claudeCfg = $c }
                    }
                }

                if ($geminiCfg -and $geminiCfg.ContainsKey("quotaInfo") -and $geminiCfg["quotaInfo"].ContainsKey("remainingFraction")) {
                    $fraction = [double]$geminiCfg["quotaInfo"]["remainingFraction"]
                    $percent = [Math]::Round($fraction * 100, 1)
                    $txtGeminiPercent.Text = "$percent% 剩余"
                    $barGemini.Width = [Math]::Max(4, 250 * $fraction)
                    
                    if ($percent -gt 50) {
                        $barGemini.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#30D158")
                        $txtGeminiPercent.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#30D158")
                    } elseif ($percent -gt 20) {
                        $barGemini.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#FF9F0A")
                        $txtGeminiPercent.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#FF9F0A")
                    } else {
                        $barGemini.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#FF453A")
                        $txtGeminiPercent.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#FF453A")
                    }

                    if ($geminiCfg["quotaInfo"].ContainsKey("resetTime")) {
                        $resetStr = $geminiCfg["quotaInfo"]["resetTime"]
                        try {
                            $dt = [DateTime]::Parse($resetStr).ToLocalTime()
                            $txtGeminiReset.Text = "重置时间: " + $dt.ToString("HH:mm") + " (周期刷新)"
                        } catch {
                            $txtGeminiReset.Text = "重置时间: " + $resetStr
                        }
                    }
                } else {
                    $txtGeminiPercent.Text = "100% 充裕"
                    $barGemini.Width = 250
                    $txtGeminiReset.Text = "服务连接正常"
                }

                if ($claudeCfg) {
                    $txtClaudeStatus.Text = "就绪活跃"
                    if ($claudeCfg.ContainsKey("quotaInfo") -and $claudeCfg["quotaInfo"].ContainsKey("resetTime")) {
                        try {
                            $dt2 = [DateTime]::Parse($claudeCfg["quotaInfo"]["resetTime"]).ToLocalTime()
                            $txtClaudeReset.Text = "周期重置: " + $dt2.ToString("HH:mm")
                        } catch {
                            $txtClaudeReset.Text = "高级模型状态正常"
                        }
                    }
                } else {
                    $txtClaudeStatus.Text = "正常调用"
                }
            } else {
                $txtGeminiPercent.Text = "离线/待命"
                $txtGeminiReset.Text = "客户端连接中..."
                $txtClaudeStatus.Text = "等待启动"
                $txtClaudeReset.Text = "请打开 Antigravity 客户端"
            }
        })
    }) | Out-Null
}

# 按钮事件绑定
$btnCloseFlyout.Add_Click({
    $flyoutWindow.Hide()
})

$btnOpenPanel.Add_Click({
    $flyoutWindow.Hide()
    Invoke-OpenVisualPanel
})

$btnRefreshQuota.Add_Click({
    Update-QuotaUI
})

$btnSwitchSkin.Add_Click({
    $script:currentSkinIndex = ($script:currentSkinIndex + 1) % $loadedSkins.Count
    $script:currentFrameIndex = 0
    $skin = $loadedSkins[$script:currentSkinIndex]
    $btnSwitchSkin.Content = "🎨 " + $skin["name"]
    # 更新托盘提示
    $notifyIcon.Text = "Antigravity 桌宠: " + $skin["name"]
})

# 7. 动画帧循环驱动引擎 (DispatcherTimer)
$animTimer = New-Object System.Windows.Threading.DispatcherTimer
$animTimer.Interval = [TimeSpan]::FromMilliseconds(65)
$animTimer.Add_Tick({
    $skin = $loadedSkins[$script:currentSkinIndex]
    $frames = $skin["frames"]
    if ($frames.Count -gt 0) {
        $script:currentFrameIndex = ($script:currentFrameIndex + 1) % $frames.Count
        $petImage.Source = $frames[$script:currentFrameIndex]
    }
})

# 8. 点击 vs 拖拽精准分离引擎 (核心判定逻辑)
$script:isMouseDown = $false
$script:dragOccurred = $false
$script:mouseDownPos = [System.Drawing.Point]::Empty

$petWindow.Add_MouseLeftButtonDown({
    param($sender, $e)
    $script:isMouseDown = $true
    $script:dragOccurred = $false
    $script:mouseDownPos = [System.Windows.Forms.Cursor]::Position
})

$petWindow.Add_MouseMove({
    param($sender, $e)
    if ($script:isMouseDown) {
        $curr = [System.Windows.Forms.Cursor]::Position
        $dx = [Math]::Abs($curr.X - $script:mouseDownPos.X)
        $dy = [Math]::Abs($curr.Y - $script:mouseDownPos.Y)
        # 位移超过 4 像素立即转入拖拽移动模式
        if ($dx -gt 4 -or $dy -gt 4) {
            $script:dragOccurred = $true
            # 拖拽时收起弹层，保证跟手动效丝滑
            if ($flyoutWindow.IsVisible) {
                $flyoutWindow.Hide()
            }
            $petWindow.DragMove()
        }
    }
})

$petWindow.Add_MouseLeftButtonUp({
    param($sender, $e)
    $script:isMouseDown = $false
    # 单击判定：鼠标松开时若未发生拖动位移，判定为单击事件！
    if (-not $script:dragOccurred) {
        Toggle-Flyout
    }
})

# 右键菜单 (快速唤出、切换表情、退出)
$contextMenu = New-Object System.Windows.Controls.ContextMenu

$miPanel = New-Object System.Windows.Controls.MenuItem
$miPanel.Header = "🎛️ 调出视觉总控 (⌥T)"
$miPanel.Add_Click({ Invoke-OpenVisualPanel })
$contextMenu.Items.Add($miPanel) | Out-Null

$miQuota = New-Object System.Windows.Controls.MenuItem
$miQuota.Header = "📊 查看剩余额度"
$miQuota.Add_Click({ Toggle-Flyout })
$contextMenu.Items.Add($miQuota) | Out-Null

$miSwitch = New-Object System.Windows.Controls.MenuItem
$miSwitch.Header = "🎨 切换下一个表情"
$miSwitch.Add_Click({
    $script:currentSkinIndex = ($script:currentSkinIndex + 1) % $loadedSkins.Count
    $script:currentFrameIndex = 0
})
$contextMenu.Items.Add($miSwitch) | Out-Null

$contextMenu.Items.Add((New-Object System.Windows.Controls.Separator)) | Out-Null

$miScale = New-Object System.Windows.Controls.MenuItem
$miScale.Header = "🔍 调整桌宠大小"
foreach ($scale in @(0.8, 1.0, 1.25, 1.5)) {
    $subMi = New-Object System.Windows.Controls.MenuItem
    $subMi.Header = "$([int]($scale * 100))%"
    $sVal = $scale
    $subMi.Add_Click({
        $petWindow.Width = 128 * $sVal
        $petWindow.Height = 128 * $sVal
    })
    $miScale.Items.Add($subMi) | Out-Null
}
$contextMenu.Items.Add($miScale) | Out-Null

$contextMenu.Items.Add((New-Object System.Windows.Controls.Separator)) | Out-Null

$miExit = New-Object System.Windows.Controls.MenuItem
$miExit.Header = "❌ 退出桌宠"
$miExit.Add_Click({
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    $animTimer.Stop()
    $flyoutWindow.Close()
    $petWindow.Close()
    [System.Windows.Application]::Current.Shutdown()
})
$contextMenu.Items.Add($miExit) | Out-Null

$petWindow.ContextMenu = $contextMenu

# 9. 任务栏系统托盘图标 (NotifyIcon)
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Text = "Antigravity 桌面伴侣 (运行中)"
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Visible = $true

$trayMenu = New-Object System.Windows.Forms.ContextMenuStrip
$tmiPanel = $trayMenu.Items.Add("调出视觉总控 (⌥T)")
$tmiPanel.Add_Click({ Invoke-OpenVisualPanel })

$tmiQuota = $trayMenu.Items.Add("查看模型额度")
$tmiQuota.Add_Click({
    $petWindow.Dispatcher.Invoke([Action]{ Toggle-Flyout })
})

$trayMenu.Items.Add("-") | Out-Null

$tmiExit = $trayMenu.Items.Add("退出桌宠")
$tmiExit.Add_Click({
    $petWindow.Dispatcher.Invoke([Action]{
        $notifyIcon.Visible = $false
        $notifyIcon.Dispose()
        $animTimer.Stop()
        $flyoutWindow.Close()
        $petWindow.Close()
        [System.Windows.Application]::Current.Shutdown()
    })
})

$notifyIcon.ContextMenuStrip = $trayMenu
$notifyIcon.Add_DoubleClick({
    $petWindow.Dispatcher.Invoke([Action]{ Toggle-Flyout })
})

# 10. 启动与生命周期管理
$petWindow.Add_Closed({
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    $animTimer.Stop()
    $flyoutWindow.Close()
})

$petWindow.Show()
$animTimer.Start()

# 首次在后台加载一次额度缓存
Update-QuotaUI

Write-Host "Antigravity 桌面伴侣已启动！"
Write-Host "操作指南："
Write-Host "  - 单击桌宠：展开/收起剩余额度卡片与总控入口"
Write-Host "  - 拖拽桌宠：按住鼠标左键随意移动屏幕位置"
Write-Host "  - 右键桌宠：调出总控、切换表情、调整大小、退出"

# 运行 WPF 应用主消息循环
$app = New-Object System.Windows.Application
$app.Run($petWindow) | Out-Null
