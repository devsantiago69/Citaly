import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useGoogleCalendar } from '../lib/google-calendar';

const GoogleCalendarAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [step, setStep] = useState<'processing' | 'select' | 'complete' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  const { googleService, getTokens } = useGoogleCalendar();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setError('Autorización cancelada o denegada');
      setStep('error');
      return;
    }

    if (code) {
      handleAuthCode(code);
    } else {
      setError('Código de autorización no encontrado');
      setStep('error');
    }
  }, [searchParams]);

  const handleAuthCode = async (code: string) => {
    setProcessing(true);
    try {
      // Intercambiar código por tokens
      const tokens = await getTokens(code);
      
      if (!tokens.access_token) {
        throw new Error('No se recibió token de acceso');
      }

      // Configurar cliente con tokens
      googleService.setCredentials(tokens);

      // Obtener lista de calendarios
      const calendarList = await googleService.getCalendarList();
      
      setCalendars(calendarList);
      setStep('select');
      
    } catch (error) {
      console.error('Error processing auth code:', error);
      setError('Error al procesar autorización: ' + error.message);
      setStep('error');
    } finally {
      setProcessing(false);
    }
  };

  const handleCalendarSelection = (calendarId: string, selected: boolean) => {
    if (selected) {
      setSelectedCalendars(prev => [...prev, calendarId]);
    } else {
      setSelectedCalendars(prev => prev.filter(id => id !== calendarId));
    }
  };

  const handleSaveCalendars = async () => {
    if (selectedCalendars.length === 0) {
      toast.error('Selecciona al menos un calendario');
      return;
    }

    setProcessing(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuario no autenticado');

      // Obtener empresa del usuario
      const { data: userData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.user.id)
        .single();

      if (!userData) throw new Error('Datos de usuario no encontrados');

      // Obtener tokens actuales
      const tokens = googleService.oauth2Client.credentials;

      // Guardar calendarios seleccionados
      const calendarInserts = selectedCalendars.map((calendarId, index) => {
        const calendar = calendars.find(c => c.id === calendarId);
        return {
          empresa_id: userData.empresa_id,
          usuario_id: user.user.id,
          google_calendar_id: calendarId,
          nombre: calendar?.summary || `Calendar ${index + 1}`,
          descripcion: calendar?.description,
          color: calendar?.backgroundColor || '#3B82F6',
          zona_horaria: calendar?.timeZone || 'America/Bogota',
          es_principal: index === 0, // El primero seleccionado es principal
          sincronizacion_activa: true,
          direccion_sincronizacion: 'bidireccional',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
        };
      });

      const { error } = await supabase
        .from('google_calendars')
        .insert(calendarInserts);

      if (error) throw error;

      setStep('complete');
      toast.success(`${selectedCalendars.length} calendario(s) conectado(s) exitosamente`);

      // Redirigir después de 3 segundos
      setTimeout(() => {
        navigate('/calendar');
      }, 3000);

    } catch (error) {
      console.error('Error saving calendars:', error);
      setError('Error al guardar calendarios: ' + error.message);
      setStep('error');
    } finally {
      setProcessing(false);
    }
  };

  const getAccessRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Propietario';
      case 'writer':
        return 'Editor';
      case 'reader':
        return 'Solo lectura';
      default:
        return role;
    }
  };

  const getAccessRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-green-100 text-green-800';
      case 'writer':
        return 'bg-blue-100 text-blue-800';
      case 'reader':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              Configuración de Google Calendar
            </CardTitle>
            <CardDescription>
              Conectando tu cuenta de Google Calendar con Citaly
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'processing' && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Procesando autorización...</p>
              </div>
            )}

            {step === 'select' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Selecciona los calendarios a sincronizar</h3>
                  <p className="text-sm text-gray-600">
                    Puedes conectar múltiples calendarios. El primero seleccionado será el principal.
                  </p>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {calendars.map((calendar, index) => (
                    <div
                      key={calendar.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedCalendars.includes(calendar.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleCalendarSelection(
                        calendar.id, 
                        !selectedCalendars.includes(calendar.id)
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: calendar.backgroundColor || '#3B82F6' }}
                          />
                          <div>
                            <h4 className="font-medium">{calendar.summary}</h4>
                            {calendar.description && (
                              <p className="text-sm text-gray-600">{calendar.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={getAccessRoleColor(calendar.accessRole)}>
                                {getAccessRoleLabel(calendar.accessRole)}
                              </Badge>
                              {calendar.primary && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  Principal
                                </Badge>
                              )}
                              {selectedCalendars[0] === calendar.id && (
                                <Badge className="bg-blue-100 text-blue-800">
                                  Será principal en Citaly
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedCalendars.includes(calendar.id)}
                            onChange={(e) => handleCalendarSelection(calendar.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/calendar')}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveCalendars}
                    disabled={selectedCalendars.length === 0 || processing}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      `Conectar ${selectedCalendars.length} calendario(s)`
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 'complete' && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-900 mb-2">
                  ¡Calendarios conectados exitosamente!
                </h3>
                <p className="text-gray-600 mb-4">
                  Tus calendarios de Google se sincronizarán automáticamente con Citaly.
                </p>
                <p className="text-sm text-gray-500">
                  Redirigiendo al calendario en 3 segundos...
                </p>
              </div>
            )}

            {step === 'error' && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-red-900 mb-2">
                  Error en la conexión
                </h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/calendar')}
                  >
                    Volver al calendario
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Intentar de nuevo
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GoogleCalendarAuth;