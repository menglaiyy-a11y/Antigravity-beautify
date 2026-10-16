# D:\Antigravity\6\V2\tests\test_stage5_driver.ps1
$ErrorActionPreference = "Stop"

Write-Host "=========================================================="
Write-Host "Antigravity V2 Stage 5 Interaction Test Driver"
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
        $payload = @{
            id = $id
            method = $method
            params = $params
        } | ConvertTo-Json -Compress -Depth 10

        $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $seg = [ArraySegment[byte]]::new($bytes)
        [void]$ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait(4000)

        $buf = [byte[]]::new(1048576)
        $recvSeg = [ArraySegment[byte]]::new($buf)
        $mem = [System.IO.MemoryStream]::new()
        do {
            $task = $ws.ReceiveAsync($recvSeg, $ct)
            [void]$task.Wait(4000)
            $res = $task.Result
            $mem.Write($buf, 0, $res.Count)
        } while (-not $res.EndOfMessage)

        $jsonStr = [System.Text.Encoding]::UTF8.GetString($mem.ToArray())
        return ($jsonStr | ConvertFrom-Json)
    } finally {
        if ($ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
            [void]$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", $ct).Wait(1000)
        }
        $ws.Dispose()
    }
}

# 1. Hot inject latest bundle
$bundleFile = "D:\Antigravity\6\V2\dist\ag_v2_bundle.js"
if (-not (Test-Path -LiteralPath $bundleFile)) { throw "Bundle not found: $bundleFile" }
$bundleCode = [System.IO.File]::ReadAllText($bundleFile, [System.Text.Encoding]::UTF8)

Write-Host "[CDP] Injecting latest V2 bundle..."
$injRes = Send-CdpCommand "Runtime.evaluate" @{ expression = $bundleCode; awaitPromise = $false }
if ($injRes.exceptionDetails) {
    Write-Host "[Error] Injection exception: $($injRes.exceptionDetails | ConvertTo-Json -Depth 5)" -ForegroundColor Red
    exit 1
}
Write-Host "[CDP] Bundle successfully injected!" -ForegroundColor Green

# 2. Run interaction assertion suite
$assertJsFile = "D:\Antigravity\6\V2\tests\assert_stage5_interactions.js"
$assertJsCode = [System.IO.File]::ReadAllText($assertJsFile, [System.Text.Encoding]::UTF8)

Write-Host "[CDP] Executing assert_stage5_interactions.js..."
$evalRes = Send-CdpCommand "Runtime.evaluate" @{ expression = $assertJsCode; awaitPromise = $true; returnByValue = $true }
$results = if ($evalRes.result.result) { $evalRes.result.result.value } else { $evalRes.result.value }

$passed = 0
$failed = 0
Write-Host "=========================================================="
Write-Host "Interaction Test Results:"
Write-Host "=========================================================="
foreach ($r in $results) {
    if ($r.passed) {
        $passed++
        Write-Host " [PASS] $($r.name) $($r.extra)" -ForegroundColor Green
    } else {
        $failed++
        Write-Host " [FAIL] $($r.name) $($r.extra)" -ForegroundColor Red
    }
}
Write-Host "=========================================================="
Write-Host "Summary: Passed: $passed, Failed: $failed"
Write-Host "=========================================================="

# 3. Capture interactive screenshot
Start-Sleep -Milliseconds 600
Write-Host "[CDP] Capturing interactive viewport screenshot..."
$shotRes = Send-CdpCommand "Page.captureScreenshot" @{ format = "png" }
$shotBytes = [System.Convert]::FromBase64String($shotRes.result.data)
$outPng = "D:\Antigravity\6\V2\tests\stage5_interaction_view.png"
[System.IO.File]::WriteAllBytes($outPng, $shotBytes)
Write-Host "[CDP] Screenshot saved: $outPng" -ForegroundColor Cyan
