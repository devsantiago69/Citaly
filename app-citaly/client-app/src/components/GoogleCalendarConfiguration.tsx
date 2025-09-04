import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, ExternalLink, Copy } from 'lucide-react';

interface ConfigurationStatus {
  configured: boolean;
  clientIdSet: boolean;
  clientSecretSet: boolean;
  redirectUriSet: boolean;
  message: string;
}

const GoogleCalendarConfiguration: React.FC = () => {
  const [config, setConfig] = useState<ConfigurationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const response = await fetch('/api/google-calendar/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error checking configuration:', error);
      setConfig({
        configured: false,
        clientIdSet: false,
        clientSecretSet: false,
        redirectUriSet: false,
        message: 'Error checking configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const ConfigItem = ({ label, status, description }: { label: string; status: boolean; description?: string }) => (
    <div className="flex items-center space-x-2 p-3 border rounded-lg">
      {status ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      )}
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        {description && <div className="text-sm text-gray-500">{description}</div>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const redirectUris = [
    'http://localhost:5173/auth/google/callback',
    'http://127.0.0.1:5173/auth/google/callback'
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="h-6 w-6" />
          <h2 className="text-xl font-bold">Configuración de Google Calendar API</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Para habilitar la integración con Google Calendar, necesitas configurar las credenciales OAuth 2.0
        </p>

        {config && (
          <>
            <div className={`p-4 rounded-lg mb-6 ${config.configured ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <p>{config.message}</p>
            </div>

            <div className="space-y-3 mb-6">
              <ConfigItem 
                label="Google Client ID" 
                status={config.clientIdSet}
                description="ID del cliente OAuth 2.0"
              />
              <ConfigItem 
                label="Google Client Secret" 
                status={config.clientSecretSet}
                description="Secreto del cliente OAuth 2.0"
              />
              <ConfigItem 
                label="Redirect URI" 
                status={config.redirectUriSet}
                description="URI de redirección configurada"
              />
            </div>
          </>
        )}
      </div>

      {config && !config.configured && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">Pasos de configuración</h3>
          <p className="text-gray-600 mb-6">
            Sigue estos pasos para configurar Google Calendar API
          </p>

          <div className="space-y-6">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold">Crear proyecto en Google Cloud Console</h4>
                <p className="text-sm text-gray-600 mb-2">Ve a Google Cloud Console y crea un nuevo proyecto</p>
                <button 
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => window.open('https://console.cloud.google.com/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Google Cloud Console
                </button>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold">Habilitar Google Calendar API</h4>
                <p className="text-sm text-gray-600">En &quot;APIs y servicios&quot; &gt; &quot;Biblioteca&quot;, busca y habilita &quot;Google Calendar API&quot;</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold">Configurar pantalla de consentimiento OAuth</h4>
                <p className="text-sm text-gray-600">En &quot;APIs y servicios&quot; &gt; &quot;Pantalla de consentimiento OAuth&quot;, configura la información básica</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</div>
              <div className="flex-1">
                <h4 className="font-semibold">Crear credenciales OAuth 2.0</h4>
                <p className="text-sm text-gray-600 mb-3">En &quot;Credenciales&quot;, crea un &quot;ID de cliente OAuth 2.0&quot; tipo &quot;Aplicación web&quot;</p>
                
                <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">URIs de redirección autorizados:</label>
                    {redirectUris.map((uri, index) => (
                      <div key={index} className="flex items-center space-x-2 mt-1">
                        <code className="flex-1 text-sm bg-white px-2 py-1 border rounded">{uri}</code>
                        <button
                          className="p-1 hover:bg-gray-200 rounded"
                          onClick={() => copyToClipboard(uri, `uri-${index}`)}
                        >
                          {copied === `uri-${index}` ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</div>
              <div className="flex-1">
                <h4 className="font-semibold">Configurar variables de entorno</h4>
                <p className="text-sm text-gray-600 mb-3">Agrega las credenciales al archivo .env del backend:</p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <code className="text-sm block">
                    GOOGLE_CLIENT_ID=tu_client_id_aqui<br/>
                    GOOGLE_CLIENT_SECRET=tu_client_secret_aqui<br/>
                    GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
                  </code>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                Después de configurar las variables de entorno, reinicia el servidor backend para que los cambios tomen efecto.
              </p>
            </div>
          </div>

          <button 
            onClick={checkConfiguration} 
            className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Verificar configuración
          </button>
        </div>
      )}

      {config && config.configured && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-bold text-green-600 mb-2">¡Configuración completa!</h3>
          <p className="text-gray-600 mb-4">
            Google Calendar API está correctamente configurado. Ya puedes usar la integración.
          </p>
          <button 
            onClick={() => window.location.href = '/calendario'} 
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
          >
            Ir a Google Calendar Integration
          </button>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarConfiguration;
