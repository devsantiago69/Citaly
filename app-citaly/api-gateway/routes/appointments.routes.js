const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointments.controller');

// GET /api/appointments/stats
router.get('/stats', appointmentsController.getStats);

module.exports = router;
