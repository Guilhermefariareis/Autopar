@echo off
title Totem Panther - Inicializador
color 0A

echo ===================================================
echo 1. Fechando qualquer servidor antigo travado...
taskkill /F /IM servidor_totem.exe /T 2>NUL
taskkill /IM python.exe /F 2>NUL

echo.
echo 2. Iniciando o servidor local (Banco de Dados blindado)...
start "Servidor Panther" cmd /k "servidor_totem.exe || pause"

echo.
echo 3. Aguardando o servidor carregar...
timeout /t 3 /nobreak >nul

echo.
echo 4. Abrindo o painel no navegador padrao...
:: Para abrir em tela cheia no Chrome, voce pode trocar a linha abaixo por:
:: start chrome --kiosk http://localhost:8000
start http://localhost:8000

echo.
echo Tudo certo! Pode fechar esta janela (o servidor tem a propria janela).
timeout /t 3 >nul
exit
