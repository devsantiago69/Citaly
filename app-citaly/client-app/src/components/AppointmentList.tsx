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
  status: 'completado' | 'programado' | 'cancelado' | 'confirmado' | 'pendiente' | 'en progreso';
  client: AppointmentClient;
  service: AppointmentService;
  staff: AppointmentStaff | null;
  notes?: string;
  google_event_id?: string;
}

interface AppointmentListProps {
  appointments?: Appointment[];
  isLoading?: boolean;
  onAction?: () => void;
  onFilteredChange?: (filtered: Appointment[]) => void; // Nuevo callback para notificar cambios en los filtros internos
}

const AppointmentList = ({ appointments: propAppointments = [], isLoading: propIsLoading, onAction }: AppointmentListProps = {}) => {
  // Eliminar todos los filtros internos y el estado de dateRange
  const isLoading = propIsLoading || false;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const getStatusConfig = (status: string) => {
    const statusNames: Record<string, string> = {
      "confirmado": "Confirmada",
      "pendiente": "Pendiente",
      "en progreso": "En progreso",
      "completado": "Completada",
      "cancelado": "Cancelada",
      "programado": "Programada"
    };
    const configs = {
      "confirmado": {
        badge: <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 capitalize">{statusNames["confirmado"]}</Badge>,
        bgColor: "bg-purple-50 border-purple-200"
      },
      "pendiente": {
        badge: <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 capitalize">{statusNames["pendiente"]}</Badge>,
        bgColor: "bg-yellow-50 border-yellow-200"
      },
      "en progreso": {
        badge: <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 capitalize">{statusNames["en progreso"]}</Badge>,
        bgColor: "bg-blue-50 border-blue-200"
      },
      "completado": {
        badge: <Badge className="bg-green-100 text-green-800 hover:bg-green-100 capitalize">{statusNames["completado"]}</Badge>,
        bgColor: "bg-green-50 border-green-200"
      },
      "cancelado": {
        badge: <Badge className="bg-red-100 text-red-800 hover:bg-red-100 capitalize">{statusNames["cancelado"]}</Badge>,
        bgColor: "bg-red-50 border-red-200"
      },
      "programado": {
        badge: <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 capitalize">{statusNames["programado"]}</Badge>,
        bgColor: "bg-gray-50 border-gray-200"
      }
    };
    return configs[status as keyof typeof configs] || {
      badge: <Badge variant="secondary" className="capitalize">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>,
      bgColor: "bg-gray-50 border-gray-200"
    };
  };

  const handleAction = async (action: 'confirm' | 'complete' | 'cancel', appointmentId: number) => {
    const statusMap = {
      confirm: 'Confirmada',
      complete: 'Completada',
      cancel: 'Cancelada',
    };
    const newStatus = statusMap[action];

    if (!newStatus) {
      toast.error(`Acción inválida: ${action}`);
      return;
    }

    try {
      const response = await fetch(`/api/citas/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: newStatus }),
      });

      if (response.ok) {
        toast.success(`Cita actualizada a "${newStatus}".`);
        if (onAction) onAction(); // Recargar desde el padre
      } else {
        const errorData = await response.json().catch(() => ({ message: 'No se pudo procesar la respuesta del servidor.' }));
        toast.error(`Error al actualizar la cita: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('No se pudo conectar con el servidor para actualizar la cita.');
    }
  };

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
      {propAppointments.length > 0 ? (
        <div className="space-y-4">
          {propAppointments.map((apt) => {
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
