const axios = require('axios');
const logger = require('../logger');

class WebhookManager {
  constructor() {
    this.n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';
    this.enabled = process.env.WEBHOOKS_ENABLED === 'true' || false;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 segundo
  }

  async sendWebhook(event, data, options = {}) {
    if (!this.enabled) {
      logger.info('Webhooks deshabilitados, evento ignorado:', event);
      return { success: false, reason: 'disabled' };
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      source: 'citaly-api',
      data,
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0',
        ...options.metadata
      }
    };

    return this.sendWithRetry(payload, options.retryAttempts || this.retryAttempts);
  }

  async sendWithRetry(payload, attemptsLeft) {
    try {
      const response = await axios.post(this.n8nWebhookUrl, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Source': 'citaly-api',
          'X-Webhook-Event': payload.event
        }
      });

      logger.info('Webhook enviado exitosamente:', {
        event: payload.event,
        status: response.status,
        url: this.n8nWebhookUrl
      });

      return {
        success: true,
        status: response.status,
        data: response.data
      };

    } catch (error) {
      logger.error('Error enviando webhook:', {
        event: payload.event,
        error: error.message,
        attemptsLeft: attemptsLeft - 1,
        url: this.n8nWebhookUrl
      });

      if (attemptsLeft > 1) {
        logger.info(`Reintentando webhook en ${this.retryDelay}ms...`);
        await this.delay(this.retryDelay);
        return this.sendWithRetry(payload, attemptsLeft - 1);
      }

      return {
        success: false,
        error: error.message,
        attempts: this.retryAttempts
      };
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Webhooks específicos para eventos de negocio

  async appointmentCreated(appointmentData) {
    return this.sendWebhook('appointment.created', {
      appointment: appointmentData,
      client: appointmentData.client,
      service: appointmentData.service,
      staff: appointmentData.staff
    });
  }

  async appointmentUpdated(appointmentData) {
    return this.sendWebhook('appointment.updated', {
      appointment: appointmentData,
      client: appointmentData.client,
      service: appointmentData.service,
      staff: appointmentData.staff
    });
  }

  async appointmentCancelled(appointmentData) {
    return this.sendWebhook('appointment.cancelled', {
      appointment: appointmentData,
      client: appointmentData.client,
      reason: appointmentData.cancellation_reason
    });
  }

  async appointmentCompleted(appointmentData) {
    return this.sendWebhook('appointment.completed', {
      appointment: appointmentData,
      client: appointmentData.client,
      service: appointmentData.service,
      staff: appointmentData.staff,
      revenue: appointmentData.service?.price
    });
  }

  async clientRegistered(clientData) {
    return this.sendWebhook('client.registered', {
      client: clientData,
      registration_date: new Date().toISOString()
    });
  }

  async paymentReceived(paymentData) {
    return this.sendWebhook('payment.received', {
      payment: paymentData,
      appointment: paymentData.appointment,
      client: paymentData.client
    });
  }

  async reminderSent(reminderData) {
    return this.sendWebhook('reminder.sent', {
      appointment: reminderData.appointment,
      client: reminderData.client,
      reminder_type: reminderData.type,
      send_time: new Date().toISOString()
    });
  }

  async staffActivity(staffData, activity) {
    return this.sendWebhook('staff.activity', {
      staff: staffData,
      activity: activity,
      timestamp: new Date().toISOString()
    });
  }

  async systemAlert(alertData) {
    return this.sendWebhook('system.alert', {
      alert: alertData,
      severity: alertData.severity || 'info',
      timestamp: new Date().toISOString()
    });
  }

  // Webhook para métricas y reportes
  async dailyMetrics(metricsData) {
    return this.sendWebhook('metrics.daily', {
      date: new Date().toISOString().split('T')[0],
      metrics: metricsData
    });
  }

  async weeklyReport(reportData) {
    return this.sendWebhook('report.weekly', {
      week_start: reportData.week_start,
      week_end: reportData.week_end,
      report: reportData
    });
  }

  // Método para testing
  async testConnection() {
    return this.sendWebhook('test.connection', {
      message: 'Webhook de prueba desde Citaly API',
      test_timestamp: new Date().toISOString()
    });
  }

  // Configurar webhook URL dinámicamente
  setWebhookUrl(url) {
    this.n8nWebhookUrl = url;
    logger.info('Webhook URL actualizada:', url);
  }

  // Habilitar/deshabilitar webhooks
  setEnabled(enabled) {
    this.enabled = enabled;
    logger.info(`Webhooks ${enabled ? 'habilitados' : 'deshabilitados'}`);
  }

  getStatus() {
    return {
      enabled: this.enabled,
      url: this.n8nWebhookUrl,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay
    };
  }
}

// Exportar instancia singleton
const webhookManager = new WebhookManager();
module.exports = webhookManager;
