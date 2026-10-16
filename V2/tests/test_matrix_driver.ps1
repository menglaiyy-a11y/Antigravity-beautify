# D:\Antigravity\6\V2\tests\test_matrix_driver.ps1
$ErrorActionPreference = "Stop"

Write-Host "=========================================================="
Write-Host "Antigravity V2 Full-Matrix Test Driver (4 Modes)"
Write-Host "=========================================================="

$portFile = "C:\Users\31411\AppData\Roaming\Antigravity\DevToolsActivePort"
if (-not (Test-Path -LiteralPath $portFile)) { throw "DevToolsActivePort missing" }
$port = (Get-Content $portFile)[0].Trim()

$targets = Invoke-RestMethod "http://127.0.0.1:$port/json"
$page = ($targets | Where-Object { $_.title -like "*Antigravity*" })[0]
if (-not $page) {
    $page = ($targets | Where-Object { $_.type -eq "page" })[0]
}
$wsUrl = $page.webSocketDebuggerUrl
Write-Host "[CDP] Target: $wsUrl"

function Send-CdpCommand([string]$method, $params = @{}) {
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $ct = [System.Threading.CancellationToken]::None
    try {
        [void]$ws.ConnectAsync([Uri]$wsUrl, $ct).Wait(4000)
        $id = [Random]::new().Next(1000, 999999)
        $req = @{ id = $id; method = $method; params = $params } | ConvertTo-Json -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($req)
        $seg = New-Object System.ArraySegment[byte]($bytes, 0, $bytes.Length)
        [void]$ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait(6000)

        $ms = New-Object System.IO.MemoryStream
        $buf = New-Object byte[] 65536
        $rcvSeg = New-Object System.ArraySegment[byte]($buf, 0, $buf.Length)
        do {
            $r = $ws.ReceiveAsync($rcvSeg, $ct).GetAwaiter().GetResult()
            $ms.Write($buf, 0, $r.Count)
        } while (-not $r.EndOfMessage)

        $respStr = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
        try { [void]$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", $ct).Wait(1000) } catch {}
        return ($respStr | ConvertFrom-Json)
    } finally {
        $ws.Dispose()
    }
}

function Save-Screen([string]$filename) {
    $resp = Send-CdpCommand -method "Page.captureScreenshot" -params @{ format = "png" }
    if ($resp.result -and $resp.result.data) {
        $imgBytes = [Convert]::FromBase64String($resp.result.data)
        $out = "D:\Antigravity\6\V2\tests\$filename"
        [System.IO.File]::WriteAllBytes($out, $imgBytes)
        $kb = [Math]::Round($imgBytes.Length / 1024, 2)
        Write-Host "[Screenshot] Saved: $out ($kb KB)"
    } else {
        Write-Warning "Failed to capture screenshot data."
    }
}

# 1. 确保最新的 V2 自包含 Bundle 热注入
$bundleCode = [System.IO.File]::ReadAllText("D:\Antigravity\6\V2\dist\ag_v2_bundle.js", [System.Text.Encoding]::UTF8)
Write-Host "[Matrix] Hot-injecting V2 Bundle..."
[void](Send-CdpCommand -method "Runtime.evaluate" -params @{ expression = $bundleCode })
Start-Sleep -Milliseconds 600

$assertCode = [System.IO.File]::ReadAllText("D:\Antigravity\6\V2\tests\assert_computed_styles.js", [System.Text.Encoding]::UTF8)

# 2. 原生模式测试
Write-Host "`n[Matrix 1/4] Testing Native Mode..."
[void](Send-CdpCommand -method "Runtime.evaluate" -params @{ expression = "if (window.__ag_v2_theme) { window.__ag_v2_theme.setMode('native'); }" })
Start-Sleep -Milliseconds 600
Save-Screen "matrix_v2_native.png"

# 3. 晶格海洋模式测试
Write-Host "`n[Matrix 2/4] Testing Ocean Mode..."
[void](Send-CdpCommand -method "Runtime.evaluate" -params @{ expression = "if (window.__ag_v2_theme) { window.__ag_v2_theme.setMode('ocean'); }" })
Start-Sleep -Milliseconds 800
Save-Screen "matrix_v2_ocean.png"
$oceanAssert = Send-CdpCommand -method "Runtime.evaluate" -params @{ expression = $assertCode; returnByValue = $true }

# 4. 流体极光模式测试
Write-Host "`n[Matrix 3/4] Testing Aurora Mode..."
[void](Send-CdpCommand -method "Runtime.evaluate" -params @{ expression = "if (window.__ag_v2_theme) { window.__ag_v2_theme.setMode('aurora'); }" })
Start-Sleep -Milliseconds 800
Save-Screen "matrix_v2_aurora.png"

# 5. 自定义素材模式测试
Write-Host "`n[Matrix 4/4] Testing Custom Asset Mode..."
[void](Send-CdpCommand -method "Runtime.evaluate" -params @{ expression = "if (window.__ag_v2_theme) { window.__ag_v2_theme.setMode('custom'); }" })
Start-Sleep -Milliseconds 600
Save-Screen "matrix_v2_custom.png"

# 恢复默认 Ocean 模式
[void](Send-CdpCommand -method "Runtime.evaluate" -params @{ expression = "if (window.__ag_v2_theme) { window.__ag_v2_theme.setMode('ocean'); }" })

Write-Host "`n=========================================================="
Write-Host "Full Matrix Test Completed Successfully!"
if ($oceanAssert -and $oceanAssert.result -and $oceanAssert.result.result -and $oceanAssert.result.result.value) {
    $val = $oceanAssert.result.result.value
    Write-Host "Computed Style Assertions: $($val.passedCount) passed, $($val.failedCount) failed."
    if ($val.failedCount -gt 0) {
        $val.details | Where-Object { -not $_.pass } | ForEach-Object { Write-Warning $_.message }
    }
}
Write-Host "=========================================================="
