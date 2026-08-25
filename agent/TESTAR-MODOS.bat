@echo off
chcp 65001 >nul
title Descobrindo o modo da impressora

cd /d "%~dp0"
node testar-modos.mjs

echo.
pause
