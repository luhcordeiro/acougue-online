@echo off
chcp 65001 >nul
title Agente de Impressao - Acougue Online

cd /d "%~dp0"

if not exist ".env" (
    echo.
    echo   Agente nao configurado. Rode INSTALAR.bat primeiro.
    echo.
    pause
    exit /b 1
)

REM Reinicia sozinho se travar. Um agente parado significa pedido
REM que entrou e nao imprimiu - e ninguem no balcao repara nisso.
:loop
echo.
echo ============================================================
echo   AGENTE DE IMPRESSAO - pode minimizar esta janela
echo   Fechar esta janela para o agente.
echo ============================================================
echo.

node print-agent.mjs

echo.
echo [%date% %time%] O agente parou. Reiniciando em 10 segundos...
echo Feche esta janela para nao reiniciar.
timeout /t 10 /nobreak >nul
goto :loop
