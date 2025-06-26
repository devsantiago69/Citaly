const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');
const { validateRequired } = require('../middlewares/auth');

/**
 * Rutas para reportes y estadísticas
 */

// GET /api/reports/overview - Resumen general
router.get('/overview',
  reportesController.getOverview
);

// GET /api/reports/revenue - Reporte de ingresos
router.get('/revenue',
  reportesController.getRevenue
);

// GET /api/reports/services - Reporte de servicios
router.get('/services',
  reportesController.getServices
);

// GET /api/reports/staff - Reporte de personal
router.get('/staff',
  reportesController.getStaff
);

// GET /api/reports/clients - Reporte de clientes
router.get('/clients',
  reportesController.getClients
);

// GET /api/reports/sales-by-month - Ventas por mes
router.get('/sales-by-month',
  reportesController.getSalesByMonth
);

// GET /api/reports/appointments-status-by-day - Estado de citas por día
router.get('/appointments-status-by-day',
  reportesController.getAppointmentsStatusByDay
);

// GET /api/reports/services-completion-ratio - Ratio de completitud de servicios
router.get('/services-completion-ratio',
  reportesController.getServicesCompletionRatio
);

module.exports = router;
