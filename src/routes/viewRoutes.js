"use strict";

const express = require('express');
const rateLimit = require('express-rate-limit');
const registerController = require('../controllers/registerController');
const webAuthController = require('../controllers/webAuthController');
const oauthController = require('../controllers/oauthController');
const firebaseAuthController = require('../controllers/firebaseAuthController');
const passwordResetController = require('../controllers/passwordResetController');

const router = express.Router();

// ป้องกันการยิงสแปมฟอร์มสมัครสมาชิก (จำกัดไม่เกิน 10 ครั้งต่อ 15 นาที ต่อ IP)
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'ส่งคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่'
});

// หน้าแรกและหน้าประวัติของ FreelanceHub
router.get('/', (req, res) => {
  res.render('pages/index', {
    title: 'FreelanceHub - แพลตฟอร์มค้นหาและจัดการงานฟรีแลนซ์',
    accountName: req.session ? req.session.accountName : null
  });
});

router.get('/history', (req, res) => {
  res.render('pages/history', {
    title: 'ประวัติการทำงาน - FreelanceHub',
    accountName: req.session ? req.session.accountName : null
  });
});

// 1. เส้นทางระบบสมัครสมาชิก (Register)
router.get('/register', registerController.showRegister);
router.post('/register', registrationLimiter, registerController.register);

// 2. เส้นทางระบบเข้าสู่ระบบและออกจากระบบ (Login/Logout)
router.get('/login', webAuthController.showLogin);
router.post('/login', webAuthController.login);
router.post('/logout', webAuthController.logout);

// 3. เส้นทางส่งตรงไปยังระบบล็อกอินของ Google และ GitHub
router.post('/auth/firebase-login', firebaseAuthController.firebaseLogin);
router.get('/auth/google', oauthController.googleAuth);
router.get('/auth/google/callback', oauthController.googleCallback);
router.get('/auth/github', oauthController.githubAuth);
router.get('/auth/github/callback', oauthController.githubCallback);

// 4. เส้นทางระบบลืมรหัสผ่านและตั้งรหัสผ่านใหม่ (Forgot & Reset Password)
router.get('/forgot-password', passwordResetController.showForgotPassword);
router.post('/forgot-password', passwordResetController.sendResetLink);
router.get('/reset-password', passwordResetController.showResetPassword);
router.post('/reset-password', passwordResetController.handleResetPassword);

module.exports = router;
