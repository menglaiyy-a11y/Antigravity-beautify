$ErrorActionPreference = "Stop"

$targets = @(
    "C:\Users\31411\AppData\Local\Programs\Antigravity\resources\app\dist\preload.js",
    "D:\Antigravity\antigravity\resources\app\dist\preload.js"
)

$marker = "// === Antigravity 4K Antarctic Glacier Wallpaper Theme ==="

foreach ($target in $targets) {
    if (Test-Path $target) {
        $content = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
        if ($content.Contains($marker)) {
            $idx = $content.IndexOf($marker)
            $newContent = $content.Substring(0, $idx).TrimEnd() + "`r`n"
            [System.IO.File]::WriteAllText($target, $newContent, [System.Text.Encoding]::UTF8)
            Write-Output "Removed theme from $target"
        }
    }
}

# Also remove live from DevTools if running
$DevToolsPortFile = "C:\Users\31411\AppData\Roaming\Antigravity\DevToolsActivePort"
if (Test-Path $DevToolsPortFile) {
    try {
        Add-Type -AssemblyName System.Web.Extensions
        $ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
        $lines = [System.IO.File]::ReadAllLines($DevToolsPortFile)
        $port = $lines[0].Trim()
        $wc = New-Object System.Net.WebClient
        $wc.Encoding = [System.Text.Encoding]::UTF8
        $targetList = $ser.DeserializeObject($wc.DownloadString("http://127.0.0.1:$port/json"))
        foreach ($t in $targetList) {
            if ($t.ContainsKey("type") -and $t["type"] -eq "page" -and $t.ContainsKey("webSocketDebuggerUrl")) {
                $ws = New-Object System.Net.WebSockets.ClientWebSocket
                $ct = [System.Threading.CancellationToken]::None
                $ws.ConnectAsync([Uri]$t["webSocketDebuggerUrl"].ToString(), $ct).Wait(2000)
                $js = "(() => { const el = document.getElementById('antarctica-glacier-theme'); if (el) el.remove(); const p = document.getElementById('ag-theme-pill'); if (p) p.remove(); const m = document.getElementById('ag-theme-modal'); if (m) m.remove(); const c = document.getElementById('ag-dynamic-stage-canvas'); if (c) c.remove(); document.body.style.backgroundImage = ''; return true; })()"
                $payloadJson = $ser.Serialize(@{ id = 1; method = "Runtime.evaluate"; params = @{ expression = $js } })
                $sendBytes = [System.Text.Encoding]::UTF8.GetBytes($payloadJson)
                $seg = New-Object System.ArraySegment[byte]($sendBytes, 0, $sendBytes.Length)
                $ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait(2000)
                $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", $ct).Wait(1000)
                $ws.Dispose()
                Write-Output "Removed theme live from active window."
                break
            }
        }
    } catch {}
}
Write-Output "Default theme restored."
