"use strict";

const { authenticate } = require('../models/accountModel');
const auditLogger = require('../services/auditLogger');

// แสดงหน้าเข้าสู่ระบบ (GET /login)
async function showLogin(req, res) {
  const accountName = req.session ? req.session.accountName : null;
  const accountRole = req.session ? req.session.accountRole : null;
  const returnTo = req.query.returnTo || null;

  let success = null;
  if (req.query.welcome === '1') success = 'เข้าสู่ระบบสำเร็จ';
  if (req.query.reset_success === '1') success = 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่';

  const errors = {};
  if (req.query.error === 'google_missing_client_id') {
    errors.form = '⚠️ ยังไม่ได้ระบุ GOOGLE_CLIENT_ID ในไฟล์ .env (กรุณานำ Client ID จาก Google Cloud Console มาใส่)';
  } else if (req.query.error === 'github_missing_client_id') {
    errors.form = '⚠️ ยังไม่ได้ระบุ GITHUB_CLIENT_ID ในไฟล์ .env (กรุณานำ Client ID จาก GitHub Developer Settings มาใส่)';
  } else if (req.query.error === 'oauth_failed') {
    errors.form = 'การยืนยันตัวตนผ่าน OAuth ล้มเหลว กรุณาลองใหม่อีกครั้ง';
  } else if (req.query.error === 'oauth_denied') {
    errors.form = 'คุณได้ยกเลิกการเข้าสู่ระบบผ่านผู้ให้บริการภายนอก';
  }

  res.render('pages/login', {
    title: 'เข้าสู่ระบบ - FreelanceHub',
    values: {},
    errors,
    success,
    returnTo,
    accountName: accountName || null,
    accountRole: accountRole || null
  });
}

// ดำเนินการเข้าสู่ระบบจากแบบฟอร์ม (POST /login)
async function login(req, res, next) {
  const identifier = typeof req.body.identifier === 'string'
    ? req.body.identifier.trim()
    : '';
  const password = typeof req.body.password === 'string'
    ? req.body.password
    : '';
  const returnTo = typeof req.body.returnTo === 'string' ? req.body.returnTo : req.query.returnTo;
  const errors = {};

  if (!identifier) errors.identifier = 'กรุณากรอกอีเมลหรือชื่อผู้ใช้';
  if (!password) errors.password = 'กรุณากรอกรหัสผ่าน';

  if (Object.keys(errors).length > 0) {
    return res.status(422).render('pages/login', {
      title: 'เข้าสู่ระบบ - FreelanceHub',
      values: { identifier },
      errors,
      success: null,
      returnTo: returnTo || null,
      accountName: null,
      accountRole: null
    });
  }

  try {
    const account = await authenticate(identifier, password);

    if (!account) {
      await auditLogger.logEvent({
        userId: null,
        usernameOrEmail: identifier,
        ipAddress: req.ip,
        eventType: 'AUTH_LOGIN_FAILED',
        resource: '/login',
        action: 'POST',
        status: 'FAILED',
        details: { attemptedIdentifier: identifier, reason: 'Invalid credentials' }
      });

      return res.status(401).render('pages/login', {
        title: 'เข้าสู่ระบบ - FreelanceHub',
        values: { identifier },
        errors: { form: 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        success: null,
        returnTo: returnTo || null,
        accountName: null,
        accountRole: null
      });
    }

    // หากระบบเปิดใช้งาน Session
    if (req.session) {
      req.session.regenerate((sessionError) => {
        if (sessionError) return next(sessionError);

        req.session.accountId = account.id;
        req.session.accountRole = account.role;
        req.session.accountName = account.name;
        req.session.email = account.email;

        req.session.cookie.maxAge = req.body.remember === 'yes'
          ? 30 * 24 * 60 * 60 * 1000
          : 8 * 60 * 60 * 1000;

        req.session.save(async (saveError) => {
          if (saveError) return next(saveError);

          await auditLogger.logEvent({
            userId: account.id,
            usernameOrEmail: account.email,
            ipAddress: req.ip,
            eventType: 'AUTH_LOGIN_SUCCESS',
            resource: '/login',
            action: 'POST',
            status: 'SUCCESS',
            details: { role: account.role, name: account.name }
          });

          // หากมีคำขอส่งกลับไปยังหน้าที่เปิดดูค้างไว้ (เช่น /jobs/1)
          if (returnTo && returnTo.startsWith('/')) {
            return res.redirect(returnTo);
          }

          // Redirect to single page depending on role
          const roleLower = String(account.role).toLowerCase();
          if (roleLower === 'admin') {
            return res.redirect('/admin');
          }
          if (roleLower === 'company') {
            return res.redirect('/company');
          }
          if (roleLower === 'staff') {
            return res.redirect('/moderator');
          }
          return res.redirect('/seeker');
        });
      });
    } else {
      return res.redirect(returnTo && returnTo.startsWith('/') ? returnTo : '/');
    }
  } catch (error) {
    return next(error);
  }
}

// ออกจากระบบ (POST /logout)
async function logout(req, res, next) {
  const accountId = req.session?.accountId;
  const email = req.session?.email || req.session?.accountName;

  if (!req.session) {
    return res.redirect('/login');
  }

  req.session.destroy(async (error) => {
    if (error) return next(error);

    await auditLogger.logEvent({
      userId: accountId,
      usernameOrEmail: email,
      ipAddress: req.ip,
      eventType: 'AUTH_LOGOUT',
      resource: '/logout',
      action: 'POST',
      status: 'SUCCESS',
      details: { message: 'User logged out successfully' }
    });

    res.clearCookie('jobboard.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    return res.redirect('/login');
  });
}

module.exports = {
  showLogin,
  login,
  logout
};
