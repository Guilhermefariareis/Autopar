@echo off
title Totem Panther - Inicializador
color 0A

echo ===================================================
echo 1. Fechando processos antigos (Servidor e Chrome)...
taskkill /F /IM servidor_totem.exe /T 2>NUL
taskkill /IM python.exe /F 2>NUL
taskkill /F /IM chrome.exe /T 2>NUL

echo.
echo 2. Iniciando o servidor local (Banco de Dados blindado)...
start "Servidor Panther" cmd /c "servidor_totem.exe"

echo.
echo 3. Aguardando o servidor carregar...
timeout /t 5 /nobreak >nul

echo.
echo 4. Abrindo o painel no Google Chrome (Modo QUIOSQUE)...
:: --kiosk: Tela cheia real sem bordas
:: --disable-session-crashed-bubble: Remove aviso de "Chrome não fechou corretamente"
:: --disable-infobars: Remove barras de aviso
:: --user-data-dir: Força um perfil limpo para não herdar abas abertas
start chrome --kiosk --app=http://localhost:8000 --edge-touch-filtering --incognito --disable-session-crashed-bubble --disable-infobars --no-first-run --disable-notifications --user-data-dir="%TEMP%\panther_totem_chrome" http://localhost:8000

echo.
echo Tudo certo! Divirta-se no evento.
timeout /t 5 >nul
exit
