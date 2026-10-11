$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Web.Extensions
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$ser.MaxJsonLength = 67108864

$imgPath = "d:\Antigravity\6\antarctica_glacier_ui_4k.jpg"
$imgBytes = [System.IO.File]::ReadAllBytes($imgPath)
$base64 = [Convert]::ToBase64String($imgBytes)
$dataUri = "data:image/jpeg;base64,$base64"

$css = @"
:root {
  --background: transparent !important;
}

body {
  background-image: url('$dataUri') !important;
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-attachment: fixed !important;
}

/* Overall app background container - clean transparency */
.bg-background,
div.h-screen.w-screen.flex.flex-col.bg-background {
  background-color: rgba(4, 8, 16, 0.15) !important;
}

/* ==========================================================================
   1. Left Sidebar
   ========================================================================== */
.bg-sidebar,
div[class*="bg-sidebar"] {
  background-color: rgba(8, 14, 26, 0.75) !important;
  backdrop-filter: blur(28px) saturate(130%) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* ==========================================================================
   2. Top Bar & All Pane Headers (Red Circle 1: Unified Header & Button UI)
   ========================================================================== */
div.shrink-0,
div.shrink-0 > div.flex.items-center.gap-1.px-2.h-full,
[data-testid="title-menu-bar"],
div[class*="absolute right-0 top-0"],
div[class*="group/pane"] > div:first-child,
div[class*="border-b"] {
  background-color: rgba(7, 13, 24, 0.85) !important;
  backdrop-filter: blur(24px) saturate(120%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* Unify all header buttons and top-right icon buttons */
div.shrink-0 button,
div[class*="absolute right-0 top-0"] button,
div[class*="group/pane"] > div:first-child button {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

div.shrink-0 button:hover,
div[class*="absolute right-0 top-0"] button:hover,
div[class*="group/pane"] > div:first-child button:hover {
  background-color: rgba(255, 255, 255, 0.12) !important;
}

/* ==========================================================================
   3. Main Chat Conversation Stream
   ========================================================================== */
div.isolate > div.mx-auto.w-full {
  background: rgba(10, 18, 32, 0.70) !important;
  backdrop-filter: blur(24px) saturate(125%) !important;
  border: 1px solid rgba(147, 197, 253, 0.15) !important;
  border-radius: 18px !important;
  padding: 20px 28px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 24px rgba(56, 189, 248, 0.06) !important;
  margin-top: 14px !important;
  margin-bottom: 24px !important;
}

/* ==========================================================================
   4. User Message Bubble (Red Circle 2: Fix stretched empty dark bar)
   ========================================================================== */
.md-sticky-message-bleed,
.md-sticky-message-bleed > div,
div.relative.bg-background.md-sticky-message-bleed {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.md-sticky-message-bleed::after,
div.relative.bg-background.md-sticky-message-bleed::after {
  display: none !important;
}

/* The actual user message card bubble */
div[data-testid="user-input-step"] [data-testid="lifted-context-menu-trigger"],
div[data-testid="user-input-step"] .bg-card {
  background: rgba(14, 26, 46, 0.85) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(147, 197, 253, 0.28) !important;
  border-radius: 14px !important;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4) !important;
}

/* User turn action buttons (copy/edit popup) */
div[class*="user-input-buttons-container"],
div.absolute.bottom-0\.5.right-0\.5 {
  background: rgba(12, 22, 38, 0.88) !important;
  backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
}

/* ==========================================================================
   5. Thought Steps & Collapsible Blocks (Red Circle 3: Unified Step UI)
   ========================================================================== */
button.group.flex.items-center.gap-1.w-full[class*="min-h-8"],
button[class*="tabular-nums"][class*="rounded-lg"] {
  background-color: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 8px !important;
  margin-bottom: 5px !important;
  transition: all 0.15s ease !important;
}

button.group.flex.items-center.gap-1.w-full[class*="min-h-8"]:hover,
button[class*="tabular-nums"][class*="rounded-lg"]:hover {
  background-color: rgba(255, 255, 255, 0.10) !important;
  border-color: rgba(147, 197, 253, 0.25) !important;
}

/* Step status text crisp readability */
div[class*="text-muted-foreground"] {
  color: #cbd5e1 !important;
}

/* ==========================================================================
   6. Sub-actions & Pagination Bar (Red Circle 4: Unify < 3/3 > bar)
   ========================================================================== */
div[class*="flex"][class*="items-center"]:has(> button[class*="h-6"]),
div:has(> button[aria-label*="prev"]),
div:has(> button[aria-label*="next"]) {
  background: rgba(15, 25, 42, 0.85) !important;
  border-radius: 8px !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
}

/* ==========================================================================
   7. Bottom Chat Input Box & Mic Button (Red Circle 5: Unified Mic Button)
   ========================================================================== */
#antigravity.agentSidePanelInputBox,
div[id*="agentSidePanelInputBox"] {
  background-color: rgba(10, 20, 36, 0.88) !important;
  backdrop-filter: blur(28px) !important;
  border: 1px solid rgba(147, 197, 253, 0.32) !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.15) !important;
  border-radius: 16px !important;
}

/* Microphone button */
button[aria-label*="录音"],
button[data-tooltip-id*="record"] {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

button[aria-label*="录音"]:hover,
button[data-tooltip-id*="record"]:hover {
  background-color: rgba(255, 255, 255, 0.12) !important;
}

/* Bottom action container in input box */
#antigravity.agentSidePanelInputBox div[class*="flex items-center gap-1"] {
  background: transparent !important;
}

/* ==========================================================================
   8. Auxiliary Pane & Terminal / Tasks (Yellow Circles: Increase Opacity)
   ========================================================================== */
/* Right split panes / auxiliary pane containers */
div.border-border,
div[class*="group/pane"],
div[class*="flex-1 min-h-0"]:has(> div[class*="h-full"]),
aside {
  background-color: rgba(9, 16, 28, 0.88) !important;
  backdrop-filter: blur(28px) saturate(125%) !important;
}

/* Terminal, Background Task Output, Log viewers */
[class*="terminal"],
[class*="xterm"],
pre,
div:has(> pre),
div[class*="font-mono"] {
  background-color: rgba(6, 12, 22, 0.94) !important;
  backdrop-filter: blur(20px) !important;
  border-radius: 8px !important;
}

/* Empty log placeholder & log text high-contrast colors */
div[class*="text-muted-foreground"]:has-text,
div[class*="Empty log"],
div:contains("Empty log") {
  color: #94a3b8 !important;
}

/* Background tasks list rows */
div[class*="group/pane"] div[class*="cursor-pointer"],
div[class*="group/pane"] button {
  transition: all 0.15s ease !important;
}

div[class*="group/pane"] div[class*="cursor-pointer"]:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
}

/* Code blocks, cards & tool execution items in chat */
div[class*="bg-card-border"] {
  background-color: rgba(14, 24, 42, 0.72) !important;
  backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 10px !important;
}

/* Prose text styling */
.prose {
  color: #f8fafc !important;
}

/* Custom Scrollbars */
::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.28);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.50);
}
"@

