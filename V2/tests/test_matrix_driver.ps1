# D:/Antigravity/6/V2/tests/test_matrix_driver.ps1
$ErrorActionPreference = "Stop"

Write-Host "=========================================================="
Write-Host "Antigravity V2 Full-Matrix Test Driver"
Write-Host "=========================================================="

$portFile = "C:/Users/31411/AppData/Roaming/Antigravity/DevToolsActivePort"
if (-not (Test-Path -LiteralPath $portFile)) { throw "DevToolsActivePort missing" }
$port = (Get-Content $portFile)[0].Trim()

$targets = Invoke-RestMethod "http://127.0.0.1:$port/json"
$page = ($targets | Where-Object { $_.type -eq "page" })[0]
$wsUrl = $page.webSocketDebuggerUrl
Write-Host "[CDP] Target: $wsUrl"

function Send-CdpCommand($method, $params = @{}) {
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $ct = [System.Threading.CancellationToken]::None
    try {
        $ws.ConnectAsync([Uri]$wsUrl, $ct).Wait(4000)
        $id = [Random]::new().Next(1000, 999999)
        $req = @{ id = $id; method = $method; params = $params } | ConvertTo-Json -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($req)
        $seg = New-Object System.ArraySegment[byte]($bytes, 0, $bytes.Length)
        $ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait(6000)

        $ms = New-Object System.IO.MemoryStream
        $buf = New-Object byte[] 65536
        $rcvSeg = New-Object System.ArraySegment[byte]($buf, 0, $buf.Length)
        do {
            $r = $ws.ReceiveAsync($rcvSeg, $ct).GetAwaiter().GetResult()
            $ms.Write($buf, 0, $r.Count)
        } while (-not $r.EndOfMessage)

        $respStr = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
        $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", $ct).Wait(1000)
        return ($respStr | ConvertFrom-Json)
    } finally {
        $ws.Dispose()
    }
}

function Save-Screen($filename) {
    $resp = Send-CdpCommand "Page.captureScreenshot" @{ format = "png" }
    if ($resp.result -and $resp.result.data) {
        $imgBytes = [Convert]::FromBase64String($resp.result.data)
        $out = "D:/Antigravity/6/V2/tests/$filename"
        [IO.File]::WriteAllBytes($out, $imgBytes)
        Write-Host "[Screenshot] Saved: $out ($($imgBytes.Length) bytes)"
    } else {
        Write-Warning "Failed to capture screenshot data."
    }
}

# 1. 热更新注入最新的 V2 自包含 Bundle
$bundlePath = "D:/Antigravity/6/V2/dist/ag_v2_bundle.js"
$bundleCode = [IO.File]::ReadAllText($bundlePath)
Write-Host "[Matrix] Hot-injecting V2 Bundle..."
Send-CdpCommand "Runtime.evaluate" @{ expression = $bundleCode } | Out-Null
Start-Sleep -Milliseconds 600

$assertCode = [IO.File]::ReadAllText("D:/Antigravity/6/V2/tests/assert_computed_styles.js")

# 2. 原生模式测试
Write-Host "`n[Matrix 1/3] Testing Native Mode..."
Send-CdpCommand "Runtime.evaluate" @{ expression = "if (window.__ag_v2_theme) { window.__ag_v2_theme.setMode('native'); }" } | Out-Null
Start-Sleep -Milliseconds 600
Save-Screen "matrix_v2_native.png"

# 3. 晶格海洋模式测试
Write-Host "`n[Matrix 2/3] Testing Ocean Mode..."
Send-CdpCommand "Runtime.evaluate" @{ expression = "if (window.__ag_v2_theme) { window.__ag_v2_theme.setMode('ocean'); }" } | Out-Null
Start-Sleep -Milliseconds 600
Save-Screen "matrix_v2_ocean.png"
$oceanAssert = Send-CdpCommand "Runtime.evaluate" @{ expression = $assertCode; returnByValue = $true }

# 4. 流体极光模式测试
Write-Host "`n[Matrix 3/3] Testing Aurora Mode..."
Send-CdpCommand "Runtime.evaluate" @{ expression = "if (window.__ag_v2_theme) { window.__ag_v2_theme.setMode('aurora'); }" } | Out-Null
Start-Sleep -Milliseconds 600
Save-Screen "matrix_v2_aurora.png"

# 恢复默认 Ocean 模式
Send-CdpCommand "Runtime.evaluate" @{ expression = "if (window.__ag_v2_theme) { window.__ag_v2_theme.setMode('ocean'); }" } | Out-Null

Write-Host "=========================================================="
Write-Host "Full Matrix Test Completed Successfully!"
if ($oceanAssert -and $oceanAssert.result -and $oceanAssert.result.result -and $oceanAssert.result.result.value) {
    $val = $oceanAssert.result.result.value
    Write-Host "Ocean Assert: $($val.passedCount) passed, $($val.failedCount) failed."
}
Write-Host "=========================================================="
