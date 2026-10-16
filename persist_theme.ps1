$ErrorActionPreference = "Stop"

Write-Output "[Theme] Building and persisting self-contained theme bundle..."

# Step 0: 重新构建包含完整表情包和最新模版的 ui_panel.js
powershell -ExecutionPolicy Bypass -File "D:\Antigravity\6\build_ui_panel.ps1"

# Step 1: 默认回归纯净原生 UI，不再嵌入巨型冰川图片
$base64 = ""

# Step 2: 组装自包含独立完整 bundle
$snippetPath = "D:\Antigravity\6\preload_head_snippet.js"
$headSnippetRaw = [System.IO.File]::ReadAllText($snippetPath, [System.Text.Encoding]::UTF8)
$headSnippet = $headSnippetRaw.Replace("___BASE64_PLACEHOLDER___", $base64)
$uiPanelJs = [System.IO.File]::ReadAllText("D:\Antigravity\6\ui_panel.js", [System.Text.Encoding]::UTF8)

# 保存备份至 Roaming 保护目录
$safeDir = "C:\Users\31411\AppData\Roaming\Antigravity\beautify"
if (-not (Test-Path -LiteralPath $safeDir)) {
    New-Item -ItemType Directory -Path $safeDir -Force | Out-Null
}
$bundlePath = Join-Path $safeDir "ag_theme_bundle.js"
$fullBundle = [string]::Concat($headSnippet, "`r`n`r`n", $uiPanelJs, "`r`n")
[System.IO.File]::WriteAllText($bundlePath, $fullBundle, [System.Text.Encoding]::UTF8)
Write-Output "[Theme] Protected bundle backup saved to: $bundlePath"

# Step 3: 将自包含完整载荷直接注入所有安装目录的 preload.js
# 针对 Electron 沙盒环境：直接内嵌执行，彻底杜绝沙箱中 require('fs') 失败报错导致启动丢失
$marker = "// === Antigravity 4K Antarctic Glacier Wallpaper Theme ==="
$payload = "`r`n" + $marker + "`r`n" + $fullBundle + "`r`n"

$targetRoots = @(
    "C:\Users\31411\AppData\Local\Programs\Antigravity",
    "D:\Antigravity\antigravity"
)

$injectedTargets = 0
foreach ($root in $targetRoots) {
    if (Test-Path -LiteralPath $root) {
        Get-ChildItem -Path $root -Filter "preload.js" -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match "resources\\app.*\\dist\\preload\.js$" } |
            ForEach-Object {
                $target = $_.FullName
                $content = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
                if ($content.Contains($marker)) {
                    $idx = $content.IndexOf($marker)
                    $content = $content.Substring(0, $idx).TrimEnd() + "`r`n"
                }
                $newContent = $content.TrimEnd() + $payload
                [System.IO.File]::WriteAllText($target, $newContent, [System.Text.Encoding]::UTF8)
                Write-Output "[Theme] Successfully injected full self-contained bundle into: $target"
                $injectedTargets++
            }
    }
}

Write-Output "[Theme] Persistence completed. Injected into $injectedTargets preload target(s)."

# Step 4: 若活动客户端正在运行，同时执行热注入同步
try {
    powershell -ExecutionPolicy Bypass -File "D:\Antigravity\6\apply_visual_panel_live.ps1"
} catch {
    Write-Warning "Live injection notice: $_"
}
