# D:/Antigravity/6/V2/build/build_bundle.ps1
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Web

$v2Root = "D:/Antigravity/6/V2"
$srcDir = "$v2Root/src"
$distDir = "$v2Root/dist"

Write-Host "=========================================================="
Write-Host "Antigravity V2 Bundler Pipeline"
Write-Host "=========================================================="

$f_base = "$srcDir/themes/tokens_base.css"
$f_native = "$srcDir/themes/mode_native.css"
$f_ocean = "$srcDir/themes/mode_ocean.css"
$f_aurora = "$srcDir/themes/mode_aurora.css"

$combinedCss = [IO.File]::ReadAllText($f_base) + "`n" + [IO.File]::ReadAllText($f_native) + "`n" + [IO.File]::ReadAllText($f_ocean) + "`n" + [IO.File]::ReadAllText($f_aurora)
Write-Host "[Bundler] Themes CSS merged successfully."

$gifBase64 = ""
$gifPath = "$srcDir/assets/suoming_base64.txt"
if (Test-Path -LiteralPath $gifPath) {
    $gifBase64 = ([IO.File]::ReadAllText($gifPath)).Trim()
}

$mStorage = [IO.File]::ReadAllText("$srcDir/core/storage_bridge.js")
$mState   = [IO.File]::ReadAllText("$srcDir/core/state_machine.js")
$mOcean   = [IO.File]::ReadAllText("$srcDir/shaders/ocean_renderer.js")
$mAurora  = [IO.File]::ReadAllText("$srcDir/shaders/aurora_renderer.js")
$mPanel   = [IO.File]::ReadAllText("$srcDir/components/control_panel/panel.js")
$mIndex   = [IO.File]::ReadAllText("$srcDir/index.js")

function Clean-Module($code) {
    $c = [regex]::Replace($code, 'import\s+[\s\S]*?from\s+[''"].*?[''"];', '')
    $c = [regex]::Replace($c, 'export\s+(class|const|function|let|var)\s+', '$1 ')
    $c = [regex]::Replace($c, 'export\s*\{[\s\S]*?\};', '')
    return $c
}

$cleanStorage = Clean-Module $mStorage
$cleanState   = Clean-Module $mState
$cleanOcean   = Clean-Module $mOcean
$cleanAurora  = Clean-Module $mAurora
$cleanPanel   = Clean-Module $mPanel
$cleanIndex   = Clean-Module $mIndex

$escapedCss = [System.Web.HttpUtility]::JavaScriptStringEncode($combinedCss)

$bundleCode = "(function() {`n"
$bundleCode += "  if (typeof window === 'undefined') return;`n`n"
$bundleCode += $cleanStorage + "`n`n"
$bundleCode += $cleanState + "`n`n"
$bundleCode += $cleanOcean + "`n`n"
$bundleCode += $cleanAurora + "`n`n"
$bundleCode += $cleanPanel + "`n`n"
$bundleCode += $cleanIndex + "`n`n"
$bundleCode += "  bootstrapAntigravityV2({`n"
$bundleCode += "    combinedCss: `"$escapedCss`",`n"
$bundleCode += "    sunglassesGifBase64: `"$gifBase64`"`n"
$bundleCode += "  });`n"
$bundleCode += "})();`n"

$bundleFile = "$distDir/ag_v2_bundle.js"
[IO.File]::WriteAllText($bundleFile, $bundleCode, [System.Text.Encoding]::UTF8)

$sizeKB = [Math]::Round((Get-Item -LiteralPath $bundleFile).Length / 1KB, 2)
Write-Host "[Bundler] Bundle compiled: $bundleFile ($sizeKB KB)"

# 写入 Preload 目标
$t1 = "C:/Users/31411/AppData/Local/Programs/Antigravity/resources/app/dist/preload.js"
$t2 = "D:/Antigravity/antigravity/resources/app/dist/preload.js"

foreach ($target in @($t1, $t2)) {
    if (Test-Path -LiteralPath $target) {
        $origContent = [IO.File]::ReadAllText($target)
        # 清理旧注入并写入 V2
        $cutIdx = $origContent.IndexOf("// ==============================================================================")
        if ($cutIdx -gt 0) {
            $origContent = $origContent.Substring(0, $cutIdx).Trim()
        }
        $finalContent = $origContent + "`r`n`r`n// V2 INJECTION`r`n" + $bundleCode
        [IO.File]::WriteAllText($target, $finalContent, [System.Text.Encoding]::UTF8)
        Write-Host "[Preload] Successfully updated: $target"
    }
}

Write-Host "=========================================================="
Write-Host "V2 Bundle Built and Synced to Both Preload Targets!"
Write-Host "=========================================================="
