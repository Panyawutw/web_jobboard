"use strict";

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// สมัครสมาชิก
router.post('/register', authController.register);
// เข้าสู่ระบบ
router.post('/login', authController.login);
// ข้อมูลผู้ใช้
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;