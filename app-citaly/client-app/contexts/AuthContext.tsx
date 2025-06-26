import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Tipo temporal para Socket - se integrará después
interface Socket {
  on: (event: string, callback: (data: unknown) => void) => void;
  emit: (event: string, data?: unknown) => void;
  disconnect: () => void;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'client';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Inicializar Socket.IO cuando el usuario se autentica
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

  useEffect(() => {
    // Simular verificación de sesión existente
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      initializeSocket(userData);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:3001/api/login', { email, password });
      if (response.data.user) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        initializeSocket(userData);
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Error en login:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    disconnectSocket();
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    socket
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};