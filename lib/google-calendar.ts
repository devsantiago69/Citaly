import { google } from 'googleapis';
import { supabase } from './supabase';

// Configuración de Google Calendar API
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/google/callback';

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
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );
  }

  // Generar URL de autorización
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
  }

  // Intercambiar código por tokens
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  // Configurar cliente con tokens
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Refrescar token de acceso
  async refreshAccessToken(refreshToken: string) {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
    
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }

  // Obtener lista de calendarios del usuario
  async getCalendarList(): Promise<GoogleCalendar[]> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const response = await calendar.calendarList.list();
    return response.data.items || [];
  }

  // Obtener eventos de un calendario específico
  async getEvents(
    calendarId: string, 
    timeMin?: string, 
    timeMax?: string,
    maxResults: number = 250
  ): Promise<GoogleCalendarEvent[]> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin || new Date().toISOString(),
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items || [];
  }

  // Crear evento en Google Calendar
  async createEvent(calendarId: string, event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event
    });

    return response.data;
  }

  // Actualizar evento en Google Calendar
  async updateEvent(
    calendarId: string, 
    eventId: string, 
    event: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: event
    });

    return response.data;
  }

  // Eliminar evento de Google Calendar
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    await calendar.events.delete({
      calendarId,
      eventId
    });
  }

  // Obtener un evento específico
  async getEvent(calendarId: string, eventId: string): Promise<GoogleCalendarEvent> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const response = await calendar.events.get({
      calendarId,
      eventId
    });

    return response.data;
  }

  // Crear watch para recibir notificaciones de cambios
  async watchCalendar(calendarId: string, webhookUrl: string): Promise<any> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const response = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: `citaly-${Date.now()}`,
        type: 'web_hook',
        address: webhookUrl,
        params: {
          ttl: '3600' // 1 hora
        }
      }
    });

    return response.data;
  }
}

// Servicio de sincronización
export class CalendarSyncService {
  private googleService: GoogleCalendarService;

  constructor() {
    this.googleService = new GoogleCalendarService();
  }

  // Sincronizar calendario de Google con el sistema
  async syncGoogleCalendar(
    userId: string, 
    googleCalendarId: string,
    direction: 'bidireccional' | 'solo_importar' | 'solo_exportar' = 'bidireccional'
  ) {
    try {
      // Obtener configuración del calendario
      const { data: calendarConfig } = await supabase
        .from('google_calendars')
        .select('*')
        .eq('usuario_id', userId)
        .eq('google_calendar_id', googleCalendarId)
        .single();

      if (!calendarConfig) {
        throw new Error('Calendario no encontrado');
      }

      // Configurar tokens
      this.googleService.setCredentials({
        access_token: calendarConfig.access_token,
        refresh_token: calendarConfig.refresh_token
      });

      const logId = await this.createSyncLog(calendarConfig.id, 'import');

      try {
        if (direction === 'bidireccional' || direction === 'solo_importar') {
          await this.importEventsFromGoogle(calendarConfig);
        }

        if (direction === 'bidireccional' || direction === 'solo_exportar') {
          await this.exportEventsToGoogle(calendarConfig);
        }

        await this.completeSyncLog(logId, 'exitoso');
        
        // Actualizar último sync
        await supabase
          .from('google_calendars')
          .update({ ultimo_sync: new Date().toISOString() })
          .eq('id', calendarConfig.id);

      } catch (error) {
        await this.completeSyncLog(logId, 'error', error.message);
        throw error;
      }

    } catch (error) {
      console.error('Error en sincronización:', error);
      throw error;
    }
  }

