import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../lib/api';
import { toast } from 'sonner';

// Tipo temporal para Socket - se integrará después
interface Socket {
  on: (event: string, callback: (data: unknown) => void) => void;
  emit: (event: string, data?: unknown) => void;
  disconnect: () => void;
  off?: (event: string, callback?: (data: unknown) => void) => void;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'client';
  empresa_id: number;
  company?: {
    name: string;
    nit: string;
    address: string;
    phone: string;
    email: string;
    description?: string;
    website?: string;
    industry?: string;
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  socket: Socket | null;
  updateUser: (userData: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Iniciar como true
  const [socket, setSocket] = useState<Socket | null>(null);

  const initializeSocket = (userData: User) => {
    // TODO: Integrar Socket.IO después de resolver problemas de tipos
    console.log('Socket.IO se integrará después para usuario:', userData.name);

    // Por ahora crear un socket mock
    const mockSocket: Socket = {
      on: (event: string, callback: (data: unknown) => void) => {
        console.log(`Mock socket listening to: ${event}`);
      },
      emit: (event: string, data?: unknown) => {
        console.log(`Mock socket emitting: ${event}`, data);
      },
      disconnect: () => {
        console.log('Mock socket disconnected');
      },
      off: (event: string, callback?: (data: unknown) => void) => {
        console.log(`Mock socket off: ${event}`);
      }
    };

    setSocket(mockSocket);
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const verifyAuth = useCallback(async () => {
    console.log("?? Verificando autenticación...");
    const token = localStorage.getItem('token');
    console.log("?? Token encontrado:", !!token);

    if (token) {
      try {
        // Intentamos verificar el token con el backend
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            console.log("?? Datos de usuario encontrados en localStorage...");
            // Primero establecer el usuario desde localStorage para que la UI responda rápido
            const userData = JSON.parse(savedUser);
            setUser(userData);

            // Luego verificar con el backend asíncronamente
            try {
              console.log("?? Verificando token con el backend...");
              const response = await api.get('/auth/verify');
              // Si la solicitud es exitosa, el token es válido y actualizamos con los datos más recientes
              console.log("? Token verificado exitosamente", response.data);

              if (response.data && response.data.user) {
                // Solo actualizamos si los datos son diferentes para evitar re-renders innecesarios
                const currentUserStr = JSON.stringify(userData);
                const newUserStr = JSON.stringify(response.data.user);
                
                if (currentUserStr !== newUserStr) {
                  setUser(response.data.user);
                  localStorage.setItem('user', JSON.stringify(response.data.user));
                }

                // Inicializamos el socket solo si no está ya inicializado
                if (!socket) {
                  initializeSocket(response.data.user);
                }
              } else {
                console.warn("? Respuesta del servidor no contiene datos de usuario");
              }
            } catch (verifyError) {
              console.error("? Error de verificación con el backend:", verifyError);

              // Si el error es de autorización (401/403), limpiar los datos
              if (verifyError.response && (verifyError.response.status === 401 || verifyError.response.status === 403)) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
                toast.error('Tu sesión ha expirado, inicia sesión nuevamente');
              } else {
                // Si es otro tipo de error (como un error de red), mantenemos el usuario de localStorage
                console.warn("? Error de red u otro, manteniendo usuario de localStorage temporalmente");
                // No eliminamos los datos para permitir intentos posteriores
              }
            }
          } catch (parseError) {
            console.error("? Error al parsear datos de usuario de localStorage:", parseError);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        } else {
          console.log("?? Token encontrado pero no hay datos de usuario");
          // Intentar verificar token sin datos de localStorage
          try {
            const response = await api.get('/auth/verify');
            if (response.data && response.data.user) {
              console.log("? Token verificado sin datos locales, actualizando usuario");
              setUser(response.data.user);
              localStorage.setItem('user', JSON.stringify(response.data.user));
              initializeSocket(response.data.user);
            } else {
              localStorage.removeItem('token');
            }
          } catch (err) {
            console.error("? No se pudo verificar el token sin datos locales:", err);
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error("? Error de verificación, limpiando token", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    } else {
      console.log("?? No hay token, usuario no autenticado");
      setUser(null);
    }

    console.log("?? Estado de autenticación finalizado, isLoading:", false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Solo ejecutar la verificación una vez al montar el componente
    verifyAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    console.log(`?? Intentando login con ${email}`);

    try {
      // Usamos axios directamente para evitar interceptores en la autenticación inicial
      const response = await axios.post('http://localhost:3001/api/auth/login',
        { email, password },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      );

      console.log('?? Respuesta del servidor:', response.status);

      if (response.data && response.data.user && response.data.token) {
        console.log('? Login exitoso');
        const { user: userData, token } = response.data;

        // Validar que el usuario tiene los campos necesarios
        if (!userData.name || !userData.email || !userData.role) {
          console.error('? Datos de usuario incompletos:', userData);
          toast.error('Error en la respuesta del servidor: datos de usuario incompletos');
          setIsLoading(false);
          return false;
        }

        // Guardar datos en localStorage primero para asegurar persistencia
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);

        // Luego actualizar el estado
        setUser(userData);
        initializeSocket(userData);

        console.log('? Usuario autenticado correctamente:', userData.name);
        setIsLoading(false);
        return true;
      } else {
        console.warn('?? Respuesta sin datos de usuario o token:', response.data);
        toast.error('Error en la respuesta del servidor');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('? Error en login:', errorMessage);

      // Limpiar cualquier dato de autenticación parcial
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Mostrar un mensaje más específico
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(`Error status: ${error.response.status}`, error.response.data);
          toast.error(`Error: ${error.response.data?.error || 'Error en el servidor'}`);
        } else if (error.request) {
          console.error('No se recibió respuesta del servidor');
          toast.error('No se pudo conectar con el servidor');
        } else {
          toast.error(`Error: ${errorMessage}`);
        }
      } else {
        toast.error('Error en el inicio de sesión');
      }

      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    console.log("Cerrando sesión...");

    // Primero desconectamos el socket
    disconnectSocket();

    // Limpiamos los datos locales
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);

    // Intentamos hacer logout en el backend, pero no esperamos la respuesta
    // para no bloquear la redirección
    axios.post('http://localhost:3001/api/logout')
      .then(() => {
        console.log("Logout exitoso en el backend");
      })
      .catch(error => {
        console.error("Error al cerrar sesión en el backend:", error);
      });

    // Forzar la redirección al login después de un breve retraso
    setTimeout(() => {
      console.log("Ejecutando redirección al login");

      try {
        // Usando window.location.replace para una redirección más limpia
        window.location.replace('http://localhost:5173/login');
      } catch (e) {
        console.error("Error en redirección, intentando alternativa:", e);
        // Alternativa si replace falla
        window.location.href = 'http://localhost:5173/login';
      }
    }, 300);
  };

  const updateUser = useCallback(async (userData: Partial<User>): Promise<boolean> => {
    try {
      // Aquí iría la lógica para actualizar el usuario en el backend
      // Por ahora, solo actualizamos el estado local
      setUser(prev => prev ? { ...prev, ...userData } : null);
      return true;
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      toast.error('No se pudo actualizar la información del usuario');
      return false;
    }
  }, []);

  const value = {
    user,
    login,
    logout,
    isLoading,
    socket,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};