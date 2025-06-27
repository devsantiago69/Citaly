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
