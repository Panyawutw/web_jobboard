"use strict";

const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { ensureAuthenticatedWeb } = require('../middlewares/aclMiddleware');

// เฉพาะ Company หรือ Admin เท่านั้น
const requireCompany = (req, res, next) => {
  const role = String(req.session?.accountRole || '').toLowerCase();
  if (role !== 'company' && role !== 'admin') {
    return res.status(403).render('errors/404', {
      title: '403 - ปฏิเสธการเข้าถึง',
      message: 'หน้านี้สำหรับบทบาท บริษัท (Company) เท่านั้น'
    });
  }
  next();
};

router.use(ensureAuthenticatedWeb, requireCompany);

// Web Page
router.get('/', companyController.showCompanyPage);

module.exports = router;
