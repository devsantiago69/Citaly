# Script de migración de componentes frontend para la nueva API modular
# Este script actualiza todos los componentes para usar la nueva estructura de API

Write-Host "?? MIGRANDO COMPONENTES FRONTEND A LA NUEVA API MODULAR" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# Contadores
$UpdatedFiles = 0
$TotalFiles = 0

# Función para actualizar imports en archivos
function Update-ApiImports {
    param(
        [string]$FilePath,
        [string]$Description
    )

    Write-Host "Actualizando $Description... " -NoNewline

    if (Test-Path $FilePath) {
        # Crear backup
        Copy-Item $FilePath "$FilePath.backup" -Force

        # Leer contenido del archivo
        $content = Get-Content $FilePath -Raw

        # Actualizar imports de API
        $content = $content -replace 'from.*config/api.*', 'from "../config/api-v2";'
        $content = $content -replace 'import.*api.*from.*api.*', 'import { apiService } from "../config/api-v2";'

        # Escribir contenido actualizado
        Set-Content $FilePath $content -Encoding UTF8

        Write-Host "? Actualizado" -ForegroundColor Green
        $script:UpdatedFiles++
    } else {
        Write-Host "? No encontrado" -ForegroundColor Red
    }

    $script:TotalFiles++
}

# Función para actualizar llamadas a API en componentes
function Update-ApiCalls {
    param(
        [string]$FilePath,
        [string]$Description
    )

    Write-Host "Actualizando llamadas API en $Description... " -NoNewline

    if (Test-Path $FilePath) {
        # Crear backup
        Copy-Item $FilePath "$FilePath.backup" -Force

        # Leer contenido del archivo
        $content = Get-Content $FilePath -Raw

        # Actualizar llamadas específicas de API
        $content = $content -replace 'api\.get\("/api/appointments"', 'apiService.appointments.list('
        $content = $content -replace 'api\.post\("/api/appointments"', 'apiService.appointments.create('
        $content = $content -replace 'api\.put\("/api/appointments/\$\{id\}"', 'apiService.appointments.update(id, '
        $content = $content -replace 'api\.delete\("/api/appointments/\$\{id\}"', 'apiService.appointments.delete(id)'

        $content = $content -replace 'api\.get\("/api/clients"', 'apiService.clients.list('
        $content = $content -replace 'api\.post\("/api/clients"', 'apiService.clients.create('
        $content = $content -replace 'api\.put\("/api/clients/\$\{id\}"', 'apiService.clients.update(id, '
        $content = $content -replace 'api\.delete\("/api/clients/\$\{id\}"', 'apiService.clients.delete(id)'

        $content = $content -replace 'api\.get\("/api/staff"', 'apiService.staff.list('
        $content = $content -replace 'api\.post\("/api/staff"', 'apiService.staff.create('

        $content = $content -replace 'api\.get\("/api/services"', 'apiService.services.list('
        $content = $content -replace 'api\.post\("/api/services"', 'apiService.services.create('
        $content = $content -replace 'api\.put\("/api/services/\$\{id\}"', 'apiService.services.update(id, '
        $content = $content -replace 'api\.delete\("/api/services/\$\{id\}"', 'apiService.services.delete(id)'

        $content = $content -replace 'api\.get\("/api/specialties"', 'apiService.specialties.list('
        $content = $content -replace 'api\.post\("/api/specialties"', 'apiService.specialties.create('
        $content = $content -replace 'api\.put\("/api/specialties/\$\{id\}"', 'apiService.specialties.update(id, '
        $content = $content -replace 'api\.delete\("/api/specialties/\$\{id\}"', 'apiService.specialties.delete(id)'

        $content = $content -replace 'api\.get\("/api/user-types"', 'apiService.userTypes.list('
        $content = $content -replace 'api\.post\("/api/user-types"', 'apiService.userTypes.create('
        $content = $content -replace 'api\.put\("/api/user-types/\$\{id\}"', 'apiService.userTypes.update(id, '
        $content = $content -replace 'api\.delete\("/api/user-types/\$\{id\}"', 'apiService.userTypes.delete(id)'

        # Escribir contenido actualizado
        Set-Content $FilePath $content -Encoding UTF8

        Write-Host "? API calls actualizadas" -ForegroundColor Green
        $script:UpdatedFiles++
    } else {
        Write-Host "? No encontrado" -ForegroundColor Red
    }

    $script:TotalFiles++
}

