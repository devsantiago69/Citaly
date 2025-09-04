import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { googleCalendarService } from '../lib/google-calendar';

const GoogleCalendarAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [step, setStep] = useState<'processing' | 'select' | 'complete' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setError('Autorización cancelada o denegada');
      setStep('error');
      return;
    }

    if (code) {
      handleAuthCallback(code);
    }
  }, [searchParams]);

  const handleAuthCallback = async (code: string) => {
    try {
      setProcessing(true);
      
      // Intercambiar código por tokens
      const response = await googleCalendarService.exchangeCodeForTokens(code);
      
      if (response.success) {
        toast.success('Autorización exitosa');
        setStep('complete');
        
        // Redirigir después de un momento
        setTimeout(() => {
          navigate('/dashboard/calendar');
        }, 2000);
      } else {
        throw new Error(response.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error during auth callback:', error);
      setError(error instanceof Error ? error.message : 'Error durante la autorización');
      setStep('error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRetry = () => {
    setStep('processing');
    setError(null);
    navigate('/dashboard/calendar');
  };

  const renderStep = () => {
    switch (step) {
      case 'processing':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              </div>
              <CardTitle>Procesando autorización...</CardTitle>
              <CardDescription>
                Estamos configurando tu conexión con Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  • Verificando permisos
                </div>
                <div className="text-sm text-gray-600">
                  • Obteniendo calendarios
                </div>
                <div className="text-sm text-gray-600">
                  • Configurando sincronización
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'complete':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-green-700">¡Conexión exitosa!</CardTitle>
              <CardDescription>
                Tu cuenta de Google Calendar ha sido conectada correctamente
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700">
                  Ahora puedes sincronizar tus calendarios automáticamente con Citaly.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/dashboard/calendar')}
                className="w-full"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Ir al calendario
              </Button>
            </CardContent>
          </Card>
        );

      case 'error':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
              <CardTitle className="text-red-700">Error de autorización</CardTitle>
              <CardDescription>
                No se pudo completar la conexión con Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  className="w-full"
                >
                  Intentar nuevamente
                </Button>
                <Button 
                  onClick={() => navigate('/dashboard/calendar')}
                  className="w-full"
                >
                  Volver al calendario
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {renderStep()}
      </div>
    </div>
  );
};

export default GoogleCalendarAuth;
