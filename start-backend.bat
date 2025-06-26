@echo off
echo ===========================================
echo        CITALY - BACKEND STARTUP
echo ===========================================
echo.
echo Iniciando servidor backend en localhost:3001...
echo.

cd /d "e:\Citaly\Citaly\app-citaly\api-gateway"

echo Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias de npm...
    npm install
)

echo.
echo Iniciando servidor...
echo.
echo IMPORTANTE:
echo - El servidor se ejecutara en http://localhost:3001
echo - Presiona Ctrl+C para detener el servidor
echo - Deja esta ventana abierta mientras uses la aplicacion
echo.

node server-new.js

pause
