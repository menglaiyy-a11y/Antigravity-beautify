# D:\Antigravity\6\V2\build\build_bundle.ps1
$ErrorActionPreference = "Stop"

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
$v2Root = Split-Path -Parent $scriptDir
$srcDir = Join-Path $v2Root "src"
$distDir = Join-Path $v2Root "dist"
$baselineFile = "D:\Antigravity\6\preload_official_baseline.js"

Write-Host "=========================================================="
Write-Host "Antigravity V2 Bundler Pipeline (JSON Safe Engine)"
Write-Host "=========================================================="

if (-not (Test-Path -LiteralPath $baselineFile)) {
    throw "官方基线文件缺失: $baselineFile"
}
$officialBaseCode = [System.IO.File]::ReadAllText($baselineFile, [System.Text.Encoding]::UTF8)

# 1. 合并 CSS
$cssSb = New-Object System.Text.StringBuilder
$cssFiles = @(
    (Join-Path $srcDir "themes\tokens_base.css"),
    (Join-Path $srcDir "themes\mode_native.css"),
    (Join-Path $srcDir "themes\mode_ocean.css"),
    (Join-Path $srcDir "themes\mode_aurora.css")
)
foreach ($f in $cssFiles) {
    if (Test-Path -LiteralPath $f) {
        $c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
        [void]$cssSb.AppendLine($c)
    }
}
$combinedCss = $cssSb.ToString()
$jsonCss = $combinedCss | ConvertTo-Json -Compress
Write-Host "[Bundler] Themes CSS merged & JSON encoded."

# 2. 读取资源
$gifBase64 = ""
$gifPath = Join-Path $srcDir "assets\suoming_base64.txt"
if (Test-Path -LiteralPath $gifPath) {
    $gifBase64 = ([System.IO.File]::ReadAllText($gifPath, [System.Text.Encoding]::UTF8)).Trim()
}
$jsonGif = $gifBase64 | ConvertTo-Json -Compress

$builtinSkinFrames = @{}
$skinsDir = Join-Path $srcDir "assets\pet_skins"
for ($i = 1; $i -le 5; $i++) {
    $skinPath = Join-Path $skinsDir "skin_$i\frame_00.png"
    if (Test-Path -LiteralPath $skinPath) {
        $bytes = [System.IO.File]::ReadAllBytes($skinPath)
        $b64 = [Convert]::ToBase64String($bytes)
        $builtinSkinFrames["skin_$i"] = "data:image/png;base64," + $b64
    }
}
$jsonBuiltinSkinFrames = $builtinSkinFrames | ConvertTo-Json -Compress

# 3. 模块解耦与清理
function Clean-ModuleContent([string]$code) {
    $c = [regex]::Replace($code, 'import\s+[\s\S]*?from\s+[''"].*?[''"];', '')
    $c = [regex]::Replace($c, 'export\s+(class|const|function|let|var)\s+', '$1 ')
    $c = [regex]::Replace($c, 'export\s*\{[\s\S]*?\};', '')
    return $c
}

$modules = @(
    (Join-Path $srcDir "core\storage_bridge.js"),
    (Join-Path $srcDir "core\asset_registry.js"),
    (Join-Path $srcDir "core\state_machine.js"),
    (Join-Path $srcDir "core\drag_controller.js"),
    (Join-Path $srcDir "shaders\ocean_renderer.js"),
    (Join-Path $srcDir "shaders\aurora_renderer.js"),
    (Join-Path $srcDir "components\pet_widget\pet.js"),
    (Join-Path $srcDir "components\control_panel\panel.js"),
    (Join-Path $srcDir "index.js")
)

# 4. 构建单一 JS 产物
$bundleSb = New-Object System.Text.StringBuilder
[void]$bundleSb.AppendLine("(function() {")
[void]$bundleSb.AppendLine("  if (typeof window === 'undefined') return;")
[void]$bundleSb.AppendLine("")

foreach ($m in $modules) {
    $raw = [System.IO.File]::ReadAllText($m, [System.Text.Encoding]::UTF8)
    $clean = Clean-ModuleContent $raw
    [void]$bundleSb.AppendLine($clean)
    [void]$bundleSb.AppendLine("")
}

[void]$bundleSb.AppendLine("  const V2_COMBINED_CSS = $jsonCss;")
[void]$bundleSb.AppendLine("  const V2_SUOMING_GIF = $jsonGif;")
[void]$bundleSb.AppendLine("  const V2_BUILTIN_SKIN_FRAMES = $jsonBuiltinSkinFrames;")
[void]$bundleSb.AppendLine("  bootstrapAntigravityV2({")
[void]$bundleSb.AppendLine("    combinedCss: V2_COMBINED_CSS,")
[void]$bundleSb.AppendLine("    sunglassesGifBase64: V2_SUOMING_GIF,")
[void]$bundleSb.AppendLine("    builtinSkinFrames: V2_BUILTIN_SKIN_FRAMES")
[void]$bundleSb.AppendLine("  });")
[void]$bundleSb.AppendLine("})();")

$bundleCode = $bundleSb.ToString()

if (-not (Test-Path -LiteralPath $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}
$bundleFile = Join-Path $distDir "ag_v2_bundle.js"
[System.IO.File]::WriteAllText($bundleFile, $bundleCode, [System.Text.Encoding]::UTF8)

$sizeKB = [Math]::Round((Get-Item -LiteralPath $bundleFile).Length / 1024, 2)
Write-Host "[Bundler] Bundle compiled: $bundleFile ($sizeKB KB)"

# 5. 组合官方基线与 V2 产物
$finalSb = New-Object System.Text.StringBuilder
[void]$finalSb.Append($officialBaseCode)
[void]$finalSb.AppendLine("")
[void]$finalSb.AppendLine("")
[void]$finalSb.AppendLine("// [V2 INJECTION]")
[void]$finalSb.Append($bundleCode)
$finalContent = $finalSb.ToString()

$t1 = "C:\Users\31411\AppData\Local\Programs\Antigravity\resources\app\dist\preload.js"
$t2 = "D:\Antigravity\antigravity\resources\app\dist\preload.js"

foreach ($target in @($t1, $t2)) {
    if (Test-Path -LiteralPath $target) {
        [System.IO.File]::WriteAllText($target, $finalContent, [System.Text.Encoding]::UTF8)
        $kb = [Math]::Round((Get-Item -LiteralPath $target).Length / 1024, 2)
        Write-Host "[Preload] Clean base + V2 bundle synced: $target ($kb KB)"
    }
}

Write-Host "=========================================================="
Write-Host "V2 Bundle Built and Synced to Both Preload Targets!"
Write-Host "=========================================================="
