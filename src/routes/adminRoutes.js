"use strict";

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

// ตรวจสอบว่าเป็น admin หรือไม่
router.get(
    '/check',
    authenticateToken,
    requireRole('admin'),
    adminController.checkAdmin
);

module.exports = router;
