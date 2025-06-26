import { useEffect, useState, useCallback } from "react";
import { Calendar as CalendarIcon, TrendingUp, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { apiService } from "@/config/api-v2";

// Interfaces simplificadas
interface Appointment {
  id: number;
  client: { id: number; name: string; phone: string; email: string };
  service: { id: number; name: string; duration: number; price: number; category: string };
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'in_progress';
  channel?: 'online' | 'presencial' | 'whatsapp' | 'phone';
  notes?: string;
}

interface Service {
  id: number;
  name: string;
  category: string;
  duration: number;
  price: number;
}

interface PopularService extends Service {
  count: number;
  revenue?: number;
}

interface DashboardStats {
  totalRevenue: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  completionRate: number;
}

const DashboardContentFixed = () => {
  // Estados principales
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [popularServices, setPopularServices] = useState<PopularService[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    completionRate: 0
  });

  // Función para probar conexión con backend
  const testBackendConnection = useCallback(async () => {
    try {
      await apiService.system.health();
      setBackendConnected(true);
      return true;
    } catch (error) {
      setBackendConnected(false);
      return false;
    }
  }, []);

  // Función para cargar datos de prueba cuando no hay backend
  const loadMockData = useCallback(() => {
    console.log('?? Cargando datos de prueba...');

    // Servicios de prueba
    const mockServices: Service[] = [
      { id: 1, name: 'Consulta General', category: 'Medicina General', duration: 30, price: 50000 },
      { id: 2, name: 'Consulta Especializada', category: 'Especialidades', duration: 45, price: 80000 },
      { id: 3, name: 'Examen de Laboratorio', category: 'Laboratorio', duration: 15, price: 30000 },
      { id: 4, name: 'Radiografía', category: 'Imagenología', duration: 20, price: 40000 },
      { id: 5, name: 'Ecografía', category: 'Imagenología', duration: 30, price: 60000 }
    ];

    // Citas de prueba
    const today = new Date();
    const mockAppointments: Appointment[] = [
      {
        id: 1,
        client: { id: 1, name: 'Juan Pérez', phone: '3001234567', email: 'juan@email.com' },
        service: mockServices[0],
        date: format(today, 'yyyy-MM-dd'),
        time: '09:00',
        status: 'scheduled',
        channel: 'online'
      },
      {
        id: 2,
        client: { id: 2, name: 'María García', phone: '3007654321', email: 'maria@email.com' },
        service: mockServices[1],
        date: format(today, 'yyyy-MM-dd'),
        time: '10:30',
        status: 'confirmed',
        channel: 'presencial'
      },
      {
        id: 3,
        client: { id: 3, name: 'Carlos López', phone: '3009876543', email: 'carlos@email.com' },
        service: mockServices[2],
        date: format(today, 'yyyy-MM-dd'),
        time: '14:00',
        status: 'completed',
        channel: 'whatsapp'
      }
    ];

    setAllServices(mockServices);
    setAllAppointments(mockAppointments);
    setUpcomingAppointments(mockAppointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)));

    toast.success('Datos de prueba cargados');
  }, []);

  // Función para obtener todos los servicios con manejo de errores mejorado
  const fetchServices = useCallback(async () => {
    try {
      console.log('?? Obteniendo servicios...');
      const services = await apiService.services.list();
      console.log('? Servicios obtenidos:', services?.length || 0);
      setAllServices(Array.isArray(services) ? services : []);
      return true;
    } catch (error) {
      console.error('? Error fetching services:', error);
      setAllServices([]);
      return false;
    }
  }, []);

  // Función para obtener todas las citas con manejo de errores mejorado
  const fetchAllAppointments = useCallback(async () => {
    try {
      console.log('?? Obteniendo citas...');
      const appointments = await apiService.appointments.list();
      console.log('? Citas obtenidas:', appointments?.length || 0);
      setAllAppointments(Array.isArray(appointments) ? appointments : []);
      return true;
    } catch (error) {
      console.error('? Error fetching appointments:', error);
      setAllAppointments([]);
      return false;
    }
  }, []);

  // Función para obtener citas próximas (solo para hoy)
  const fetchUpcomingAppointments = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Filtrar de todas las citas las que son de hoy y están programadas
      const todayAppointments = allAppointments.filter(app =>
        app.date.startsWith(today) && ['scheduled', 'confirmed'].includes(app.status)
      );

      const processedAppointments = todayAppointments
        .sort((a, b) => a.time?.localeCompare(b.time) || 0)
        .slice(0, 6);

      console.log('? Próximas citas:', processedAppointments.length);
      setUpcomingAppointments(processedAppointments);
    } catch (error) {
      console.error('? Error fetching upcoming appointments:', error);
      setUpcomingAppointments([]);
    }
  }, [allAppointments]);

  // Función para calcular servicios populares
  const calculatePopularServices = useCallback(() => {
    if (!Array.isArray(allAppointments) || allAppointments.length === 0) return;

    const serviceCounts: { [key: string]: { count: number; revenue: number } } = {};

    allAppointments.forEach(app => {
      if (app.service?.name) {
        const serviceName = app.service.name;
        if (!serviceCounts[serviceName]) {
          serviceCounts[serviceName] = { count: 0, revenue: 0 };
        }
        serviceCounts[serviceName].count += 1;
        serviceCounts[serviceName].revenue += app.service.price || 0;
      }
    });

    const popular = Object.entries(serviceCounts)
      .map(([serviceName, data]) => {
        const serviceDetails = allServices.find(s => s.name === serviceName);
        return {
          id: serviceDetails?.id || Math.random(),
          name: serviceName,
          category: serviceDetails?.category || 'General',
          duration: serviceDetails?.duration || 30,
          price: serviceDetails?.price || 0,
          count: data.count,
          revenue: data.revenue
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setPopularServices(popular);
  }, [allAppointments, allServices]);

  // Función para calcular estadísticas del dashboard
  const calculateDashboardStats = useCallback(() => {
    if (!Array.isArray(allAppointments) || allAppointments.length === 0) return;

    const totalRevenue = allAppointments
      .filter(app => app.status === 'completed')
      .reduce((sum, app) => sum + (app.service?.price || 0), 0);

    const totalAppointments = allAppointments.length;
    const completedAppointments = allAppointments.filter(app => app.status === 'completed').length;
    const cancelledAppointments = allAppointments.filter(app => app.status === 'cancelled').length;
    const completionRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;

    setDashboardStats({
      totalRevenue,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      completionRate
    });
  }, [allAppointments]);

  // Función principal para cargar todos los datos con mejor manejo de errores
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('?? Iniciando carga de datos del dashboard...');

      // Probar conexión con backend
      const isConnected = await testBackendConnection();

      if (!isConnected) {
        console.log('?? Backend no disponible, cargando datos de prueba...');
        loadMockData();
        setError('?? Backend no disponible. Mostrando datos de prueba. Verifica que el servidor esté ejecutándose en localhost:3001');
        return;
      }

      // Intentar cargar servicios y citas en paralelo
      const [servicesSuccess, appointmentsSuccess] = await Promise.all([
        fetchServices(),
        fetchAllAppointments()
      ]);

      if (!servicesSuccess && !appointmentsSuccess) {
        throw new Error('No se pudieron cargar los datos del servidor');
      }

      if (!appointmentsSuccess) {
        setError('No se pudieron cargar las citas. Algunas funciones pueden estar limitadas.');
      }

      console.log('? Datos del dashboard cargados exitosamente');
      toast.success('Datos actualizados correctamente');
    } catch (error) {
      console.error('? Error al cargar datos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar los datos';
      setError(errorMessage);
      toast.error('Error al cargar los datos del dashboard');

      // Cargar datos de prueba como fallback
      loadMockData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [testBackendConnection, fetchServices, fetchAllAppointments, loadMockData]);

  // Effects
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (allAppointments.length > 0) {
      fetchUpcomingAppointments();
      calculatePopularServices();
      calculateDashboardStats();
    }
  }, [allAppointments, calculatePopularServices, calculateDashboardStats, fetchUpcomingAppointments]);

  // Handler para refrescar
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  // Helper functions
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      return date.toLocaleTimeString('es-CO', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'scheduled': return 'Programada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      case 'in_progress': return 'En progreso';
      default: return status;
    }
  };

  if (loading && allAppointments.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <span>Cargando dashboard...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Dashboard
                {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                {backendConnected === false && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                    Modo Prueba
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Análisis general del negocio
                {backendConnected === false && (
                  <span className="block text-xs text-yellow-600 mt-1">
                    Backend no disponible - Mostrando datos de prueba
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="bg-white hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
                {refreshing ? 'Actualizando...' : 'Actualizar'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Mostrar error/advertencia si existe */}
      {error && (
        <Card className={`border-2 ${backendConnected === false ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className={`h-5 w-5 mt-0.5 ${backendConnected === false ? 'text-yellow-600' : 'text-red-600'}`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${backendConnected === false ? 'text-yellow-800' : 'text-red-800'}`}>
                  {backendConnected === false ? 'Advertencia' : 'Error'}
                </p>
                <p className={`text-sm ${backendConnected === false ? 'text-yellow-700' : 'text-red-600'} mt-1`}>
                  {error}
                </p>
                {backendConnected === false && (
                  <div className="mt-2 text-xs text-yellow-600">
                    Para conectar con datos reales:
                    <ol className="list-decimal list-inside mt-1 ml-2 space-y-1">
                      <li>Navega a la carpeta del backend</li>
                      <li>Ejecuta <code className="bg-yellow-100 px-1 rounded">npm start</code></li>
                      <li>Verifica que esté corriendo en localhost:3001</li>
                      <li>Actualiza esta página</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ingresos Totales</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(dashboardStats.totalRevenue)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Citas</CardDescription>
            <CardTitle className="text-2xl">{dashboardStats.totalAppointments}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completadas</CardDescription>
            <CardTitle className="text-2xl text-green-600">{dashboardStats.completedAppointments}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tasa de Completitud</CardDescription>
            <CardTitle className="text-2xl">{dashboardStats.completionRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Próximas citas y servicios populares */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              Próximas Citas
            </CardTitle>
            <CardDescription>Citas programadas para hoy</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppointments.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{app.client.name}</p>
                      <p className="text-sm text-gray-600">{app.service.name}</p>
                      <p className="text-xs text-gray-500">
                        {app.channel && `Canal: ${app.channel}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatTime(app.time)}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(app.service.price)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay citas programadas para hoy.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Servicios Populares
            </CardTitle>
            <CardDescription>Los más solicitados</CardDescription>
          </CardHeader>
          <CardContent>
            {popularServices.length > 0 ? (
              <div className="space-y-4">
                {popularServices.map((service, index) => (
                  <div key={service.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-gray-600">{service.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{service.count} citas</p>
                      <p className="text-sm text-gray-600">{formatCurrency(service.revenue || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay datos de servicios disponibles.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información adicional sobre el estado del sistema */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span>
                Estado del Backend: {backendConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div>
              Última actualización: {format(new Date(), 'HH:mm:ss')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardContentFixed;
