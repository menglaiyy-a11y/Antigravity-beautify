$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Web.Extensions
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$ser.MaxJsonLength = 67108864

Write-Output "[Theme] Injecting visual panel to active targets..."

# 1. 确保先执行构建
powershell -ExecutionPolicy Bypass -File "D:\Antigravity\6\build_ui_panel.ps1"

# 2. 读取冰川背景素材作为默认底图
$imgPath = "D:\Antigravity\6\antarctica_glacier_ui_4k.jpg"
$base64 = ""
if (Test-Path -LiteralPath $imgPath) {
    $imgBytes = [System.IO.File]::ReadAllBytes($imgPath)
    $base64 = [Convert]::ToBase64String($imgBytes)
}

# 3. 读取控制台核心脚本 (轻量化热更新，避免 13MB WebSocket 缓冲区溢出)
$templatePath = "D:\Antigravity\6\ui_panel_template.js"
$base64Path = "D:\Antigravity\6\suoming_base64.txt"
$gifBase64 = [System.IO.File]::ReadAllText($base64Path, [System.Text.Encoding]::UTF8).Trim()
$template = [System.IO.File]::ReadAllText($templatePath, [System.Text.Encoding]::UTF8)
$coreJs = $template.Replace("___SUOMING_GIF_PLACEHOLDER___", $gifBase64)

# 4. 组合初始化注入代码 (纯净核心逻辑，默认原生 UI，不再强行定向冰川底图)
$combinedJs = $coreJs

# 5. 获取 DevTools CDP 端口
$DevToolsPortFile = "C:\Users\31411\AppData\Roaming\Antigravity\DevToolsActivePort"
if (-not (Test-Path -LiteralPath $DevToolsPortFile)) {
    throw "DevToolsActivePort not found."
}

$portLines = [System.IO.File]::ReadAllLines($DevToolsPortFile)
$port = $portLines[0].Trim()
$wc = New-Object System.Net.WebClient
$wc.Encoding = [System.Text.Encoding]::UTF8
$targets = $ser.DeserializeObject($wc.DownloadString("http://127.0.0.1:$port/json"))

$injectedCount = 0

foreach ($t in $targets) {
    if ($t.ContainsKey("type") -and $t["type"] -eq "page" -and $t.ContainsKey("webSocketDebuggerUrl")) {
        $targetTitle = if ($t.ContainsKey("title")) { $t["title"] } else { "Unknown" }
        $targetUrl = if ($t.ContainsKey("url")) { $t["url"] } else { "" }
        $wsUrl = $t["webSocketDebuggerUrl"].ToString()
        
        Write-Output "[Theme] Injecting into: [$targetTitle] $targetUrl"
        $ws = New-Object System.Net.WebSockets.ClientWebSocket
        $ct = [System.Threading.CancellationToken]::None
        try {
            $ws.ConnectAsync([Uri]$wsUrl, $ct).Wait(3000)
            $escaped = $ser.Serialize($combinedJs)
            $reqStr = '{"id":1,"method":"Runtime.evaluate","params":{"expression":' + $escaped + ',"returnByValue":true}}'
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
            Write-Output "[Theme] Evaluate response len=$($respStr.Length): $($respStr.Substring(0, [Math]::Min(200, $respStr.Length)))"
            $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", $ct).Wait(1000)
            $injectedCount++
        } catch {
            Write-Warning "Failed to inject target: $($_.Exception.ToString())"
        } finally {
            $ws.Dispose()
        }
    }
}

Write-Output "[Theme] Injected successfully into $injectedCount page target(s)."
