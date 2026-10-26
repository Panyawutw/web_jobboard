"use strict";

const aclService = require('../services/aclService');
const auditLogger = require('../services/auditLogger');

/**
 * Middleware ตรวจสอบสิทธิ์แบบ Dynamic ตามข้อกำหนด AGENT.md ข้อ 2.3
 */
function requirePermission(permissionCode) {
  return async (req, res, next) => {
    // 1. ตรวจสอบว่าผู้ใช้ล็อกอินหรือยัง
    if (!req.user || !req.user.role) {
      await auditLogger.logEvent({
        userId: null,
        usernameOrEmail: 'Anonymous',
        ipAddress: req.ip,
        eventType: 'ACCESS_DENIED',
        resource: req.originalUrl,
        action: req.method,
        status: 'DENIED',
        details: { reason: 'Unauthenticated access attempt', requiredPermission: permissionCode }
      });

      if (req.originalUrl.startsWith('/api')) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' });
      }
      return res.redirect('/login');
    }

    const userRole = req.user.role;

    // 2. ตรวจสอบสิทธิ์ผ่าน AclService
    const allowed = await aclService.hasPermission(userRole, permissionCode);

    if (!allowed) {
      // บันทึก Log การถูกปฏิเสธสิทธิ์ (Access Denied) ลงใน PostgreSQL
      await auditLogger.logEvent({
        userId: req.user.id,
        usernameOrEmail: req.user.email || req.user.name,
        ipAddress: req.ip,
        eventType: 'ACCESS_DENIED',
        resource: req.originalUrl,
        action: req.method,
        status: 'DENIED',
        details: {
          role: userRole,
          requiredPermission: permissionCode,
          message: 'User does not possess the required permission'
        }
      });

      if (req.originalUrl.startsWith('/api')) {
        return res.status(403).json({
          error: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้ (Permission Denied)',
          requiredPermission: permissionCode,
          userRole: userRole
        });
      }

      return res.status(403).render('errors/404', {
        title: '403 - ปฏิเสธการเข้าถึง',
        message: 'คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้ (Permission Denied)'
      });
    }

    next();
  };
}

/**
 * Middleware สำหรับเส้นทาง Admin Web Pages (/admin/...)
 */
async function ensureAdminWeb(req, res, next) {
  if (!req.session || !req.session.accountId) {
    return res.redirect('/login?error=admin_required');
  }

  const role = String(req.session.accountRole || '').toLowerCase();
  if (role !== 'admin') {
    await auditLogger.logEvent({
      userId: req.session.accountId,
      usernameOrEmail: req.session.email || req.session.accountName,
      ipAddress: req.ip,
      eventType: 'ACCESS_DENIED',
      resource: req.originalUrl,
      action: req.method,
      status: 'DENIED',
      details: { role: req.session.accountRole, requiredRole: 'Admin' }
    });

    return res.status(403).render('errors/404', {
      title: '403 - ปฏิเสธการเข้าถึง',
      message: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเข้าถึงส่วนนี้ได้'
    });
  }

  // Bind req.user for consistency
  req.user = {
    id: req.session.accountId,
    name: req.session.accountName,
    email: req.session.email,
    role: req.session.accountRole
  };

  next();
}

/**
 * Middleware สำหรับเส้นทาง /app/... ของสมาชิก
 */
function ensureAuthenticatedWeb(req, res, next) {
  if (req.session && req.session.accountId) {
    req.user = {
      id: req.session.accountId,
      name: req.session.accountName,
      email: req.session.email,
      role: req.session.accountRole
    };
    return next();
  }
  return res.redirect('/login');
}

module.exports = {
  requirePermission,
  ensureAdminWeb,
  ensureAuthenticatedWeb
};
