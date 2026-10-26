"use strict";

const express = require('express');
const router = express.Router();
const moderatorController = require('../controllers/moderatorController');
const { ensureAuthenticatedWeb } = require('../middlewares/aclMiddleware');

// เฉพาะ Staff (Moderator) หรือ Admin เท่านั้น
const requireModerator = (req, res, next) => {
  const role = String(req.session?.accountRole || '').toLowerCase();
  if (role !== 'staff' && role !== 'admin') {
    return res.status(403).render('errors/404', {
      title: '403 - ปฏิเสธการเข้าถึง',
      message: 'หน้านี้สำหรับเจ้าหน้าที่ตรวจสอบ (Moderator Staff) เท่านั้น'
    });
  }
  next();
};

router.use(ensureAuthenticatedWeb, requireModerator);

// Web Page
router.get('/', moderatorController.showModeratorPage);

module.exports = router;
