@echo off
chcp 65001 >nul
title Antigravity 桌面伴侣启动器
echo 正在启动 Antigravity 全局桌面伴侣...
start "" powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0desktop_pet.ps1" -HiddenConsole
exit
