import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  DollarSign, 
  Users, 
  Sparkles,
  User,
  BriefcaseMedical,
  X,
  ClipboardList,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/config/api";
import DateRangeFilter from "@/components/DateRangeFilter";
import AppointmentList from "./AppointmentList";

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

interface DayStats {
  total_appointments: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  confirmed: number;
  pending: number;
  in_progress: number;
  total_revenue: number;
}

// Helper function for date formatting en zona horaria Colombia
const formatDateToString = (date: Date): string => {
  // Usar Intl.DateTimeFormat para obtener la fecha en zona horaria Colombia
  const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' };
  const [month, day, year] = new Intl.DateTimeFormat('en-US', options)
    .format(date)
    .split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const AppointmentCalendar = () => {
  // Usar la fecha de Colombia para el día actual
  const getColombiaToday = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' };
    const [month, day, year] = new Intl.DateTimeFormat('en-US', options)
      .format(now)
      .split('/');
    return new Date(`${year}-${month}-${day}T00:00:00-05:00`);
  };

  const [currentDate, setCurrentDate] = useState(getColombiaToday());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [dayStats, setDayStats] = useState<Record<string, DayStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState('today');
  const [dateRange, setDateRange] = useState({ 
    start: formatDateToString(getColombiaToday()), 
    end: formatDateToString(getColombiaToday()) 
  });
  // Filtros avanzados
  const [clientFilter, setClientFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');

  // Obtener listas únicas para selects
  const uniqueClients = Array.from(new Set(appointments.map(a => a.client.name)));
  const uniqueServices = Array.from(new Set(appointments.map(a => a.service.name)));
  const uniqueStaff = Array.from(new Set(appointments.filter(a => a.staff).map(a => a.staff?.name)));

  // Función para limpiar filtros
  const clearFilters = () => {
    setClientFilter('all');
    setServiceFilter('all');
    setStaffFilter('all');
  };

  const getDateRange = (range: string): { start: Date; end: Date } => {
    const today = getColombiaToday();
    switch (range) {
      case 'today':
        return { start: today, end: today };
      case 'week': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return { start: startOfWeek, end: endOfWeek };
      }
      case 'month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: startOfMonth, end: endOfMonth };
      }
      case 'quarter': {
        const startOfQuarter = new Date(today);
        startOfQuarter.setMonth(today.getMonth() - 3);
        return { start: startOfQuarter, end: today };
      }
      default:
        return { start: today, end: today };
    }
  };

  const handleRangeChange = (range: string, dates: { start: string; end: string }) => {
    console.log('Range changed:', { range, dates });
    setSelectedRange(range);
    setDateRange(dates);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Usar el rango de fechas seleccionado
        const start_date = dateRange.start;
        const end_date = dateRange.end;
        
        console.log('Fetching appointments for dates:', { 
          start_date, 
          end_date,
          selectedRange 
        });
        
        // Obtener citas y estadísticas
        const [appointmentsData, statsData] = await Promise.all([
          api.get('/api/appointments', {
            params: {
              start_date,
              end_date
            }
          }),
          api.get('/api/appointments/stats', {
            params: {
              start_date,
              end_date
            }
          })
        ]);
        
        console.log('Received appointments:', appointmentsData);
        
        // Filtrar las citas según el rango seleccionado y los filtros avanzados
        const filteredData = appointmentsData.filter(apt => {
          const inDateRange = apt.date >= start_date && apt.date <= end_date;
          const clientMatch = clientFilter === 'all' || !clientFilter ? true : apt.client.name === clientFilter;
          const serviceMatch = serviceFilter === 'all' || !serviceFilter ? true : apt.service.name === serviceFilter;
          const staffMatch = staffFilter === 'all' || !staffFilter ? true : (apt.staff && apt.staff.name === staffFilter);
          return inDateRange && clientMatch && serviceMatch && staffMatch;
        });
        
        console.log('Filtered appointments:', {
          range: selectedRange,
          dates: dateRange,
          count: filteredData.length,
          appointments: filteredData
        });
        
        setAppointments(appointmentsData); // Todas las citas para el calendario
        setFilteredAppointments(filteredData); // Citas filtradas para la lista
        
        // Convertir stats a un objeto indexado por fecha
        const statsMap: Record<string, DayStats> = {};
        statsData.forEach((stat: DayStats & { date: string }) => {
          statsMap[stat.date] = {
            total_appointments: stat.total_appointments,
            completed: stat.completed,
            scheduled: stat.scheduled,
            cancelled: stat.cancelled,
            confirmed: stat.confirmed,
            pending: stat.pending,
            in_progress: stat.in_progress,
            total_revenue: stat.total_revenue
          };
        });
        setDayStats(statsMap);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange, currentDate, clientFilter, serviceFilter, staffFilter]); // Agregar filtros como dependencias

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const serviceColors: { [key: string]: string } = {
    'Consulta Médica': '#3b82f6',
    'Terapia': '#10b981',
    'Evaluación': '#8b5cf6',
    'Tratamiento': '#ef4444',
    'default': '#6b7280'
  };

  const getServiceColor = (serviceName: string) => {
    return serviceColors[serviceName] || serviceColors.default;
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const getAppointmentsForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDateToString(date);
    const dayAppointments = appointments.filter(apt => apt.date === dateStr);
    console.log('Appointments for day:', {
      day,
      dateStr,
      appointments: dayAppointments,
      allAppointments: appointments
    });
    return dayAppointments;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros avanzados */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg border overflow-x-auto">
        <DateRangeFilter selectedRange={selectedRange} onRangeChange={handleRangeChange} />
        
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="min-w-[200px] bg-white whitespace-nowrap">
            <Users className="h-4 w-4 mr-2 text-gray-500" />
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {uniqueClients.map(client => (
              <SelectItem key={client} value={client}>{client}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="min-w-[200px] bg-white whitespace-nowrap">
            <BriefcaseMedical className="h-4 w-4 mr-2 text-gray-500" />
            <SelectValue placeholder="Filtrar por servicio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los servicios</SelectItem>
            {uniqueServices.map(service => (
              <SelectItem key={service} value={service}>{service}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="min-w-[200px] bg-white whitespace-nowrap">
            <User className="h-4 w-4 mr-2 text-gray-500" />
            <SelectValue placeholder="Filtrar por staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo el staff</SelectItem>
            {uniqueStaff.map(staff => (
              <SelectItem key={staff} value={staff}>{staff}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button variant="ghost" onClick={clearFilters} className="ml-auto whitespace-nowrap">
          <X className="h-4 w-4 mr-2" />
          Limpiar Filtro
        </Button>
      </div>
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
                Calendario de Citas
              </CardTitle>
              <CardDescription className="mt-1.5">
                Gestiona y visualiza todas las citas del mes
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentDate).map((day, index) => {
              if (!day) return <div key={index} className="p-2"></div>;
              
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayAppointments = getAppointmentsForDay(day);
              const stats = dayStats[dateStr];
              const isToday = new Date().getDate() === day && 
                            new Date().getMonth() === currentDate.getMonth() &&
                            new Date().getFullYear() === currentDate.getFullYear();

              return (
                <HoverCard key={day}>
                  <HoverCardTrigger asChild>
                    <div 
                      className={`
                        p-3 min-h-[120px] border rounded-lg cursor-pointer
                        transition-all duration-200 ease-in-out
                        ${isToday ? 'bg-blue-50 border-blue-200 shadow-sm' : 'border-gray-200 hover:border-blue-200 hover:shadow-sm'}
                      `}
                    >
                      <div className={`text-sm font-medium mb-2 flex items-center justify-between ${
                        isToday ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        <span>{day}</span>
                        {stats && (
                          <Badge variant="secondary" className="text-xs">
                            {stats.total_appointments} citas
                          </Badge>
                        )}
                      </div>
                      <ScrollArea className="h-[60px]">
                        <div className="space-y-1">
                          {dayAppointments.map(apt => (
                            <div 
                              key={apt.id} 
                              className="text-xs p-1.5 rounded-md"
                              style={{ 
                                backgroundColor: `${getServiceColor(apt.service.name)}15`, 
                                color: getServiceColor(apt.service.name) 
                              }}
                            >
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{apt.time}</span>
                              </div>
                              <div className="font-medium truncate">
                                {apt.client.name}
                              </div>
                            </div>
                          ))}

                          {/* Nueva sección para mostrar estadísticas rápidas */}
                          {stats && (
                            <div className="mt-2 p-2 rounded-md bg-gray-100 text-xs">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col items-center" title="Total de citas">
                                  <span className="font-semibold text-gray-800">{stats.total_appointments}</span>
                                  <ClipboardList className="h-4 w-4 text-gray-500" />
                                </div>
                                <div className="flex flex-col items-center" title="Citas completadas">
                                  <span className="font-semibold text-green-600">{stats.completed}</span>
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </div>
                                <div className="flex flex-col items-center" title="Citas canceladas">
                                  <span className="font-semibold text-red-600">{stats.cancelled}</span>
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 p-0" align="start">
                    <div className="p-4 pb-2 border-b">
                      <h4 className="font-semibold">
                        {day} de {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                      </h4>                      {stats && (
                        <div className="mt-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span>{stats.total_appointments} citas</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="h-4 w-4 text-gray-500" />
                              <span>{formatCurrency(stats.total_revenue)}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {[

                              {status: 'scheduled', text: 'Programadas', count: stats.scheduled},
                              {status: 'completed', text: 'Completadas', count: stats.completed},
                              {status: 'cancelled', text: 'Canceladas', count: stats.cancelled},
                              {status: 'confirmed', text: 'Confirmadas', count: stats.confirmed},
                              {status: 'pending', text: 'Pendientes', count: stats.pending},
                              {status: 'in-progress', text: 'En Progreso', count: stats.in_progress}
                            ].map(item => item.count > 0 && (
                              <Badge key={item.status} className={`${getStatusColor(item.status)} justify-center`}>
                                {item.count} {item.text}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <ScrollArea className="h-[280px]">
                      <div className="p-4 space-y-3">
                        {dayAppointments.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No hay citas programadas
                          </p>
                        ) : (
                          dayAppointments.map(apt => (
                            <div 
                              key={apt.id} 
                              className="p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                      {apt.client.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h5 className="font-medium">{apt.client.name}</h5>
                                    <p className="text-sm text-gray-600">{apt.service.name}</p>
                                  </div>
                                </div>
                                <Badge className={getStatusColor(apt.status)}>
                                  {apt.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                                  <span>{apt.time} ({apt.service.duration} min)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <DollarSign className="h-3.5 w-3.5 text-gray-500" />
                                  <span>{formatCurrency(apt.service.price)}</span>
                                </div>
                              </div>
                              {apt.staff && (
                                <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  <span>Atendido por {apt.staff.name}</span>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </HoverCardContent>
                </HoverCard>
              );
            })}

            {/* Nueva fila para el resumen de estadísticas del mes */}
            <div className="col-span-7 mt-4">
              <Card className="p-4 rounded-lg shadow-md bg-gray-50">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-semibold text-gray-800">{filteredAppointments.length}</span>
                    <span className="text-sm text-gray-500">Citas este mes</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-semibold text-green-600">{dayStats[formatDateToString(currentDate)]?.completed || 0}</span>
                    <span className="text-sm text-gray-500">Completadas hoy</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-semibold text-red-600">{dayStats[formatDateToString(currentDate)]?.cancelled || 0}</span>
                    <span className="text-sm text-gray-500">Canceladas hoy</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Citas para el período seleccionado</CardTitle>
          <CardDescription>
            {filteredAppointments.length > 0 
              ? `Se encontraron ${filteredAppointments.length} citas.`
              : 'No hay citas para el período o filtros seleccionados.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppointmentList appointments={filteredAppointments} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentCalendar;
