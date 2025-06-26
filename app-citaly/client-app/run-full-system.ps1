# Script para ejecutar ambos servidores (backend y frontend) y realizar pruebas completas
# Este script facilita la prueba de la nueva arquitectura modular

Write-Host "?? EJECUTANDO SERVIDOR COMPLETO - BACKEND MODULAR + FRONTEND" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Variables para PIDs de procesos
$BackendProcess = $null
$FrontendProcess = $null

# Función para limpiar procesos al salir
function Stop-Servers {
    Write-Host "`n?? Deteniendo servidores..." -ForegroundColor Yellow

    if ($BackendProcess -and !$BackendProcess.HasExited) {
        Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "? Backend detenido" -ForegroundColor Green
    }

    if ($FrontendProcess -and !$FrontendProcess.HasExited) {
        Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "? Frontend detenido" -ForegroundColor Green
    }
}

# Registrar event handler para Ctrl+C
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-Servers }

try {
    Write-Host ""
    Write-Host "?? VERIFICANDO PRERREQUISITOS" -ForegroundColor Blue
    Write-Host "===============================" -ForegroundColor Blue

    # Verificar que Node.js esté instalado
    try {
        $nodeVersion = node --version
        Write-Host "? Node.js $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "? Node.js no está instalado" -ForegroundColor Red
        exit 1
    }

    # Verificar que npm esté instalado
    try {
        $npmVersion = npm --version
        Write-Host "? npm $npmVersion" -ForegroundColor Green
    } catch {
        Write-Host "? npm no está instalado" -ForegroundColor Red
        exit 1
    }

    # Verificar estructura de directorios
    if (!(Test-Path "..\api-gateway")) {
        Write-Host "? Directorio api-gateway no encontrado" -ForegroundColor Red
        exit 1
    }
    Write-Host "? Directorio api-gateway encontrado" -ForegroundColor Green

    if (!(Test-Path "..\api-gateway\server-new.js")) {
        Write-Host "? Archivo server-new.js no encontrado" -ForegroundColor Red
        exit 1
    }
    Write-Host "? Servidor modular (server-new.js) encontrado" -ForegroundColor Green

    if (!(Test-Path "src")) {
        Write-Host "? Directorio src del frontend no encontrado" -ForegroundColor Red
        exit 1
    }
    Write-Host "? Directorio frontend encontrado" -ForegroundColor Green

    Write-Host ""
    Write-Host "?? INSTALANDO DEPENDENCIAS" -ForegroundColor Blue
    Write-Host "============================" -ForegroundColor Blue

    # Instalar dependencias del backend si es necesario
    Write-Host "?? Verificando dependencias del backend..." -ForegroundColor Cyan
    Push-Location "..\api-gateway"
    if (!(Test-Path "node_modules")) {
        Write-Host "??  Instalando dependencias del backend..." -ForegroundColor Yellow
        npm install
    }
    Write-Host "? Dependencias del backend listas" -ForegroundColor Green
    Pop-Location

    # Instalar dependencias del frontend si es necesario
    Write-Host "?? Verificando dependencias del frontend..." -ForegroundColor Cyan
    if (!(Test-Path "node_modules")) {
        Write-Host "??  Instalando dependencias del frontend..." -ForegroundColor Yellow
        npm install
    }
    Write-Host "? Dependencias del frontend listas" -ForegroundColor Green

    Write-Host ""
    Write-Host "?? INICIANDO SERVIDORES" -ForegroundColor Blue
    Write-Host "=======================" -ForegroundColor Blue

    # Función para verificar si un puerto está en uso
    function Test-Port {
        param([int]$Port)
        try {
            $tcpConnection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
            return $tcpConnection.Count -gt 0
        } catch {
            return $false
        }
    }

    # Verificar puertos
    if (Test-Port 3001) {
        Write-Host "? Puerto 3001 (backend) ya está en uso" -ForegroundColor Red
        Write-Host "?? Detén el proceso que usa el puerto 3001 y vuelve a intentar" -ForegroundColor Yellow
        exit 1
    }

    if (Test-Port 5173) {
        Write-Host "? Puerto 5173 (frontend) ya está en uso" -ForegroundColor Red
        Write-Host "?? Detén el proceso que usa el puerto 5173 y vuelve a intentar" -ForegroundColor Yellow
        exit 1
    }

    # Crear directorio de logs si no existe
    if (!(Test-Path "..\logs")) {
        New-Item -ItemType Directory -Path "..\logs" -Force | Out-Null
    }

    # Iniciar backend modular
    Write-Host "?? Iniciando backend modular (puerto 3001)..." -ForegroundColor Cyan
    Push-Location "..\api-gateway"
    $BackendProcess = Start-Process -FilePath "node" -ArgumentList "server-new.js" -NoNewWindow -PassThru -RedirectStandardOutput "..\logs\backend.log" -RedirectStandardError "..\logs\backend-error.log"
    Pop-Location

    # Esperar a que el backend esté listo
    Write-Host "? Esperando que el backend esté listo..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3

    # Verificar que el backend esté corriendo
    if ($BackendProcess.HasExited) {
        Write-Host "? Error al iniciar el backend" -ForegroundColor Red
        Write-Host "?? Verificar logs: Get-Content ..\logs\backend.log" -ForegroundColor Yellow
        exit 1
    }

    # Verificar que el backend responda
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
        Write-Host "? Backend modular corriendo en http://localhost:3001" -ForegroundColor Green
    } catch {
        Write-Host "? Backend no responde en el puerto 3001" -ForegroundColor Red
        Stop-Servers
        exit 1
    }

    # Iniciar frontend
    Write-Host "?? Iniciando frontend (puerto 5173)..." -ForegroundColor Cyan
    $FrontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru -RedirectStandardOutput "..\logs\frontend.log" -RedirectStandardError "..\logs\frontend-error.log"

    # Esperar a que el frontend esté listo
    Write-Host "? Esperando que el frontend esté listo..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # Verificar que el frontend esté corriendo
    if ($FrontendProcess.HasExited) {
        Write-Host "? Error al iniciar el frontend" -ForegroundColor Red
        Write-Host "?? Verificar logs: Get-Content ..\logs\frontend.log" -ForegroundColor Yellow
        Stop-Servers
        exit 1
    }

    Write-Host "? Frontend corriendo en http://localhost:5173" -ForegroundColor Green

    Write-Host ""
    Write-Host "?? EJECUTANDO PRUEBAS DE API" -ForegroundColor Blue
    Write-Host "============================" -ForegroundColor Blue

    # Ejecutar pruebas de endpoints
    if (Test-Path "test-api-endpoints.js") {
        Write-Host "?? Probando endpoints del API modular..." -ForegroundColor Cyan
        node test-api-endpoints.js
    } else {
        Write-Host "??  Archivo de pruebas no encontrado" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "?? SISTEMA COMPLETO INICIADO" -ForegroundColor Green
    Write-Host "===========================" -ForegroundColor Green
    Write-Host "? Backend modular: http://localhost:3001" -ForegroundColor Green
    Write-Host "? Frontend: http://localhost:5173" -ForegroundColor Green
    Write-Host ""
    Write-Host "?? ENDPOINTS DISPONIBLES:" -ForegroundColor Cyan
    Write-Host "• GET  http://localhost:3001/ (Health check)"
    Write-Host "• GET  http://localhost:3001/health (Detailed health)"
    Write-Host "• GET  http://localhost:3001/api/appointments (Citas)"
    Write-Host "• GET  http://localhost:3001/api/clients (Clientes)"
    Write-Host "• GET  http://localhost:3001/api/services (Servicios)"
    Write-Host "• GET  http://localhost:3001/api/reports/overview (Dashboard)"
    Write-Host "• GET  http://localhost:3001/api/search?q=test (Búsqueda)"
    Write-Host ""
    Write-Host "?? FUNCIONALIDADES NUEVAS:" -ForegroundColor Yellow
    Write-Host "• ?? Reportes avanzados"
    Write-Host "• ?? Búsqueda global"
    Write-Host "• ?? Gestión de especialidades del personal"
    Write-Host "• ?? Dashboard ejecutivo"
    Write-Host "• ?? Datos geográficos"
    Write-Host ""
    Write-Host "?? COMANDOS ÚTILES:" -ForegroundColor Blue
    Write-Host "• Logs backend: Get-Content ..\logs\backend.log -Tail 10 -Wait"
    Write-Host "• Logs frontend: Get-Content ..\logs\frontend.log -Tail 10 -Wait"
    Write-Host "• Probar API: Invoke-RestMethod http://localhost:3001/health"
    Write-Host "• Abrir app: Start-Process http://localhost:5173"
    Write-Host ""
    Write-Host "? Presiona Ctrl+C para detener ambos servidores" -ForegroundColor Green
    Write-Host ""

    # Mostrar logs iniciales
    Write-Host "?? Logs iniciales:" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan

    if (Test-Path "..\logs\backend.log") {
        Write-Host "`n?? Backend Log:" -ForegroundColor Cyan
        Get-Content "..\logs\backend.log" -Tail 3 -ErrorAction SilentlyContinue
    }

    if (Test-Path "..\logs\frontend.log") {
        Write-Host "`n?? Frontend Log:" -ForegroundColor Cyan
        Get-Content "..\logs\frontend.log" -Tail 3 -ErrorAction SilentlyContinue
    }

    Write-Host ""
    Write-Host "?? Sistema ejecutándose... (Ctrl+C para salir)" -ForegroundColor Yellow

    # Mantener el script corriendo y verificar procesos
    while ($true) {
        Start-Sleep -Seconds 10

        # Verificar que ambos procesos sigan corriendo
        if ($BackendProcess.HasExited) {
            Write-Host "? Backend se detuvo inesperadamente" -ForegroundColor Red
            Stop-Servers
            exit 1
        }

        if ($FrontendProcess.HasExited) {
            Write-Host "? Frontend se detuvo inesperadamente" -ForegroundColor Red
            Stop-Servers
            exit 1
        }
    }

} catch {
    Write-Host "? Error: $($_.Exception.Message)" -ForegroundColor Red
    Stop-Servers
    exit 1
} finally {
    Stop-Servers
}
