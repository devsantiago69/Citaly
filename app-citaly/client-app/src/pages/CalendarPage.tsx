import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleCalendarIntegrationUI from '../components/GoogleCalendarIntegrationUI';
import { authAPI } from '../lib/api-client';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar, ArrowLeft } from 'lucide-react';

const CalendarPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      // Verificar si hay token en localStorage
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        navigate('/login');
        return;
      }

      // Verificar que el token sea válido con el backend
      const userProfile = await authAPI.getProfile();
      setUser(userProfile);
    } catch (error) {
      console.error('Error getting user:', error);
      // Si el token no es válido, redirigir al login
      localStorage.removeItem('authToken');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Acceso requerido
            </h2>
            <p className="text-gray-600 mb-4">
              Necesitas iniciar sesión para acceder al calendario.
            </p>
            <Button 
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Calendario Citaly
              </h1>
              <p className="text-gray-600">
                Gestiona tus citas con sincronización automática a Google Calendar
              </p>
            </div>
          </div>
        </div>

        {/* Información del usuario */}
        <div className="mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Usuario conectado:</strong> {user?.email || user?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-blue-600">
                    ID: {user?.id || 'N/A'}
                  </p>
                </div>
                <div className="text-xs text-blue-600">
                  Última conexión: {new Date().toLocaleString('es-ES')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Componente principal del calendario */}
        <GoogleCalendarIntegrationUI />
      </div>
    </div>
  );
};

export default CalendarPage;
