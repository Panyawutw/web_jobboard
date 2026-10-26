"use strict";

const express = require('express');
const router = express.Router();

const jobController = require('../controllers/jobController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// ดึงรายการงาน (เปิดให้อ่านได้ทั่วไป หรือกรองตามสิทธิ์หากล็อกอิน)
router.get('/', jobController.getAllJobs);
router.get('/:id', jobController.getJobById);

// สร้างงาน (ต้องล็อกอิน)
router.post(
  '/',
  authenticateToken,
  jobController.createJob
);

// แก้ไขงาน (มีการตรวจสิทธิ์และ Ownership ใน Controller)
router.put(
  '/:id',
  authenticateToken,
  jobController.updateJob
);

// ปรับปรุงสถานะงานและมอบหมายงาน (Workflow State Transition)
router.patch(
  '/:id/status',
  authenticateToken,
  jobController.updateJobStatus
);

// ลบงาน (มีการตรวจสิทธิ์และ Ownership ใน Controller)
router.delete(
  '/:id',
  authenticateToken,
  jobController.deleteJob
);

module.exports = router;
