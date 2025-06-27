@echo off
echo Reiniciando el backend...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Iniciando el backend...
start cmd /k "cd e:\Citaly\Citaly\app-citaly\api-gateway && node server-new.js"
timeout /t 5 /nobreak >nul

echo Iniciando el frontend...
start cmd /k "cd e:\Citaly\Citaly\app-citaly\client-app && npm run dev"

echo Aplicación reiniciada correctamente!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:3001
