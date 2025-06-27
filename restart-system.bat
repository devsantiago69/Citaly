@echo off
echo Reiniciando sistema Citaly...

echo.
echo Deteniendo procesos existentes...
taskkill /F /IM node.exe /T 2>nul

echo.
echo Limpiando cache del navegador para desarrollo...
set CHROME_USER_DATA_DIR=%LOCALAPPDATA%\Google\Chrome\User Data\Default
if exist "%CHROME_USER_DATA_DIR%\Cache\*.*" del /q /s "%CHROME_USER_DATA_DIR%\Cache\*.*" 2>nul
if exist "%CHROME_USER_DATA_DIR%\Code Cache\*.*" del /q /s "%CHROME_USER_DATA_DIR%\Code Cache\*.*" 2>nul

echo.
echo Iniciando backend...
cd app-citaly\api-gateway
start cmd /k "title Backend Citaly & node server-new.js"

echo.
echo Iniciando frontend...
cd ..\client-app
start cmd /k "title Frontend Citaly & npm run dev"

echo.
echo Esperando 5 segundos para que los servicios inicien...
ping 127.0.0.1 -n 6 >nul

echo.
echo Abriendo el sistema en el navegador predeterminado...
start http://localhost:5173/login

echo.
echo Sistema reiniciado!
echo Si el navegador no se abre automáticamente, abra manualmente: http://localhost:5173
