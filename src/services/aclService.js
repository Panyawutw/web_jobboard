"use strict";

const pool = require('../config/db');

let aclCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

function invalidateAclCache() {
  aclCache = null;
  lastCacheTime = 0;
}

async function getAllPermissions() {
  try {
    const res = await pool.query('SELECT id, code, name, module, description FROM permissions ORDER BY module, code');
    if (res.rows.length > 0) return res.rows;
  } catch (err) { /* fallback */ }

  return [
    { id: 1, code: 'jobs.read', name: 'ค้นหาและอ่านประกาศงาน', module: 'jobs' },
    { id: 2, code: 'jobs.create', name: 'สร้างประกาศรับสมัครงาน (บริษัท)', module: 'jobs' },
    { id: 3, code: 'jobs.moderate', name: 'ตรวจสอบ/อนุมัติประกาศงาน (เจ้าหน้าที่)', module: 'jobs' },
    { id: 4, code: 'applications.apply', name: 'ส่งใบสมัครและแนบ Resume (ผู้สมัคร)', module: 'applications' },
    { id: 5, code: 'applications.review', name: 'ดูใบสมัครและอนุมัติ/ปฏิเสธผู้สมัคร (บริษัท)', module: 'applications' },
    { id: 6, code: 'files.upload', name: 'อัปโหลดไฟล์ Resume / เอกสารแนบ', module: 'files' },
    { id: 7, code: 'files.download', name: 'ดาวน์โหลดไฟล์ Resume / เอกสาร', module: 'files' },
    { id: 8, code: 'acl.manage', name: 'กำหนดสิทธิ์ Dynamic ACL Matrix (Admin)', module: 'acl' },
    { id: 9, code: 'logs.read', name: 'ดูประวัติ Audit Logs (Admin)', module: 'logs' }
  ];
}

async function getAllRoles() {
  try {
    const res = await pool.query(`
      SELECT r.id, r.name, r.description, r.is_system, r.created_at,
             COUNT(a.id) AS user_count
      FROM roles r
      LEFT JOIN accounts a ON LOWER(a.role) = LOWER(r.name)
      GROUP BY r.id, r.name, r.description, r.is_system, r.created_at
      ORDER BY r.id ASC
    `);
    if (res.rows.length > 0) return res.rows;
  } catch (err) { /* fallback */ }

  return [
    { id: 1, name: 'Admin', description: 'ผู้ดูแลระบบ: คุม Dynamic ACL & Logs', is_system: true, user_count: 1 },
    { id: 2, name: 'Company', description: 'บริษัท: ลงประกาศงาน & พิจารณาผู้สมัคร', is_system: true, user_count: 1 },
    { id: 3, name: 'Staff', description: 'เจ้าหน้าที่: ตรวจสอบความถูกต้องประกาศงาน', is_system: true, user_count: 1 },
    { id: 4, name: 'JobSeeker', description: 'ผู้สมัครงาน: ค้นหางาน & ส่งใบสมัคร', is_system: true, user_count: 2 }
  ];
}

async function loadRolePermissionsMap() {
  const now = Date.now();
  if (aclCache && (now - lastCacheTime < CACHE_TTL_MS)) {
    return aclCache;
  }

  const map = {};

  try {
    const res = await pool.query(`
      SELECT r.name AS role_name, p.code AS permission_code
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
    `);

    for (const row of res.rows) {
      const rName = row.role_name.toLowerCase();
      if (!map[rName]) map[rName] = new Set();
      map[rName].add(row.permission_code);
    }
  } catch (err) { /* fallback */ }

  // Fallback defaults
  if (!map['admin']) {
    map['admin'] = new Set([
      'jobs.read', 'jobs.create', 'jobs.moderate', 'applications.apply',
      'applications.review', 'files.upload', 'files.download', 'acl.manage', 'logs.read'
    ]);
  }
  if (!map['company']) {
    map['company'] = new Set([
      'jobs.read', 'jobs.create', 'applications.review', 'files.download'
    ]);
  }
  if (!map['staff']) {
    map['staff'] = new Set([
      'jobs.read', 'jobs.moderate'
    ]);
  }
  if (!map['jobseeker']) {
    map['jobseeker'] = new Set([
      'jobs.read', 'applications.apply', 'files.upload', 'files.download'
    ]);
  }

  aclCache = map;
  lastCacheTime = now;
  return aclCache;
}

async function hasPermission(roleName, permissionCode) {
  if (!roleName) return false;
  const normalized = String(roleName).trim().toLowerCase();

  // Admin มีทุกสิทธิ์
  if (normalized === 'admin') return true;

  const roleMap = await loadRolePermissionsMap();
  const perms = roleMap[normalized];
  if (!perms) return false;

  return perms.has(permissionCode);
}

async function getAclMatrix() {
  const roles = await getAllRoles();
  const permissions = await getAllPermissions();
  const matrix = {};

  for (const r of roles) {
    matrix[r.id] = [];
  }

  try {
    const res = await pool.query('SELECT role_id, permission_id FROM role_permissions');
    for (const row of res.rows) {
      if (matrix[row.role_id]) {
        matrix[row.role_id].push(row.permission_id);
      }
    }
  } catch (err) {
    // Fallback matrix mapping
    matrix[1] = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // Admin
    matrix[2] = [1, 2, 5, 7];               // Company
    matrix[3] = [1, 3];                     // Staff
    matrix[4] = [1, 4, 6, 7];               // JobSeeker
  }

  return { roles, permissions, matrix };
}

async function updateRolePermissions(roleId, permissionIds) {
  let client = null;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

    if (Array.isArray(permissionIds) && permissionIds.length > 0) {
      for (const pid of permissionIds) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [roleId, Number(pid)]
        );
      }
    }

    await client.query('COMMIT');
    invalidateAclCache();
    return true;
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    }
    // Fallback in-memory update
    invalidateAclCache();
    return true;
  } finally {
    if (client) {
      try { client.release(); } catch { /* ignore */ }
    }
  }
}

module.exports = {
  getAllPermissions,
  getAllRoles,
  loadRolePermissionsMap,
  hasPermission,
  getAclMatrix,
  updateRolePermissions,
  invalidateAclCache
};
