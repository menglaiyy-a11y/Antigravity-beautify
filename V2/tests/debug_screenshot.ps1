# debug_screenshot.ps1
$portFile = "C:/Users/31411/AppData/Roaming/Antigravity/DevToolsActivePort"
$port = (Get-Content $portFile)[0].Trim()
$targets = Invoke-RestMethod "http://127.0.0.1:$port/json"
$page = ($targets | Where-Object { $_.type -eq "page" })[0]
$wsUrl = $page.webSocketDebuggerUrl

$ws = New-Object System.Net.WebSockets.ClientWebSocket
$ct = [System.Threading.CancellationToken]::None
$ws.ConnectAsync([Uri]$wsUrl, $ct).Wait(4000)

$req = '{"id":1,"method":"Page.captureScreenshot","params":{"format":"png"}}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($req)
$ws.SendAsync([ArraySegment[byte]]$bytes, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait(6000)

$ms = New-Object System.IO.MemoryStream
$buf = New-Object byte[] 65536
$rcvSeg = New-Object System.ArraySegment[byte]($buf, 0, $buf.Length)
do {
    $r = $ws.ReceiveAsync($rcvSeg, $ct).GetAwaiter().GetResult()
    $ms.Write($buf, 0, $r.Count)
} while (-not $r.EndOfMessage)

$respStr = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
Write-Host "Response length: $($respStr.Length)"

# 用 ConvertFrom-Json 解析
$parsed = $respStr | ConvertFrom-Json
if ($parsed.result -and $parsed.result.data) {
    $imgBytes = [Convert]::FromBase64String($parsed.result.data)
    [IO.File]::WriteAllBytes("D:/Antigravity/6/V2/tests/test_shot.png", $imgBytes)
    Write-Host "Screenshot saved successfully! Bytes: $($imgBytes.Length)"
} else {
    Write-Host "Parsed result does not contain data."
}

$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", $ct).Wait(1000)
$ws.Dispose()
