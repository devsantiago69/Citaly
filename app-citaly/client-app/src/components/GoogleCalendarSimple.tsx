import React, { useState, useEffect } from 'react';

interface CalendarItem {
  id: string;
  summary: string;
  description?: string;
  timeZone: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole: string;
  primary?: boolean;
  selected?: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  configured: boolean;
  googleUser?: {
    email: string;
    lastUpdate: string;
  };
  calendarsCount?: number;
  message: string;
}

const GoogleCalendarSimple: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [savingCalendars, setSavingCalendars] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendarSelection, setShowCalendarSelection] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/google-calendar/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
        
        if (data.connected) {
          loadCalendars();
        }
      } else {
        setError('Error verificando estado de conexión');
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const connectToGoogle = async () => {
    try {
      setConnecting(true);
      setError(null);
      
      const response = await fetch('/api/google-calendar/auth-url', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Redirigir a Google para autorización
        window.location.href = data.authUrl;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al generar URL de autorización');
      }
    } catch (error) {
      console.error('Error connecting to Google:', error);
      setError('Error de conexión');
    } finally {
      setConnecting(false);
    }
  };

  const loadCalendars = async () => {
    try {
      const response = await fetch('/api/google-calendar/calendars', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCalendars(data.calendars || []);
        setShowCalendarSelection(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error cargando calendarios');
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
      setError('Error cargando calendarios');
    }
  };

  const toggleCalendarSelection = (calendarId: string) => {
    setCalendars(prev => 
      prev.map(cal => 
        cal.id === calendarId 
          ? { ...cal, selected: !cal.selected }
          : cal
      )
    );
  };

  const saveSelectedCalendars = async () => {
    try {
      setSavingCalendars(true);
      setError(null);
      
      const selectedCalendars = calendars.filter(cal => cal.selected);
      
      if (selectedCalendars.length === 0) {
        setError('Selecciona al menos un calendario');
        return;
      }

      const response = await fetch('/api/google-calendar/calendars/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          calendars: calendars
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setShowCalendarSelection(false);
        checkConnectionStatus(); // Recargar estado
        setError(null);
        alert('¡Calendarios guardados exitosamente!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error guardando calendarios');
      }
    } catch (error) {
      console.error('Error saving calendars:', error);
      setError('Error guardando calendarios');
    } finally {
      setSavingCalendars(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
            <span>Cargando estado de Google Calendar...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🗓️ Google Calendar Integration
        </h1>
        <p className="text-gray-600">
          Sincroniza automáticamente tus citas con Google Calendar
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Estado de Conexión</h2>
        
        {connectionStatus && (
          <div className="space-y-4">
            {/* Estado */}
            <div className="flex items-center space-x-2">
              <span className="font-medium">Estado:</span>
              {connectionStatus.configured ? (
                connectionStatus.connected ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 font-medium">Conectado</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-yellow-700 font-medium">Configurado - No conectado</span>
                  </div>
                )
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-red-700 font-medium">No configurado</span>
                </div>
              )}
            </div>

            {/* Información del Usuario */}
            {connectionStatus.connected && connectionStatus.googleUser && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 text-green-800">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Conectado como:</span>
                  <span>{connectionStatus.googleUser.email}</span>
                </div>
                {connectionStatus.calendarsCount !== undefined && (
                  <p className="text-sm text-green-600 mt-1">
                    {connectionStatus.calendarsCount} calendario(s) sincronizado(s)
                  </p>
                )}
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex space-x-3">
              {!connectionStatus.connected ? (
                <button
                  onClick={connectToGoogle}
                  disabled={connecting || !connectionStatus.configured}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connecting ? (
                    <>
                      <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Conectando...
                    </>
                  ) : (
                    '🔗 Conectar con Google'
                  )}
                </button>
              ) : (
                <button
                  onClick={loadCalendars}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  ⚙️ Configurar Calendarios
                </button>
              )}
              
              <button
                onClick={checkConnectionStatus}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                🔄 Actualizar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selección de Calendarios */}
      {showCalendarSelection && calendars.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Seleccionar Calendarios</h2>
          <p className="text-gray-600 mb-4">
            Elige qué calendarios deseas sincronizar con Citaly
          </p>
          
          <div className="space-y-3 mb-6">
            {calendars.map((calendar) => (
              <div 
                key={calendar.id}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={calendar.selected || false}
                  onChange={() => toggleCalendarSelection(calendar.id)}
                  className="h-4 w-4 text-blue-600"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{calendar.summary}</span>
                    {calendar.primary && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Principal</span>
                    )}
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                      {calendar.accessRole}
                    </span>
                  </div>
                  {calendar.description && (
                    <p className="text-sm text-gray-500">{calendar.description}</p>
                  )}
                  <p className="text-xs text-gray-400">Zona horaria: {calendar.timeZone}</p>
                </div>
                {calendar.backgroundColor && (
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: calendar.backgroundColor }}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={saveSelectedCalendars}
              disabled={savingCalendars || calendars.filter(c => c.selected).length === 0}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingCalendars ? (
                <>
                  <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Guardando...
                </>
              ) : (
                '💾 Guardar Selección'
              )}
            </button>
            <button
              onClick={() => setShowCalendarSelection(false)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarSimple;
