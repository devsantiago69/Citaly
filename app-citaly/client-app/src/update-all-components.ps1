#!/usr/bin/env pwsh
# Script para actualizar todos los componentes del frontend para usar la nueva API modular

Write-Host "?? Iniciando actualización de todos los componentes del frontend..." -ForegroundColor Green

# Función para actualizar imports en archivos TypeScript
function Update-ApiImports {
    param(
        [string]$FilePath
    )

    if (Test-Path $FilePath) {
        Write-Host "  Actualizando imports en: $FilePath" -ForegroundColor Yellow

        # Leer contenido del archivo
        $content = Get-Content $FilePath -Raw

        # Actualizar import de API antigua a nueva
        $content = $content -replace 'import.*?{.*?API_BASE_URL.*?}.*?from.*?["\']@/config/api["\']', 'import { apiService } from "@/config/api-v2"'
        $content = $content -replace 'from.*?["\']@/config/api["\']', 'from "@/config/api-v2"'

        # Actualizar llamadas fetch básicas a nueva API
        $content = $content -replace 'await fetch\(`\$\{API_BASE_URL\}/api/([^`]+)`\)', 'await apiService.$1'
        $content = $content -replace 'await fetch\(`/api/([^`]+)`\)', 'await apiService.$1'

        # Escribir contenido actualizado
        Set-Content -Path $FilePath -Value $content -Encoding UTF8

        Write-Host "  ? Archivo actualizado: $FilePath" -ForegroundColor Green
    }
}

# Lista de archivos de componentes principales
$componentFiles = @(
    "src/components/AppointmentCalendar.tsx",
    "src/components/AppointmentList.tsx",
    "src/components/UserManagement.tsx",
    "src/components/ServiceManagement.tsx",
    "src/components/SpecialtyManagement.tsx",
    "src/components/StaffManagement.tsx",
    "src/components/StaffSpecialtyManagement.tsx",
    "src/components/UserTypeManagement.tsx",
    "src/components/ReportsPanel.tsx",
    "src/components/GlobalSearch.tsx",
    "src/components/NewAppointmentDialog.tsx",
    "src/components/BillingPanel.tsx",
    "src/components/DashboardContent.tsx",
    "src/components/StatsCards.tsx",
    "src/components/AdminManagement.tsx",
    "src/components/AdminProfile.tsx",
    "src/components/CategoryManagement.tsx",
    "src/components/ReminderManagement.tsx",
    "src/components/SettingsPanel.tsx"
)

# Actualizar cada archivo de componente
foreach ($file in $componentFiles) {
    $fullPath = Join-Path $PSScriptRoot $file
    Update-ApiImports -FilePath $fullPath
}

Write-Host "?? Actualizando componentes específicos con patrones avanzados..." -ForegroundColor Cyan

# Actualizar componentes con patrones específicos