$DevToolsPortFile = "C:\Users\31411\AppData\Roaming\Antigravity\DevToolsActivePort"
$lines = [System.IO.File]::ReadAllLines($DevToolsPortFile)
$port = $lines[0].Trim()
$wc = New-Object System.Net.WebClient
$wc.Encoding = [System.Text.Encoding]::UTF8
$targets = $ser.DeserializeObject($wc.DownloadString("http://127.0.0.1:$port/json"))

$cssJson = $ser.Serialize($css)
$evalExpr = "(() => { let style = document.getElementById('antarctica-glacier-theme') || document.createElement('style'); style.id = 'antarctica-glacier-theme'; style.textContent = " + $cssJson + "; document.head.appendChild(style); return { applied: true, len: style.textContent.length }; })()"

foreach ($t in $targets) {
    if ($t.ContainsKey("type") -and $t["type"] -eq "page" -and $t.ContainsKey("webSocketDebuggerUrl")) {
        $wsUrl = $t["webSocketDebuggerUrl"].ToString()
        $ws = New-Object System.Net.WebSockets.ClientWebSocket
        $ct = [System.Threading.CancellationToken]::None
        try {
            $ws.ConnectAsync([Uri]$wsUrl, $ct).Wait(3000)
            $payloadJson = $ser.Serialize(@{
                id = 1
                method = "Runtime.evaluate"
                params = @{
                    expression = $evalExpr
                    returnByValue = $true
                }
            })
            $sendBytes = [System.Text.Encoding]::UTF8.GetBytes($payloadJson)
            $seg = New-Object System.ArraySegment[byte]($sendBytes, 0, $sendBytes.Length)
            $ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait(5000)

            $ms = New-Object System.IO.MemoryStream
            $rcvBuf = New-Object byte[] 65536
            $rcvSeg = New-Object System.ArraySegment[byte]($rcvBuf, 0, $rcvBuf.Length)
            do {
                $res = $ws.ReceiveAsync($rcvSeg, $ct).GetAwaiter().GetResult()
                $ms.Write($rcvBuf, 0, $res.Count)
            } while (-not $res.EndOfMessage)
            $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", $ct).Wait(1000)
            break
        } finally {
            $ws.Dispose()
        }
    }
}
Write-Output "Applied targeted UI fixes."
