"use strict";

// ==========================================
// [BACKEND] เส้นทาง API Authentication (/api/auth/...)
// ==========================================

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const firebaseAuthController = require('../controllers/firebaseAuthController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// สมัครสมาชิกทั่วไป
router.post('/register', authController.register);

// เข้าสู่ระบบทั่วไป
router.post('/login', authController.login);

// เข้าสู่ระบบด้วย Firebase (Google / GitHub)
router.post('/firebase-login', firebaseAuthController.firebaseLogin);

// ข้อมูลผู้ใช้ปัจจุบัน
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
