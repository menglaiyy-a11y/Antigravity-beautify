@echo off
chcp 65001 >nul
title Antigravity 主题版本一键切换器 (V1 / V2 / 官方原生)

echo ==========================================================
echo        Antigravity 主题版本一键无缝切换中心
echo ==========================================================
echo.
echo   [1] 切换到 V2 架构 (模块化、超轻量 131KB、杜绝掉帧、推荐)
echo   [2] 切换回 V1 架构 (历史单文件盲写版 13.4MB 巨石)
echo   [3] 恢复官方原生 (彻底移除任何注入，纯净官方 103KB)
echo.
echo ==========================================================
set /p opt="请输入序号并按回车 [1/2/3]: "

if "%opt%"=="1" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0switch_version.ps1" -TargetVersion V2
) else if "%opt%"=="2" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0switch_version.ps1" -TargetVersion V1
) else if "%opt%"=="3" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0switch_version.ps1" -TargetVersion Official
) else (
    echo 输入无效，取消操作。
)

echo.
pause
