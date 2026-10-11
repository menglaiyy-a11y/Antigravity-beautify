$ErrorActionPreference = "Stop"

Write-Output "[Theme] Starting persistence process..."

# 0. 自动重新构建自包含 ui_panel.js
powershell -ExecutionPolicy Bypass -File "D:\Antigravity\6\build_ui_panel.ps1"

# 1. 读取 4K 极地冰川底图素材
$imgPath = "D:\Antigravity\6\antarctica_glacier_ui_4k.jpg"
$base64 = ""
if (Test-Path -LiteralPath $imgPath) {
    $imgBytes = [System.IO.File]::ReadAllBytes($imgPath)
    $base64 = [Convert]::ToBase64String($imgBytes)
}

# 2. 读取最新控制台核心脚本
$uiPanelJs = [System.IO.File]::ReadAllText("D:\Antigravity\6\ui_panel.js", [System.Text.Encoding]::UTF8)

# 3. 构造自包含的固化初始化载荷
$headSnippet = @"

// === Antigravity 4K Antarctic Glacier Wallpaper Theme ===
(function () {
  if (typeof window === 'undefined') return;
  const dataUri = '$("data:image/jpeg;base64," + $base64)';
  window.__ag_default_wallpaper = dataUri;

  function applyInitialWallpaper() {
    if (!document.body) {
      setTimeout(applyInitialWallpaper, 30);
      return;
    }
    if (!document.body.style.backgroundImage || document.body.style.backgroundImage === 'none') {
      document.body.style.backgroundImage = 'url("' + dataUri + '")';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyInitialWallpaper);
  } else {
    applyInitialWallpaper();
  }
})();
"@

$jsSnippet = [string]::Concat($headSnippet, "`r`n`r`n", $uiPanelJs, "`r`n")

# 4. 固化到目标 Electron preload.js
$targets = @(
    "C:\Users\31411\AppData\Local\Programs\Antigravity\resources\app\dist\preload.js",
    "D:\Antigravity\antigravity\resources\app\dist\preload.js"
)

$marker = "// === Antigravity 4K Antarctic Glacier Wallpaper Theme ==="

foreach ($target in $targets) {
    if (Test-Path -LiteralPath $target) {
        $content = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
        if ($content.Contains($marker)) {
            $idx = $content.IndexOf($marker)
            $content = $content.Substring(0, $idx).TrimEnd() + "`r`n"
        }
        $newContent = $content.TrimEnd() + "`r`n" + $jsSnippet + "`r`n"
        [System.IO.File]::WriteAllText($target, $newContent, [System.Text.Encoding]::UTF8)
        Write-Output "[Theme] Successfully persisted to: $target"
    }
}

# 5. 若客户端正在运行，同时执行热注入同步
$DevToolsPortFile = "C:\Users\31411\AppData\Roaming\Antigravity\DevToolsActivePort"
if (Test-Path -LiteralPath $DevToolsPortFile) {
    try {
        powershell -ExecutionPolicy Bypass -File "D:\Antigravity\6\apply_visual_panel_live.ps1"
        Write-Output "[Theme] Live client updated successfully."
    } catch {
        Write-Output "[Theme] Live update notice: $_"
    }
}

Write-Output "[Theme] All persistence steps completed successfully."
