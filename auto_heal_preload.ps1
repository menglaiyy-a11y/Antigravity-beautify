# Auto-heal script: 检查 preload.js 是否含有主题外置引导，缺失则快速修补
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
                        $newContent = $content.TrimEnd() + "`r`n" + $loaderSnippet + "`r`n"
                        [System.IO.File]::WriteAllText($target, $newContent, [System.Text.Encoding]::UTF8)
                        Write-Output "[AutoHeal] Restored theme loader in $target"
                    }
                } catch {}
            }
    }
}
