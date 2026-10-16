param (
    [string]$RepoUrl = ""
)

$ErrorActionPreference = "Stop"

if (-not $RepoUrl) {
    Write-Host "请输入您的 GitHub 仓库地址 (例如: https://github.com/username/repo.git 或 git@github.com:username/repo.git):" -ForegroundColor Cyan
    $RepoUrl = Read-Host "GitHub 仓库 URL"
}

if (-not $RepoUrl) {
    Write-Error "未提供有效的 GitHub 仓库地址，推送已取消。"
    exit 1
}

Write-Host ">>> 正在配置远程仓库 origin: $RepoUrl ..." -ForegroundColor Yellow
$existingRemote = git remote
if ($existingRemote -contains "origin") {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

Write-Host ">>> 正在推送 main 分支及 v1.0.0 标签至 GitHub ..." -ForegroundColor Yellow
git branch -M main
git push -u origin main --tags

Write-Host ">>> 上传完成！V1.0.0 版本已成功发布至 GitHub。" -ForegroundColor Green
