"use strict";

const { authenticate } = require('../models/accountModel');

// แสดงหน้าเข้าสู่ระบบ (GET /login)
async function showLogin(req, res) {
  const accountName = req.session ? req.session.accountName : null;
  const accountRole = req.session ? req.session.accountRole : null;

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
    title: 'เข้าสู่ระบบ | ก้าว - FreelanceHub',
    values: {},
    errors,
    success,
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
  const errors = {};

  if (!identifier) errors.identifier = 'กรุณากรอกอีเมลหรือชื่อผู้ใช้';
  if (!password) errors.password = 'กรุณากรอกรหัสผ่าน';

  if (Object.keys(errors).length > 0) {
    return res.status(422).render('pages/login', {
      title: 'เข้าสู่ระบบ | ก้าว - FreelanceHub',
      values: { identifier },
      errors,
      success: null,
      accountName: null,
      accountRole: null
    });
  }

  try {
    const account = await authenticate(identifier, password);

    if (!account) {
      return res.status(401).render('pages/login', {
        title: 'เข้าสู่ระบบ | ก้าว - FreelanceHub',
        values: { identifier },
        errors: { form: 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        success: null,
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

        req.session.save((saveError) => {
          if (saveError) return next(saveError);
          return res.redirect('/');
        });
      });
    } else {
      return res.redirect('/');
    }
  } catch (error) {
    return next(error);
  }
}

// ออกจากระบบ (POST /logout)
async function logout(req, res, next) {
  if (!req.session) {
    return res.redirect('/login');
  }

  req.session.destroy((error) => {
    if (error) return next(error);

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
