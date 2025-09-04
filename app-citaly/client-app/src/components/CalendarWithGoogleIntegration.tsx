import { useState, useEffect } from 'react';
import { Calendar, Settings, RefreshCw, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { googleCalendarService } from '../lib/google-calendar';

const CalendarWithGoogleIntegration = () => {
  const [googleCalendars, setGoogleCalendars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');

  useEffect(() => {
    loadGoogleCalendars();
  }, []);

  const loadGoogleCalendars = async () => {
    try {
      setLoading(true);
      const calendars = await googleCalendarService.getCalendarList();
      setGoogleCalendars(calendars);
    } catch (error) {
      console.error('Error loading Google calendars:', error);
      toast.error('Error al cargar calendarios de Google');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const authUrl = await googleCalendarService.getAuthUrl();
      window.open(authUrl, '_blank');
    } catch (error) {
      console.error('Error generating auth URL:', error);
      toast.error('Error al generar URL de autorización');
    }
  };

  const syncAllCalendars = async () => {
    if (googleCalendars.length === 0) {
      toast.error('No hay calendarios conectados para sincronizar');
      return;
    }

    try {
      setLoading(true);
      
      // Sincronizar cada calendario
      for (const calendar of googleCalendars) {
        try {
          await googleCalendarService.syncCalendar(calendar.id);
          toast.success(`Calendario ${calendar.summary} sincronizado`);
        } catch (error) {
          console.error(`Error syncing calendar ${calendar.summary}:`, error);
          toast.error(`Error sincronizando ${calendar.summary}`);
        }
      }

      toast.success('Sincronización completada');
      await loadGoogleCalendars(); // Recargar calendarios
    } catch (error) {
      console.error('Error during sync:', error);
      toast.error('Error durante la sincronización');
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarConnected = async () => {
    await loadGoogleCalendars();
    toast.success('Calendario conectado exitosamente');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Calendario Citaly</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleConnectCalendar}
            variant="outline"
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Conectar Google Calendar
          </Button>
          <Button
            onClick={syncAllCalendars}
            disabled={loading || googleCalendars.length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar Todo
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="google">
            <RefreshCw className="h-4 w-4 mr-2" />
            Google Calendar
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendario de Citas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-600">Calendario principal del sistema</p>
                <p className="text-sm text-gray-500 mt-2">
                  {googleCalendars.length > 0 
                    ? `Sincronizado con ${googleCalendars.length} calendario(s) de Google` 
                    : 'No hay calendarios conectados'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integración con Google Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    Conecta tu cuenta de Google Calendar para sincronizar automáticamente
                  </p>
                  <Button 
                    onClick={handleConnectCalendar}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Conectar Google Calendar
                  </Button>
                </div>
                
                {googleCalendars.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Calendarios Conectados:</h3>
                    {googleCalendars.map((calendar: any) => (
                      <div key={calendar.id} className="flex justify-between items-center p-2 border rounded">
                        <span>{calendar.summary || calendar.nombre}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => googleCalendarService.syncCalendar(calendar.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Sincronización</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <p className="text-gray-600">Configuración de sincronización automática</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Próximamente: configuración personalizada de sincronización
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de la Integración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {googleCalendars.length}
              </div>
              <div className="text-sm text-gray-600">
                Calendarios Conectados
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {googleCalendars.filter(cal => cal.sync_enabled).length}
              </div>
              <div className="text-sm text-gray-600">
                Sincronización Activa
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${loading ? 'text-yellow-600' : 'text-green-600'}`}>
                {loading ? 'Sincronizando...' : 'Actualizado'}
              </div>
              <div className="text-sm text-gray-600">
                Estado del Sistema
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarWithGoogleIntegration;
