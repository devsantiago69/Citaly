#!/bin/bash

# Script de migración de componentes frontend para la nueva API modular
# Este script actualiza todos los componentes para usar la nueva estructura de API

echo "?? MIGRANDO COMPONENTES FRONTEND A LA NUEVA API MODULAR"
echo "====================================================="

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Contadores
UPDATED_FILES=0
TOTAL_FILES=0

# Función para actualizar imports en archivos
update_api_imports() {
    local file="$1"
    local description="$2"

    echo -n "Actualizando $description... "

    if [ -f "$file" ]; then
        # Crear backup
        cp "$file" "$file.backup"

        # Actualizar imports de API
        sed -i.tmp 's|from.*config/api.*|from "../config/api-v2";|g' "$file"
        sed -i.tmp 's|import.*api.*from.*api.*|import { apiService } from "../config/api-v2";|g' "$file"

        # Limpiar archivos temporales
        rm -f "$file.tmp"

        echo -e "${GREEN}? Actualizado${NC}"
        ((UPDATED_FILES++))
    else
        echo -e "${RED}? No encontrado${NC}"
    fi

    ((TOTAL_FILES++))
}

# Función para actualizar llamadas a API en componentes
update_api_calls() {
    local file="$1"
    local description="$2"

    echo -n "Actualizando llamadas API en $description... "

    if [ -f "$file" ]; then
        # Crear backup
        cp "$file" "$file.backup"

        # Actualizar llamadas específicas de API
        sed -i.tmp 's|api\.get("/api/appointments"|apiService.appointments.list(|g' "$file"
        sed -i.tmp 's|api\.post("/api/appointments"|apiService.appointments.create(|g' "$file"
        sed -i.tmp 's|api\.put("/api/appointments/\${id}"|apiService.appointments.update(id, |g' "$file"
        sed -i.tmp 's|api\.delete("/api/appointments/\${id}"|apiService.appointments.delete(id)|g' "$file"

        sed -i.tmp 's|api\.get("/api/clients"|apiService.clients.list(|g' "$file"
        sed -i.tmp 's|api\.post("/api/clients"|apiService.clients.create(|g' "$file"
        sed -i.tmp 's|api\.put("/api/clients/\${id}"|apiService.clients.update(id, |g' "$file"
        sed -i.tmp 's|api\.delete("/api/clients/\${id}"|apiService.clients.delete(id)|g' "$file"

        sed -i.tmp 's|api\.get("/api/staff"|apiService.staff.list(|g' "$file"
        sed -i.tmp 's|api\.post("/api/staff"|apiService.staff.create(|g' "$file"

        sed -i.tmp 's|api\.get("/api/services"|apiService.services.list(|g' "$file"
        sed -i.tmp 's|api\.post("/api/services"|apiService.services.create(|g' "$file"
        sed -i.tmp 's|api\.put("/api/services/\${id}"|apiService.services.update(id, |g' "$file"
        sed -i.tmp 's|api\.delete("/api/services/\${id}"|apiService.services.delete(id)|g' "$file"

        sed -i.tmp 's|api\.get("/api/specialties"|apiService.specialties.list(|g' "$file"
        sed -i.tmp 's|api\.post("/api/specialties"|apiService.specialties.create(|g' "$file"
        sed -i.tmp 's|api\.put("/api/specialties/\${id}"|apiService.specialties.update(id, |g' "$file"
        sed -i.tmp 's|api\.delete("/api/specialties/\${id}"|apiService.specialties.delete(id)|g' "$file"

        sed -i.tmp 's|api\.get("/api/user-types"|apiService.userTypes.list(|g' "$file"
        sed -i.tmp 's|api\.post("/api/user-types"|apiService.userTypes.create(|g' "$file"
        sed -i.tmp 's|api\.put("/api/user-types/\${id}"|apiService.userTypes.update(id, |g' "$file"
        sed -i.tmp 's|api\.delete("/api/user-types/\${id}"|apiService.userTypes.delete(id)|g' "$file"

        # Limpiar archivos temporales
        rm -f "$file.tmp"

        echo -e "${GREEN}? API calls actualizadas${NC}"
        ((UPDATED_FILES++))
    else
        echo -e "${RED}? No encontrado${NC}"
    fi

    ((TOTAL_FILES++))
}

echo ""
echo -e "${BLUE}?? PASO 1: ACTUALIZANDO IMPORTS DE API${NC}"
echo "======================================="

# Actualizar imports en componentes principales
update_api_imports "src/components/AppointmentCalendar.tsx" "AppointmentCalendar"
update_api_imports "src/components/AppointmentList.tsx" "AppointmentList"
update_api_imports "src/components/NewAppointmentDialog.tsx" "NewAppointmentDialog"
update_api_imports "src/components/UserManagement.tsx" "UserManagement"
update_api_imports "src/components/ClientWizardForm.tsx" "ClientWizardForm"
update_api_imports "src/components/StaffManagement.tsx" "StaffManagement"
update_api_imports "src/components/ServiceManagement.tsx" "ServiceManagement"
update_api_imports "src/components/SpecialtyManagement.tsx" "SpecialtyManagement"
update_api_imports "src/components/UserTypeManagement.tsx" "UserTypeManagement"
update_api_imports "src/components/StaffSpecialtyManagement.tsx" "StaffSpecialtyManagement"
update_api_imports "src/components/ReportsPanel.tsx" "ReportsPanel"
update_api_imports "src/components/GlobalSearch.tsx" "GlobalSearch"
update_api_imports "src/components/StatsCards.tsx" "StatsCards"
update_api_imports "src/components/DashboardContent.tsx" "DashboardContent"

echo ""
echo -e "${BLUE}?? PASO 2: ACTUALIZANDO LLAMADAS A API${NC}"
echo "======================================"

# Actualizar llamadas a API en componentes
update_api_calls "src/components/AppointmentCalendar.tsx" "AppointmentCalendar"
update_api_calls "src/components/AppointmentList.tsx" "AppointmentList"
update_api_calls "src/components/NewAppointmentDialog.tsx" "NewAppointmentDialog"
update_api_calls "src/components/UserManagement.tsx" "UserManagement"
update_api_calls "src/components/ClientWizardForm.tsx" "ClientWizardForm"
update_api_calls "src/components/StaffManagement.tsx" "StaffManagement"
update_api_calls "src/components/ServiceManagement.tsx" "ServiceManagement"
update_api_calls "src/components/SpecialtyManagement.tsx" "SpecialtyManagement"
update_api_calls "src/components/UserTypeManagement.tsx" "UserTypeManagement"
update_api_calls "src/components/StaffSpecialtyManagement.tsx" "StaffSpecialtyManagement"
update_api_calls "src/components/ReportsPanel.tsx" "ReportsPanel"
update_api_calls "src/components/GlobalSearch.tsx" "GlobalSearch"
update_api_calls "src/components/StatsCards.tsx" "StatsCards"
update_api_calls "src/components/DashboardContent.tsx" "DashboardContent"

echo ""
echo -e "${BLUE}?? PASO 3: ACTUALIZANDO HOOKS PERSONALIZADOS${NC}"
echo "============================================"

# Actualizar hooks
update_api_imports "src/hooks/useGlobalSearch.ts" "useGlobalSearch Hook"
update_api_calls "src/hooks/useGlobalSearch.ts" "useGlobalSearch Hook"

echo ""
echo -e "${BLUE}?? PASO 4: ACTUALIZANDO PÁGINAS${NC}"
echo "==============================="

# Actualizar páginas
update_api_imports "src/pages/Index.tsx" "Index Page"
update_api_calls "src/pages/Index.tsx" "Index Page"

echo ""
echo -e "${YELLOW}?? PASO 5: CREANDO COMPONENTES PARA NUEVAS FUNCIONALIDADES${NC}"
echo "=========================================================="

