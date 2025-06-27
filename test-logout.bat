@echo off
echo Reiniciando el backend de Citaly...

echo.
echo Deteniendo procesos de node.js existentes...
taskkill /F /IM node.exe /T 2>nul

echo.
echo Iniciando backend...
cd app-citaly\api-gateway
start cmd /k "title Backend Citaly & node server-new.js"

echo.
echo Backend reiniciado. Accede a http://localhost:5173 para probar el sistema.
echo.
echo INSTRUCCIONES PARA PROBAR EL LOGOUT:
echo 1. Inicia sesi�n en la aplicaci�n
echo 2. Ve al bot�n de Cerrar Sesi�n en el sidebar
echo 3. Haz clic en Cerrar Sesi�n
echo 4. Verifica que te redirija a la p�gina de login
echo.
echo Presiona cualquier tecla para salir...
pause > nul
