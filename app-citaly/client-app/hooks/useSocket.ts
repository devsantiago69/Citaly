import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

export const useSocket = () => {
  const { socket } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (socket) {
      const handleConnect = () => {
        setIsConnected(true);
        console.log('? Socket conectado');
      };

      const handleDisconnect = () => {
        setIsConnected(false);
        console.log('? Socket desconectado');
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      };
    }
  }, [socket]);

  const emitEvent = (event: string, data?: unknown) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  const subscribeToEvent = (event: string, callback: (data: unknown) => void) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
  };

  return {
    socket,
    isConnected,
    emitEvent,
    subscribeToEvent
  };
};
