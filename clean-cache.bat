@echo off
echo Limpiando cache y reiniciando sistema Citaly...

echo.
echo Deteniendo procesos existentes...
taskkill /F /IM node.exe /T 2>nul

echo.
echo Eliminando archivos de cach�...
REM Eliminar localStorage para URL localhost:5173
echo Eliminando localStorage para la aplicaci�n...
reg delete "HKCU\Software\Microsoft\Internet Explorer\DOMStorage\localhost:5173" /f 2>nul

echo.
echo Limpiando cach� del navegador...
set CHROME_USER_DATA_DIR=%LOCALAPPDATA%\Google\Chrome\User Data\Default
set FIREFOX_USER_DATA_DIR=%APPDATA%\Mozilla\Firefox\Profiles
set EDGE_USER_DATA_DIR=%LOCALAPPDATA%\Microsoft\Edge\User Data\Default

REM Limpiar cach� de Chrome
if exist "%CHROME_USER_DATA_DIR%\Cache\*.*" (
  echo Limpiando cach� de Chrome...
  del /q /s "%CHROME_USER_DATA_DIR%\Cache\*.*" 2>nul
  del /q /s "%CHROME_USER_DATA_DIR%\Code Cache\*.*" 2>nul
  del /q /s "%CHROME_USER_DATA_DIR%\Local Storage\leveldb\*.*" 2>nul
)

REM Limpiar cach� de Edge
if exist "%EDGE_USER_DATA_DIR%\Cache\*.*" (
  echo Limpiando cach� de Edge...
  del /q /s "%EDGE_USER_DATA_DIR%\Cache\*.*" 2>nul
  del /q /s "%EDGE_USER_DATA_DIR%\Code Cache\*.*" 2>nul
  del /q /s "%EDGE_USER_DATA_DIR%\Local Storage\leveldb\*.*" 2>nul
)

echo.
echo Iniciando backend...
cd app-citaly\api-gateway
start cmd /k "title Backend Citaly & node server-new.js"

echo.
echo Esperando 3 segundos...
ping 127.0.0.1 -n 4 >nul

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
echo Sistema reiniciado con cach� limpia!
echo Si el navegador no se abre autom�ticamente, abra manualmente: http://localhost:5173
