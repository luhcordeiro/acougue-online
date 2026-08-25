@echo off
chcp 65001 >nul
title Diagnostico do Agente de Impressao

cd /d "%~dp0"
node diagnostico.mjs

echo.
pause
