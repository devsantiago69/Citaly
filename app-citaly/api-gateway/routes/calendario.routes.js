const express = require('express');
const router = express.Router();
const calendarioController = require('../controllers/calendario.controller');

const { verifyToken } = require('../middlewares/auth');


// Resumen de citas por día para el calendario (mes)
router.get('/summary', (req, res, next) => {
  console.log('[CALENDAR ROUTE] GET /summary', {
    user: req.user,
    query: req.query,
    headers: req.headers
  });
  verifyToken(req, res, (err) => {
    if (err) return next(err);
    calendarioController.summary(req, res, next);
  });
});

// Citas de un día específico
router.get('/day', verifyToken, calendarioController.day);

// Todas las citas (opcional, para dashboard)
router.get('/all', verifyToken, calendarioController.all);

module.exports = router;
