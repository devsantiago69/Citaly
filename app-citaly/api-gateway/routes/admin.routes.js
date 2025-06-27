const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/admins', adminController.getAllAdmins);
router.post('/admins', adminController.createAdmin);

router.get('/support-cases', adminController.getAllSupportCases);
router.post('/support-cases', adminController.createSupportCase);

module.exports = router;
