@echo off
echo Limpiando cache y reiniciando sistema Citaly...

echo.
echo Deteniendo procesos existentes...
taskkill /F /IM node.exe /T 2>nul

echo.
echo Eliminando archivos de caché...
REM Eliminar localStorage para URL localhost:5173
echo Eliminando localStorage para la aplicación...
reg delete "HKCU\Software\Microsoft\Internet Explorer\DOMStorage\localhost:5173" /f 2>nul

echo.
echo Limpiando caché del navegador...
set CHROME_USER_DATA_DIR=%LOCALAPPDATA%\Google\Chrome\User Data\Default
set FIREFOX_USER_DATA_DIR=%APPDATA%\Mozilla\Firefox\Profiles
set EDGE_USER_DATA_DIR=%LOCALAPPDATA%\Microsoft\Edge\User Data\Default

REM Limpiar caché de Chrome
if exist "%CHROME_USER_DATA_DIR%\Cache\*.*" (
  echo Limpiando caché de Chrome...
  del /q /s "%CHROME_USER_DATA_DIR%\Cache\*.*" 2>nul
  del /q /s "%CHROME_USER_DATA_DIR%\Code Cache\*.*" 2>nul
  del /q /s "%CHROME_USER_DATA_DIR%\Local Storage\leveldb\*.*" 2>nul
)

REM Limpiar caché de Edge
if exist "%EDGE_USER_DATA_DIR%\Cache\*.*" (
  echo Limpiando caché de Edge...
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
echo Sistema reiniciado con caché limpia!
echo Si el navegador no se abre automáticamente, abra manualmente: http://localhost:5173
