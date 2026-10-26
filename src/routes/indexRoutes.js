"use strict";

const express = require('express');
const multer = require('multer');
const router = express.Router();

const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const jobRoutes = require('./jobRoutes');
const adminRoutes = require('./adminRoutes');
const fileRoutes = require('./fileRoutes');

const companyController = require('../controllers/companyController');
const moderatorController = require('../controllers/moderatorController');
const seekerController = require('../controllers/seekerController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// รวม routes ทั้งหมดภายใต้ /api
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/admin', adminRoutes);
router.use('/files', fileRoutes);

// API สำหรับ Company (หน้าเดียว)
router.post('/company/jobs', authenticateToken, companyController.createJob);
router.patch('/company/applications/:id/status', authenticateToken, companyController.updateApplicationStatus);

// API สำหรับ Moderator (หน้าเดียว)
router.patch('/moderator/jobs/:id/status', authenticateToken, moderatorController.updateJobStatus);

// API สำหรับ Job Seeker (หน้าเดียว)
router.post('/seeker/apply', authenticateToken, upload.single('file'), seekerController.applyForJob);

module.exports = router;
