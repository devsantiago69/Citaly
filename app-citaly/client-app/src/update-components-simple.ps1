#!/usr/bin/env pwsh
# Script simplificado para actualizar los componentes más críticos

Write-Host "?? Actualizando componentes críticos del frontend..." -ForegroundColor Green

# Lista de archivos que necesitan actualización manual
$criticalFiles = @(
    "src/components/StaffManagement.tsx",
    "src/components/UserTypeManagement.tsx",
    "src/components/CategoryManagement.tsx",
    "src/components/BillingPanel.tsx",
    "src/components/DashboardContent.tsx",
    "src/components/StatsCards.tsx",
    "src/components/ReportsPanel.tsx",
    "src/components/GlobalSearch.tsx"
)

Write-Host "?? Los siguientes componentes requieren actualización manual:" -ForegroundColor Yellow
foreach ($file in $criticalFiles) {
    if (Test-Path (Join-Path $PSScriptRoot $file)) {
        Write-Host "  ??  $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "?? Pasos para actualizar manualmente cada componente:" -ForegroundColor Cyan
Write-Host "  1. Cambiar import: 'from @/config/api' ? 'from @/config/api-v2'" -ForegroundColor White
Write-Host "  2. Cambiar 'import { api }' ? 'import { apiService }'" -ForegroundColor White
Write-Host "  3. Cambiar llamadas API:" -ForegroundColor White
Write-Host "     - api.get('/api/users') ? apiService.users.list()" -ForegroundColor White
Write-Host "     - api.post('/api/users', data) ? apiService.users.create(data)" -ForegroundColor White
Write-Host "     - api.put('/api/users/id', data) ? apiService.users.update(id, data)" -ForegroundColor White
Write-Host "     - api.delete('/api/users/id') ? apiService.users.delete(id)" -ForegroundColor White
Write-Host ""

Write-Host "? Los componentes principales ya han sido actualizados:" -ForegroundColor Green
Write-Host "  ? AppointmentList.tsx" -ForegroundColor Green
Write-Host "  ? UserManagement.tsx" -ForegroundColor Green
Write-Host "  ? ServiceManagement.tsx" -ForegroundColor Green
Write-Host "  ? SpecialtyManagement.tsx" -ForegroundColor Green

Write-Host ""
Write-Host "?? Sistema listo para pruebas. Ejecuta:" -ForegroundColor Cyan
Write-Host "   .\run-full-system.ps1" -ForegroundColor White
