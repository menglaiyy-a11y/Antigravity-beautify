$myPid = $PID
Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -like '*desktop_pet.ps1*' -and $_.ProcessId -ne $myPid -and $_.CommandLine -notlike '*stop_pet*' -and $_.CommandLine -notlike '*Get-CimInstance*' -and $_.CommandLine -notlike '*Where-Object*'
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
