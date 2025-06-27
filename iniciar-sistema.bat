@echo off
echo ===============================================
echo        CITALY - SISTEMA COMPLETO
echo ===============================================
echo.
echo Este script iniciara tanto el backend como el frontend
echo.

REM Crear una ventana para el backend
start cmd /k "cd /d %~dp0app-citaly\api-gateway && echo Iniciando backend en http://localhost:3001 && node server-new.js"

REM Esperar un momento para que el backend se inicie
timeout /t 3 /nobreak > nul

REM Crear una ventana para el frontend
start cmd /k "cd /d %~dp0app-citaly\client-app && echo Iniciando frontend en http://localhost:5173 && npm run dev"

echo.
echo ===============================================
echo  Ambos componentes se han iniciado!
echo  - Backend: http://localhost:3001
echo  - Frontend: http://localhost:5173
echo ===============================================
echo.
echo Puedes usar las siguientes credenciales para iniciar sesion:
echo - Email: ana.garcia@bienestar.com
echo - Password: 123456
echo.
echo Para actualizar la contraseña de un usuario:
echo cd app-citaly\api-gateway
echo node update-user.js [email] [nueva_contraseña]
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause > nul
