$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Web.Extensions

$target = Get-ChildItem -Path "D:\Antigravity\5" -Recurse -Filter "*.gif" | Where-Object { $_.Length -eq 74528 } | Select-Object -First 1
if (-not $target) {
    throw "未找到锁暝表情包目录"
}

$folder = $target.DirectoryName
[Console]::WriteLine("Emoji directory: " + $folder)

$gifs = Get-ChildItem -Path $folder -Filter "*.gif" | Sort-Object Name
[Console]::WriteLine("Total GIFs found: " + $gifs.Count)

$totalBytes = ($gifs | Measure-Object -Property Length -Sum).Sum
[Console]::WriteLine("Total raw bytes: " + $totalBytes + " (" + [Math]::Round($totalBytes / 1024 / 1024, 2) + " MB)")

$sb = New-Object System.Text.StringBuilder
[void]$sb.Append("window.__ag_suoming_emojis = [")

$first = $true
foreach ($g in $gifs) {
    if (-not $first) {
        [void]$sb.Append(",")
    }
    $first = $false
    $bytes = [System.IO.File]::ReadAllBytes($g.FullName)
    $b64 = [Convert]::ToBase64String($bytes)
    [void]$sb.Append("`"data:image/gif;base64," + $b64 + "`"")
}
[void]$sb.Append("];`r`n")

$outPath = "D:\Antigravity\6\emojis_data.js"
[System.IO.File]::WriteAllText($outPath, $sb.ToString(), [System.Text.Encoding]::UTF8)

$size = (Get-Item -LiteralPath $outPath).Length
[Console]::WriteLine("emojis_data.js generated successfully! File size: " + [Math]::Round($size / 1024 / 1024, 2) + " MB")