  // Importar eventos desde Google Calendar
  private async importEventsFromGoogle(calendarConfig: any) {
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30); // 30 días atrás
    
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 90); // 90 días adelante

    const events = await this.googleService.getEvents(
      calendarConfig.google_calendar_id,
      timeMin.toISOString(),
      timeMax.toISOString()
    );

    for (const event of events) {
      await this.processGoogleEvent(calendarConfig, event);
    }
  }

  // Procesar un evento de Google Calendar
  private async processGoogleEvent(calendarConfig: any, googleEvent: GoogleCalendarEvent) {
    // Verificar si el evento ya existe
    const { data: existingEvent } = await supabase
      .from('google_events')
      .select('*')
      .eq('google_calendar_id', calendarConfig.id)
      .eq('google_event_id', googleEvent.id)
      .single();

    const eventData = {
      google_calendar_id: calendarConfig.id,
      google_event_id: googleEvent.id,
      titulo: googleEvent.summary,
      descripcion: googleEvent.description,
      fecha_inicio: googleEvent.start.dateTime || googleEvent.start.date,
      fecha_fin: googleEvent.end.dateTime || googleEvent.end.date,
      zona_horaria: googleEvent.start.timeZone || calendarConfig.zona_horaria,
      es_todo_el_dia: !!googleEvent.start.date,
      ubicacion: googleEvent.location,
      estado: googleEvent.status,
      asistentes: googleEvent.attendees || [],
      recordatorios: googleEvent.reminders || {},
      recurrencia: googleEvent.recurrence,
      metadata_google: googleEvent,
      last_modified: googleEvent.updated,
      sync_direction: 'importado'
    };

    if (existingEvent) {
      // Actualizar evento existente
      await supabase
        .from('google_events')
        .update(eventData)
        .eq('id', existingEvent.id);
    } else {
      // Crear nuevo evento
      await supabase
        .from('google_events')
        .insert(eventData);
    }

    // Intentar crear/actualizar cita correspondiente si es relevante
    await this.createOrUpdateAppointmentFromEvent(calendarConfig, googleEvent, eventData);
  }

  // Crear o actualizar cita desde evento de Google
  private async createOrUpdateAppointmentFromEvent(
    calendarConfig: any, 
    googleEvent: GoogleCalendarEvent, 
    eventData: any
  ) {
    // Solo procesar eventos que parezcan citas (tienen ciertos criterios)
    if (!this.isAppointmentLikeEvent(googleEvent)) {
      return;
    }

    // Buscar si ya existe una cita vinculada
    const { data: existingCita } = await supabase
      .from('citas')
      .select('*')
      .eq('google_event_id', googleEvent.id)
      .single();

    if (existingCita) {
      // Actualizar cita existente
      await this.updateAppointmentFromGoogleEvent(existingCita.id, googleEvent);
    } else {
      // Crear nueva cita si es posible
      await this.createAppointmentFromGoogleEvent(calendarConfig, googleEvent);
    }
  }

  // Verificar si un evento parece una cita
  private isAppointmentLikeEvent(event: GoogleCalendarEvent): boolean {
    // Criterios para determinar si es una cita:
    // - Duración entre 15 minutos y 4 horas
    // - No es evento de todo el día
    // - Tiene título descriptivo
    
    if (event.start.date) return false; // Es todo el día
    
    const start = new Date(event.start.dateTime!);
    const end = new Date(event.end.dateTime!);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    
    return durationMinutes >= 15 && durationMinutes <= 240 && event.summary.length > 3;
  }

  // Exportar citas del sistema a Google Calendar
  private async exportEventsToGoogle(calendarConfig: any) {
    // Obtener citas pendientes de sincronización
    const { data: citas } = await supabase
      .from('citas')
      .select(`
        *,
        clientes!inner(usuario_id, usuarios!inner(nombre, apellidos, email)),
        servicios!inner(nombre, descripcion, duracion),
        personal(usuarios!inner(nombre))
      `)
      .eq('empresa_id', calendarConfig.empresa_id)
      .or('sync_status.eq.pendiente,google_event_id.is.null')
      .gte('fecha', new Date().toISOString().split('T')[0]);

    for (const cita of citas || []) {
      await this.exportAppointmentToGoogle(calendarConfig, cita);
    }
  }

  // Exportar una cita específica a Google Calendar
  private async exportAppointmentToGoogle(calendarConfig: any, cita: any) {
    const startDateTime = new Date(`${cita.fecha}T${cita.hora}`);
    const endDateTime = new Date(startDateTime.getTime() + (cita.duracion * 60 * 1000));

    const googleEvent: Partial<GoogleCalendarEvent> = {
      summary: `${cita.servicios.nombre} - ${cita.clientes.usuarios.nombre} ${cita.clientes.usuarios.apellidos}`,
      description: `
Servicio: ${cita.servicios.nombre}
Cliente: ${cita.clientes.usuarios.nombre} ${cita.clientes.usuarios.apellidos}
Email: ${cita.clientes.usuarios.email}
${cita.personal?.usuarios?.nombre ? `Profesional: ${cita.personal.usuarios.nombre}` : ''}
${cita.notas ? `Notas: ${cita.notas}` : ''}

Creado desde Citaly
      `.trim(),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: calendarConfig.zona_horaria
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: calendarConfig.zona_horaria
      },
      status: this.mapCitaStatusToGoogle(cita.estado),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 }
        ]
      }
    };

    try {
      let googleEventResult;
      
      if (cita.google_event_id) {
        // Actualizar evento existente
        googleEventResult = await this.googleService.updateEvent(
          calendarConfig.google_calendar_id,
          cita.google_event_id,
          googleEvent
        );
      } else {
        // Crear nuevo evento
        googleEventResult = await this.googleService.createEvent(
          calendarConfig.google_calendar_id,
          googleEvent
        );
      }

      // Actualizar cita con ID del evento de Google
      await supabase
        .from('citas')
        .update({
          google_event_id: googleEventResult.id,
          sync_status: 'sincronizado',
          last_sync: new Date().toISOString()
        })
        .eq('id', cita.id);

      // Guardar evento en google_events
      await supabase
        .from('google_events')
        .upsert({
          google_calendar_id: calendarConfig.id,
          cita_id: cita.id,
          google_event_id: googleEventResult.id,
          titulo: googleEventResult.summary,
          descripcion: googleEventResult.description,
          fecha_inicio: googleEventResult.start.dateTime || googleEventResult.start.date,
          fecha_fin: googleEventResult.end.dateTime || googleEventResult.end.date,
          zona_horaria: googleEventResult.start.timeZone || calendarConfig.zona_horaria,
          es_todo_el_dia: !!googleEventResult.start.date,
          ubicacion: googleEventResult.location,
          estado: googleEventResult.status,
          metadata_google: googleEventResult,
          sync_direction: 'exportado',
          last_modified: googleEventResult.updated
        });

    } catch (error) {
      // Marcar como error de sincronización
      await supabase
        .from('citas')
        .update({
          sync_status: 'error',
          sync_error: error.message,
          last_sync: new Date().toISOString()
        })
        .eq('id', cita.id);
      
      throw error;
    }
  }

  // Mapear estado de cita a estado de Google
  private mapCitaStatusToGoogle(estado: string): 'confirmed' | 'tentative' | 'cancelled' {
    switch (estado) {
      case 'confirmada':
      case 'completada':
        return 'confirmed';
      case 'programada':
      case 'en_progreso':
        return 'tentative';
      case 'cancelada':
        return 'cancelled';
      default:
        return 'tentative';
    }
  }

  // Crear log de sincronización
  private async createSyncLog(googleCalendarId: string, tipoOperacion: string): Promise<string> {
    const { data, error } = await supabase
      .from('calendar_sync_logs')
      .insert({
        google_calendar_id: googleCalendarId,
        tipo_operacion: tipoOperacion,
        estado: 'exitoso', // Se actualizará al completar
        tiempo_inicio: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  // Completar log de sincronización
  private async completeSyncLog(logId: string, estado: string, errorMessage?: string) {
    await supabase
      .from('calendar_sync_logs')
      .update({
        estado,
        tiempo_fin: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', logId);
  }

  // Crear cita desde evento de Google
  private async createAppointmentFromGoogleEvent(calendarConfig: any, googleEvent: GoogleCalendarEvent) {
    // Esta función requiere lógica de negocio específica
    // Por ahora, solo guardamos el evento sin crear cita automáticamente
    console.log('Evento importado sin crear cita automática:', googleEvent.summary);
  }

  // Actualizar cita desde evento de Google
  private async updateAppointmentFromGoogleEvent(citaId: string, googleEvent: GoogleCalendarEvent) {
    const startDateTime = new Date(googleEvent.start.dateTime || googleEvent.start.date!);
    
    await supabase
      .from('citas')
      .update({
        fecha: startDateTime.toISOString().split('T')[0],
        hora: startDateTime.toTimeString().split(' ')[0].substring(0, 5),
        estado: this.mapGoogleStatusToCita(googleEvent.status),
        sync_status: 'sincronizado',
        last_sync: new Date().toISOString()
      })
      .eq('id', citaId);
  }

  // Mapear estado de Google a estado de cita
  private mapGoogleStatusToCita(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'confirmada';
      case 'tentative':
        return 'programada';
      case 'cancelled':
        return 'cancelada';
      default:
        return 'programada';
    }
  }
}

// Hook para usar Google Calendar
export const useGoogleCalendar = () => {
  const googleService = new GoogleCalendarService();
  const syncService = new CalendarSyncService();

  return {
    googleService,
    syncService,
    getAuthUrl: () => googleService.getAuthUrl(),
    getTokens: (code: string) => googleService.getTokens(code),
    syncCalendar: (userId: string, calendarId: string, direction?: any) => 
      syncService.syncGoogleCalendar(userId, calendarId, direction)
  };
};