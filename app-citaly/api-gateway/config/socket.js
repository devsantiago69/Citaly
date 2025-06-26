const socketIO = require('socket.io');
const logger = require('../logger');

class SocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: ["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.io.on('connection', (socket) => {
      logger.info(`Usuario conectado: ${socket.id}`);

      // Evento de autenticación de usuario
      socket.on('authenticate', (userData) => {
        this.connectedUsers.set(socket.id, {
          ...userData,
          socketId: socket.id,
          connectedAt: new Date()
        });

        socket.join(`user_${userData.userId}`);
        if (userData.companyId) {
          socket.join(`company_${userData.companyId}`);
        }

        logger.info(`Usuario autenticado: ${userData.name} (${socket.id})`);

        // Enviar lista de usuarios conectados
        this.broadcastConnectedUsers();
      });

      // Evento de desconexión
      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          logger.info(`Usuario desconectado: ${user.name} (${socket.id})`);
          this.connectedUsers.delete(socket.id);
          this.broadcastConnectedUsers();
        }
      });

      // Eventos de notificaciones en tiempo real
      socket.on('join_room', (room) => {
        socket.join(room);
        logger.info(`Usuario ${socket.id} se unió a la sala: ${room}`);
      });

      socket.on('leave_room', (room) => {
        socket.leave(room);
        logger.info(`Usuario ${socket.id} dejó la sala: ${room}`);
      });
    });

    logger.info('Socket.IO inicializado correctamente');
    return this.io;
  }

  // Broadcast de usuarios conectados
  broadcastConnectedUsers() {
    const users = Array.from(this.connectedUsers.values()).map(user => ({
      userId: user.userId,
      name: user.name,
      role: user.role,
      connectedAt: user.connectedAt
    }));

    this.io.emit('users_online', users);
  }

  // Enviar notificación a usuario específico
  notifyUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(event, {
        timestamp: new Date().toISOString(),
        ...data
      });
      logger.info(`Notificación enviada a usuario ${userId}: ${event}`);
    }
  }

  // Enviar notificación a toda la empresa
  notifyCompany(companyId, event, data) {
    if (this.io) {
      this.io.to(`company_${companyId}`).emit(event, {
        timestamp: new Date().toISOString(),
        ...data
      });
      logger.info(`Notificación enviada a empresa ${companyId}: ${event}`);
    }
  }

  // Enviar notificación global
  notifyAll(event, data) {
    if (this.io) {
      this.io.emit(event, {
        timestamp: new Date().toISOString(),
        ...data
      });
      logger.info(`Notificación global enviada: ${event}`);
    }
  }

  // Enviar actualización de cita
  notifyAppointmentUpdate(appointmentData) {
    const { company_id, client_id, staff_id } = appointmentData;

    this.notifyCompany(company_id, 'appointment_updated', appointmentData);

    if (client_id) {
      this.notifyUser(client_id, 'appointment_updated', appointmentData);
    }

    if (staff_id) {
      this.notifyUser(staff_id, 'appointment_updated', appointmentData);
    }
  }

  // Enviar notificación de nueva cita
  notifyNewAppointment(appointmentData) {
    const { company_id, client_id, staff_id } = appointmentData;

    this.notifyCompany(company_id, 'new_appointment', appointmentData);

    if (staff_id) {
      this.notifyUser(staff_id, 'new_appointment', appointmentData);
    }
  }

  // Enviar recordatorio de cita
  notifyAppointmentReminder(appointmentData) {
    const { client_id, staff_id } = appointmentData;

    if (client_id) {
      this.notifyUser(client_id, 'appointment_reminder', appointmentData);
    }

    if (staff_id) {
      this.notifyUser(staff_id, 'appointment_reminder', appointmentData);
    }
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.values());
  }

  getIO() {
    return this.io;
  }
}

// Exportar instancia singleton
const socketManager = new SocketManager();
module.exports = socketManager;
