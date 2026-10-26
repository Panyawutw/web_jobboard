"use strict";

const express = require('express');
const rateLimit = require('express-rate-limit');
const registerController = require('../controllers/registerController');
const webAuthController = require('../controllers/webAuthController');
const oauthController = require('../controllers/oauthController');
const firebaseAuthController = require('../controllers/firebaseAuthController');
const passwordResetController = require('../controllers/passwordResetController');
const jobViewController = require('../controllers/jobViewController');

const router = express.Router();

// ป้องกันการยิงสแปมฟอร์มสมัครสมาชิกใน Production; ปิดเฉพาะในโหมดพัฒนาเพื่อให้ทดสอบได้ต่อเนื่อง
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: () => process.env.NODE_ENV !== 'production',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    const role = req.body?.role === 'company' ? 'company' : 'jobSeeker';
    const values = { ...(req.body || {}) };
    delete values.password;
    delete values.confirmPassword;

    return res.status(429).render('pages/register', {
      title: 'สมัครสมาชิก - FreelanceHub',
      role,
      values,
      errors: { form: 'ส่งคำขอสมัครมากเกินไป กรุณารอสักครู่แล้วลองใหม่' },
      success: null
    });
  }
});

// หน้าแรกและรายการค้นหางานทั้งหมด (สไตล์ JobThai - เข้าถึงได้ทั้ง Guest และสมาชิก)
router.get('/', jobViewController.showHomePageings);
router.get('/jobs', jobViewController.showHomePageings);

// หน้ารายละเอียดงาน (Job Details Page - สไตล์ JobThai)
router.get('/jobs/:id', jobViewController.showJobDetail);

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
