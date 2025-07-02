import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, DollarSign, ClipboardList, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { api } from "../config/api";
import { formatDateToString, getCurrentDate, getMonthDateRange } from '../utils/dateUtils';

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
  // Estados normalizados y en español, para que el breakdown y los filtros sean consistentes
  status: 'completado' | 'programado' | 'cancelado' | 'confirmado' | 'pendiente' | 'en progreso';
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

const AppointmentCalendar = () => {
  // Fecha actual y mes visible
  const getToday = () => getCurrentDate();
  const [currentDate, setCurrentDate] = useState(getToday());
  const [isLoading, setIsLoading] = useState(true);
  // Mapa de citas por día: { 'YYYY-MM-DD': [citas...] }
  const [calendarSummary, setCalendarSummary] = useState<Record<string, number>>({});
  const [appointmentsByDay, setAppointmentsByDay] = useState<Record<string, any[]>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<any[]>([]);

  // Calcular rango del mes visible
  const getMonthRange = (date: Date) => {
    const start = formatDateToString(new Date(date.getFullYear(), date.getMonth(), 1));
    const end = formatDateToString(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    return { start, end };
  };

  // Cargar resumen de citas por día del mes
  // Mostrar respuesta del API en consola y en pantalla para debug
  const [lastSummaryResponse, setLastSummaryResponse] = useState<any>(null);
  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);
      const { start, end } = getMonthRange(currentDate);
      try {
        await api.get('/api/calendario/summary', {
          params: { start, end }
        }).then(res => {
          setLastSummaryResponse(res.data); // Guardar respuesta completa
          console.log('API /api/calendario/summary response:', res.data);
          if (res.data && Array.isArray(res.data)) {
            // Agrupar por fecha (YYYY-MM-DD)
            const byDay: Record<string, any[]> = {};
            res.data.forEach((apt: any) => {
              // Normalizar fecha a YYYY-MM-DD
              const date = new Date(apt.fecha).toISOString().slice(0, 10);
              if (!byDay[date]) byDay[date] = [];
              byDay[date].push(apt);
            });
            setAppointmentsByDay(byDay);
            // Para el badge de cantidad
            const map: Record<string, number> = {};
            Object.keys(byDay).forEach(date => { map[date] = byDay[date].length; });
            setCalendarSummary(map);
          } else {
            setAppointmentsByDay({});
            setCalendarSummary({});
          }
        });
      } catch (e) {
        setAppointmentsByDay({});
        setCalendarSummary({});
      }
      setIsLoading(false);
    };
    fetchSummary();
  }, [currentDate]);

  // Al seleccionar un día, mostrar todas las citas de ese día (ya están en appointmentsByDay)
  const [lastDayResponse, setLastDayResponse] = useState<any>(null); // Ya no se usa, pero lo dejamos para debug
  useEffect(() => {
    if (!selectedDay) return;
    // Buscar en appointmentsByDay
    const citas = appointmentsByDay[selectedDay] || [];
    setSelectedDayAppointments(citas);
  }, [selectedDay, appointmentsByDay]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') newDate.setMonth(prev.getMonth() - 1);
      else newDate.setMonth(prev.getMonth() + 1);
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
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toLowerCase()) {
      case 'completado':
        return 'bg-green-100 text-green-800';
      case 'programado':
        return 'bg-blue-100 text-blue-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      case 'confirmado':
        return 'bg-purple-100 text-purple-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'en progreso':
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

  // No se usa, ahora todo viene del backend

  // No se usan stats locales, todo viene del backend

  // No se usan stats de filtro

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
                Calendario de Citas
              </CardTitle>
              <CardDescription className="mt-1.5">
                Visualiza las citas del mes. Haz clic en un día para ver detalles.
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
              const key = day === null ? `empty-${index}` : `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
              if (!day) return <div key={key} className="p-2"></div>;
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const dateStr = formatDateToString(date);
              const count = calendarSummary[dateStr] || 0;
              const citas = appointmentsByDay[dateStr] || [];
              const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
              return (
                <div
                  key={key}
                  className={`p-3 min-h-[90px] border rounded-lg cursor-pointer transition-all duration-200 ease-in-out flex flex-col justify-between ${isToday ? 'bg-blue-50 border-blue-200 shadow-sm' : 'border-gray-200 hover:border-blue-200 hover:shadow-sm'}`}
                  onClick={() => setSelectedDay(dateStr)}
                >
                  <div className={`text-sm font-medium flex items-center justify-between ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    <span>{day}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0.5 font-normal">{count} citas</Badge>
                    )}
                  </div>
                  {/* Mostrar hasta 2 nombres/servicios */}
                  {citas.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {citas.slice(0,2).map((apt, i) => (
                        <div key={apt.id || i} className="truncate text-xs text-gray-700 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{background:'#3b82f6'}}></span>
                          <span title={apt.cliente_nombre_completo}>{apt.cliente_nombre_completo.split(' ')[0]}</span>
                          <span className="text-gray-400">/</span>
                          <span title={apt.servicio_nombre} className="truncate max-w-[60px]">{apt.servicio_nombre}</span>
                        </div>
                      ))}
                      {citas.length > 2 && (
                        <div className="text-[10px] text-gray-400">+{citas.length - 2} más</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      {/* Modal o panel para mostrar detalles de las citas del día seleccionado */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setSelectedDay(null)}>
              ×
            </button>
            <h3 className="text-xl font-semibold mb-2">Citas para {selectedDay}</h3>
            <div className="max-h-[400px] overflow-y-auto space-y-3">
              {selectedDayAppointments.length === 0 ? (
                <p className="text-gray-500 text-center">No hay citas para este día.</p>
              ) : (
                selectedDayAppointments.map((apt, idx) => (
                  <div key={apt.id || idx} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{apt.cliente_nombre_completo ? apt.cliente_nombre_completo.split(' ').map((n: string) => n[0]).join('') : '??'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h5 className="font-medium">{apt.cliente_nombre_completo || 'Sin nombre'}</h5>
                          <p className="text-sm text-gray-600">{apt.servicio_nombre || 'Sin servicio'}</p>
                          <p className="text-xs text-gray-400">{apt.personal_nombre || ''}</p>
                        </div>
                      </div>
                      <Badge>{apt.estado}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-500" />
                        <span>{apt.hora}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500">Sucursal:</span>
                        <span>{apt.sucursal_nombre}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <span className="text-gray-500">Notas:</span>
                        <span>{apt.notas || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <span className="text-gray-500">Contacto:</span>
                        <span>{apt.cliente_telefono} / {apt.cliente_email}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentCalendar;
