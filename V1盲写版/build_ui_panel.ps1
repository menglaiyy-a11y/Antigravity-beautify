$ErrorActionPreference = "Stop"

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }

Write-Output "正在构建自包含的 ui_panel.js (包含全量 117 个锁暝动态表情包)..."

$base64Path = Join-Path $scriptDir "suoming_base64.txt"
$emojisPath = Join-Path $scriptDir "emojis_data.js"
$templatePath = Join-Path $scriptDir "ui_panel_template.js"
$outputPath = Join-Path $scriptDir "ui_panel.js"

if (-not (Test-Path -LiteralPath $base64Path)) {
    throw "未找到锁暝表情包 Base64 文件: $base64Path"
}

if (-not (Test-Path -LiteralPath $templatePath)) {
    throw "未找到模版文件: $templatePath"
}

$gifBase64 = [System.IO.File]::ReadAllText($base64Path, [System.Text.Encoding]::UTF8).Trim()
$template = [System.IO.File]::ReadAllText($templatePath, [System.Text.Encoding]::UTF8)
$finalContent = $template.Replace("___SUOMING_GIF_PLACEHOLDER___", $gifBase64)

$emojisData = ""
if (Test-Path -LiteralPath $emojisPath) {
    $emojisData = [System.IO.File]::ReadAllText($emojisPath, [System.Text.Encoding]::UTF8).Trim()
}

$bundle = if ($emojisData) { $emojisData + "`r`n`r`n" + $finalContent } else { $finalContent }

[System.IO.File]::WriteAllText($outputPath, $bundle, [System.Text.Encoding]::UTF8)

Write-Output "ui_panel.js 构建完成！文件大小: $([Math]::Round($bundle.Length / 1024 / 1024, 2)) MB"
