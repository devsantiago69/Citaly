import { useEffect, useState, useCallback, useMemo } from "react";
import { Calendar as CalendarIcon, TrendingUp, Loader2, RefreshCw, DollarSign, AlertCircle, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import StatsCards from "./StatsCards";
import { apiService } from "../config/api-v2";
import { Bar, BarChart, CartesianGrid, XAxis, Line, LineChart, RadialBar, RadialBarChart, PolarGrid, PolarRadiusAxis, Label, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { format, startOfMonth, endOfMonth, subDays, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { useSocket } from "../hooks/useSocket";

// Interfaces mejoradas y completas
interface Appointment {
  id: number;
  client: { id: number; name: string; phone: string; email: string };
  service: { id: number; name: string; duration: number; price: number; category: string };
  date: string;
  time: string;
  status: 'Programada' | 'Confirmada' | 'Completada' | 'Cancelada' | 'En progreso' | 'Pendiente';
  channel?: 'online' | 'presencial' | 'whatsapp' | 'phone';
  notes?: string;
}

interface Service {
  id: number;
  name: string;
  category: string;
  duration?: number;
  price?: number;
}

interface PopularService extends Service {
  count: number;
  revenue?: number;
}

interface TopServiceRevenue {
  service: string;
  total_revenue: number;
  count?: number;
}

interface AppointmentStatus {
  date: string;
  completed: number;
  cancelled: number;
  scheduled?: number;
  total?: number;
}

interface CompletionRatio {
  completed: number;
  cancelled: number;
  total: number;
  completion_rate: number;
}

interface RevenueByChannel {
  channel: string;
  total_revenue: number;
  count?: number;
}

interface DashboardFilters {
  dateRange: DateRange | undefined;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  channel: string;
  service: string;
  category: string;
  status: string;
}

interface DashboardStats {
  totalRevenue: number;
  totalAppointments: number;
  completionRate: number;
  averageServiceTime: number;
}

const DashboardContent = () => {
  // Estados principales
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [popularServices, setPopularServices] = useState<PopularService[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para los gráficos
  const [topServices, setTopServices] = useState<TopServiceRevenue[]>([]);
  const [appointmentsStatus, setAppointmentsStatus] = useState<AppointmentStatus[]>([]);
  const [completionRatio, setCompletionRatio] = useState<CompletionRatio>({
    completed: 0,
    cancelled: 0,
    total: 0,
    completion_rate: 0
  });
  const [revenueByChannel, setRevenueByChannel] = useState<RevenueByChannel[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalAppointments: 0,
    completionRate: 0,
    averageServiceTime: 0
  });
  // Filtros globales con estado mejorado
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    },
    period: 'monthly',
    channel: 'all',
    service: 'all',
    category: 'all',
    status: 'all'
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());  // Función mejorada para construir parámetros de filtro
  const buildFilterParams = useCallback(() => {
    const start_date = filters.dateRange?.from
      ? format(filters.dateRange.from, 'yyyy-MM-dd')
      : format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end_date = filters.dateRange?.to
      ? format(filters.dateRange.to, 'yyyy-MM-dd')
      : format(endOfMonth(new Date()), 'yyyy-MM-dd');

    let params = `start_date=${start_date}&end_date=${end_date}&period=${filters.period}`;

    if (filters.channel !== 'all') {
      params += `&channel=${encodeURIComponent(filters.channel)}`;
    }

    if (filters.service !== 'all') {
      params += `&service=${encodeURIComponent(filters.service)}`;
    }

    if (filters.category !== 'all') {
      params += `&category=${encodeURIComponent(filters.category)}`;
    }

    if (filters.status !== 'all') {
      params += `&status=${encodeURIComponent(filters.status)}`;
    }

    return params;
  }, [filters]);
  // Funci�n mejorada para filtrar datos localmente
  const filterLocalData = useCallback((data: Appointment[], dateField: string = 'date') => {
    if (!Array.isArray(data)) return [];

    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      const fromDate = filters.dateRange?.from || startOfMonth(new Date());
      const toDate = filters.dateRange?.to || endOfMonth(new Date());

      const withinDateRange = isWithinInterval(itemDate, { start: fromDate, end: toDate });
      const matchesChannel = filters.channel === 'all' || item.channel === filters.channel;
      const matchesService = filters.service === 'all' || item.service?.name === filters.service;
      const matchesCategory = filters.category === 'all' || item.service?.category === filters.category;
      const matchesStatus = filters.status === 'all' || item.status === filters.status;

      return withinDateRange && matchesChannel && matchesService && matchesCategory && matchesStatus;
    });
  }, [filters]);

  // Funci�n para obtener todos los servicios
  const fetchServices = async () => {
    try {
      const services = await apiService.services.list();
      console.log('Services fetched:', services);
      setAllServices(Array.isArray(services) ? services : Object.values(services));
    } catch (error) {
      console.error('Error fetching services:', error);
      setAllServices([]);
    }
  };

  // Funci�n para obtener citas pr�ximas (sin filtros)
  // Adaptador para transformar la cita del backend al formato Appointment
  function adaptAppointment(raw: any): Appointment {
    // Log para ver el objeto crudo recibido
    if (!raw || typeof raw !== 'object') {
      console.warn('[Adaptador] Objeto inválido:', raw);
      throw new Error('Objeto inválido');
    }
    // Mostrar todos los campos recibidos
    // Log siempre activo para depuración en frontend
    console.log('[Adaptador] Campos recibidos:', Object.keys(raw));
    return {
      id: raw.id ?? raw._id ?? 0,
      date: raw.fecha ?? raw.date ?? '',
      time: raw.hora ?? raw.time ?? '',
      status: raw.estado ?? raw.status ?? '',
      notes: raw.notas ?? raw.notes ?? '',
      channel: (raw.canal ?? raw.channel ?? '').toLowerCase(),
      client: {
        id: raw.cliente_id ?? raw.client_id ?? 0,
        name: raw.cliente_nombre_completo ?? raw.cliente_nombres ?? raw.client_name ?? '',
        phone: raw.cliente_telefono ?? raw.client_phone ?? '',
        email: raw.cliente_email ?? raw.client_email ?? ''
      },
      service: {
        id: raw.servicio_id ?? raw.service_id ?? 0,
        name: raw.servicio_nombre ?? raw.service_name ?? '',
        duration: Number(raw.servicio_duracion ?? raw.service_duration) || 0,
        price: Number(raw.servicio_precio_base ?? raw.servicio_precio ?? raw.service_price) || 0,
        category: raw.categoria_nombre ?? raw.service_category ?? 'General'
      }
    };
  }

  // Estado para debug: citas crudas del backend
  const [rawAppointments, setRawAppointments] = useState<any[]>([]);

  const fetchUpcomingAppointments = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      let appointments: any[] = [];
      let fetched = false;
      try {
        appointments = await apiService.appointments.list({ date: today, status: 'Programada,Confirmada' });
        console.log('[API] Citas del día:', appointments);
        appointments = Array.isArray(appointments) ? appointments : Object.values(appointments);
        fetched = appointments.length > 0;
      } catch (err) {
        console.log('[API] Error fetch citas del día:', err);
      }
      // Si no se obtuvieron citas del día, buscar todas y filtrar localmente
      if (!fetched || appointments.length === 0) {
        const allAppointments = await apiService.appointments.list();
        console.log('[API] Todas las citas:', allAppointments);
        const allAppointmentsArr: any[] = Array.isArray(allAppointments) ? allAppointments : Object.values(allAppointments);
        // LOGS DETALLADOS DE FILTRADO
        const debugFilter: { id: any; fecha: any; estado: any; motivo: string }[] = [];
        appointments = allAppointmentsArr.filter((app: any) => {
          const rawFecha = app.fecha || '';
          const rawEstado = (app.estado || '').trim();
          const fechaMatch = rawFecha.startsWith(today);
          const estadoMatch = ['Programada', 'Confirmada'].includes(rawEstado);
          if (!fechaMatch || !estadoMatch) {
            debugFilter.push({
              id: app.id,
              fecha: rawFecha,
              estado: rawEstado,
              motivo: !fechaMatch ? 'Fecha no coincide' : 'Estado no válido',
            });
          }
          return fechaMatch && estadoMatch;
        });
        console.log('[Filtro] Citas del día tras filtrar:', appointments);
        if (debugFilter.length > 0) {
          console.log('[Filtro] Citas excluidas:', debugFilter);
        }
      } else {
        // Si sí se obtuvieron, igual loguear motivos de exclusión
        const debugFilter: { id: any; fecha: any; estado: any; motivo: string }[] = [];
        appointments = appointments.filter((app: any) => {
          const rawFecha = app.fecha || '';
          const rawEstado = (app.estado || '').trim();
          const fechaMatch = rawFecha.startsWith(today);
          const estadoMatch = ['Programada', 'Confirmada'].includes(rawEstado);
          if (!fechaMatch || !estadoMatch) {
            debugFilter.push({
              id: app.id,
              fecha: rawFecha,
              estado: rawEstado,
              motivo: !fechaMatch ? 'Fecha no coincide' : 'Estado no válido',
            });
          }
          return fechaMatch && estadoMatch;
        });
        if (debugFilter.length > 0) {
          console.log('[Filtro directo] Citas excluidas:', debugFilter);
        }
      }
      setRawAppointments(appointments); // Guardar para debug
      // Adaptar los datos al formato Appointment
      const appointmentsArr: Appointment[] = appointments
        .filter(app => typeof app === 'object' && app !== null && 'id' in app)
        .map((app) => {
          try {
            return adaptAppointment(app);
          } catch (e) {
            console.log('[Adaptador] Error adaptando cita:', app, e);
            return null;
          }
        })
        .filter((a): a is Appointment => a !== null)
        .sort((a, b) => {
          if (!a || !b) return 0;
          return (a.time || '').localeCompare(b.time || '');
        })
        .slice(0, 6);
      console.log('[Render] processedAppointments:', appointmentsArr);
      setUpcomingAppointments(appointmentsArr);
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error);
      setUpcomingAppointments([]);
      setRawAppointments([]);
    }
  };
  // Función para obtener datos filtrados - completamente rediseñada
  const fetchFilteredData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = buildFilterParams();
      console.log('🔄 Actualizando dashboard con parámetros:', params);

      // Llamadas paralelas a todos los endpoints
      const [
        topServicesResult,
        appointmentsStatusResult,
        completionRatioResult,
        revenueByChannelResult,
        allAppointmentsResult
      ] = await Promise.allSettled([
        apiService.reports.services(),
        apiService.reports.appointmentsStatus(),
        apiService.reports.servicesCompletion(),
        apiService.reports.revenue(),
        apiService.appointments.list()
      ]);
      // Procesar y validar resultados
      const topServicesData = topServicesResult.status === 'fulfilled' ? (Array.isArray(topServicesResult.value) ? topServicesResult.value : Object.values(topServicesResult.value)) : [];
      const appointmentsStatusData = appointmentsStatusResult.status === 'fulfilled' ? (Array.isArray(appointmentsStatusResult.value) ? appointmentsStatusResult.value : Object.values(appointmentsStatusResult.value)) : [];
      const completionRatioData = completionRatioResult.status === 'fulfilled' ? completionRatioResult.value : null;
      const revenueByChannelData = revenueByChannelResult.status === 'fulfilled' ? (Array.isArray(revenueByChannelResult.value) ? revenueByChannelResult.value : Object.values(revenueByChannelResult.value)) : [];
      const allAppointmentsData = allAppointmentsResult.status === 'fulfilled' ? (Array.isArray(allAppointmentsResult.value) ? allAppointmentsResult.value : Object.values(allAppointmentsResult.value)) : [];

      console.log('📊 Datos obtenidos:', {
        topServices: topServicesData?.length || 0,
        appointmentsStatus: appointmentsStatusData?.length || 0,
        completionRatio: completionRatioData,
        revenueByChannel: revenueByChannelData?.length || 0,
        allAppointments: allAppointmentsData?.length || 0
      });

      // Procesar servicios populares con datos filtrados
      const processedPopularServices = processPopularServices(allAppointmentsData);
      setPopularServices(Array.isArray(processedPopularServices) ? processedPopularServices : Object.values(processedPopularServices));

      // Formatear y establecer datos de gráficos
      const formattedTopServices = formatTopServicesData(topServicesData);
      const formattedAppointmentsStatus = formatAppointmentsStatusData(appointmentsStatusData);
      const formattedCompletionRatio = formatCompletionRatioData(completionRatioData);
      const formattedRevenueByChannel = formatRevenueByChannelData(revenueByChannelData);

      setTopServices(formattedTopServices);
      setAppointmentsStatus(formattedAppointmentsStatus);
      setCompletionRatio(formattedCompletionRatio);
      setRevenueByChannel(formattedRevenueByChannel);

      // Calcular estadísticas generales
      const stats = calculateDashboardStats(allAppointmentsData, formattedCompletionRatio);
      setDashboardStats(stats);

      setLastUpdateTime(new Date());
      console.log('? Dashboard actualizado exitosamente');

    } catch (error) {
      console.error('? Error al cargar datos del dashboard:', error);
      setError('Error al cargar los datos del dashboard. Intenta actualizar la p�gina.');
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildFilterParams]);

  // Funciones auxiliares para procesar datos
  const processPopularServices = useCallback((appointments: Appointment[]): PopularService[] => {
    if (!Array.isArray(appointments) || appointments.length === 0) return [];

    const filteredAppointments = filterLocalData(appointments, 'date');
    const serviceCounts: { [key: string]: { count: number; revenue: number } } = {};

    filteredAppointments.forEach(app => {
      if (app.service?.name) {
        const serviceName = app.service.name;
        if (!serviceCounts[serviceName]) {
          serviceCounts[serviceName] = { count: 0, revenue: 0 };
        }
        serviceCounts[serviceName].count += 1;
        serviceCounts[serviceName].revenue += app.service.price || 0;
      }
    });

    return Object.entries(serviceCounts)
      .map(([serviceName, data]) => {
        const serviceDetails = allServices.find(s => s.name === serviceName);
        return {
          id: serviceDetails?.id || Math.random(),
          name: serviceName,
          category: serviceDetails?.category || 'General',
          count: data.count,
          revenue: data.revenue
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filterLocalData, allServices]);

  const formatTopServicesData = useCallback((data: TopServiceRevenue[]): TopServiceRevenue[] => {
    return (Array.isArray(data) ? data : [])
      .map(item => ({
        service: item.service || 'Sin nombre',
        total_revenue: Number(item.total_revenue) || 0,
        count: Number(item.count) || 0
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5);
  }, []);

  const formatAppointmentsStatusData = useCallback((data: AppointmentStatus[]): AppointmentStatus[] => {
    return (Array.isArray(data) ? data : [])
      .map(item => ({
        date: format(new Date(item.date), 'dd/MM'),
        completed: Number(item.completed) || 0,
        cancelled: Number(item.cancelled) || 0,
        scheduled: Number(item.scheduled) || 0,
        total: (Number(item.completed) || 0) + (Number(item.cancelled) || 0) + (Number(item.scheduled) || 0)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, []);

  const formatCompletionRatioData = useCallback((data: unknown): CompletionRatio => {
    const dataObj = data as Record<string, unknown>;
    const completed = Number(dataObj?.completed) || 0;
    const cancelled = Number(dataObj?.cancelled) || 0;
    const total = completed + cancelled;
    const completion_rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completed,
      cancelled,
      total,
      completion_rate
    };
  }, []);

  const formatRevenueByChannelData = useCallback((data: RevenueByChannel[]): RevenueByChannel[] => {
    return (Array.isArray(data) ? data : [])
      .map(item => ({
        channel: item.channel || 'Sin canal',
        total_revenue: Number(item.total_revenue) || 0,
        count: Number(item.count) || 0
      }))
      .filter(item => item.total_revenue > 0)
      .sort((a, b) => b.total_revenue - a.total_revenue);
  }, []);

  const calculateDashboardStats = useCallback((appointments: Appointment[], completionData: CompletionRatio): DashboardStats => {
    const filteredAppointments = filterLocalData(appointments, 'date');

    const totalRevenue = filteredAppointments.reduce((sum, app) =>
      sum + (app.service?.price || 0), 0);

    const totalAppointments = filteredAppointments.length;
    const completionRate = completionData.completion_rate;

    const avgServiceTime = filteredAppointments.reduce((sum, app) =>
      sum + (app.service?.duration || 0), 0) / Math.max(totalAppointments, 1);

    return {
      totalRevenue,
      totalAppointments,
      completionRate,
      averageServiceTime: Math.round(avgServiceTime)
    };
  }, [filterLocalData]);

  // Effects actualizados
  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    fetchUpcomingAppointments();
  }, []);

  useEffect(() => {
    if (allServices.length > 0) {
      fetchFilteredData();
    }
  }, [filters, allServices, fetchFilteredData]);

  // Socket.IO - Escuchar actualizaciones en tiempo real
  const { isConnected, subscribeToEvent } = useSocket();

  useEffect(() => {
    const unsubscribeStatsUpdate = subscribeToEvent?.('dashboard_stats_updated', (data: unknown) => {
      console.log('?? Estad�sticas actualizadas en tiempo real:', data);
      // Refrescar datos del dashboard
      fetchFilteredData();
    });

    return () => {
      unsubscribeStatsUpdate?.();
    };
  }, [subscribeToEvent, fetchFilteredData]);

  // Handlers para filtros completamente rediseñados
  const handleDateRangeChange = useCallback((newDateRange: DateRange | undefined) => {
    console.log('📅 Rango de fechas cambiado:', newDateRange);
    setFilters(prev => ({
      ...prev,
      dateRange: newDateRange
    }));
    setIsCalendarOpen(false);
    toast.success('Rango de fechas actualizado');
  }, []);

  const handlePeriodChange = useCallback((newPeriod: string) => {
    console.log('❰ Período cambiado:', newPeriod);
    setFilters(prev => ({
      ...prev,
      period: newPeriod as 'daily' | 'weekly' | 'monthly' | 'yearly'
    }));
    toast.success(`Período cambiado a ${newPeriod}`);
  }, []);

  const handleChannelChange = useCallback((newChannel: string) => {
    console.log('📱 Canal cambiado:', newChannel);
    setFilters(prev => ({
      ...prev,
      channel: newChannel
    }));
    toast.success(`Canal cambiado a ${newChannel === 'all' ? 'todos' : newChannel}`);
  }, []);
  const handleServiceChange = useCallback((newService: string) => {
    console.log('🔧 Servicio cambiado:', newService);
    setFilters(prev => ({
      ...prev,
      service: newService
    }));
    toast.success(`Servicio cambiado a ${newService === 'all' ? 'todos' : newService}`);
  }, []);

  const handleCategoryChange = useCallback((newCategory: string) => {
    console.log('📂 Categoría cambiada:', newCategory);
    setFilters(prev => ({
      ...prev,
      category: newCategory
    }));
    toast.success(`Categoría cambiada a ${newCategory === 'all' ? 'todas' : newCategory}`);
  }, []);

  const handleStatusChange = useCallback((newStatus: string) => {
    console.log('📋 Estado cambiado:', newStatus);
    setFilters(prev => ({
      ...prev,
      status: newStatus
    }));
    toast.success(`Estado cambiado a ${newStatus === 'all' ? 'todos' : newStatus}`);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFilteredData();
    fetchUpcomingAppointments();
    setLastUpdateTime(new Date());
    toast.success('Datos actualizados correctamente');
    setTimeout(() => setRefreshing(false), 1000);
  }, [fetchFilteredData]);

  const handleQuickDateFilter = useCallback((days: number) => {
    const today = new Date();
    const fromDate = days === 0 ? today : subDays(today, days);

    setFilters(prev => ({
      ...prev,
      dateRange: {
        from: fromDate,
        to: today
      }
    }));

    const periodName = days === 0 ? 'Hoy' :
                     days === 7 ? 'Última semana' :
                     days === 30 ? 'Último mes' :
                     `Últimos ${days} días`;

    toast.success(`Filtro aplicado: ${periodName}`);
  }, []);
  const resetFilters = useCallback(() => {
    setFilters({
      dateRange: {
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      },
      period: 'monthly',
      channel: 'all',
      service: 'all',
      category: 'all',
      status: 'all'
    });
    toast.success('Filtros reiniciados');
  }, []);
  // Helper functions mejoradas
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

  const formatDate = (date: Date, formatStr: string = 'dd/MM/yyyy') => {
    return format(date, formatStr, { locale: es });
  };
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.channel !== 'all') count++;
    if (filters.service !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.period !== 'monthly') count++;
    return count;
  };

  const maxServiceCount = popularServices.length > 0 ? Math.max(...popularServices.map(s => s.count)) : 0;

  // Obtener categorías únicas de servicios
  const getUniqueCategories = () => {
    const categories = allServices.map(service => service.category).filter(Boolean);
    return [...new Set(categories)].sort();
  };

  // Configuraciones de gráficos
  const topServicesChartConfig = {
    total_revenue: { label: "Ingresos", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;

  const completionRadialData = [
    { name: "Completadas", value: completionRatio.completed, fill: "hsl(var(--chart-1))" },
    { name: "Canceladas", value: completionRatio.cancelled, fill: "hsl(var(--chart-2))" },
  ];

  const appointmentsLineConfig = {
    completed: { label: "Completadas", color: "hsl(var(--chart-1))" },
    cancelled: { label: "Canceladas", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  const revenueByChannelConfig = {
    total_revenue: { label: "Ingresos", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;

  if (loading && topServices.length === 0) {
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
      {/* FILTRO GLOBAL MEJORADO */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Dashboard
                {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              </CardTitle>              <CardDescription>
                Análisis global del negocio con filtros avanzados.
                {filters.dateRange?.from && filters.dateRange?.to && (
                  <span className="block text-xs mt-1 text-gray-500">
                    Período: {formatDate(filters.dateRange.from)} - {formatDate(filters.dateRange.to)}
                  </span>
                )}                {getActiveFilterCount() > 0 && (
                  <span className="block text-xs mt-1 text-blue-600">
                    {getActiveFilterCount()} filtro{getActiveFilterCount() > 1 ? 's' : ''} activo{getActiveFilterCount() > 1 ? 's' : ''}:
                    {filters.channel !== 'all' && ` Canal: ${filters.channel}`}
                    {filters.service !== 'all' && ` Servicio: ${filters.service}`}
                    {filters.category !== 'all' && ` Categoría: ${filters.category}`}
                    {filters.status !== 'all' && ` Estado: ${filters.status}`}
                  </span>
                )}
                <span className="block text-xs mt-1 text-gray-400">
                  Actualizado: {formatDate(lastUpdateTime, "HH:mm:ss")}
                </span>
              </CardDescription>
            </div>            <div className="flex flex-wrap gap-2">
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

              {/* Filtros rápidos de fecha */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter(0)}
                  className="bg-white hover:bg-gray-50 text-xs px-2"
                >
                  Hoy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter(7)}
                  className="bg-white hover:bg-gray-50 text-xs px-2"
                >
                  7d
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter(30)}
                  className="bg-white hover:bg-gray-50 text-xs px-2"
                >
                  30d
                </Button>
              </div>

              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      {filters.dateRange?.from ? formatDate(filters.dateRange.from, "dd/MM/yy") : "Seleccionar"}
                      {filters.dateRange?.to ? ` - ${formatDate(filters.dateRange.to, "dd/MM/yy")}` : ""}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-white shadow-xl border rounded-lg"
                  align="end"
                  side="bottom"
                  sideOffset={8}
                  avoidCollisions={true}
                  collisionPadding={20}
                  style={{
                    zIndex: 10000,
                    position: 'fixed'
                  }}
                >
                  <div className="p-0">
                    <Calendar
                      mode="range"
                      selected={filters.dateRange}
                      onSelect={handleDateRangeChange}
                      initialFocus
                      className="rounded-lg border-0"
                      locale={es}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={filters.period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[120px] bg-white hover:bg-gray-50">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent
                  className="z-[10000] bg-white shadow-lg border rounded-lg"
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={4}
                >
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.channel} onValueChange={handleChannelChange}>
                <SelectTrigger className="w-[140px] bg-white hover:bg-gray-50">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent
                  className="z-[10000] bg-white shadow-lg border rounded-lg"
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={4}
                >
                  <SelectItem value="all">Todos los canales</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="phone">Teléfono</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-[150px] bg-white hover:bg-gray-50">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent
                  className="z-[10000] bg-white shadow-lg border rounded-lg"
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={4}
                >
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {getUniqueCategories().map((category, idx) => (
                    <SelectItem key={`cat-${category}-${idx}`} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.service} onValueChange={handleServiceChange}>
                <SelectTrigger className="w-[180px] bg-white hover:bg-gray-50">
                  <SelectValue placeholder="Servicio" />
                </SelectTrigger>
                <SelectContent
                  className="z-[10000] bg-white shadow-lg border rounded-lg"
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={4}
                >
                  <SelectItem value="all">Todos los servicios</SelectItem>
                  {allServices.map(s => (
                    <SelectItem key={`service-${s.id}`} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[150px] bg-white hover:bg-gray-50">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent
                  className="z-[10000] bg-white shadow-lg border rounded-lg"
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={4}
                >
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Programada">Programada</SelectItem>
                  <SelectItem value="Confirmada">Confirmada</SelectItem>
                  <SelectItem value="Completada">Completada</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>

              {getActiveFilterCount() > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Limpiar ({getActiveFilterCount()})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Mostrar error si existe */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="mb-4" />
      <StatsCards />

      {/* Mostrar próximas citas */}
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
            {/* Mostrar datos crudas de las citas antes de adaptar y filtrar */}
            <div style={{marginBottom: 8}}>
              <strong>Debug citas crudas hoy (sin adaptar):</strong>
              <span style={{marginLeft:8, color:'#888'}}>Total: {rawAppointments.length}</span>
              <pre style={{fontSize:10, background:'#f3f4f6', color:'#333', padding:8, borderRadius:4, maxHeight:200, overflow:'auto'}}>
                {JSON.stringify(rawAppointments, null, 2)}
              </pre>
            </div>
            {/* Mostrar datos adaptados y filtrados */}
            <div style={{marginBottom: 8}}>
              <strong>Debug citas adaptadas (upcomingAppointments):</strong>
              <span style={{marginLeft:8, color:'#888'}}>Total: {upcomingAppointments.length}</span>
              <pre style={{fontSize:10, background:'#f9f9f9', color:'#333', padding:8, borderRadius:4, maxHeight:200, overflow:'auto'}}>
                {JSON.stringify(upcomingAppointments, null, 2)}
              </pre>
            </div>
            {/* Render normal de próximas citas */}
            {upcomingAppointments.length > 0 ? (
              <ul>
                {upcomingAppointments.map((app, idx) => (
                  <li key={`upcoming-${app.id ?? `idx-${idx}`}`}
                      className="py-2 border-b last:border-b-0">
                    <div className="flex flex-col">
                      <span className="font-semibold">{app.service?.name} - {app.client?.name}</span>
                      <span className="text-xs text-gray-500">{formatTime(app.time)} | {app.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-gray-400">No hay citas próximas.</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Servicios Populares
            </CardTitle>
            <CardDescription>Los más solicitados en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            {popularServices.length > 0 ? (
              <div className="space-y-4">
                {popularServices.map(service => (
                  <div key={service.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{service.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{service.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${maxServiceCount > 0 ? (service.count / maxServiceCount) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{service.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay datos de servicios populares para el período seleccionado.</p>
            )}
          </CardContent>
        </Card>
      </div>      {/* GRÝFICOS MEJORADOS CON DATOS REALES Y FILTROS FUNCIONALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Gráfico de barras: Top servicios por ingresos */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Servicios por Ingresos</CardTitle>
            <CardDescription className="text-sm">Los 5 servicios con más ingresos en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            {topServices.length > 0 ? (
              <ChartContainer config={topServicesChartConfig}>
                <BarChart data={topServices} height={220} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="service"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#666' }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis hide />
                  <ChartTooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium text-sm">{label}</p>
                            <p className="text-blue-600 font-semibold">
                              {formatCurrency(Number(payload[0].value))}
                            </p>
                            {payload[0].payload.count && (
                              <p className="text-gray-600 text-xs">{payload[0].payload.count} citas</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="total_revenue"
                    fill="url(#topServicesGradient)"
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="topServicesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No hay datos disponibles</p>
                <p className="text-xs text-gray-400 mt-1">Selecciona un rango de fechas diferente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico radial: ratio completadas/canceladas */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="items-center pb-3">
            <CardTitle className="text-base">Ratio de Citas</CardTitle>
            <CardDescription className="text-sm">Completadas vs Canceladas</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {(completionRatio.completed > 0 || completionRatio.cancelled > 0) ? (
              <ChartContainer config={{}} className="mx-auto aspect-square max-h-[220px]">
                <RadialBarChart data={completionRadialData} innerRadius={50} outerRadius={90}>
                  <PolarGrid gridType="circle" radialLines={false} stroke="none" />
                  <RadialBar
                    dataKey="value"
                    background={{ fill: '#f3f4f6' }}
                    cornerRadius={10}
                  />
                  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                    <Label content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        const total = completionRatio.completed + completionRatio.cancelled;
                        const completedPercentage = total > 0 ? Math.round((completionRatio.completed / total) * 100) : 0;
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                              {completedPercentage}%
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 16} className="fill-muted-foreground text-xs">
                              Completadas
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 32} className="fill-muted-foreground text-xs">
                              {total} citas total
                            </tspan>
                          </text>
                        );
                      }
                    }} />
                  </PolarRadiusAxis>
                </RadialBarChart>
              </ChartContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                <CalendarIcon className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No hay citas registradas</p>
                <p className="text-xs text-gray-400 mt-1">En el período seleccionado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de líneas: citas completadas/canceladas por día */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Evolución de Citas</CardTitle>
            <CardDescription className="text-sm">Completadas y canceladas por día</CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentsStatus.length > 0 ? (
              <ChartContainer config={appointmentsLineConfig} className="h-[220px] w-full">
                <LineChart data={appointmentsStatus} margin={{ left: 12, right: 12, top: 10, bottom: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tick={{ fontSize: 10, fill: '#666' }}
                  />
                  <YAxis hide />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium text-sm mb-2">{label}</p>
                            {payload.map((item, index) => (
                              <p key={index} className="text-sm flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />
                                {item.dataKey === 'completed' ? 'Completadas' : 'Canceladas'}: {item.value}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    dataKey="completed"
                    type="monotone"
                    stroke="rgb(34, 197, 94)"
                    strokeWidth={3}
                    dot={{ fill: 'rgb(34, 197, 94)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'rgb(34, 197, 94)', strokeWidth: 2, fill: 'white' }}
                  />
                  <Line
                    dataKey="cancelled"
                    type="monotone"
                    stroke="rgb(239, 68, 68)"
                    strokeWidth={3}
                    dot={{ fill: 'rgb(239, 68, 68)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'rgb(239, 68, 68)', strokeWidth: 2, fill: 'white' }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No hay datos de evolución</p>
                <p className="text-xs text-gray-400 mt-1">Cambia el rango de fechas para ver más datos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de barras: ingresos por canal */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ingresos por Canal</CardTitle>
            <CardDescription className="text-sm">Comparación de ingresos por canal de venta</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByChannel.length > 0 ? (
              <ChartContainer config={revenueByChannelConfig}>
                <BarChart data={revenueByChannel} height={220} margin={{ left: 12, right: 12, top: 10, bottom: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="channel"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#666' }}
                  />
                  <YAxis hide />
                  <ChartTooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium text-sm capitalize">{label}</p>
                            <p className="text-blue-600 font-semibold">
                              {formatCurrency(Number(payload[0].value))}
                            </p>
                            {payload[0].payload.count && (
                              <p className="text-gray-600 text-xs">{payload[0].payload.count} citas</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {revenueByChannel.map((item, index) => {
                    const colors = [
                      'rgb(59, 130, 246)',    // Blue
                      'rgb(34, 197, 94)',     // Green
                      'rgb(168, 85, 247)',    // Purple
                      'rgb(249, 115, 22)',    // Orange
                      'rgb(236, 72, 153)'     // Pink
                    ];
                    return (
                      <Bar
                        key={item.channel}
                        dataKey="total_revenue"
                        fill={colors[index % colors.length]}
                        radius={[4, 4, 0, 0]}
                      />
                    );
                  })}
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                <DollarSign className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No hay ingresos registrados</p>
                <p className="text-xs text-gray-400 mt-1">Por canal en el período seleccionado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GRÝFICOS ADICIONALES PARA CATEGORÝAS Y ESTADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Gráfico de servicios por categoría */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Servicios por Categoría</CardTitle>
            <CardDescription className="text-sm">Distribución de citas por categoría de servicio</CardDescription>
          </CardHeader>
          <CardContent>
            {popularServices.length > 0 ? (
              <div className="space-y-4">
                {getUniqueCategories().map((category, idx) => {
                  const categoryServices = popularServices.filter(s => s.category === category);
                  const totalCount = categoryServices.reduce((sum, s) => sum + s.count, 0);
                  const maxCount = Math.max(...popularServices.map(s => s.count));

                  return (
                    <div key={`cat-${category}-${idx}`} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{category}</span>
                        <span className="text-sm text-gray-500">{totalCount} citas</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full">
                        <div
                          className="h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                          style={{ width: `${maxCount > 0 ? (totalCount / maxCount) * 100 : 0}%` }}
                        ></div>
                      </div>
                      {categoryServices.length > 0 && (
                        <div className="text-xs text-gray-500 pl-2">
                          {categoryServices.map(s => s.name).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                <Filter className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No hay datos de categorías</p>
                <p className="text-xs text-gray-400 mt-1">Ajusta los filtros para ver datos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de estados de citas */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estados de Citas</CardTitle>
            <CardDescription className="text-sm">Distribución actual de estados de citas</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {['Programada', 'Confirmada', 'En progreso', 'Completada', 'Cancelada'].map(status => {
                  const statusCount = upcomingAppointments.filter(app => app.status === status).length;
                  const percentage = upcomingAppointments.length > 0 ? (statusCount / upcomingAppointments.length) * 100 : 0;

                  const statusLabels = {
                    'Programada': 'Programadas',
                    'Confirmada': 'Confirmadas',
                    'En progreso': 'En progreso',
                    'Completada': 'Completadas',
                    'Cancelada': 'Canceladas'
                  };

                  const statusColors = {
                    'Programada': 'bg-yellow-500',
                    'Confirmada': 'bg-blue-500',
                    'En progreso': 'bg-orange-500',
                    'Completada': 'bg-green-500',
                    'Cancelada': 'bg-red-500'
                  };

                  return statusCount > 0 ? (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${statusColors[status]}`}></div>
                        <span className="text-sm font-medium">{statusLabels[status]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${statusColors[status]}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-8 text-right">{statusCount}</span>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No hay citas para mostrar</p>
                <p className="text-xs text-gray-400 mt-1">Los estados se mostrarán cuando haya citas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardContent;
