@echo off
chcp 65001 >nul
title AI 视觉对话助手 - 开发模式
cd /d "%~dp0"

echo ========================================
echo   AI 视觉对话助手 - 开发模式
echo ========================================
echo.
echo 启动后请在浏览器打开: http://localhost:5173
echo 按 Ctrl+C 可停止服务
echo.

if not exist "node_modules\" (
    call npm run install:all
)

start "" "http://localhost:5173"
npm run dev
