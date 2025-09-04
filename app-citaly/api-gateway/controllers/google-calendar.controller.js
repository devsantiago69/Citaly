const db = require('../config/db');
const { google } = require('googleapis');
const logger = require('../logger');

// Verificar si Google Calendar está configurado
const isGoogleCalendarConfigured = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  return clientId && 
         clientSecret && 
         clientId !== 'your_google_client_id' && 
         clientSecret !== 'your_google_client_secret';
};

// Configuración de Google Calendar API
let oauth2Client = null;
let calendar = null;

// Inicializar cliente OAuth solo si está configurado
if (isGoogleCalendarConfigured()) {
  oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/google/callback'
  );
  
  calendar = google.calendar({ version: 'v3', auth: oauth2Client });
} else {
  logger.warn('Google Calendar not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
}

const googleCalendarController = {
  // Verificar configuración
  checkConfiguration: (req, res) => {
    try {
      const configured = isGoogleCalendarConfigured();
      res.json({
        configured,
        clientIdSet: !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id',
        clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== 'your_google_client_secret',
        redirectUriSet: !!process.env.GOOGLE_REDIRECT_URI,
        message: configured ? 'Google Calendar is properly configured' : 'Google Calendar requires configuration'
      });
    } catch (error) {
      logger.error('Error checking configuration:', error);
      res.status(500).json({ 
        error: 'Error checking configuration',
        details: error.message 
      });
    }
  },

  // Generar URL de autorización
  getAuthUrl: (req, res) => {
    try {
      if (!isGoogleCalendarConfigured()) {
        return res.status(400).json({
          error: 'Google Calendar not configured',
          message: 'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables',
          instructions: 'Go to https://console.cloud.google.com/ to create OAuth 2.0 credentials'
        });
      }

      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });

      res.json({ authUrl });
    } catch (error) {
      logger.error('Error generating auth URL:', error);
      res.status(500).json({ error: 'Error generando URL de autorización', details: error.message });
    }
  },

  // Intercambiar código por tokens
  exchangeCodeForTokens: async (req, res) => {
    try {
      const { code } = req.body;
      const userId = req.user.id;
      const empresaId = req.user.empresa_id;
      
      if (!code) {
        return res.status(400).json({ error: 'Código de autorización requerido' });
      }

      if (!isGoogleCalendarConfigured()) {
        return res.status(400).json({ error: 'Google Calendar no está configurado' });
      }

      // Intercambiar código por tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Obtener información del usuario de Google
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: googleUser } = await oauth2.userinfo.get();

      // Guardar tokens en la base de datos
      const db = require('../config/db');
      
      // Verificar si ya existe un registro para este usuario y cuenta de Google
      const [existing] = await db.execute(
        'SELECT id FROM google_oauth_tokens WHERE usuario_id = ? AND google_user_id = ?',
        [userId, googleUser.id]
      );

      if (existing.length > 0) {
        // Actualizar tokens existentes
        await db.execute(`
          UPDATE google_oauth_tokens 
          SET access_token = ?, refresh_token = ?, expiry_date = ?, 
              google_user_email = ?, fecha_actualizacion = NOW(), activo = TRUE
          WHERE id = ?
        `, [
          tokens.access_token,
          tokens.refresh_token || null,
          tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          googleUser.email,
          existing[0].id
        ]);
        
        logger.info(`Tokens actualizados para usuario ${userId}, Google user ${googleUser.email}`);
      } else {
        // Insertar nuevos tokens
        await db.execute(`
          INSERT INTO google_oauth_tokens 
          (usuario_id, empresa_id, access_token, refresh_token, token_type, scope, expiry_date, 
           google_user_email, google_user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId,
          empresaId,
          tokens.access_token,
          tokens.refresh_token || null,
          tokens.token_type || 'Bearer',
          tokens.scope || null,
          tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          googleUser.email,
          googleUser.id
        ]);
        
        logger.info(`Nuevos tokens guardados para usuario ${userId}, Google user ${googleUser.email}`);
      }

      res.json({ 
        success: true,
        message: 'Autorización completada exitosamente',
        googleUser: {
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture
        }
      });
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      res.status(500).json({ 
        error: 'Error intercambiando código por tokens', 
        details: error.message 
      });
    }
  },

  // Obtener lista de calendarios del usuario
  getCalendarList: async (req, res) => {
    try {
      const userId = req.user.id;
      const empresaId = req.user.empresa_id;
      
      if (!isGoogleCalendarConfigured()) {
        return res.status(400).json({ error: 'Google Calendar no está configurado' });
      }

      // Obtener tokens del usuario
      const db = require('../config/db');
      const [tokenRows] = await db.execute(
        'SELECT * FROM google_oauth_tokens WHERE usuario_id = ? AND activo = TRUE ORDER BY fecha_actualizacion DESC LIMIT 1',
        [userId]
      );

      if (tokenRows.length === 0) {
        return res.status(401).json({ error: 'No hay tokens de Google Calendar para este usuario' });
      }

      const tokenData = tokenRows[0];
      
      // Configurar OAuth client con los tokens del usuario
      oauth2Client.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: tokenData.expiry_date ? new Date(tokenData.expiry_date).getTime() : null
      });

      // Obtener lista de calendarios
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const response = await calendar.calendarList.list({
        showHidden: false,
        showDeleted: false
      });
      const calendars = response.data.items || [];

      const calendarios = calendars.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description || '',
        timeZone: cal.timeZone,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        accessRole: cal.accessRole,
        primary: cal.primary || false,
        selected: cal.selected || false
      }));

      res.json({ calendars: calendarios });
    } catch (error) {
      logger.error('Error getting calendar list:', error);
      res.status(500).json({ error: 'Error obteniendo lista de calendarios', details: error.message });
    }
  },

  // Guardar calendarios seleccionados
  saveSelectedCalendars: async (req, res) => {
    try {
      const { calendars } = req.body;
      const userId = req.user.id;
      const empresaId = req.user.empresa_id;

      if (!calendars || !Array.isArray(calendars)) {
        return res.status(400).json({ 
          error: 'Datos de calendarios inválidos' 
        });
      }

      const selectedCalendars = calendars.filter(cal => cal.selected);
      
      if (selectedCalendars.length === 0) {
        return res.status(400).json({ 
          error: 'Debe seleccionar al menos un calendario' 
        });
      }

      // Iniciar transacción
      await db.promise().query('START TRANSACTION');

      try {
        // Primero eliminar calendarios existentes para este usuario
        await db.promise().query(
          'DELETE FROM google_calendars WHERE usuario_id = ?',
          [userId]
        );

        // Insertar los nuevos calendarios seleccionados
        for (const calendar of selectedCalendars) {
          await db.promise().query(`
            INSERT INTO google_calendars (
              usuario_id,
              empresa_id,
              google_calendar_id,
              calendar_name,
              calendar_description,
              time_zone,
              background_color,
              foreground_color,
              access_role,
              is_primary,
              is_active,
              sync_enabled,
              last_sync_at,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())
          `, [
            userId,
            empresaId,
            calendar.id,
            calendar.summary || '',
            calendar.description || '',
            calendar.timeZone || 'UTC',
            calendar.backgroundColor || '#3174ad',
            calendar.foregroundColor || '#ffffff',
            calendar.accessRole || 'reader',
            calendar.primary || false,
            true, // is_active
            true  // sync_enabled
          ]);
        }

        // Confirmar transacción
        await db.promise().query('COMMIT');

        // Obtener conteo final de calendarios guardados
        const [countResult] = await db.promise().query(
          'SELECT COUNT(*) as count FROM google_calendars WHERE usuario_id = ? AND is_active = 1',
          [userId]
        );

        const calendarsCount = countResult[0].count;

        res.json({ 
          success: true, 
          message: `${calendarsCount} calendario(s) guardado(s) exitosamente`,
          calendarsCount: calendarsCount,
          calendars: selectedCalendars.map(cal => ({
            id: cal.id,
            name: cal.summary,
            selected: true
          }))
        });

      } catch (dbError) {
        // Rollback en caso de error
        await db.promise().query('ROLLBACK');
        throw dbError;
      }

    } catch (error) {
      console.error('Error saving calendars:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor al guardar calendarios',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Obtener calendarios del usuario
  getUserCalendars: async (req, res) => {
    try {
      const userId = req.params.userId;

      const [rows] = await db.execute(`
        SELECT gc.*, 
               COUNT(ge.id) as total_events,
               COUNT(CASE WHEN ge.sync_status = 'sincronizado' THEN 1 END) as synced_events
        FROM google_calendars gc
        LEFT JOIN google_events ge ON gc.id = ge.google_calendar_id
        WHERE gc.usuario_id = ? AND gc.activo = true
        GROUP BY gc.id
        ORDER BY gc.es_principal DESC, gc.fecha_creacion ASC
      `, [userId]);

      res.json({ calendars: rows });
    } catch (error) {
      logger.error('Error getting user calendars:', error);
      res.status(500).json({ error: 'Error obteniendo calendarios del usuario', details: error.message });
    }
  },

  // Sincronizar calendario específico
  syncCalendar: async (req, res) => {
    try {
      const { calendarId } = req.params;
      const { direction = 'bidireccional', force = false } = req.body;

      // Obtener configuración del calendario
      const [calRows] = await db.execute(`
        SELECT gc.*, u.empresa_id
        FROM google_calendars gc
        JOIN usuarios u ON gc.usuario_id = u.id
        WHERE gc.id = ? AND gc.activo = true
      `, [calendarId]);

      if (calRows.length === 0) {
        return res.status(404).json({ error: 'Calendario no encontrado' });
      }

      const calendarConfig = calRows[0];

      // Verificar si necesita sincronización
      if (!force && calendarConfig.ultimo_sync) {
        const lastSync = new Date(calendarConfig.ultimo_sync);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
        
        // Obtener intervalo de sincronización
        const [syncConfigRows] = await db.execute(
          'SELECT sync_interval_minutes FROM sync_configuration WHERE empresa_id = ?',
          [calendarConfig.empresa_id]
        );
        
        const intervalMinutes = syncConfigRows[0]?.sync_interval_minutes || 15;
        
        if (diffMinutes < intervalMinutes) {
          return res.json({
            message: 'Sincronización no necesaria aún',
            nextSyncIn: intervalMinutes - diffMinutes
          });
        }
      }

      // Crear log de sincronización
      const [logResult] = await db.execute(`
        INSERT INTO calendar_sync_logs 
        (google_calendar_id, tipo_operacion, estado, tiempo_inicio, eventos_procesados, eventos_exitosos, eventos_con_error)
        VALUES (?, ?, 'exitoso', NOW(), 0, 0, 0)
      `, [calendarId, direction]);

      const logId = logResult.insertId;

      try {
        // Configurar cliente OAuth
        oauth2Client.setCredentials({
          access_token: calendarConfig.access_token,
          refresh_token: calendarConfig.refresh_token
        });

        let eventosProcessed = 0;
        let eventosExitosos = 0;
        let eventosConError = 0;

        // Importar eventos de Google
        if (direction === 'bidireccional' || direction === 'solo_importar') {
          const importResult = await importEventsFromGoogle(calendarConfig);
          eventosProcessed += importResult.processed;
          eventosExitosos += importResult.successful;
          eventosConError += importResult.errors;
        }

        // Exportar eventos a Google
        if (direction === 'bidireccional' || direction === 'solo_exportar') {
          const exportResult = await exportEventsToGoogle(calendarConfig);
          eventosProcessed += exportResult.processed;
          eventosExitosos += exportResult.successful;
          eventosConError += exportResult.errors;
        }

        // Actualizar último sync
        await db.execute(
          'UPDATE google_calendars SET ultimo_sync = NOW() WHERE id = ?',
          [calendarId]
        );

        // Completar log
        await db.execute(`
          UPDATE calendar_sync_logs 
          SET tiempo_fin = NOW(), eventos_procesados = ?, eventos_exitosos = ?, eventos_con_error = ?
          WHERE id = ?
        `, [eventosProcessed, eventosExitosos, eventosConError, logId]);

        res.json({
          success: true,
          message: 'Sincronización completada',
          stats: {
            processed: eventosProcessed,
            successful: eventosExitosos,
            errors: eventosConError
          }
        });

      } catch (syncError) {
        // Actualizar log con error
        await db.execute(`
          UPDATE calendar_sync_logs 
          SET estado = 'error', tiempo_fin = NOW(), error_message = ?
          WHERE id = ?
        `, [syncError.message, logId]);

        throw syncError;
      }

    } catch (error) {
      logger.error('Error syncing calendar:', error);
      res.status(500).json({ error: 'Error sincronizando calendario', details: error.message });
    }
  },

  // Obtener logs de sincronización
  getSyncLogs: async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 10 } = req.query;

      const [rows] = await db.execute(`
        SELECT csl.*, gc.nombre as calendar_name
        FROM calendar_sync_logs csl
        JOIN google_calendars gc ON csl.google_calendar_id = gc.id
        WHERE gc.usuario_id = ?
        ORDER BY csl.fecha_creacion DESC
        LIMIT ?
      `, [userId, parseInt(limit)]);

      res.json({ logs: rows });
    } catch (error) {
      logger.error('Error getting sync logs:', error);
      res.status(500).json({ error: 'Error obteniendo logs de sincronización', details: error.message });
    }
  }
};

// Funciones auxiliares
async function importEventsFromGoogle(calendarConfig) {
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 30);
  
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 90);

  try {
    const response = await calendar.events.list({
      calendarId: calendarConfig.google_calendar_id,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];
    let processed = 0;
    let successful = 0;
    let errors = 0;

    for (const event of events) {
      processed++;
      try {
        await processGoogleEvent(calendarConfig, event);
        successful++;
      } catch (error) {
        logger.error(`Error processing event ${event.id}:`, error);
        errors++;
      }
    }

    return { processed, successful, errors };
  } catch (error) {
    throw new Error(`Error importing events: ${error.message}`);
  }
}

async function exportEventsToGoogle(calendarConfig) {
  try {
    // Obtener citas pendientes de sincronización
    const [rows] = await db.execute(`
      SELECT c.*, cl.nombre as cliente_nombre, cl.apellidos as cliente_apellidos, 
             cl.email as cliente_email, s.nombre as servicio_nombre, s.duracion as servicio_duracion
      FROM citas c
      JOIN clientes cl ON c.cliente_id = cl.id
      JOIN servicios s ON c.servicio_id = s.id
      WHERE c.empresa_id = ? AND (c.sync_status = 'pendiente' OR c.google_event_id IS NULL)
        AND c.fecha >= CURDATE()
    `, [calendarConfig.empresa_id]);

    let processed = 0;
    let successful = 0;
    let errors = 0;

    for (const cita of rows) {
      processed++;
      try {
        await exportCitaToGoogle(calendarConfig, cita);
        successful++;
      } catch (error) {
        logger.error(`Error exporting cita ${cita.id}:`, error);
        errors++;
      }
    }

    return { processed, successful, errors };
  } catch (error) {
    throw new Error(`Error exporting events: ${error.message}`);
  }
}

async function processGoogleEvent(calendarConfig, googleEvent) {
  // Guardar evento en google_events
  await db.execute(`
    INSERT INTO google_events 
    (google_calendar_id, google_event_id, titulo, descripcion, fecha_inicio, fecha_fin, 
     zona_horaria, es_todo_el_dia, ubicacion, estado, metadata_google, sync_direction)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'importado')
    ON DUPLICATE KEY UPDATE
    titulo = VALUES(titulo),
    descripcion = VALUES(descripcion),
    fecha_inicio = VALUES(fecha_inicio),
    fecha_fin = VALUES(fecha_fin),
    metadata_google = VALUES(metadata_google),
    last_modified = NOW()
  `, [
    calendarConfig.id,
    googleEvent.id,
    googleEvent.summary || '',
    googleEvent.description || null,
    googleEvent.start.dateTime || googleEvent.start.date,
    googleEvent.end.dateTime || googleEvent.end.date,
    googleEvent.start.timeZone || calendarConfig.zona_horaria,
    !!googleEvent.start.date,
    googleEvent.location || null,
    googleEvent.status || 'confirmado',
    JSON.stringify(googleEvent)
  ]);
}

async function exportCitaToGoogle(calendarConfig, cita) {
  const startDateTime = new Date(`${cita.fecha}T${cita.hora}`);
  const endDateTime = new Date(startDateTime.getTime() + (cita.servicio_duracion * 60 * 1000));

  const eventData = {
    summary: `${cita.servicio_nombre} - ${cita.cliente_nombre} ${cita.cliente_apellidos || ''}`,
    description: `
Servicio: ${cita.servicio_nombre}
Cliente: ${cita.cliente_nombre} ${cita.cliente_apellidos || ''}
${cita.cliente_email ? `Email: ${cita.cliente_email}` : ''}
${cita.observaciones ? `Notas: ${cita.observaciones}` : ''}

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
    status: mapCitaStatusToGoogle(cita.estado)
  };

  let result;
  if (cita.google_event_id) {
    // Actualizar evento existente
    result = await calendar.events.update({
      calendarId: calendarConfig.google_calendar_id,
      eventId: cita.google_event_id,
      resource: eventData
    });
  } else {
    // Crear nuevo evento
    result = await calendar.events.insert({
      calendarId: calendarConfig.google_calendar_id,
      resource: eventData
    });
  }

  // Actualizar cita con ID del evento
  await db.execute(`
    UPDATE citas 
    SET google_event_id = ?, sync_status = 'sincronizado', last_sync = NOW()
    WHERE id = ?
  `, [result.data.id, cita.id]);
}