# Crear componente para reportes avanzados
echo -n "Creando ReportsAdvanced component... "
cat > "src/components/ReportsAdvanced.tsx" << 'EOF'
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { apiService } from '../config/api-v2';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const ReportsAdvanced = () => {
  const [overviewData, setOverviewData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [servicesData, setServicesData] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, [selectedPeriod]);

  const loadReports = async () => {
    setLoading(true);
    try {
      // Cargar datos del overview
      const overview = await apiService.reports.overview();
      setOverviewData(overview);

      // Cargar datos de ingresos
      const revenue = await apiService.reports.revenue({ period: selectedPeriod });
      setRevenueData(revenue);

      // Cargar datos de servicios
      const services = await apiService.reports.services();
      setServicesData(services);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando reportes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Reportes Avanzados</h2>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Por Día</SelectItem>
            <SelectItem value="week">Por Semana</SelectItem>
            <SelectItem value="month">Por Mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      {overviewData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Citas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewData.total_appointments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Citas Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewData.today_appointments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewData.total_clients}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${overviewData.monthly_revenue || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Services Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento de Servicios</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={servicesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="appointments_count" fill="#8884d8" name="Citas" />
              <Bar dataKey="revenue" fill="#82ca9d" name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsAdvanced;
EOF
echo -e "${GREEN}? Creado${NC}"

# Crear componente para búsqueda global mejorada
echo -n "Creando GlobalSearchAdvanced component... "
cat > "src/components/GlobalSearchAdvanced.tsx" << 'EOF'
import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Search, X, User, Calendar, Briefcase, Target } from 'lucide-react';
import { apiService } from '../config/api-v2';

interface SearchResult {
  clients: any[];
  staff: any[];
  services: any[];
  appointments: any[];
}

export const GlobalSearchAdvanced = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await apiService.search.global({
        q: searchQuery,
        type: 'all'
      });
      setResults(searchResults.results);
      setIsOpen(true);
    } catch (error) {
      console.error('Error in search:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'client': return <User size={16} />;
      case 'staff': return <User size={16} />;
      case 'service': return <Briefcase size={16} />;
      case 'appointment': return <Calendar size={16} />;
      default: return <Target size={16} />;
    }
  };

  const getTotalResults = () => {
    if (!results) return 0;
    return results.clients.length + results.staff.length +
           results.services.length + results.appointments.length;
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <Input
          type="text"
          placeholder="Buscar clientes, servicios, citas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              setQuery('');
              setResults(null);
              setIsOpen(false);
            }}
          >
            <X size={14} />
          </Button>
        )}
      </div>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Buscando...</div>
            ) : results && getTotalResults() > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                  <span className="text-sm font-medium">Resultados de búsqueda</span>
                  <Badge variant="secondary">{getTotalResults()} encontrados</Badge>
                </div>

                {/* Clientes */}
                {results.clients.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-1 px-2">CLIENTES</h4>
                    {results.clients.map((client, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        {getIcon('client')}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{client.name}</div>
                          <div className="text-xs text-gray-500 truncate">{client.email}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">Cliente</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Personal */}
                {results.staff.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-1 px-2">PERSONAL</h4>
                    {results.staff.map((staff, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        {getIcon('staff')}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{staff.name}</div>
                          <div className="text-xs text-gray-500 truncate">{staff.email}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">{staff.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Servicios */}
                {results.services.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-1 px-2">SERVICIOS</h4>
                    {results.services.map((service, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        {getIcon('service')}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{service.name}</div>
                          <div className="text-xs text-gray-500 truncate">${service.price} - {service.duration}min</div>
                        </div>
                        <Badge variant="outline" className="text-xs">Servicio</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Citas */}
                {results.appointments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-1 px-2">CITAS</h4>
                    {results.appointments.map((appointment, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        {getIcon('appointment')}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{appointment.client_name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {appointment.date} - {appointment.service_name}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">{appointment.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : query.length >= 2 ? (
              <div className="p-4 text-center text-gray-500">No se encontraron resultados</div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GlobalSearchAdvanced;
EOF
echo -e "${GREEN}? Creado${NC}"

echo ""
echo -e "${YELLOW}?? PASO 6: CREANDO SCRIPT DE PRUEBAS${NC}"
echo "==================================="

# Crear script de pruebas para los endpoints
echo -n "Creando script de pruebas de API... "
cat > "test-api-endpoints.js" << 'EOF'
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
EOF
echo -e "${GREEN}? Creado${NC}"

echo ""
echo -e "${GREEN}?? MIGRACIÓN DE FRONTEND COMPLETADA${NC}"
echo "=================================="
echo -e "${GREEN}? Archivos actualizados: $UPDATED_FILES/$TOTAL_FILES${NC}"
echo ""
echo -e "${YELLOW}?? PRÓXIMOS PASOS:${NC}"
echo "1. Ejecutar backend modular: cd ../api-gateway && node server-new.js"
echo "2. Ejecutar frontend: npm run dev"
echo "3. Probar endpoints: node test-api-endpoints.js"
echo "4. Verificar que todos los componentes funcionen correctamente"
echo ""
echo -e "${BLUE}?? ARCHIVOS CREADOS:${NC}"
echo "- src/config/api-v2.ts (Nueva configuración de API)"
echo "- src/components/ReportsAdvanced.tsx (Reportes avanzados)"
echo "- src/components/GlobalSearchAdvanced.tsx (Búsqueda global mejorada)"
echo "- test-api-endpoints.js (Script de pruebas)"
echo ""
echo -e "${YELLOW}??  IMPORTANTE:${NC}"
echo "- Los archivos originales tienen backup (.backup)"
echo "- Revisar cada componente para ajustes específicos"
echo "- Actualizar tipos TypeScript si es necesario"
echo ""
