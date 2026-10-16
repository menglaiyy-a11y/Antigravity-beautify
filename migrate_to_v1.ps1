# D:\Antigravity\6\migrate_to_v1.ps1
$ErrorActionPreference = "Stop"

$root = "D:\Antigravity\6"
$v1Name = "V1" + [char]0x76F2 + [char]0x5199 + [char]0x7248
$v1Dir = Join-Path $root $v1Name
$v2Dir = Join-Path $root "V2"

if (-not (Test-Path -LiteralPath $v1Dir)) {
    New-Item -ItemType Directory -Force -Path $v1Dir | Out-Null
}
if (-not (Test-Path -LiteralPath $v2Dir)) {
    New-Item -ItemType Directory -Force -Path $v2Dir | Out-Null
}

$exclude = @(
    ".git",
    $v1Name,
    "V2",
    "migrate_to_v1.ps1"
)

$items = Get-ChildItem -LiteralPath $root -Force | Where-Object { $exclude -notcontains $_.Name }

$count = 0
foreach ($item in $items) {
    $dest = Join-Path $v1Dir $item.Name
    Move-Item -LiteralPath $item.FullName -Destination $dest -Force
    $count++
}

Write-Host "Migration completed: $count items moved to $v1Name."
Write-Host "Directory V2 created: $v2Dir."

# 移动自身到 V1
Move-Item -LiteralPath "D:\Antigravity\6\migrate_to_v1.ps1" -Destination (Join-Path $v1Dir "migrate_to_v1.ps1") -Force
