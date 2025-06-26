@echo off
echo ===========================================
echo        CITALY - FRONTEND STARTUP
echo ===========================================
echo.
echo Iniciando aplicacion frontend...
echo.

cd /d "e:\Citaly\Citaly\app-citaly\client-app"

echo Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias de npm...
    npm install
)

echo.
echo Iniciando servidor de desarrollo...
echo.
echo IMPORTANTE:
echo - La aplicacion se abrira en http://localhost:5173
echo - Asegurate de que el backend este ejecutandose en localhost:3001
echo - Ejecuta start-backend.bat en otra ventana si no lo has hecho
echo.

npm run dev

pause
