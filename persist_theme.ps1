$ErrorActionPreference = "Stop"

Write-Output "[Theme] Building bundle to update-safe storage..."

# Step 0: 重新构建包含完整表情包和最新模版的 ui_panel.js
powershell -ExecutionPolicy Bypass -File "D:\Antigravity\6\build_ui_panel.ps1"

# Step 1: 读取 4K 极地冰川底图素材
$imgPath = "D:\Antigravity\6\antarctica_glacier_ui_4k.jpg"
$base64 = ""
if (Test-Path -LiteralPath $imgPath) {
    $imgBytes = [System.IO.File]::ReadAllBytes($imgPath)
    $base64 = [Convert]::ToBase64String($imgBytes)
}

# Step 2: 组装独立完整 bundle 并持久化至不受版本更新影响的 Roaming 目录及工程目录
$snippetPath = "D:\Antigravity\6\preload_head_snippet.js"
$headSnippetRaw = [System.IO.File]::ReadAllText($snippetPath, [System.Text.Encoding]::UTF8)
$headSnippet = $headSnippetRaw.Replace("___BASE64_PLACEHOLDER___", $base64)
$uiPanelJs = [System.IO.File]::ReadAllText("D:\Antigravity\6\ui_panel.js", [System.Text.Encoding]::UTF8)

$safeDir = "C:\Users\31411\AppData\Roaming\Antigravity\beautify"
if (-not (Test-Path -LiteralPath $safeDir)) {
    New-Item -ItemType Directory -Path $safeDir -Force | Out-Null
}
$bundlePath = Join-Path $safeDir "ag_theme_bundle.js"
$fullBundle = [string]::Concat($headSnippet, "`r`n`r`n", $uiPanelJs, "`r`n")
[System.IO.File]::WriteAllText($bundlePath, $fullBundle, [System.Text.Encoding]::UTF8)
Write-Output "[Theme] Update-safe bundle saved to: $bundlePath"

$localBundlePath = "D:\Antigravity\6\ag_theme_bundle.js"
[System.IO.File]::WriteAllText($localBundlePath, $fullBundle, [System.Text.Encoding]::UTF8)

# Step 3: 为 preload.js 注入极轻量、幂等的外部加载引导桩 (Bootstrap Loader)
$marker = "// === Antigravity 4K Antarctic Glacier Wallpaper Theme ==="
$loaderSnippet = @"
$marker
;(function() {
  try {
    const fs = require('fs');
    const bundleFile = 'C:\\Users\\31411\\AppData\\Roaming\\Antigravity\\beautify\\ag_theme_bundle.js';
    if (fs.existsSync(bundleFile)) {
      const code = fs.readFileSync(bundleFile, 'utf8');
      (0, eval)(code);
    }
  } catch (e) {
    console.error('[Antigravity Theme Loader] Failed to load external bundle:', e);
  }
})();
"@

# 动态探测所有安装与更新目录（支持 Squirrel 动态更新后的 app-* 目录结构）
$targetRoots = @(
    "C:\Users\31411\AppData\Local\Programs\Antigravity",
    "D:\Antigravity\antigravity"
)
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
                $newContent = $content.TrimEnd() + "`r`n" + $loaderSnippet + "`r`n"
                [System.IO.File]::WriteAllText($target, $newContent, [System.Text.Encoding]::UTF8)
                Write-Output "[Theme] Hooked lightweight loader into: $target"
            }
    }
}

Write-Output "[Theme] Persistence and loader setup completed."
