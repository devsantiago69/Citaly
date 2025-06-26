const express = require('express');
const router = express.Router();
const logger = require('../logger');

// GET status de Socket.IO y Webhooks
router.get('/realtime/status', (req, res) => {
  const socketManager = req.app.get('socketManager');
  const webhookManager = req.app.get('webhookManager');

  res.json({
    socketIO: {
      connected: socketManager ? true : false,
      connectedUsers: socketManager ? socketManager.getConnectedUsers().length : 0,
      users: socketManager ? socketManager.getConnectedUsers() : []
    },
    webhooks: webhookManager ? webhookManager.getStatus() : { enabled: false }
  });
});

// POST test webhook
router.post('/webhooks/test', async (req, res) => {
  try {
    const webhookManager = req.app.get('webhookManager');

    if (!webhookManager) {
      return res.status(500).json({ error: 'Webhook manager no disponible' });
    }

    const result = await webhookManager.testConnection();

    res.json({
      success: result.success,
      message: result.success ? 'Webhook enviado exitosamente' : 'Error enviando webhook',
      details: result
    });
  } catch (error) {
    logger.error('Error testing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST configurar webhook URL
router.post('/webhooks/config', (req, res) => {
  try {
    const { url, enabled } = req.body;
    const webhookManager = req.app.get('webhookManager');

    if (!webhookManager) {
      return res.status(500).json({ error: 'Webhook manager no disponible' });
    }

    if (url) {
      webhookManager.setWebhookUrl(url);
    }

    if (typeof enabled === 'boolean') {
      webhookManager.setEnabled(enabled);
    }

    res.json({
      success: true,
      status: webhookManager.getStatus()
    });
  } catch (error) {
    logger.error('Error configuring webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST enviar notificación de prueba
router.post('/notifications/test', (req, res) => {
  try {
    const { type, userId, companyId, message } = req.body;
    const socketManager = req.app.get('socketManager');

    if (!socketManager) {
      return res.status(500).json({ error: 'Socket manager no disponible' });
    }

    const testData = {
      message: message || 'Notificación de prueba',
      timestamp: new Date().toISOString(),
      type: 'test'
    };

    switch (type) {
      case 'user':
        if (!userId) {
          return res.status(400).json({ error: 'userId requerido para notificación de usuario' });
        }
        socketManager.notifyUser(userId, 'test_notification', testData);
        break;

      case 'company':
        if (!companyId) {
          return res.status(400).json({ error: 'companyId requerido para notificación de empresa' });
        }
        socketManager.notifyCompany(companyId, 'test_notification', testData);
        break;

      case 'all':
        socketManager.notifyAll('test_notification', testData);
        break;

      default:
        return res.status(400).json({ error: 'Tipo de notificación inválido. Use: user, company, all' });
    }

    res.json({
      success: true,
      message: `Notificación de prueba enviada (${type})`,
      data: testData
    });
  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET usuarios conectados
router.get('/realtime/users', (req, res) => {
  try {
    const socketManager = req.app.get('socketManager');

    if (!socketManager) {
      return res.status(500).json({ error: 'Socket manager no disponible' });
    }

    const connectedUsers = socketManager.getConnectedUsers();

    res.json({
      total: connectedUsers.length,
      users: connectedUsers
    });
  } catch (error) {
    logger.error('Error getting connected users:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
