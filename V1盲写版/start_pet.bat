@echo off
echo %DATE% %TIME% >> "%~dp0start_log.txt"
start "" powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0desktop_pet.ps1"
exit
