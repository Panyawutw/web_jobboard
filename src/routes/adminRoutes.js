"use strict";

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/aclMiddleware');

// Middleware บังคับสิทธิ์ Admin สำหรับ API กลุ่มนี้
const requireAdmin = (req, res, next) => {
  if (!req.user || String(req.user.role).toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเรียกใช้ API นี้ได้' });
  }
  next();
};

// ตรวจสอบสถานะ Admin
router.get('/check', authenticateToken, requireAdmin, adminController.checkAdmin);

// การจัดการผู้ใช้งาน (Users Management)
router.get('/users', authenticateToken, requireAdmin, adminController.getAllUsers);
router.post('/users', authenticateToken, requireAdmin, adminController.createUser);
router.put('/users/:id/role', authenticateToken, requireAdmin, adminController.updateUserRole);
router.delete('/users/:id', authenticateToken, requireAdmin, adminController.deleteUser);

// การจัดการบทบาท (Roles Management)
router.get('/roles', authenticateToken, requireAdmin, adminController.getRoles);
router.post('/roles', authenticateToken, requireAdmin, adminController.createRole);
router.delete('/roles/:id', authenticateToken, requireAdmin, adminController.deleteRole);

// ตารางสิทธิ์ Dynamic ACL Matrix
router.get('/acl', authenticateToken, requireAdmin, adminController.getAclMatrix);
router.put('/acl', authenticateToken, requireAdmin, adminController.updateAclMatrix);

// ประวัติการใช้งานระบบ (Audit Logs) - สามารถเปิดให้ Manager ที่มี logs.read เข้าถึงได้ด้วย
router.get(
  '/logs',
  authenticateToken,
  requirePermission('logs.read'),
  adminController.getAuditLogs
);

module.exports = router;
