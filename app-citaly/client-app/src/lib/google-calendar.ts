import { googleCalendarAPI, authAPI } from './api-client';

// Scopes necesarios para Google Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  recurrence?: string[];
  updated: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole: 'owner' | 'reader' | 'writer' | 'freeBusyReader';
  primary?: boolean;
}

export class GoogleCalendarService {
  private userId: string | null = null;
  private empresaId: string | null = null;

  constructor() {
    // La autenticación ahora se maneja a través de nuestro backend
    // Obtenemos el userId del localStorage o contexto de autenticación
    this.initializeUser();
  }

  private async initializeUser() {
    // Aquí podrías obtener el userId del contexto de autenticación
    // Por ahora usamos localStorage como ejemplo
    this.userId = localStorage.getItem('userId');
    this.empresaId = localStorage.getItem('empresaId');
  }

  // Generar URL de autorización
  async getAuthUrl(): Promise<string> {
    try {
      const response = await googleCalendarAPI.getAuthUrl();
      return response.authUrl;
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      throw error;
    }
  }

  // Intercambiar código por tokens y guardar en backend
  async exchangeCodeForTokens(code: string) {
    try {
      return await googleCalendarAPI.exchangeCodeForTokens(code);
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  // Obtener configuración de sincronización
  async getSyncConfiguration() {
    try {
      if (!this.empresaId) throw new Error('Empresa ID not found');
      return await googleCalendarAPI.getSyncConfig(this.empresaId);
    } catch (error) {
      console.error('Error getting sync configuration:', error);
      throw error;
    }
  }

  // Actualizar configuración de sincronización
  async updateSyncConfiguration(config: {
    auto_sync_enabled?: boolean;
    sync_interval_minutes?: number;
    sync_direction?: string;
    default_calendar_id?: string;
  }) {
    try {
      if (!this.empresaId) throw new Error('Empresa ID not found');
      return await googleCalendarAPI.updateSyncConfig(this.empresaId, config);
    } catch (error) {
      console.error('Error updating sync configuration:', error);
      throw error;
    }
  }

  // Obtener lista de calendarios del usuario
  async getCalendarList(): Promise<GoogleCalendar[]> {
    try {
      if (!this.userId) throw new Error('User ID not found');
      return await googleCalendarAPI.getUserCalendars(this.userId);
    } catch (error) {
      console.error('Error getting calendar list:', error);
      throw error;
    }
  }

  // Sincronizar calendario específico
  async syncCalendar(calendarId: string, options = {}) {
    try {
      return await googleCalendarAPI.syncCalendar(calendarId, options);
    } catch (error) {
      console.error('Error syncing calendar:', error);
      throw error;
    }
  }

  // Obtener logs de sincronización
  async getSyncLogs(limit: number = 50) {
    try {
      if (!this.userId) throw new Error('User ID not found');
      return await googleCalendarAPI.getSyncLogs(this.userId, limit);
    } catch (error) {
      console.error('Error getting sync logs:', error);
      throw error;
    }
  }

  // Obtener estadísticas
  async getStats() {
    try {
      if (!this.empresaId) throw new Error('Empresa ID not found');
      return await googleCalendarAPI.getStats(this.empresaId);
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  // Guardar calendarios seleccionados
  async saveSelectedCalendars(calendars: any[], tokens: any) {
    try {
      if (!this.userId) throw new Error('User ID not found');
      return await googleCalendarAPI.saveSelectedCalendars(calendars, tokens, this.userId);
    } catch (error) {
      console.error('Error saving selected calendars:', error);
      throw error;
    }
  }

  // Obtener lista de calendarios desde Google (con tokens)
  async getCalendarListFromGoogle(tokens: any) {
    try {
      return await googleCalendarAPI.getCalendarList(tokens);
    } catch (error) {
      console.error('Error getting calendar list from Google:', error);
      throw error;
    }
  }

  // Métodos de utilidad para compatibilidad
  async getEvents(calendarId: string, timeMin?: string, timeMax?: string) {
    // Por ahora delegamos a la sincronización
    // En el futuro se podría implementar una consulta directa
    return this.syncCalendar(calendarId, { timeMin, timeMax });
  }

  async createEvent(calendarId: string, event: Partial<GoogleCalendarEvent>) {
    // Este método requeriría una implementación específica en el backend
    console.warn('createEvent not implemented yet');
    throw new Error('createEvent not implemented yet');
  }

  async updateEvent(calendarId: string, eventId: string, event: Partial<GoogleCalendarEvent>) {
    // Este método requeriría una implementación específica en el backend
    console.warn('updateEvent not implemented yet');
    throw new Error('updateEvent not implemented yet');
  }

  async deleteEvent(calendarId: string, eventId: string) {
    // Este método requeriría una implementación específica en el backend
    console.warn('deleteEvent not implemented yet');
    throw new Error('deleteEvent not implemented yet');
  }

  // Verificar estado de la conexión con Google
  async checkConnectionStatus() {
    try {
      if (!this.userId) throw new Error('User ID not found');
      const calendars = await this.getCalendarList();
      return { connected: calendars.length > 0, calendars };
    } catch (error) {
      console.warn('Google Calendar no está disponible:', error);
      return { connected: false, error: error.message };
    }
  }

  // Desconectar cuenta de Google
  async disconnectGoogleAccount() {
    try {
      // Limpiar datos locales
      localStorage.removeItem('google_tokens');
      
      // Aquí se podría hacer una llamada al backend para eliminar los tokens
      console.log('Google account disconnected');
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting Google account:', error);
      throw error;
    }
  }
}

// Instancia del servicio
export const googleCalendarService = new GoogleCalendarService();

// Funciones de utilidad para compatibilidad con código existente
export const getGoogleAuthUrl = () => googleCalendarService.getAuthUrl();
export const exchangeCodeForTokens = (code: string) => googleCalendarService.exchangeCodeForTokens(code);
export const getCalendarList = () => googleCalendarService.getCalendarList();
export const syncCalendar = (calendarId: string, options = {}) => googleCalendarService.syncCalendar(calendarId, options);
export const getSyncLogs = (limit = 50) => googleCalendarService.getSyncLogs(limit);
export const getStats = () => googleCalendarService.getStats();

export default googleCalendarService;