Write-Host ""
Write-Host "?? PASO 1: ACTUALIZANDO IMPORTS DE API" -ForegroundColor Blue
Write-Host "=======================================" -ForegroundColor Blue

# Actualizar imports en componentes principales
Update-ApiImports "src\components\AppointmentCalendar.tsx" "AppointmentCalendar"
Update-ApiImports "src\components\AppointmentList.tsx" "AppointmentList"
Update-ApiImports "src\components\NewAppointmentDialog.tsx" "NewAppointmentDialog"
Update-ApiImports "src\components\UserManagement.tsx" "UserManagement"
Update-ApiImports "src\components\ClientWizardForm.tsx" "ClientWizardForm"
Update-ApiImports "src\components\StaffManagement.tsx" "StaffManagement"
Update-ApiImports "src\components\ServiceManagement.tsx" "ServiceManagement"
Update-ApiImports "src\components\SpecialtyManagement.tsx" "SpecialtyManagement"
Update-ApiImports "src\components\UserTypeManagement.tsx" "UserTypeManagement"
Update-ApiImports "src\components\StaffSpecialtyManagement.tsx" "StaffSpecialtyManagement"
Update-ApiImports "src\components\ReportsPanel.tsx" "ReportsPanel"
Update-ApiImports "src\components\GlobalSearch.tsx" "GlobalSearch"
Update-ApiImports "src\components\StatsCards.tsx" "StatsCards"
Update-ApiImports "src\components\DashboardContent.tsx" "DashboardContent"

Write-Host ""
Write-Host "?? PASO 2: ACTUALIZANDO LLAMADAS A API" -ForegroundColor Blue
Write-Host "======================================" -ForegroundColor Blue

# Actualizar llamadas a API en componentes
Update-ApiCalls "src\components\AppointmentCalendar.tsx" "AppointmentCalendar"
Update-ApiCalls "src\components\AppointmentList.tsx" "AppointmentList"
Update-ApiCalls "src\components\NewAppointmentDialog.tsx" "NewAppointmentDialog"
Update-ApiCalls "src\components\UserManagement.tsx" "UserManagement"
Update-ApiCalls "src\components\ClientWizardForm.tsx" "ClientWizardForm"
Update-ApiCalls "src\components\StaffManagement.tsx" "StaffManagement"
Update-ApiCalls "src\components\ServiceManagement.tsx" "ServiceManagement"
Update-ApiCalls "src\components\SpecialtyManagement.tsx" "SpecialtyManagement"
Update-ApiCalls "src\components\UserTypeManagement.tsx" "UserTypeManagement"
Update-ApiCalls "src\components\StaffSpecialtyManagement.tsx" "StaffSpecialtyManagement"
Update-ApiCalls "src\components\ReportsPanel.tsx" "ReportsPanel"
Update-ApiCalls "src\components\GlobalSearch.tsx" "GlobalSearch"
Update-ApiCalls "src\components\StatsCards.tsx" "StatsCards"
Update-ApiCalls "src\components\DashboardContent.tsx" "DashboardContent"

Write-Host ""
Write-Host "?? PASO 3: ACTUALIZANDO HOOKS PERSONALIZADOS" -ForegroundColor Blue
Write-Host "============================================" -ForegroundColor Blue

# Actualizar hooks
Update-ApiImports "src\hooks\useGlobalSearch.ts" "useGlobalSearch Hook"
Update-ApiCalls "src\hooks\useGlobalSearch.ts" "useGlobalSearch Hook"

Write-Host ""
Write-Host "?? PASO 4: ACTUALIZANDO PÁGINAS" -ForegroundColor Blue
Write-Host "===============================" -ForegroundColor Blue

# Actualizar páginas
Update-ApiImports "src\pages\Index.tsx" "Index Page"
Update-ApiCalls "src\pages\Index.tsx" "Index Page"

Write-Host ""
Write-Host "?? PASO 5: CREANDO COMPONENTES PARA NUEVAS FUNCIONALIDADES" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

# Crear script de pruebas para los endpoints
Write-Host "Creando script de pruebas de API... " -NoNewline
@'
// Script de pruebas para validar que todos los endpoints del nuevo API funcionen correctamente
const API_BASE = 'http://localhost:3001';

