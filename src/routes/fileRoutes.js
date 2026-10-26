"use strict";

const express = require('express');
const multer = require('multer');
const router = express.Router();

const fileController = require('../controllers/fileController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/aclMiddleware');

// กำหนด Multer สำหรับรับไฟล์ Upload (จำกัด 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  }
});

// อัปโหลดไฟล์ (ต้องมีสิทธิ์ files.upload)
router.post(
  '/upload',
  authenticateToken,
  requirePermission('files.upload'),
  upload.single('file'),
  fileController.uploadFile
);

// ดาวน์โหลดหรือดูไฟล์ (มีการตรวจสิทธิ์และ Ownership ใน Controller)
router.get('/:id', authenticateToken, fileController.getFile);

// ลบไฟล์
router.delete('/:id', authenticateToken, fileController.deleteFile);

module.exports = router;
