"use strict";

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/db');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory fallback in case DB is offline
const memoryAttachments = [];

// Whitelist of allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed'
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * บันทึกไฟล์และ Metadata ลงในระบบ
 */
async function saveUploadedFile({ file, uploadedBy, relatedEntityType = 'job', relatedEntityId = null }) {
  if (!file) throw new Error('ไม่พบข้อมูลไฟล์ที่อัปโหลด');

  // Server-side validation: MIME Type
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error(`ประเภทไฟล์ '${file.mimetype}' ไม่ได้รับอนุญาต กรุณาอัปโหลดรูปภาพ (JPG, PNG, WEBP) หรือเอกสาร (PDF, DOCX, TXT, ZIP)`);
  }

  // Server-side validation: File Size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('ขนาดไฟล์เกินขีดจำกัดสูงสุด 10 MB');
  }

  // ป้องกัน Path Traversal: สร้างชื่อไฟล์สุ่มฝั่ง Server
  const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const randomHex = crypto.randomBytes(16).toString('hex');
  const storedName = `${Date.now()}-${randomHex}${ext}`;
  const targetPath = path.join(UPLOADS_DIR, storedName);

  // บันทึกไฟล์ลง Storage
  if (file.buffer) {
    fs.writeFileSync(targetPath, file.buffer);
  } else if (file.path) {
    fs.copyFileSync(file.path, targetPath);
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
  }

  const attachmentData = {
    original_name: path.basename(file.originalname),
    stored_name: storedName,
    file_path: targetPath,
    mime_type: file.mimetype,
    file_size: file.size,
    uploaded_by: uploadedBy ? Number(uploadedBy) : null,
    related_entity_type: relatedEntityType,
    related_entity_id: relatedEntityId ? Number(relatedEntityId) : null,
    created_at: new Date()
  };

  try {
    const query = `
      INSERT INTO attachments (
        original_name, stored_name, file_path, mime_type, file_size, uploaded_by, related_entity_type, related_entity_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, original_name, stored_name, mime_type, file_size, uploaded_by, related_entity_type, related_entity_id, created_at
    `;
    const values = [
      attachmentData.original_name,
      attachmentData.stored_name,
      attachmentData.file_path,
      attachmentData.mime_type,
      attachmentData.file_size,
      attachmentData.uploaded_by,
      attachmentData.related_entity_type,
      attachmentData.related_entity_id,
      attachmentData.created_at
    ];
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    console.warn('[FileService] DB insert attachment failed, using memory store:', err.message);
    const mockId = memoryAttachments.length + 1;
    const item = { id: mockId, ...attachmentData };
    memoryAttachments.push(item);
    return item;
  }
}

/**
 * ดึงข้อมูล Attachment ตาม ID
 */
async function getAttachmentById(id) {
  const attachId = Number(id);
  try {
    const res = await pool.query('SELECT * FROM attachments WHERE id = $1', [attachId]);
    if (res.rows.length > 0) return res.rows[0];
  } catch (err) {
    console.warn('[FileService] getAttachmentById fallback:', err.message);
  }
  return memoryAttachments.find(a => a.id === attachId) || null;
}

/**
 * ดึงรายการ Attachments ตาม Entity ที่เกี่ยวข้อง (เช่น job)
 */
async function getAttachmentsByEntity(entityType, entityId) {
  try {
    const res = await pool.query(
      'SELECT id, original_name, stored_name, mime_type, file_size, uploaded_by, created_at FROM attachments WHERE related_entity_type = $1 AND related_entity_id = $2 ORDER BY created_at DESC',
      [entityType, Number(entityId)]
    );
    if (res.rows.length > 0) return res.rows;
  } catch (err) {
    console.warn('[FileService] getAttachmentsByEntity fallback:', err.message);
  }
  return memoryAttachments.filter(a => a.related_entity_type === entityType && a.related_entity_id === Number(entityId));
}

/**
 * ลบไฟล์และข้อมูล Metadata
 */
async function deleteAttachment(id) {
  const attachment = await getAttachmentById(id);
  if (!attachment) throw new Error('ไม่พบไฟล์ที่ต้องการลบ');

  // ลบไฟล์จริงในเครื่อง
  try {
    if (fs.existsSync(attachment.file_path)) {
      fs.unlinkSync(attachment.file_path);
    }
  } catch (err) {
    console.error('Error removing file from disk:', err.message);
  }

  try {
    await pool.query('DELETE FROM attachments WHERE id = $1', [Number(id)]);
  } catch (err) {
    const idx = memoryAttachments.findIndex(a => a.id === Number(id));
    if (idx !== -1) memoryAttachments.splice(idx, 1);
  }

  return { success: true, original_name: attachment.original_name };
}

module.exports = {
  saveUploadedFile,
  getAttachmentById,
  getAttachmentsByEntity,
  deleteAttachment,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  UPLOADS_DIR
};