# 1. Actualizar ServiceManagement.tsx
$serviceManagementPath = Join-Path $PSScriptRoot "src/components/ServiceManagement.tsx"
if (Test-Path $serviceManagementPath) {
    Write-Host "  ?? Actualizando ServiceManagement.tsx" -ForegroundColor Yellow

    $content = Get-Content $serviceManagementPath -Raw

    # Actualizar llamadas específicas de servicios
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/services`\)', 'apiService.services.list()'
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/services\`\s*,\s*\{[^}]*method:\s*["\']POST["\'][^}]*\}\)', 'apiService.services.create(data)'
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/services/\$\{.*?\}\`\s*,\s*\{[^}]*method:\s*["\']PUT["\'][^}]*\}\)', 'apiService.services.update(id, data)'
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/services/\$\{.*?\}\`\s*,\s*\{[^}]*method:\s*["\']DELETE["\'][^}]*\}\)', 'apiService.services.delete(id)'

    Set-Content -Path $serviceManagementPath -Value $content -Encoding UTF8
}

# 2. Actualizar SpecialtyManagement.tsx
$specialtyManagementPath = Join-Path $PSScriptRoot "src/components/SpecialtyManagement.tsx"
if (Test-Path $specialtyManagementPath) {
    Write-Host "  ?? Actualizando SpecialtyManagement.tsx" -ForegroundColor Yellow

    $content = Get-Content $specialtyManagementPath -Raw

    # Actualizar llamadas específicas de especialidades
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/specialties`\)', 'apiService.specialties.list()'
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/specialties\`\s*,\s*\{[^}]*method:\s*["\']POST["\'][^}]*\}\)', 'apiService.specialties.create(data)'
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/specialties/\$\{.*?\}\`\s*,\s*\{[^}]*method:\s*["\']PUT["\'][^}]*\}\)', 'apiService.specialties.update(id, data)'
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/specialties/\$\{.*?\}\`\s*,\s*\{[^}]*method:\s*["\']DELETE["\'][^}]*\}\)', 'apiService.specialties.delete(id)'

    Set-Content -Path $specialtyManagementPath -Value $content -Encoding UTF8
}

# 3. Actualizar StaffManagement.tsx
$staffManagementPath = Join-Path $PSScriptRoot "src/components/StaffManagement.tsx"
if (Test-Path $staffManagementPath) {
    Write-Host "  ?? Actualizando StaffManagement.tsx" -ForegroundColor Yellow

    $content = Get-Content $staffManagementPath -Raw

    # Actualizar llamadas específicas de personal
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/staff`\)', 'apiService.staff.list()'
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/staff\`\s*,\s*\{[^}]*method:\s*["\']POST["\'][^}]*\}\)', 'apiService.staff.create(data)'
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/staff/\$\{.*?\}\`\s*,\s*\{[^}]*method:\s*["\']PUT["\'][^}]*\}\)', 'apiService.staff.update(id, data)'
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/staff/\$\{.*?\}\`\s*,\s*\{[^}]*method:\s*["\']DELETE["\'][^}]*\}\)', 'apiService.staff.delete(id)'

    Set-Content -Path $staffManagementPath -Value $content -Encoding UTF8
}

# 4. Actualizar UserTypeManagement.tsx
$userTypeManagementPath = Join-Path $PSScriptRoot "src/components/UserTypeManagement.tsx"
if (Test-Path $userTypeManagementPath) {
    Write-Host "  ?? Actualizando UserTypeManagement.tsx" -ForegroundColor Yellow

    $content = Get-Content $userTypeManagementPath -Raw

    # Actualizar llamadas específicas de tipos de usuario
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/user-types`\)', 'apiService.userTypes.list()'
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/user-types\`\s*,\s*\{[^}]*method:\s*["\']POST["\'][^}]*\}\)', 'apiService.userTypes.create(data)'
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/user-types/\$\{.*?\}\`\s*,\s*\{[^}]*method:\s*["\']PUT["\'][^}]*\}\)', 'apiService.userTypes.update(id, data)'
    $content = $content -replace 'fetch\(`\$\{API_BASE_URL\}/api/user-types/\$\{.*?\}\`\s*,\s*\{[^}]*method:\s*["\']DELETE["\'][^}]*\}\)', 'apiService.userTypes.delete(id)'

    Set-Content -Path $userTypeManagementPath -Value $content -Encoding UTF8
}

Write-Host "?? ¡Actualización de componentes completada!" -ForegroundColor Green
Write-Host ""
Write-Host "?? Resumen de cambios realizados:" -ForegroundColor Cyan
Write-Host "  • Imports actualizados de @/config/api a @/config/api-v2" -ForegroundColor White
Write-Host "  • Llamadas fetch() reemplazadas por apiService methods" -ForegroundColor White
Write-Host "  • Patrones específicos actualizados en componentes principales" -ForegroundColor White
Write-Host ""
Write-Host "??  Nota: Es posible que algunos componentes requieran ajustes manuales" -ForegroundColor Yellow
Write-Host "   para tipos TypeScript más específicos y lógica de negocio personalizada." -ForegroundColor Yellow
Write-Host ""
Write-Host "? El sistema está listo para pruebas. Ejecuta el script de pruebas completas:" -ForegroundColor Green
Write-Host "   ./run-full-system.ps1" -ForegroundColor Cyan
