"use strict";

const express = require('express');
const router = express.Router();

const jobController = require('../controllers/jobController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

// เส้นทางสำหรับ Jobs CRUD
router.get('/', jobController.getAllJobs);
router.get('/:id', jobController.getJobById);

// สร้างงาน
router.post(
    '/',
    authenticateToken,
    requireRole('user', 'client', 'freelancer', 'admin'),
    jobController.createJob
);

// แก้ไขงาน
router.put(
    '/:id',
    authenticateToken,
    requireRole('user', 'client', 'freelancer', 'admin'),
    jobController.updateJob
);

// ลบงาน
router.delete(
    '/:id',
    authenticateToken,
    requireRole('user', 'client', 'freelancer', 'admin'),
    jobController.deleteJob
);

module.exports = router;