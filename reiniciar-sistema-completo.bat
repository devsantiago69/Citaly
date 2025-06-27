@echo off
echo Reiniciando el sistema Citaly...
echo.

:: Primero detener los servicios existentes
echo Deteniendo servicios...
taskkill /f /im node.exe >nul 2>&1
echo.

:: Limpiar caché
echo Limpiando caché...
set APPDATA_PATH=%APPDATA%\..\Local\Google\Chrome\User Data\Default\Local Storage
if exist "%APPDATA_PATH%" (
    echo Limpiando localStorage del navegador...
    echo Este paso puede requerir cerrar el navegador
    echo Por favor, cierre Chrome si está abierto y presione cualquier tecla para continuar...
    pause >nul
)
echo.

:: Navegar al directorio de backend
cd app-citaly\api-gateway
echo Iniciando el backend...
start cmd /c "npm start"
echo.

:: Esperar 5 segundos para que el backend se inicie correctamente
echo Esperando que el backend se inicie...
timeout /t 5 /nobreak >nul

:: Navegar al directorio del frontend
cd ..\client-app
echo Iniciando el frontend...
start cmd /c "npm run dev"
echo.

echo Sistema reiniciado correctamente.
echo El backend está corriendo en http://localhost:3001
echo El frontend está corriendo en http://localhost:5173
echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
