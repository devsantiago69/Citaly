import { useState, useEffect, useMemo } from "react";
import { Search, MoreHorizontal, Clock, Check, X, RefreshCw, CheckCircle, AlertCircle, User, BriefcaseMedical, DollarSign, Filter, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useSocket } from "../../hooks/useSocket";
import { apiService } from "@/config/api-v2";
import { DateRange } from "react-day-picker";

// Interfaces unificadas desde AppointmentCalendar
interface AppointmentClient {
  id: number;
  name: string;
  phone: string;
  email: string;
}

interface AppointmentService {
  id: number;
  name: string;
  duration: number;
  price: number;
  category: string;
}

interface AppointmentStaff {
  id: number;
  name: string;
}

interface Appointment {
  id: number;
  company_id: number;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'confirmed' | 'pending' | 'in-progress';
  client: AppointmentClient;
  service: AppointmentService;
  staff: AppointmentStaff | null;
  notes?: string;
  google_event_id?: string;
}

interface AppointmentListProps {
  appointments?: Appointment[];
  isLoading?: boolean;
}

const AppointmentList = ({ appointments: propAppointments, isLoading: propIsLoading }: AppointmentListProps = {}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>(propAppointments || []);
  const [isLoading, setIsLoading] = useState(propIsLoading || false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const { subscribeToEvent } = useSocket();

  // Fetch appointments if not provided as props
  useEffect(() => {
    if (!propAppointments) {
      fetchAppointments();
    }
  }, [propAppointments]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const { apiService } = await import('@/config/api-v2');
      const data = await apiService.appointments.list();
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Error al cargar las citas');
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueServices = useMemo(() => {
    const serviceNames = appointments.map(apt => apt.service.name);
    return ["all", ...Array.from(new Set(serviceNames))];
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter(apt => {
        // Filtro por estado
        if (statusFilter !== "all" && apt.status !== statusFilter) return false;
        // Filtro por servicio
        if (serviceFilter !== "all" && apt.service.name !== serviceFilter) return false;
        // Filtro por rango de fechas
        if (dateRange?.from && new Date(apt.date) < dateRange.from) return false;
        if (dateRange?.to && new Date(apt.date) > dateRange.to) return false;
        // Filtro por término de búsqueda
        const searchLower = searchTerm.toLowerCase();
        return (
          apt.client?.name?.toLowerCase().includes(searchLower) ||
          apt.service?.name?.toLowerCase().includes(searchLower) ||
          apt.client?.phone?.includes(searchTerm)
        );
      });
  }, [appointments, searchTerm, statusFilter, dateRange, serviceFilter]);

  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const completed = filteredAppointments.filter(a => a.status === 'completed').length;
    const pending = filteredAppointments.filter(a => ['pending', 'scheduled', 'confirmed'].includes(a.status)).length;
    const cancelled = filteredAppointments.filter(a => a.status === 'cancelled').length;
    const totalRevenue = filteredAppointments
      .filter(a => a.status === 'completed')
      .reduce((sum, apt) => sum + (Number(apt.service?.price) || 0), 0);

    return { total, completed, pending, cancelled, totalRevenue };
  }, [filteredAppointments]);

  const getStatusConfig = (status: string) => {
    const configs = {
      "confirmed": {
        badge: <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 capitalize">Confirmada</Badge>,
        bgColor: "bg-purple-50 border-purple-200"
      },
      "pending": {
        badge: <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 capitalize">Pendiente</Badge>,
        bgColor: "bg-yellow-50 border-yellow-200"
      },
      "in-progress": {
        badge: <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 capitalize">En curso</Badge>,
        bgColor: "bg-blue-50 border-blue-200"
      },
      "completed": {
        badge: <Badge className="bg-green-100 text-green-800 hover:bg-green-100 capitalize">Completada</Badge>,
        bgColor: "bg-green-50 border-green-200"
      },
      "cancelled": {
        badge: <Badge className="bg-red-100 text-red-800 hover:bg-red-100 capitalize">Cancelada</Badge>,
        bgColor: "bg-red-50 border-red-200"
      },
      "scheduled": {
        badge: <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 capitalize">Programada</Badge>,
        bgColor: "bg-gray-50 border-gray-200"
      }
    };

    return configs[status as keyof typeof configs] || {
      badge: <Badge variant="secondary" className="capitalize">{status}</Badge>,
      bgColor: "bg-gray-50 border-gray-200"
    };
  };

  const handleAction = async (action: 'confirm' | 'complete' | 'cancel', appointmentId: number) => {
    const statusMap = {
      confirm: 'confirmed',
      complete: 'completed',
      cancel: 'cancelled',
    };
    const newStatus = statusMap[action];

    if (!newStatus) {
      toast.error(`Acción inválida: ${action}`);
      return;
    }

    try {
      const { apiService } = await import('@/config/api-v2');
      const updatedAppointment = await apiService.appointments.update(appointmentId.toString(), { status: newStatus });

      setAppointments(prevAppointments =>
        prevAppointments.map(apt =>
          apt.id === appointmentId ? { ...apt, status: updatedAppointment.status || newStatus } : apt
        )
      );
      toast.success(`Cita actualizada a "${newStatus}".`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('No se pudo conectar con el servidor para actualizar la cita.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  // Socket.IO - Escuchar actualizaciones en tiempo real
  useEffect(() => {
    const unsubscribeAppointmentCreated = subscribeToEvent?.('appointment_created', (data: unknown) => {
      console.log('?? Nueva cita creada en tiempo real:', data);
      toast.success('Nueva cita creada');
      // Refrescar la lista de citas
      fetchAppointments();
    });

    const unsubscribeAppointmentUpdated = subscribeToEvent?.('appointment_updated', (data: unknown) => {
      console.log('?? Cita actualizada en tiempo real:', data);
      toast.info('Cita actualizada');
      // Refrescar la lista de citas
      fetchAppointments();
    });

    const unsubscribeAppointmentDeleted = subscribeToEvent?.('appointment_deleted', (data: unknown) => {
      console.log('??? Cita eliminada en tiempo real:', data);
      toast.error('Cita eliminada');
      // Refrescar la lista de citas
      fetchAppointments();
    });

    return () => {
      unsubscribeAppointmentCreated?.();
      unsubscribeAppointmentUpdated?.();
      unsubscribeAppointmentDeleted?.();
    };
  }, [subscribeToEvent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 text-gray-500 animate-spin" />
        <p className="ml-4 text-gray-600">Cargando citas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Citas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ingresos (Completadas)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar por cliente, servicio o teléfono..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>Estado: {statusFilter === 'all' ? 'Todos' : statusFilter}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                {['all', 'scheduled', 'completed', 'cancelled', 'confirmed', 'pending', 'in-progress'].map(status => (
                  <DropdownMenuItem key={status} onSelect={() => setStatusFilter(status)}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Seleccionar fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

          </div>
        </CardContent>
      </Card>

      {filteredAppointments.length > 0 ? (
        <div className="space-y-4">
          {filteredAppointments.map((apt) => {
            const statusConfig = getStatusConfig(apt.status);
            return (
              <Card key={apt.id} className={`transition-all hover:shadow-md ${statusConfig.bgColor}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-grow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {apt.client.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-lg">{apt.client.name}</h4>
                          <p className="text-sm text-gray-600">{apt.service.name}</p>
                        </div>
                      </div>
                      {statusConfig.badge}
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>{new Date(apt.date + 'T00:00:00-05:00').toLocaleDateString('es-ES', { timeZone: 'America/Bogota', day: 'numeric', month: 'long' })} a las {apt.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <BriefcaseMedical className="h-4 w-4 text-gray-500" />
                        <span>{apt.service.duration} min</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span>{formatCurrency(apt.service.price)}</span>
                      </div>
                      {apt.staff && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>{apt.staff.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAction('confirm', apt.id)}>
                        <Check className="mr-2 h-4 w-4" /> Confirmar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('complete', apt.id)}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Marcar como completada
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => handleAction('cancel', apt.id)}>
                        <X className="mr-2 h-4 w-4" /> Cancelar cita
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>No se encontraron citas que coincidan con los filtros o la búsqueda.</p>
        </div>
      )}
    </div>
  );
};

export default AppointmentList;
