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
  id?: number;
  date: string;
  time: string;
  status: 'Programada' | 'Confirmada' | 'Completada' | 'Cancelada' | 'En progreso' | 'Pendiente' | string;
  channel?: 'online' | 'presencial' | 'whatsapp' | 'phone' | string;
  notes?: string;
  client?: {
    id?: number;
    name?: string;
    phone?: string;
    email?: string;
  };
  service?: {
    id?: number;
    name?: string;
    category?: string;
    duration?: number;
    price?: number;
  };
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

  // Eliminar todos los filtros y lógica relacionada
  // Solo obtener y mostrar los datos tal como vienen del API

  // Obtener todos los servicios (si se usan en la UI)
  const fetchServices = async () => {
    try {
      const services = await apiService.services.list();
      setAllServices(Array.isArray(services) ? services : Object.values(services));
    } catch (error) {
      setAllServices([]);
    }
  };

  // Adaptador para transformar la cita del backend al formato Appointment
  function adaptAppointment(raw: any): Appointment {
    if (!raw || typeof raw !== 'object') return {} as Appointment;
    return {
      id: raw.id ?? raw._id ?? 0,
      date: raw.fecha ?? raw.date ?? '',
      time: raw.hora ?? raw.time ?? '',
      status: raw.estado ?? raw.status ?? '',
      notes: raw.notas ?? raw.notes ?? '',
      channel: (raw.canal ?? raw.channel ?? '').toLowerCase(),
      client: raw.cliente ? {
        id: raw.cliente.id ?? 0,
        name: raw.cliente.nombre_completo ?? raw.cliente.nombres ?? '',
        phone: raw.cliente.telefono ?? '',
        email: raw.cliente.email ?? ''
      } : undefined,
      service: raw.servicio ? {
        id: raw.servicio.id ?? 0,
        name: raw.servicio.nombre ?? '',
        duration: Number(raw.servicio.duracion) || 0,
        price: Number(raw.servicio.precio_base ?? raw.servicio.precio) || 0,
        category: raw.servicio.categoria ?? 'General'
      } : undefined
    };
  }

  // Obtener próximas citas directamente del API
  const fetchUpcomingAppointments = async () => {
    try {
      setLoading(true);
      const allAppointments = await apiService.appointments.list();
      let allAppointmentsArr: any[] = Array.isArray(allAppointments) ? allAppointments : Object.values(allAppointments);
      if (allAppointmentsArr.length >= 2 && allAppointmentsArr[0] === true && Array.isArray(allAppointmentsArr[1])) {
        allAppointmentsArr = allAppointmentsArr[1];
      }
      allAppointmentsArr = allAppointmentsArr.filter(item => typeof item === 'object' && 'id' in item);
      setUpcomingAppointments(allAppointmentsArr.map(adaptAppointment));
    } catch (error) {
      setUpcomingAppointments([]);
      setError('Error al obtener próximas citas');
    } finally {
      setLoading(false);
    }
  };

  // Obtener servicios populares directamente del API (si existe endpoint)
  const fetchPopularServices = async () => {
    try {
      setLoading(true);
      const response = await apiService.reports.services();
      console.log('[DashboardContent] Servicios populares response:', response);
      setPopularServices(Array.isArray(response) ? response : Object.values(response));
    } catch (error) {
      console.error('[DashboardContent] Error al obtener servicios populares:', error);
      setPopularServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchUpcomingAppointments();
    fetchPopularServices();
  }, []);

  // Estado y lógica para el buscador de citas próximas
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const filteredAppointments = useMemo(() => {
    if (!searchTerm.trim()) return upcomingAppointments;
    const term = searchTerm.toLowerCase();
    return upcomingAppointments.filter(app => {
      const client = app.client?.name?.toLowerCase() || "";
      const service = app.service?.name?.toLowerCase() || "";
      const status = app.status?.toLowerCase() || "";
      return (
        client.includes(term) ||
        service.includes(term) ||
        status.includes(term)
      );
    });
  }, [searchTerm, upcomingAppointments]);

  const filteredAppointmentsAdv = useMemo(() => {
    return upcomingAppointments.filter(app => {
      const statusMatch = statusFilter ? app.status === statusFilter : true;
      const channelMatch = channelFilter ? app.channel === channelFilter : true;
      return statusMatch && channelMatch;
    });
  }, [upcomingAppointments, statusFilter, channelFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <span className="animate-spin h-6 w-6 mr-2 border-4 border-blue-200 border-t-blue-600 rounded-full" />
              <span>Cargando...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            {/* Filtro avanzado */}
            <div className="mb-4 flex flex-col md:flex-row gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente, servicio o estado..."
                className="w-full md:w-1/3 px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
              />
              <select
                className="w-full md:w-1/4 px-3 py-2 border border-gray-200 rounded-md text-sm"
                onChange={e => setStatusFilter(e.target.value)}
                value={statusFilter}
              >
                <option value="">Todos los estados</option>
                <option value="Programada">Programada</option>
                <option value="Confirmada">Confirmada</option>
                <option value="Completada">Completada</option>
                <option value="Cancelada">Cancelada</option>
                <option value="En progreso">En progreso</option>
                <option value="Pendiente">Pendiente</option>
              </select>
              <select
                className="w-full md:w-1/4 px-3 py-2 border border-gray-200 rounded-md text-sm"
                onChange={e => setChannelFilter(e.target.value)}
                value={channelFilter}
              >
                <option value="">Todos los canales</option>
                <option value="online">Online</option>
                <option value="presencial">Presencial</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Teléfono</option>
              </select>
            </div>
            {/* Render moderno de próximas citas con scroll y tarjetas compactas */}
            <div className="max-h-96 overflow-y-auto pr-2">
              {filteredAppointmentsAdv.length > 0 ? (
                <div className="space-y-2">
                  {filteredAppointmentsAdv.map((app, idx) => (
                    <div
                      key={`upcoming-${app.id ?? `idx-${idx}`}`}
                      className="rounded-lg border border-gray-100 bg-white shadow p-3 flex flex-col gap-1 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-blue-700 text-xs">
                          {app.service?.name || "Sin servicio"}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-700">
                          {app.client?.name || "Sin nombre"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {app.time}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium
                          ${app.status === "Programada" ? "bg-yellow-100 text-yellow-800" : ""}
                          ${app.status === "Confirmada" ? "bg-blue-100 text-blue-800" : ""}
                          ${app.status === "Completada" ? "bg-green-100 text-green-800" : ""}
                          ${app.status === "Cancelada" ? "bg-red-100 text-red-800" : ""}
                          ${app.status === "En progreso" ? "bg-orange-100 text-orange-800" : ""}
                          ${app.status === "Pendiente" ? "bg-gray-100 text-gray-800" : ""}
                        `}>
                          {app.status || "Sin estado"}
                        </span>
                        {app.channel && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize
                            ${app.channel === "online" ? "bg-blue-50 text-blue-700" : ""}
                            ${app.channel === "presencial" ? "bg-green-50 text-green-700" : ""}
                            ${app.channel === "whatsapp" ? "bg-green-100 text-green-800" : ""}
                            ${app.channel === "phone" ? "bg-purple-100 text-purple-800" : ""}
                          `}>
                            {app.channel}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400">No hay citas próximas.</span>
              )}
            </div>
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
                {popularServices.map((service: any) => (
                  <div key={service.id} className="flex flex-col gap-1 border-b last:border-b-0 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold text-blue-700">{service.nombre || service.name || 'Sin nombre'}</span>
                      {service.categoria || service.category ? (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{service.categoria || service.category}</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-1">
                      {service.appointments_count !== undefined && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Citas: {service.appointments_count}</span>
                      )}
                      {service.completed_count !== undefined && (
                        <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">Completadas: {service.completed_count}</span>
                      )}
                      {service.precio !== undefined && (
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">Precio: ${service.precio}</span>
                      )}
                      {service.price !== undefined && !service.precio && (
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">Precio: ${service.price}</span>
                      )}
                      {service.revenue && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Ingresos: ${service.revenue}</span>
                      )}
                      {service.duracion !== undefined && (
                        <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded">Duración: {service.duracion} min</span>
                      )}
                      {service.duration !== undefined && service.duracion === undefined && (
                        <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded">Duración: {service.duration} min</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay datos de servicios populares.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardContent;
