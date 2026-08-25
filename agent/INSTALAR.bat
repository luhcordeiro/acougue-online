@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Instalacao do Agente de Impressao - Acougue Online

echo.
echo ============================================================
echo   AGENTE DE IMPRESSAO - ACOUGUE ONLINE
echo ============================================================
echo.
echo Este programa faz o cupom sair na impressora sozinho,
echo assim que o pedido entra no site.
echo.

cd /d "%~dp0"

REM ---------------------------------------------------------------- Node.js
echo [1/4] Verificando o Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo   NAO ENCONTRADO.
    echo.
    echo   Baixe e instale a versao LTS em https://nodejs.org
    echo   Depois feche esta janela e rode este instalador de novo.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODEVER=%%v
echo   OK - Node %NODEVER%
echo.

REM ------------------------------------------------------------ configuracao
if exist ".env" (
    echo [2/4] Configuracao ja existe.
    echo.
    set /p REFAZER="   Refazer a configuracao? (s/N): "
    if /i not "!REFAZER!"=="s" goto :testar
    echo.
)

echo [2/4] Configuracao
echo.
echo   Nome do COMPARTILHAMENTO da impressora no Windows.
echo   Nao e o nome do driver - e o nome definido em
echo   Propriedades da impressora ^> aba Compartilhamento.
echo.
set "PRINTERNAME=ELGIN"
set /p PRINTERNAME="   Nome do compartilhamento [ELGIN]: "
if "!PRINTERNAME!"=="" set "PRINTERNAME=ELGIN"

echo.
echo   Token de acesso (fornecido junto com este instalador).
set /p TOKENVAL="   Token: "
if "!TOKENVAL!"=="" (
    echo.
    echo   O token e obrigatorio. Sem ele a loja nao libera os cupons.
    echo.
    pause
    exit /b 1
)

echo.
set "LOJAURL=https://acougue-online.luhcordeiroo.workers.dev"
set /p LOJAURL="   Endereco da loja [%LOJAURL%]: "

(
    echo LOJA_URL=!LOJAURL!
    echo AGENT_TOKEN=!TOKENVAL!
    echo PRINTER=!PRINTERNAME!
    echo INTERVALO_MS=3000
) > .env

echo.
echo   Configuracao salva em .env
echo.

:testar
REM ------------------------------------------------------------------ teste
echo [3/4] Testando a impressora...
echo.
node testar-impressora.mjs
if errorlevel 1 (
    echo.
    echo   O teste falhou. Confira o compartilhamento da impressora
    echo   e rode este instalador de novo.
    echo.
    pause
    exit /b 1
)
echo.

REM -------------------------------------------------------------- inicializar
echo [4/4] Iniciar junto com o Windows
echo.
set /p AUTOINICIAR="   Iniciar o agente automaticamente ao ligar o PC? (S/n): "
if /i "!AUTOINICIAR!"=="n" goto :fim

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "ATALHO=%STARTUP%\Agente de Impressao - Acougue.lnk"

powershell -NoProfile -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%ATALHO%');" ^
  "$s.TargetPath='%~dp0INICIAR.bat';" ^
  "$s.WorkingDirectory='%~dp0';" ^
  "$s.Description='Agente de impressao do Acougue Online';" ^
  "$s.Save()"

if exist "%ATALHO%" (
    echo   OK - o agente vai subir sozinho quando o PC ligar.
) else (
    echo   Nao foi possivel criar o atalho automatico.
    echo   Voce pode arrastar INICIAR.bat para a pasta que abre
    echo   com Win+R digitando: shell:startup
)

:fim
echo.
echo ============================================================
echo   INSTALACAO CONCLUIDA
echo ============================================================
echo.
echo   Para iniciar agora, use o arquivo INICIAR.bat
echo.
set /p INICIARAGORA="   Iniciar o agente agora? (S/n): "
if /i "!INICIARAGORA!"=="n" goto :sair

start "" "%~dp0INICIAR.bat"

:sair
echo.
pause
