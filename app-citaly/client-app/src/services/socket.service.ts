import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.connect();
  }

  connect() {
    try {
      this.socket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Error connecting to socket:', error);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('? Conectado a Socket.IO');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Emitir evento de autenticación si hay usuario logueado
      const userData = this.getUserData();
      if (userData) {
        this.authenticate(userData);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('? Desconectado de Socket.IO:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión Socket.IO:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Máximo número de intentos de reconexión alcanzado');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`?? Reconectado en intento ${attemptNumber}`);
      this.isConnected = true;
    });

    // Eventos específicos de la aplicación
    this.socket.on('users_online', (users) => {
      this.handleUsersOnline(users);
    });

    this.socket.on('appointment_updated', (data) => {
      this.handleAppointmentUpdate(data);
    });

    this.socket.on('new_appointment', (data) => {
      this.handleNewAppointment(data);
    });

    this.socket.on('appointment_reminder', (data) => {
      this.handleAppointmentReminder(data);
    });

    this.socket.on('test_notification', (data) => {
      this.handleTestNotification(data);
    });
  }

  // Autenticar usuario
  authenticate(userData: { userId: string; name: string; role: string; companyId?: string }) {
    if (this.socket && this.isConnected) {
      this.socket.emit('authenticate', userData);
      console.log('?? Usuario autenticado en Socket.IO:', userData.name);
    }
  }

  // Unirse a una sala
  joinRoom(room: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_room', room);
      console.log(`?? Unido a la sala: ${room}`);
    }
  }

  // Salir de una sala
  leaveRoom(room: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_room', room);
      console.log(`?? Salió de la sala: ${room}`);
    }
  }

  // Handlers para eventos específicos
  private handleUsersOnline(users: any[]) {
    console.log('?? Usuarios conectados:', users);
    // Emitir evento personalizado para que los componentes puedan escuchar
    window.dispatchEvent(new CustomEvent('usersOnlineUpdate', { detail: users }));
  }

  private handleAppointmentUpdate(data: any) {
    console.log('?? Cita actualizada:', data);
    window.dispatchEvent(new CustomEvent('appointmentUpdate', { detail: data }));

    // Mostrar notificación toast
    this.showNotification('Cita actualizada', `Estado: ${data.status}`, 'info');
  }

  private handleNewAppointment(data: any) {
    console.log('?? Nueva cita:', data);
    window.dispatchEvent(new CustomEvent('newAppointment', { detail: data }));

    this.showNotification('Nueva cita', `Cita programada para ${data.date} a las ${data.time}`, 'success');
  }

  private handleAppointmentReminder(data: any) {
    console.log('? Recordatorio de cita:', data);
    window.dispatchEvent(new CustomEvent('appointmentReminder', { detail: data }));

    this.showNotification('Recordatorio', `Tienes una cita en 1 hora`, 'warning');
  }

  private handleTestNotification(data: any) {
    console.log('?? Notificación de prueba:', data);
    this.showNotification('Prueba', data.message, 'info');
  }

  // Mostrar notificación (usando la librería de notificaciones que tengas)
  private showNotification(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') {
    // Puedes integrar con sonner, react-hot-toast, etc.
    if (window.showToast) {
      window.showToast({ title, message, type });
    } else {
      console.log(`${type.toUpperCase()}: ${title} - ${message}`);
    }
  }

  // Obtener datos del usuario desde localStorage o contexto
  private getUserData() {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  // Registrar listener personalizado
  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remover listener
  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emitir evento
  emit(event: string, data?: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  // Desconectar
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  // Getters
  get connected() {
    return this.isConnected;
  }

  get socketId() {
    return this.socket?.id;
  }
}

// Instancia singleton
export const socketService = new SocketService();
export default socketService;
