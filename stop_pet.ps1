$myPid = $PID
Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -like '*desktop_pet.ps1*' -and $_.ProcessId -ne $myPid
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
