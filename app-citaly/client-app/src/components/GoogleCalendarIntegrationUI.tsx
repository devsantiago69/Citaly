import { useState, useEffect } from 'react';
import { Calendar, Settings, CheckCircle, AlertCircle, RefreshCw, Plus, Clock, User, MapPin, ExternalLink, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { googleCalendarService, GoogleCalendar, GoogleCalendarEvent } from '../lib/google-calendar';
import { appointmentsAPI } from '../lib/api-client';

interface GoogleAccount {
  email: string;
  name: string;
  picture?: string;
  connected: boolean;
}

interface SyncStats {
  totalAppointments: number;
  syncedAppointments: number;
  pendingSync: number;
  googleEvents: number;
  lastSync?: string;
}

const GoogleCalendarIntegrationUI = () => {
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalAppointments: 0,
    syncedAppointments: 0,
    pendingSync: 0,
    googleEvents: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);

  useEffect(() => {
    checkGoogleConnection();
    loadSyncStats();
  }, []);

  const checkGoogleConnection = async () => {
    try {
      const status = await googleCalendarService.checkConnectionStatus();
      if (status.connected) {
        setGoogleAccount({
          email: 'usuario@gmail.com', // Esto vendría del backend
          name: 'Usuario Google',
          connected: true
        });
        setCalendars(status.calendars || []);
      }
    } catch (error) {
      console.warn('Google Calendar no configurado:', error);
      // No mostrar error, simplemente mantener el estado desconectado
    }
  };

  const loadSyncStats = async () => {
    try {
      const appointments = await appointmentsAPI.getAppointments();
      const syncedCount = appointments.filter((apt: any) => apt.google_event_id).length;
      
      setSyncStats({
        totalAppointments: appointments.length,
        syncedAppointments: syncedCount,
        pendingSync: appointments.length - syncedCount,
        googleEvents: 0, // No hay eventos si Google no está configurado
        lastSync: undefined
      });
    } catch (error) {
      console.warn('Error loading sync stats:', error);
      // Datos por defecto en caso de error
      setSyncStats({
        totalAppointments: 0,
        syncedAppointments: 0,
        pendingSync: 0,
        googleEvents: 0
      });
    }
  };

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const authUrl = await googleCalendarService.getAuthUrl();
      
      // Abrir ventana popup para autenticación
      const popup = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Escuchar cuando se cierre la ventana
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          checkGoogleConnection(); // Verificar si la conexión fue exitosa
        }
      }, 1000);

      toast.success('Abriendo ventana de autenticación de Google...');
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast.error('Error al conectar con Google Calendar');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await googleCalendarService.disconnectGoogleAccount();
      setGoogleAccount(null);
      setCalendars([]);
      setSelectedCalendar('');
      toast.success('Cuenta de Google desconectada');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Error al desconectar la cuenta');
    }
  };

  const handleSyncAll = async () => {
    if (!selectedCalendar) {
      toast.error('Selecciona un calendario primero');
      return;
    }

    setIsSyncing(true);
    try {
      await googleCalendarService.syncCalendar(selectedCalendar);
      await loadSyncStats();
      toast.success('Sincronización completada');
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Error durante la sincronización');
    } finally {
      setIsSyncing(false);
    }
  };

  const ConnectionStatus = () => {
    if (!googleAccount?.connected) {
      return (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Conecta tu Google Calendar
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Sincroniza automáticamente tus citas con Google Calendar para mantener todo organizado en un solo lugar.
            </p>
            <Button 
              onClick={handleConnectGoogle}
              disabled={isConnecting}
              size="lg"
              className="flex items-center gap-2"
            >
              {isConnecting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {isConnecting ? 'Conectando...' : 'Conectar Google Calendar'}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-green-900">Cuenta Conectada</CardTitle>
                <CardDescription className="text-green-700">
                  {googleAccount.email}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Desconectar
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  };

  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-600">{syncStats.totalAppointments}</p>
              <p className="text-sm text-gray-600">Total Citas</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-600">{syncStats.syncedAppointments}</p>
              <p className="text-sm text-gray-600">Sincronizadas</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-orange-600">{syncStats.pendingSync}</p>
              <p className="text-sm text-gray-600">Pendientes</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-purple-600">{syncStats.googleEvents}</p>
              <p className="text-sm text-gray-600">Eventos Google</p>
            </div>
            <ExternalLink className="w-8 h-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const CalendarSettings = () => {
    if (!googleAccount?.connected) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuración de Sincronización
          </CardTitle>
          <CardDescription>
            Configura cómo se sincronizan tus citas con Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Calendario de Google</Label>
              <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar calendario" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                        />
                        {calendar.summary}
                        {calendar.primary && <Badge variant="secondary">Principal</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Sincronización automática</Label>
                  <p className="text-sm text-gray-600">
                    Sincronizar citas automáticamente cada hora
                  </p>
                </div>
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {syncStats.lastSync && (
                <span>Última sincronización: {new Date(syncStats.lastSync).toLocaleString()}</span>
              )}
            </div>
            <Button 
              onClick={handleSyncAll}
              disabled={isSyncing || !selectedCalendar}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const QuickActions = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Acciones Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button variant="outline" className="w-full justify-start" onClick={() => setShowSetupDialog(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Configuración Avanzada
        </Button>
        
        <Button variant="outline" className="w-full justify-start">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cita
        </Button>
        
        <Button variant="outline" className="w-full justify-start">
          <Calendar className="w-4 h-4 mr-2" />
          Ver Calendario
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Estado de conexión */}
      <ConnectionStatus />
      
      {/* Estadísticas */}
      <StatsCards />
      
      {/* Configuración */}
      <CalendarSettings />
      
      {/* Acciones rápidas */}
      <QuickActions />

      {/* Diálogo de configuración avanzada */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuración Avanzada</DialogTitle>
            <DialogDescription>
              Configura opciones avanzadas para la sincronización con Google Calendar
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="sync">Sincronización</TabsTrigger>
              <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sincronización bidireccional</Label>
                    <p className="text-sm text-gray-600">
                      Permite que los cambios en Google Calendar se reflejen en Citaly
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Crear recordatorios</Label>
                    <p className="text-sm text-gray-600">
                      Agregar recordatorios automáticos a los eventos
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="sync" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Frecuencia de sincronización</Label>
                  <Select defaultValue="1hour">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15min">Cada 15 minutos</SelectItem>
                      <SelectItem value="30min">Cada 30 minutos</SelectItem>
                      <SelectItem value="1hour">Cada hora</SelectItem>
                      <SelectItem value="manual">Solo manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificaciones por email</Label>
                    <p className="text-sm text-gray-600">
                      Recibir notificaciones cuando se sincronicen las citas
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setShowSetupDialog(false)}>
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoogleCalendarIntegrationUI;
