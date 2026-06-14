@echo off
chcp 65001 >nul
title AI 视觉对话助手
cd /d "%~dp0"

echo ========================================
echo   AI 视觉对话助手 - 正在启动...
echo ========================================
echo.

if not exist "node_modules\" (
    echo [1/3] 首次运行，正在安装依赖...
    call npm run install:all
    if errorlevel 1 (
        echo 依赖安装失败，请确认已安装 Node.js 18+
        pause
        exit /b 1
    )
) else (
    echo [1/3] 依赖已就绪
)

if not exist "client\dist\index.html" (
    echo [2/3] 正在构建前端...
    call npm run build
    if errorlevel 1 (
        echo 前端构建失败
        pause
        exit /b 1
    )
) else (
    echo [2/3] 前端已构建
)

if not exist ".env" (
    echo [提示] 未找到 .env，正在从模板创建...
    copy /Y .env.example .env >nul
    echo 请编辑 .env 文件，填入 OPENAI_API_KEY 后重新启动
    echo.
)

echo [3/3] 启动服务...
echo.
echo 启动后请在浏览器打开: http://localhost:3001
echo 按 Ctrl+C 可停止服务
echo.

start "" "http://localhost:3001"
node server/index.js
