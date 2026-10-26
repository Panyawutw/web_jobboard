"use strict";

const express = require('express');
const router = express.Router();

const adminViewController = require('../controllers/adminViewController');
const { ensureAdminWeb } = require('../middlewares/aclMiddleware');

// ป้องกันทุกเส้นทางของ /admin/... ด้วย ensureAdminWeb
router.use(ensureAdminWeb);

// หน้าเดียวสำหรับ Admin (Dynamic ACL Matrix & Audit Logs)
router.get('/', adminViewController.showDashboard);
router.get('/dashboard', adminViewController.showDashboard);
router.get('/acl', adminViewController.showDashboard);
router.get('/logs', adminViewController.showDashboard);

module.exports = router;
