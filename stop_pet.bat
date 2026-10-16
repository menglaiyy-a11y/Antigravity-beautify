@echo off
chcp 65001 >nul
title Antigravity 桌面伴侣退出器
powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*desktop_pet.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo Antigravity 桌面伴侣已退出。
pause
