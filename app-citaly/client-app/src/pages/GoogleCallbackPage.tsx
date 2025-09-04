import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const GoogleCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Procesando autorización de Google...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Obtener el código de autorización de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Error de autorización: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No se recibió el código de autorización');
          return;
        }

        // Enviar el código al backend para intercambiarlo por tokens
        const response = await fetch('/api/google-calendar/exchange-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ code })
        });

        if (response.ok) {
          const data = await response.json();
          setStatus('success');
          setMessage('¡Google Calendar conectado exitosamente!');
          
          // Redirigir al calendario después de 2 segundos
          setTimeout(() => {
            navigate('/calendario');
          }, 2000);
        } else {
          const errorData = await response.json();
          setStatus('error');
          setMessage(`Error al conectar con Google Calendar: ${errorData.error || 'Error desconocido'}`);
        }
      } catch (error) {
        console.error('Error en callback de Google:', error);
        setStatus('error');
        setMessage('Error al procesar la autorización de Google');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Conectando con Google Calendar</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">¡Conexión exitosa!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirigiendo al calendario...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error de conexión</h2>
            <p className="text-red-600 mb-4">{message}</p>
            <button 
              onClick={() => navigate('/calendario')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Volver al calendario
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
