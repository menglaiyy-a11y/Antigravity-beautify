param(
    [string]$Expr = "1+1"
)
Add-Type -AssemblyName System.Web.Extensions
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$ser.MaxJsonLength = 67108864

$DevToolsPortFile = "C:\Users\31411\AppData\Roaming\Antigravity\DevToolsActivePort"
$port = (Get-Content $DevToolsPortFile)[0].Trim()
$wc = New-Object System.Net.WebClient
$wc.Encoding = [System.Text.Encoding]::UTF8
$targets = $ser.DeserializeObject($wc.DownloadString("http://127.0.0.1:$port/json"))

$page = $targets | Where-Object { $_["type"] -eq "page" -and $_.ContainsKey("webSocketDebuggerUrl") } | Select-Object -First 1
if (-not $page) {
    Write-Error "No page target found"
    exit 1
}

$wsUrl = $page["webSocketDebuggerUrl"].ToString()
$ws = New-Object System.Net.WebSockets.ClientWebSocket
$ct = [System.Threading.CancellationToken]::None
try {
    $ws.ConnectAsync([Uri]$wsUrl, $ct).Wait(3000)
    $escaped = $ser.Serialize($Expr)
    $reqStr = '{"id":1,"method":"Runtime.evaluate","params":{"expression":' + $escaped + ',"returnByValue":true,"awaitPromise":true}}'
    $sendBytes = [System.Text.Encoding]::UTF8.GetBytes($reqStr)
    $seg = New-Object System.ArraySegment[byte]($sendBytes, 0, $sendBytes.Length)
    $ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait(10000)

    $ms = New-Object System.IO.MemoryStream
    $rcvBuf = New-Object byte[] 65536
    $rcvSeg = New-Object System.ArraySegment[byte]($rcvBuf, 0, $rcvBuf.Length)
    do {
        $res = $ws.ReceiveAsync($rcvSeg, $ct).GetAwaiter().GetResult()
        $ms.Write($rcvBuf, 0, $res.Count)
    } while (-not $res.EndOfMessage)
    
    $respStr = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
    Write-Output $respStr
    $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", $ct).Wait(1000)
} finally {
    $ws.Dispose()
}
