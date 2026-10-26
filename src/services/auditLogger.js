"use strict";

const pool = require('../config/db');

// In-memory fallback cache for audit logs in case DB is unreachable
const memoryLogs = [];

/**
 * บันทึกเหตุการณ์ลงใน Audit Log (PostgreSQL & Fallback Store)
 * ตามข้อกำหนด AGENT.md ข้อ 2.5: ห้ามบันทึก Password, Token, หรือ Session ID
 */
async function logEvent({
  userId = null,
  usernameOrEmail = null,
  ipAddress = null,
  eventType,
  resource = null,
  action = null,
  status = 'SUCCESS',
  details = null
}) {
  // ทำความสะอาดข้อมูล ป้องกันการหลุดรอดของ Password / Token
  let safeDetails = details;
  if (details && typeof details === 'object') {
    const clone = { ...details };
    delete clone.password;
    delete clone.password_hash;
    delete clone.confirmPassword;
    delete clone.token;
    delete clone.session;
    delete clone.jwt;
    safeDetails = JSON.stringify(clone);
  } else if (typeof details === 'string') {
    safeDetails = details.replace(/("?password"?\s*:\s*)"[^"]*"/gi, '$1"***"');
  }

  const logEntry = {
    user_id: userId ? Number(userId) : null,
    username_or_email: usernameOrEmail ? String(usernameOrEmail).slice(0, 255) : null,
    ip_address: ipAddress ? String(ipAddress).slice(0, 100) : null,
    event_type: String(eventType).slice(0, 100),
    resource: resource ? String(resource).slice(0, 255) : null,
    action: action ? String(action).slice(0, 50) : null,
    status: String(status).slice(0, 50),
    details: safeDetails,
    created_at: new Date()
  };

  // เก็บลงหน่วยความจำชั่วคราวเสมอเพื่อเป็น fallback
  memoryLogs.unshift({ id: memoryLogs.length + 1, ...logEntry });
  if (memoryLogs.length > 500) memoryLogs.pop();

  try {
    const query = `
      INSERT INTO audit_logs (
        user_id, username_or_email, ip_address, event_type, resource, action, status, details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    const values = [
      logEntry.user_id,
      logEntry.username_or_email,
      logEntry.ip_address,
      logEntry.event_type,
      logEntry.resource,
      logEntry.action,
      logEntry.status,
      logEntry.details,
      logEntry.created_at
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.warn('[AuditLogger] Fallback to in-memory log due to DB notice:', err.message);
    return logEntry;
  }
}

/**
 * ค้นหาและกรองประวัติการใช้งาน (Audit Logs)
 */
async function getLogs({ startDate, endDate, eventType, username, limit = 50, offset = 0 } = {}) {
  try {
    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    if (startDate) {
      whereClauses.push(`created_at >= $${paramIdx++}`);
      params.push(new Date(startDate));
    }
    if (endDate) {
      whereClauses.push(`created_at <= $${paramIdx++}`);
      params.push(new Date(endDate));
    }
    if (eventType && eventType !== 'ALL') {
      whereClauses.push(`event_type = $${paramIdx++}`);
      params.push(eventType);
    }
    if (username) {
      whereClauses.push(`(LOWER(username_or_email) LIKE $${paramIdx} OR CAST(user_id AS TEXT) = $${paramIdx})`);
      params.push(`%${username.toLowerCase()}%`);
      paramIdx++;
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) AS total FROM audit_logs ${whereStr}`;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    const query = `
      SELECT id, user_id, username_or_email, ip_address, event_type, resource, action, status, details, created_at
      FROM audit_logs
      ${whereStr}
      ORDER BY created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return { total, logs: result.rows };
  } catch (err) {
    console.warn('[AuditLogger] Query DB failed, returning in-memory logs:', err.message);
    let filtered = [...memoryLogs];
    if (eventType && eventType !== 'ALL') {
      filtered = filtered.filter(l => l.event_type === eventType);
    }
    if (username) {
      const u = username.toLowerCase();
      filtered = filtered.filter(l => l.username_or_email && l.username_or_email.toLowerCase().includes(u));
    }
    return {
      total: filtered.length,
      logs: filtered.slice(offset, offset + limit)
    };
  }
}

module.exports = {
  logEvent,
  getLogs
};
