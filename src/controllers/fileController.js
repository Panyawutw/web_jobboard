"use strict";

const path = require('path');
const fs = require('fs');
const fileService = require('../services/fileService');
const auditLogger = require('../services/auditLogger');
const aclService = require('../services/aclService');

/**
 * จัดการการอัปโหลดไฟล์ (POST /api/files/upload)
 */
async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' });
    }

    const uploadedBy = req.user?.id || req.session?.accountId;
    const { relatedEntityType, relatedEntityId } = req.body;

    const attachment = await fileService.saveUploadedFile({
      file: req.file,
      uploadedBy,
      relatedEntityType: relatedEntityType || 'job',
      relatedEntityId: relatedEntityId || null
    });

    // บันทึก Log การอัปโหลดไฟล์
    await auditLogger.logEvent({
      userId: uploadedBy,
      usernameOrEmail: req.user?.email || req.session?.accountName || 'User',
      ipAddress: req.ip,
      eventType: 'FILE_UPLOAD',
      resource: `/api/files/${attachment.id}`,
      action: 'POST',
      status: 'SUCCESS',
      details: {
        fileId: attachment.id,
        originalName: attachment.original_name,
        mimeType: attachment.mime_type,
        size: attachment.file_size
      }
    });

    return res.status(201).json({
      message: 'อัปโหลดไฟล์สำเร็จ',
      attachment
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

/**
 * ดาวน์โหลดหรือแสดงไฟล์พร้อมตรวจสอบสิทธิ์ (GET /api/files/:id หรือ /app/files/:id/download)
 * ข้อกำหนด 2.4: ไม่อนุญาตให้เข้าถึงไฟล์โดยตรงผ่าน Public URL ต้องตรวจสิทธิ์ผ่าน Middleware ก่อนเสมอ
 */
async function getFile(req, res) {
  try {
    const fileId = Number(req.params.id);
    const attachment = await fileService.getAttachmentById(fileId);

    if (!attachment) {
      return res.status(404).json({ error: 'ไม่พบไฟล์นี้ในระบบ' });
    }

    // ตรวจสอบสิทธิ์การเข้าถึงไฟล์ (Access Control)
    const currentUser = req.user || {
      id: req.session?.accountId,
      role: req.session?.accountRole,
      email: req.session?.email
    };

    if (!currentUser || !currentUser.id) {
      await auditLogger.logEvent({
        userId: null,
        usernameOrEmail: 'Anonymous',
        ipAddress: req.ip,
        eventType: 'ACCESS_DENIED',
        resource: req.originalUrl,
        action: 'GET',
        status: 'DENIED',
        details: { fileId, originalName: attachment.original_name, reason: 'Unauthenticated file access attempt' }
      });
      return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนเข้าถึงไฟล์' });
    }

    const userRole = String(currentUser.role || '').toLowerCase();
    const isOwner = Number(attachment.uploaded_by) === Number(currentUser.id);

    // ตรวจสอบว่ามีสิทธิ์อ่านไฟล์หรือไม่ผ่าน Dynamic ACL หรือ Ownership
    const canReadAll = await aclService.hasPermission(currentUser.role, 'files.read');
    const canReadOwn = await aclService.hasPermission(currentUser.role, 'files.read_own');

    const isAuthorized = userRole === 'admin' || canReadAll || (isOwner && canReadOwn);

    if (!isAuthorized) {
      // บันทึก Log การพยายามเข้าถึงไฟล์โดยไม่มีสิทธิ์
      await auditLogger.logEvent({
        userId: currentUser.id,
        usernameOrEmail: currentUser.email || currentUser.name,
        ipAddress: req.ip,
        eventType: 'ACCESS_DENIED',
        resource: req.originalUrl,
        action: 'GET',
        status: 'DENIED',
        details: {
          fileId,
          originalName: attachment.original_name,
          uploadedBy: attachment.uploaded_by,
          currentUserId: currentUser.id,
          currentUserRole: currentUser.role
        }
      });

      return res.status(403).json({
        error: 'คุณไม่มีสิทธิ์เข้าถึงหรือดาวน์โหลดไฟล์นี้'
      });
    }

    // ตรวจสอบการมีอยู่ของไฟล์ในเครื่อง
    const filePath = attachment.file_path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ไฟล์ต้นฉบับสูญหายหรือไม่พบบนดิสก์' });
    }

    // ส่งไฟล์พร้อม Header ที่ปลอดภัย
    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.original_name)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์' });
  }
}

/**
 * ลบไฟล์พร้อมตรวจสอบสิทธิ์ (DELETE /api/files/:id)
 */
async function deleteFile(req, res) {
  try {
    const fileId = Number(req.params.id);
    const attachment = await fileService.getAttachmentById(fileId);

    if (!attachment) {
      return res.status(404).json({ error: 'ไม่พบไฟล์ที่ต้องการลบ' });
    }

    const currentUser = req.user || {
      id: req.session?.accountId,
      role: req.session?.accountRole
    };

    const userRole = String(currentUser.role || '').toLowerCase();
    const isOwner = Number(attachment.uploaded_by) === Number(currentUser.id);

    const canDeleteAll = await aclService.hasPermission(currentUser.role, 'files.delete');
    const canDeleteOwn = await aclService.hasPermission(currentUser.role, 'files.delete_own');

    const isAuthorized = userRole === 'admin' || canDeleteAll || (isOwner && canDeleteOwn);

    if (!isAuthorized) {
      await auditLogger.logEvent({
        userId: currentUser.id,
        usernameOrEmail: currentUser.email || currentUser.name,
        ipAddress: req.ip,
        eventType: 'ACCESS_DENIED',
        resource: req.originalUrl,
        action: 'DELETE',
        status: 'DENIED',
        details: { fileId, originalName: attachment.original_name }
      });
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลบไฟล์นี้' });
    }

    await fileService.deleteAttachment(fileId);

    await auditLogger.logEvent({
      userId: currentUser.id,
      usernameOrEmail: currentUser.email || currentUser.name,
      ipAddress: req.ip,
      eventType: 'FILE_DELETE',
      resource: `/api/files/${fileId}`,
      action: 'DELETE',
      status: 'SUCCESS',
      details: { fileId, originalName: attachment.original_name }
    });

    return res.status(200).json({ message: 'ลบไฟล์สำเร็จ' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  uploadFile,
  getFile,
  deleteFile
};