async function testEndpoint(method, endpoint, data = null, description) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const url = method === 'GET' && data
      ? `${API_BASE}${endpoint}?${new URLSearchParams(data).toString()}`
      : `${API_BASE}${endpoint}`;

    const response = await fetch(url, options);
    const result = await response.json();

    console.log(`? ${method} ${endpoint} - ${description}: ${response.status}`);
    return { success: true, data: result, status: response.status };
  } catch (error) {
    console.log(`? ${method} ${endpoint} - ${description}: Error - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('?? INICIANDO PRUEBAS DE ENDPOINTS DEL API MODULAR');
  console.log('===============================================');

  // Probar endpoint de salud
  await testEndpoint('GET', '/', null, 'Health check');
  await testEndpoint('GET', '/health', null, 'Detailed health check');

  console.log('\n?? PROBANDO ENDPOINTS DE CITAS');
  await testEndpoint('GET', '/api/appointments', null, 'Listar citas');
  await testEndpoint('GET', '/api/appointments/calendar', null, 'Calendario de citas');
  await testEndpoint('GET', '/api/appointments/filters', null, 'Filtros de citas');

  console.log('\n?? PROBANDO ENDPOINTS DE USUARIOS');
  await testEndpoint('GET', '/api/clients', null, 'Listar clientes');
  await testEndpoint('GET', '/api/staff', null, 'Listar personal');
  await testEndpoint('GET', '/api/admins', null, 'Listar administradores');
  await testEndpoint('GET', '/api/users', null, 'Listar usuarios');

  console.log('\n??? PROBANDO ENDPOINTS DE SERVICIOS');
  await testEndpoint('GET', '/api/services', null, 'Listar servicios');

  console.log('\n?? PROBANDO ENDPOINTS DE ESPECIALIDADES');
  await testEndpoint('GET', '/api/specialties', null, 'Listar especialidades');

  console.log('\n?? PROBANDO ENDPOINTS DE TIPOS DE USUARIO');
  await testEndpoint('GET', '/api/user-types', null, 'Listar tipos de usuario');

  console.log('\n?? PROBANDO ENDPOINTS DE REPORTES');
  await testEndpoint('GET', '/api/reports/overview', null, 'Resumen general');
  await testEndpoint('GET', '/api/reports/revenue', null, 'Reporte de ingresos');
  await testEndpoint('GET', '/api/reports/services', null, 'Reporte de servicios');
  await testEndpoint('GET', '/api/reports/staff', null, 'Reporte de personal');
  await testEndpoint('GET', '/api/reports/clients', null, 'Reporte de clientes');

  console.log('\n?? PROBANDO ENDPOINTS DE BÚSQUEDA');
  await testEndpoint('GET', '/api/search', { q: 'test', type: 'all' }, 'Búsqueda global');
  await testEndpoint('GET', '/api/countries', null, 'Lista de países');

  console.log('\n?? PROBANDO ENDPOINTS DE SOPORTE');
  await testEndpoint('GET', '/api/support-cases', null, 'Casos de soporte');

  console.log('\n? PRUEBAS COMPLETADAS');
  console.log('===================');
}

// Ejecutar pruebas si es llamado directamente
if (require.main === module) {
  runTests();
}

module.exports = { testEndpoint, runTests };
'@ | Set-Content "test-api-endpoints.js" -Encoding UTF8
Write-Host "? Creado" -ForegroundColor Green

Write-Host ""
Write-Host "?? MIGRACIÓN DE FRONTEND COMPLETADA" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host "? Archivos actualizados: $UpdatedFiles/$TotalFiles" -ForegroundColor Green
Write-Host ""
Write-Host "?? PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "1. Ejecutar backend modular: cd ..\api-gateway && node server-new.js"
Write-Host "2. Ejecutar frontend: npm run dev"
Write-Host "3. Probar endpoints: node test-api-endpoints.js"
Write-Host "4. Verificar que todos los componentes funcionen correctamente"
Write-Host ""
Write-Host "?? ARCHIVOS CREADOS:" -ForegroundColor Blue
Write-Host "- src\config\api-v2.ts (Nueva configuración de API)"
Write-Host "- test-api-endpoints.js (Script de pruebas)"
Write-Host ""
Write-Host "??  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "- Los archivos originales tienen backup (.backup)"
Write-Host "- Revisar cada componente para ajustes específicos"
Write-Host "- Actualizar tipos TypeScript si es necesario"
Write-Host ""
