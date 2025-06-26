const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

router.get('/admins', adminController.getAllAdmins);
router.post('/admins', adminController.createAdmin);

router.get('/support-cases', adminController.getAllSupportCases);
router.post('/support-cases', adminController.createSupportCase);

module.exports = router;