function mapCitaStatusToGoogle(estado) {
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

// Agregar el método de verificación de configuración
googleCalendarController.checkConfiguration = (req, res) => {
  try {
    const configured = isGoogleCalendarConfigured();
    res.json({
      configured,
      clientIdSet: !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id',
      clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== 'your_google_client_secret',
      redirectUriSet: !!process.env.GOOGLE_REDIRECT_URI,
      message: configured ? 'Google Calendar is properly configured' : 'Google Calendar requires configuration'
    });
  } catch (error) {
    logger.error('Error checking configuration:', error);
    res.status(500).json({ 
      error: 'Error checking configuration',
      details: error.message 
    });
  }
};

// Verificar estado de conexión del usuario
googleCalendarController.getConnectionStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const empresaId = req.user.empresa_id;
    
    if (!isGoogleCalendarConfigured()) {
      return res.json({
        connected: false,
        configured: false,
        message: 'Google Calendar no está configurado'
      });
    }

    const db = require('../config/db');
    
    // Verificar si el usuario tiene tokens activos
    const [tokenRows] = await db.execute(
      'SELECT google_user_email, fecha_actualizacion FROM google_oauth_tokens WHERE usuario_id = ? AND activo = TRUE',
      [userId]
    );

    // Obtener calendarios sincronizados
    const [calendarRows] = await db.execute(
      'SELECT COUNT(*) as total FROM google_calendars WHERE usuario_id = ? AND sincronizacion_activa = TRUE',
      [userId]
    );

    if (tokenRows.length === 0) {
      return res.json({
        connected: false,
        configured: true,
        message: 'Usuario no conectado a Google Calendar'
      });
    }

    res.json({
      connected: true,
      configured: true,
      googleUser: {
        email: tokenRows[0].google_user_email,
        lastUpdate: tokenRows[0].fecha_actualizacion
      },
      calendarsCount: calendarRows[0].total,
      message: 'Conectado exitosamente a Google Calendar'
    });
  } catch (error) {
    logger.error('Error checking connection status:', error);
    res.status(500).json({ 
      error: 'Error verificando estado de conexión',
      details: error.message 
    });
  }
};

module.exports = googleCalendarController;
