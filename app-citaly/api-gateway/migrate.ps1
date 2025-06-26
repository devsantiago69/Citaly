# Script de migración para Windows PowerShell
# Ejecutar desde: api-gateway/

Write-Host "?? Iniciando migración a estructura modular..." -ForegroundColor Green

# 1. Backup del archivo original
Write-Host "?? Creando backup del server.js original..." -ForegroundColor Yellow
if (Test-Path "server.js") {
    Copy-Item "server.js" "server-backup.js"
    Write-Host "? Backup creado: server-backup.js" -ForegroundColor Green
} else {
    Write-Host "??  No se encontró server.js original" -ForegroundColor Yellow
}

# 2. Reemplazar el servidor principal
Write-Host "?? Reemplazando servidor principal..." -ForegroundColor Yellow
if (Test-Path "server-new.js") {
    if (Test-Path "server.js") {
        Move-Item "server.js" "server-legacy.js" -Force
    }
    Rename-Item "server-new.js" "server.js"
    Write-Host "? Servidor migrado a estructura modular" -ForegroundColor Green
} else {
    Write-Host "? No se encontró server-new.js" -ForegroundColor Red
    exit 1
}

# 3. Verificar estructura de directorios
Write-Host "?? Verificando estructura de directorios..." -ForegroundColor Yellow
$directories = @("config", "routes", "controllers", "models", "middlewares", "services", "utils")
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "? $dir/" -ForegroundColor Green
    } else {
        Write-Host "? $dir/ - FALTA" -ForegroundColor Red
    }
}

# 4. Verificar archivos críticos
Write-Host "?? Verificando archivos críticos..." -ForegroundColor Yellow
$criticalFiles = @(
    "config/db.js",
    "config/env.js",
    "routes/citas.routes.js",
    "routes/usuarios.routes.js",
    "controllers/citas.controller.js",
    "controllers/usuarios.controller.js",
    "middlewares/auth.js",
    ".env"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "? $file" -ForegroundColor Green
    } else {
        Write-Host "? $file - FALTA" -ForegroundColor Red
    }
}

# 5. Verificar package.json
Write-Host "?? Verificando package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    $packageContent = Get-Content "package.json" -Raw
    if ($packageContent -match "server-new.js" -or $packageContent -match "citaly-api-gateway") {
        Write-Host "? package.json actualizado" -ForegroundColor Green
    } else {
        Write-Host "??  package.json puede necesitar actualización" -ForegroundColor Yellow
    }
} else {
    Write-Host "? package.json no encontrado" -ForegroundColor Red
}

# 6. Verificar dependencias
Write-Host "?? Verificando dependencias..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-Host "?? Instalando dependencias..." -ForegroundColor Yellow
        npm install
        Write-Host "? Dependencias instaladas" -ForegroundColor Green
    } else {
        Write-Host "??  npm no encontrado. Instalar dependencias manualmente." -ForegroundColor Yellow
    }
} else {
    Write-Host "? package.json no encontrado" -ForegroundColor Red
}

# 7. Verificar variables de entorno
Write-Host "?? Verificando configuración..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "DB_NAME") {
        Write-Host "? .env actualizado con nuevas variables" -ForegroundColor Green
    } else {
        Write-Host "??  .env puede necesitar actualización con nuevas variables" -ForegroundColor Yellow
    }
} else {
    Write-Host "? .env no encontrado" -ForegroundColor Red
}

Write-Host ""
Write-Host "?? ¡Migración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "?? Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Revisar las configuraciones en .env" -ForegroundColor White
Write-Host "   2. Probar el servidor: npm run dev" -ForegroundColor White
Write-Host "   3. Verificar endpoints en: http://localhost:3001" -ForegroundColor White
Write-Host "   4. Revisar logs para errores" -ForegroundColor White
Write-Host ""
Write-Host "?? Documentación disponible en: README-ESTRUCTURA.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "?? Para revertir la migración:" -ForegroundColor Yellow
Write-Host "   Rename-Item 'server.js' 'server-modular.js'" -ForegroundColor White
Write-Host "   Rename-Item 'server-legacy.js' 'server.js'" -ForegroundColor White
Write-Host ""

# Pausa para que el usuario pueda leer los resultados
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
