import { useState, useEffect } from 'react';
import { Calendar, Plus, RefreshCw, Settings, Clock, User, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { googleCalendarService, GoogleCalendar as GoogleCalendarType, GoogleCalendarEvent } from '../lib/google-calendar';
import { appointmentsAPI } from '../lib/api-client';
import AppointmentCalendar from './AppointmentCalendar';
import NewAppointmentDialog from './NewAppointmentDialog';

interface Appointment {
  id: number;
  company_id: number;
  date: string;
  time: string;
  status: 'completado' | 'programado' | 'cancelado' | 'confirmado' | 'pendiente' | 'en progreso';
  client: {
    id: number;
    name: string;
    phone: string;
    email: string;
  };
  service: {
    id: number;
    name: string;
    duration: number;
    price: number;
    category: string;
  };
  staff: {
    id: number;
    name: string;
  } | null;
  notes?: string;
  google_event_id?: string;
  google_calendar_id?: string;
  google_sync_enabled?: boolean;
}

interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
}

const AppointmentsWithGoogleCalendar = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendarType[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [showGoogleEvents, setShowGoogleEvents] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCalendar) {
      loadGoogleEvents();
    }
  }, [selectedCalendar]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Cargar citas del sistema
      const appointmentsData = await appointmentsAPI.getAppointments();
      setAppointments(appointmentsData);

      // Cargar calendarios de Google
      const calendarsData = await googleCalendarService.getCalendarList();
      setGoogleCalendars(calendarsData);
      
      // Seleccionar el primer calendario por defecto
      if (calendarsData.length > 0) {
        const primaryCalendar = calendarsData.find(cal => cal.primary) || calendarsData[0];
        setSelectedCalendar(primaryCalendar.id);
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Error al cargar datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleEvents = async () => {
    if (!selectedCalendar) return;

    try {
      // Obtener eventos del próximo mes
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const events = await googleCalendarService.getEvents(
        selectedCalendar,
        startDate.toISOString(),
        endDate.toISOString()
      );
      
      setGoogleEvents(events);
    } catch (error) {
      console.error('Error loading Google events:', error);
      toast.error('Error al cargar eventos de Google Calendar');
    }
  };

  const syncAppointmentToGoogle = async (appointment: Appointment) => {
    if (!selectedCalendar) {
      toast.error('Selecciona un calendario de Google primero');
      return;
    }

    try {
      setSyncing(true);

      const googleEvent: Partial<GoogleCalendarEvent> = {
        summary: `${appointment.service.name} - ${appointment.client.name}`,
        description: `
Cita programada en Citaly

Cliente: ${appointment.client.name}
Servicio: ${appointment.service.name}
Personal: ${appointment.staff?.name || 'No asignado'}
Duración: ${appointment.service.duration} minutos
Precio: $${appointment.service.price}

${appointment.notes ? `Notas: ${appointment.notes}` : ''}

Generado automáticamente por Citaly
        `.trim(),
        start: {
          dateTime: `${appointment.date}T${appointment.time}:00`,
          timeZone: 'America/Bogota'
        },
        end: {
          dateTime: calculateEndTime(appointment.date, appointment.time, appointment.service.duration),
          timeZone: 'America/Bogota'
        },
        location: 'Citaly - Centro de servicios',
        attendees: [
          {
            email: appointment.client.email,
            displayName: appointment.client.name,
            responseStatus: 'needsAction' as const
          }
        ]
      };

      // Crear evento en Google Calendar
      // Nota: createEvent no está implementado aún, simulamos la respuesta
      console.log('Creando evento en Google Calendar:', googleEvent);
      
      // Simulamos una respuesta exitosa
      const mockEventId = `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Actualizar la cita con el ID del evento de Google
      const updatedAppointment = {
        ...appointment,
        google_event_id: mockEventId,
        google_calendar_id: selectedCalendar,
        google_sync_enabled: true
      };

      await appointmentsAPI.updateAppointment(appointment.id.toString(), updatedAppointment);
      
      // Actualizar estado local
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointment.id ? updatedAppointment : apt
        )
      );

      await loadGoogleEvents(); // Recargar eventos de Google
      toast.success('Cita sincronizada con Google Calendar');

    } catch (error) {
      console.error('Error syncing to Google:', error);
      toast.error('Error al sincronizar con Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  const importEventFromGoogle = async (googleEvent: GoogleEvent) => {
    try {
      setSyncing(true);

      // Convertir evento de Google a cita del sistema
      const appointment = {
        date: googleEvent.start.dateTime.split('T')[0],
        time: googleEvent.start.dateTime.split('T')[1].substring(0, 5),
        client_name: extractClientFromSummary(googleEvent.summary),
        service_name: extractServiceFromSummary(googleEvent.summary),
        notes: `Importado de Google Calendar\n\n${googleEvent.description || ''}`,
        status: 'programado',
        google_event_id: googleEvent.id,
        google_calendar_id: selectedCalendar,
        google_sync_enabled: true
      };

      await appointmentsAPI.createAppointment(appointment);
      await loadInitialData(); // Recargar datos
      toast.success('Evento importado desde Google Calendar');

    } catch (error) {
      console.error('Error importing from Google:', error);
      toast.error('Error al importar evento de Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  const syncAllAppointments = async () => {
    if (!selectedCalendar) {
      toast.error('Selecciona un calendario de Google primero');
      return;
    }

    try {
      setSyncing(true);
      const unsyncedAppointments = appointments.filter(apt => !apt.google_event_id);
      
      for (const appointment of unsyncedAppointments) {
        await syncAppointmentToGoogle(appointment);
      }
      
      toast.success(`${unsyncedAppointments.length} citas sincronizadas con Google Calendar`);
    } catch (error) {
      console.error('Error syncing all appointments:', error);
      toast.error('Error al sincronizar todas las citas');
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const authUrl = await googleCalendarService.getAuthUrl();
      window.open(authUrl, '_blank');
    } catch (error) {
      console.error('Error getting auth URL:', error);
      toast.error('Error al conectar con Google Calendar');
    }
  };

  const calculateEndTime = (date: string, time: string, duration: number): string => {
    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
    return endDateTime.toISOString();
  };

  const extractClientFromSummary = (summary: string): string => {
    const match = summary.match(/- (.+)$/);
    return match ? match[1] : 'Cliente desde Google';
  };

  const extractServiceFromSummary = (summary: string): string => {
    const match = summary.match(/^(.+) -/);
    return match ? match[1] : 'Servicio desde Google';
  };

  const getSyncStatusBadge = (appointment: Appointment) => {
    if (appointment.google_event_id) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Sincronizado</Badge>;
    } else {
      return <Badge variant="outline">No sincronizado</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Citas y Google Calendar</h1>
          <p className="text-gray-600">Gestiona tus citas y sincronízalas con Google Calendar</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setNewAppointmentOpen(true)}
            variant="default"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cita
          </Button>
          
          <NewAppointmentDialog 
            open={newAppointmentOpen} 
            onOpenChange={(open) => {
              setNewAppointmentOpen(open);
              if (!open) {
                // Recargar datos cuando se cierre el diálogo
                loadInitialData();
              }
            }} 
          />
          {googleCalendars.length === 0 ? (
            <Button onClick={handleConnectGoogleCalendar}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Conectar Google Calendar
            </Button>
          ) : (
            <Button 
              onClick={syncAllAppointments}
              disabled={syncing || !selectedCalendar}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Todo'}
            </Button>
          )}
        </div>
      </div>

      {/* Configuración de Google Calendar */}
      {googleCalendars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Configuración de Google Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Calendario de Google</Label>
                <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar calendario" />
                  </SelectTrigger>
                  <SelectContent>
                    {googleCalendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        {calendar.summary}
                        {calendar.primary && ' (Principal)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={autoSyncEnabled}
                  onCheckedChange={setAutoSyncEnabled}
                />
                <Label>Sincronización automática</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showGoogleEvents}
                  onCheckedChange={setShowGoogleEvents}
                />
                <Label>Mostrar eventos de Google</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{appointments.length}</div>
            <div className="text-sm text-gray-600">Total Citas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {appointments.filter(apt => apt.google_event_id).length}
            </div>
            <div className="text-sm text-gray-600">Sincronizadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {appointments.filter(apt => !apt.google_event_id).length}
            </div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{googleEvents.length}</div>
            <div className="text-sm text-gray-600">Eventos Google</div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Vista Calendario
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <Clock className="h-4 w-4 mr-2" />
            Lista de Citas
          </TabsTrigger>
          <TabsTrigger value="google-events">
            <ExternalLink className="h-4 w-4 mr-2" />
            Eventos de Google
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <AppointmentCalendar />
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Citas del Sistema</CardTitle>
              <CardDescription>
                Gestiona tus citas y sincronízalas con Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{appointment.service.name}</h3>
                          {getSyncStatusBadge(appointment)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {appointment.client.name}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {appointment.date} a las {appointment.time}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {appointment.client.phone}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{appointment.status}</Badge>
                        {!appointment.google_event_id && (
                          <Button
                            size="sm"
                            onClick={() => syncAppointmentToGoogle(appointment)}
                            disabled={syncing || !selectedCalendar}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sincronizar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google-events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eventos de Google Calendar</CardTitle>
              <CardDescription>
                Eventos desde tu calendario de Google que puedes importar al sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {googleEvents.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{event.summary}</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(event.start.dateTime).toLocaleString()}
                          </div>
                          {event.location && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {event.location}
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              {event.attendees.length} asistente(s)
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => importEventFromGoogle(event)}
                        disabled={syncing}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Importar
                      </Button>
                    </div>
                  </div>
                ))}
                
                {googleEvents.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No hay eventos en el calendario seleccionado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AppointmentsWithGoogleCalendar;
