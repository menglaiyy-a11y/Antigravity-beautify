# D:/Antigravity/6/switch_version.ps1
param(
    [string]$TargetVersion = "V2"
)

$ErrorActionPreference = "Stop"

$root = "D:/Antigravity/6"
$baselineFile = "$root/preload_official_baseline.js"

if (-not (Test-Path -LiteralPath $baselineFile)) {
    throw "Baseline missing"
}

$officialCode = [IO.File]::ReadAllText($baselineFile)
$targets = @(
    "C:/Users/31411/AppData/Local/Programs/Antigravity/resources/app/dist/preload.js",
    "D:/Antigravity/antigravity/resources/app/dist/preload.js"
)

$ver = $TargetVersion.ToUpper()
Write-Host "[Switch] Switching to $ver..."

$inject = ""

if ($ver -eq "V2") {
    $v2Bundle = "$root/V2/dist/ag_v2_bundle.js"
    if (-not (Test-Path -LiteralPath $v2Bundle)) {
        powershell.exe -ExecutionPolicy Bypass -File "$root/V2/build/build_bundle.ps1"
    }
    $v2Code = [IO.File]::ReadAllText($v2Bundle)
    $inject = "`r`n`r`n// [V2 INJECTION]`r`n" + $v2Code
}
if ($ver -eq "V1") {
    $v1Name = "V1" + [char]0x76F2 + [char]0x5199 + [char]0x7248
    $v1Bundle = "$root/$v1Name/ui_panel.js"
    $v1Code = [IO.File]::ReadAllText($v1Bundle)
    $inject = "`r`n`r`n// [V1 INJECTION]`r`n" + $v1Code
}
if ($ver -eq "OFFICIAL") {
    $inject = ""
}

$finalContent = $officialCode + $inject

foreach ($t in $targets) {
    if (Test-Path -LiteralPath $t) {
        [IO.File]::WriteAllText($t, $finalContent, [System.Text.Encoding]::UTF8)
        $kb = [Math]::Round((Get-Item -LiteralPath $t).Length / 1KB, 2)
        Write-Host "[Preload] Updated: $t ($kb KB)"
    }
}

# 热重载当前客户端
$portFile = "C:/Users/31411/AppData/Roaming/Antigravity/DevToolsActivePort"
if (Test-Path -LiteralPath $portFile) {
    try {
        $port = (Get-Content $portFile)[0].Trim()
        $tList = Invoke-RestMethod "http://127.0.0.1:$port/json"
        $page = ($tList | Where-Object { $_.type -eq "page" })[0]
        if ($page) {
            $ws = New-Object System.Net.WebSockets.ClientWebSocket
            $ct = [System.Threading.CancellationToken]::None
            $ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl, $ct).Wait(2000)
            $req = '{"id":99,"method":"Page.reload","params":{"ignoreCache":true}}'
            $b = [System.Text.Encoding]::UTF8.GetBytes($req)
            $ws.SendAsync([ArraySegment[byte]]$b, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait(2000)
            $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", $ct).Wait(1000)
            Write-Host "[CDP] Client reloaded."
        }
    } catch {
        Write-Host "[CDP] Reload skipped."
    }
}

Write-Host "[Switch] Version successfully switched to $ver!"
