@echo off
echo %DATE% %TIME% >> "D:\Antigravity\6\start_log.txt"
start "" powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\Antigravity\6\desktop_pet.ps1"
exit
