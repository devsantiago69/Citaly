const express = require('express');
const router = express.Router();
const googleCalendarController = require('../controllers/google-calendar.controller');
const { verifyToken } = require('../middlewares/auth');

// Rutas públicas (no requieren autenticación completa)
router.get('/config', googleCalendarController.checkConfiguration);
router.get('/auth-url', googleCalendarController.getAuthUrl);

// Rutas protegidas (requieren autenticación)
router.use(verifyToken);

// Intercambio de código y gestión de calendarios
router.post('/exchange-code', googleCalendarController.exchangeCodeForTokens);
router.get('/calendars', googleCalendarController.getCalendarList);
router.post('/calendars/save', googleCalendarController.saveSelectedCalendars);
router.get('/status', googleCalendarController.getConnectionStatus);

// Sincronización
router.post('/calendar/:calendarId/sync', googleCalendarController.syncCalendar);
router.get('/user/:userId/sync-logs', googleCalendarController.getSyncLogs);

// Configuración de sincronización
router.get('/sync-config/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const db = require('../config/db');
    
    const [rows] = await db.execute(
      'SELECT * FROM sync_configuration WHERE empresa_id = ?',
      [empresaId]
    );

    if (rows.length === 0) {
      // Crear configuración por defecto
      await db.execute(`
        INSERT INTO sync_configuration (empresa_id, auto_sync_enabled, sync_interval_minutes, conflict_resolution, sync_window_days)
        VALUES (?, true, 15, 'manual', 30)
      `, [empresaId]);
      
      const [newRows] = await db.execute(
        'SELECT * FROM sync_configuration WHERE empresa_id = ?',
        [empresaId]
      );
      
      return res.json({ config: newRows[0] });
    }

    res.json({ config: rows[0] });
  } catch (error) {
    console.error('Error getting sync config:', error);
    res.status(500).json({ error: 'Error obteniendo configuración', details: error.message });
  }
});

router.put('/sync-config/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { auto_sync_enabled, sync_interval_minutes, conflict_resolution, sync_window_days, default_event_duration, timezone } = req.body;
    const db = require('../config/db');
    
    await db.execute(`
      UPDATE sync_configuration 
      SET auto_sync_enabled = ?, sync_interval_minutes = ?, conflict_resolution = ?, 
          sync_window_days = ?, default_event_duration = ?, timezone = ?, fecha_actualizacion = NOW()
      WHERE empresa_id = ?
    `, [auto_sync_enabled, sync_interval_minutes, conflict_resolution, sync_window_days, default_event_duration, timezone, empresaId]);

    res.json({ success: true, message: 'Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('Error updating sync config:', error);
    res.status(500).json({ error: 'Error actualizando configuración', details: error.message });
  }
});

// Webhook para recibir notificaciones de Google Calendar
router.post('/webhook', async (req, res) => {
  try {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceState = req.headers['x-goog-resource-state'];
    const resourceId = req.headers['x-goog-resource-id'];
    
    console.log('Google Calendar webhook received:', {
      channelId,
      resourceState,
      resourceId
    });

    if (!channelId || !resourceState) {
      return res.status(400).json({ error: 'Invalid webhook headers' });
    }

    // Procesar según el tipo de cambio
    if (resourceState === 'exists') {
      // Cambios en el calendario - programar sincronización
      const db = require('../config/db');
      
      const [calendars] = await db.execute(`
        SELECT id, usuario_id, nombre 
        FROM google_calendars 
        WHERE google_calendar_id = ? AND sincronizacion_activa = true
      `, [resourceId]);

      // Programar sincronización para cada calendario afectado
      for (const calendar of calendars) {
        await db.execute(`
          INSERT INTO calendar_sync_logs 
          (google_calendar_id, tipo_operacion, estado, tiempo_inicio, detalles)
          VALUES (?, 'import', 'exitoso', NOW(), ?)
        `, [calendar.id, JSON.stringify({ trigger: 'webhook', resourceState, channelId })]);
        
        console.log(`Sync scheduled for calendar: ${calendar.nombre}`);
      }
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Error procesando webhook', details: error.message });
  }
});

// Estadísticas de sincronización
router.get('/stats/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const db = require('../config/db');
    
    const [stats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT gc.id) as total_calendars,
        COUNT(DISTINCT gc.usuario_id) as users_with_calendars,
        COUNT(ge.id) as total_events,
        COUNT(CASE WHEN ge.sync_status = 'sincronizado' THEN 1 END) as synced_events,
        COUNT(CASE WHEN ge.sync_status = 'error' THEN 1 END) as error_events,
        COUNT(CASE WHEN c.google_event_id IS NOT NULL THEN 1 END) as citas_with_google_events
      FROM google_calendars gc
      LEFT JOIN google_events ge ON gc.id = ge.google_calendar_id
      LEFT JOIN citas c ON ge.cita_id = c.id
      WHERE gc.empresa_id = ? AND gc.activo = true
    `, [empresaId]);

    const [recentSync] = await db.execute(`
      SELECT MAX(ultimo_sync) as last_global_sync
      FROM google_calendars
      WHERE empresa_id = ? AND activo = true
    `, [empresaId]);

    res.json({
      stats: stats[0],
      lastGlobalSync: recentSync[0]?.last_global_sync
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas', details: error.message });
  }
});

module.exports = router;
