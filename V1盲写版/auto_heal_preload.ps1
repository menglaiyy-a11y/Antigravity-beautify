# Auto-heal script: 检查 preload.js 是否含有主题，缺失则自动快速修补，支持 -Watch 守护模式
param(
    [switch]$Watch
)

$marker = "// === Antigravity 4K Antarctic Glacier Wallpaper Theme ==="
$safeBundle = "C:\Users\31411\AppData\Roaming\Antigravity\beautify\ag_theme_bundle.js"

if (-not (Test-Path -LiteralPath $safeBundle)) {
    Write-Warning "[AutoHeal] Bundle backup not found at $safeBundle, building..."
    powershell -ExecutionPolicy Bypass -File "D:\Antigravity\6\build_ui_panel.ps1"
}

function Repair-PreloadTargets {
    if (-not (Test-Path -LiteralPath $safeBundle)) { return }
    $bundleContent = [System.IO.File]::ReadAllText($safeBundle, [System.Text.Encoding]::UTF8)
    $payload = "`r`n" + $marker + "`r`n" + $bundleContent + "`r`n"

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
                    try {
                        $content = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
                        if (-not $content.Contains($marker)) {
                            $newContent = $content.TrimEnd() + $payload
                            [System.IO.File]::WriteAllText($target, $newContent, [System.Text.Encoding]::UTF8)
                            Write-Output "[AutoHeal] Restored self-contained theme bundle in $target"
                        }
                    } catch {
                        Write-Warning "[AutoHeal] Failed to patch $target : $_"
                    }
                }
        }
    }
}

# 立即执行一次检查与修补
Repair-PreloadTargets

# 若开启 Watch 模式，则常驻监听文件变更（在版本更新覆盖发生时 50ms 自动自愈）
if ($Watch) {
    Write-Output "[AutoHeal] File watcher active. Monitoring client updates..."
    $watchers = @()
    $watchRoots = @(
        "C:\Users\31411\AppData\Local\Programs\Antigravity",
        "D:\Antigravity\antigravity"
    )
    foreach ($wr in $watchRoots) {
        if (Test-Path -LiteralPath $wr) {
            $fsw = New-Object System.IO.FileSystemWatcher
            $fsw.Path = $wr
            $fsw.Filter = "preload.js"
            $fsw.IncludeSubdirectories = $true
            $fsw.EnableRaisingEvents = $true
            $action = {
                Start-Sleep -Milliseconds 100
                Repair-PreloadTargets
            }
            Register-ObjectEvent $fsw "Changed" -Action $action | Out-Null
            Register-ObjectEvent $fsw "Created" -Action $action | Out-Null
            $watchers += $fsw
        }
    }
    while ($true) {
        Start-Sleep -Seconds 10
    }
}
